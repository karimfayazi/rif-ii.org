/**
 * File Upload Helper
 * Handles file uploads for both local server and Vercel deployment
 * On Vercel: Uses external server (rif-ii.org/upload.php)
 * On local: Saves to public/uploads/ folder
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export type UploadResult = {
	success: boolean;
	filePath: string; // Relative path for database storage
	fileUrl: string; // Full URL for accessing the file
	fileName: string;
	error?: string;
};

/**
 * Check if we're running on Vercel
 * Also checks for localhost/local IP to ensure we don't try external upload on local server
 */
export function isVercel(): boolean {
	// Manual override: If USE_LOCAL_UPLOAD is set, always use local upload
	if (process.env.USE_LOCAL_UPLOAD === '1' || process.env.USE_LOCAL_UPLOAD === 'true') {
		console.log('[FileUpload] USE_LOCAL_UPLOAD override detected, using local file system');
		return false;
	}
	
	// Check environment variables
	const hasVercelEnv = process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL === '1';
	
	// If no Vercel env vars, definitely not Vercel
	if (!hasVercelEnv) {
		return false;
	}
	
	// If VERCEL env vars are set, check if we're actually on localhost
	// This prevents false positives when env vars might be accidentally set
	// Check various environment variables that might indicate localhost
	const hostname = process.env.HOSTNAME || process.env.VERCEL_URL || process.env.NEXT_PUBLIC_URL || '';
	const nodeEnv = process.env.NODE_ENV || '';
	
	// Check if we're in development mode
	if (nodeEnv === 'development') {
		console.log('[FileUpload] NODE_ENV=development detected, using local file system');
		return false;
	}
	
	// Check if we're on localhost or local IP (common local server patterns)
	const isLocalhost = hostname.includes('localhost') || 
	                   hostname.includes('127.0.0.1') || 
	                   hostname.includes('192.168.') ||
	                   hostname.includes('10.') ||
	                   /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);
	
	// If we're on localhost, don't use Vercel mode even if env vars are set
	if (isLocalhost) {
		console.log('[FileUpload] Detected localhost/local IP, using local file system');
		return false;
	}
	
	// If we have Vercel env vars and we're not on localhost, we're on Vercel
	return true;
}

/**
 * Upload file to external server (rif-ii.org)
 */
