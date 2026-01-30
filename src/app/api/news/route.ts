import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import sql from 'mssql';

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');
		const search = searchParams.get('search');
		const dateFrom = searchParams.get('dateFrom');
		const dateTo = searchParams.get('dateTo');
		const sort = searchParams.get('sort') || 'newest';

		const pool = await getDb();

		// If ID is provided, fetch single news article
		if (id) {
			const query = `
				SELECT 
					[NewsID] AS newsId,
					[Title] AS title,
					[NewsDate] AS newsDate,
					[BodyText] AS bodyText,
					[ImageUrl] AS imageUrl,
					[ImageCaption] AS imageCaption,
					[PostedByUserId] AS postedByUserId,
					[PostedByName] AS postedByName,
					[IsPublished] AS isPublished
				FROM [_rifiiorg_db].[rifiiorg].[tblMISNews]
				WHERE [NewsID] = @newsId
			`;

			const request_obj = pool.request();
			request_obj.input('newsId', sql.Int, parseInt(id));

			const result = await request_obj.query(query);
			
			if (result.recordset && result.recordset.length > 0) {
				return NextResponse.json({
					success: true,
					news: result.recordset[0]
				});
			} else {
				return NextResponse.json(
					{
						success: false,
						message: "News article not found"
					},
					{ status: 404 }
				);
			}
		}

		// Otherwise, fetch list of news articles
		let query = `
			SELECT TOP (1000) 
				[NewsID] AS newsId,
				[Title] AS title,
				[NewsDate] AS newsDate,
				[BodyText] AS bodyText,
				[ImageUrl] AS imageUrl,
				[ImageCaption] AS imageCaption
			FROM [_rifiiorg_db].[rifiiorg].[tblMISNews]
			WHERE 1=1
		`;

		const request_obj = pool.request();

		// Add filters if provided
		if (search) {
			query += ` AND [Title] LIKE @search`;
			request_obj.input('search', sql.NVarChar, `%${search}%`);
		}
		if (dateFrom) {
			query += ` AND [NewsDate] >= @dateFrom`;
			request_obj.input('dateFrom', sql.Date, dateFrom);
		}
		if (dateTo) {
			query += ` AND [NewsDate] <= @dateTo`;
			request_obj.input('dateTo', sql.Date, dateTo);
		}

		// Apply sorting
		if (sort === 'oldest') {
			query += ` ORDER BY [NewsDate] ASC, [NewsID] ASC`;
		} else {
			query += ` ORDER BY [NewsDate] DESC, [NewsID] DESC`;
		}

		const result = await request_obj.query(query);
		const news = result.recordset || [];
		
		return NextResponse.json({
			success: true,
			data: news
		});
	} catch (error) {
		console.error("Error fetching news:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch news",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
