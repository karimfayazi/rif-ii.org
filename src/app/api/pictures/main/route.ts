import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
	try {
		const pool = await getDb();
		const query = `
			SELECT 
				[MainCategory],
				COUNT(*) AS [TotalPictures],
				COUNT(DISTINCT NULLIF([SubCategory], '')) AS [TotalSubCategories],
				COUNT(DISTINCT NULLIF([GroupName], '')) AS [TotalGroups],
				(
					SELECT TOP 1 [FilePath]
					FROM [_rifiiorg_db].[dbo].[tblPictures] P2
					WHERE P2.[MainCategory] = P.[MainCategory]
						AND (P2.[IsActive] = 1 OR P2.[IsActive] IS NULL)
						AND P2.[FilePath] IS NOT NULL
						AND P2.[FilePath] != ''
					ORDER BY P2.[UploadDate] DESC
				) AS [ThumbnailImage]
			FROM [_rifiiorg_db].[dbo].[tblPictures] P
			WHERE ([IsActive] = 1 OR [IsActive] IS NULL)
				AND [MainCategory] IS NOT NULL
				AND [MainCategory] != ''
			GROUP BY [MainCategory]
			ORDER BY [MainCategory]
		`;

		const result = await pool.request().query(query);
		const mainCategories = result.recordset || [];

		return NextResponse.json({
			success: true,
			mainCategories,
		});
	} catch (error) {
		console.error("Error fetching picture main categories:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch main categories",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

