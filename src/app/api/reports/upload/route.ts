import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { getUserIdFromRequest } from "@/lib/auth";
import { put } from "@vercel/blob";

// Helper function to check if user can upload reports
async function checkUploadAccess(userId: string | null): Promise<{ canUpload: boolean; message?: string }> {
	if (!userId) {
		return { canUpload: false, message: "Unauthorized" };
	}

	try {
		const pool = await getDb();
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

		const userAccess = accessResult.recordset[0];
		const accessLevel = userAccess.access_level;
		const isAdmin = accessLevel === 'Admin';
		
		// Check Upload_Report permission
		const uploadReportRaw = userAccess.Upload_Report;
		const checkBitField = (value: any): boolean => {
			if (value === null || value === undefined) return false;
			if (Buffer.isBuffer(value)) return value[0] === 1;
			if (typeof value === 'boolean') return value === true;
			if (typeof value === 'number') return value === 1;
			if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
			return false;
		};
		
		const uploadReport = checkBitField(uploadReportRaw);
		const canUploadReports = isAdmin || uploadReport;
		
		if (!canUploadReports) {
			return { 
				canUpload: false, 
				message: "Insufficient Permissions. This action requires Admin level access or Upload_Report permission. Please contact your administrator if you believe this is an error." 
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
		// Check upload access (Admin or Upload_Report permission)
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
		const maxSize = 20 * 1024 * 1024; // 20MB (increased from 10MB)
		
		for (const file of files) {
			const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
			
			if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
				return NextResponse.json({
					success: false,
					message: `File ${file.name} is not a supported document type`,
					hint: 'Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX'
				}, { status: 400 });
			}
			
			if (file.size > maxSize) {
				return NextResponse.json({
					success: false,
					ok: false,
					message: `File ${file.name} is too large. Maximum file size is 20MB.`,
					fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
					maxSize: '20MB'
				}, { status: 413 });
			}
		}

		// Check if we're on Vercel (read-only filesystem)
		const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
		const useBlobStorage = isVercel && process.env.BLOB_READ_WRITE_TOKEN;
		
		// Create upload directory structure (only for non-Vercel or when not using blob)
		let uploadDir: string | null = null;
		if (!useBlobStorage) {
			uploadDir = join(process.cwd(), 'public', 'uploads', 'reports', mainCategory, subCategory);
			
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
					const blobPath = `reports/${mainCategory}/${subCategory}/${fileName}`;
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
					relativePath = `uploads/reports/${mainCategory}/${subCategory}/${fileName}`;
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
				INSERT INTO [_rifiiorg_db].[rifiiorg].[tblReports] 
				([ReportTitle], [Description], [FilePath], [EventDate], [MainCategory], [SubCategory])
				VALUES (@reportTitle, @description, @filePath, @eventDate, @mainCategory, @subCategory)
			`;
			
			const request_obj = pool.request();
			request_obj.input('reportTitle', reportTitle);
			request_obj.input('description', description || '');
			// Use blob URL if using blob storage, otherwise use relative path
			const dbFilePath = useBlobStorage ? filePath : `~/Uploads/Reports/${fileName}`;
			request_obj.input('filePath', dbFilePath);
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
		
		// Always return JSON, never HTML
		return NextResponse.json(
			{
				success: false,
				ok: false,
				message: "Failed to upload reports. Please check file size and format.",
				error: error instanceof Error ? error.message : "Unknown error",
				hint: "Max file size: 20MB per file. Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX"
			},
			{ 
				status: 500,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}
}

// Configure Next.js API Route
export const config = {
	api: {
		bodyParser: false,
	},
};

// Set runtime to edge for better performance (optional)
// export const runtime = 'edge'; // Uncomment if you want edge runtime
