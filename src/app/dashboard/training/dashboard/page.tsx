"use client";

import { useEffect, useState } from "react";

type OverallStats = {
  totalTrainings: number;
  totalDays: number;
  totalMale: number;
  totalFemale: number;
  totalParticipants: number;
};

type BreakdownRow = {
  eventType?: string;
  district?: string;
  totalTrainings: number;
  totalDays: number;
  totalMale: number;
  totalFemale: number;
  totalParticipants: number;
};

type DashboardResponse = {
  success: boolean;
  overall: OverallStats;
  byEventType: BreakdownRow[];
  byDistrict: BreakdownRow[];
};

function getMaxValue(rows: BreakdownRow[], field: keyof BreakdownRow): number {
  return rows.reduce((max, row) => {
    const value = (row[field] as number) || 0;
    return value > max ? value : max;
  }, 0);
}

function getPercentage(part: number, total: number): string {
  if (!total || total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

export default function TrainingCapacityBuildingDashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<BreakdownRow | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<BreakdownRow | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/training/dashboard");
        if (!res.ok) {
          throw new Error("Failed to load dashboard data");
        }
        const json: DashboardResponse = await res.json();
        if (!json.success) {
          throw new Error(json.message || "Failed to load dashboard data");
        }
        setData(json);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const overall = data?.overall;
  const byEventType = data?.byEventType || [];
  const byDistrict = data?.byDistrict || [];

  const maxEventTypeParticipants = getMaxValue(byEventType, "totalParticipants");
  const maxDistrictParticipants = getMaxValue(byDistrict, "totalParticipants");

  const totalTrainingsAll = byEventType.reduce(
    (sum, row) => sum + (row.totalTrainings || 0),
    0
  );
  const totalDaysAll = byEventType.reduce(
    (sum, row) => sum + (row.totalDays || 0),
    0
  );

  const activeEventType: BreakdownRow | null =
    selectedEventType || (byEventType.length > 0 ? byEventType[0] : null);

  const activeDistrict: BreakdownRow | null =
    selectedDistrict || (byDistrict.length > 0 ? byDistrict[0] : null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">
          Training, Capacity Building &amp; Awareness Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Overview of trainings, days and participants (event type wise and
          district wise).
        </p>
      </div>

      {loading && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
          Loading dashboard data...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && overall && (
        <>
          {/* Overall cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 text-white shadow-md">
              <p className="text-xs uppercase tracking-wide opacity-80">
                Total Trainings
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {overall.totalTrainings.toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 p-4 text-white shadow-md">
              <p className="text-xs uppercase tracking-wide opacity-80">
                Total Days
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {overall.totalDays.toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 text-white shadow-md">
              <p className="text-xs uppercase tracking-wide opacity-80">
                Total Male / Female
              </p>
              <div className="mt-2 space-y-0.5 text-sm">
                <p className="font-semibold">
                  <span>{overall.totalMale.toLocaleString()}</span>
                  <span className="mx-1 text-xs font-normal opacity-80">/</span>
                  <span>{overall.totalFemale.toLocaleString()}</span>
                </p>
                <p className="text-[11px] text-indigo-100">
                  {getPercentage(
                    overall.totalMale,
                    overall.totalParticipants
                  )}{" "}
                  Male /{" "}
                  {getPercentage(
                    overall.totalFemale,
                    overall.totalParticipants
                  )}{" "}
                  Female
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-4 text-white shadow-md">
              <p className="text-xs uppercase tracking-wide opacity-80">
                Total Participants
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {overall.totalParticipants.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Charts section */}
          <div className="space-y-6">
            {/* Event type wise charts - first row */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Event type - Total Participants */}
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-800">
                    Event Type Wise - Total Participants
                  </h2>
                  <span className="text-[11px] text-gray-500">
                    Total trainings: {overall.totalTrainings.toLocaleString()}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {byEventType.length === 0 && (
                    <p className="text-xs text-gray-500">No data available.</p>
                  )}
                  {byEventType.map((row, index) => {
                    const value = row.totalParticipants || 0;
                    const widthPercent =
                      maxEventTypeParticipants > 0
                        ? Math.max(
                            5,
                            Math.round(
                              (value / maxEventTypeParticipants) * 100
                            )
                          )
                        : 0;

                    const isActive =
                      activeEventType &&
                      activeEventType.eventType === row.eventType;

                    return (
                      <div
                        key={index}
                        className={isActive ? "rounded-md bg-emerald-50/60 p-1.5" : ""}
                        onMouseEnter={() => setSelectedEventType(row)}
                      >
                        <div className="flex items-center justify-between text-[11px] text-gray-700">
                          <span className="font-medium">
                            {row.eventType || "Unknown"}
                          </span>
                          <span className="text-gray-500">
                            {value.toLocaleString()} participants
                          </span>
                        </div>
                        <div className="mt-1 h-3 w-full rounded-full bg-gray-100">
                          <div
                            className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Event type - Details card */}
              <div className="rounded-lg bg-gradient-to-br from-emerald-600 via-emerald-500 to-sky-500 p-4 text-white shadow-md">
                <h2 className="text-sm font-semibold">
                  Event Type Details
                </h2>
                {activeEventType ? (
                  <>
                    <p className="mt-1 text-xs text-emerald-100">
                      Hover on any event type bar to change these stats.
                    </p>
                    <p className="mt-3 text-lg font-semibold">
                      {activeEventType.eventType || "Unknown"}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-lg bg-white/10 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-emerald-100">
                          Total Trainings
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {activeEventType.totalTrainings.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/10 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-emerald-100">
                          Total Days
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {activeEventType.totalDays.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/10 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-emerald-100">
                          Total Male / Female
                        </p>
                        <div className="mt-1 space-y-0.5">
                          <p className="text-sm font-semibold">
                            {activeEventType.totalMale.toLocaleString()}{" "}
                            <span className="text-[10px] font-normal opacity-80">
                              /
                            </span>{" "}
                            {activeEventType.totalFemale.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-emerald-100">
                            {getPercentage(
                              activeEventType.totalMale,
                              activeEventType.totalParticipants
                            )}{" "}
                            Male /{" "}
                            {getPercentage(
                              activeEventType.totalFemale,
                              activeEventType.totalParticipants
                            )}{" "}
                            Female
                          </p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-white/10 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-emerald-100">
                          Total Participants
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {activeEventType.totalParticipants.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-xs text-emerald-100">
                    No data available.
                  </p>
                )}
              </div>

            </div>

            {/* Second row: Event type trainings & days + details */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Event type - Trainings & Days */}
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-800">
                    Event Type Wise - Trainings &amp; Days
                  </h2>
                  <span className="text-[11px] text-gray-500">
                    Types: {byEventType.length.toLocaleString()}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {byEventType.length === 0 && (
                    <p className="text-xs text-gray-500">No data available.</p>
                  )}
                  {byEventType.map((row, index) => {
                    const trainings = row.totalTrainings || 0;
                    const days = row.totalDays || 0;
                    const maxTrainings = getMaxValue(
                      byEventType,
                      "totalTrainings"
                    );
                    const maxDays = getMaxValue(byEventType, "totalDays");

                    const trainingsWidth =
                      maxTrainings > 0
                        ? Math.max(
                            5,
                            Math.round((trainings / maxTrainings) * 100)
                          )
                        : 0;
                    const daysWidth =
                      maxDays > 0
                        ? Math.max(5, Math.round((days / maxDays) * 100))
                        : 0;

                    const isActive =
                      activeEventType &&
                      activeEventType.eventType === row.eventType;

                    return (
                      <div
                        key={index}
                        className={isActive ? "rounded-md bg-indigo-50/70 p-1.5" : ""}
                        onMouseEnter={() => setSelectedEventType(row)}
                      >
                        <div className="flex items-center justify-between text-[11px] text-gray-700">
                          <span className="font-medium">
                            {row.eventType || "Unknown"}
                          </span>
                          <span className="text-gray-500">
                            {trainings.toLocaleString()} trainings /{" "}
                            {days.toLocaleString()} days
                          </span>
                        </div>
                        {/* Trainings bar */}
                        <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all"
                            style={{ width: `${trainingsWidth}%` }}
                          />
                        </div>
                        {/* Days bar */}
                        <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
                            style={{ width: `${daysWidth}%` }}
                          />
                        </div>
                        <div className="mt-1 text-[10px] text-gray-500">
                          {getPercentage(trainings, totalTrainingsAll)} Trainings /{" "}
                          {getPercentage(days, totalDaysAll)} Days
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Event type trainings & days details card */}
              <div className="rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500 to-emerald-500 p-4 text-white shadow-md">
                <h2 className="text-sm font-semibold">
                  Trainings &amp; Days Details
                </h2>
                {activeEventType ? (
                  <>
                    <p className="mt-1 text-xs text-indigo-100">
                      Hover on any trainings &amp; days bar to change these stats.
                    </p>
                    <p className="mt-3 text-lg font-semibold">
                      {activeEventType.eventType || "Unknown"}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-lg bg-white/10 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-indigo-100">
                          Total Trainings
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {activeEventType.totalTrainings.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/10 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-indigo-100">
                          Total Days
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {activeEventType.totalDays.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/10 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-indigo-100">
                          Total Male / Female
                        </p>
                        <div className="mt-1 space-y-0.5">
                          <p className="text-sm font-semibold">
                            {activeEventType.totalMale.toLocaleString()}{" "}
                            <span className="text-[10px] font-normal opacity-80">
                              /
                            </span>{" "}
                            {activeEventType.totalFemale.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-indigo-100">
                            {getPercentage(
                              activeEventType.totalMale,
                              activeEventType.totalParticipants
                            )}{" "}
                            Male /{" "}
                            {getPercentage(
                              activeEventType.totalFemale,
                              activeEventType.totalParticipants
                            )}{" "}
                            Female
                          </p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-white/10 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-indigo-100">
                          Total Participants
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {activeEventType.totalParticipants.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-xs text-indigo-100">
                    No data available.
                  </p>
                )}
              </div>
            </div>

            {/* Third row: District wise charts + details */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* District wise - Total Participants */}
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-800">
                    District Wise - Total Participants
                  </h2>
                  <span className="text-[11px] text-gray-500">
                    Districts: {byDistrict.length.toLocaleString()}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {byDistrict.length === 0 && (
                    <p className="text-xs text-gray-500">No data available.</p>
                  )}
                  {byDistrict.map((row, index) => {
                    const value = row.totalParticipants || 0;
                    const widthPercent =
                      maxDistrictParticipants > 0
                        ? Math.max(
                            5,
                            Math.round(
                              (value / maxDistrictParticipants) * 100
                            )
                          )
                        : 0;

                    const isActive =
                      activeDistrict &&
                      activeDistrict.district === row.district;

                    return (
                      <div
                        key={index}
                        className={isActive ? "rounded-md bg-sky-50/70 p-1.5" : ""}
                        onMouseEnter={() => setSelectedDistrict(row)}
                      >
                        <div className="flex items-center justify-between text-[11px] text-gray-700">
                          <span className="font-medium">
                            {row.district || "Unknown"}
                          </span>
                          <span className="text-gray-500">
                            {value.toLocaleString()} participants
                          </span>
                        </div>
                        <div className="mt-1 h-3 w-full rounded-full bg-gray-100">
                          <div
                            className="h-3 rounded-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all"
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* District details card */}
              <div className="rounded-lg bg-gradient-to-br from-sky-600 via-sky-500 to-emerald-500 p-4 text-white shadow-md">
                <h2 className="text-sm font-semibold">
                  District Details
                </h2>
                {activeDistrict ? (
                  <>
                    <p className="mt-1 text-xs text-sky-100">
                      Hover on any district bar to change these stats.
                    </p>
                    <p className="mt-3 text-lg font-semibold">
                      {activeDistrict.district || "Unknown"}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-lg bg-white/10 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-sky-100">
                          Total Trainings
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {activeDistrict.totalTrainings.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/10 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-sky-100">
                          Total Days
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {activeDistrict.totalDays.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/10 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-sky-100">
                          Total Male / Female
                        </p>
                        <div className="mt-1 space-y-0.5">
                          <p className="text-sm font-semibold">
                            {activeDistrict.totalMale.toLocaleString()}{" "}
                            <span className="text-[10px] font-normal opacity-80">
                              /
                            </span>{" "}
                            {activeDistrict.totalFemale.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-sky-100">
                            {getPercentage(
                              activeDistrict.totalMale,
                              activeDistrict.totalParticipants
                            )}{" "}
                            Male /{" "}
                            {getPercentage(
                              activeDistrict.totalFemale,
                              activeDistrict.totalParticipants
                            )}{" "}
                            Female
                          </p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-white/10 p-2">
                        <p className="text-[10px] uppercase tracking-wide text-sky-100">
                          Total Participants
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {activeDistrict.totalParticipants.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-xs text-sky-100">
                    No data available.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


