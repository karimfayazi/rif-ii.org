import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET - Fetch all main categories
export async function GET() {
	try {
		const pool = await getDb();
		const query = `
			SELECT TOP (1000) [MainCategoryID], [Category]
			FROM [_rifiiorg_db].[rifiiorg].[tblReportMainCategory]
			ORDER BY [Category]
		`;
		
		const result = await pool.request().query(query);
		const categories = result.recordset || [];
		
		return NextResponse.json({
			success: true,
			categories: categories
		});
	} catch (error) {
		console.error("Error fetching report main categories:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch main categories",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
