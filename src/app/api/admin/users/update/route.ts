import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { 
			username, 
			full_name, 
			email, 
			contact_no, 
			department, 
			region, 
			access_level,
			password 
		} = body;

		if (!username) {
			return NextResponse.json(
				{ success: false, message: "Username is required" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		
		// Build the update query dynamically based on provided fields
		const updates: string[] = [];
		const request = pool.request().input("username", username);

		if (full_name !== undefined) {
			updates.push("[full_name] = @full_name");
			request.input("full_name", full_name);
		}
		if (email !== undefined) {
			updates.push("[email] = @email");
			request.input("email", email);
		}
		if (contact_no !== undefined) {
			updates.push("[contact_no] = @contact_no");
			request.input("contact_no", contact_no);
		}
		if (department !== undefined) {
			updates.push("[department] = @department");
			request.input("department", department);
		}
		if (region !== undefined) {
			updates.push("[region] = @region");
			request.input("region", region);
		}
		if (access_level !== undefined) {
			updates.push("[access_level] = @access_level");
			request.input("access_level", access_level);
		}
		if (password !== undefined && password !== '') {
			updates.push("[password] = @password");
			request.input("password", password);
		}

		if (updates.length === 0) {
			return NextResponse.json(
				{ success: false, message: "No fields to update" },
				{ status: 400 }
			);
		}

		// Add updated_at timestamp
		updates.push("[updated_at] = GETDATE()");

		const query = `
			UPDATE [_rifiiorg_db].[dbo].[tbl_user_access]
			SET ${updates.join(", ")}
			WHERE [username] = @username
		`;

		const result = await request.query(query);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "User not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "User updated successfully"
		});

	} catch (error) {
		console.error("Error updating user:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to update user",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}


