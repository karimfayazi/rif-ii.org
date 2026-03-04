import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const main = searchParams.get("main");

		if (!main) {
			return NextResponse.json(
				{
					success: false,
					message: "Parameter 'main' is required",
				},
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const query = `
			SELECT 
				[SubCategory],
				COUNT(*) AS [TotalPictures],
				COUNT(DISTINCT NULLIF([GroupName], '')) AS [TotalGroups],
				(
					SELECT TOP 1 [FilePath]
					FROM [_rifiiorg_db].[dbo].[tblPictures] P2
					WHERE P2.[MainCategory] = P.[MainCategory]
						AND P2.[SubCategory] = P.[SubCategory]
						AND (P2.[IsActive] = 1 OR P2.[IsActive] IS NULL)
						AND P2.[FilePath] IS NOT NULL
						AND P2.[FilePath] != ''
					ORDER BY P2.[UploadDate] DESC
				) AS [ThumbnailImage]
			FROM [_rifiiorg_db].[dbo].[tblPictures] P
			WHERE ([IsActive] = 1 OR [IsActive] IS NULL)
				AND [MainCategory] = @main
				AND [SubCategory] IS NOT NULL
				AND [SubCategory] != ''
			GROUP BY [MainCategory], [SubCategory]
			ORDER BY [SubCategory]
		`;

		const result = await pool
			.request()
			.input("main", main)
			.query(query);

		const subCategories = result.recordset || [];

		return NextResponse.json({
			success: true,
			subCategories,
		});
	} catch (error) {
		console.error("Error fetching picture sub categories:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch sub categories",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

