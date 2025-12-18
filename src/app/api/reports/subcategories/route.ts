import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET - Fetch sub categories by main category ID
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const mainCategoryID = searchParams.get('mainCategoryID');
		
		if (!mainCategoryID) {
			return NextResponse.json({
				success: false,
				message: "Main Category ID is required"
			}, { status: 400 });
		}
		
		const pool = await getDb();
		const query = `
			SELECT TOP (1000) [SubCategoryID], [MainCategoryID], [SubCategory]
			FROM [_rifiiorg_db].[dbo].[tblReportSubCategory]
			WHERE [MainCategoryID] = @mainCategoryID
			ORDER BY [SubCategory]
		`;
		
		const result = await pool.request()
			.input('mainCategoryID', parseInt(mainCategoryID))
			.query(query);
		
		const subCategories = result.recordset || [];
		
		return NextResponse.json({
			success: true,
			subCategories: subCategories
		});
	} catch (error) {
		console.error("Error fetching report sub categories:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch sub categories",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
