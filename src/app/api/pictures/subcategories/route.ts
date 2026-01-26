import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET - Fetch sub categories by main category ID
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const mainCategoryID = searchParams.get('mainCategoryID');
		
		const pool = await getDb();
		let query = `
			SELECT s.[SubCategoryID], s.[MainCategoryID], s.[SubCategory], m.[Category] as MainCategoryName
			FROM [_rifiiorg_db].[dbo].[tblPictureSubCategory] s
			INNER JOIN [_rifiiorg_db].[dbo].[tblPictureMainCategory] m ON s.[MainCategoryID] = m.[MainCategoryID]
		`;
		
		const request_obj = pool.request();
		
		if (mainCategoryID) {
			query += ` WHERE s.[MainCategoryID] = @mainCategoryID`;
			request_obj.input('mainCategoryID', mainCategoryID);
		}
		
		query += ` ORDER BY s.[SubCategory]`;
		
		const result = await request_obj.query(query);
		const subCategories = result.recordset || [];
		
		return NextResponse.json({
			success: true,
			subCategories: subCategories
		});
	} catch (error) {
		console.error("Error fetching sub categories:", error);
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
			FROM [_rifiiorg_db].[dbo].[tblPictureSubCategory] 
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

		// Insert new sub category using SCOPE_IDENTITY for reliability
		const insertQuery = `
			INSERT INTO [_rifiiorg_db].[dbo].[tblPictureSubCategory] ([MainCategoryID], [SubCategory])
			VALUES (@mainCategoryID, @subCategory);
			
			SELECT 
				CAST(SCOPE_IDENTITY() AS INT) AS SubCategoryID,
				@mainCategoryID AS MainCategoryID,
				@subCategory AS SubCategory;
		`;
		
		const result = await pool.request()
			.input('mainCategoryID', mainCategoryID)
			.input('subCategory', subCategory.trim())
			.query(insertQuery);
			
		const newSubCategory = result.recordset[0];
		
		// Verify we got a valid ID
		if (!newSubCategory.SubCategoryID || newSubCategory.SubCategoryID === null) {
			throw new Error('Failed to generate SubCategoryID - check database schema');
		}
		
		// Return exact format as required: { "SubCategoryID": <newId>, "MainCategoryID": <mainId>, "SubCategory": "<value>" }
		return NextResponse.json({
			SubCategoryID: Number(newSubCategory.SubCategoryID),
			MainCategoryID: Number(newSubCategory.MainCategoryID),
			SubCategory: newSubCategory.SubCategory
		});
	} catch (error) {
		console.error("Error creating sub category:", error);
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
		const { searchParams } = new URL(request.url);
		const subCategoryID = searchParams.get('id') || searchParams.get('subCategoryID');
		const { subCategory } = await request.json();
		
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
			FROM [_rifiiorg_db].[dbo].[tblPictureSubCategory] 
			WHERE [SubCategoryID] = @subCategoryID
		`;
		
		const mainCategoryResult = await pool.request()
			.input('subCategoryID', parseInt(subCategoryID))
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
			FROM [_rifiiorg_db].[dbo].[tblPictureSubCategory] 
			WHERE [MainCategoryID] = @mainCategoryID AND [SubCategory] = @subCategory AND [SubCategoryID] != @subCategoryID
		`;
		
		const checkResult = await pool.request()
			.input('mainCategoryID', mainCategoryID)
			.input('subCategory', subCategory.trim())
			.input('subCategoryID', parseInt(subCategoryID))
			.query(checkQuery);
			
		if (checkResult.recordset.length > 0) {
			return NextResponse.json({
				success: false,
				message: "Sub Category already exists for this Main Category"
			}, { status: 400 });
		}

		// Update sub category - never update identity columns
		const updateQuery = `
			UPDATE [_rifiiorg_db].[dbo].[tblPictureSubCategory] 
			SET [SubCategory] = @subCategory
			OUTPUT INSERTED.[SubCategoryID], INSERTED.[MainCategoryID], INSERTED.[SubCategory]
			WHERE [SubCategoryID] = @subCategoryID
		`;
		
		const result = await pool.request()
			.input('subCategory', subCategory.trim())
			.input('subCategoryID', parseInt(subCategoryID))
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
		console.error("Error updating sub category:", error);
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
		
		// Check if sub category is being used in pictures
		const checkUsageQuery = `
			SELECT COUNT(*) as count
			FROM [_rifiiorg_db].[dbo].[tblPictures] 
			WHERE [SubCategory] = (
				SELECT [SubCategory] FROM [_rifiiorg_db].[dbo].[tblPictureSubCategory] 
				WHERE [SubCategoryID] = @subCategoryID
			)
		`;
		
		const usageResult = await pool.request()
			.input('subCategoryID', parseInt(subCategoryID))
			.query(checkUsageQuery);
			
		if (usageResult.recordset[0].count > 0) {
			return NextResponse.json({
				success: false,
				message: "Cannot delete sub category that is being used by pictures"
			}, { status: 409 });
		}

		// Delete sub category
		const deleteQuery = `
			DELETE FROM [_rifiiorg_db].[dbo].[tblPictureSubCategory] 
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
		console.error("Error deleting sub category:", error);
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
