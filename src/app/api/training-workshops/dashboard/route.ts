import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import sql from "mssql";

interface KPIData {
	totalEvents: number;
	totalParticipants: number;
	totalMale: number;
	totalFemale: number;
	avgParticipantsPerEvent: number;
	avgDuration: number;
	avgPreEvaluation: number;
	avgPostEvaluation: number;
	eventsWithCompletionReport: number;
	eventsWithParticipantList: number;
	eventsWithPictures: number;
	registeredParticipants: number;
	evaluationImprovement: number;
}

interface ChartData {
	eventsOverTime: Array<{ month: string; eventCount: number }>;
	participantsOverTime: Array<{ month: string; participantCount: number }>;
	districtParticipants: Array<{ district: string; participantCount: number }>;
	tehsilParticipants: Array<{ tehsil: string; participantCount: number }>;
	sectorData: Array<{ sector: string; eventCount: number; participantCount: number }>;
	eventTypeDistribution: Array<{ eventType: string; eventCount: number }>;
	orgParticipation: Array<{ organization: string; participantCount: number }>;
	trainingUnitDistribution: Array<{ trainingUnit: string; participantCount: number }>;
	genderDistribution: Array<{ gender: string; participantCount: number }>;
}

export async function GET(request: NextRequest) {
	const startTime = Date.now();
	
	try {
		if (process.env.NODE_ENV !== 'production') {
			console.log("=== Dashboard API Called ===");
		}
		
		const pool = await getDb();
		const searchParams = request.nextUrl.searchParams;
		
		// Extract filter parameters
		const fromDate = searchParams.get('fromDate') || null;
		const toDate = searchParams.get('toDate') || null;
		const district = searchParams.get('district') || null;
		const tehsil = searchParams.get('tehsil') || null;
		const sector = searchParams.get('sector') || null;
		const eventType = searchParams.get('eventType') || null;
		const facilitator = searchParams.get('facilitator') || null;

		if (process.env.NODE_ENV !== 'production') {
			console.log("Filters:", { fromDate, toDate, district, tehsil, sector, eventType, facilitator });
		}

		// Build WHERE conditions for TrainingEvents (has real DATE columns)
		const buildEventsWhere = () => {
			const conditions: string[] = ['1=1'];
			if (fromDate) conditions.push('StartDate >= @fromDate');
			if (toDate) conditions.push('StartDate <= @toDate');
			if (district) conditions.push('District = @district');
			if (tehsil) conditions.push('LocationTehsil = @tehsil');
			if (eventType) conditions.push('EventType = @eventType');
			if (sector) conditions.push('Sector = @sector');
			if (facilitator) conditions.push('TrainingFacilitatorName = @facilitator');
			return conditions.join(' AND ');
		};

		// Build WHERE conditions for TrainingEvents with table alias (for JOIN queries)
		const buildEventsWhereWithAlias = (alias: string = 'e') => {
			const conditions: string[] = ['1=1'];
			if (fromDate) conditions.push(`${alias}.StartDate >= @fromDate`);
			if (toDate) conditions.push(`${alias}.StartDate <= @toDate`);
			if (district) conditions.push(`${alias}.District = @district`);
			if (tehsil) conditions.push(`${alias}.LocationTehsil = @tehsil`);
			if (eventType) conditions.push(`${alias}.EventType = @eventType`);
			if (sector) conditions.push(`${alias}.Sector = @sector`);
			if (facilitator) conditions.push(`${alias}.TrainingFacilitatorName = @facilitator`);
			return conditions.join(' AND ');
		};

		// Build WHERE conditions for workshop_participants (has NVARCHAR date columns - need safe parsing)
		const buildParticipantsWhere = () => {
			const conditions: string[] = ['1=1'];
			// Use TRY_CONVERT for safe date parsing from nvarchar
			if (fromDate) conditions.push('COALESCE(TRY_CONVERT(date, start_date, 23), TRY_CONVERT(date, start_date)) >= @fromDate');
			if (toDate) conditions.push('COALESCE(TRY_CONVERT(date, start_date, 23), TRY_CONVERT(date, start_date)) <= @toDate');
			if (district) conditions.push('district = @district');
			if (tehsil) conditions.push('tehsil = @tehsil');
			return conditions.join(' AND ');
		};

		// Helper to add input parameters
		const addInputs = (req: sql.Request) => {
			if (fromDate) req.input('fromDate', sql.Date, fromDate);
			if (toDate) req.input('toDate', sql.Date, toDate);
			if (district) req.input('district', sql.NVarChar, district);
			if (tehsil) req.input('tehsil', sql.NVarChar, tehsil);
			if (sector) req.input('sector', sql.NVarChar, sector);
			if (eventType) req.input('eventType', sql.NVarChar, eventType);
			if (facilitator) req.input('facilitator', sql.NVarChar, facilitator);
			return req;
		};

		const eventsWhere = buildEventsWhere();
		const eventsWhereAliased = buildEventsWhereWithAlias('e');
		const participantsWhere = buildParticipantsWhere();

		// 1. KPI Cards Data from TrainingEvents
		// Note: PreTrainingEvaluation and PostTrainingEvaluation are nvarchar(500) - use ISNUMERIC
		const kpiQuery = `
			SELECT 
				COUNT(*) AS totalEvents,
				ISNULL(SUM(CASE WHEN ISNUMERIC([TotalParticipants]) = 1 THEN CAST([TotalParticipants] AS INT) ELSE 0 END), 0) AS totalParticipants,
				ISNULL(SUM(CASE WHEN ISNUMERIC([TotalMale]) = 1 THEN CAST([TotalMale] AS INT) ELSE 0 END), 0) AS totalMale,
				ISNULL(SUM(CASE WHEN ISNUMERIC([TotalFemale]) = 1 THEN CAST([TotalFemale] AS INT) ELSE 0 END), 0) AS totalFemale,
				ISNULL(
					AVG(CASE WHEN ISNUMERIC([TotalParticipants]) = 1 THEN CAST([TotalParticipants] AS FLOAT) ELSE NULL END),
					0
				) AS avgParticipantsPerEvent,
				ISNULL(
					AVG(CASE WHEN ISNUMERIC([TotalDays]) = 1 THEN CAST([TotalDays] AS FLOAT) ELSE NULL END),
					0
				) AS avgDuration,
				ISNULL(
					AVG(CASE WHEN ISNUMERIC([PreTrainingEvaluation]) = 1 THEN CAST([PreTrainingEvaluation] AS FLOAT) ELSE NULL END),
					0
				) AS avgPreEvaluation,
				ISNULL(
					AVG(CASE WHEN ISNUMERIC([PostTrainingEvaluation]) = 1 THEN CAST([PostTrainingEvaluation] AS FLOAT) ELSE NULL END),
					0
				) AS avgPostEvaluation,
				SUM(CASE WHEN [ActivityCompletionReportLink] IS NOT NULL AND [ActivityCompletionReportLink] != '' THEN 1 ELSE 0 END) AS eventsWithCompletionReport,
				SUM(CASE WHEN [ParticipantListAttachment] IS NOT NULL AND [ParticipantListAttachment] != '' THEN 1 ELSE 0 END) AS eventsWithParticipantList,
				SUM(CASE WHEN [PictureAttachment] IS NOT NULL AND [PictureAttachment] != '' THEN 1 ELSE 0 END) AS eventsWithPictures
			FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
			WHERE ${eventsWhere}
		`;

		// 2. Events over time (by month) from TrainingEvents
		const eventsOverTimeQuery = `
			SELECT 
				FORMAT([StartDate], 'yyyy-MM') AS month,
				COUNT(*) AS eventCount
			FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
			WHERE [StartDate] IS NOT NULL AND ${eventsWhere}
			GROUP BY FORMAT([StartDate], 'yyyy-MM')
			ORDER BY month
		`;

		// 3. Participants over time (by month) from TrainingEvents
		const participantsOverTimeQuery = `
			SELECT 
				FORMAT([StartDate], 'yyyy-MM') AS month,
				ISNULL(
					SUM(CASE WHEN ISNUMERIC([TotalParticipants]) = 1 THEN CAST([TotalParticipants] AS INT) ELSE 0 END),
					0
				) AS participantCount
			FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
			WHERE [StartDate] IS NOT NULL AND ${eventsWhere}
			GROUP BY FORMAT([StartDate], 'yyyy-MM')
			ORDER BY month
		`;

		// 4. District-wise participants from TrainingEvents (top 10 + Others)
		const districtParticipantsQuery = `
			WITH RankedDistricts AS (
				SELECT 
					ISNULL([District], 'Unknown') AS district,
					ISNULL(
						SUM(CASE WHEN ISNUMERIC([TotalParticipants]) = 1 THEN CAST([TotalParticipants] AS INT) ELSE 0 END),
						0
					) AS participantCount,
					ROW_NUMBER() OVER (
						ORDER BY ISNULL(
							SUM(CASE WHEN ISNUMERIC([TotalParticipants]) = 1 THEN CAST([TotalParticipants] AS INT) ELSE 0 END),
							0
						) DESC
					) AS rn
				FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
				WHERE ${eventsWhere}
				GROUP BY [District]
			)
			SELECT 
				CASE WHEN rn <= 10 THEN district ELSE 'Others' END AS district,
				SUM(participantCount) AS participantCount
			FROM RankedDistricts
			GROUP BY CASE WHEN rn <= 10 THEN district ELSE 'Others' END
			ORDER BY participantCount DESC
		`;

		// 5. Tehsil-wise participants from TrainingEvents (top 10 + Others)
		const tehsilParticipantsQuery = `
			WITH RankedTehsils AS (
				SELECT 
					ISNULL([LocationTehsil], 'Unknown') AS tehsil,
					ISNULL(
						SUM(CASE WHEN ISNUMERIC([TotalParticipants]) = 1 THEN CAST([TotalParticipants] AS INT) ELSE 0 END),
						0
					) AS participantCount,
					ROW_NUMBER() OVER (
						ORDER BY ISNULL(
							SUM(CASE WHEN ISNUMERIC([TotalParticipants]) = 1 THEN CAST([TotalParticipants] AS INT) ELSE 0 END),
							0
						) DESC
					) AS rn
				FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
				WHERE ${eventsWhere}
				GROUP BY [LocationTehsil]
			)
			SELECT 
				CASE WHEN rn <= 10 THEN tehsil ELSE 'Others' END AS tehsil,
				SUM(participantCount) AS participantCount
			FROM RankedTehsils
			GROUP BY CASE WHEN rn <= 10 THEN tehsil ELSE 'Others' END
			ORDER BY participantCount DESC
		`;

		// 6. Sector-wise data from TrainingEvents
		const sectorDataQuery = `
			SELECT 
				ISNULL([Sector], 'Unknown') AS sector,
				COUNT(*) AS eventCount,
				ISNULL(
					SUM(CASE WHEN ISNUMERIC([TotalParticipants]) = 1 THEN CAST([TotalParticipants] AS INT) ELSE 0 END),
					0
				) AS participantCount
			FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
			WHERE ${eventsWhere}
			GROUP BY [Sector]
			ORDER BY participantCount DESC
		`;

		// 7. Event Type distribution from TrainingEvents
		const eventTypeQuery = `
			SELECT 
				ISNULL([EventType], 'Unknown') AS eventType,
				COUNT(*) AS eventCount
			FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
			WHERE ${eventsWhere}
			GROUP BY [EventType]
			ORDER BY eventCount DESC
		`;

		// 8. Organization/Department participation from workshop_participants
		// SAFE: Join with TrainingEvents using WHERE clause, parse dates safely
		const orgParticipationQuery = `
			WITH RankedOrgs AS (
				SELECT 
					ISNULL(p.[organization_department], 'Unknown') AS organization,
					COUNT(*) AS participantCount,
					ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS rn
				FROM [_rifiiorg_db].[dbo].[workshop_participants] p
				${fromDate || toDate || district || tehsil || sector || eventType || facilitator ? `
				INNER JOIN [_rifiiorg_db].[rifiiorg].[TrainingEvents] e 
					ON p.[TrainingEventCode] = e.[TrainingEventCode]
				WHERE ${eventsWhereAliased}
				` : 'WHERE 1=1'}
				GROUP BY p.[organization_department]
			)
			SELECT 
				CASE WHEN rn <= 10 THEN organization ELSE 'Others' END AS organization,
				SUM(participantCount) AS participantCount
			FROM RankedOrgs
			GROUP BY CASE WHEN rn <= 10 THEN organization ELSE 'Others' END
			ORDER BY participantCount DESC
		`;

		// 9. Training Unit participation from workshop_participants
		// Note: Training_Unit is float, handle NULLs
		const trainingUnitQuery = `
			SELECT 
				CASE 
					WHEN p.[Training_Unit] IS NULL THEN 'Unknown'
					ELSE CAST(p.[Training_Unit] AS NVARCHAR(50))
				END AS trainingUnit,
				COUNT(*) AS participantCount
			FROM [_rifiiorg_db].[dbo].[workshop_participants] p
			${fromDate || toDate || district || tehsil || sector || eventType || facilitator ? `
			INNER JOIN [_rifiiorg_db].[rifiiorg].[TrainingEvents] e 
				ON p.[TrainingEventCode] = e.[TrainingEventCode]
			WHERE ${eventsWhereAliased}
			` : 'WHERE 1=1'}
			GROUP BY p.[Training_Unit]
			ORDER BY participantCount DESC
		`;

		// 10. Gender distribution from workshop_participants
		const genderDistributionQuery = `
			SELECT 
				ISNULL(LOWER(LTRIM(RTRIM(p.[gender]))), 'unknown') AS gender,
				COUNT(*) AS participantCount
			FROM [_rifiiorg_db].[dbo].[workshop_participants] p
			${fromDate || toDate || district || tehsil || sector || eventType || facilitator ? `
			INNER JOIN [_rifiiorg_db].[rifiiorg].[TrainingEvents] e 
				ON p.[TrainingEventCode] = e.[TrainingEventCode]
			WHERE ${eventsWhereAliased}
			` : 'WHERE 1=1'}
			GROUP BY LOWER(LTRIM(RTRIM(p.[gender])))
		`;

		// 11. Registered participants count from workshop_participants
		const registeredParticipantsQuery = `
			SELECT COUNT(*) AS registeredParticipants
			FROM [_rifiiorg_db].[dbo].[workshop_participants] p
			${fromDate || toDate || district || tehsil || sector || eventType || facilitator ? `
			INNER JOIN [_rifiiorg_db].[rifiiorg].[TrainingEvents] e 
				ON p.[TrainingEventCode] = e.[TrainingEventCode]
			WHERE ${eventsWhereAliased}
			` : 'WHERE 1=1'}
		`;

		// Execute all queries in parallel with proper parameterization
		const [
			kpiResult,
			eventsOverTimeResult,
			participantsOverTimeResult,
			districtParticipantsResult,
			tehsilParticipantsResult,
			sectorDataResult,
			eventTypeResult,
			orgParticipationResult,
			trainingUnitResult,
			genderDistributionResult,
			registeredResult
		] = await Promise.all([
			addInputs(pool.request()).query(kpiQuery),
			addInputs(pool.request()).query(eventsOverTimeQuery),
			addInputs(pool.request()).query(participantsOverTimeQuery),
			addInputs(pool.request()).query(districtParticipantsQuery),
			addInputs(pool.request()).query(tehsilParticipantsQuery),
			addInputs(pool.request()).query(sectorDataQuery),
			addInputs(pool.request()).query(eventTypeQuery),
			addInputs(pool.request()).query(orgParticipationQuery),
			addInputs(pool.request()).query(trainingUnitQuery),
			addInputs(pool.request()).query(genderDistributionQuery),
			addInputs(pool.request()).query(registeredParticipantsQuery)
		]);

		const kpis = kpiResult.recordset[0] || {};
		const registeredParticipants = registeredResult.recordset[0]?.registeredParticipants || 0;

		const executionTime = Date.now() - startTime;

		if (process.env.NODE_ENV !== 'production') {
			console.log("✅ All queries completed in", executionTime, "ms");
		}

		// Build response with proper typing and safe defaults
		const kpisData: KPIData = {
			totalEvents: Number(kpis.totalEvents) || 0,
			totalParticipants: Number(kpis.totalParticipants) || 0,
			totalMale: Number(kpis.totalMale) || 0,
			totalFemale: Number(kpis.totalFemale) || 0,
			avgParticipantsPerEvent: Number(kpis.avgParticipantsPerEvent) || 0,
			avgDuration: Number(kpis.avgDuration) || 0,
			avgPreEvaluation: Number(kpis.avgPreEvaluation) || 0,
			avgPostEvaluation: Number(kpis.avgPostEvaluation) || 0,
			eventsWithCompletionReport: Number(kpis.eventsWithCompletionReport) || 0,
			eventsWithParticipantList: Number(kpis.eventsWithParticipantList) || 0,
			eventsWithPictures: Number(kpis.eventsWithPictures) || 0,
			registeredParticipants: Number(registeredParticipants) || 0,
			evaluationImprovement: Number(kpis.avgPostEvaluation || 0) - Number(kpis.avgPreEvaluation || 0)
		};

		const chartsData: ChartData = {
			eventsOverTime: (eventsOverTimeResult.recordset || []).map(row => ({
				month: row.month || '',
				eventCount: Number(row.eventCount) || 0
			})),
			participantsOverTime: (participantsOverTimeResult.recordset || []).map(row => ({
				month: row.month || '',
				participantCount: Number(row.participantCount) || 0
			})),
			districtParticipants: (districtParticipantsResult.recordset || []).map(row => ({
				district: row.district || 'Unknown',
				participantCount: Number(row.participantCount) || 0
			})),
			tehsilParticipants: (tehsilParticipantsResult.recordset || []).map(row => ({
				tehsil: row.tehsil || 'Unknown',
				participantCount: Number(row.participantCount) || 0
			})),
			sectorData: (sectorDataResult.recordset || []).map(row => ({
				sector: row.sector || 'Unknown',
				eventCount: Number(row.eventCount) || 0,
				participantCount: Number(row.participantCount) || 0
			})),
			eventTypeDistribution: (eventTypeResult.recordset || []).map(row => ({
				eventType: row.eventType || 'Unknown',
				eventCount: Number(row.eventCount) || 0
			})),
			orgParticipation: (orgParticipationResult.recordset || []).map(row => ({
				organization: row.organization || 'Unknown',
				participantCount: Number(row.participantCount) || 0
			})),
			trainingUnitDistribution: (trainingUnitResult.recordset || []).map(row => ({
				trainingUnit: row.trainingUnit || 'Unknown',
				participantCount: Number(row.participantCount) || 0
			})),
			genderDistribution: (genderDistributionResult.recordset || []).map(row => ({
				gender: row.gender || 'unknown',
				participantCount: Number(row.participantCount) || 0
			}))
		};

		// Return successful response with consistent shape
		return NextResponse.json({
			success: true,
			kpis: kpisData,
			charts: chartsData,
			meta: {
				filters: { fromDate, toDate, district, tehsil, sector, eventType, facilitator },
				executionTime,
				rowCounts: {
					trainingEvents: Number(kpis.totalEvents) || 0,
					workshopParticipants: Number(registeredParticipants) || 0
				}
			}
		});

	} catch (error) {
		if (process.env.NODE_ENV !== 'production') {
			console.error("=== DASHBOARD API ERROR ===");
			console.error("Error details:", error);
			if (error instanceof Error) {
				console.error("Error message:", error.message);
				console.error("Error stack:", error.stack);
			}
		}
		
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch dashboard data",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
