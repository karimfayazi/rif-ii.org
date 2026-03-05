import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function DELETE(request: NextRequest) {
	try {
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
