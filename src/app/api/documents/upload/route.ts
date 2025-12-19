import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";
import { uploadFile } from "@/lib/fileUpload";

// Helper function to check if user has Upload_Documents permission or is Admin
async function checkUploadDocumentsAccess(userId: string | null): Promise<{ canUpload: boolean; message?: string }> {
	if (!userId) {
		return { canUpload: false, message: "Unauthorized" };
	}

	try {
		const pool = await getDb();
		const accessQuery = `
			SELECT [access_level], [Upload_Documents]
			FROM [_rifiiorg_db].[dbo].[tbl_user_access]
			WHERE [username] = @userId OR [email] = @userId
		`;
		
		const accessResult = await pool.request()
			.input('userId', userId)
			.query(accessQuery);
		
		if (accessResult.recordset.length === 0) {
			return { canUpload: false, message: "User not found" };
		}

		const accessLevel = accessResult.recordset[0].access_level;
		const uploadDocumentsRaw = accessResult.recordset[0].Upload_Documents;
		
		const isAdmin = accessLevel === 'Admin';
		
		// Helper function to check BIT field values
		const checkBitField = (value: any): boolean => {
			if (value === null || value === undefined) return false;
			if (Buffer.isBuffer(value)) return value[0] === 1;
			if (typeof value === 'boolean') return value === true;
			if (typeof value === 'number') return value === 1;
			if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
			return false;
		};
		
		const uploadDocuments = checkBitField(uploadDocumentsRaw);
		const canUpload = isAdmin || uploadDocuments;
		
		if (!canUpload) {
			return { 
				canUpload: false, 
				message: "Insufficient Permissions. This action requires Admin access or Upload Documents permission. Please contact your administrator if you believe this is an error." 
			};
		}

		return { canUpload: true };
	} catch (error) {
		console.error("Error checking upload documents access:", error);
		return { canUpload: false, message: "Error checking access permissions" };
	}
}

