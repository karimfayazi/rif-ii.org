import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const pool = await getDb();
		
		// 1. Participant Coverage & Uniqueness
		const coverageQuery = `
			SELECT 
				COUNT(*) AS TotalParticipants,
				COUNT(DISTINCT [cnic_number]) AS UniqueParticipants,
				COUNT(*) - COUNT(DISTINCT [cnic_number]) AS DuplicateRecords
			FROM [_rifiiorg_db].[dbo].[workshop_participants]
			WHERE [cnic_number] IS NOT NULL AND [cnic_number] != ''
		`;
		
		// 2. Gender Distribution
		const genderQuery = `
			SELECT 
				LOWER(LTRIM(RTRIM([gender]))) AS Gender,
				COUNT(*) AS Count
			FROM [_rifiiorg_db].[dbo].[workshop_participants]
			WHERE [gender] IS NOT NULL
			GROUP BY LOWER(LTRIM(RTRIM([gender])))
		`;
		
		// 3. Geographical Coverage
		const geoQuery = `
			SELECT 
				COALESCE([district], 'Unknown') AS District,
				COALESCE([tehsil], 'Unknown') AS Tehsil,
				COALESCE([NC_VC], 'Unknown') AS NC_VC,
				COUNT(*) AS ParticipantCount
			FROM [_rifiiorg_db].[dbo].[workshop_participants]
			GROUP BY COALESCE([district], 'Unknown'), COALESCE([tehsil], 'Unknown'), COALESCE([NC_VC], 'Unknown')
			ORDER BY ParticipantCount DESC
		`;
		
		// 4. Training Effectiveness & Reach
		const effectivenessQuery = `
			SELECT 
				COALESCE([workshop_training_name], [workshop_session_conference], 'Unknown') AS TrainingName,
				COUNT(*) AS ParticipantCount,
				AVG(CAST([Duration_Days] AS FLOAT)) AS AvgDuration,
				COUNT(DISTINCT [workshop_training_name] + COALESCE([workshop_session_conference], '')) AS SessionCount
			FROM [_rifiiorg_db].[dbo].[workshop_participants]
			WHERE ([workshop_training_name] IS NOT NULL OR [workshop_session_conference] IS NOT NULL)
			GROUP BY COALESCE([workshop_training_name], [workshop_session_conference], 'Unknown')
			ORDER BY ParticipantCount DESC
		`;
		
		const [coverageResult, genderResult, geoResult, effectivenessResult] = await Promise.all([
			pool.request().query(coverageQuery),
			pool.request().query(genderQuery),
			pool.request().query(geoQuery),
			pool.request().query(effectivenessQuery)
		]);
		
		return NextResponse.json({
			success: true,
			coverage: coverageResult.recordset[0] || { TotalParticipants: 0, UniqueParticipants: 0, DuplicateRecords: 0 },
			gender: genderResult.recordset || [],
			geographical: geoResult.recordset || [],
			effectiveness: effectivenessResult.recordset || []
		});
		
	} catch (error) {
		console.error("Error fetching training analytics:", error);
		return NextResponse.json({
			success: false,
			message: "Failed to fetch training analytics",
			error: error instanceof Error ? error.message : "Unknown error"
		}, { status: 500 });
	}
}









