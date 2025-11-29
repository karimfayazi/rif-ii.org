import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const sector = searchParams.get('sector');
		const district = searchParams.get('district');
		const tehsil = searchParams.get('tehsil');
		const outputID = searchParams.get('outputID');
		const activityID = searchParams.get('activityID');
		const subActivityID = searchParams.get('subActivityID');
		const subSubActivityID = searchParams.get('subSubActivityID');
		const search = searchParams.get('search');

		const pool = await getDb();
		let query = `
			SELECT TOP (1000) 
				[OutputID],
				[Output],
				[MainActivityName],
				[SubActivityName],
				[Sub_Sub_ActivityID_ID],
				[Sub_Sub_ActivityName],
				[UnitName],
				[PlannedTargets],
				[AchievedTargets],
				[ActivityProgress],
				[ActivityWeightage],
				[ActivityWeightageProgress],
				CONVERT(VARCHAR(10), [PlannedStartDate], 105) AS [PlannedStartDate],
				CONVERT(VARCHAR(10), [PlannedEndDate], 105) AS [PlannedEndDate],
				[Remarks],
				[Links],
				[Sector_Name],
				[District],
				[Tehsil],
				[Beneficiaries_Male],
				[Beneficiaries_Female],
				[Total_Beneficiaries],
				[Beneficiary_Types],
				[SubActivityID],
				[ActivityID],
				[Sub_Sub_ActivityID]
			FROM [_rifiiorg_db].[rifiiorg].[View_Tracking_Sheet]
			WHERE 1=1
		`;

		const request_obj = pool.request();

		// Add filters if provided
		if (sector) {
			query += ` AND [Sector_Name] = @sector`;
			request_obj.input('sector', sector);
		}
		if (district) {
			query += ` AND [District] = @district`;
			request_obj.input('district', district);
		}
		if (tehsil) {
			query += ` AND [Tehsil] = @tehsil`;
			request_obj.input('tehsil', tehsil);
		}
		if (outputID) {
			query += ` AND [OutputID] = @outputID`;
			request_obj.input('outputID', outputID);
		}
		if (activityID) {
			query += ` AND [ActivityID] = @activityID`;
			request_obj.input('activityID', activityID);
		}
		if (subActivityID) {
			query += ` AND [SubActivityID] = @subActivityID`;
			request_obj.input('subActivityID', subActivityID);
		}
		if (subSubActivityID) {
			query += ` AND [Sub_Sub_ActivityID] = @subSubActivityID`;
			request_obj.input('subSubActivityID', subSubActivityID);
		}
		if (search) {
			query += ` AND ([MainActivityName] LIKE @search OR [SubActivityName] LIKE @search OR [Sub_Sub_ActivityName] LIKE @search OR [Output] LIKE @search)`;
			request_obj.input('search', `%${search}%`);
		}

		query += ` ORDER BY [OutputID], [MainActivityName], [SubActivityName]`;

		const result = await request_obj.query(query);
		const trackingData = result.recordset || [];
		
		return NextResponse.json({
			success: true,
			trackingData: trackingData
		});
	} catch (error) {
		console.error("Error fetching tracking sheet data:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch tracking sheet data",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
