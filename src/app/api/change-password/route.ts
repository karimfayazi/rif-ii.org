import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getDb } from "@/lib/db";

const SPECIAL_CHARACTER_REGEX = /[^A-Za-z0-9]/g;

function countSpecialCharacters(value: string): number {
	return (value.match(SPECIAL_CHARACTER_REGEX) || []).length;
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const email = searchParams.get("email")?.trim();

		if (!email) {
			return NextResponse.json(
				{ success: false, message: "Email address is required" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const result = await pool
			.request()
			.input("email", sql.NVarChar(255), email)
			.query(
				`
					SELECT TOP (1) [email], [full_name]
					FROM [_rifiiorg_db].[dbo].[tbl_user_access]
					WHERE [email] = @email
				`
			);

		const user = result.recordset?.[0];

		if (!user) {
			return NextResponse.json(
				{ success: false, message: "Email address not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			user: {
				email: user.email,
				full_name: user.full_name || ""
			}
		});
	} catch (error) {
		console.error("Change password lookup error:", error);
		return NextResponse.json(
			{
				success: false,
				message: error instanceof Error ? error.message : "Failed to fetch user details"
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const { email, oldPassword, newPassword, confirmPassword } = await request.json();

		if (!email || !oldPassword || !newPassword || !confirmPassword) {
			return NextResponse.json(
				{ success: false, message: "All fields are required" },
				{ status: 400 }
			);
		}

		if (newPassword !== confirmPassword) {
			return NextResponse.json(
				{ success: false, message: "New password and confirm password do not match" },
				{ status: 400 }
			);
		}

		if (countSpecialCharacters(newPassword) < 1) {
			return NextResponse.json(
				{ success: false, message: "New password must contain at least 1 special character" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const lookupResult = await pool
			.request()
			.input("email", sql.NVarChar(255), String(email).trim())
			.query(
				`
					SELECT TOP (1) [password], [email], [full_name]
					FROM [_rifiiorg_db].[dbo].[tbl_user_access]
					WHERE [email] = @email
				`
			);

		const user = lookupResult.recordset?.[0];

		if (!user) {
			return NextResponse.json(
				{ success: false, message: "Email address does not exist" },
				{ status: 404 }
			);
		}

		if (String(user.password ?? "") !== String(oldPassword)) {
			return NextResponse.json(
				{ success: false, message: "Old password is incorrect" },
				{ status: 400 }
			);
		}

		await pool
			.request()
			.input("email", sql.NVarChar(255), String(email).trim())
			.input("newPassword", sql.NVarChar(255), String(newPassword))
			.query(
				`
					UPDATE [_rifiiorg_db].[dbo].[tbl_user_access]
					SET [password] = @newPassword
					WHERE [email] = @email
				`
			);

		return NextResponse.json({
			success: true,
			message: "Password updated successfully",
			full_name: user.full_name || ""
		});
	} catch (error) {
		console.error("Change password error:", error);
		return NextResponse.json(
			{
				success: false,
				message: error instanceof Error ? error.message : "Failed to update password"
			},
			{ status: 500 }
		);
	}
}
