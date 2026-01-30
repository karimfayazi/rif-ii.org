import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type EventsSummaryRow = {
	TotalEvents: number;
	TotalMale: number;
	TotalFemale: number;
	TotalParticipants: number;
};

type EvaluationRow = {
	PreEvaluation: number | null;
	PostEvaluation: number | null;
};

const QUERY_EVENTS = `
SELECT
    COUNT(DISTINCT TrainingEventCode) AS TotalEvents,
    SUM(ISNULL(TotalMale, 0))         AS TotalMale,
    SUM(ISNULL(TotalFemale, 0))       AS TotalFemale,
    SUM(ISNULL(TotalParticipants, 0)) AS TotalParticipants
FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents];
`;

const QUERY_EVALUATION = `
SELECT
    CAST(AVG(CASE WHEN ISNUMERIC([PreTrainingEvaluation]) = 1 THEN CAST([PreTrainingEvaluation] AS FLOAT) ELSE NULL END) AS decimal(10,2)) AS PreEvaluation,
    CAST(AVG(CASE WHEN ISNUMERIC([PostTrainingEvaluation]) = 1 THEN CAST([PostTrainingEvaluation] AS FLOAT) ELSE NULL END) AS decimal(10,2)) AS PostEvaluation
FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents];
`;

const QUERY_TOTAL_UNIQUE = `
SELECT
    COUNT(DISTINCT LTRIM(RTRIM(cnic_number))) AS total_unique_persons
FROM [_rifiiorg_db].[dbo].[workshop_participants]
WHERE cnic_number IS NOT NULL
  AND LTRIM(RTRIM(cnic_number)) <> '';
`;

const QUERY_UNIQUE_BY_GENDER = `
;WITH Clean AS (
    SELECT
        LTRIM(RTRIM(cnic_number)) AS cnic_number,
        NULLIF(LTRIM(RTRIM(gender)), '') AS gender
    FROM [_rifiiorg_db].[dbo].[workshop_participants]
    WHERE cnic_number IS NOT NULL
      AND LTRIM(RTRIM(cnic_number)) <> ''
)
SELECT
    COALESCE(gender, 'UNKNOWN') AS gender,
    COUNT(DISTINCT cnic_number) AS unique_persons
FROM Clean
GROUP BY COALESCE(gender, 'UNKNOWN')
ORDER BY unique_persons DESC;
`;

const QUERY_REPEAT_BREAKDOWN = `
;WITH Clean AS (
    SELECT
        LTRIM(RTRIM(cnic_number)) AS cnic_number
    FROM [_rifiiorg_db].[dbo].[workshop_participants]
    WHERE cnic_number IS NOT NULL
      AND LTRIM(RTRIM(cnic_number)) <> ''
),
PerPerson AS (
    SELECT
        cnic_number,
        COUNT(*) AS trainings_count
    FROM Clean
    GROUP BY cnic_number
)
SELECT
    trainings_count AS attended_times,
    COUNT(*)        AS persons
FROM PerPerson
GROUP BY trainings_count
ORDER BY attended_times;
`;

export async function GET() {
	try {
		const pool = await getDb();

		const [eventsResult, evaluationResult, totalResult, genderResult, repeatResult] = await Promise.all([
			pool.request().query(QUERY_EVENTS),
			pool.request().query(QUERY_EVALUATION),
			pool.request().query(QUERY_TOTAL_UNIQUE),
			pool.request().query(QUERY_UNIQUE_BY_GENDER),
			pool.request().query(QUERY_REPEAT_BREAKDOWN),
		]);

		const eventsRow = (eventsResult.recordset as EventsSummaryRow[])?.[0];
		const eventsSummary = {
			totalEvents: Number(eventsRow?.TotalEvents) ?? 0,
			totalParticipants: Number(eventsRow?.TotalParticipants) ?? 0,
			totalMale: Number(eventsRow?.TotalMale) ?? 0,
			totalFemale: Number(eventsRow?.TotalFemale) ?? 0,
		};

		const evalRow = (evaluationResult.recordset as EvaluationRow[])?.[0];
		const preEvaluation = evalRow?.PreEvaluation != null ? Number(evalRow.PreEvaluation) : null;
		const postEvaluation = evalRow?.PostEvaluation != null ? Number(evalRow.PostEvaluation) : null;
		const improvement =
			preEvaluation != null && postEvaluation != null ? postEvaluation - preEvaluation : null;
		const evaluationSummary = {
			preEvaluation,
			postEvaluation,
			improvement,
		};

		const totalUniquePersons =
			Number((totalResult.recordset as { total_unique_persons: number }[])?.[0]?.total_unique_persons) ?? 0;

		const uniqueByGender = (genderResult.recordset as { gender: string; unique_persons: number }[]) ?? [];
		const uniqueMale = uniqueByGender
			.filter((r) => ["m", "male"].includes(String(r.gender).toLowerCase()))
			.reduce((sum, r) => sum + (Number(r.unique_persons) ?? 0), 0);
		const uniqueFemale = uniqueByGender
			.filter((r) => ["f", "female"].includes(String(r.gender).toLowerCase()))
			.reduce((sum, r) => sum + (Number(r.unique_persons) ?? 0), 0);

		const rawRepeat = (repeatResult.recordset as { attended_times: number; persons: number }[]) ?? [];
		const repeatBreakdown: Array<{ attendedTimes: number | string; persons: number }> = [];
		let fivePlusPersons = 0;
		for (const row of rawRepeat) {
			const times = Number(row.attended_times) ?? 0;
			const persons = Number(row.persons) ?? 0;
			if (times >= 5) {
				fivePlusPersons += persons;
			} else if (times >= 1 && times <= 4) {
				repeatBreakdown.push({ attendedTimes: times, persons });
			}
		}
		if (fivePlusPersons > 0) {
			repeatBreakdown.push({ attendedTimes: "5+", persons: fivePlusPersons });
		}
		repeatBreakdown.sort((a, b) => {
			const aVal = typeof a.attendedTimes === "number" ? a.attendedTimes : 5;
			const bVal = typeof b.attendedTimes === "number" ? b.attendedTimes : 5;
			return aVal - bVal;
		});

		const participantsSummary = {
			totalUniquePersons,
			uniqueMale,
			uniqueFemale,
			repeatBreakdown,
		};

		return NextResponse.json({
			success: true,
			data: {
				eventsSummary,
				participantsSummary,
				evaluationSummary,
			},
		});
	} catch (error) {
		console.error("Error fetching summary-all:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch summary",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
