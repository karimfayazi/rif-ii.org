import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";
import { unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Helper function to check if user has delete access (Admin only for now)
async function checkDeleteAccess(userId: string | null): Promise<{ canDelete: boolean; message?: string }> {
	if (!userId) {
		return { canDelete: false, message: "Unauthorized" };
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
			return { canDelete: false, message: "User not found" };
		}

		const accessLevel = accessResult.recordset[0].access_level;
		const isAdmin = accessLevel === 'Admin';
		
		if (!isAdmin) {
			return { 
				canDelete: false, 
				message: "Insufficient Permissions. This action requires Admin access. Please contact your administrator if you believe this is an error." 
			};
		}

		return { canDelete: true };
	} catch (error) {
		console.error("Error checking delete access:", error);
		return { canDelete: false, message: "Error checking access permissions" };
	}
}

export async function DELETE(request: NextRequest) {
	try {
		// Check delete permission
		const userId = getUserIdFromRequest(request);
		const accessCheck = await checkDeleteAccess(userId);
		
		if (!accessCheck.canDelete) {
			return NextResponse.json(
				{
					success: false,
					message: accessCheck.message || "Access denied. Admin access required."
				},
				{ status: 403 }
			);
		}

		const { searchParams } = new URL(request.url);
		const pictureId = searchParams.get('pictureId');

		if (!pictureId) {
			return NextResponse.json({
				success: false,
				message: "Picture ID is required"
			}, { status: 400 });
		}

		const pool = await getDb();
		
		// First, get the picture details to find the file path
		const getPictureQuery = `
			SELECT [PictureID], [FilePath], [FileName]
			FROM [_rifiiorg_db].[dbo].[tblPictures]
			WHERE [PictureID] = @pictureId
		`;
		
		const getResult = await pool.request()
			.input('pictureId', parseInt(pictureId))
			.query(getPictureQuery);
		
		if (getResult.recordset.length === 0) {
			return NextResponse.json({
				success: false,
				message: "Picture not found"
			}, { status: 404 });
		}

		const picture = getResult.recordset[0];
		const filePath = picture.FilePath;

		// Delete from database
		const deleteQuery = `
			DELETE FROM [_rifiiorg_db].[dbo].[tblPictures]
			WHERE [PictureID] = @pictureId
		`;
		
		await pool.request()
			.input('pictureId', parseInt(pictureId))
			.query(deleteQuery);

		// Try to delete the physical file if it exists
		if (filePath) {
			try {
				// Handle different path formats
				let physicalPath: string;
				if (filePath.startsWith('uploads/')) {
					physicalPath = join(process.cwd(), 'public', filePath);
				} else if (filePath.startsWith('/uploads/')) {
					physicalPath = join(process.cwd(), 'public', filePath.substring(1));
				} else {
					physicalPath = join(process.cwd(), 'public', 'uploads', 'pictures', filePath);
				}

				if (existsSync(physicalPath)) {
					await unlink(physicalPath);
					console.log("Deleted physical file:", physicalPath);
				}
			} catch (fileError) {
				// Log error but don't fail the request if file deletion fails
				console.error("Error deleting physical file:", fileError);
			}
		}

		return NextResponse.json({
			success: true,
			message: "Picture deleted successfully"
		});

	} catch (error) {
		console.error("Error deleting picture:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to delete picture",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}






