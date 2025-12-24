import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";
import { unlink, rmdir, readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Helper function to check if user is Admin
async function checkAdminAccess(userId: string | null): Promise<{ isAdmin: boolean; message?: string }> {
	if (!userId) {
		return { isAdmin: false, message: "Unauthorized" };
	}

	try {
		const pool = await getDb();
		const accessQuery = `
			SELECT [access_level]
			FROM [_rifiiorg_db].[dbo].[tbl_user_access]
			WHERE [username] = @userId OR [email] = @userId
		`;
		
		const accessResult = await pool.request()
			.input('userId', userId)
			.query(accessQuery);
		
		if (accessResult.recordset.length === 0) {
			return { isAdmin: false, message: "User not found" };
		}

		const accessLevel = accessResult.recordset[0].access_level;
		const isAdmin = accessLevel === 'Admin';
		
		if (!isAdmin) {
			return { 
				isAdmin: false, 
				message: "Insufficient Permissions. This action requires Admin level access." 
			};
		}

		return { isAdmin: true };
	} catch (error) {
		console.error("Error checking admin access:", error);
		return { isAdmin: false, message: "Error checking access permissions" };
	}
}

// Helper function to recursively delete directory
async function deleteDirectory(dirPath: string): Promise<void> {
	if (!existsSync(dirPath)) {
		return;
	}

	const entries = await readdir(dirPath, { withFileTypes: true });
	
	for (const entry of entries) {
		const fullPath = join(dirPath, entry.name);
		if (entry.isDirectory()) {
			await deleteDirectory(fullPath);
		} else {
			await unlink(fullPath);
		}
	}
	
	await rmdir(dirPath);
}

// DELETE - Delete pictures by folder structure
export async function DELETE(request: NextRequest) {
	try {
		// Check Admin access
		const userId = getUserIdFromRequest(request);
		const accessCheck = await checkAdminAccess(userId);
		
		if (!accessCheck.isAdmin) {
			return NextResponse.json(
				{
					success: false,
					message: accessCheck.message || "Access denied. Admin privileges required."
				},
				{ status: 403 }
			);
		}

		const { searchParams } = new URL(request.url);
		const mainCategory = searchParams.get('mainCategory');
		const eventName = searchParams.get('eventName');
		const eventDate = searchParams.get('eventDate');

		if (!mainCategory) {
			return NextResponse.json({
				success: false,
				message: "Main category is required"
			}, { status: 400 });
		}

		const pool = await getDb();

		// Build WHERE clause based on provided parameters
		let whereClause = `[MainCategory] = @mainCategory`;
		const request_obj = pool.request();
		request_obj.input('mainCategory', mainCategory);

		if (eventName) {
			whereClause += ` AND [GroupName] = @eventName`;
			request_obj.input('eventName', eventName);
		}

		if (eventDate) {
			whereClause += ` AND CONVERT(VARCHAR(10), [EventDate], 120) = @eventDate`;
			request_obj.input('eventDate', eventDate);
		}

		// Get file paths before deleting from database
		const getFilesQuery = `
			SELECT [FilePath]
			FROM [_rifiiorg_db].[dbo].[tblPictures]
			WHERE ${whereClause}
		`;
		
		const filesResult = await request_obj.query(getFilesQuery);
		const files = filesResult.recordset || [];

		// Delete files from filesystem
		const deletedFiles: string[] = [];
		const failedFiles: string[] = [];

		for (const file of files) {
			if (file.FilePath) {
				try {
					// Handle different path formats
					let filePath: string;
					if (file.FilePath.startsWith('uploads/')) {
						filePath = join(process.cwd(), 'public', file.FilePath);
					} else if (file.FilePath.startsWith('~/')) {
						// Skip external URLs
						continue;
					} else {
						filePath = join(process.cwd(), 'public', 'uploads', 'pictures', file.FilePath);
					}

					if (existsSync(filePath)) {
						await unlink(filePath);
						deletedFiles.push(file.FilePath);
					}
				} catch (err) {
					console.error(`Error deleting file ${file.FilePath}:`, err);
					failedFiles.push(file.FilePath);
				}
			}
		}

		// Delete from database
		const deleteQuery = `
			DELETE FROM [_rifiiorg_db].[dbo].[tblPictures]
			WHERE ${whereClause}
		`;
		
		const deleteResult = await request_obj.query(deleteQuery);
		const deletedCount = deleteResult.rowsAffected[0];

		// Try to delete empty directories
		try {
			const sanitizeFolderName = (name: string) => {
				return name.replace(/[^a-zA-Z0-9-_]/g, '_').trim();
			};

			if (mainCategory && eventName && eventDate) {
				// Delete event date folder
				const sanitizedMainCategory = sanitizeFolderName(mainCategory);
				const sanitizedEventName = sanitizeFolderName(eventName);
				const sanitizedEventDate = eventDate.replace(/[^a-zA-Z0-9-]/g, '_');
				const folderPath = join(process.cwd(), 'public', 'uploads', 'pictures', sanitizedMainCategory, sanitizedEventName, sanitizedEventDate);
				if (existsSync(folderPath)) {
					await deleteDirectory(folderPath);
				}
			} else if (mainCategory && eventName) {
				// Delete event name folder
				const sanitizedMainCategory = sanitizeFolderName(mainCategory);
				const sanitizedEventName = sanitizeFolderName(eventName);
				const folderPath = join(process.cwd(), 'public', 'uploads', 'pictures', sanitizedMainCategory, sanitizedEventName);
				if (existsSync(folderPath)) {
					await deleteDirectory(folderPath);
				}
			} else if (mainCategory) {
				// Delete main category folder
				const sanitizedMainCategory = sanitizeFolderName(mainCategory);
				const folderPath = join(process.cwd(), 'public', 'uploads', 'pictures', sanitizedMainCategory);
				if (existsSync(folderPath)) {
					await deleteDirectory(folderPath);
				}
			}
		} catch (err) {
			console.error("Error deleting folders:", err);
			// Continue even if folder deletion fails
		}

		return NextResponse.json({
			success: true,
			message: `Successfully deleted ${deletedCount} picture(s)`,
			deletedCount: deletedCount,
			deletedFiles: deletedFiles.length,
			failedFiles: failedFiles.length
		});

	} catch (error) {
		console.error("Error deleting pictures folder:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to delete pictures",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}













