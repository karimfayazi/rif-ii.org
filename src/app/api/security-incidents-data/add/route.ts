import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const {
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

		if (!Month_Year || !District) {
			return NextResponse.json(
				{ success: false, message: "Month/Year and District are required" },
				{ status: 400 }
			);
		}

		const pool = await getDb();
		const req = pool.request();

		const query = `
			INSERT INTO [_rifiiorg_db].[rifiiorg].[security_incidents_summary]
			([QTR_No],[QPR_QTR_No],[Month_Year],[District],
			 [Militants_Killed],[Militants_Injured],[Militants_Arrested],
			 [LEA_Killed],[LEA_Injured],[Civilians_Killed],[Civilians_Injured],
			 [IEDs],[Target_Killings],[Abductions],[Fire_Raid],[Extortions],
			 [username],[update_date])
			VALUES
			(@QTR_No, @QPR_QTR_No, @Month_Year, @District,
			 @Militants_Killed, @Militants_Injured, @Militants_Arrested,
			 @LEA_Killed, @LEA_Injured, @Civilians_Killed, @Civilians_Injured,
			 @IEDs, @Target_Killings, @Abductions, @Fire_Raid, @Extortions,
			 @username, GETDATE());
			SELECT SCOPE_IDENTITY() AS id;
		`;

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

		const result = await req.query(query);
		const newId = result.recordset?.[0]?.id;

		return NextResponse.json({
			success: true,
			message: "Incident summary added successfully",
			id: newId,
		});
	} catch (error: any) {
		console.error("Error adding security incident summary:", error);
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to add incident summary",
			},
			{ status: 500 }
		);
	}
}
