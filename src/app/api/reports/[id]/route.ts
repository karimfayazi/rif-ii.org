import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserIdFromRequest, checkDeleteAccess } from "@/lib/auth";
import { unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// GET - Get single report by ID
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		
		if (!id) {
			return NextResponse.json({
				success: false,
				message: "Report ID is required"
			}, { 
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const pool = await getDb();
		const query = `
			SELECT TOP (1)
				[ReportID],
				[ReportTitle],
				[Description],
				[FilePath],
				[EventDate],
				[MainCategory],
				[SubCategory]
			FROM [_rifiiorg_db].[rifiiorg].[tblReports]
			WHERE [ReportID] = @reportID
		`;

		const result = await pool.request()
			.input('reportID', parseInt(id))
			.query(query);
		
		if (result.recordset.length === 0) {
			return NextResponse.json({
				success: false,
				message: "Report not found"
			}, { 
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		
		return NextResponse.json({
			success: true,
			report: result.recordset[0]
		}, {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error("Error fetching report:", error);
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		const errorStack = error instanceof Error ? error.stack : undefined;
		
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch report",
				error: errorMessage,
				...(errorStack && { stack: errorStack })
			},
			{ 
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
}

// Helper function to check edit access
async function checkEditAccess(userId: string | null): Promise<{ hasAccess: boolean; message?: string }> {
	if (!userId) {
		return { hasAccess: false, message: "Unauthorized" };
	}

	try {
		const pool = await getDb();
		const accessQuery = `
			SELECT [access_edit]
			FROM [_rifiiorg_db].[dbo].[tbl_user_access]
			WHERE [username] = @userId OR [email] = @userId
		`;
		
		const accessResult = await pool.request()
			.input('userId', userId)
			.query(accessQuery);
		
		if (accessResult.recordset.length === 0) {
			return { hasAccess: false, message: "User not found" };
		}

		const accessEdit = accessResult.recordset[0].access_edit;
		const hasAccess = accessEdit === true || accessEdit === 1;
		
		if (!hasAccess) {
			return { 
				hasAccess: false, 
				message: "Insufficient Permissions. This action requires edit access. Please contact your administrator if you believe this is an error." 
			};
		}

		return { hasAccess: true };
	} catch (error) {
		console.error("Error checking edit access:", error);
		return { hasAccess: false, message: "Error checking access permissions" };
	}
}

// PUT - Update report
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const userId = getUserIdFromRequest(request);
		const accessCheck = await checkEditAccess(userId);
		
		if (!accessCheck.hasAccess) {
			return NextResponse.json(
				{
					success: false,
					message: accessCheck.message || "Access denied. Edit permission required."
				},
				{ status: 403 }
			);
		}

		const { id } = await params;
		const body = await request.json();
		
		const {
			reportTitle,
			description,
			mainCategory,
			subCategory,
			eventDate
		} = body;

		if (!id) {
			return NextResponse.json({
				success: false,
				message: "Report ID is required"
			}, { status: 400 });
		}

		if (!reportTitle || !mainCategory || !subCategory || !eventDate) {
			return NextResponse.json({
				success: false,
				message: "Report title, main category, sub category, and event date are required"
			}, { status: 400 });
		}

		const pool = await getDb();
		const query = `
			UPDATE [_rifiiorg_db].[rifiiorg].[tblReports]
			SET 
				[ReportTitle] = @reportTitle,
				[Description] = @description,
				[MainCategory] = @mainCategory,
				[SubCategory] = @subCategory,
				[EventDate] = @eventDate
			WHERE [ReportID] = @reportID
		`;

		const request_obj = pool.request();
		request_obj.input('reportID', parseInt(id));
		request_obj.input('reportTitle', reportTitle);
		request_obj.input('description', description || '');
		request_obj.input('mainCategory', mainCategory);
		request_obj.input('subCategory', subCategory);
		request_obj.input('eventDate', eventDate);

		const result = await request_obj.query(query);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json({
				success: false,
				message: "Report not found"
			}, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			message: "Report updated successfully"
		});
	} catch (error) {
		console.error("Error updating report:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to update report",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

// DELETE - Delete report
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const userId = getUserIdFromRequest(request);
		const accessCheck = await checkDeleteAccess(userId);
		
		if (!accessCheck.hasAccess) {
			return NextResponse.json(
				{
					success: false,
					message: accessCheck.message || "Access denied. Delete permission required."
				},
				{ status: 403 }
			);
		}

		const { id } = await params;
		
		if (!id) {
			return NextResponse.json({
				success: false,
				message: "Report ID is required"
			}, { status: 400 });
		}

		const pool = await getDb();
		
		// First, get the file path
		const selectQuery = `
			SELECT [FilePath]
			FROM [_rifiiorg_db].[rifiiorg].[tblReports]
			WHERE [ReportID] = @reportID
		`;
		
		const selectResult = await pool.request()
			.input('reportID', parseInt(id))
			.query(selectQuery);
		
		if (selectResult.recordset.length === 0) {
			return NextResponse.json({
				success: false,
				message: "Report not found"
			}, { status: 404 });
		}

		const filePath = selectResult.recordset[0].FilePath;
		
		// Delete from database
		const deleteQuery = `
			DELETE FROM [_rifiiorg_db].[rifiiorg].[tblReports]
			WHERE [ReportID] = @reportID
		`;
		
		await pool.request()
			.input('reportID', parseInt(id))
			.query(deleteQuery);
		
		// Try to delete the physical file if it exists locally
		try {
			if (filePath && !filePath.startsWith('http')) {
				// Handle local path: uploads/reports/{filename}
				let fileName = filePath;
				
				// Remove path prefixes
				if (filePath.startsWith('uploads/reports/')) {
					fileName = filePath.replace('uploads/reports/', '');
				} else if (filePath.startsWith('/uploads/reports/')) {
					fileName = filePath.replace('/uploads/reports/', '');
				} else if (filePath.startsWith('~/Uploads/Reports/')) {
					fileName = filePath.replace('~/Uploads/Reports/', '');
				} else if (filePath.startsWith('Uploads/Reports/')) {
					fileName = filePath.replace('Uploads/Reports/', '');
				}
				
				const physicalPath = join(process.cwd(), 'public', 'uploads', 'reports', fileName);
				
				if (existsSync(physicalPath)) {
					await unlink(physicalPath);
				}
			}
		} catch (fileError) {
			// Log but don't fail if file deletion fails
			console.warn("Failed to delete physical file:", fileError);
		}
		
		return NextResponse.json({
			success: true,
			message: "Report deleted successfully"
		});
	} catch (error) {
		console.error("Error deleting report:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to delete report",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

