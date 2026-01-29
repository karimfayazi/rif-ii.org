import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import sql from "mssql";

export async function GET(request: NextRequest) {
	try {
		const pool = await getDb();
		const searchParams = request.nextUrl.searchParams;
		const trainingEventCode = searchParams.get('trainingEventCode');

		if (!trainingEventCode) {
			return NextResponse.json(
				{ success: false, message: "TrainingEventCode is required" },
				{ status: 400 }
			);
		}

		const query = `
			SELECT 
				[sn],
				[participant_name],
				[so_do_wo_ho],
				[gender],
				[organization_department],
				[designation],
				[profession],
				[cnic_number],
				[contact_number],
				[tehsil],
				[district],
				[NC_VC],
				[workshop_training_name],
				[workshop_session_conference],
				[start_date],
				[end_date],
				[Training_Unit],
				[Venue],
				[Duration_Days]
			FROM [_rifiiorg_db].[dbo].[workshop_participants]
			WHERE [TrainingEventCode] = @trainingEventCode
			ORDER BY [participant_name]
		`;

		const result = await pool.request()
			.input('trainingEventCode', sql.NVarChar, trainingEventCode)
			.query(query);

		return NextResponse.json({
			success: true,
			participants: result.recordset || []
		});

	} catch (error) {
		console.error("Error fetching event participants:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch event participants",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
