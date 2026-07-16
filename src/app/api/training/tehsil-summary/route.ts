import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
	try {
		const pool = await getDb();

		const query = `
			SELECT
				COALESCE(NULLIF(LTRIM(RTRIM([LocationTehsil])), ''), 'Unknown') AS LocationTehsil,
				COUNT(*) AS Events,
				SUM(ISNULL([TotalMale], 0)) AS TotalMale,
				SUM(ISNULL([TotalFemale], 0)) AS TotalFemale,
				SUM(ISNULL([TotalParticipants], 0)) AS TotalParticipants
			FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
			GROUP BY COALESCE(NULLIF(LTRIM(RTRIM([LocationTehsil])), ''), 'Unknown')
			ORDER BY TotalParticipants DESC, LocationTehsil ASC
		`;

		const result = await pool.request().query(query);

		const data = (result.recordset || []).map((row: {
			LocationTehsil?: string;
			Events?: number;
			TotalMale?: number;
			TotalFemale?: number;
			TotalParticipants?: number;
		}) => ({
			LocationTehsil: String(row.LocationTehsil || "Unknown"),
			Events: Number(row.Events) || 0,
			TotalMale: Number(row.TotalMale) || 0,
			TotalFemale: Number(row.TotalFemale) || 0,
			TotalParticipants: Number(row.TotalParticipants) || 0,
		}));

		return NextResponse.json({
			success: true,
			data,
		});
	} catch (error) {
		console.error("Error fetching training tehsil summary:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch training tehsil summary",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
