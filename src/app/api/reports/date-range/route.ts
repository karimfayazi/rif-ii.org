import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
	try {
		const pool = await getDb();
		const result = await pool.request().query(`
			SELECT
				CONVERT(VARCHAR(10), MIN([EventDate]), 23) AS [MinDate],
				CONVERT(VARCHAR(10), MAX([EventDate]), 23) AS [MaxDate]
			FROM [_rifiiorg_db].[rifiiorg].[tblReports]
			WHERE [EventDate] IS NOT NULL
		`);

		const row = result.recordset?.[0];
		const minDate = row?.MinDate || "";
		const maxDate = row?.MaxDate || "";

		return NextResponse.json({
			success: true,
			minDate,
			maxDate,
		});
	} catch (error) {
		console.error("Error fetching reports date range:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch reports date range",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
