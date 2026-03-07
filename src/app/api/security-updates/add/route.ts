import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { serializeCategoryValues } from "@/lib/security-incidents";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			incident_title,
			category,
			location_district,
			location_province,
			incident_date_from,
			incident_date_to,
			incident_summary,
			operational_impact,
			recommended_actions,
			date_reported,
			reported_by,
			Comment,
			ReferenceNumber,
			incident_image_1,
			incident_image_2,
			incident_image_3,
			incident_youtube_link
		} = body;

		const normalizedCategory = serializeCategoryValues(category);

		// Validate required fields
		if (!incident_title || !normalizedCategory || !location_district || !location_province || !incident_date_from || !incident_summary || !operational_impact || !recommended_actions) {
			return NextResponse.json(
				{ success: false, message: "All required fields must be filled" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const request_obj = pool.request();

		const query = `
			INSERT INTO [_rifiiorg_db].[rifiiorg].[security_incidents] 
			([incident_title], [category], [location_district], [location_province], [incident_date_from], [incident_summary], [operational_impact], [recommended_actions], [date_reported], [reported_by], [Comment], [Reference #], [incident_image_1], [incident_image_2], [incident_image_3], [incident_youtube_link], [incident_date_to])
			VALUES 
			(@incident_title, @category, @location_district, @location_province, @incident_date_from, @incident_summary, @operational_impact, @recommended_actions, COALESCE(@date_reported, GETDATE()), @reported_by, @Comment, @ReferenceNumber, @incident_image_1, @incident_image_2, @incident_image_3, @incident_youtube_link, @incident_date_to);
			SELECT SCOPE_IDENTITY() AS id;
		`;

		request_obj.input('incident_title', incident_title);
		request_obj.input('category', normalizedCategory);
		request_obj.input('location_district', location_district);
		request_obj.input('location_province', location_province);
		request_obj.input('incident_date_from', incident_date_from);
		request_obj.input('incident_summary', incident_summary);
		request_obj.input('operational_impact', operational_impact);
		request_obj.input('recommended_actions', recommended_actions);
		request_obj.input('date_reported', date_reported || null);
		request_obj.input('reported_by', reported_by || 'System');
		request_obj.input('Comment', Comment || null);
		request_obj.input('ReferenceNumber', ReferenceNumber || null);
		request_obj.input('incident_image_1', incident_image_1 || null);
		request_obj.input('incident_image_2', incident_image_2 || null);
		request_obj.input('incident_image_3', incident_image_3 || null);
		request_obj.input('incident_youtube_link', incident_youtube_link || null);
		request_obj.input('incident_date_to', incident_date_to || null);

		const result = await request_obj.query(query);
		const newId = result.recordset?.[0]?.id;

		return NextResponse.json({
			success: true,
			message: "Security incident added successfully",
			id: newId
		});
	} catch (error: any) {
		console.error("Error adding security incident:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to add security incident"
			},
			{ status: 500 }
		);
	}
}

