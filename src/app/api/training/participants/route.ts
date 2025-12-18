import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const sn = searchParams.get('sn');
		const district = searchParams.get('district');
		const tehsil = searchParams.get('tehsil');
		const gender = searchParams.get('gender');
		const organizationDepartment = searchParams.get('organizationDepartment');
		const workshopTrainingName = searchParams.get('workshopTrainingName');

		const pool = await getDb();
		let query = `
			SELECT TOP (1000) 
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
				CASE 
					WHEN [start_date] IS NULL THEN NULL
					ELSE CONVERT(VARCHAR(10), [start_date], 120)
				END AS [start_date],
				CASE 
					WHEN [end_date] IS NULL THEN NULL
					ELSE CONVERT(VARCHAR(10), [end_date], 120)
				END AS [end_date],
				[date_entered_by],
				CONVERT(VARCHAR(10), [entry_timestamp], 105) AS [entry_timestamp],
				[Training_Unit],
				[Venue],
				[Duration_Days]
			FROM [_rifiiorg_db].[dbo].[workshop_participants]
			WHERE 1=1
		`;

		const request_obj = pool.request();

		// If ID is provided, fetch single record
		if (sn) {
			query += ` AND [sn] = @sn`;
			request_obj.input('sn', parseInt(sn));
			const result = await request_obj.query(query);
			const participant = result.recordset?.[0] || null;
			
			return NextResponse.json({
				success: true,
				participant: participant
			});
		}

		// Add filters if provided
		if (district) {
			query += ` AND [district] = @district`;
			request_obj.input('district', district);
		}
		if (tehsil) {
			query += ` AND [tehsil] = @tehsil`;
			request_obj.input('tehsil', tehsil);
		}
		if (gender) {
			query += ` AND [gender] = @gender`;
			request_obj.input('gender', gender);
		}
		if (organizationDepartment) {
			query += ` AND [organization_department] = @organizationDepartment`;
			request_obj.input('organizationDepartment', organizationDepartment);
		}
		if (workshopTrainingName) {
			query += ` AND [workshop_training_name] = @workshopTrainingName`;
			request_obj.input('workshopTrainingName', workshopTrainingName);
		}

		query += ` ORDER BY [entry_timestamp] DESC, [participant_name]`;

		const result = await request_obj.query(query);
		const participants = result.recordset || [];
		
		return NextResponse.json({
			success: true,
			participants: participants
		});
	} catch (error) {
		console.error("Error fetching workshop participants data:", error);
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		const errorStack = error instanceof Error ? error.stack : undefined;
		console.error("Error details:", { errorMessage, errorStack });
		
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch workshop participants data",
				error: errorMessage,
				details: process.env.NODE_ENV === 'development' ? errorStack : undefined
			},
			{ status: 500 }
		);
	}
}


