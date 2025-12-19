import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { getUserIdFromRequest } from "@/lib/auth";

// Helper function to check if user has Upload_Pictures permission or is Admin
async function checkUploadPicturesAccess(userId: string | null): Promise<{ canUpload: boolean; message?: string }> {
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

		const accessLevel = accessResult.recordset[0].access_level;
		const uploadPicturesRaw = accessResult.recordset[0].Upload_Pictures;
		
		// Check if access_level is exactly 'Admin' (case-sensitive as per database requirement)
		const isAdmin = accessLevel === 'Admin';
		
		console.log(`[Upload Pictures Access] User: ${userId}, access_level: "${accessLevel}", isAdmin: ${isAdmin}, Upload_Pictures raw:`, uploadPicturesRaw);
		
		// Helper function to check BIT field values
		const checkBitField = (value: any): boolean => {
			if (value === null || value === undefined) return false;
			if (Buffer.isBuffer(value)) return value[0] === 1;
			if (typeof value === 'boolean') return value === true;
			if (typeof value === 'number') return value === 1;
			if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
			return false;
		};
		
		const uploadPictures = checkBitField(uploadPicturesRaw);
		const canUpload = isAdmin || uploadPictures;
		
		console.log(`[Upload Pictures Access] uploadPictures permission: ${uploadPictures}, canUpload: ${canUpload}`);
		
		if (!canUpload) {
			return { 
				canUpload: false, 
				message: "Insufficient Permissions. This action requires Admin access or Upload Pictures permission. Please contact your administrator if you believe this is an error." 
			};
		}

		return { canUpload: true };
	} catch (error) {
		console.error("Error checking upload pictures access:", error);
		return { canUpload: false, message: "Error checking access permissions" };
	}
}

export async function POST(request: NextRequest) {
	try {
		// Check Upload_Pictures permission
		const userId = getUserIdFromRequest(request);
		const accessCheck = await checkUploadPicturesAccess(userId);
		
		if (!accessCheck.canUpload) {
			return NextResponse.json(
				{
					success: false,
					message: accessCheck.message || "Access denied. Upload Pictures permission required."
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

		// Format event date for folder name (YYYY-MM-DD format)
		const formatDateForFolder = (dateString: string) => {
			try {
				const date = new Date(dateString);
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				return `${year}-${month}-${day}`;
			} catch {
				// Fallback: use date string as-is, sanitize it
				return dateString.replace(/[^a-zA-Z0-9-]/g, '_');
			}
		};

		// Sanitize folder names to avoid filesystem issues
		const sanitizeFolderName = (name: string) => {
			return name.replace(/[^a-zA-Z0-9-_]/g, '_').trim();
		};

		const sanitizedMainCategory = sanitizeFolderName(mainCategory);
		const sanitizedGroupName = sanitizeFolderName(groupName);
		const formattedEventDate = formatDateForFolder(eventDate);

		// Create upload directory structure: Main Category > Event Name > Event Date
		const uploadDir = join(process.cwd(), 'public', 'uploads', 'pictures', sanitizedMainCategory, sanitizedGroupName, formattedEventDate);
		
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
			const relativePath = `uploads/pictures/${sanitizedMainCategory}/${sanitizedGroupName}/${formattedEventDate}/${fileName}`;
			
			// Save file to disk
			const bytes = await file.arrayBuffer();
			await writeFile(filePath, Buffer.from(bytes));
			
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
			request_obj.input('filePath', relativePath);
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

