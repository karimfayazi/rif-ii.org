import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";
import { checkPermission } from "@/lib/access-permissions";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
	_request: NextRequest,
	context: RouteContext
) {
	try {
		const { id } = await context.params;
		const linkId = parseInt(id, 10);
		if (isNaN(linkId)) {
			return NextResponse.json(
				{ success: false, message: "Invalid link ID" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const result = await pool
			.request()
			.input("LinkID", linkId)
			.query(
				`SELECT [LinkID], [Title], [Description], [Url]
				 FROM [_rifiiorg_db].[dbo].[ImportantLinks]
				 WHERE [LinkID] = @LinkID`
			);

		const link = result.recordset?.[0];
		if (!link) {
			return NextResponse.json(
				{ success: false, message: "Link not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({ success: true, link });
	} catch (error) {
		console.error("Error fetching link:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch link",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function PUT(
	request: NextRequest,
	context: RouteContext
) {
	try {
		const userId = getUserIdFromRequest(request);
		const permissionCheck = await checkPermission(userId, "access_links");
		if (!permissionCheck.allowed) {
			return NextResponse.json(
				{ success: false, message: permissionCheck.message || "You do not have permission to edit links." },
				{ status: 403 }
			);
		}

		const { id } = await context.params;
		const linkId = parseInt(id, 10);
		if (isNaN(linkId)) {
			return NextResponse.json(
				{ success: false, message: "Invalid link ID" },
				{ status: 400 }
			);
		}

		const body = await request.json();
		const title = typeof body.Title === "string" ? body.Title.trim() : "";
		const description = typeof body.Description === "string" ? body.Description.trim() : null;
		const url = typeof body.Url === "string" ? body.Url.trim() : "";

		if (!title) {
			return NextResponse.json(
				{ success: false, message: "Title is required" },
				{ status: 400 }
			);
		}
		if (!url) {
			return NextResponse.json(
				{ success: false, message: "Url is required" },
				{ status: 400 }
			);
		}
		const urlLower = url.toLowerCase();
		if (!urlLower.startsWith("http://") && !urlLower.startsWith("https://")) {
			return NextResponse.json(
				{ success: false, message: "Url must start with http:// or https://" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const result = await pool
			.request()
			.input("LinkID", linkId)
			.input("Title", title)
			.input("Description", description || "")
			.input("Url", url)
			.query(
				`UPDATE [_rifiiorg_db].[dbo].[ImportantLinks]
				 SET [Title] = @Title, [Description] = @Description, [Url] = @Url
				 WHERE [LinkID] = @LinkID`
			);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "Link not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "Link updated successfully",
		});
	} catch (error) {
		console.error("Error updating link:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to update link",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function DELETE(
	request: NextRequest,
	context: RouteContext
) {
	try {
		const userId = getUserIdFromRequest(request);
		const permissionCheck = await checkPermission(userId, "access_links");
		if (!permissionCheck.allowed) {
			return NextResponse.json(
				{ success: false, message: permissionCheck.message || "You do not have permission to delete links." },
				{ status: 403 }
			);
		}

		const { id } = await context.params;
		const linkId = parseInt(id, 10);
		if (isNaN(linkId)) {
			return NextResponse.json(
				{ success: false, message: "Invalid link ID" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const result = await pool
			.request()
			.input("LinkID", linkId)
			.query(
				`DELETE FROM [_rifiiorg_db].[dbo].[ImportantLinks]
				 WHERE [LinkID] = @LinkID`
			);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "Link not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "Link deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting link:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to delete link",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
