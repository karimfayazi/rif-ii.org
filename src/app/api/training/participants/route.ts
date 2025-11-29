import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
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
				[workshop_training_name],
				[workshop_session_conference],
				CONVERT(VARCHAR(10), [start_date], 105) AS [start_date],
				CONVERT(VARCHAR(10), [end_date], 105) AS [end_date],
				[date_entered_by],
				CONVERT(VARCHAR(10), [entry_timestamp], 105) AS [entry_timestamp]
			FROM [_rifiiorg_db].[rifiiorg].[workshop_participants]
			WHERE 1=1
		`;

		const request_obj = pool.request();

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
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch workshop participants data",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}


