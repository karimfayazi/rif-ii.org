import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PUT(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			id,
			incident_title,
			category,
			location_district,
			location_province,
			incident_date,
			incident_summary,
			operational_impact,
			recommended_actions,
			reported_by,
			Comment,
			ReferenceNumber,
			incident_image_1,
			incident_image_2,
			incident_image_3,
			incident_youtube_link
		} = body;

		if (!id) {
			return NextResponse.json(
				{ success: false, message: "ID is required" },
				{ status: 400 }
			);
		}

		// Validate required fields
		if (!incident_title || !category || !location_district || !location_province || !incident_date || !incident_summary || !operational_impact || !recommended_actions) {
			return NextResponse.json(
				{ success: false, message: "All required fields must be filled" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const request_obj = pool.request();

		const query = `
			UPDATE [_rifiiorg_db].[rifiiorg].[security_incidents]
			SET 
				[incident_title] = @incident_title,
				[category] = @category,
				[location_district] = @location_district,
				[location_province] = @location_province,
				[incident_date] = @incident_date,
				[incident_summary] = @incident_summary,
				[operational_impact] = @operational_impact,
				[recommended_actions] = @recommended_actions,
				[reported_by] = @reported_by,
				[Comment] = @Comment,
				[Reference #] = @ReferenceNumber,
				[incident_image_1] = @incident_image_1,
				[incident_image_2] = @incident_image_2,
				[incident_image_3] = @incident_image_3,
				[incident_youtube_link] = @incident_youtube_link
			WHERE [id] = @id
		`;

		request_obj.input('id', parseInt(id));
		request_obj.input('incident_title', incident_title);
		request_obj.input('category', category);
		request_obj.input('location_district', location_district);
		request_obj.input('location_province', location_province);
		request_obj.input('incident_date', incident_date);
		request_obj.input('incident_summary', incident_summary);
		request_obj.input('operational_impact', operational_impact);
		request_obj.input('recommended_actions', recommended_actions);
		request_obj.input('reported_by', reported_by || 'System');
		request_obj.input('Comment', Comment || null);
		request_obj.input('ReferenceNumber', ReferenceNumber || null);
		request_obj.input('incident_image_1', incident_image_1 || null);
		request_obj.input('incident_image_2', incident_image_2 || null);
		request_obj.input('incident_image_3', incident_image_3 || null);
		request_obj.input('incident_youtube_link', incident_youtube_link || null);

		await request_obj.query(query);

		return NextResponse.json({
			success: true,
			message: "Security incident updated successfully"
		});
	} catch (error: any) {
		console.error("Error updating security incident:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to update security incident"
			},
			{ status: 500 }
		);
	}
}

