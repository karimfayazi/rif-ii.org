import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function DELETE(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const sn = searchParams.get('sn');

		if (!sn) {
			return NextResponse.json(
				{
					success: false,
					message: "Record ID (sn) is required"
				},
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const request_obj = pool.request();

		const query = `
			DELETE FROM [_rifiiorg_db].[rifiiorg].[workshop_participants]
			WHERE [sn] = @sn
		`;

		request_obj.input('sn', parseInt(sn));
		await request_obj.query(query);

		return NextResponse.json({
			success: true,
			message: "Participant record deleted successfully"
		});
	} catch (error) {
		console.error("Error deleting workshop participant:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to delete participant record",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

