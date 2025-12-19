import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";
import { uploadFile } from "@/lib/fileUpload";

// Helper function to check if user has Upload_Report permission or is Admin
async function checkUploadReportAccess(userId: string | null): Promise<{ canUpload: boolean; message?: string }> {
	if (!userId) {
		return { canUpload: false, message: "Unauthorized" };
	}

	try {
		const pool = await getDb();
		// Query to check if user is Admin OR has Upload_Report = true/1
		const accessQuery = `
			SELECT [access_level], [Upload_Report]
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
		const uploadReportRaw = accessResult.recordset[0].Upload_Report;
		
		// Check if user is Admin OR has Upload_Report permission
		// Admin check: access_level must be exactly 'Admin' (case-sensitive)
		const isAdmin = accessLevel === 'Admin';
		
		// Upload_Report check: handle various SQL Server BIT field return types
		let hasUploadPermission = false;
		if (uploadReportRaw !== null && uploadReportRaw !== undefined) {
			// If it's a Buffer (SQL Server BIT can return as Buffer), convert to number first
			if (Buffer.isBuffer(uploadReportRaw)) {
				hasUploadPermission = uploadReportRaw[0] === 1;
			} else if (typeof uploadReportRaw === 'boolean') {
				hasUploadPermission = uploadReportRaw === true;
			} else if (typeof uploadReportRaw === 'number') {
				hasUploadPermission = uploadReportRaw === 1;
			} else if (typeof uploadReportRaw === 'string') {
				hasUploadPermission = uploadReportRaw === '1' || uploadReportRaw.toLowerCase() === 'true';
			}
		}
		
		// Allow upload if user is Admin OR has Upload_Report = true/1
		const canUpload = isAdmin || hasUploadPermission;
		
		if (!canUpload) {
			return { 
				canUpload: false, 
				message: "Insufficient Permissions. This action requires Admin access or Upload Report permission. Please contact your administrator if you believe this is an error." 
			};
		}

		return { canUpload: true };
	} catch (error) {
		console.error("Error checking upload report access:", error);
		return { canUpload: false, message: "Error checking access permissions" };
	}
}

export async function POST(request: NextRequest) {
	try {
		// Check Upload_Report permission
		const userId = getUserIdFromRequest(request);
		const accessCheck = await checkUploadReportAccess(userId);
		
		if (!accessCheck.canUpload) {
			return NextResponse.json(
				{
					success: false,
					message: accessCheck.message || "Access denied. Upload Report permission required."
				},
				{ status: 403 }
			);
		}

		const formData = await request.formData();
		
		// Extract form fields
		const reportTitle = formData.get('reportTitle') as string;
		const description = formData.get('description') as string;
		const mainCategory = formData.get('mainCategory') as string;
		const subCategory = formData.get('subCategory') as string;
		const eventDate = formData.get('eventDate') as string;
		const uploadedBy = formData.get('uploadedBy') as string;
		const reportId = formData.get('reportId') as string | null;
		const isUpdate = !!reportId;
		
		// Get files
		const files = formData.getAll('files') as File[];
		
		if (!reportTitle || !mainCategory || !subCategory || !eventDate || !uploadedBy) {
			return NextResponse.json({
				success: false,
				message: "All required form fields must be filled"
			}, { status: 400 });
		}
		
		// Files are required for new uploads, optional for updates
		if (!isUpdate && files.length === 0) {
			return NextResponse.json({
				success: false,
				message: "No files provided"
			}, { status: 400 });
		}
		
		// If updating, check if report exists
		if (isUpdate) {
			const pool = await getDb();
			const checkQuery = `
				SELECT [ReportID], [FilePath]
				FROM [_rifiiorg_db].[rifiiorg].[tblReports]
				WHERE [ReportID] = @reportID
			`;
			
			const checkResult = await pool.request()
				.input('reportID', parseInt(reportId!))
				.query(checkQuery);
			
			if (checkResult.recordset.length === 0) {
				return NextResponse.json({
					success: false,
					message: "Report not found"
				}, { status: 404 });
			}
		}

		// Validate file types and sizes
		const allowedTypes = [
			'application/pdf',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/vnd.ms-excel',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.ms-powerpoint',
			'application/vnd.openxmlformats-officedocument.presentationml.presentation'
		];
		
		const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
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

		// Format event date for filename (YYYY-MM-DD)
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

		// Process files if provided
		if (files.length > 0) {
			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				const fileExtension = file.name.split('.').pop();
				
				// Create filename: ReportTitle_MainCategory_EventDate.extension
				const sanitizedTitle = sanitizeFileName(reportTitle);
				const sanitizedCategory = sanitizeFileName(mainCategory);
				const formattedDate = formatDateForFilename(eventDate);
				
				// If multiple files, append index to make unique
				const fileName = files.length > 1 
					? `${sanitizedTitle}_${sanitizedCategory}_${formattedDate}_${i + 1}.${fileExtension}`
					: `${sanitizedTitle}_${sanitizedCategory}_${formattedDate}.${fileExtension}`;
				
				// Upload file (automatically handles local vs Vercel)
				const uploadResult = await uploadFile(file, fileName, 'reports');
				
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
				
				// Calculate file size in KB
				const fileSizeKB = Math.round(file.size / 1024);
				
				// Get current date for UploadDate
				const uploadDate = new Date().toISOString().split('T')[0];
				
				if (isUpdate) {
					// Update existing report with new file
					const updateQuery = `
						UPDATE [_rifiiorg_db].[rifiiorg].[tblReports]
						SET 
							[ReportTitle] = @reportTitle,
							[Description] = @description,
							[FilePath] = @filePath,
							[FileExtension] = @fileExtension,
							[FileSizeKB] = @fileSizeKB,
							[EventDate] = @eventDate,
							[MainCategory] = @mainCategory,
							[SubCategory] = @subCategory
						WHERE [ReportID] = @reportID
					`;
					
					const request_obj = pool.request();
					request_obj.input('reportID', parseInt(reportId!));
					request_obj.input('reportTitle', reportTitle);
					request_obj.input('description', description || '');
					request_obj.input('filePath', uploadResult.filePath);
					request_obj.input('fileExtension', fileExtension || '');
					request_obj.input('fileSizeKB', fileSizeKB);
					request_obj.input('eventDate', eventDate);
					request_obj.input('mainCategory', mainCategory);
					request_obj.input('subCategory', subCategory);
					
					await request_obj.query(updateQuery);
				} else {
					// Insert new report into database
					const insertQuery = `
						INSERT INTO [_rifiiorg_db].[rifiiorg].[tblReports] 
						([ReportTitle], [Description], [FilePath], [FileExtension], [FileSizeKB], [UploadedBy], [UploadDate], [IsActive], [EventDate], [MainCategory], [SubCategory])
						VALUES (@reportTitle, @description, @filePath, @fileExtension, @fileSizeKB, @uploadedBy, @uploadDate, @isActive, @eventDate, @mainCategory, @subCategory)
					`;
					
					const request_obj = pool.request();
					request_obj.input('reportTitle', reportTitle);
					request_obj.input('description', description || '');
					request_obj.input('filePath', uploadResult.filePath);
					request_obj.input('fileExtension', fileExtension || '');
					request_obj.input('fileSizeKB', fileSizeKB);
					request_obj.input('uploadedBy', uploadedBy);
					request_obj.input('uploadDate', uploadDate);
					request_obj.input('isActive', 1); // Set IsActive to 1 (true) by default
					request_obj.input('eventDate', eventDate);
					request_obj.input('mainCategory', mainCategory);
					request_obj.input('subCategory', subCategory);
					
					await request_obj.query(insertQuery);
				}
				
				uploadedFiles.push({
					originalName: file.name,
					fileName: uploadResult.fileName,
					filePath: uploadResult.filePath,
					fileUrl: uploadResult.fileUrl
				});
			}
		}

		return NextResponse.json({
			success: true,
			message: isUpdate 
				? (uploadedFiles.length > 0 ? `Successfully updated report with new file(s)` : `Successfully updated report`)
				: `Successfully uploaded ${uploadedFiles.length} report(s)`,
			uploadedFiles: uploadedFiles
		});

	} catch (error) {
		console.error("Error uploading reports:", error);
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		
		// Check if it's a filesystem error (common on Vercel)
		const isFilesystemError = errorMessage.includes('EACCES') || 
		                          errorMessage.includes('ENOENT') || 
		                          errorMessage.includes('EROFS') ||
		                          errorMessage.includes('read-only') ||
		                          errorMessage.includes('permission denied');
		
		let userMessage = "Failed to upload reports";
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
