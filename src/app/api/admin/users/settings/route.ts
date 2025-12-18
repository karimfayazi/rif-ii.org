import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');
		
		const pool = await getDb();
		
		if (id) {
			// Fetch single user by username
			const query = `
				SELECT TOP (1)
					[username],
					[password],
					[email],
					[created_at],
					[updated_at],
					[department],
					[full_name],
					[region],
					[address],
					[contact_no],
					[access_level],
					[access_granted_at],
					[access_add],
					[access_edit],
					[access_delete],
					[access_reports],
					[UserLoginLogs],
					[Tracking_Section],
					[Training_Section]
				FROM [_rifiiorg_db].[dbo].[tbl_user_access]
				WHERE [username] = @username
			`;

			const result = await pool.request()
				.input("username", id)
				.query(query);
			
			const user = result.recordset?.[0] || null;
			
			return NextResponse.json({
				success: true,
				user: user
			});
		} else {
			// Fetch all users
			const query = `
				SELECT TOP (1000) 
					[username],
					[password],
					[email],
					[created_at],
					[updated_at],
					[department],
					[full_name],
					[region],
					[address],
					[contact_no],
					[access_level],
					[access_granted_at],
					[access_add],
					[access_edit],
					[access_delete],
					[access_reports],
					[UserLoginLogs],
					[Tracking_Section],
					[Training_Section]
				FROM [_rifiiorg_db].[dbo].[tbl_user_access]
				ORDER BY [full_name], [username]
			`;

			const result = await pool.request().query(query);
			const users = result.recordset || [];
			
			return NextResponse.json({
				success: true,
				users: users
			});
		}
	} catch (error) {
		console.error("Error fetching users for settings:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch users",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
