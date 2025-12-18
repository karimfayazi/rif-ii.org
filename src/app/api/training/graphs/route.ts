import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const pool = await getDb();
		
		const query = `
			SELECT 
				COALESCE([workshop_training_name], [workshop_session_conference], 'Unknown') AS EventType,
				COALESCE([district], 'Unknown') AS District,
				SUM(CASE WHEN LOWER(LTRIM(RTRIM([gender]))) = 'male' THEN 1 ELSE 0 END) AS TotalMale,
				SUM(CASE WHEN LOWER(LTRIM(RTRIM([gender]))) = 'female' THEN 1 ELSE 0 END) AS TotalFemale,
				COUNT(*) AS TotalParticipants
			FROM [_rifiiorg_db].[dbo].[workshop_participants]
			WHERE ([workshop_training_name] IS NOT NULL OR [workshop_session_conference] IS NOT NULL)
				AND [district] IS NOT NULL
			GROUP BY 
				COALESCE([workshop_training_name], [workshop_session_conference], 'Unknown'),
				COALESCE([district], 'Unknown')
			ORDER BY EventType, District
		`;
		
		const result = await pool.request().query(query);
		
		return NextResponse.json({
			success: true,
			graphData: result.recordset
		});
		
	} catch (error) {
		console.error("Error fetching training graphs data:", error);
		return NextResponse.json({
			success: false,
			message: "Failed to fetch training graphs data",
			error: error instanceof Error ? error.message : "Unknown error"
		}, { status: 500 });
	}
}

