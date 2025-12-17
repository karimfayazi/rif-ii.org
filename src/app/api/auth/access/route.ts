import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

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
		const query = `
			SELECT [access_level], [access_add], [access_edit], [access_delete], [access_reports], [UserLoginLogs], [Tracking_Section], [Training_Section], [Setting], [security]
			FROM [_rifiiorg_db].[dbo].[tbl_user_access]
			WHERE [username] = @userId OR [email] = @userId
		`;
		
		const result = await pool.request()
			.input('userId', userId)
			.query(query);
			
		if (result.recordset.length === 0) {
			return NextResponse.json({
				success: false,
				message: "User not found",
				accessLevel: null
			});
		}
		
		const userAccess = result.recordset[0];
		const accessLevel = userAccess.access_level;
		// Check if access_level is exactly 'Admin' (case-sensitive as per database requirement)
		const isAdmin = accessLevel === 'Admin';
		
		// Get permission fields (treat 1/true as enabled, 0/false/null as disabled)
		const accessAdd = userAccess.access_add === true || userAccess.access_add === 1;
		const accessEdit = userAccess.access_edit === true || userAccess.access_edit === 1;
		const accessDelete = userAccess.access_delete === true || userAccess.access_delete === 1;
		const accessReports = userAccess.access_reports === true || userAccess.access_reports === 1;
		const userLoginLogs = userAccess.UserLoginLogs === true || userAccess.UserLoginLogs === 1;
		
		// Get Tracking_Section and Training_Section (default to true if null/undefined)
		const trackingSection = userAccess.Tracking_Section !== false && userAccess.Tracking_Section !== 0;
		const trainingSection = userAccess.Training_Section !== false && userAccess.Training_Section !== 0;
		
		// Get Setting field (default to false if null/undefined/0)
		const setting = userAccess.Setting === true || userAccess.Setting === 1;
		
		// Get security field (default to false if null/undefined/0)
		const security = userAccess.security === true || userAccess.security === 1;
		
		return NextResponse.json({
			success: true,
			accessLevel: accessLevel,
			isAdmin: isAdmin,
			canUpload: isAdmin,
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
			security: security
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
