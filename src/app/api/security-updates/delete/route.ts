import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";
import { checkPermission } from "@/lib/access-permissions";

export async function DELETE(request: NextRequest) {
	try {
		const userId = getUserIdFromRequest(request);
		const permissionCheck = await checkPermission(userId, "access_security_updates");
		if (!permissionCheck.allowed) {
			return NextResponse.json(
				{
					success: false,
					message: permissionCheck.message || "You do not have permission to delete security updates.",
				},
				{ status: 403 }
			);
		}

		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');

		if (!id) {
			return NextResponse.json(
				{ success: false, message: "ID is required" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const request_obj = pool.request();

		const query = `
			DELETE FROM [_rifiiorg_db].[rifiiorg].[security_incidents]
			WHERE [id] = @id
		`;

		request_obj.input('id', parseInt(id));
		await request_obj.query(query);

		return NextResponse.json({
			success: true,
			message: "Security incident deleted successfully"
		});
	} catch (error: any) {
		console.error("Error deleting security incident:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to delete security incident"
			},
			{ status: 500 }
		);
	}
}

