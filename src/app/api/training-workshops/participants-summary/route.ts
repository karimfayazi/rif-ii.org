import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type UniqueByGenderRow = { gender: string; uniquePersons: number };
type RepeatBreakdownRow = { attendedTimes: number; persons: number };
type ParticipantsSummary = {
	totalUniquePersons: number;
	uniqueByGender: UniqueByGenderRow[];
	repeatBreakdown: RepeatBreakdownRow[];
};

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

		const [totalResult, genderResult, repeatResult] = await Promise.all([
			pool.request().query(QUERY_TOTAL_UNIQUE),
			pool.request().query(QUERY_UNIQUE_BY_GENDER),
			pool.request().query(QUERY_REPEAT_BREAKDOWN),
		]);

		const totalUniquePersons =
			Number((totalResult.recordset as { total_unique_persons: number }[])?.[0]?.total_unique_persons) ?? 0;

		const uniqueByGender: UniqueByGenderRow[] = ((genderResult.recordset as { gender: string; unique_persons: number }[]) ?? []).map(
			(row) => ({
				gender: String(row.gender ?? "UNKNOWN"),
				uniquePersons: Number(row.unique_persons) ?? 0,
			})
		);

		const repeatBreakdown: RepeatBreakdownRow[] = ((repeatResult.recordset as { attended_times: number; persons: number }[]) ?? []).map(
			(row) => ({
				attendedTimes: Number(row.attended_times) ?? 0,
				persons: Number(row.persons) ?? 0,
			})
		);

		const data: ParticipantsSummary = {
			totalUniquePersons,
			uniqueByGender,
			repeatBreakdown,
		};

		return NextResponse.json({ success: true, data });
	} catch (error) {
		console.error("Error fetching participants summary:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch participants summary",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
