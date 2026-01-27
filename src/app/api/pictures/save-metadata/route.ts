import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

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
				message: "Insufficient Permissions. This action requires Admin level access or Upload_Pictures permission." 
			};
		}

		return { canUpload: true };
	} catch (error) {
		console.error("Error checking upload access:", error);
		return { canUpload: false, message: "Error checking access permissions" };
	}
}

type SaveMetadataRequest = {
	groupName: string;
	mainCategory: string;
	subCategory: string;
	eventDate: string;
	uploadedBy: string;
	files: Array<{
		url: string;
		pathname: string;
		size: number;
		uploadedAt: string;
		originalName: string;
	}>;
};

export async function POST(request: NextRequest) {
	try {
		// Check upload access
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

		const body: SaveMetadataRequest = await request.json();
		
		const { groupName, mainCategory, subCategory, eventDate, uploadedBy, files } = body;
		
		if (!groupName || !mainCategory || !subCategory || !eventDate || !uploadedBy) {
			return NextResponse.json({
				success: false,
				message: "All required fields must be filled"
			}, { status: 400 });
		}
		
		if (!files || files.length === 0) {
			return NextResponse.json({
				success: false,
				message: "No files provided"
			}, { status: 400 });
		}

		const pool = await getDb();
		const savedFiles = [];

		// Insert each file metadata into database
		for (const file of files) {
			// Calculate file size in KB
			const fileSizeKB = Math.round(file.size / 1024);
			
			const insertQuery = `
				INSERT INTO [_rifiiorg_db].[dbo].[tblPictures] 
				([GroupName], [MainCategory], [SubCategory], [FileName], [FilePath], [FileSizeKB], [UploadedBy], [UploadDate], [IsActive], [EventDate])
				VALUES (@groupName, @mainCategory, @subCategory, @fileName, @filePath, @fileSizeKB, @uploadedBy, @uploadDate, @isActive, @eventDate)
			`;
			
			const request_obj = pool.request();
			request_obj.input('groupName', groupName);
			request_obj.input('mainCategory', mainCategory);
			request_obj.input('subCategory', subCategory);
			request_obj.input('fileName', file.originalName);
			request_obj.input('filePath', file.url); // Store the blob URL
			request_obj.input('fileSizeKB', fileSizeKB);
			request_obj.input('uploadedBy', uploadedBy);
			request_obj.input('uploadDate', new Date().toISOString());
			request_obj.input('isActive', 1);
			request_obj.input('eventDate', eventDate);
			
			await request_obj.query(insertQuery);
			
			savedFiles.push({
				originalName: file.originalName,
				url: file.url,
				pathname: file.pathname,
				size: file.size,
				fileSizeKB: fileSizeKB
			});
		}

		return NextResponse.json({
			success: true,
			message: `Successfully saved ${savedFiles.length} picture(s)`,
			savedFiles: savedFiles
		});

	} catch (error) {
		console.error("Error saving picture metadata:", error);
		
		return NextResponse.json(
			{
				success: false,
				message: "Failed to save picture metadata",
				error: error instanceof Error ? error.message : "Unknown error"
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
