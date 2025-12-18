"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";
import { Info } from "lucide-react";

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

type DashboardResponse = 
  | {
      success: true;
      overall: OverallStats;
      byEventType: BreakdownRow[];
      byDistrict: BreakdownRow[];
    }
  | {
      success: false;
      message?: string;
    };

type DashboardData = {
  success: true;
  overall: OverallStats;
  byEventType: BreakdownRow[];
  byDistrict: BreakdownRow[];
};

type TrainingGraphData = {
  EventType: string;
  District: string;
  TotalMale: number;
  TotalFemale: number;
  TotalParticipants: number;
};

type AnalyticsData = {
  coverage: {
    TotalParticipants: number;
    UniqueParticipants: number;
    DuplicateRecords: number;
  };
  gender: Array<{ Gender: string; Count: number }>;
  geographical: Array<{ District: string; Tehsil: string; NC_VC: string; ParticipantCount: number }>;
  effectiveness: Array<{ TrainingName: string; ParticipantCount: number; AvgDuration: number; SessionCount: number }>;
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
  const { user, getUserId } = useAuth();
  const userId = user?.id || getUserId();
  const { trainingSection, loading: accessLoading } = useAccess(userId);
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
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
        const json = await res.json() as DashboardResponse;
        if (!json.success) {
          throw new Error(json.message ?? "Failed to load dashboard data");
        }
        setData(json);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/api/training/analytics");
        if (!res.ok) {
          throw new Error("Failed to load analytics data");
        }
        const json = await res.json();
        if (json.success) {
          setAnalyticsData(json);
        }
      } catch (err) {
        console.error("Error fetching analytics data:", err);
      }
    };

    fetchData();
    fetchAnalytics();
  }, []);

  if (accessLoading || loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training, Capacity Building & Awareness Dashboard</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!trainingSection) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training, Capacity Building & Awareness Dashboard</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700">You do not have access to the Training Section. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

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
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 text-white shadow-md relative">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide opacity-80">
                  Total Trainings
                </p>
                <div className="relative group">
                  <Info className="h-3.5 w-3.5 text-white/70 hover:text-white cursor-help transition-colors" />
                  <div className="absolute right-0 bottom-full mb-2 w-56 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none">
                    <p className="font-semibold mb-1">Total Trainings</p>
                    <p>Total number of training events conducted across all event types and districts.</p>
                    <div className="absolute right-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {overall.totalTrainings.toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 p-4 text-white shadow-md relative">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide opacity-80">
                  Total Days
                </p>
                <div className="relative group">
                  <Info className="h-3.5 w-3.5 text-white/70 hover:text-white cursor-help transition-colors" />
                  <div className="absolute right-0 bottom-full mb-2 w-56 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none">
                    <p className="font-semibold mb-1">Total Days</p>
                    <p>Sum of all training days across all events. Represents the total duration of all training activities.</p>
                    <div className="absolute right-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {overall.totalDays.toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 text-white shadow-md relative">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide opacity-80">
                  Total Male / Female
                </p>
                <div className="relative group">
                  <Info className="h-3.5 w-3.5 text-white/70 hover:text-white cursor-help transition-colors" />
                  <div className="absolute right-0 bottom-full mb-2 w-56 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none">
                    <p className="font-semibold mb-1">Total Male / Female</p>
                    <p>Breakdown of participants by gender. Shows the total count and percentage of male and female participants across all trainings.</p>
                    <div className="absolute right-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
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

            <div className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-4 text-white shadow-md relative">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide opacity-80">
                  Total Participants
                </p>
                <div className="relative group">
                  <Info className="h-3.5 w-3.5 text-white/70 hover:text-white cursor-help transition-colors" />
                  <div className="absolute right-0 bottom-full mb-2 w-56 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none">
                    <p className="font-semibold mb-1">Total Participants</p>
                    <p>Total number of unique and duplicate participants across all training events. This includes all individuals who attended any training.</p>
                    <div className="absolute right-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
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
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-gray-800">
                      Event Type Wise - Total Participants
                    </h2>
                    <div className="relative group">
                      <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none">
                        <p className="font-semibold mb-1">Event Type Wise - Total Participants</p>
                        <p>Shows the total number of participants grouped by event type (e.g., Training, Workshop). Hover over any bar to see detailed statistics for that event type.</p>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
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
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-gray-800">
                      Event Type Wise - Trainings &amp; Days
                    </h2>
                    <div className="relative group">
                      <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none">
                        <p className="font-semibold mb-1">Event Type Wise - Trainings & Days</p>
                        <p>Shows the number of trainings and total days for each event type. Displays two bars per event type - one for trainings count and one for days. Hover over any bar to see detailed statistics.</p>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
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
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-gray-800">
                      District Wise - Total Participants
                    </h2>
                    <div className="relative group">
                      <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none">
                        <p className="font-semibold mb-1">District Wise - Total Participants</p>
                        <p>Shows the total number of participants grouped by district. Helps identify which districts have the highest participation rates. Hover over any bar to see detailed statistics for that district.</p>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
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

            {/* Four Analytics Graphs - 2x2 Grid */}
            {analyticsData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* 1. Participant Coverage & Uniqueness - Bar Chart */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Participant Coverage & Uniqueness</h3>
                    <div className="relative group">
                      <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none">
                        <p className="font-semibold mb-1">Participant Coverage & Uniqueness</p>
                        <p>Shows total participants, unique individuals (based on CNIC), and duplicate records. Helps identify data quality and participant reach.</p>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const { TotalParticipants, UniqueParticipants, DuplicateRecords } = analyticsData.coverage;
                    const maxValue = Math.max(TotalParticipants, UniqueParticipants, DuplicateRecords, 1);
                    
                    return (
                      <div className="w-full">
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-gray-700">Total Participants</span>
                              <span className="text-gray-600">{TotalParticipants.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-6">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-1000"
                                style={{ width: `${(TotalParticipants / maxValue) * 100}%` }}
                              >
                                <span className="text-white text-xs font-bold">{TotalParticipants.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-gray-700">Unique Participants</span>
                              <span className="text-gray-600">{UniqueParticipants.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-6">
                              <div
                                className="bg-gradient-to-r from-green-500 to-green-600 h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-1000"
                                style={{ width: `${(UniqueParticipants / maxValue) * 100}%` }}
                              >
                                <span className="text-white text-xs font-bold">{UniqueParticipants.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-gray-700">Duplicate Records</span>
                              <span className="text-gray-600">{DuplicateRecords.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-6">
                              <div
                                className="bg-gradient-to-r from-orange-500 to-orange-600 h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-1000"
                                style={{ width: `${(DuplicateRecords / maxValue) * 100}%` }}
                              >
                                <span className="text-white text-xs font-bold">{DuplicateRecords.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 2. Gender Distribution & Inclusion - Pie Chart */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Gender Distribution & Inclusion</h3>
                    <div className="relative group">
                      <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none">
                        <p className="font-semibold mb-1">Gender Distribution & Inclusion</p>
                        <p>Displays the breakdown of participants by gender (Male/Female/Other). Shows overall participation rates and helps assess gender inclusivity in training programs.</p>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const genderData = analyticsData.gender;
                    const total = genderData.reduce((sum, item) => sum + item.Count, 0);
                    
                    if (total === 0) {
                      return <p className="text-sm text-gray-500 text-center">No data available</p>;
                    }
                    
                    // Create pie chart segments
                    let currentAngle = 0;
                    const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b'];
                    
                    return (
                      <div className="w-full">
                        <div className="flex items-center justify-center mb-4">
                          <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                            {genderData.map((item, idx) => {
                              const percentage = (item.Count / total) * 100;
                              const angle = (item.Count / total) * 360;
                              const largeArc = angle > 180 ? 1 : 0;
                              
                              const x1 = 100 + 80 * Math.cos((currentAngle * Math.PI) / 180);
                              const y1 = 100 + 80 * Math.sin((currentAngle * Math.PI) / 180);
                              const x2 = 100 + 80 * Math.cos(((currentAngle + angle) * Math.PI) / 180);
                              const y2 = 100 + 80 * Math.sin(((currentAngle + angle) * Math.PI) / 180);
                              
                              const pathData = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;
                              
                              currentAngle += angle;
                              
                              return (
                                <path
                                  key={idx}
                                  d={pathData}
                                  fill={colors[idx % colors.length]}
                                  stroke="white"
                                  strokeWidth="2"
                                />
                              );
                            })}
                          </svg>
                        </div>
                        <div className="space-y-2 mt-4">
                          {genderData.map((item, idx) => {
                            const percentage = ((item.Count / total) * 100).toFixed(1);
                            return (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <div className="flex items-center">
                                  <div
                                    className="w-4 h-4 rounded mr-2"
                                    style={{ backgroundColor: colors[idx % colors.length] }}
                                  />
                                  <span className="font-medium text-gray-700 capitalize">{item.Gender || 'Unknown'}</span>
                                </div>
                                <div className="text-gray-600">
                                  <span className="font-semibold">{item.Count.toLocaleString()}</span>
                                  <span className="text-xs ml-1">({percentage}%)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 3. Geographical Coverage - Bar Chart */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Geographical Coverage</h3>
                    <div className="relative group">
                      <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none">
                        <p className="font-semibold mb-1">Geographical Coverage</p>
                        <p>Shows participant distribution across Districts, Tehsils, and NC/VC areas. Helps identify geographical reach and coverage gaps in training programs.</p>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const geoData = analyticsData.geographical
                      .sort((a, b) => b.ParticipantCount - a.ParticipantCount)
                      .slice(0, 8); // Top 8 districts
                    
                    if (geoData.length === 0) {
                      return <p className="text-sm text-gray-500 text-center">No data available</p>;
                    }
                    
                    const maxValue = Math.max(...geoData.map(d => d.ParticipantCount), 1);
                    
                    return (
                      <div className="w-full">
                        <div className="space-y-3">
                          {geoData.map((item, idx) => {
                            const widthPercent = (item.ParticipantCount / maxValue) * 100;
                            return (
                              <div key={idx}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="font-medium text-gray-700 truncate max-w-[60%]">{item.District}</span>
                                  <span className="text-gray-600">{item.ParticipantCount.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-4">
                                  <div
                                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-4 rounded-full flex items-center justify-end pr-2 transition-all duration-1000"
                                    style={{ width: `${widthPercent}%` }}
                                  >
                                    <span className="text-white text-[10px] font-bold">{item.ParticipantCount.toLocaleString()}</span>
                                  </div>
                                </div>
                                <div className="text-[10px] text-gray-500 mt-1">
                                  {item.Tehsil !== 'Unknown' && <span>Tehsil: {item.Tehsil}</span>}
                                  {item.NC_VC !== 'Unknown' && <span className="ml-2">NC/VC: {item.NC_VC}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 4. Training Effectiveness & Reach - Bar Chart */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Training Effectiveness & Reach</h3>
                    <div className="relative group">
                      <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none">
                        <p className="font-semibold mb-1">Training Effectiveness & Reach</p>
                        <p>Displays participants per training, average duration, and number of sessions. Helps evaluate training program effectiveness, reach, and participant engagement levels.</p>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const effectivenessData = analyticsData.effectiveness
                      .sort((a, b) => b.ParticipantCount - a.ParticipantCount)
                      .slice(0, 6); // Top 6 trainings
                    
                    if (effectivenessData.length === 0) {
                      return <p className="text-sm text-gray-500 text-center">No data available</p>;
                    }
                    
                    const maxParticipants = Math.max(...effectivenessData.map(d => d.ParticipantCount), 1);
                    
                    return (
                      <div className="w-full">
                        <div className="space-y-3">
                          {effectivenessData.map((item, idx) => {
                            const widthPercent = (item.ParticipantCount / maxParticipants) * 100;
                            const avgDuration = item.AvgDuration ? item.AvgDuration.toFixed(1) : 'N/A';
                            
                            return (
                              <div key={idx}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="font-medium text-gray-700 truncate max-w-[60%]" title={item.TrainingName}>
                                    {item.TrainingName}
                                  </span>
                                  <span className="text-gray-600">{item.ParticipantCount.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-4">
                                  <div
                                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-4 rounded-full flex items-center justify-end pr-2 transition-all duration-1000"
                                    style={{ width: `${widthPercent}%` }}
                                  >
                                    <span className="text-white text-[10px] font-bold">{item.ParticipantCount.toLocaleString()}</span>
                                  </div>
                                </div>
                                <div className="text-[10px] text-gray-500 mt-1 flex justify-between">
                                  <span>Avg Duration: {avgDuration} days</span>
                                  <span>Sessions: {item.SessionCount}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}


