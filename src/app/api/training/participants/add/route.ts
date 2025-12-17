import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			participant_name,
			so_do_wo_ho,
			gender,
			organization_department,
			designation,
			profession,
			cnic_number,
			contact_number,
			tehsil,
			district,
			NC_VC,
			workshop_training_name,
			workshop_session_conference,
			start_date,
			end_date,
			date_entered_by,
			Training_Unit,
			Venue,
			Duration_Days
		} = body;

	const pool = await getDb();
	
	// Check for duplicate entries based on CNIC, Workshop/Session/Conference, and Start Date
	const duplicateCheckQuery = `
		SELECT COUNT(*) AS count
		FROM [_rifiiorg_db].[dbo].[workshop_participants]
		WHERE [cnic_number] = @cnic_number
			AND [workshop_session_conference] = @workshop_session_conference
			AND CAST([start_date] AS DATE) = CAST(@start_date AS DATE)
	`;

	const duplicateCheck = pool.request();
	duplicateCheck.input('cnic_number', cnic_number || null);
	duplicateCheck.input('workshop_session_conference', workshop_session_conference || null);
	duplicateCheck.input('start_date', start_date ? new Date(start_date) : null);

	const duplicateResult = await duplicateCheck.query(duplicateCheckQuery);
	const duplicateCount = duplicateResult.recordset?.[0]?.count || 0;

	if (duplicateCount > 0) {
		return NextResponse.json(
			{
				success: false,
				message: "Duplicate entry found! A participant with the same CNIC, Workshop/Session/Conference, and Start Date already exists."
			},
			{ status: 400 }
		);
	}

	const request_obj = pool.request();

	const query = `
		INSERT INTO [_rifiiorg_db].[dbo].[workshop_participants]
			(
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
				[date_entered_by],
				[entry_timestamp],
				[Training_Unit],
				[Venue],
				[Duration_Days]
			)
			VALUES
			(
				@participant_name,
				@so_do_wo_ho,
				@gender,
				@organization_department,
				@designation,
				@profession,
				@cnic_number,
				@contact_number,
				@tehsil,
				@district,
				@NC_VC,
				@workshop_training_name,
				@workshop_session_conference,
				@start_date,
				@end_date,
				@date_entered_by,
				GETDATE(),
				@Training_Unit,
				@Venue,
				@Duration_Days
			);
			SELECT SCOPE_IDENTITY() AS [sn];
		`;

		request_obj.input('participant_name', participant_name || null);
		request_obj.input('so_do_wo_ho', so_do_wo_ho || null);
		request_obj.input('gender', gender || null);
		request_obj.input('organization_department', organization_department || null);
		request_obj.input('designation', designation || null);
		request_obj.input('profession', profession || null);
		request_obj.input('cnic_number', cnic_number || null);
		request_obj.input('contact_number', contact_number || null);
		request_obj.input('tehsil', tehsil || null);
		request_obj.input('district', district || null);
		request_obj.input('NC_VC', NC_VC || null);
		request_obj.input('workshop_training_name', workshop_training_name || null);
		request_obj.input('workshop_session_conference', workshop_session_conference || null);
		request_obj.input('start_date', start_date ? new Date(start_date) : null);
		request_obj.input('end_date', end_date ? new Date(end_date) : null);
		request_obj.input('date_entered_by', date_entered_by || null);
		request_obj.input('Training_Unit', Training_Unit || null);
		request_obj.input('Venue', Venue || null);
		request_obj.input('Duration_Days', Duration_Days || null);

		const result = await request_obj.query(query);
		const newId = result.recordset?.[0]?.sn;

		return NextResponse.json({
			success: true,
			message: "Participant record added successfully",
			sn: newId
		});
	} catch (error) {
		console.error("Error adding workshop participant:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to add participant record",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

