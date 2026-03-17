import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export async function DELETE(request: NextRequest) {
	try {
		const userId = getUserIdFromRequest(request);
		if (!userId) {
			return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
		}

		// Check if user has Setting access
		const accessResponse = await fetch(`${request.nextUrl.origin}/api/auth/access?userId=${userId}`);
		const accessData = await accessResponse.json();
		
		if (accessData.setting !== true) {
			return NextResponse.json({ 
				success: false, 
				message: "Access denied. Only users with Setting access can delete users" 
			}, { status: 403 });
		}

		const { searchParams } = new URL(request.url);
		const username = searchParams.get('username');
		
		if (!username) {
			return NextResponse.json({ 
				success: false, 
				message: "Username is required" 
			}, { status: 400 });
		}

		const pool = await getDb();

		// Prevent deleting own account
		const currentUser = await pool.request()
			.input("userId", userId)
			.query(`
				SELECT TOP (1) [username] 
				FROM [_rifiiorg_db].[dbo].[tbl_user_access] 
				WHERE [username] = @userId OR [email] = @userId
			`);

		if (currentUser.recordset.length > 0 && currentUser.recordset[0].username === username) {
			return NextResponse.json({ 
				success: false, 
				message: "You cannot delete your own account" 
			}, { status: 400 });
		}

		const query = `
			DELETE FROM [_rifiiorg_db].[dbo].[tbl_user_access]
			WHERE [username] = @username
		`;

		const result = await pool.request()
			.input("username", username)
			.query(query);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json({
				success: false,
				message: "User not found"
			}, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			message: "User deleted successfully"
		});

	} catch (error) {
		console.error("Error deleting user:", error);
		return NextResponse.json({
			success: false,
			message: "Failed to delete user",
			error: error instanceof Error ? error.message : "Unknown error"
		}, { status: 500 });
	}
}
