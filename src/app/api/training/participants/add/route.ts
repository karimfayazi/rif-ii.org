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
			workshop_training_name,
			workshop_session_conference,
			start_date,
			end_date,
			date_entered_by
		} = body;

		const pool = await getDb();
		const request_obj = pool.request();

		const query = `
			INSERT INTO [_rifiiorg_db].[rifiiorg].[workshop_participants]
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
				[workshop_training_name],
				[workshop_session_conference],
				[start_date],
				[end_date],
				[date_entered_by],
				[entry_timestamp]
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
				@workshop_training_name,
				@workshop_session_conference,
				@start_date,
				@end_date,
				@date_entered_by,
				GETDATE()
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
		request_obj.input('workshop_training_name', workshop_training_name || null);
		request_obj.input('workshop_session_conference', workshop_session_conference || null);
		request_obj.input('start_date', start_date ? new Date(start_date) : null);
		request_obj.input('end_date', end_date ? new Date(end_date) : null);
		request_obj.input('date_entered_by', date_entered_by || null);

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

