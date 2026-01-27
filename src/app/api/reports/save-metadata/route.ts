import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

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
				message: "Insufficient Permissions. This action requires Admin level access or Upload_Report permission." 
			};
		}

		return { canUpload: true };
	} catch (error) {
		console.error("Error checking upload access:", error);
		return { canUpload: false, message: "Error checking access permissions" };
	}
}

type SaveMetadataRequest = {
	reportTitle: string;
	description: string;
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
		
		const { reportTitle, description, mainCategory, subCategory, eventDate, uploadedBy, files } = body;
		
		if (!reportTitle || !mainCategory || !subCategory || !eventDate || !uploadedBy) {
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
			const insertQuery = `
				INSERT INTO [_rifiiorg_db].[rifiiorg].[tblReports] 
				([ReportTitle], [Description], [FilePath], [EventDate], [MainCategory], [SubCategory])
				VALUES (@reportTitle, @description, @filePath, @eventDate, @mainCategory, @subCategory)
			`;
			
			const request_obj = pool.request();
			request_obj.input('reportTitle', reportTitle);
			request_obj.input('description', description || '');
			request_obj.input('filePath', file.url); // Store the blob URL
			request_obj.input('eventDate', eventDate);
			request_obj.input('mainCategory', mainCategory);
			request_obj.input('subCategory', subCategory);
			
			await request_obj.query(insertQuery);
			
			savedFiles.push({
				originalName: file.originalName,
				url: file.url,
				pathname: file.pathname,
				size: file.size
			});
		}

		return NextResponse.json({
			success: true,
			message: `Successfully saved ${savedFiles.length} report(s)`,
			savedFiles: savedFiles
		});

	} catch (error) {
		console.error("Error saving report metadata:", error);
		
		return NextResponse.json(
			{
				success: false,
				message: "Failed to save report metadata",
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
