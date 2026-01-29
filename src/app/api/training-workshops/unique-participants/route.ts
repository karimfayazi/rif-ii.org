import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import sql from "mssql";

export async function GET(request: NextRequest) {
	const startTime = Date.now();
	
	try {
		if (process.env.NODE_ENV !== 'production') {
			console.log("=== Unique Participants API Called ===");
		}
		
		const pool = await getDb();
		const searchParams = request.nextUrl.searchParams;
		
		// Extract optional filter parameters (for future enhancement)
		const fromDate = searchParams.get('fromDate') || null;
		const toDate = searchParams.get('toDate') || null;
		const district = searchParams.get('district') || null;
		const tehsil = searchParams.get('tehsil') || null;

		// Build WHERE conditions for filtering (optional)
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

		// Query 1: Workshop-wise Unique Participants (CNIC-based)
		// Using normalized CNIC (remove dashes and spaces for better uniqueness)
		const uniqueByWorkshopQuery = `
			SELECT 
				ISNULL(workshop_training_name, 'Unknown') AS workshop,
				COUNT(DISTINCT REPLACE(REPLACE(LTRIM(RTRIM(cnic_number)), '-', ''), ' ', '')) AS uniqueCount
			FROM [_rifiiorg_db].[dbo].[workshop_participants]
			WHERE ${whereClause}
			GROUP BY workshop_training_name
			ORDER BY uniqueCount DESC
		`;

		// Query 2: Workshop-wise Unique Participants by Gender (CNIC-based)
		const uniqueByWorkshopGenderQuery = `
			SELECT
				ISNULL(workshop_training_name, 'Unknown') AS workshop,
				COUNT(DISTINCT REPLACE(REPLACE(LTRIM(RTRIM(cnic_number)), '-', ''), ' ', '')) AS totalUnique,
				COUNT(DISTINCT CASE 
					WHEN LOWER(LTRIM(RTRIM(gender))) = 'male' 
					THEN REPLACE(REPLACE(LTRIM(RTRIM(cnic_number)), '-', ''), ' ', '') 
				END) AS uniqueMale,
				COUNT(DISTINCT CASE 
					WHEN LOWER(LTRIM(RTRIM(gender))) = 'female' 
					THEN REPLACE(REPLACE(LTRIM(RTRIM(cnic_number)), '-', ''), ' ', '') 
				END) AS uniqueFemale
			FROM [_rifiiorg_db].[dbo].[workshop_participants]
			WHERE ${whereClause}
			GROUP BY workshop_training_name
			ORDER BY totalUnique DESC
		`;

		// Execute both queries in parallel
		const [uniqueByWorkshopResult, uniqueByWorkshopGenderResult] = await Promise.all([
			addInputs(pool.request()).query(uniqueByWorkshopQuery),
			addInputs(pool.request()).query(uniqueByWorkshopGenderQuery)
		]);

		const executionTime = Date.now() - startTime;

		if (process.env.NODE_ENV !== 'production') {
			console.log("✅ Unique participants queries completed in", executionTime, "ms");
			console.log("Unique by workshop count:", uniqueByWorkshopResult.recordset?.length || 0);
			console.log("Unique by workshop gender count:", uniqueByWorkshopGenderResult.recordset?.length || 0);
		}

		// Build typed response with safe defaults
		const uniqueByWorkshop = (uniqueByWorkshopResult.recordset || []).map(row => ({
			workshop: String(row.workshop || 'Unknown'),
			unique: Number(row.uniqueCount) || 0
		}));

		const uniqueByWorkshopGender = (uniqueByWorkshopGenderResult.recordset || []).map(row => ({
			workshop: String(row.workshop || 'Unknown'),
			total: Number(row.totalUnique) || 0,
			male: Number(row.uniqueMale) || 0,
			female: Number(row.uniqueFemale) || 0
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
			console.error("=== UNIQUE PARTICIPANTS API ERROR ===");
			console.error("Error details:", error);
			if (error instanceof Error) {
				console.error("Error message:", error.message);
				console.error("Error stack:", error.stack);
			}
		}
		
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch unique participants data",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
