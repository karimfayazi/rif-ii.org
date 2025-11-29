import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PUT(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			sn,
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

		if (!sn) {
			return NextResponse.json(
				{
					success: false,
					message: "Record ID (sn) is required"
				},
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const request_obj = pool.request();

		const query = `
			UPDATE [_rifiiorg_db].[rifiiorg].[workshop_participants]
			SET
				[participant_name] = @participant_name,
				[so_do_wo_ho] = @so_do_wo_ho,
				[gender] = @gender,
				[organization_department] = @organization_department,
				[designation] = @designation,
				[profession] = @profession,
				[cnic_number] = @cnic_number,
				[contact_number] = @contact_number,
				[tehsil] = @tehsil,
				[district] = @district,
				[workshop_training_name] = @workshop_training_name,
				[workshop_session_conference] = @workshop_session_conference,
				[start_date] = @start_date,
				[end_date] = @end_date,
				[date_entered_by] = @date_entered_by
			WHERE [sn] = @sn
		`;

		request_obj.input('sn', parseInt(sn));
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

		await request_obj.query(query);

		return NextResponse.json({
			success: true,
			message: "Participant record updated successfully"
		});
	} catch (error) {
		console.error("Error updating workshop participant:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to update participant record",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

