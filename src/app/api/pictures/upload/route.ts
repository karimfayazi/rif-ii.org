import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
	try {
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

		// Create upload directory structure
		const uploadDir = join(process.cwd(), 'public', 'uploads', 'pictures', mainCategory, subCategory, groupName);
		
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
			const relativePath = `uploads/pictures/${mainCategory}/${subCategory}/${groupName}/${fileName}`;
			
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

