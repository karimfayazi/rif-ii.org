import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const groupName = searchParams.get('groupName');
		const mainCategory = searchParams.get('mainCategory');
		const subCategory = searchParams.get('subCategory');

		console.log('API received params:', { groupName, mainCategory, subCategory });

		const pool = await getDb();
		let query = `
			SELECT 
				[PictureID],
				[GroupName],
				[MainCategory],
				[SubCategory],
				[FileName],
				[FilePath],
				[FileSizeKB],
				[UploadedBy],
				CONVERT(VARCHAR(19), [UploadDate], 120) AS [UploadDate],
				[IsActive],
				CONVERT(VARCHAR(10), [EventDate], 105) AS [EventDate]
			FROM [_rifiiorg_db].[dbo].[tblPictures]
			WHERE ([IsActive] = 1 OR [IsActive] IS NULL)
		`;

		const request_obj = pool.request();

		// Add filters if provided
		if (groupName) {
			query += ` AND [GroupName] = @groupName`;
			request_obj.input('groupName', groupName);
		}
		if (mainCategory) {
			query += ` AND [MainCategory] = @mainCategory`;
			request_obj.input('mainCategory', mainCategory);
		}
		if (subCategory) {
			query += ` AND [SubCategory] = @subCategory`;
			request_obj.input('subCategory', subCategory);
		}

		query += ` ORDER BY [EventDate] DESC`;

		console.log('Executing query:', query);
		const result = await request_obj.query(query);
		const pictures = result.recordset || [];
		console.log('Query returned', pictures.length, 'pictures');
		
		return NextResponse.json({
			success: true,
			pictures: pictures
		});
	} catch (error) {
		console.error("Error fetching picture details:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch picture details",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}