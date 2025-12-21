import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const district = searchParams.get('district');

		if (!district || district === 'All' || district === 'ALL') {
			return NextResponse.json({
				success: true,
				tehsils: []
			});
		}

		const pool = await getDb();
		
		// Fetch distinct tehsils for the selected district from workshop_participants table
		const query = `
			SELECT DISTINCT [tehsil]
			FROM [_rifiiorg_db].[dbo].[workshop_participants]
			WHERE [district] = @district
				AND [tehsil] IS NOT NULL 
				AND [tehsil] != ''
			ORDER BY [tehsil]
		`;

		const result = await pool.request()
			.input('district', district)
			.query(query);

		const tehsils = result.recordset.map((row: any) => row.tehsil).filter(Boolean);

		return NextResponse.json({
			success: true,
			tehsils: tehsils
		});
	} catch (error) {
		console.error('Error fetching tehsils:', error);
		return NextResponse.json({
			success: false,
			message: 'Failed to fetch tehsils',
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
}

