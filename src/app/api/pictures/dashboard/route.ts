import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
	try {
		const pool = await getDb();

		const picturesResult = await pool.request().query(`
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
			ORDER BY
				CASE WHEN [UploadDate] IS NULL THEN 1 ELSE 0 END,
				[UploadDate] DESC,
				[PictureID] DESC
		`);

		const pictures = picturesResult.recordset || [];

		return NextResponse.json({
			success: true,
			pictures,
			totalCount: pictures.length,
		});
	} catch (error) {
		console.error("Error fetching dashboard pictures:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch dashboard pictures",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
