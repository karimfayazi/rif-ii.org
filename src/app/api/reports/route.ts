import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const mainCategory = searchParams.get('mainCategory');
		const subCategory = searchParams.get('subCategory');
		const searchTerm = searchParams.get('search');
		const dateFrom = searchParams.get('dateFrom');
		const dateTo = searchParams.get('dateTo');

		const pool = await getDb();
		let query = `
			SELECT TOP (1000) 
				[ReportID],
				[ReportTitle],
				[Description],
				[FilePath],
				[EventDate],
				[MainCategory],
				[SubCategory]
			FROM [_rifiiorg_db].[rifiiorg].[tblReports]
			WHERE 1=1
		`;

		const request_obj = pool.request();

		// Add filters if provided
		if (mainCategory) {
			query += ` AND [MainCategory] = @mainCategory`;
			request_obj.input('mainCategory', mainCategory);
		}
		if (subCategory) {
			query += ` AND [SubCategory] = @subCategory`;
			request_obj.input('subCategory', subCategory);
		}
		if (searchTerm) {
			query += ` AND ([ReportTitle] LIKE @searchTerm OR [Description] LIKE @searchTerm)`;
			request_obj.input('searchTerm', `%${searchTerm}%`);
		}
		// Inclusive EventDate range filter
		if (dateFrom) {
			query += ` AND CAST([EventDate] AS DATE) >= CAST(@dateFrom AS DATE)`;
			request_obj.input('dateFrom', dateFrom);
		}
		if (dateTo) {
			query += ` AND CAST([EventDate] AS DATE) <= CAST(@dateTo AS DATE)`;
			request_obj.input('dateTo', dateTo);
		}

		query += ` ORDER BY [EventDate] DESC, [ReportTitle]`;

		const result = await request_obj.query(query);
		const reports = result.recordset || [];
		
		return NextResponse.json({
			success: true,
			reports: reports
		});
	} catch (error) {
		console.error("Error fetching reports:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch reports",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}