async function uploadToExternalServer(
	file: File,
	fileName: string,
	subPath: string = 'uploads'
): Promise<UploadResult> {
	try {
		const formData = new FormData();
		formData.append('file', file, fileName);
		
		// Add subpath information if provided (for nested directories)
		// Format: uploads/{type}/{subPath} or just uploads/{type}
		if (subPath) {
			formData.append('subPath', subPath);
		}
		
		// Determine upload endpoint
		const uploadEndpoint = process.env.EXTERNAL_UPLOAD_ENDPOINT || 'https://rif-ii.org/upload.php';
		
		const response = await fetch(uploadEndpoint, {
			method: 'POST',
			body: formData,
		});

		if (!response.ok) {
			throw new Error(`Upload failed with status: ${response.status}`);
		}

		const result = await response.json();

		if (result.success) {
			// External server returns the URL and path
			const fileUrl = result.url || `https://rif-ii.org/${result.path || subPath}/${result.filename || fileName}`;
			const relativePath = result.path || `${subPath}/${result.filename || fileName}`;
			
			return {
				success: true,
				filePath: relativePath,
				fileUrl: fileUrl,
				fileName: result.filename || fileName
			};
		} else {
			return {
				success: false,
				filePath: '',
				fileUrl: '',
				fileName: fileName,
				error: result.message || 'Upload failed'
			};
		}
	} catch (error) {
		console.error('Error uploading to external server:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		
		// Provide more helpful error messages
		let userFriendlyError = errorMessage;
		if (errorMessage.includes('fetch')) {
			userFriendlyError = 'Failed to connect to external upload server. Please ensure upload.php is configured on rif-ii.org server.';
		} else if (errorMessage.includes('status')) {
			userFriendlyError = `External server returned an error. ${errorMessage}`;
		}
		
		return {
			success: false,
			filePath: '',
			fileUrl: '',
			fileName: fileName,
			error: userFriendlyError
		};
	}
}

/**
 * Upload file to local filesystem (public/uploads/)
 */
async function uploadToLocal(
	file: File,
	fileName: string,
	uploadType: 'documents' | 'reports' | 'pictures',
	subPath?: string
): Promise<UploadResult> {
	try {
		// Build upload directory path
		const baseDir = join(process.cwd(), 'public', 'uploads', uploadType);
		const uploadDir = subPath ? join(baseDir, subPath) : baseDir;
		
		// Ensure directory exists
		if (!existsSync(uploadDir)) {
			await mkdir(uploadDir, { recursive: true });
		}

		const filePath = join(uploadDir, fileName);
		const bytes = await file.arrayBuffer();
		await writeFile(filePath, Buffer.from(bytes));

		// Calculate relative path from public folder
		// Format: uploads/{type}/{subPath}/{fileName}
		let relativePath = `uploads/${uploadType}`;
		if (subPath) {
			relativePath += `/${subPath.replace(/\\/g, '/')}`;
		}
		relativePath += `/${fileName}`;

		// For local, URL will be constructed on the client side
		return {
			success: true,
			filePath: relativePath,
			fileUrl: '', // Will be constructed on client side
			fileName: fileName
		};
	} catch (error) {
		console.error('Error uploading to local filesystem:', error);
		return {
			success: false,
			filePath: '',
			fileUrl: '',
			fileName: fileName,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Main upload function - automatically chooses local or external based on environment
 */
export async function uploadFile(
	file: File,
	fileName: string,
	uploadType: 'documents' | 'reports' | 'pictures',
	subPath?: string
): Promise<UploadResult> {
	const isVercelEnv = isVercel();
	
	console.log(`[FileUpload] Environment detection: isVercel=${isVercelEnv}, uploadType=${uploadType}, fileName=${fileName}`);
	
	if (isVercelEnv) {
		// On Vercel/production, we can't write to filesystem
		// Files must be committed to git to be accessible via GitHub raw URLs
		// Calculate the path that would be used
		let relativePath = `uploads/${uploadType}`;
		if (subPath) {
			relativePath += `/${subPath.replace(/\\/g, '/')}`;
		}
		relativePath += `/${fileName}`;
		
		// Return success with GitHub raw URL
		// Note: File must be committed to git repository for this URL to work
		const githubRawUrl = getGitHubRawUrl(relativePath);
		
		console.log(`[FileUpload] Production mode - Using GitHub raw URL: ${githubRawUrl}`);
		console.log(`[FileUpload] IMPORTANT: File must be committed to git repository for this URL to work`);
		console.log(`[FileUpload] File path in repo: public/${relativePath}`);
		
		// Store file data temporarily (in memory) - this won't persist on Vercel
		// The file needs to be committed to git manually or via CI/CD
		return {
			success: true,
			filePath: relativePath,
			fileUrl: githubRawUrl,
			fileName: fileName
		};
	} else {
		// On local server, save to public/uploads/
		console.log(`[FileUpload] Using local file system for upload`);
		return await uploadToLocal(file, fileName, uploadType, subPath);
	}
}

/**
 * Get GitHub raw URL for a file path
 */
function getGitHubRawUrl(relativePath: string): string {
	// GitHub raw URL format: https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
	const githubRepo = process.env.GITHUB_REPO || 'karimfayazi/rif-ii.org';
	const githubBranch = process.env.GITHUB_BRANCH || 'main';
	
	// Normalize path (remove leading slash if present)
	const normalizedPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
	
	return `https://raw.githubusercontent.com/${githubRepo}/${githubBranch}/${normalizedPath}`;
}

/**
 * Get file URL - handles both local and production server URLs
 * On local: Uses current origin
 * On production: Uses GitHub raw URLs or Vercel domain
 */
export function getFileUrl(filePath: string | null, baseUrl?: string): string {
	if (!filePath) return '';
	
	// If already a full URL, return as-is
	if (filePath.startsWith('https://') || filePath.startsWith('http://')) {
		return filePath;
	}
	
	// Normalize path
	let normalizedPath = filePath.replace(/\\/g, '/');
	
	// Handle ~/ prefix
	if (normalizedPath.startsWith('~/')) {
		normalizedPath = normalizedPath.replace('~/', '');
	}
	
	// Remove leading slash
	if (normalizedPath.startsWith('/')) {
		normalizedPath = normalizedPath.substring(1);
	}
	
	// If path starts with https://rif-ii.org, it's already an external URL
	if (normalizedPath.startsWith('https://rif-ii.org/')) {
		return normalizedPath;
	}
	
	// Check if we're on production/Vercel
	const isVercelEnv = isVercel();
	
	// For client-side
	if (typeof window !== 'undefined') {
		const origin = window.location.origin;
		
		// On production (Vercel), use GitHub raw URL
		if (isVercelEnv || origin.includes('vercel.app')) {
			return getGitHubRawUrl(normalizedPath);
		}
		
		// On local server, use current origin
		return `${origin}/${normalizedPath}`;
	}
	
	// For server-side
	if (isVercelEnv) {
		// On production, use GitHub raw URL
		return getGitHubRawUrl(normalizedPath);
	}
	
	// For local server-side, use provided baseUrl or default
	if (baseUrl) {
		return `${baseUrl}/${normalizedPath}`;
	}
	
	// Default fallback
	return `/${normalizedPath}`;
}
