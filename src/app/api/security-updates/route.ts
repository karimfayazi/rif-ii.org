import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');
		const category = searchParams.get('category');
		const locationDistrict = searchParams.get('locationDistrict');
		const locationProvince = searchParams.get('locationProvince');
		const searchTerm = searchParams.get('search');
		const incidentDateFrom = searchParams.get('incidentDateFrom');
		const incidentDateTo = searchParams.get('incidentDateTo');
		const sortBy = searchParams.get('sortBy') || 'incident_date_from';
		const sortDir = searchParams.get('sortDir') || 'desc';

		// Validate sort params to prevent SQL injection
		const allowedSortColumns: Record<string, string> = {
			id: 'si.[id]',
			incident_date_from: 'si.[incident_date_from]',
			date_reported: 'si.[date_reported]',
		};
		const safeSortColumn = allowedSortColumns[sortBy] || allowedSortColumns.incident_date_from;
		const safeSortDir = sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

		const pool = await getDb();
		
		let query = `
			SELECT TOP (1000) 
				si.[id],
				si.[incident_title],
				si.[category],
				si.[location_district],
				si.[location_province],
				CONVERT(VARCHAR(10), si.[incident_date_from], 120) AS [incident_date_from],
				CONVERT(VARCHAR(10), si.[incident_date_to], 120) AS [incident_date_to],
				CONVERT(VARCHAR(10), si.[incident_date_from], 120) AS [incident_date],
				si.[incident_summary],
				si.[operational_impact],
				si.[recommended_actions],
				CONVERT(VARCHAR(19), si.[date_reported], 120) AS [date_reported],
				si.[reported_by],
				si.[Comment],
				si.[Reference #] AS [ReferenceNumber],
				si.[incident_image_1],
				si.[incident_image_2],
				si.[incident_image_3],
				si.[incident_youtube_link]
			FROM [_rifiiorg_db].[rifiiorg].[security_incidents] si
			WHERE 1=1
		`;

		const request_obj = pool.request();

		// If ID is provided, fetch single record
		if (id) {
			query += ` AND si.[id] = @id`;
			request_obj.input('id', parseInt(id));
			const result = await request_obj.query(query);
			const incident = result.recordset?.[0] || null;
			
			return NextResponse.json({
				success: true,
				incident: incident
			});
		}

		// Add filters if provided
		if (category) {
			query += `
				AND EXISTS (
					SELECT 1
					FROM STRING_SPLIT(si.[category], ',')
					WHERE LTRIM(RTRIM(value)) = @category
				)
			`;
			request_obj.input('category', category);
		}
		if (locationDistrict) {
			query += ` AND si.[location_district] = @locationDistrict`;
			request_obj.input('locationDistrict', locationDistrict);
		}
		if (locationProvince) {
			query += ` AND si.[location_province] = @locationProvince`;
			request_obj.input('locationProvince', locationProvince);
		}
		if (searchTerm) {
			query += ` AND (si.[incident_title] LIKE @searchTerm OR si.[incident_summary] LIKE @searchTerm)`;
			request_obj.input('searchTerm', `%${searchTerm}%`);
		}
		if (incidentDateFrom) {
			query += ` AND CAST(si.[incident_date_from] AS DATE) >= CAST(@incidentDateFrom AS DATE)`;
			request_obj.input('incidentDateFrom', incidentDateFrom);
		}
		if (incidentDateTo) {
			query += ` AND CAST(si.[incident_date_from] AS DATE) <= CAST(@incidentDateTo AS DATE)`;
			request_obj.input('incidentDateTo', incidentDateTo);
		}

		// NULLs last; sort by underlying column values (numeric/date), not display text
		query += ` ORDER BY CASE WHEN ${safeSortColumn} IS NULL THEN 1 ELSE 0 END, ${safeSortColumn} ${safeSortDir}, si.[id] DESC`;

		const result = await request_obj.query(query);

		return NextResponse.json({
			success: true,
			incidents: result.recordset || []
		});
	} catch (error: any) {
		console.error("Error fetching security incidents:", error);
		
		// If table doesn't exist, return empty array instead of error
		if (error.message?.includes("Invalid object name") || error.message?.includes("does not exist")) {
			return NextResponse.json({
				success: true,
				incidents: [],
				message: "Security incidents table not found. Please create the table first."
			});
		}

		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to fetch security incidents",
				incidents: []
			},
			{ status: 500 }
		);
	}
}

