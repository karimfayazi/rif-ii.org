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

export type UploadFolder = 'reports' | 'documents' | 'pictures';

/**
 * Get file type validation rules based on upload folder
 */
function getFileTypeRules(folder: UploadFolder) {
	if (folder === 'pictures') {
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
		// Upload directly to Vercel Blob
		const newBlob = await upload(file.name, file, {
			access: folder === 'pictures' ? 'public' : 'public', // Can be changed to 'private' if needed
			handleUploadUrl: `/api/blob/upload?folder=${folder}`,
			clientPayload: JSON.stringify({
				size: file.size,
				type: file.type,
				folder: folder
			}),
			onUploadProgress: onProgress ? (event) => {
				onProgress({
					loaded: event.loaded,
					total: event.total,
					percentage: Math.round((event.loaded / event.total) * 100)
				});
			} : undefined,
		});

		return {
			url: newBlob.url,
			pathname: newBlob.pathname,
			size: file.size,
			uploadedAt: new Date().toISOString(),
			originalName: file.name,
		};
	} catch (error) {
		console.error('Upload error:', error);
		throw new Error(
			`Failed to upload "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
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
