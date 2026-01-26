import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type PictureRow = {
	PictureID: number;
	GroupName: string | null;
	MainCategory: string | null;
	SubCategory: string | null;
	FileName: string | null;
	FilePath: string | null;
	FileSizeKB: number | null;
	UploadedBy: string | null;
	UploadDate: string | null;
	IsActive: boolean | null;
	EventDate: string | null;
};

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		
		// Pagination
		const page = parseInt(searchParams.get('page') || '1');
		const pageSize = parseInt(searchParams.get('pageSize') || '20');
		const offset = (page - 1) * pageSize;
		
		// Filters
		const search = searchParams.get('search');
		const groupName = searchParams.get('groupName');
		const mainCategory = searchParams.get('mainCategory');
		const subCategory = searchParams.get('subCategory');
		const uploadedBy = searchParams.get('uploadedBy');
		const isActive = searchParams.get('isActive'); // 'all' | '1' | '0'
		const uploadFrom = searchParams.get('uploadFrom');
		const uploadTo = searchParams.get('uploadTo');
		const eventFrom = searchParams.get('eventFrom');
		const eventTo = searchParams.get('eventTo');
		
		// Sorting
		const sortBy = searchParams.get('sortBy') || 'UploadDate';
		const sortDir = searchParams.get('sortDir') || 'desc';
		
		// Validate sortBy to prevent SQL injection
		const allowedSortColumns = ['UploadDate', 'EventDate', 'FileName', 'GroupName', 'MainCategory', 'SubCategory', 'UploadedBy'];
		const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'UploadDate';
		const safeSortDir = sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
		
		const pool = await getDb();
		
		// Build WHERE clause and collect parameters
		let whereConditions: string[] = [];
		const params: Record<string, any> = {};
		
		// Search filter (FileName or GroupName)
		if (search && search.trim()) {
			whereConditions.push(`([FileName] LIKE @search OR [GroupName] LIKE @search)`);
			params.search = `%${search.trim()}%`;
		}
		
		// GroupName filter
		if (groupName && groupName.trim()) {
			whereConditions.push(`[GroupName] = @groupName`);
			params.groupName = groupName.trim();
		}
		
		// MainCategory filter
		if (mainCategory && mainCategory.trim()) {
			whereConditions.push(`[MainCategory] = @mainCategory`);
			params.mainCategory = mainCategory.trim();
		}
		
		// SubCategory filter
		if (subCategory && subCategory.trim()) {
			whereConditions.push(`[SubCategory] = @subCategory`);
			params.subCategory = subCategory.trim();
		}
		
		// UploadedBy filter
		if (uploadedBy && uploadedBy.trim()) {
			whereConditions.push(`[UploadedBy] = @uploadedBy`);
			params.uploadedBy = uploadedBy.trim();
		}
		
		// IsActive filter
		if (isActive && isActive !== 'all') {
			if (isActive === '1') {
				whereConditions.push(`([IsActive] = 1 OR [IsActive] IS NULL)`);
			} else if (isActive === '0') {
				whereConditions.push(`[IsActive] = 0`);
			}
		} else {
			// Default: show active only if not specified
			whereConditions.push(`([IsActive] = 1 OR [IsActive] IS NULL)`);
		}
		
		// UploadDate range
		if (uploadFrom && uploadFrom.trim()) {
			whereConditions.push(`CAST([UploadDate] AS DATE) >= @uploadFrom`);
			params.uploadFrom = uploadFrom.trim();
		}
		if (uploadTo && uploadTo.trim()) {
			whereConditions.push(`CAST([UploadDate] AS DATE) <= @uploadTo`);
			params.uploadTo = uploadTo.trim();
		}
		
		// EventDate range
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
		
		// Get total count
		const countRequest = pool.request();
		Object.entries(params).forEach(([key, value]) => {
			countRequest.input(key, value);
		});
		
		const countQuery = `
			SELECT COUNT(*) as total
			FROM [_rifiiorg_db].[dbo].[tblPictures]
			${whereClause}
		`;
		
		const countResult = await countRequest.query(countQuery);
		const total = countResult.recordset[0]?.total || 0;
		
		// Get data with pagination
		const dataRequest = pool.request();
		Object.entries(params).forEach(([key, value]) => {
			dataRequest.input(key, value);
		});
		dataRequest.input('offset', offset);
		dataRequest.input('pageSize', pageSize);
		
		const dataQuery = `
			SELECT 
				[PictureID],
				[GroupName],
				[MainCategory],
				[SubCategory],
				[FileName],
				[FilePath],
				[FileSizeKB],
				[UploadedBy],
				CONVERT(VARCHAR(10), [UploadDate], 105) AS [UploadDate],
				[IsActive],
				CONVERT(VARCHAR(10), [EventDate], 105) AS [EventDate]
			FROM [_rifiiorg_db].[dbo].[tblPictures]
			${whereClause}
			ORDER BY [${safeSortBy}] ${safeSortDir}
			OFFSET @offset ROWS
			FETCH NEXT @pageSize ROWS ONLY
		`;
		
		const result = await dataRequest.query(dataQuery);
		const data: PictureRow[] = result.recordset || [];
		
		return NextResponse.json({
			data,
			total,
			page,
			pageSize
		});
	} catch (error) {
		console.error("Error fetching pictures:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch pictures",
				message: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
