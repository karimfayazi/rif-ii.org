import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const pool = await getDb();

		const query = `
			SELECT
				[Event Type],
				[# of Events],
				[# of Participants],
				[Male Participants],
				[Female Participants]
			FROM [_rifiiorg_db].[rifiiorg].[vw_training_participants_summary]
		`;

		const result = await pool.request().query(query);

		const data = (result.recordset || []).map((row: any) => ({
			EventType: String(row["Event Type"] || ""),
			Events: Number(row["# of Events"]) || 0,
			Participants: Number(row["# of Participants"]) || 0,
			Male: Number(row["Male Participants"]) || 0,
			Female: Number(row["Female Participants"]) || 0,
		}));

		return NextResponse.json({
			success: true,
			data,
		});
	} catch (error) {
		console.error("Error fetching training participants summary:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch training participants summary",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
