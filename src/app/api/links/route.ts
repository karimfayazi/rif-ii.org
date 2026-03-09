import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getDb } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";
import { checkPermission } from "@/lib/access-permissions";

export async function GET() {
	try {
		const pool = await getDb();
		const result = await pool.request().query(
			`SELECT [LinkID], [Title], [Description], [Url]
			 FROM [_rifiiorg_db].[dbo].[ImportantLinks]
			 ORDER BY [LinkID] DESC`
		);

		const links = result.recordset || [];

		return NextResponse.json({
			success: true,
			links,
		});
	} catch (error) {
		console.error("Error fetching links:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch links",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const userId = getUserIdFromRequest(request);
		const permissionCheck = await checkPermission(userId, "access_links");
		if (!permissionCheck.allowed) {
			return NextResponse.json(
				{
					success: false,
					message: permissionCheck.message || "You do not have permission to add links.",
				},
				{ status: 403 }
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
			.input("Title", sql.NVarChar(255), title)
			.input("Description", sql.NVarChar(sql.MAX), description || null)
			.input("Url", sql.NVarChar(2048), url)
			.query(
				`
					SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

					DECLARE @NewLinkID INT;

					SELECT @NewLinkID = ISNULL(MAX([LinkID]), 0) + 1
					FROM [_rifiiorg_db].[dbo].[ImportantLinks] WITH (UPDLOCK, HOLDLOCK);

					INSERT INTO [_rifiiorg_db].[dbo].[ImportantLinks] ([LinkID], [Title], [Description], [Url])
					VALUES (@NewLinkID, @Title, @Description, @Url);

					SELECT @NewLinkID AS [LinkID];
				`
			);

		const row = result.recordset?.[0];
		const linkId = row?.LinkID;

		if (linkId == null) {
			return NextResponse.json(
				{ success: false, message: "Failed to create link" },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "Link created successfully",
			linkId: Number(linkId),
		});
	} catch (error) {
		console.error("Error creating link:", error);
		const errorMessage =
			error instanceof Error
				? error.message
				: "Unknown error";
		return NextResponse.json(
			{
				success: false,
				message:
					errorMessage.includes("LinkID")
						? "Unable to create link because the database did not generate a valid Link ID."
						: `Failed to create link: ${errorMessage}`,
				error: errorMessage,
			},
			{ status: 500 }
		);
	}
}
