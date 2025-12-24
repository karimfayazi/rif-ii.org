import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { getUserIdFromRequest } from "@/lib/auth";
import { put } from "@vercel/blob";

// Helper function to check if user can upload pictures
async function checkUploadAccess(userId: string | null): Promise<{ canUpload: boolean; message?: string }> {
	if (!userId) {
		return { canUpload: false, message: "Unauthorized" };
	}

	try {
		const pool = await getDb();
		const accessQuery = `
			SELECT [access_level], [Upload_Pictures]
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
		
		// Check Upload_Pictures permission
		const uploadPicturesRaw = userAccess.Upload_Pictures;
		const checkBitField = (value: any): boolean => {
			if (value === null || value === undefined) return false;
			if (Buffer.isBuffer(value)) return value[0] === 1;
			if (typeof value === 'boolean') return value === true;
			if (typeof value === 'number') return value === 1;
			if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
			return false;
		};
		
		const uploadPictures = checkBitField(uploadPicturesRaw);
		const canUploadPictures = isAdmin || uploadPictures;
		
		if (!canUploadPictures) {
			return { 
				canUpload: false, 
				message: "Insufficient Permissions. This action requires Admin level access or Upload_Pictures permission. Please contact your administrator if you believe this is an error." 
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
		// Check upload access (Admin or Upload_Pictures permission)
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
		const groupName = formData.get('groupName') as string;
		const mainCategory = formData.get('mainCategory') as string;
		const subCategory = formData.get('subCategory') as string;
		const eventDate = formData.get('eventDate') as string;
		const uploadedBy = formData.get('uploadedBy') as string;
		
		// Get files
		const files = formData.getAll('files') as File[];
		
		if (!groupName || !mainCategory || !subCategory || !eventDate || !uploadedBy) {
			return NextResponse.json({
				success: false,
				message: "All form fields are required"
			}, { status: 400 });
		}
		
		if (files.length === 0) {
			return NextResponse.json({
				success: false,
				message: "No files provided"
			}, { status: 400 });
		}

		// Validate file types and sizes
		const maxSize = 10 * 1024 * 1024; // 10MB
		for (const file of files) {
			if (!file.type.startsWith('image/')) {
				return NextResponse.json({
					success: false,
					message: `File ${file.name} is not an image`
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
			uploadDir = join(process.cwd(), 'public', 'uploads', 'pictures', mainCategory, subCategory, groupName);
			
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
					const blobPath = `pictures/${mainCategory}/${subCategory}/${groupName}/${fileName}`;
					const blob = await put(blobPath, buffer, {
						access: 'public',
						contentType: file.type || 'image/jpeg',
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
					relativePath = `uploads/pictures/${mainCategory}/${subCategory}/${groupName}/${fileName}`;
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
			
			// Calculate file size in KB
			const fileSizeKB = Math.round(file.size / 1024);
			
			// Insert into database
			const insertQuery = `
				INSERT INTO [_rifiiorg_db].[dbo].[tblPictures] 
				([GroupName], [MainCategory], [SubCategory], [FileName], [FilePath], [FileSizeKB], [UploadedBy], [UploadDate], [IsActive], [EventDate])
				VALUES (@groupName, @mainCategory, @subCategory, @fileName, @filePath, @fileSizeKB, @uploadedBy, @uploadDate, @isActive, @eventDate)
			`;
			
			const request_obj = pool.request();
			request_obj.input('groupName', groupName);
			request_obj.input('mainCategory', mainCategory);
			request_obj.input('subCategory', subCategory);
			request_obj.input('fileName', file.name);
			// Use blob URL if using blob storage, otherwise use relative path
			const dbFilePath = useBlobStorage ? filePath : relativePath;
			request_obj.input('filePath', dbFilePath);
			request_obj.input('fileSizeKB', fileSizeKB);
			request_obj.input('uploadedBy', uploadedBy);
			request_obj.input('uploadDate', new Date().toISOString());
			request_obj.input('isActive', 1);
			request_obj.input('eventDate', eventDate);
			
			await request_obj.query(insertQuery);
			
			uploadedFiles.push({
				originalName: file.name,
				fileName: fileName,
				filePath: relativePath,
				fileSizeKB: fileSizeKB
			});
		}

		return NextResponse.json({
			success: true,
			message: `Successfully uploaded ${uploadedFiles.length} picture(s)`,
			uploadedFiles: uploadedFiles
		});

	} catch (error) {
		console.error("Error uploading pictures:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to upload pictures",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

