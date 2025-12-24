import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET - Fetch pictures organized by Main Category > Event Name > Event Date
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const mainCategory = searchParams.get('mainCategory');
		const eventName = searchParams.get('eventName');
		const eventDate = searchParams.get('eventDate');

		const pool = await getDb();
		
		// If all three parameters are provided, get specific pictures
		if (mainCategory && eventName && eventDate) {
			const query = `
				SELECT TOP (1000)
					[PictureID],
					[GroupName],
					[MainCategory],
					[SubCategory],
					[FileName],
					[FilePath],
					[FileSizeKB],
					[UploadedBy],
					[UploadDate],
					[IsActive],
					[EventDate]
				FROM [_rifiiorg_db].[dbo].[tblPictures]
				WHERE [MainCategory] = @mainCategory
					AND [GroupName] = @eventName
					AND CONVERT(VARCHAR(10), [EventDate], 120) = @eventDate
					AND ([IsActive] = 1 OR [IsActive] IS NULL)
				ORDER BY [UploadDate] DESC
			`;
			
			const result = await pool.request()
				.input('mainCategory', mainCategory)
				.input('eventName', eventName)
				.input('eventDate', eventDate)
				.query(query);
			
			return NextResponse.json({
				success: true,
				pictures: result.recordset || []
			});
		}
		
		// If mainCategory and eventName are provided, get event dates
		if (mainCategory && eventName) {
			const query = `
				SELECT DISTINCT
					CONVERT(VARCHAR(10), [EventDate], 120) AS [EventDate],
					COUNT(*) AS [TotalPictures],
					(
						SELECT TOP 1 [FilePath]
						FROM [_rifiiorg_db].[dbo].[tblPictures] P2
						WHERE P2.[MainCategory] = P.[MainCategory]
							AND P2.[GroupName] = P.[GroupName]
							AND CONVERT(VARCHAR(10), P2.[EventDate], 120) = CONVERT(VARCHAR(10), P.[EventDate], 120)
							AND (P2.[IsActive] = 1 OR P2.[IsActive] IS NULL)
						ORDER BY P2.[UploadDate] DESC
					) AS [PreviewImage]
				FROM [_rifiiorg_db].[dbo].[tblPictures] P
				WHERE [MainCategory] = @mainCategory
					AND [GroupName] = @eventName
					AND ([IsActive] = 1 OR [IsActive] IS NULL)
				GROUP BY [MainCategory], [GroupName], CONVERT(VARCHAR(10), [EventDate], 120)
				ORDER BY [EventDate] DESC
			`;
			
			const result = await pool.request()
				.input('mainCategory', mainCategory)
				.input('eventName', eventName)
				.query(query);
			
			return NextResponse.json({
				success: true,
				eventDates: result.recordset || []
			});
		}
		
		// If only mainCategory is provided, get event names
		if (mainCategory) {
			const query = `
				SELECT DISTINCT
					[GroupName] AS [EventName],
					COUNT(*) AS [TotalPictures],
					(
						SELECT TOP 1 [FilePath]
						FROM [_rifiiorg_db].[dbo].[tblPictures] P2
						WHERE P2.[MainCategory] = P.[MainCategory]
							AND P2.[GroupName] = P.[GroupName]
							AND (P2.[IsActive] = 1 OR P2.[IsActive] IS NULL)
						ORDER BY P2.[UploadDate] DESC
					) AS [PreviewImage]
				FROM [_rifiiorg_db].[dbo].[tblPictures] P
				WHERE [MainCategory] = @mainCategory
					AND ([IsActive] = 1 OR [IsActive] IS NULL)
				GROUP BY [MainCategory], [GroupName]
				ORDER BY [GroupName]
			`;
			
			const result = await pool.request()
				.input('mainCategory', mainCategory)
				.query(query);
			
			return NextResponse.json({
				success: true,
				eventNames: result.recordset || []
			});
		}
		
		// If no parameters, get main categories
		const query = `
			SELECT DISTINCT
				[MainCategory],
				COUNT(*) AS [TotalPictures],
				(
					SELECT TOP 1 [FilePath]
					FROM [_rifiiorg_db].[dbo].[tblPictures] P2
					WHERE P2.[MainCategory] = P.[MainCategory]
						AND (P2.[IsActive] = 1 OR P2.[IsActive] IS NULL)
					ORDER BY P2.[UploadDate] DESC
				) AS [PreviewImage]
			FROM [_rifiiorg_db].[dbo].[tblPictures] P
			WHERE ([IsActive] = 1 OR [IsActive] IS NULL)
			GROUP BY [MainCategory]
			ORDER BY [MainCategory]
		`;
		
		const result = await pool.request().query(query);
		
		return NextResponse.json({
			success: true,
			mainCategories: result.recordset || []
		});
	} catch (error) {
		console.error("Error fetching picture folders:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch picture folders",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}














