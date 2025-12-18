import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { getUserIdFromRequest } from "@/lib/auth";

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
		
		// Get files
		const files = formData.getAll('files') as File[];
		
		if (!reportTitle || !mainCategory || !subCategory || !eventDate || !uploadedBy) {
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

		// Create upload directory structure
		const uploadDir = join(process.cwd(), 'public', 'uploads', 'reports', mainCategory, subCategory);
		
		// Ensure directory exists
		if (!existsSync(uploadDir)) {
			await mkdir(uploadDir, { recursive: true });
		}

		const pool = await getDb();
		const uploadedFiles = [];

		// Process each file
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const fileExtension = file.name.split('.').pop();
			const fileName = `${Date.now()}_${i + 1}.${fileExtension}`;
			const filePath = join(uploadDir, fileName);
			const relativePath = `uploads/reports/${mainCategory}/${subCategory}/${fileName}`;
			
			// Calculate file size in KB
			const fileSizeKB = Math.round(file.size / 1024);
			
			// Get current date for UploadDate
			const uploadDate = new Date().toISOString().split('T')[0];
			
			// Save file to disk
			const bytes = await file.arrayBuffer();
			await writeFile(filePath, Buffer.from(bytes));
			
			// Insert into database
			const insertQuery = `
				INSERT INTO [_rifiiorg_db].[rifiiorg].[tblReports] 
				([ReportTitle], [Description], [FilePath], [FileExtension], [FileSizeKB], [UploadedBy], [UploadDate], [IsActive], [EventDate], [MainCategory], [SubCategory])
				VALUES (@reportTitle, @description, @filePath, @fileExtension, @fileSizeKB, @uploadedBy, @uploadDate, @isActive, @eventDate, @mainCategory, @subCategory)
			`;
			
			const request_obj = pool.request();
			request_obj.input('reportTitle', reportTitle);
			request_obj.input('description', description || '');
			request_obj.input('filePath', `~/Uploads/Reports/${fileName}`);
			request_obj.input('fileExtension', fileExtension || '');
			request_obj.input('fileSizeKB', fileSizeKB);
			request_obj.input('uploadedBy', uploadedBy);
			request_obj.input('uploadDate', uploadDate);
			request_obj.input('isActive', 1); // Set IsActive to 1 (true) by default
			request_obj.input('eventDate', eventDate);
			request_obj.input('mainCategory', mainCategory);
			request_obj.input('subCategory', subCategory);
			
			await request_obj.query(insertQuery);
			
			uploadedFiles.push({
				originalName: file.name,
				fileName: fileName,
				filePath: relativePath
			});
		}

		return NextResponse.json({
			success: true,
			message: `Successfully uploaded ${uploadedFiles.length} report(s)`,
			uploadedFiles: uploadedFiles
		});

	} catch (error) {
		console.error("Error uploading reports:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to upload reports",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
