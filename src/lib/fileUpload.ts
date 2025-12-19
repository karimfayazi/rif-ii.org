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
 */
export function isVercel(): boolean {
	return process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL === '1';
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
	if (isVercel()) {
		// On Vercel, use external server
		// Construct subpath: uploads/{type}/{subPath} or just uploads/{type}
		let subPathForExternal = `uploads/${uploadType}`;
		if (subPath) {
			subPathForExternal += `/${subPath}`;
		}
		
		const result = await uploadToExternalServer(file, fileName, subPathForExternal);
		
		// If external upload fails, provide helpful error message
		if (!result.success) {
			console.error(`[FileUpload] External upload failed: ${result.error}`);
			return {
				...result,
				error: result.error || 'Failed to upload to external server. Please ensure upload.php is configured on rif-ii.org server.'
			};
		}
		
		return result;
	} else {
		// On local server, save to public/uploads/
		return await uploadToLocal(file, fileName, uploadType, subPath);
	}
}

/**
 * Get file URL - handles both local and external server URLs
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
	
	// For client-side, use current origin
	if (typeof window !== 'undefined') {
		const origin = window.location.origin;
		return `${origin}/${normalizedPath}`;
	}
	
	// For server-side, use provided baseUrl or default to production
	if (baseUrl) {
		return `${baseUrl}/${normalizedPath}`;
	}
	
	// Default: try production domain
	return `https://rif-ii.org/${normalizedPath}`;
}
