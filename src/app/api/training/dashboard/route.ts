import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
	try {
		const pool = await getDb();

		// Overall totals
		const overallResult = await pool.request().query(`
			SELECT 
				COUNT(*) AS totalTrainings,
				ISNULL(SUM([TotalDays]), 0) AS totalDays,
				ISNULL(SUM([TotalMale]), 0) AS totalMale,
				ISNULL(SUM([TotalFemale]), 0) AS totalFemale,
				ISNULL(SUM([TotalParticipants]), 0) AS totalParticipants
			FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
		`);

		const overall = overallResult.recordset?.[0] || {
			totalTrainings: 0,
			totalDays: 0,
			totalMale: 0,
			totalFemale: 0,
			totalParticipants: 0,
		};

		// Event type wise aggregates
		const eventTypeResult = await pool.request().query(`
			SELECT 
				ISNULL([EventType], 'Unknown') AS eventType,
				COUNT(*) AS totalTrainings,
				ISNULL(SUM([TotalDays]), 0) AS totalDays,
				ISNULL(SUM([TotalMale]), 0) AS totalMale,
				ISNULL(SUM([TotalFemale]), 0) AS totalFemale,
				ISNULL(SUM([TotalParticipants]), 0) AS totalParticipants
			FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
			GROUP BY [EventType]
			ORDER BY totalTrainings DESC
		`);

		// District wise aggregates
		const districtResult = await pool.request().query(`
			SELECT 
				ISNULL([District], 'Unknown') AS district,
				COUNT(*) AS totalTrainings,
				ISNULL(SUM([TotalDays]), 0) AS totalDays,
				ISNULL(SUM([TotalMale]), 0) AS totalMale,
				ISNULL(SUM([TotalFemale]), 0) AS totalFemale,
				ISNULL(SUM([TotalParticipants]), 0) AS totalParticipants
			FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
			GROUP BY [District]
			ORDER BY totalTrainings DESC
		`);

		return NextResponse.json({
			success: true,
			overall,
			byEventType: eventTypeResult.recordset || [],
			byDistrict: districtResult.recordset || [],
		});
	} catch (error) {
		console.error("Error fetching training dashboard data:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch training dashboard data",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}


