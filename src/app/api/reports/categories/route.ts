import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import sql from "mssql";

// GET - Fetch all main categories
export async function GET() {
	try {
		const pool = await getDb();
		const query = `
			SELECT TOP (1000) [MainCategoryID], [Category]
			FROM [_rifiiorg_db].[rifiiorg].[tblReportMainCategory]
			ORDER BY [Category]
		`;
		
		const result = await pool.request().query(query);
		const categories = result.recordset || [];
		
		return NextResponse.json({
			success: true,
			categories: categories
		});
	} catch (error) {
		console.error("Error fetching report main categories:", error);
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
		const body = await request.json();
		const category = body?.category;
		
		// Validate input
		if (!category || typeof category !== 'string' || category.trim() === '') {
			return NextResponse.json({
				success: false,
				message: "Category name is required"
			}, { status: 400 });
		}

		const trimmedCategory = category.trim();

		// Validate max length
		if (trimmedCategory.length > 100) {
			return NextResponse.json({
				success: false,
				message: "Category name cannot exceed 100 characters"
			}, { status: 400 });
		}

		const pool = await getDb();
		const transaction = pool.transaction();
		
		try {
			await transaction.begin();
			
			// Check for duplicate (case-insensitive)
			const checkQuery = `
				SELECT 1 AS [exists]
				FROM [_rifiiorg_db].[rifiiorg].[tblReportMainCategory]
				WHERE LOWER(LTRIM(RTRIM([Category]))) = LOWER(LTRIM(RTRIM(@category)))
			`;
			
			const checkResult = await transaction.request()
				.input('category', sql.VarChar(100), trimmedCategory)
				.query(checkQuery);
			
			if (checkResult.recordset.length > 0) {
				await transaction.rollback();
				return NextResponse.json({
					success: false,
					message: "Category already exists"
				}, { status: 409 });
			}
			
			// Insert with auto-generated ID (IDENTITY column handles this)
			const insertQuery = `
				INSERT INTO [_rifiiorg_db].[rifiiorg].[tblReportMainCategory] ([Category])
				OUTPUT INSERTED.[MainCategoryID] AS mainCategoryId, INSERTED.[Category] AS category
				VALUES (@category);
			`;
			
			const result = await transaction.request()
				.input('category', sql.VarChar(100), trimmedCategory)
				.query(insertQuery);
			
			await transaction.commit();
			
			const newCategory = result.recordset[0];
			
			if (!newCategory || !newCategory.mainCategoryId) {
				throw new Error('Failed to create category - no ID returned');
			}
			
			return NextResponse.json({
				success: true,
				message: "Category created successfully",
				data: {
					mainCategoryId: newCategory.mainCategoryId,
					category: newCategory.category
				}
			}, { status: 201 });
			
		} catch (txError) {
			await transaction.rollback();
			
			// Log detailed SQL error information
			console.error('Transaction error creating main category:', {
				error: txError,
				message: txError instanceof Error ? txError.message : 'Unknown error',
				code: (txError as any)?.code,
				number: (txError as any)?.number,
				state: (txError as any)?.state,
				class: (txError as any)?.class,
				lineNumber: (txError as any)?.lineNumber,
				serverName: (txError as any)?.serverName,
				procName: (txError as any)?.procName
			});
			
			throw txError;
		}
		
	} catch (error) {
		console.error("Error creating report main category:", {
			error,
			message: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
			code: (error as any)?.code,
			number: (error as any)?.number,
			name: error instanceof Error ? error.name : undefined
		});
		
		// Provide more specific error message
		let errorMessage = "Failed to create main category";
		if (error instanceof Error) {
			// Check for specific SQL errors
			if (error.message.includes('IDENTITY_INSERT')) {
				errorMessage = "Database configuration error: Cannot insert explicit ID";
			} else if (error.message.includes('duplicate') || error.message.includes('unique')) {
				errorMessage = "Category already exists";
			} else if (error.message.includes('permission') || error.message.includes('denied')) {
				errorMessage = "Database permission error";
			} else if (error.message.includes('timeout')) {
				errorMessage = "Database connection timeout";
			} else {
				errorMessage = `Failed to create main category: ${error.message}`;
			}
		}
		
		return NextResponse.json(
			{
				success: false,
				message: errorMessage,
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

// PUT - Update main category
export async function PUT(request: NextRequest) {
	try {
		const body = await request.json();
		const { mainCategoryID, category } = body;
		
		// Validate input
		if (!mainCategoryID || typeof mainCategoryID !== 'number') {
			return NextResponse.json({
				success: false,
				message: "Valid Category ID is required"
			}, { status: 400 });
		}

		if (!category || typeof category !== 'string' || category.trim() === '') {
			return NextResponse.json({
				success: false,
				message: "Category name is required"
			}, { status: 400 });
		}

		const trimmedCategory = category.trim();

		// Validate max length
		if (trimmedCategory.length > 100) {
			return NextResponse.json({
				success: false,
				message: "Category name cannot exceed 100 characters"
			}, { status: 400 });
		}

		const pool = await getDb();
		
		// Check if category already exists (excluding current one) - case insensitive
		const checkQuery = `
			SELECT [MainCategoryID] 
			FROM [_rifiiorg_db].[rifiiorg].[tblReportMainCategory] 
			WHERE LOWER(LTRIM(RTRIM([Category]))) = LOWER(LTRIM(RTRIM(@category))) 
				AND [MainCategoryID] != @mainCategoryID
		`;
		
		const checkResult = await pool.request()
			.input('category', trimmedCategory)
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
			UPDATE [_rifiiorg_db].[rifiiorg].[tblReportMainCategory] 
			SET [Category] = @category
			OUTPUT INSERTED.[MainCategoryID], INSERTED.[Category]
			WHERE [MainCategoryID] = @mainCategoryID
		`;
		
		const result = await pool.request()
			.input('category', trimmedCategory)
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
			category: {
				MainCategoryID: updatedCategory.MainCategoryID,
				Category: updatedCategory.Category
			}
		});
	} catch (error) {
		console.error("Error updating report main category:", error);
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
		
		// Check if category has subcategories
		const checkSubCategoriesQuery = `
			SELECT COUNT(*) as count
			FROM [_rifiiorg_db].[dbo].[tblReportSubCategory] 
			WHERE [MainCategoryID] = @mainCategoryID
		`;
		
		const subCategoriesResult = await pool.request()
			.input('mainCategoryID', parseInt(mainCategoryID))
			.query(checkSubCategoriesQuery);
			
		if (subCategoriesResult.recordset[0].count > 0) {
			return NextResponse.json({
				success: false,
				message: "Cannot delete because subcategories exist"
			}, { status: 409 });
		}
		
		// Check if category is being used in reports
		const checkUsageQuery = `
			SELECT COUNT(*) as count
			FROM [_rifiiorg_db].[rifiiorg].[tblReports] 
			WHERE [MainCategory] = (
				SELECT [Category] FROM [_rifiiorg_db].[rifiiorg].[tblReportMainCategory] 
				WHERE [MainCategoryID] = @mainCategoryID
			)
		`;
		
		const usageResult = await pool.request()
			.input('mainCategoryID', parseInt(mainCategoryID))
			.query(checkUsageQuery);
			
		if (usageResult.recordset[0].count > 0) {
			return NextResponse.json({
				success: false,
				message: "Cannot delete category that is being used by reports"
			}, { status: 409 });
		}

		// Delete category
		const deleteQuery = `
			DELETE FROM [_rifiiorg_db].[rifiiorg].[tblReportMainCategory] 
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
		console.error("Error deleting report main category:", error);
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
















