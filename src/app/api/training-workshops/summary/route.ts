import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

interface SummaryRow {
	TotalEvents: number;
	TotalMale: number;
	TotalFemale: number;
	TotalParticipants: number;
}

export async function GET() {
	try {
		const pool = await getDb();

		const query = `
			SELECT
				COUNT(DISTINCT TrainingEventCode) AS TotalEvents,
				SUM(ISNULL(TotalMale, 0))         AS TotalMale,
				SUM(ISNULL(TotalFemale, 0))       AS TotalFemale,
				SUM(ISNULL(TotalParticipants, 0)) AS TotalParticipants
			FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
		`;

		const result = await pool.request().query(query);
		const row = (result.recordset?.[0] ?? null) as SummaryRow | null;

		if (!row) {
			return NextResponse.json({
				success: true,
				data: {
					totalEvents: 0,
					totalMale: 0,
					totalFemale: 0,
					totalParticipants: 0,
				},
			});
		}

		const data = {
			totalEvents: Number(row.TotalEvents) || 0,
			totalMale: Number(row.TotalMale) || 0,
			totalFemale: Number(row.TotalFemale) || 0,
			totalParticipants: Number(row.TotalParticipants) || 0,
		};

		return NextResponse.json({ success: true, data });
	} catch (error) {
		console.error("Error fetching training-workshops summary:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch summary",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
