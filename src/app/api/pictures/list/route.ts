import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const main = searchParams.get("main");
		const sub = searchParams.get("sub");
		const group = searchParams.get("group");

		if (!main || !sub || !group) {
			return NextResponse.json(
				{
					success: false,
					message: "Parameters 'main', 'sub', and 'group' are required",
				},
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const query = `
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
				AND [MainCategory] = @main
				AND [SubCategory] = @sub
				AND [GroupName] = @group
			ORDER BY [UploadDate] DESC
		`;

		const result = await pool
			.request()
			.input("main", main)
			.input("sub", sub)
			.input("group", group)
			.query(query);

		const pictures = result.recordset || [];

		return NextResponse.json({
			success: true,
			pictures,
		});
	} catch (error) {
		console.error("Error fetching picture list:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch picture list",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

