import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET - Fetch picture by ID
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id: pictureId } = await params;
		
		if (!pictureId) {
			return NextResponse.json({
				success: false,
				message: "Picture ID is required"
			}, { status: 400 });
		}

		const pool = await getDb();
		const query = `
			SELECT TOP (1)
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
				CONVERT(VARCHAR(10), [EventDate], 120) AS [EventDate]
			FROM [_rifiiorg_db].[dbo].[tblPictures]
			WHERE [PictureID] = @pictureId
		`;
		
		const result = await pool.request()
			.input('pictureId', parseInt(pictureId))
			.query(query);
		
		if (result.recordset.length === 0) {
			return NextResponse.json({
				success: false,
				message: "Picture not found"
			}, { status: 404 });
		}
		
		const picture = result.recordset[0];
		console.log('[Picture API] Fetched picture:', {
			PictureID: picture.PictureID,
			FileName: picture.FileName,
			FilePath: picture.FilePath,
			MainCategory: picture.MainCategory,
			GroupName: picture.GroupName
		});
		
		return NextResponse.json({
			success: true,
			picture: picture
		});
	} catch (error) {
		console.error("Error fetching picture:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch picture",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}





