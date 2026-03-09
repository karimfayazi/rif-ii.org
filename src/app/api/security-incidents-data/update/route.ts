import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";
import { checkPermission } from "@/lib/access-permissions";

export async function PUT(request: NextRequest) {
	try {
		const userId = getUserIdFromRequest(request);
		const permissionCheck = await checkPermission(userId, "access_security_incidents_data");
		if (!permissionCheck.allowed) {
			return NextResponse.json(
				{
					success: false,
					message: permissionCheck.message || "You do not have permission to edit incident records.",
				},
				{ status: 403 }
			);
		}

		const body = await request.json();
		const {
			id,
			QTR_No,
			QPR_QTR_No,
			Month_Year,
			District,
			Militants_Killed,
			Militants_Injured,
			Militants_Arrested,
			LEA_Killed,
			LEA_Injured,
			Civilians_Killed,
			Civilians_Injured,
			IEDs,
			Target_Killings,
			Abductions,
			Fire_Raid,
			Extortions,
			username,
		} = body;

		if (!id) {
			return NextResponse.json(
				{ success: false, message: "ID is required" },
				{ status: 400 }
			);
		}

		if (!Month_Year || !District) {
			return NextResponse.json(
				{ success: false, message: "Month/Year and District are required" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const req = pool.request();

		const query = `
			UPDATE [_rifiiorg_db].[rifiiorg].[security_incidents_summary]
			SET
				[QTR_No] = @QTR_No,
				[QPR_QTR_No] = @QPR_QTR_No,
				[Month_Year] = @Month_Year,
				[District] = @District,
				[Militants_Killed] = @Militants_Killed,
				[Militants_Injured] = @Militants_Injured,
				[Militants_Arrested] = @Militants_Arrested,
				[LEA_Killed] = @LEA_Killed,
				[LEA_Injured] = @LEA_Injured,
				[Civilians_Killed] = @Civilians_Killed,
				[Civilians_Injured] = @Civilians_Injured,
				[IEDs] = @IEDs,
				[Target_Killings] = @Target_Killings,
				[Abductions] = @Abductions,
				[Fire_Raid] = @Fire_Raid,
				[Extortions] = @Extortions,
				[username] = @username,
				[update_date] = GETDATE()
			WHERE [id] = @id
		`;

		req.input("id", parseInt(id));
		req.input("QTR_No", QTR_No || null);
		req.input("QPR_QTR_No", QPR_QTR_No || null);
		req.input("Month_Year", Month_Year);
		req.input("District", District);
		req.input("Militants_Killed", parseInt(Militants_Killed) || 0);
		req.input("Militants_Injured", parseInt(Militants_Injured) || 0);
		req.input("Militants_Arrested", parseInt(Militants_Arrested) || 0);
		req.input("LEA_Killed", parseInt(LEA_Killed) || 0);
		req.input("LEA_Injured", parseInt(LEA_Injured) || 0);
		req.input("Civilians_Killed", parseInt(Civilians_Killed) || 0);
		req.input("Civilians_Injured", parseInt(Civilians_Injured) || 0);
		req.input("IEDs", parseInt(IEDs) || 0);
		req.input("Target_Killings", parseInt(Target_Killings) || 0);
		req.input("Abductions", parseInt(Abductions) || 0);
		req.input("Fire_Raid", parseInt(Fire_Raid) || 0);
		req.input("Extortions", parseInt(Extortions) || 0);
		req.input("username", username || "System");

		await req.query(query);

		return NextResponse.json({
			success: true,
			message: "Incident summary updated successfully",
		});
	} catch (error: any) {
		console.error("Error updating security incident summary:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to update incident summary",
			},
			{ status: 500 }
		);
	}
}
