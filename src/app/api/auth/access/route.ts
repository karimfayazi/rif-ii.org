import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { checkBitField } from "@/lib/access-permissions";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get('userId');
		
		if (!userId) {
			return NextResponse.json({
				success: false,
				message: "User ID is required"
			}, { status: 400 });
		}

		const pool = await getDb();
		// Query all upload permission fields - using exact field names from database
		const query = `
			SELECT 
				[access_level], 
				[access_add], 
				[access_edit], 
				[access_delete], 
				[access_reports], 
				[UserLoginLogs], 
				[Tracking_Section], 
				[Training_Section], 
				[Setting], 
				[Upload_Report], 
				[Upload_Pictures], 
				[Upload_Documents],
				[security],
				[access_links],
				[access_security_updates],
				[access_news],
				[access_security_incidents_data]
			FROM [_rifiiorg_db].[dbo].[tbl_user_access]
			WHERE [username] = @userId OR [email] = @userId
		`;
		
		console.log(`[Access API] Querying user: ${userId}`);
		
		const result = await pool.request()
			.input('userId', userId)
			.query(query);
			
		if (result.recordset.length === 0) {
			console.log(`[Access API] User not found: ${userId}`);
			return NextResponse.json({
				success: false,
				message: "User not found",
				accessLevel: null
			});
		}
		
		const userAccess = result.recordset[0];
		console.log(`[Access API] User found. Raw Upload_Report:`, userAccess.Upload_Report, `Upload_Pictures:`, userAccess.Upload_Pictures, `Upload_Documents:`, userAccess.Upload_Documents);
		const accessLevel = userAccess.access_level;
		// Check if access_level is exactly 'Admin' (case-sensitive as per database requirement)
		const isAdmin = accessLevel === 'Admin';
		
		// Get permission fields (treat 1/true as enabled, 0/false/null as disabled)
		const accessAdd = userAccess.access_add === true || userAccess.access_add === 1;
		const accessEdit = userAccess.access_edit === true || userAccess.access_edit === 1;
		const accessDelete = userAccess.access_delete === true || userAccess.access_delete === 1;
		const accessReports = userAccess.access_reports === true || userAccess.access_reports === 1;
		const userLoginLogs = userAccess.UserLoginLogs === true || userAccess.UserLoginLogs === 1;
		
		// Upload_Report check: allow if true, 1, or string "1"/"true"
		// Debug: Log the raw value to see what we're getting from the database
		const uploadReportRaw = userAccess.Upload_Report;
		console.log(`[Access API] User: ${userId}, Upload_Report raw value:`, uploadReportRaw, `Type:`, typeof uploadReportRaw);
		
		// Handle various SQL Server BIT field return types (boolean, number, string, Buffer)
		let uploadReport = false;
		if (uploadReportRaw !== null && uploadReportRaw !== undefined) {
			// If it's a Buffer (SQL Server BIT can return as Buffer), convert to number first
			if (Buffer.isBuffer(uploadReportRaw)) {
				uploadReport = uploadReportRaw[0] === 1;
			} else if (typeof uploadReportRaw === 'boolean') {
				uploadReport = uploadReportRaw === true;
			} else if (typeof uploadReportRaw === 'number') {
				uploadReport = uploadReportRaw === 1;
			} else if (typeof uploadReportRaw === 'string') {
				uploadReport = uploadReportRaw === '1' || uploadReportRaw.toLowerCase() === 'true';
			}
		}
		
		// Allow upload if user is Admin OR has Upload_Report = true/1
		const canUploadReport = isAdmin || uploadReport;
		
		// Upload_Pictures check
		const uploadPicturesRaw = userAccess.Upload_Pictures;
		const uploadPictures = checkBitField(uploadPicturesRaw);
		const canUploadPictures = isAdmin || uploadPictures;
		
		// Upload_Documents check
		const uploadDocumentsRaw = userAccess.Upload_Documents;
		const uploadDocuments = checkBitField(uploadDocumentsRaw);
		const canUploadDocuments = isAdmin || uploadDocuments;

		const accessSecurity = checkBitField(userAccess.security);
		const accessLinks = checkBitField(userAccess.access_links);
		const accessSecurityUpdates = checkBitField(userAccess.access_security_updates);
		const accessNews = checkBitField(userAccess.access_news);
		const accessSecurityIncidentsData = checkBitField(userAccess.access_security_incidents_data);
		
		console.log(`[Access API] User: ${userId}, isAdmin: ${isAdmin}`);
		console.log(`[Access API] Upload_Report raw: ${uploadReportRaw}, parsed: ${uploadReport}, canUpload: ${canUploadReport}`);
		console.log(`[Access API] Upload_Pictures raw: ${uploadPicturesRaw}, parsed: ${uploadPictures}, canUploadPictures: ${canUploadPictures}`);
		console.log(`[Access API] Upload_Documents raw: ${uploadDocumentsRaw}, parsed: ${uploadDocuments}, canUploadDocuments: ${canUploadDocuments}`);
		
		// Get Tracking_Section and Training_Section (default to true if null/undefined)
		const trackingSection = userAccess.Tracking_Section !== false && userAccess.Tracking_Section !== 0;
		const trainingSection = userAccess.Training_Section !== false && userAccess.Training_Section !== 0;
		
		// Get Setting field (default to false if null/undefined/0)
		const setting = userAccess.Setting === true || userAccess.Setting === 1;
		
		return NextResponse.json({
			success: true,
			accessLevel: accessLevel,
			isAdmin: isAdmin,
			canUpload: canUploadReport, // Allow if Admin OR has Upload_Report permission
			canUploadPictures: canUploadPictures, // Allow if Admin OR has Upload_Pictures permission
			canUploadDocuments: canUploadDocuments, // Allow if Admin OR has Upload_Documents permission
			canManageCategories: isAdmin,
			canManageSubCategories: isAdmin,
			accessAdd: accessAdd,
			accessEdit: accessEdit,
			accessDelete: accessDelete,
			accessReports: accessReports,
			userLoginLogs: userLoginLogs,
			trackingSection: trackingSection,
			trainingSection: trainingSection,
			setting: setting,
			uploadReport: uploadReport,
			uploadPictures: uploadPictures,
			uploadDocuments: uploadDocuments,
			accessSecurity: accessSecurity,
			accessLinks: accessLinks,
			accessSecurityUpdates: accessSecurityUpdates,
			accessNews: accessNews,
			accessSecurityIncidentsData: accessSecurityIncidentsData
		});
	} catch (error) {
		console.error("Error checking user access:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to check user access",
				error: error instanceof Error ? error.message : "Unknown error",
				accessLevel: null,
				isAdmin: false,
				canUpload: false,
				canManageCategories: false,
				canManageSubCategories: false
			},
			{ status: 500 }
		);
	}
}
