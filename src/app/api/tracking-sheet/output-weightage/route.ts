import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const pool = await getDb();
		
		const query = `
			SELECT 
				[OutputID],
				CEILING(SUM([Weightage_of_Main_Activity])) AS TotalWeightage
			FROM [_rifiiorg_db].[dbo].[Tracking_Sheet_Main_Activities]
			GROUP BY [OutputID]
			ORDER BY [OutputID]
		`;

		const request_obj = pool.request();
		const result = await request_obj.query(query);
		
		const data = result.recordset || [];
		
		// Convert to array format (CEILING already returns integer, so no need to round)
		const outputData = data.map((item: any) => ({
			OutputID: item.OutputID?.toString() || '',
			TotalWeightage: parseInt(item.TotalWeightage) || 0
		}));
		
		return NextResponse.json({
			success: true,
			outputWeightage: outputData
		});
	} catch (error) {
		console.error("Error fetching output weightage:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch output weightage",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

