import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getDb } from "@/lib/db";

/** Trim SQL char/nchar padding and UI whitespace for password comparison */
function normalizePassword(value: unknown): string {
	return String(value ?? "").trim();
}

const CONNECTION_ERROR_MESSAGE =
	"We are unable to connect to the system right now. Please try again in a few minutes. If the problem continues, please contact your IT support team.";

function isDatabaseConnectionError(error: unknown): boolean {
	const err = error as {
		code?: string;
		number?: number;
		originalError?: { code?: string; message?: string };
		message?: string;
	};

	const connectionCodes = new Set([
		"ETIMEOUT",
		"ECONNREFUSED",
		"ESOCKET",
		"ENOTFOUND",
		"ECONNRESET",
		"EHOSTUNREACH",
		"EPIPE",
		"ELOGIN",
	]);

	if (err?.code && connectionCodes.has(err.code)) {
		return true;
	}

	if (err?.originalError?.code && connectionCodes.has(err.originalError.code)) {
		return true;
	}

	const message = [
		error instanceof Error ? error.message : "",
		err?.message ?? "",
		err?.originalError?.message ?? "",
	]
		.join(" ")
		.toLowerCase();

	return (
		message.includes("failed to connect") ||
		message.includes("could not connect") ||
		message.includes("connection refused") ||
		message.includes("connect timeout") ||
		message.includes("connection timeout") ||
		message.includes("socket hang up") ||
		message.includes("getaddrinfo") ||
		message.includes("login timeout") ||
		message.includes("timeout expired") ||
		/:\s*1433\b/.test(message)
	);
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const emailRaw = body?.email;
		const passwordRaw = body?.password;

		const email = String(emailRaw ?? "").trim();
		const password = String(passwordRaw ?? "");

		if (!email || normalizePassword(password) === "") {
			return NextResponse.json({ success: false, message: "Missing credentials" }, { status: 400 });
		}

		const pool = await getDb();
		const result = await pool
			.request()
			.input("email", sql.NVarChar(255), email)
			.query(
				`
				SELECT TOP (1)
					[email],
					[password],
					[full_name],
					[username],
					[department],
					[region],
					[contact_no],
					[access_level],
					[Tracking_Section],
					[Training_Section]
				FROM [_rifiiorg_db].[dbo].[tbl_user_access]
				WHERE LOWER(LTRIM(RTRIM(ISNULL([email], N'')))) = LOWER(LTRIM(RTRIM(@email)))
				`
			);

		const user = result.recordset?.[0];

		if (!user) {
			return NextResponse.json(
				{ success: false, message: "Invalid email or password" },
				{ status: 401 }
			);
		}

		if (normalizePassword(user.password) !== normalizePassword(password)) {
			return NextResponse.json(
				{ success: false, message: "Invalid email or password" },
				{ status: 401 }
			);
		}

		const response = NextResponse.json({
			success: true,
			user: {
				id: user.email,
				name: user.full_name,
				username: user.username,
				department: user.department,
				region: user.region,
				contact_no: user.contact_no,
				access_level: user.access_level,
				password: user.password,
				tracking_section: user.Tracking_Section ?? true,
				training_section: user.Training_Section ?? true,
			},
			full_name: user.full_name,
		});

		response.cookies.set({
			name: "auth",
			value: `authenticated:${String(user.email ?? "")}`,
			httpOnly: false, // Allow JavaScript to read the cookie
			secure: process.env.NODE_ENV === "production", // Only secure in production
			path: "/",
			sameSite: "lax",
			maxAge: 60 * 60 * 8, // 8 hours
		});
		return response;
	} catch (error) {
		console.error("Login error:", error);

		if (isDatabaseConnectionError(error)) {
			return NextResponse.json(
				{
					success: false,
					code: "CONNECTION_ERROR",
					message: CONNECTION_ERROR_MESSAGE,
				},
				{ status: 503 }
			);
		}

		return NextResponse.json(
			{
				success: false,
				message: "Unable to sign in right now. Please try again.",
			},
			{ status: 500 }
		);
	}
}
