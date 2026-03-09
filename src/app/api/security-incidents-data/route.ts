import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");
		const monthYear = searchParams.get("monthYear");
		const district = searchParams.get("district");
		const qprQtrNo = searchParams.get("qprQtrNo");
		const qtrNo = searchParams.get("qtrNo");
		const search = searchParams.get("search");

		const pool = await getDb();

		if (id) {
			const result = await pool
				.request()
				.input("id", parseInt(id))
				.query(
					`SELECT [id],[QTR_No],[QPR_QTR_No],[Month_Year],[District],
					[Militants_Killed],[Militants_Injured],[Militants_Arrested],
					[LEA_Killed],[LEA_Injured],[Civilians_Killed],[Civilians_Injured],
					[IEDs],[Target_Killings],[Abductions],[Fire_Raid],[Extortions],
					[username],
					CONVERT(VARCHAR(19), [update_date], 120) AS [update_date]
					FROM [_rifiiorg_db].[rifiiorg].[security_incidents_summary]
					WHERE [id] = @id`
				);

			return NextResponse.json({
				success: true,
				incident: result.recordset?.[0] || null,
			});
		}

		let whereClause = "WHERE 1=1";
		const request_obj = pool.request();

		if (monthYear) {
			whereClause += " AND [Month_Year] = @monthYear";
			request_obj.input("monthYear", monthYear);
		}
		if (district) {
			whereClause += " AND [District] = @district";
			request_obj.input("district", district);
		}
		if (qprQtrNo) {
			whereClause += " AND [QPR_QTR_No] = @qprQtrNo";
			request_obj.input("qprQtrNo", qprQtrNo);
		}
		if (qtrNo) {
			whereClause += " AND [QTR_No] = @qtrNo";
			request_obj.input("qtrNo", qtrNo);
		}
		if (search) {
			whereClause += " AND ([username] LIKE @search OR [District] LIKE @search)";
			request_obj.input("search", `%${search}%`);
		}

		const countResult = await pool
			.request()
			.input("monthYear_c", monthYear || null)
			.input("district_c", district || null)
			.input("qprQtrNo_c", qprQtrNo || null)
			.input("qtrNo_c", qtrNo || null)
			.input("search_c", search ? `%${search}%` : null)
			.query(
				`SELECT COUNT(*) AS totalCount
				FROM [_rifiiorg_db].[rifiiorg].[security_incidents_summary]
				WHERE 1=1
				${monthYear ? "AND [Month_Year] = @monthYear_c" : ""}
				${district ? "AND [District] = @district_c" : ""}
				${qprQtrNo ? "AND [QPR_QTR_No] = @qprQtrNo_c" : ""}
				${qtrNo ? "AND [QTR_No] = @qtrNo_c" : ""}
				${search ? "AND ([username] LIKE @search_c OR [District] LIKE @search_c)" : ""}`
			);

		const totalCount = countResult.recordset?.[0]?.totalCount || 0;

		const dataQuery = `
			SELECT [id],[QTR_No],[QPR_QTR_No],[Month_Year],[District],
			[Militants_Killed],[Militants_Injured],[Militants_Arrested],
			[LEA_Killed],[LEA_Injured],[Civilians_Killed],[Civilians_Injured],
			[IEDs],[Target_Killings],[Abductions],[Fire_Raid],[Extortions],
			[username],
			CONVERT(VARCHAR(19), [update_date], 120) AS [update_date]
			FROM [_rifiiorg_db].[rifiiorg].[security_incidents_summary]
			${whereClause}
			ORDER BY [update_date] DESC, [id] DESC
		`;

		const result = await request_obj.query(dataQuery);

		const distinctMonths = await pool
			.request()
			.query(
				`SELECT DISTINCT [Month_Year] FROM [_rifiiorg_db].[rifiiorg].[security_incidents_summary] WHERE [Month_Year] IS NOT NULL ORDER BY [Month_Year]`
			);
		const distinctDistricts = await pool
			.request()
			.query(
				`SELECT DISTINCT [District] FROM [_rifiiorg_db].[rifiiorg].[security_incidents_summary] WHERE [District] IS NOT NULL ORDER BY [District]`
			);
		const distinctQprQtrs = await pool
			.request()
			.query(
				`SELECT DISTINCT [QPR_QTR_No] FROM [_rifiiorg_db].[rifiiorg].[security_incidents_summary] WHERE [QPR_QTR_No] IS NOT NULL AND [QPR_QTR_No] <> '' ORDER BY [QPR_QTR_No]`
			);
		const distinctQtrs = await pool
			.request()
			.query(
				`SELECT DISTINCT [QTR_No] FROM [_rifiiorg_db].[rifiiorg].[security_incidents_summary] WHERE [QTR_No] IS NOT NULL ORDER BY [QTR_No]`
			);

		return NextResponse.json({
			success: true,
			rows: result.recordset || [],
			totalCount,
			filterOptions: {
				months: distinctMonths.recordset.map((r: any) => r.Month_Year),
				districts: distinctDistricts.recordset.map((r: any) => r.District),
				qprQtrNos: distinctQprQtrs.recordset.map((r: any) => r.QPR_QTR_No),
				quarters: distinctQtrs.recordset.map((r: any) => r.QTR_No),
			},
		});
	} catch (error: any) {
		console.error("Error fetching security incidents summary:", error);

		if (
			error.message?.includes("Invalid object name") ||
			error.message?.includes("does not exist")
		) {
			return NextResponse.json({
				success: true,
				rows: [],
				totalCount: 0,
				filterOptions: { months: [], districts: [], qprQtrNos: [], quarters: [] },
				message: "Table not found. Please create it first.",
			});
		}

		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to fetch security incidents summary",
				rows: [],
				totalCount: 0,
			},
			{ status: 500 }
		);
	}
}
