import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";
import { checkPermission } from "@/lib/access-permissions";
import sql from "mssql";

export const dynamic = "force-dynamic";

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const userId = getUserIdFromRequest(request);
		const accessCheck = await checkPermission(userId, "access_news");

		if (!accessCheck.allowed) {
			return NextResponse.json(
				{
					success: false,
					message: accessCheck.message || "Access denied. Delete permission required.",
				},
				{ status: 403 }
			);
		}

		const { id } = await params;

		if (!id) {
			return NextResponse.json(
				{ success: false, message: "News ID is required" },
				{ status: 400 }
			);
		}

		const newsId = parseInt(id, 10);
		if (Number.isNaN(newsId)) {
			return NextResponse.json(
				{ success: false, message: "Invalid news ID" },
				{ status: 400 }
			);
		}

		const pool = await getDb();

		const deleteQuery = `
			DELETE FROM [_rifiiorg_db].[rifiiorg].[tblMISNews]
			WHERE [NewsID] = @newsId
		`;

		const result = await pool
			.request()
			.input("newsId", sql.Int, newsId)
			.query(deleteQuery);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json(
				{ success: false, message: "News article not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "News article deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting news:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to delete news article",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
