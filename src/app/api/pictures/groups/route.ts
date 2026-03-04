import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const main = searchParams.get("main");
		const sub = searchParams.get("sub");

		const pool = await getDb();

		let query = `
			SELECT 
				[GroupName],
				COUNT(*) AS [PictureCount],
				(
					SELECT TOP 1 [FilePath]
					FROM [_rifiiorg_db].[dbo].[tblPictures] P2
					WHERE P2.[GroupName] = P.[GroupName]
						AND (P2.[IsActive] = 1 OR P2.[IsActive] IS NULL)
						AND P2.[FilePath] IS NOT NULL
						AND P2.[FilePath] != ''
						${main ? "AND P2.[MainCategory] = @main" : ""}
						${sub ? "AND P2.[SubCategory] = @sub" : ""}
					ORDER BY P2.[UploadDate] DESC
				) AS [ThumbnailImage]
			FROM [_rifiiorg_db].[dbo].[tblPictures] P
			WHERE ([IsActive] = 1 OR [IsActive] IS NULL)
				AND [GroupName] IS NOT NULL
				AND [GroupName] != ''
		`;

		const requestObj = pool.request();

		if (main) {
			query += ` AND [MainCategory] = @main`;
			requestObj.input("main", main);
		}

		if (sub) {
			query += ` AND [SubCategory] = @sub`;
			requestObj.input("sub", sub);
		}

		query += `
			GROUP BY [GroupName]
			ORDER BY [GroupName]
		`;

		const result = await requestObj.query(query);
		const groups = result.recordset || [];
		
		return NextResponse.json({
			success: true,
			groups
		});
	} catch (error) {
		console.error("Error fetching picture groups:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch picture groups",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
