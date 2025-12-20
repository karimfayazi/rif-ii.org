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
	// Always use local upload - files will be saved to public/uploads/
	// Note: On Vercel, files need to be committed to git to be accessible
	// For runtime uploads on Vercel, consider using Vercel Blob Storage or similar
	console.log('[FileUpload] Using local file system (public/uploads/) for all uploads');
	return false;
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
		
		console.log(`[FileUpload] Attempting to upload to: ${uploadEndpoint}`);
		console.log(`[FileUpload] File: ${fileName}, Size: ${file.size} bytes, SubPath: ${subPath}`);
		
		// Create AbortController for timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
		
		let response: Response;
		try {
			response = await fetch(uploadEndpoint, {
				method: 'POST',
				body: formData,
				signal: controller.signal,
				// Don't set Content-Type header - let browser set it with boundary for multipart/form-data
			});
			clearTimeout(timeoutId);
		} catch (fetchError: any) {
			clearTimeout(timeoutId);
			
			// Handle specific error types
			if (fetchError.name === 'AbortError') {
				throw new Error('Upload request timed out after 30 seconds. The server may be slow or unreachable.');
			} else if (fetchError.code === 'ENOTFOUND' || fetchError.code === 'ECONNREFUSED') {
				throw new Error(`Cannot connect to ${uploadEndpoint}. Please check if the server is accessible and upload.php exists.`);
			} else if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError')) {
				throw new Error(`Network error: Cannot reach ${uploadEndpoint}. This could be due to CORS issues, server being down, or network connectivity problems.`);
			}
			throw fetchError;
		}

		console.log(`[FileUpload] Response status: ${response.status} ${response.statusText}`);
		
		if (!response.ok) {
			// Try to get error message from response
			let errorMessage = `Upload failed with status: ${response.status}`;
			try {
				const errorData = await response.text();
				console.error(`[FileUpload] Error response: ${errorData}`);
				// Try to parse as JSON
				try {
					const errorJson = JSON.parse(errorData);
					errorMessage = errorJson.message || errorMessage;
				} catch {
					errorMessage = errorData || errorMessage;
				}
			} catch {
				// Ignore errors reading response
			}
			throw new Error(errorMessage);
		}

		const result = await response.json();
		console.log(`[FileUpload] Upload response:`, result);

		if (result.success) {
			// PHP script returns path as "documents/filename.pdf" (without uploads/ prefix)
			// But file is actually saved to /uploads/documents/filename.pdf on server
			// We need to add "uploads/" prefix to both path and URL
			let relativePath = result.path || `${subPath}/${result.filename || fileName}`;
			
			// If path doesn't start with "uploads/", add it
			if (!relativePath.startsWith('uploads/')) {
				relativePath = `uploads/${relativePath}`;
			}
			
			// Construct URL with uploads/ prefix (PHP script returns URL without it)
			const fileUrl = `https://rif-ii.org/${relativePath}`;
			
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
		console.error('[FileUpload] Error uploading to external server:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		
		// Provide more helpful error messages
		let userFriendlyError = errorMessage;
		
		// Check for specific error patterns
		if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
			userFriendlyError = 'Upload request timed out. The server may be slow or unreachable. Please try again.';
		} else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Cannot connect')) {
			userFriendlyError = `Cannot connect to upload server (${process.env.EXTERNAL_UPLOAD_ENDPOINT || 'https://rif-ii.org/upload.php'}). Please verify:\n1. The upload.php file exists on the server\n2. The server is accessible\n3. The URL is correct`;
		} else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('CORS')) {
			userFriendlyError = 'Network error: Cannot reach the upload server. This could be due to:\n1. CORS configuration issues\n2. Server being down\n3. Network connectivity problems\n\nPlease check if https://rif-ii.org/upload.php is accessible in your browser.';
		} else if (errorMessage.includes('status')) {
			userFriendlyError = `External server returned an error: ${errorMessage}`;
		} else if (errorMessage.includes('fetch')) {
			userFriendlyError = 'Failed to connect to external upload server. Please ensure upload.php is configured on rif-ii.org server.';
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
	// Always use local file system - save to public/uploads/
	console.log(`[FileUpload] Uploading to local file system: uploadType=${uploadType}, fileName=${fileName}`);
	return await uploadToLocal(file, fileName, uploadType, subPath);
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


