import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const pool = await getDb();
		
		const query = `
			SELECT 
				COALESCE([organization_department], 'Unknown') AS organization,
				COUNT(*) AS participantCount
			FROM [_rifiiorg_db].[dbo].[workshop_participants]
			WHERE [organization_department] IS NOT NULL
				AND [organization_department] != ''
			GROUP BY COALESCE([organization_department], 'Unknown')
			ORDER BY participantCount DESC
		`;
		
		const result = await pool.request().query(query);
		
		return NextResponse.json({
			success: true,
			organizationStats: result.recordset
		});
		
	} catch (error) {
		console.error("Error fetching organization stats:", error);
		return NextResponse.json({
			success: false,
			message: "Failed to fetch organization statistics",
			error: error instanceof Error ? error.message : "Unknown error"
		}, { status: 500 });
	}
}
