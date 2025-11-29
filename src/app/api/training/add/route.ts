import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
	try {
		const userId = getUserIdFromRequest(request);
		if (!userId) {
			return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
		}

		const data = await request.json();
		const pool = await getDb();

		// Calculate totals
		const totalMale = (data.tmaMale || 0) + (data.phedMale || 0) + 
			(data.lgrdMale || 0) + (data.pddMale || 0) + 
			(data.communityMale || 0) + (data.anyOtherMale || 0);
		const totalFemale = (data.tmaFemale || 0) + (data.phedFemale || 0) + 
			(data.lgrdFemale || 0) + (data.pddFemale || 0) + 
			(data.communityFemale || 0) + (data.anyOtherFemale || 0);
		const totalParticipants = totalMale + totalFemale;

		// Calculate TotalDays from StartDate and EndDate
		let totalDays = 0;
		if (data.startDate && data.endDate) {
			const start = new Date(data.startDate);
			const end = new Date(data.endDate);
			const diffTime = Math.abs(end.getTime() - start.getTime());
			totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
		}

		const query = `
			INSERT INTO [_rifiiorg_db].[rifiiorg].[TrainingEvents] 
			([TrainingTitle], [Output], [SubNo], [SubActivityName], [EventType], 
			 [Venue], [LocationTehsil], [District], [StartDate], [EndDate], [TotalDays], 
			 [TrainingFacilitatorName], [TMAMale], [TMAFemale], [PHEDMale], [PHEDFemale], 
			 [LGRDMale], [LGRDFemale], [PDDMale], [PDDFemale], [CommunityMale], [CommunityFemale], 
			 [AnyOtherMale], [AnyOtherFemale], [AnyOtherSpecify], [TotalMale], [TotalFemale], 
			 [TotalParticipants], [PreTrainingEvaluation], [PostTrainingEvaluation], 
			 [EventAgendas], [ExpectedOutcomes], [ChallengesFaced], [SuggestedActions], 
			 [ActivityCompletionReportLink], [ParticipantListAttachment], [PictureAttachment], 
			 [Remarks], [DataCompilerName], [DataVerifiedBy], [CreatedDate], [LastModifiedDate])
			VALUES 
			(@TrainingTitle, @Output, @SubNo, @SubActivityName, @EventType, 
			 @Venue, @LocationTehsil, @District, @StartDate, @EndDate, @TotalDays, 
			 @TrainingFacilitatorName, @TMAMale, @TMAFemale, @PHEDMale, @PHEDFemale, 
			 @LGRDMale, @LGRDFemale, @PDDMale, @PDDFemale, @CommunityMale, @CommunityFemale, 
			 @AnyOtherMale, @AnyOtherFemale, @AnyOtherSpecify, @TotalMale, @TotalFemale, 
			 @TotalParticipants, @PreTrainingEvaluation, @PostTrainingEvaluation, 
			 @EventAgendas, @ExpectedOutcomes, @ChallengesFaced, @SuggestedActions, 
			 @ActivityCompletionReportLink, @ParticipantListAttachment, @PictureAttachment, 
			 @Remarks, @DataCompilerName, @DataVerifiedBy, GETDATE(), GETDATE())
		`;

		await pool.request()
			.input("TrainingTitle", data.trainingTitle || null)
			.input("Output", data.output || null)
			.input("SubNo", data.subNo || null)
			.input("SubActivityName", data.subActivityName || null)
			.input("EventType", data.eventType || null)
			.input("Venue", data.venue || null)
			.input("LocationTehsil", data.locationTehsil || null)
			.input("District", data.district || null)
			.input("StartDate", data.startDate ? new Date(data.startDate) : null)
			.input("EndDate", data.endDate ? new Date(data.endDate) : null)
			.input("TotalDays", totalDays)
			.input("TrainingFacilitatorName", data.trainingFacilitatorName || null)
			.input("TMAMale", parseInt(data.tmaMale) || 0)
			.input("TMAFemale", parseInt(data.tmaFemale) || 0)
			.input("PHEDMale", parseInt(data.phedMale) || 0)
			.input("PHEDFemale", parseInt(data.phedFemale) || 0)
			.input("LGRDMale", parseInt(data.lgrdMale) || 0)
			.input("LGRDFemale", parseInt(data.lgrdFemale) || 0)
			.input("PDDMale", parseInt(data.pddMale) || 0)
			.input("PDDFemale", parseInt(data.pddFemale) || 0)
			.input("CommunityMale", parseInt(data.communityMale) || 0)
			.input("CommunityFemale", parseInt(data.communityFemale) || 0)
			.input("AnyOtherMale", parseInt(data.anyOtherMale) || 0)
			.input("AnyOtherFemale", parseInt(data.anyOtherFemale) || 0)
			.input("AnyOtherSpecify", data.anyOtherSpecify || null)
			.input("TotalMale", totalMale)
			.input("TotalFemale", totalFemale)
			.input("TotalParticipants", totalParticipants)
			.input("PreTrainingEvaluation", data.preTrainingEvaluation || null)
			.input("PostTrainingEvaluation", data.postTrainingEvaluation || null)
			.input("EventAgendas", data.eventAgendas || null)
			.input("ExpectedOutcomes", data.expectedOutcomes || null)
			.input("ChallengesFaced", data.challengesFaced || null)
			.input("SuggestedActions", data.suggestedActions || null)
			.input("ActivityCompletionReportLink", data.activityCompletionReportLink || null)
			.input("ParticipantListAttachment", data.participantListAttachment || null)
			.input("PictureAttachment", data.pictureAttachment || null)
			.input("Remarks", data.remarks || null)
			.input("DataCompilerName", data.dataCompilerName || userId)
			.input("DataVerifiedBy", data.dataVerifiedBy || null)
			.query(query);

		return NextResponse.json({
			success: true,
			message: "Training event added successfully"
		});

	} catch (error) {
		console.error("Error adding training event:", error);
		return NextResponse.json({
			success: false,
			message: "Failed to add training event",
			error: error instanceof Error ? error.message : "Unknown error"
		}, { status: 500 });
	}
}
