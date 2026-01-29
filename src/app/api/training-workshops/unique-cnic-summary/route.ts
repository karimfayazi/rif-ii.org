import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import sql from "mssql";

export async function GET(request: NextRequest) {
	const startTime = Date.now();
	
	try {
		if (process.env.NODE_ENV !== 'production') {
			console.log("=== Unique CNIC Summary API Called ===");
		}
		
		const pool = await getDb();
		const searchParams = request.nextUrl.searchParams;
		
		// Extract optional filter parameters
		const fromDate = searchParams.get('fromDate') || null;
		const toDate = searchParams.get('toDate') || null;
		const district = searchParams.get('district') || null;
		const tehsil = searchParams.get('tehsil') || null;

		// Build WHERE conditions for filtering
		const buildWhereConditions = () => {
			const conditions: string[] = ['cnic_number IS NOT NULL', "LTRIM(RTRIM(cnic_number)) <> ''"];
			
			// Safe date parsing for nvarchar date columns
			if (fromDate) {
				conditions.push('COALESCE(TRY_CONVERT(date, start_date, 23), TRY_CONVERT(date, start_date)) >= @fromDate');
			}
			if (toDate) {
				conditions.push('COALESCE(TRY_CONVERT(date, start_date, 23), TRY_CONVERT(date, start_date)) <= @toDate');
			}
			if (district) {
				conditions.push('district = @district');
			}
			if (tehsil) {
				conditions.push('tehsil = @tehsil');
			}
			
			return conditions.join(' AND ');
		};

		// Helper to add input parameters
		const addInputs = (req: sql.Request) => {
			if (fromDate) req.input('fromDate', sql.Date, fromDate);
			if (toDate) req.input('toDate', sql.Date, toDate);
			if (district) req.input('district', sql.NVarChar, district);
			if (tehsil) req.input('tehsil', sql.NVarChar, tehsil);
			return req;
		};

		const whereClause = buildWhereConditions();

		// SQL 1: Unique participants by CNIC (workshop wise)
		const uniqueByWorkshopQuery = `
			SELECT 
				workshop_training_name,
				COUNT(DISTINCT LTRIM(RTRIM(cnic_number))) AS UniqueParticipants_ByCNIC
			FROM [_rifiiorg_db].[dbo].[workshop_participants]
			WHERE ${whereClause}
			GROUP BY workshop_training_name
			ORDER BY UniqueParticipants_ByCNIC DESC
		`;

		// SQL 2: Unique CNIC by gender (workshop wise)
		const uniqueByWorkshopGenderQuery = `
			SELECT
				workshop_training_name,
				COUNT(DISTINCT LTRIM(RTRIM(cnic_number))) AS UniqueParticipants_Total,
				COUNT(DISTINCT CASE WHEN gender = 'Male'   THEN LTRIM(RTRIM(cnic_number)) END) AS UniqueMale,
				COUNT(DISTINCT CASE WHEN gender = 'Female' THEN LTRIM(RTRIM(cnic_number)) END) AS UniqueFemale
			FROM [_rifiiorg_db].[dbo].[workshop_participants]
			WHERE ${whereClause}
			GROUP BY workshop_training_name
			ORDER BY UniqueParticipants_Total DESC
		`;

		// Execute both queries in parallel
		const [uniqueByWorkshopResult, uniqueByWorkshopGenderResult] = await Promise.all([
			addInputs(pool.request()).query(uniqueByWorkshopQuery),
			addInputs(pool.request()).query(uniqueByWorkshopGenderQuery)
		]);

		const executionTime = Date.now() - startTime;

		if (process.env.NODE_ENV !== 'production') {
			console.log("✅ Unique CNIC summary queries completed in", executionTime, "ms");
			console.log("Unique by workshop count:", uniqueByWorkshopResult.recordset?.length || 0);
			console.log("Unique by workshop gender count:", uniqueByWorkshopGenderResult.recordset?.length || 0);
		}

		// Build typed response
		const uniqueByWorkshop = (uniqueByWorkshopResult.recordset || []).map(row => ({
			workshopTrainingName: String(row.workshop_training_name || 'Unknown'),
			uniqueParticipants: Number(row.UniqueParticipants_ByCNIC) || 0
		}));

		const uniqueByWorkshopGender = (uniqueByWorkshopGenderResult.recordset || []).map(row => ({
			workshopTrainingName: String(row.workshop_training_name || 'Unknown'),
			uniqueTotal: Number(row.UniqueParticipants_Total) || 0,
			uniqueMale: Number(row.UniqueMale) || 0,
			uniqueFemale: Number(row.UniqueFemale) || 0
		}));

		return NextResponse.json({
			success: true,
			data: {
				uniqueByWorkshop,
				uniqueByWorkshopGender
			},
			meta: {
				filters: { fromDate, toDate, district, tehsil },
				executionTime,
				totalWorkshops: uniqueByWorkshop.length
			}
		});

	} catch (error) {
		if (process.env.NODE_ENV !== 'production') {
			console.error("=== UNIQUE CNIC SUMMARY API ERROR ===");
			console.error("Error details:", error);
			if (error instanceof Error) {
				console.error("Error message:", error.message);
				console.error("Error stack:", error.stack);
			}
		}
		
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch unique CNIC summary data",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
