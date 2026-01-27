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

/**
 * Upload a file directly to Vercel Blob storage from the client
 * @param file The file to upload
 * @param onProgress Optional callback for upload progress
 * @returns Upload result with blob URL and metadata
 */
export async function uploadToBlob(
	file: File,
	onProgress?: (progress: UploadProgress) => void
): Promise<BlobUploadResult> {
	// Validate file size (100MB limit)
	const maxSize = 100 * 1024 * 1024; // 100MB
	if (file.size > maxSize) {
		throw new Error(
			`File "${file.name}" is too large. Maximum size is 100MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`
		);
	}

	// Validate file type
	const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
	const allowedTypes = [
		'application/pdf',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'application/vnd.ms-excel',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'application/vnd.ms-powerpoint',
		'application/vnd.openxmlformats-officedocument.presentationml.presentation'
	];

	const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
	if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
		throw new Error(
			`File "${file.name}" type not supported. Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX`
		);
	}

	try {
		// Upload directly to Vercel Blob
		const newBlob = await upload(file.name, file, {
			access: 'public',
			handleUploadUrl: '/api/blob/upload',
			clientPayload: JSON.stringify({
				size: file.size,
				type: file.type,
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
 * @param onFileProgress Optional callback for individual file progress
 * @returns Array of upload results
 */
export async function uploadMultipleToBlob(
	files: File[],
	onFileProgress?: (fileIndex: number, fileName: string, progress: UploadProgress) => void
): Promise<BlobUploadResult[]> {
	const results: BlobUploadResult[] = [];
	const errors: string[] = [];

	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		try {
			const result = await uploadToBlob(file, onFileProgress ? (progress) => {
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
