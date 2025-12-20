/**
 * File Upload Helper
 * Handles file uploads for both local server and Vercel deployment
 * On Vercel: Uses Vercel Blob Storage
 * On local: Saves to public/uploads/ folder
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { put } from "@vercel/blob";

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
	
	// Check if we're on Vercel by checking environment variables
	const hasVercelEnv = process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL === '1';
	
	// If no Vercel env vars, definitely not Vercel
	if (!hasVercelEnv) {
		return false;
	}
	
	// Check if we're in development mode
	const nodeEnv = process.env.NODE_ENV || '';
	if (nodeEnv === 'development') {
		console.log('[FileUpload] NODE_ENV=development detected, using local file system');
		return false;
	}
	
	// Check various environment variables that might indicate localhost
	const hostname = process.env.HOSTNAME || process.env.VERCEL_URL || process.env.NEXT_PUBLIC_URL || '';
	
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
	console.log('[FileUpload] Detected Vercel environment, using Vercel Blob Storage');
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
 * Upload file to Vercel Blob Storage
 */
async function uploadToVercelBlob(
	file: File,
	fileName: string,
	uploadType: 'documents' | 'reports' | 'pictures',
	subPath?: string
): Promise<UploadResult> {
	try {
		// Check if BLOB_READ_WRITE_TOKEN is available
		const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
		if (!blobToken) {
			console.warn('[FileUpload] BLOB_READ_WRITE_TOKEN not found. Falling back to local upload.');
			throw new Error('BLOB_READ_WRITE_TOKEN environment variable is not set. Please configure it in Vercel project settings.');
		}
		
		// Build blob path: uploads/{type}/{subPath}/{fileName}
		let blobPath = `uploads/${uploadType}`;
		if (subPath) {
			blobPath += `/${subPath.replace(/\\/g, '/')}`;
		}
		blobPath += `/${fileName}`;
		
		console.log(`[FileUpload] Uploading to Vercel Blob Storage: ${blobPath}`);
		
		// Convert file to buffer
		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);
		
		// Upload to Vercel Blob Storage with explicit token
		const blob = await put(blobPath, buffer, {
			access: 'public',
			contentType: file.type || 'application/octet-stream',
			token: blobToken,
		});
		
		console.log(`[FileUpload] Successfully uploaded to Vercel Blob: ${blob.url}`);
		
		// Store the blob URL in database
		// For database, we'll store the blob URL as filePath
		return {
			success: true,
			filePath: blob.url, // Store full Blob URL in database
			fileUrl: blob.url, // Full Blob URL for accessing
			fileName: fileName
		};
	} catch (error) {
		console.error('[FileUpload] Error uploading to Vercel Blob:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		
		// If token is missing, provide helpful error message
		if (errorMessage.includes('No token found') || errorMessage.includes('BLOB_READ_WRITE_TOKEN')) {
			return {
				success: false,
				filePath: '',
				fileUrl: '',
				fileName: fileName,
				error: `Vercel Blob Storage is not configured. Please add BLOB_READ_WRITE_TOKEN environment variable in your Vercel project settings. Go to: Project Settings → Environment Variables → Add BLOB_READ_WRITE_TOKEN. You can get the token from your Vercel Blob Storage dashboard.`
			};
		}
		
		return {
			success: false,
			filePath: '',
			fileUrl: '',
			fileName: fileName,
			error: `Vercel Blob upload failed: ${errorMessage}`
		};
	}
}

/**
 * Main upload function - automatically chooses local or Vercel Blob based on environment
 */
export async function uploadFile(
	file: File,
	fileName: string,
	uploadType: 'documents' | 'reports' | 'pictures',
	subPath?: string
): Promise<UploadResult> {
	const isVercelEnv = isVercel();
	const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
	
	console.log(`[FileUpload] Environment detection: isVercel=${isVercelEnv}, hasBlobToken=${hasBlobToken}, uploadType=${uploadType}, fileName=${fileName}`);
	
	if (isVercelEnv && hasBlobToken) {
		// On Vercel with Blob token, use Blob Storage
		console.log(`[FileUpload] Using Vercel Blob Storage for upload`);
		const result = await uploadToVercelBlob(file, fileName, uploadType, subPath);
		
		// If Blob upload fails due to token issues, fall back to local
		if (!result.success && result.error?.includes('BLOB_READ_WRITE_TOKEN')) {
			console.warn(`[FileUpload] Blob upload failed, falling back to local upload`);
			return await uploadToLocal(file, fileName, uploadType, subPath);
		}
		
		return result;
	} else {
		// On local server or Vercel without token, save to public/uploads/
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


