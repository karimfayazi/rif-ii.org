import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import sql from "mssql";

export async function GET(request: NextRequest) {
	try {
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

		// Build WHERE clause with parameterized queries
		const conditions: string[] = [];
		if (fromDate) conditions.push(`[StartDate] >= @fromDate`);
		if (toDate) conditions.push(`[EndDate] <= @toDate`);
		if (district) conditions.push(`[District] = @district`);
		if (tehsil) conditions.push(`[LocationTehsil] = @tehsil`);
		if (sector) conditions.push(`[Sector] = @sector`);
		if (eventType) conditions.push(`[EventType] = @eventType`);
		if (facilitator) conditions.push(`[TrainingFacilitatorName] = @facilitator`);
		
		const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

		// Query for events list
		const query = `
			SELECT 
				[SN],
				[TrainingEventCode],
				[TrainingTitle],
				[District],
				[LocationTehsil],
				[Sector],
				[EventType],
				[StartDate],
				[EndDate],
				[TotalDays],
				[TotalParticipants],
				[TotalMale],
				[TotalFemale],
				[TrainingFacilitatorName],
				[PreTrainingEvaluation],
				[PostTrainingEvaluation],
				[ActivityCompletionReportLink],
				[ParticipantListAttachment],
				[PictureAttachment],
				[Venue],
				[Output],
				[SubActivityName]
			FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
			${whereClause}
			ORDER BY [StartDate] DESC
		`;

		const req = pool.request();
		if (fromDate) req.input('fromDate', sql.VarChar, fromDate);
		if (toDate) req.input('toDate', sql.VarChar, toDate);
		if (district) req.input('district', sql.NVarChar, district);
		if (tehsil) req.input('tehsil', sql.NVarChar, tehsil);
		if (sector) req.input('sector', sql.NVarChar, sector);
		if (eventType) req.input('eventType', sql.NVarChar, eventType);
		if (facilitator) req.input('facilitator', sql.NVarChar, facilitator);

		const result = await req.query(query);

		return NextResponse.json({
			success: true,
			events: result.recordset || []
		});

	} catch (error) {
		console.error("Error fetching training events:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch training events",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
