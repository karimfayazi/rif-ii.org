import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
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
				message: "Access denied. Only users with Setting access can add users" 
			}, { status: 403 });
		}

		const data = await request.json();
		const pool = await getDb();

		// Check if username already exists
		const checkQuery = `
			SELECT [username] 
			FROM [_rifiiorg_db].[dbo].[tbl_user_access] 
			WHERE [username] = @username
		`;
		const checkResult = await pool.request()
			.input("username", data.username)
			.query(checkQuery);

		if (checkResult.recordset.length > 0) {
			return NextResponse.json({
				success: false,
				message: "Username already exists"
			}, { status: 400 });
		}

		const query = `
			INSERT INTO [_rifiiorg_db].[dbo].[tbl_user_access] 
			([username], [password], [email], [department], [full_name], [region], [address], 
			 [contact_no], [access_level], [access_add], [access_edit], [access_delete], 
			 [access_reports], [UserLoginLogs], [Tracking_Section], [Training_Section], 
			 [created_at], [updated_at], [access_granted_at])
			VALUES 
			(@username, @password, @email, @department, @full_name, @region, @address, 
			 @contact_no, @access_level, @access_add, @access_edit, @access_delete, 
			 @access_reports, @UserLoginLogs, @Tracking_Section, @Training_Section, 
			 GETDATE(), GETDATE(), GETDATE())
		`;

		await pool.request()
			.input("username", data.username || null)
			.input("password", data.password || null)
			.input("email", data.email || null)
			.input("department", data.department || null)
			.input("full_name", data.full_name || null)
			.input("region", data.region || null)
			.input("address", data.address || null)
			.input("contact_no", data.contact_no || null)
			.input("access_level", data.access_level || "User")
			.input("access_add", data.access_add ? 1 : 0)
			.input("access_edit", data.access_edit ? 1 : 0)
			.input("access_delete", data.access_delete ? 1 : 0)
			.input("access_reports", data.access_reports ? 1 : 0)
			.input("UserLoginLogs", data.UserLoginLogs ? 1 : 0)
			.input("Tracking_Section", data.Tracking_Section ? 1 : 0)
			.input("Training_Section", data.Training_Section ? 1 : 0)
			.query(query);

		return NextResponse.json({
			success: true,
			message: "User added successfully"
		});

	} catch (error) {
		console.error("Error adding user:", error);
		return NextResponse.json({
			success: false,
			message: "Failed to add user",
			error: error instanceof Error ? error.message : "Unknown error"
		}, { status: 500 });
	}
}

export async function PUT(request: NextRequest) {
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
				message: "Access denied. Only users with Setting access can update users" 
			}, { status: 403 });
		}

		const data = await request.json();
		
		if (!data.id && !data.username) {
			return NextResponse.json({ 
				success: false, 
				message: "User ID or username is required" 
			}, { status: 400 });
		}

		const pool = await getDb();

		// Build update query dynamically based on provided fields
		const updateFields: string[] = [];
		const request_obj = pool.request();

		if (data.password) {
			updateFields.push("[password] = @password");
			request_obj.input("password", data.password);
		}
		if (data.email !== undefined) {
			updateFields.push("[email] = @email");
			request_obj.input("email", data.email);
		}
		if (data.department !== undefined) {
			updateFields.push("[department] = @department");
			request_obj.input("department", data.department);
		}
		if (data.full_name !== undefined) {
			updateFields.push("[full_name] = @full_name");
			request_obj.input("full_name", data.full_name);
		}
		if (data.region !== undefined) {
			updateFields.push("[region] = @region");
			request_obj.input("region", data.region);
		}
		if (data.address !== undefined) {
			updateFields.push("[address] = @address");
			request_obj.input("address", data.address);
		}
		if (data.contact_no !== undefined) {
			updateFields.push("[contact_no] = @contact_no");
			request_obj.input("contact_no", data.contact_no);
		}
		if (data.access_level !== undefined) {
			updateFields.push("[access_level] = @access_level");
			request_obj.input("access_level", data.access_level);
		}
		if (data.access_add !== undefined) {
			updateFields.push("[access_add] = @access_add");
			request_obj.input("access_add", data.access_add ? 1 : 0);
		}
		if (data.access_edit !== undefined) {
			updateFields.push("[access_edit] = @access_edit");
			request_obj.input("access_edit", data.access_edit ? 1 : 0);
		}
		if (data.access_delete !== undefined) {
			updateFields.push("[access_delete] = @access_delete");
			request_obj.input("access_delete", data.access_delete ? 1 : 0);
		}
		if (data.access_reports !== undefined) {
			updateFields.push("[access_reports] = @access_reports");
			request_obj.input("access_reports", data.access_reports ? 1 : 0);
		}
		if (data.UserLoginLogs !== undefined) {
			updateFields.push("[UserLoginLogs] = @UserLoginLogs");
			request_obj.input("UserLoginLogs", data.UserLoginLogs ? 1 : 0);
		}
		if (data.Tracking_Section !== undefined) {
			updateFields.push("[Tracking_Section] = @Tracking_Section");
			request_obj.input("Tracking_Section", data.Tracking_Section ? 1 : 0);
		}
		if (data.Training_Section !== undefined) {
			updateFields.push("[Training_Section] = @Training_Section");
			request_obj.input("Training_Section", data.Training_Section ? 1 : 0);
		}

		updateFields.push("[updated_at] = GETDATE()");

		if (updateFields.length === 1) { // Only updated_at
			return NextResponse.json({
				success: false,
				message: "No fields to update"
			}, { status: 400 });
		}

		const whereClause = `WHERE [username] = @username`;
		
		// Use id (username) or username field
		const usernameValue = data.id || data.username;
		if (!usernameValue) {
			return NextResponse.json({
				success: false,
				message: "Username is required for update"
			}, { status: 400 });
		}
		request_obj.input("username", usernameValue);

		const query = `
			UPDATE [_rifiiorg_db].[dbo].[tbl_user_access] 
			SET ${updateFields.join(", ")}
			${whereClause}
		`;

		const result = await request_obj.query(query);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json({
				success: false,
				message: "User not found"
			}, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			message: "User updated successfully"
		});

	} catch (error) {
		console.error("Error updating user:", error);
		return NextResponse.json({
			success: false,
			message: "Failed to update user",
			error: error instanceof Error ? error.message : "Unknown error"
		}, { status: 500 });
	}
}

