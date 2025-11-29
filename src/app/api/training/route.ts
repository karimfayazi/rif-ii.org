import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');
		const district = searchParams.get('district');
		const output = searchParams.get('output');
		const eventType = searchParams.get('eventType');
		const locationTehsil = searchParams.get('locationTehsil');
		const trainingFacilitator = searchParams.get('trainingFacilitator');

		const pool = await getDb();
		let query = `
			SELECT TOP (1000) 
				[SN],
				[TrainingTitle],
				[Output],
				[SubNo],
				[SubActivityName],
				[EventType],
				[Venue],
				[LocationTehsil],
				[District],
				CONVERT(VARCHAR(10), [StartDate], 105) AS [StartDate],
				CONVERT(VARCHAR(10), [EndDate], 105) AS [EndDate],
				[TotalDays],
				[TrainingFacilitatorName],
				[TMAMale],
				[TMAFemale],
				[PHEDMale],
				[PHEDFemale],
				[LGRDMale],
				[LGRDFemale],
				[PDDMale],
				[PDDFemale],
				[CommunityMale],
				[CommunityFemale],
				[AnyOtherMale],
				[AnyOtherFemale],
				[AnyOtherSpecify],
				[TotalMale],
				[TotalFemale],
				[TotalParticipants],
				[PreTrainingEvaluation],
				[PostTrainingEvaluation],
				[EventAgendas],
				[ExpectedOutcomes],
				[ChallengesFaced],
				[SuggestedActions],
				[ActivityCompletionReportLink],
				[ParticipantListAttachment],
				[PictureAttachment],
				[Remarks],
				[DataCompilerName],
				[DataVerifiedBy],
				CONVERT(VARCHAR(10), [CreatedDate], 105) AS [CreatedDate],
				CONVERT(VARCHAR(10), [LastModifiedDate], 105) AS [LastModifiedDate]
			FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
			WHERE 1=1
		`;

		const request_obj = pool.request();

		// If ID is provided, fetch single record
		if (id) {
			query += ` AND [SN] = @id`;
			request_obj.input('id', parseInt(id));
			const result = await request_obj.query(query);
			const trainingData = result.recordset?.[0] || null;
			
			return NextResponse.json({
				success: true,
				trainingData: trainingData
			});
		}

		// Add filters if provided
		if (district && district !== "All") {
			query += ` AND [District] = @district`;
			request_obj.input('district', district);
		}
		if (output) {
			query += ` AND [Output] = @output`;
			request_obj.input('output', output);
		}
		if (eventType) {
			query += ` AND [EventType] = @eventType`;
			request_obj.input('eventType', eventType);
		}
		if (locationTehsil) {
			query += ` AND [LocationTehsil] = @locationTehsil`;
			request_obj.input('locationTehsil', locationTehsil);
		}
		if (trainingFacilitator) {
			query += ` AND [TrainingFacilitatorName] = @trainingFacilitator`;
			request_obj.input('trainingFacilitator', trainingFacilitator);
		}

		query += ` ORDER BY [StartDate] DESC, [TrainingTitle]`;

		const result = await request_obj.query(query);
		const trainingData = result.recordset || [];
		
		return NextResponse.json({
			success: true,
			trainingData: trainingData
		});
	} catch (error) {
		console.error("Error fetching training events data:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch training events data",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
