import { upload } from '@vercel/blob/client';

export type BlobUploadResult = {
	url: string;
	pathname: string;
	size: number;
	uploadedAt: string;
	originalName: string;
};

export type UploadProgress = {
	loaded: number;
	total: number;
	percentage: number;
};

export type UploadFolder = 'reports' | 'documents' | 'pictures' | 'news';

/**
 * Get file type validation rules based on upload folder
 */
function getFileTypeRules(folder: UploadFolder) {
	if (folder === 'pictures' || folder === 'news') {
		return {
			extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
			types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'],
			description: 'JPG, JPEG, PNG, GIF, WEBP'
		};
	}
	
	// For reports and documents
	return {
		extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.rar', '.csv'],
		types: [
			'application/pdf',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/vnd.ms-excel',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.ms-powerpoint',
			'application/vnd.openxmlformats-officedocument.presentationml.presentation',
			'text/plain',
			'text/csv',
			'application/zip',
			'application/x-rar-compressed',
			'application/x-zip-compressed'
		],
		description: 'PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, ZIP, RAR, CSV'
	};
}

/**
 * Upload a file directly to Vercel Blob storage from the client
 * @param file The file to upload
 * @param folder The folder type (reports, documents, pictures)
 * @param onProgress Optional callback for upload progress
 * @returns Upload result with blob URL and metadata
 */
export async function uploadToBlob(
	file: File,
	folder: UploadFolder = 'reports',
	onProgress?: (progress: UploadProgress) => void
): Promise<BlobUploadResult> {
	// Validate file size (100MB limit)
	const maxSize = 100 * 1024 * 1024; // 100MB
	if (file.size > maxSize) {
		throw new Error(
			`File "${file.name}" is too large. Maximum size is 100MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`
		);
	}

	// Validate file type based on folder
	const rules = getFileTypeRules(folder);
	const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
	
	const isValidType = rules.types.includes(file.type) || rules.extensions.includes(fileExtension);
	
	if (!isValidType) {
		throw new Error(
			`File "${file.name}" type not supported for ${folder}. Supported formats: ${rules.description}`
		);
	}

	try {
		// Generate unique filename to avoid overwrites
		const timestamp = Date.now();
		const randomId = Math.random().toString(36).substring(2, 9);
		const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
		const baseName = file.name.substring(0, file.name.lastIndexOf('.')).replace(/[^a-zA-Z0-9-_]/g, '_');
		const uniqueFileName = `${timestamp}-${randomId}-${baseName}${fileExtension}`;

		console.log('[Upload Client] Starting upload:', uniqueFileName);
		
		// Upload directly to Vercel Blob
		const newBlob = await upload(uniqueFileName, file, {
			access: 'public', // All uploads are public
			handleUploadUrl: `/api/blob/upload?folder=${encodeURIComponent(folder)}`,
			clientPayload: JSON.stringify({
				size: file.size,
				type: file.type,
				folder: folder,
				originalName: file.name
			}),
			onUploadProgress: onProgress ? (event) => {
				onProgress({
					loaded: event.loaded,
					total: event.total,
					percentage: Math.round((event.loaded / event.total) * 100)
				});
			} : undefined,
		});

		console.log('[Upload Client] Upload successful:', newBlob.url);

		return {
			url: newBlob.url,
			pathname: newBlob.pathname,
			size: file.size,
			uploadedAt: new Date().toISOString(),
			originalName: file.name,
		};
	} catch (error) {
		console.error('[Upload Client] Upload error:', error);
		
		// Parse error message for better user feedback
		let errorMessage = 'Unknown error';
		
		if (error instanceof Error) {
			errorMessage = error.message;
			
			// Check for specific error patterns
			if (errorMessage.includes('BLOB_READ_WRITE_TOKEN')) {
				throw new Error(
					'Upload is not configured. Please add BLOB_READ_WRITE_TOKEN to your environment variables. ' +
					'For local development, add it to .env.local file. For production, add it to Vercel project settings.'
				);
			}
			
			if (errorMessage.includes('Failed to retrieve the client token')) {
				throw new Error(
					'Failed to connect to upload service. Please ensure BLOB_READ_WRITE_TOKEN is configured correctly in your environment variables.'
				);
			}
			
			if (errorMessage.includes('Access denied') || errorMessage.includes('Unauthorized')) {
				throw new Error(
					'You do not have permission to upload files. Please contact your administrator.'
				);
			}
			
			if (errorMessage.includes('not allowed') || errorMessage.includes('not supported')) {
				throw new Error(errorMessage);
			}
		}
		
		throw new Error(
			`Failed to upload "${file.name}": ${errorMessage}`
		);
	}
}

/**
 * Upload multiple files to Vercel Blob storage
 * @param files Array of files to upload
 * @param folder The folder type (reports, documents, pictures)
 * @param onFileProgress Optional callback for individual file progress
 * @returns Array of upload results
 */
export async function uploadMultipleToBlob(
	files: File[],
	folder: UploadFolder = 'reports',
	onFileProgress?: (fileIndex: number, fileName: string, progress: UploadProgress) => void
): Promise<BlobUploadResult[]> {
	const results: BlobUploadResult[] = [];
	const errors: string[] = [];

	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		try {
			const result = await uploadToBlob(file, folder, onFileProgress ? (progress) => {
				onFileProgress(i, file.name, progress);
			} : undefined);
			results.push(result);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error';
			errors.push(errorMsg);
			console.error(`Failed to upload file ${file.name}:`, error);
		}
	}

	if (errors.length > 0 && results.length === 0) {
		throw new Error(`All uploads failed:\n${errors.join('\n')}`);
	}

	if (errors.length > 0) {
		console.warn(`Some uploads failed:\n${errors.join('\n')}`);
	}

	return results;
}
