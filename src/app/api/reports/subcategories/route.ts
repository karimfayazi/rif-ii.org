import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import sql from "mssql";

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
		
		const mainCategoryIdNum = parseInt(mainCategoryID);
		if (isNaN(mainCategoryIdNum)) {
			return NextResponse.json({
				success: false,
				message: "Invalid Main Category ID"
			}, { status: 400 });
		}
		
		const pool = await getDb();
		const query = `
			SELECT [SubCategoryID], [MainCategoryID], [SubCategory]
			FROM [_rifiiorg_db].[dbo].[tblReportSubCategory]
			WHERE [MainCategoryID] IS NOT NULL 
				AND [SubCategoryID] IS NOT NULL 
				AND [SubCategory] IS NOT NULL
				AND [MainCategoryID] = @mainCategoryID
			ORDER BY [SubCategory]
		`;
		
		const result = await pool.request()
			.input('mainCategoryID', sql.Int, mainCategoryIdNum)
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
		const body = await request.json();
		const { mainCategoryID, subCategory } = body;
		
		// Validate input
		if (!mainCategoryID || typeof mainCategoryID !== 'number') {
			return NextResponse.json({
				success: false,
				message: "Valid Main Category ID is required"
			}, { status: 400 });
		}

		if (!subCategory || typeof subCategory !== 'string' || subCategory.trim() === '') {
			return NextResponse.json({
				success: false,
				message: "Sub Category name is required"
			}, { status: 400 });
		}

		const trimmedSubCategory = subCategory.trim();

		// Validate max length
		if (trimmedSubCategory.length > 255) {
			return NextResponse.json({
				success: false,
				message: "Sub Category name cannot exceed 255 characters"
			}, { status: 400 });
		}

		const pool = await getDb();
		const transaction = pool.transaction();
		
		try {
			await transaction.begin();
			
			// Check if SubCategoryID is IDENTITY column
			const checkIdentityQuery = `
				SELECT COLUMNPROPERTY(OBJECT_ID('[dbo].[tblReportSubCategory]'), 'SubCategoryID', 'IsIdentity') AS IsIdentity;
			`;
			
			const identityResult = await transaction.request().query(checkIdentityQuery);
			const isIdentity = identityResult.recordset[0]?.IsIdentity === 1;
			
			// Check for duplicate (case-insensitive)
			const checkDuplicateQuery = `
				SELECT 1 AS [exists]
				FROM [_rifiiorg_db].[dbo].[tblReportSubCategory]
				WHERE [MainCategoryID] = @mainCategoryID 
					AND LOWER(LTRIM(RTRIM([SubCategory]))) = LOWER(LTRIM(RTRIM(@subCategory)))
			`;
			
			const duplicateResult = await transaction.request()
				.input('mainCategoryID', sql.Int, mainCategoryID)
				.input('subCategory', sql.NVarChar(255), trimmedSubCategory)
				.query(checkDuplicateQuery);
			
			if (duplicateResult.recordset.length > 0) {
				await transaction.rollback();
				return NextResponse.json({
					success: false,
					message: "Sub category already exists for this main category"
				}, { status: 409 });
			}
			
			let result;
			
			if (isIdentity) {
				// SubCategoryID is IDENTITY - let SQL Server auto-generate it
				const insertQuery = `
					INSERT INTO [_rifiiorg_db].[dbo].[tblReportSubCategory] ([MainCategoryID], [SubCategory])
					OUTPUT INSERTED.[SubCategoryID] AS subCategoryId, 
					       INSERTED.[MainCategoryID] AS mainCategoryId, 
					       INSERTED.[SubCategory] AS subCategory
					VALUES (@mainCategoryID, @subCategory);
				`;
				
				result = await transaction.request()
					.input('mainCategoryID', sql.Int, mainCategoryID)
					.input('subCategory', sql.NVarChar(255), trimmedSubCategory)
					.query(insertQuery);
			} else {
				// SubCategoryID is NOT IDENTITY - manually generate next ID
				const manualInsertQuery = `
					SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
					
					DECLARE @NewId INT;
					SELECT @NewId = ISNULL(MAX([SubCategoryID]), 0) + 1
					FROM [_rifiiorg_db].[dbo].[tblReportSubCategory] WITH (UPDLOCK, HOLDLOCK);

					INSERT INTO [_rifiiorg_db].[dbo].[tblReportSubCategory] ([SubCategoryID], [MainCategoryID], [SubCategory])
					VALUES (@NewId, @mainCategoryID, @subCategory);

					SELECT @NewId AS subCategoryId, @mainCategoryID AS mainCategoryId, @subCategory AS subCategory;
				`;
				
				result = await transaction.request()
					.input('mainCategoryID', sql.Int, mainCategoryID)
					.input('subCategory', sql.NVarChar(255), trimmedSubCategory)
					.query(manualInsertQuery);
			}
			
			await transaction.commit();
			
			const newSubCategory = result.recordset[0];
			
			if (!newSubCategory || newSubCategory.subCategoryId == null) {
				throw new Error('Failed to create sub category - no ID returned');
			}
			
			return NextResponse.json({
				success: true,
				message: "Sub category created successfully",
				data: {
					subCategoryId: newSubCategory.subCategoryId,
					mainCategoryId: newSubCategory.mainCategoryId,
					subCategory: newSubCategory.subCategory
				}
			}, { status: 201 });
			
		} catch (txError) {
			await transaction.rollback();
			
			// Log detailed SQL error information
			console.error('Transaction error creating sub category:', {
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
		console.error("Error creating report sub category:", {
			error,
			message: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
			code: (error as any)?.code,
			number: (error as any)?.number,
			name: error instanceof Error ? error.name : undefined
		});
		
		// Provide more specific error message
		let errorMessage = "Failed to create sub category";
		if (error instanceof Error) {
			if (error.message.includes('IDENTITY_INSERT')) {
				errorMessage = "Database configuration error: Cannot insert explicit ID";
			} else if (error.message.includes('duplicate') || error.message.includes('unique')) {
				errorMessage = "Sub category already exists for this main category";
			} else if (error.message.includes('permission') || error.message.includes('denied')) {
				errorMessage = "Database permission error";
			} else if (error.message.includes('timeout')) {
				errorMessage = "Database connection timeout";
			} else {
				errorMessage = `Failed to create sub category: ${error.message}`;
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

// PUT - Update sub category
export async function PUT(request: NextRequest) {
	try {
		const body = await request.json();
		const { subCategoryID, subCategory } = body;
		
		// Validate input
		if (!subCategoryID || typeof subCategoryID !== 'number') {
			return NextResponse.json({
				success: false,
				message: "Valid Sub Category ID is required"
			}, { status: 400 });
		}

		if (!subCategory || typeof subCategory !== 'string' || subCategory.trim() === '') {
			return NextResponse.json({
				success: false,
				message: "Sub Category name is required"
			}, { status: 400 });
		}

		const trimmedSubCategory = subCategory.trim();

		// Validate max length
		if (trimmedSubCategory.length > 255) {
			return NextResponse.json({
				success: false,
				message: "Sub Category name cannot exceed 255 characters"
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
		
		// Check if sub category already exists for this main category (excluding current one) - case insensitive
		const checkQuery = `
			SELECT [SubCategoryID] 
			FROM [_rifiiorg_db].[dbo].[tblReportSubCategory] 
			WHERE [MainCategoryID] = @mainCategoryID 
				AND LOWER(LTRIM(RTRIM([SubCategory]))) = LOWER(LTRIM(RTRIM(@subCategory))) 
				AND [SubCategoryID] != @subCategoryID
		`;
		
		const checkResult = await pool.request()
			.input('mainCategoryID', mainCategoryID)
			.input('subCategory', trimmedSubCategory)
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
			.input('subCategory', trimmedSubCategory)
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
			subCategory: {
				SubCategoryID: updatedSubCategory.SubCategoryID,
				MainCategoryID: updatedSubCategory.MainCategoryID,
				SubCategory: updatedSubCategory.SubCategory
			}
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
















