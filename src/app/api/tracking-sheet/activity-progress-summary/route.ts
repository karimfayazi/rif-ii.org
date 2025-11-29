import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const pool = await getDb();
		
		const query = `
			SELECT TOP (1000) 
				[ActivityID],
				[MainActivityName],
				[OutputID],
				[Weightage_of_Main_Activity],
				[TotalActivityWeightageProgress],
				[OutputWeightage]
			FROM [_rifiiorg_db].[rifiiorg].[View_Activity_Progress_Summary_v1]
			ORDER BY [OutputID], [ActivityID]
		`;

		const request_obj = pool.request();
		const result = await request_obj.query(query);
		
		const data = result.recordset || [];
		
		return NextResponse.json({
			success: true,
			activityProgress: data
		});
	} catch (error) {
		console.error("Error fetching activity progress summary:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch activity progress summary",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

