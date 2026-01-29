import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
	try {
		const pool = await getDb();

		// Get distinct values for all filters
		const [districtResult, tehsilResult, sectorResult, eventTypeResult, facilitatorResult] = await Promise.all([
			pool.request().query(`
				SELECT DISTINCT [District] AS value
				FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
				WHERE [District] IS NOT NULL AND [District] != ''
				ORDER BY [District]
			`),
			pool.request().query(`
				SELECT DISTINCT [LocationTehsil] AS value
				FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
				WHERE [LocationTehsil] IS NOT NULL AND [LocationTehsil] != ''
				ORDER BY [LocationTehsil]
			`),
			pool.request().query(`
				SELECT DISTINCT [Sector] AS value
				FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
				WHERE [Sector] IS NOT NULL AND [Sector] != ''
				ORDER BY [Sector]
			`),
			pool.request().query(`
				SELECT DISTINCT [EventType] AS value
				FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
				WHERE [EventType] IS NOT NULL AND [EventType] != ''
				ORDER BY [EventType]
			`),
			pool.request().query(`
				SELECT DISTINCT [TrainingFacilitatorName] AS value
				FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
				WHERE [TrainingFacilitatorName] IS NOT NULL AND [TrainingFacilitatorName] != ''
				ORDER BY [TrainingFacilitatorName]
			`)
		]);

		return NextResponse.json({
			success: true,
			filters: {
				districts: districtResult.recordset.map(r => r.value),
				tehsils: tehsilResult.recordset.map(r => r.value),
				sectors: sectorResult.recordset.map(r => r.value),
				eventTypes: eventTypeResult.recordset.map(r => r.value),
				facilitators: facilitatorResult.recordset.map(r => r.value)
			}
		});

	} catch (error) {
		console.error("Error fetching filter options:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch filter options",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
