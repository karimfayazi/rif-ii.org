import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);

		const search = searchParams.get('search');
		const groupName = searchParams.get('groupName');
		const mainCategory = searchParams.get('mainCategory');
		const subCategory = searchParams.get('subCategory');
		const uploadedBy = searchParams.get('uploadedBy');
		const isActive = searchParams.get('isActive');
		const uploadFrom = searchParams.get('uploadFrom');
		const uploadTo = searchParams.get('uploadTo');
		const eventFrom = searchParams.get('eventFrom');
		const eventTo = searchParams.get('eventTo');

		const pool = await getDb();

		const whereConditions: string[] = [];
		const params: Record<string, any> = {};

		if (search && search.trim()) {
			whereConditions.push(`([FileName] LIKE @search OR [GroupName] LIKE @search)`);
			params.search = `%${search.trim()}%`;
		}
		if (groupName && groupName.trim()) {
			whereConditions.push(`[GroupName] = @groupName`);
			params.groupName = groupName.trim();
		}
		if (mainCategory && mainCategory.trim()) {
			whereConditions.push(`[MainCategory] = @mainCategory`);
			params.mainCategory = mainCategory.trim();
		}
		if (subCategory && subCategory.trim()) {
			whereConditions.push(`[SubCategory] = @subCategory`);
			params.subCategory = subCategory.trim();
		}
		if (uploadedBy && uploadedBy.trim()) {
			whereConditions.push(`[UploadedBy] = @uploadedBy`);
			params.uploadedBy = uploadedBy.trim();
		}
		if (isActive && isActive !== 'all') {
			if (isActive === '1') whereConditions.push(`([IsActive] = 1 OR [IsActive] IS NULL)`);
			else if (isActive === '0') whereConditions.push(`[IsActive] = 0`);
		} else {
			whereConditions.push(`([IsActive] = 1 OR [IsActive] IS NULL)`);
		}
		if (uploadFrom && uploadFrom.trim()) {
			whereConditions.push(`CAST([UploadDate] AS DATE) >= @uploadFrom`);
			params.uploadFrom = uploadFrom.trim();
		}
		if (uploadTo && uploadTo.trim()) {
			whereConditions.push(`CAST([UploadDate] AS DATE) <= @uploadTo`);
			params.uploadTo = uploadTo.trim();
		}
		if (eventFrom && eventFrom.trim()) {
			whereConditions.push(`CAST([EventDate] AS DATE) >= @eventFrom`);
			params.eventFrom = eventFrom.trim();
		}
		if (eventTo && eventTo.trim()) {
			whereConditions.push(`CAST([EventDate] AS DATE) <= @eventTo`);
			params.eventTo = eventTo.trim();
		}

		const whereClause = whereConditions.length > 0
			? `WHERE ${whereConditions.join(' AND ')}`
			: '';

		const dataRequest = pool.request();
		Object.entries(params).forEach(([key, value]) => {
			dataRequest.input(key, value);
		});

		const dataQuery = `
			SELECT 
				[GroupName],
				[MainCategory],
				[SubCategory],
				COUNT(*) AS [PictureCount],
				CONVERT(VARCHAR(10), MAX([UploadDate]), 105) AS [LatestUploadDate],
				CONVERT(VARCHAR(10), MAX([EventDate]), 105) AS [LatestEventDate]
			FROM [_rifiiorg_db].[dbo].[tblPictures]
			${whereClause}
			GROUP BY [GroupName], [MainCategory], [SubCategory]
			ORDER BY [GroupName], [MainCategory], [SubCategory]
		`;

		const result = await dataRequest.query(dataQuery);
		const data = result.recordset || [];
		const totalPictures = data.reduce((sum: number, row: any) => sum + row.PictureCount, 0);

		const filterRequest = pool.request();
		let subCatCondition = '';
		if (mainCategory && mainCategory.trim()) {
			subCatCondition = ` AND [MainCategory] = @filterMainCat`;
			filterRequest.input('filterMainCat', mainCategory.trim());
		}

		const filterResult = await filterRequest.query(`
			SELECT DISTINCT [GroupName] FROM [_rifiiorg_db].[dbo].[tblPictures] WHERE [GroupName] IS NOT NULL AND [GroupName] != '' AND ([IsActive] = 1 OR [IsActive] IS NULL) ORDER BY [GroupName];
			SELECT DISTINCT [MainCategory] FROM [_rifiiorg_db].[dbo].[tblPictures] WHERE [MainCategory] IS NOT NULL AND [MainCategory] != '' AND ([IsActive] = 1 OR [IsActive] IS NULL) ORDER BY [MainCategory];
			SELECT DISTINCT [SubCategory] FROM [_rifiiorg_db].[dbo].[tblPictures] WHERE [SubCategory] IS NOT NULL AND [SubCategory] != '' AND ([IsActive] = 1 OR [IsActive] IS NULL)${subCatCondition} ORDER BY [SubCategory];
			SELECT DISTINCT [UploadedBy] FROM [_rifiiorg_db].[dbo].[tblPictures] WHERE [UploadedBy] IS NOT NULL AND [UploadedBy] != '' AND ([IsActive] = 1 OR [IsActive] IS NULL) ORDER BY [UploadedBy];
		`);

		const recordsets = filterResult.recordsets as any[];

		return NextResponse.json({
			data,
			totalPictures,
			totalGroups: data.length,
			filters: {
				groupNames: recordsets[0]?.map((r: any) => r.GroupName) || [],
				mainCategories: recordsets[1]?.map((r: any) => r.MainCategory) || [],
				subCategories: recordsets[2]?.map((r: any) => r.SubCategory) || [],
				uploadedByList: recordsets[3]?.map((r: any) => r.UploadedBy) || [],
			}
		});
	} catch (error) {
		console.error("Error fetching picture summary:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch picture summary",
				message: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
