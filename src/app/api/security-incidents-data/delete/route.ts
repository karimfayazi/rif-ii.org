import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";
import { checkPermission } from "@/lib/access-permissions";

export async function DELETE(request: NextRequest) {
	try {
		const userId = getUserIdFromRequest(request);
		const permissionCheck = await checkPermission(userId, "access_security_incidents_data");
		if (!permissionCheck.allowed) {
			return NextResponse.json(
				{
					success: false,
					message: permissionCheck.message || "You do not have permission to delete incident records.",
				},
				{ status: 403 }
			);
		}

		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");

		if (!id) {
			return NextResponse.json(
				{ success: false, message: "ID is required" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		await pool
			.request()
			.input("id", parseInt(id))
			.query(
				`DELETE FROM [_rifiiorg_db].[rifiiorg].[security_incidents_summary] WHERE [id] = @id`
			);

		return NextResponse.json({
			success: true,
			message: "Incident summary deleted successfully",
		});
	} catch (error: any) {
		console.error("Error deleting security incident summary:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to delete incident summary",
			},
			{ status: 500 }
		);
	}
}