export async function POST(request: NextRequest) {
	try {
		// Check Upload_Documents permission
		const userId = getUserIdFromRequest(request);
		const accessCheck = await checkUploadDocumentsAccess(userId);
		
		if (!accessCheck.canUpload) {
			return NextResponse.json(
				{
					success: false,
					message: accessCheck.message || "Access denied. Upload Documents permission required."
				},
				{ status: 403 }
			);
		}

		const formData = await request.formData();
		
		// Extract form fields
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const category = formData.get('category') as string;
		const subCategory = formData.get('subCategory') as string;
		const documentDate = formData.get('documentDate') as string;
		const uploadedBy = formData.get('uploadedBy') as string;
		const fileType = formData.get('fileType') as string;
		const documentType = formData.get('documentType') as string;
		const allowPriorityUsers = formData.get('allowPriorityUsers') === 'true';
		const allowInternalUsers = formData.get('allowInternalUsers') === 'true';
		const allowOthersUsers = formData.get('allowOthersUsers') === 'true';
		
		// Get files
		const files = formData.getAll('files') as File[];
		
		if (!title || !category || !subCategory || !documentDate || !uploadedBy) {
			return NextResponse.json({
				success: false,
				message: "All required form fields must be filled"
			}, { status: 400 });
		}
		
		if (files.length === 0) {
			return NextResponse.json({
				success: false,
				message: "No files provided"
			}, { status: 400 });
		}

		// Validate file types and sizes
		const allowedTypes = [
			'application/pdf',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/vnd.ms-excel',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.ms-powerpoint',
			'application/vnd.openxmlformats-officedocument.presentationml.presentation',
			'text/plain',
			'application/zip',
			'application/x-rar-compressed'
		];
		
		const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.rar'];
		const maxSize = 10 * 1024 * 1024; // 10MB
		
		for (const file of files) {
			const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
			
			if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
				return NextResponse.json({
					success: false,
					message: `File ${file.name} is not a supported document type`
				}, { status: 400 });
			}
			
			if (file.size > maxSize) {
				return NextResponse.json({
					success: false,
					message: `File ${file.name} is too large (max 10MB)`
				}, { status: 400 });
			}
		}

		// Helper function to sanitize filename
		const sanitizeFileName = (str: string): string => {
			return str
				.replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
				.replace(/\s+/g, '_') // Replace spaces with underscores
				.replace(/_+/g, '_') // Replace multiple underscores with single
				.trim();
		};

		// Format document date for filename (YYYY-MM-DD)
		const formatDateForFilename = (dateString: string): string => {
			try {
				const date = new Date(dateString);
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				return `${year}-${month}-${day}`;
			} catch {
				// Fallback to current date if parsing fails
				const now = new Date();
				return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
			}
		};

		const pool = await getDb();
		const uploadedFiles = [];

		// Process each file
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const fileExtension = file.name.split('.').pop();
			
			// Create filename: DocumentTitle_Category_DocumentDate.extension
			const sanitizedTitle = sanitizeFileName(title);
			const sanitizedCategory = sanitizeFileName(category);
			const formattedDate = formatDateForFilename(documentDate);
			
			// If multiple files, append index to make unique
			const fileName = files.length > 1 
				? `${sanitizedTitle}_${sanitizedCategory}_${formattedDate}_${i + 1}.${fileExtension}`
				: `${sanitizedTitle}_${sanitizedCategory}_${formattedDate}.${fileExtension}`;
			
			// Upload file (automatically handles local vs Vercel)
			const uploadResult = await uploadFile(file, fileName, 'documents');
			
			if (!uploadResult.success) {
				const errorMsg = uploadResult.error || 'Unknown error';
				const isVercel = process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL === '1';
				
				return NextResponse.json({
					success: false,
					message: `Failed to upload file ${file.name}: ${errorMsg}`,
					error: errorMsg,
					hint: isVercel 
						? 'On Vercel, files must be uploaded to external server. Please ensure upload.php is configured on rif-ii.org server.'
						: 'Please check file permissions and disk space.'
				}, { status: 500 });
			}
			
			// Insert into database
			const insertQuery = `
				INSERT INTO [_rifiiorg_db].[dbo].[tblDocuments] 
				([Title], [Description], [FilePath], [UploadDate], [UploadedBy], [FileType], [Documentstype], 
				 [AllowPriorityUsers], [AllowInternalUsers], [AllowOthersUsers], [Category], [SubCategory], [document_date])
				VALUES (@title, @description, @filePath, @uploadDate, @uploadedBy, @fileType, @documentType, 
				        @allowPriorityUsers, @allowInternalUsers, @allowOthersUsers, @category, @subCategory, @documentDate)
			`;
			
			const request_obj = pool.request();
			request_obj.input('title', title);
			request_obj.input('description', description || '');
			// Store file path (works for both local and external)
			request_obj.input('filePath', uploadResult.filePath);
			request_obj.input('uploadDate', new Date().toISOString());
			request_obj.input('uploadedBy', uploadedBy);
			request_obj.input('fileType', fileType || '');
			request_obj.input('documentType', documentType || '');
			request_obj.input('allowPriorityUsers', allowPriorityUsers);
			request_obj.input('allowInternalUsers', allowInternalUsers);
			request_obj.input('allowOthersUsers', allowOthersUsers);
			request_obj.input('category', category);
			request_obj.input('subCategory', subCategory);
			request_obj.input('documentDate', documentDate);
			
			await request_obj.query(insertQuery);
			
			uploadedFiles.push({
				originalName: file.name,
				fileName: uploadResult.fileName,
				filePath: uploadResult.filePath,
				fileUrl: uploadResult.fileUrl
			});
		}

		return NextResponse.json({
			success: true,
			message: `Successfully uploaded ${uploadedFiles.length} document(s)`,
			uploadedFiles: uploadedFiles
		});

	} catch (error) {
		console.error("Error uploading documents:", error);
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		
		// Check if it's a filesystem error (common on Vercel)
		const isFilesystemError = errorMessage.includes('EACCES') || 
		                          errorMessage.includes('ENOENT') || 
		                          errorMessage.includes('EROFS') ||
		                          errorMessage.includes('read-only') ||
		                          errorMessage.includes('permission denied');
		
		let userMessage = "Failed to upload documents";
		if (isFilesystemError) {
			userMessage = "File upload failed: The server filesystem is read-only. On Vercel, files are uploaded to external server (rif-ii.org).";
		}
		
		return NextResponse.json(
			{
				success: false,
				message: userMessage,
				error: errorMessage
			},
			{ status: 500 }
		);
	}
}
