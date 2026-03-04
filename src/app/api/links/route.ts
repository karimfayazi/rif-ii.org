import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

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
			.input("Title", title)
			.input("Description", description || "")
			.input("Url", url)
			.query(
				`INSERT INTO [_rifiiorg_db].[dbo].[ImportantLinks] ([Title], [Description], [Url])
				 OUTPUT INSERTED.[LinkID]
				 VALUES (@Title, @Description, @Url)`
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
		return NextResponse.json(
			{
				success: false,
				message: "Failed to create link",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
