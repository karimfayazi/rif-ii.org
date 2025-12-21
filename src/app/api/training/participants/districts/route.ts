import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const pool = await getDb();
		
		// Fetch distinct districts from workshop_participants table
		const query = `
			SELECT DISTINCT [district]
			FROM [_rifiiorg_db].[dbo].[workshop_participants]
			WHERE [district] IS NOT NULL AND [district] != ''
			ORDER BY [district]
		`;

		const result = await pool.request().query(query);
		const districts = result.recordset.map((row: any) => row.district).filter(Boolean);

		return NextResponse.json({
			success: true,
			districts: districts
		});
	} catch (error) {
		console.error('Error fetching districts:', error);
		return NextResponse.json({
			success: false,
			message: 'Failed to fetch districts',
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
}

