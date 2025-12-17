import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const pool = await getDb();

		// Get overall participant statistics
		const overallQuery = `
			SELECT 
				COUNT(DISTINCT [sn]) as TotalParticipants,
				SUM(CASE WHEN [gender] = 'Male' THEN 1 ELSE 0 END) as TotalMale,
				SUM(CASE WHEN [gender] = 'Female' THEN 1 ELSE 0 END) as TotalFemale
			FROM [_rifiiorg_db].[dbo].[workshop_participants]
		`;

		const overallResult = await pool.request().query(overallQuery);
		const overall = overallResult.recordset?.[0] || { TotalParticipants: 0, TotalMale: 0, TotalFemale: 0 };

		// Get breakdown by workshop_training_name
		const breakdownQuery = `
			SELECT 
				[workshop_training_name],
				COUNT(DISTINCT [sn]) as TotalParticipants,
				SUM(CASE WHEN [gender] = 'Male' THEN 1 ELSE 0 END) as TotalMale,
				SUM(CASE WHEN [gender] = 'Female' THEN 1 ELSE 0 END) as TotalFemale
			FROM [_rifiiorg_db].[dbo].[workshop_participants]
			WHERE [workshop_training_name] IS NOT NULL AND [workshop_training_name] != ''
			GROUP BY [workshop_training_name]
			ORDER BY TotalParticipants DESC
		`;

		const breakdownResult = await pool.request().query(breakdownQuery);
		const breakdown = breakdownResult.recordset || [];

		// Categorize by Training vs Workshop
		const trainingCategories = breakdown.filter(item => 
			item.workshop_training_name?.toLowerCase().includes('training') ||
			item.workshop_training_name?.toLowerCase().includes('civic') ||
			item.workshop_training_name?.toLowerCase().includes('community') ||
			item.workshop_training_name?.toLowerCase().includes('participatory') ||
			item.workshop_training_name?.toLowerCase().includes('profiling')
		);

		const workshopCategories = breakdown.filter(item => 
			item.workshop_training_name?.toLowerCase().includes('workshop')
		);

		const trainingTotal = {
			category: 'Training',
			TotalParticipants: trainingCategories.reduce((sum, item) => sum + (item.TotalParticipants || 0), 0),
			TotalMale: trainingCategories.reduce((sum, item) => sum + (item.TotalMale || 0), 0),
			TotalFemale: trainingCategories.reduce((sum, item) => sum + (item.TotalFemale || 0), 0),
			subcategories: trainingCategories
		};

		const workshopTotal = {
			category: 'Workshop',
			TotalParticipants: workshopCategories.reduce((sum, item) => sum + (item.TotalParticipants || 0), 0),
			TotalMale: workshopCategories.reduce((sum, item) => sum + (item.TotalMale || 0), 0),
			TotalFemale: workshopCategories.reduce((sum, item) => sum + (item.TotalFemale || 0), 0),
			subcategories: workshopCategories
		};

		return NextResponse.json({
			success: true,
			overall: {
				totalParticipants: overall.TotalParticipants || 0,
				totalMale: overall.TotalMale || 0,
				totalFemale: overall.TotalFemale || 0
			},
			byCategory: {
				training: trainingTotal,
				workshop: workshopTotal
			},
			breakdown: breakdown
		});
	} catch (error) {
		console.error("Error fetching participant statistics:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch participant statistics",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
