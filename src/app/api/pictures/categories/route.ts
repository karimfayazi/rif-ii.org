import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET - Fetch all main categories
export async function GET() {
	try {
		const pool = await getDb();
		const query = `
			SELECT [MainCategoryID], [Category]
			FROM [_rifiiorg_db].[dbo].[tblPictureMainCategory]
			ORDER BY [Category]
		`;
		
		const result = await pool.request().query(query);
		const categories = result.recordset || [];
		
		return NextResponse.json({
			success: true,
			categories: categories
		});
	} catch (error) {
		console.error("Error fetching main categories:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch main categories",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

// POST - Create new main category
export async function POST(request: NextRequest) {
	try {
		const { category } = await request.json();
		
		if (!category || category.trim() === '') {
			return NextResponse.json({
				success: false,
				message: "Category name is required"
			}, { status: 400 });
		}

		const pool = await getDb();
		
		// Check if category already exists
		const checkQuery = `
			SELECT [MainCategoryID] 
			FROM [_rifiiorg_db].[dbo].[tblPictureMainCategory] 
			WHERE [Category] = @category
		`;
		
		const checkResult = await pool.request()
			.input('category', category.trim())
			.query(checkQuery);
			
		if (checkResult.recordset.length > 0) {
			return NextResponse.json({
				success: false,
				message: "Category already exists"
			}, { status: 400 });
		}

		// Insert new category using SCOPE_IDENTITY for reliability
		const insertQuery = `
			INSERT INTO [_rifiiorg_db].[dbo].[tblPictureMainCategory] ([Category])
			VALUES (@category);
			
			SELECT 
				CAST(SCOPE_IDENTITY() AS INT) AS MainCategoryID,
				@category AS Category;
		`;
		
		const result = await pool.request()
			.input('category', category.trim())
			.query(insertQuery);
			
		const newCategory = result.recordset[0];
		
		// Verify we got a valid ID
		if (!newCategory.MainCategoryID || newCategory.MainCategoryID === null) {
			throw new Error('Failed to generate MainCategoryID - check database schema');
		}
		
		// Return exact format as required: { "MainCategoryID": <newId>, "Category": "<value>" }
		return NextResponse.json({
			MainCategoryID: Number(newCategory.MainCategoryID),
			Category: newCategory.Category
		});
	} catch (error) {
		console.error("Error creating main category:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to create main category",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

// PUT - Update main category
export async function PUT(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const mainCategoryID = searchParams.get('id') || searchParams.get('mainCategoryID');
		const { category } = await request.json();
		
		if (!mainCategoryID || !category || category.trim() === '') {
			return NextResponse.json({
				success: false,
				message: "Category ID and name are required"
			}, { status: 400 });
		}

		const pool = await getDb();
		
		// Check if category already exists (excluding current one)
		const checkQuery = `
			SELECT [MainCategoryID] 
			FROM [_rifiiorg_db].[dbo].[tblPictureMainCategory] 
			WHERE [Category] = @category AND [MainCategoryID] != @mainCategoryID
		`;
		
		const checkResult = await pool.request()
			.input('category', category.trim())
			.input('mainCategoryID', parseInt(mainCategoryID))
			.query(checkQuery);
			
		if (checkResult.recordset.length > 0) {
			return NextResponse.json({
				success: false,
				message: "Category already exists"
			}, { status: 400 });
		}

		// Update category - never update identity columns
		const updateQuery = `
			UPDATE [_rifiiorg_db].[dbo].[tblPictureMainCategory] 
			SET [Category] = @category
			OUTPUT INSERTED.[MainCategoryID], INSERTED.[Category]
			WHERE [MainCategoryID] = @mainCategoryID
		`;
		
		const result = await pool.request()
			.input('category', category.trim())
			.input('mainCategoryID', parseInt(mainCategoryID))
			.query(updateQuery);
			
		if (result.recordset.length === 0) {
			return NextResponse.json({
				success: false,
				message: "Category not found"
			}, { status: 404 });
		}
		
		const updatedCategory = result.recordset[0];
		
		return NextResponse.json({
			success: true,
			message: "Category updated successfully",
			category: updatedCategory
		});
	} catch (error) {
		console.error("Error updating main category:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to update main category",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

// DELETE - Delete main category
export async function DELETE(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const mainCategoryID = searchParams.get('mainCategoryID');
		
		if (!mainCategoryID) {
			return NextResponse.json({
				success: false,
				message: "Category ID is required"
			}, { status: 400 });
		}

		const pool = await getDb();
		
		// Check if category has subcategories using exact pattern from requirements
		const checkSubCategoriesQuery = `
			IF EXISTS (SELECT 1 FROM [_rifiiorg_db].[dbo].[tblPictureSubCategory] WHERE [MainCategoryID] = @mainCategoryID)
			BEGIN
				SELECT 1 AS HasSubs;
			END
			ELSE
			BEGIN
				SELECT 0 AS HasSubs;
			END
		`;
		
		const subCategoriesResult = await pool.request()
			.input('mainCategoryID', parseInt(mainCategoryID))
			.query(checkSubCategoriesQuery);
			
		if (subCategoriesResult.recordset[0]?.HasSubs === 1) {
			return NextResponse.json({
				success: false,
				message: "Cannot delete because subcategories exist"
			}, { status: 409 });
		}
		
		// Check if category is being used in pictures
		const checkUsageQuery = `
			SELECT COUNT(*) as count
			FROM [_rifiiorg_db].[dbo].[tblPictures] 
			WHERE [MainCategory] = (
				SELECT [Category] FROM [_rifiiorg_db].[dbo].[tblPictureMainCategory] 
				WHERE [MainCategoryID] = @mainCategoryID
			)
		`;
		
		const usageResult = await pool.request()
			.input('mainCategoryID', mainCategoryID)
			.query(checkUsageQuery);
			
		if (usageResult.recordset[0].count > 0) {
			return NextResponse.json({
				success: false,
				message: "Cannot delete category that is being used by pictures"
			}, { status: 409 });
		}

		// Delete category
		const deleteQuery = `
			DELETE FROM [_rifiiorg_db].[dbo].[tblPictureMainCategory] 
			WHERE [MainCategoryID] = @mainCategoryID
		`;
		
		const result = await pool.request()
			.input('mainCategoryID', parseInt(mainCategoryID))
			.query(deleteQuery);
			
		if (result.rowsAffected[0] === 0) {
			return NextResponse.json({
				success: false,
				message: "Category not found"
			}, { status: 404 });
		}
		
		return NextResponse.json({
			success: true,
			message: "Category deleted successfully"
		});
	} catch (error) {
		console.error("Error deleting main category:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to delete main category",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
