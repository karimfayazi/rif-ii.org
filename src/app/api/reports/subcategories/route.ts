import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET - Fetch sub categories by main category ID
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const mainCategoryID = searchParams.get('mainCategoryID');
		
		if (!mainCategoryID) {
			return NextResponse.json({
				success: false,
				message: "Main Category ID is required"
			}, { status: 400 });
		}
		
		const pool = await getDb();
		const query = `
			SELECT TOP (1000) [SubCategoryID], [MainCategoryID], [SubCategory]
			FROM [_rifiiorg_db].[dbo].[tblReportSubCategory]
			WHERE [MainCategoryID] = @mainCategoryID
			ORDER BY [SubCategory]
		`;
		
		const result = await pool.request()
			.input('mainCategoryID', parseInt(mainCategoryID))
			.query(query);
		
		const subCategories = result.recordset || [];
		
		return NextResponse.json({
			success: true,
			subCategories: subCategories
		});
	} catch (error) {
		console.error("Error fetching report sub categories:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch sub categories",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

// POST - Create new sub category
export async function POST(request: NextRequest) {
	try {
		const { mainCategoryID, subCategory } = await request.json();
		
		if (!mainCategoryID || !subCategory || subCategory.trim() === '') {
			return NextResponse.json({
				success: false,
				message: "Main Category ID and Sub Category name are required"
			}, { status: 400 });
		}

		const pool = await getDb();
		
		// Check if sub category already exists for this main category
		const checkQuery = `
			SELECT [SubCategoryID] 
			FROM [_rifiiorg_db].[dbo].[tblReportSubCategory] 
			WHERE [MainCategoryID] = @mainCategoryID AND [SubCategory] = @subCategory
		`;
		
		const checkResult = await pool.request()
			.input('mainCategoryID', mainCategoryID)
			.input('subCategory', subCategory.trim())
			.query(checkQuery);
			
		if (checkResult.recordset.length > 0) {
			return NextResponse.json({
				success: false,
				message: "Sub Category already exists for this Main Category"
			}, { status: 400 });
		}

		// Insert new sub category
		const insertQuery = `
			INSERT INTO [_rifiiorg_db].[dbo].[tblReportSubCategory] ([MainCategoryID], [SubCategory])
			OUTPUT INSERTED.[SubCategoryID], INSERTED.[MainCategoryID], INSERTED.[SubCategory]
			VALUES (@mainCategoryID, @subCategory)
		`;
		
		const result = await pool.request()
			.input('mainCategoryID', mainCategoryID)
			.input('subCategory', subCategory.trim())
			.query(insertQuery);
			
		const newSubCategory = result.recordset[0];
		
		return NextResponse.json({
			success: true,
			message: "Sub Category created successfully",
			subCategory: newSubCategory
		});
	} catch (error) {
		console.error("Error creating report sub category:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to create sub category",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

// PUT - Update sub category
export async function PUT(request: NextRequest) {
	try {
		const { subCategoryID, subCategory } = await request.json();
		
		if (!subCategoryID || !subCategory || subCategory.trim() === '') {
			return NextResponse.json({
				success: false,
				message: "Sub Category ID and name are required"
			}, { status: 400 });
		}

		const pool = await getDb();
		
		// Get the main category ID for this sub category
		const getMainCategoryQuery = `
			SELECT [MainCategoryID] 
			FROM [_rifiiorg_db].[dbo].[tblReportSubCategory] 
			WHERE [SubCategoryID] = @subCategoryID
		`;
		
		const mainCategoryResult = await pool.request()
			.input('subCategoryID', subCategoryID)
			.query(getMainCategoryQuery);
			
		if (mainCategoryResult.recordset.length === 0) {
			return NextResponse.json({
				success: false,
				message: "Sub Category not found"
			}, { status: 404 });
		}
		
		const mainCategoryID = mainCategoryResult.recordset[0].MainCategoryID;
		
		// Check if sub category already exists for this main category (excluding current one)
		const checkQuery = `
			SELECT [SubCategoryID] 
			FROM [_rifiiorg_db].[dbo].[tblReportSubCategory] 
			WHERE [MainCategoryID] = @mainCategoryID AND [SubCategory] = @subCategory AND [SubCategoryID] != @subCategoryID
		`;
		
		const checkResult = await pool.request()
			.input('mainCategoryID', mainCategoryID)
			.input('subCategory', subCategory.trim())
			.input('subCategoryID', subCategoryID)
			.query(checkQuery);
			
		if (checkResult.recordset.length > 0) {
			return NextResponse.json({
				success: false,
				message: "Sub Category already exists for this Main Category"
			}, { status: 400 });
		}

		// Update sub category
		const updateQuery = `
			UPDATE [_rifiiorg_db].[dbo].[tblReportSubCategory] 
			SET [SubCategory] = @subCategory
			OUTPUT INSERTED.[SubCategoryID], INSERTED.[MainCategoryID], INSERTED.[SubCategory]
			WHERE [SubCategoryID] = @subCategoryID
		`;
		
		const result = await pool.request()
			.input('subCategory', subCategory.trim())
			.input('subCategoryID', subCategoryID)
			.query(updateQuery);
			
		if (result.recordset.length === 0) {
			return NextResponse.json({
				success: false,
				message: "Sub Category not found"
			}, { status: 404 });
		}
		
		const updatedSubCategory = result.recordset[0];
		
		return NextResponse.json({
			success: true,
			message: "Sub Category updated successfully",
			subCategory: updatedSubCategory
		});
	} catch (error) {
		console.error("Error updating report sub category:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to update sub category",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

// DELETE - Delete sub category
export async function DELETE(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const subCategoryID = searchParams.get('subCategoryID');
		
		if (!subCategoryID) {
			return NextResponse.json({
				success: false,
				message: "Sub Category ID is required"
			}, { status: 400 });
		}

		const pool = await getDb();
		
		// Check if sub category is being used in reports
		const checkUsageQuery = `
			SELECT COUNT(*) as count
			FROM [_rifiiorg_db].[rifiiorg].[tblReports] 
			WHERE [SubCategory] = (
				SELECT [SubCategory] FROM [_rifiiorg_db].[dbo].[tblReportSubCategory] 
				WHERE [SubCategoryID] = @subCategoryID
			)
		`;
		
		const usageResult = await pool.request()
			.input('subCategoryID', parseInt(subCategoryID))
			.query(checkUsageQuery);
			
		if (usageResult.recordset[0].count > 0) {
			return NextResponse.json({
				success: false,
				message: "Cannot delete sub category that is being used by reports"
			}, { status: 400 });
		}

		// Delete sub category
		const deleteQuery = `
			DELETE FROM [_rifiiorg_db].[dbo].[tblReportSubCategory] 
			WHERE [SubCategoryID] = @subCategoryID
		`;
		
		const result = await pool.request()
			.input('subCategoryID', parseInt(subCategoryID))
			.query(deleteQuery);
			
		if (result.rowsAffected[0] === 0) {
			return NextResponse.json({
				success: false,
				message: "Sub Category not found"
			}, { status: 404 });
		}
		
		return NextResponse.json({
			success: true,
			message: "Sub Category deleted successfully"
		});
	} catch (error) {
		console.error("Error deleting report sub category:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to delete sub category",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}







