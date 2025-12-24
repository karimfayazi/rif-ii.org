import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET - Fetch all main categories
export async function GET() {
	try {
		const pool = await getDb();
		const query = `
			SELECT TOP (1000) [Category], [MainCategoryID]
			FROM [_rifiiorg_db].[dbo].[tblDocumentMainCategory]
			ORDER BY [Category]
		`;
		
		const result = await pool.request().query(query);
		const categories = result.recordset || [];
		
		return NextResponse.json({
			success: true,
			categories: categories
		});
	} catch (error) {
		console.error("Error fetching document main categories:", error);
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
			FROM [_rifiiorg_db].[dbo].[tblDocumentMainCategory] 
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

		// Insert new category
		const insertQuery = `
			INSERT INTO [_rifiiorg_db].[dbo].[tblDocumentMainCategory] ([Category])
			OUTPUT INSERTED.[MainCategoryID], INSERTED.[Category]
			VALUES (@category)
		`;
		
		const result = await pool.request()
			.input('category', category.trim())
			.query(insertQuery);
			
		const newCategory = result.recordset[0];
		
		return NextResponse.json({
			success: true,
			message: "Category created successfully",
			category: newCategory
		});
	} catch (error) {
		console.error("Error creating document main category:", error);
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
		const { mainCategoryID, category } = await request.json();
		
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
			FROM [_rifiiorg_db].[dbo].[tblDocumentMainCategory] 
			WHERE [Category] = @category AND [MainCategoryID] != @mainCategoryID
		`;
		
		const checkResult = await pool.request()
			.input('category', category.trim())
			.input('mainCategoryID', mainCategoryID)
			.query(checkQuery);
			
		if (checkResult.recordset.length > 0) {
			return NextResponse.json({
				success: false,
				message: "Category already exists"
			}, { status: 400 });
		}

		// Update category
		const updateQuery = `
			UPDATE [_rifiiorg_db].[dbo].[tblDocumentMainCategory] 
			SET [Category] = @category
			OUTPUT INSERTED.[MainCategoryID], INSERTED.[Category]
			WHERE [MainCategoryID] = @mainCategoryID
		`;
		
		const result = await pool.request()
			.input('category', category.trim())
			.input('mainCategoryID', mainCategoryID)
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
		console.error("Error updating document main category:", error);
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
		
		// Check if category is being used in documents
		const checkUsageQuery = `
			SELECT COUNT(*) as count
			FROM [_rifiiorg_db].[dbo].[tblDocuments] 
			WHERE [Category] = (
				SELECT [Category] FROM [_rifiiorg_db].[dbo].[tblDocumentMainCategory] 
				WHERE [MainCategoryID] = @mainCategoryID
			)
		`;
		
		const usageResult = await pool.request()
			.input('mainCategoryID', parseInt(mainCategoryID))
			.query(checkUsageQuery);
			
		if (usageResult.recordset[0].count > 0) {
			return NextResponse.json({
				success: false,
				message: "Cannot delete category that is being used by documents"
			}, { status: 400 });
		}

		// Delete category
		const deleteQuery = `
			DELETE FROM [_rifiiorg_db].[dbo].[tblDocumentMainCategory] 
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
		console.error("Error deleting document main category:", error);
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













