import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { getUserIdFromRequest } from "@/lib/auth";
import { put } from "@vercel/blob";

// Helper function to check if user can upload documents
async function checkUploadAccess(userId: string | null): Promise<{ canUpload: boolean; message?: string }> {
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

		const userAccess = accessResult.recordset[0];
		const accessLevel = userAccess.access_level;
		const isAdmin = accessLevel === 'Admin';
		
		// Check Upload_Documents permission
		const uploadDocumentsRaw = userAccess.Upload_Documents;
		const checkBitField = (value: any): boolean => {
			if (value === null || value === undefined) return false;
			if (Buffer.isBuffer(value)) return value[0] === 1;
			if (typeof value === 'boolean') return value === true;
			if (typeof value === 'number') return value === 1;
			if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
			return false;
		};
		
		const uploadDocuments = checkBitField(uploadDocumentsRaw);
		const canUploadDocuments = isAdmin || uploadDocuments;
		
		if (!canUploadDocuments) {
			return { 
				canUpload: false, 
				message: "Insufficient Permissions. This action requires Admin level access or Upload_Documents permission. Please contact your administrator if you believe this is an error." 
			};
		}

		return { canUpload: true };
	} catch (error) {
		console.error("Error checking upload access:", error);
		return { canUpload: false, message: "Error checking access permissions" };
	}
}

export async function POST(request: NextRequest) {
	try {
		// Check upload access (Admin or Upload_Documents permission)
		const userId = getUserIdFromRequest(request);
		const accessCheck = await checkUploadAccess(userId);
		
		if (!accessCheck.canUpload) {
			return NextResponse.json(
				{
					success: false,
					message: accessCheck.message || "Access denied. Upload privileges required."
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

		// Check if we're on Vercel (read-only filesystem)
		const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
		const useBlobStorage = isVercel && process.env.BLOB_READ_WRITE_TOKEN;
		
		// Create upload directory structure (only for non-Vercel or when not using blob)
		let uploadDir: string | null = null;
		if (!useBlobStorage) {
			uploadDir = join(process.cwd(), 'public', 'uploads', 'documents', category, subCategory);
			
			// Ensure directory exists
			try {
				if (!existsSync(uploadDir)) {
					await mkdir(uploadDir, { recursive: true });
				}
			} catch (dirError) {
				console.error("Error creating upload directory:", dirError);
				return NextResponse.json({
					success: false,
					message: `Failed to create upload directory: ${dirError instanceof Error ? dirError.message : 'Unknown error'}`
				}, { status: 500 });
			}
		}

		const pool = await getDb();
		const uploadedFiles = [];

		// Process each file
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const fileExtension = file.name.split('.').pop();
			const fileName = `${Date.now()}_${i + 1}.${fileExtension}`;
			let filePath: string;
			let relativePath: string;
			
			// Save file to Vercel Blob or filesystem
			try {
				const bytes = await file.arrayBuffer();
				const buffer = Buffer.from(bytes);
				
				if (useBlobStorage) {
					// Use Vercel Blob storage
					const blobPath = `documents/${category}/${subCategory}/${fileName}`;
					const blob = await put(blobPath, buffer, {
						access: 'public',
						contentType: file.type || 'application/octet-stream',
					});
					
					filePath = blob.url;
					relativePath = blob.url;
					console.log(`File uploaded to Vercel Blob: ${blob.url}`);
				} else {
					// Use filesystem
					if (!uploadDir) {
						throw new Error("Upload directory not initialized");
					}
					filePath = join(uploadDir, fileName);
					relativePath = `uploads/documents/${category}/${subCategory}/${fileName}`;
					await writeFile(filePath, buffer);
					console.log(`File saved to filesystem: ${filePath}`);
				}
			} catch (writeError) {
				console.error("Error saving file:", writeError);
				return NextResponse.json({
					success: false,
					message: `Failed to save file: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`,
					file: file.name,
					error: writeError instanceof Error ? writeError.stack : undefined
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
			// Use blob URL if using blob storage, otherwise use relative path
			const dbFilePath = useBlobStorage ? filePath : `~/Uploads/Documents/${fileName}`;
			request_obj.input('filePath', dbFilePath);
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
				fileName: fileName,
				filePath: relativePath
			});
		}

		return NextResponse.json({
			success: true,
			message: `Successfully uploaded ${uploadedFiles.length} document(s)`,
			uploadedFiles: uploadedFiles
		});

	} catch (error) {
		console.error("Error uploading documents:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to upload documents",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
