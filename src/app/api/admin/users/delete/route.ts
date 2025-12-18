import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { username } = body;

		if (!username) {
			return NextResponse.json(
				{ success: false, message: "Username is required" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		
		const query = `
			DELETE FROM [_rifiiorg_db].[dbo].[tbl_user_access]
			WHERE [username] = @username
		`;

		const result = await pool.request()
			.input("username", username)
			.query(query);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "User not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "User deleted successfully"
		});

	} catch (error) {
		console.error("Error deleting user:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to delete user",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}



