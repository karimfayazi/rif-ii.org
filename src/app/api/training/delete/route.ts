import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export async function DELETE(request: NextRequest) {
	try {
		const userId = getUserIdFromRequest(request);
		if (!userId) {
			return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
		}

		const data = await request.json();
		
		if (!data.id) {
			return NextResponse.json({ 
				success: false, 
				message: "Missing required field: ID is required" 
			}, { status: 400 });
		}

		const pool = await getDb();

		const query = `DELETE FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents] WHERE [SN] = @SN`;

		const result = await pool.request()
			.input("SN", parseInt(data.id))
			.query(query);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json({
				success: false,
				message: "No training event found to delete"
			}, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			message: "Training event deleted successfully"
		});

	} catch (error) {
		console.error("Error deleting training event:", error);
		return NextResponse.json({
			success: false,
			message: "Failed to delete training event",
			error: error instanceof Error ? error.message : "Unknown error"
		}, { status: 500 });
	}
}
