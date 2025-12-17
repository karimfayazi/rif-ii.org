"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";
import { User, Users } from "lucide-react";

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

type ParticipantStats = {
  overall: {
    totalParticipants: number;
    totalMale: number;
    totalFemale: number;
  };
  byCategory: {
    training: {
      category: string;
      TotalParticipants: number;
      TotalMale: number;
      TotalFemale: number;
      subcategories: any[];
    };
    workshop: {
      category: string;
      TotalParticipants: number;
      TotalMale: number;
      TotalFemale: number;
      subcategories: any[];
    };
  };
  breakdown: any[];
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
  const [participantStats, setParticipantStats] = useState<ParticipantStats | null>(null);
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

    const fetchParticipantStats = async () => {
      try {
        const response = await fetch('/api/training/participants/stats');
        const data = await response.json();

        if (data.success) {
          setParticipantStats(data);
        } else {
          console.error("Failed to fetch participant stats:", data.message);
        }
      } catch (err) {
        console.error("Error fetching participant stats:", err);
      }
    };

    fetchData();
    fetchParticipantStats();
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

          {/* Training Participants Detailed Statistics */}
          {participantStats && (
            <div className="space-y-6 mt-8">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Training Participants Statistics</h2>
                <p className="text-sm text-gray-500">Detailed breakdown of participants by category and type</p>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Participants Card */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm uppercase tracking-wide opacity-80">Total Participants</p>
                    <User className="h-6 w-6 opacity-80" />
                  </div>
                  <p className="text-3xl font-bold">{participantStats.overall.totalParticipants.toLocaleString()}</p>
                </div>

                {/* Total Male Card */}
                <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm uppercase tracking-wide opacity-80">Total Male</p>
                    <User className="h-6 w-6 opacity-80" />
                  </div>
                  <p className="text-3xl font-bold">{participantStats.overall.totalMale.toLocaleString()}</p>
                  <p className="text-sm mt-1 opacity-90">
                    {getPercentage(participantStats.overall.totalMale, participantStats.overall.totalParticipants)} of total
                  </p>
                </div>

                {/* Total Female Card */}
                <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm uppercase tracking-wide opacity-80">Total Female</p>
                    <User className="h-6 w-6 opacity-80" />
                  </div>
                  <p className="text-3xl font-bold">{participantStats.overall.totalFemale.toLocaleString()}</p>
                  <p className="text-sm mt-1 opacity-90">
                    {getPercentage(participantStats.overall.totalFemale, participantStats.overall.totalParticipants)} of total
                  </p>
                </div>

                {/* Gender Distribution Card */}
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm uppercase tracking-wide opacity-80">Gender Distribution</p>
                    <Users className="h-6 w-6 opacity-80" />
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Male</span>
                        <span className="font-semibold">{getPercentage(participantStats.overall.totalMale, participantStats.overall.totalParticipants)}</span>
                      </div>
                      <div className="w-full bg-white/30 rounded-full h-2">
                        <div 
                          className="bg-white rounded-full h-2 transition-all duration-500"
                          style={{ width: getPercentage(participantStats.overall.totalMale, participantStats.overall.totalParticipants) }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Female</span>
                        <span className="font-semibold">{getPercentage(participantStats.overall.totalFemale, participantStats.overall.totalParticipants)}</span>
                      </div>
                      <div className="w-full bg-white/30 rounded-full h-2">
                        <div 
                          className="bg-white rounded-full h-2 transition-all duration-500"
                          style={{ width: getPercentage(participantStats.overall.totalFemale, participantStats.overall.totalParticipants) }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Breakdown - Training vs Workshop */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Training Category */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Training Category</h3>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600">
                        {participantStats.byCategory.training.TotalParticipants.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">Total Participants</p>
                    </div>
                  </div>

                  {/* Gender Breakdown */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Male</p>
                      <p className="text-xl font-bold text-blue-600">{participantStats.byCategory.training.TotalMale.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{getPercentage(participantStats.byCategory.training.TotalMale, participantStats.byCategory.training.TotalParticipants)}</p>
                    </div>
                    <div className="bg-pink-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Female</p>
                      <p className="text-xl font-bold text-pink-600">{participantStats.byCategory.training.TotalFemale.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{getPercentage(participantStats.byCategory.training.TotalFemale, participantStats.byCategory.training.TotalParticipants)}</p>
                    </div>
                  </div>
                </div>

                {/* Workshop Category */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Workshop Category</h3>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-indigo-600">
                        {participantStats.byCategory.workshop.TotalParticipants.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">Total Participants</p>
                    </div>
                  </div>

                  {/* Gender Breakdown */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Male</p>
                      <p className="text-xl font-bold text-blue-600">{participantStats.byCategory.workshop.TotalMale.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{getPercentage(participantStats.byCategory.workshop.TotalMale, participantStats.byCategory.workshop.TotalParticipants)}</p>
                    </div>
                    <div className="bg-pink-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Female</p>
                      <p className="text-xl font-bold text-pink-600">{participantStats.byCategory.workshop.TotalFemale.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{getPercentage(participantStats.byCategory.workshop.TotalFemale, participantStats.byCategory.workshop.TotalParticipants)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Training Types - Full Width - Vertical Bar Chart */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">Training Types - Participants Breakdown</h3>
                <div className="flex items-end justify-center gap-4" style={{ minHeight: '250px' }}>
                  {participantStats.byCategory.training.subcategories
                    .sort((a: any, b: any) => b.TotalParticipants - a.TotalParticipants)
                    .map((training: any, idx: number) => {
                      const maxParticipants = Math.max(...participantStats.byCategory.training.subcategories.map((t: any) => t.TotalParticipants));
                      const height = (training.TotalParticipants / maxParticipants) * 100;
                      
                      return (
                        <div key={idx} className="flex flex-col items-center flex-1 max-w-[120px]">
                          <div className="w-full bg-gray-200 rounded-t-lg relative overflow-hidden shadow-inner mb-3" style={{ height: '200px' }}>
                            {/* Male portion (bottom) */}
                            <div 
                              className="bg-gradient-to-t from-blue-500 to-blue-600 w-full transition-all duration-1000 ease-out absolute bottom-0 flex items-start justify-center pt-1"
                              style={{ 
                                height: `${Math.min((training.TotalMale / training.TotalParticipants) * height, height)}%` 
                              }}
                            >
                              <span className="text-white text-xs font-bold">{training.TotalMale}</span>
                            </div>
                            {/* Female portion (on top of male) */}
                            <div 
                              className="bg-gradient-to-t from-pink-500 to-pink-600 w-full transition-all duration-1000 ease-out absolute flex items-start justify-center pt-1"
                              style={{ 
                                height: `${Math.min((training.TotalFemale / training.TotalParticipants) * height, height)}%`,
                                bottom: `${Math.min((training.TotalMale / training.TotalParticipants) * height, height)}%`
                              }}
                            >
                              <span className="text-white text-xs font-bold">{training.TotalFemale}</span>
                            </div>
                            {/* Total label at the top */}
                            <div className="absolute top-1 left-0 right-0 flex justify-center">
                              <span className="text-gray-700 text-sm font-bold bg-white/90 px-2 py-0.5 rounded">{training.TotalParticipants}</span>
                            </div>
                          </div>
                          <p className="text-xs font-bold text-emerald-700 mb-1 text-center leading-tight h-12 line-clamp-2" title={training.workshop_training_name}>
                            {training.workshop_training_name.length > 40 
                              ? training.workshop_training_name.substring(0, 40) + '...'
                              : training.workshop_training_name
                            }
                          </p>
                          <div className="text-xs text-gray-600 text-center">
                            <span className="text-blue-600">M: {training.TotalMale}</span>
                            <span className="mx-1">|</span>
                            <span className="text-pink-600">F: {training.TotalFemale}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
                <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-t from-blue-500 to-blue-600 rounded"></div>
                    <span className="text-gray-700">Male</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-t from-pink-500 to-pink-600 rounded"></div>
                    <span className="text-gray-700">Female</span>
                  </div>
                </div>
              </div>

              {/* Workshop Types & Participants by Category - Two Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Workshop Types Horizontal Bar Chart */}
                {participantStats.byCategory.workshop.subcategories.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Workshop Types - Participants Breakdown</h3>
                    <div className="space-y-4">
                      {participantStats.byCategory.workshop.subcategories
                        .sort((a: any, b: any) => b.TotalParticipants - a.TotalParticipants)
                        .map((workshop: any, idx: number) => {
                          const maxParticipants = Math.max(...participantStats.byCategory.workshop.subcategories.map((w: any) => w.TotalParticipants));
                          const widthPercent = (workshop.TotalParticipants / maxParticipants) * 100;
                          const malePercent = (workshop.TotalMale / workshop.TotalParticipants) * 100;
                          const femalePercent = (workshop.TotalFemale / workshop.TotalParticipants) * 100;
                          
                          return (
                            <div key={idx} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900 flex-1 pr-4">
                                  {workshop.workshop_training_name}
                                </p>
                                <span className="text-sm font-bold text-indigo-600">{workshop.TotalParticipants}</span>
                              </div>
                              <div className="relative h-4 bg-gray-200 rounded-lg overflow-hidden shadow-inner">
                                {/* Male portion */}
                                <div 
                                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000 ease-out flex items-center justify-center"
                                  style={{ width: `${(malePercent / 100) * widthPercent}%` }}
                                >
                                  {workshop.TotalMale > 0 && (
                                    <span className="text-white text-[10px] font-bold">{workshop.TotalMale}</span>
                                  )}
                                </div>
                                {/* Female portion */}
                                <div 
                                  className="absolute top-0 h-full bg-gradient-to-r from-pink-500 to-pink-600 transition-all duration-1000 ease-out flex items-center justify-center"
                                  style={{ 
                                    left: `${(malePercent / 100) * widthPercent}%`,
                                    width: `${(femalePercent / 100) * widthPercent}%` 
                                  }}
                                >
                                  {workshop.TotalFemale > 0 && (
                                    <span className="text-white text-[10px] font-bold">{workshop.TotalFemale}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-4 text-xs text-gray-600">
                                <span className="text-blue-600">M: {workshop.TotalMale}</span>
                                <span className="text-pink-600">F: {workshop.TotalFemale}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    <div className="mt-6 flex items-center justify-center gap-6 text-sm border-t border-gray-200 pt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded"></div>
                        <span className="text-gray-700">Male</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gradient-to-r from-pink-500 to-pink-600 rounded"></div>
                        <span className="text-gray-700">Female</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Participants by Category - Horizontal Bars */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Participants by Category</h3>
                  <div className="space-y-4">
                    {/* Training Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-emerald-700">Training</p>
                        <span className="text-sm font-bold text-emerald-600">{participantStats.byCategory.training.TotalParticipants}</span>
                      </div>
                      <div className="relative h-4 bg-gray-200 rounded-lg overflow-hidden shadow-inner">
                        <div 
                          className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-1000 ease-out flex items-center justify-center"
                          style={{ 
                            width: `${(participantStats.byCategory.training.TotalParticipants / participantStats.overall.totalParticipants) * 100}%` 
                          }}
                        >
                          <span className="text-white text-[10px] font-bold">{participantStats.byCategory.training.TotalParticipants}</span>
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-600">
                        <span className="text-blue-600">M: {participantStats.byCategory.training.TotalMale}</span>
                        <span className="text-pink-600">F: {participantStats.byCategory.training.TotalFemale}</span>
                      </div>
                    </div>

                    {/* Workshop Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-700">Workshop</p>
                        <span className="text-sm font-bold text-indigo-600">{participantStats.byCategory.workshop.TotalParticipants}</span>
                      </div>
                      <div className="relative h-4 bg-gray-200 rounded-lg overflow-hidden shadow-inner">
                        <div 
                          className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-1000 ease-out flex items-center justify-center"
                          style={{ 
                            width: `${(participantStats.byCategory.workshop.TotalParticipants / participantStats.overall.totalParticipants) * 100}%` 
                          }}
                        >
                          <span className="text-white text-[10px] font-bold">{participantStats.byCategory.workshop.TotalParticipants}</span>
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-600">
                        <span className="text-blue-600">M: {participantStats.byCategory.workshop.TotalMale}</span>
                        <span className="text-pink-600">F: {participantStats.byCategory.workshop.TotalFemale}</span>
                      </div>
                    </div>

                    {/* Total Bar */}
                    <div className="space-y-2 pt-4 border-t-2 border-gray-200">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-orange-700">Grand Total</p>
                        <span className="text-sm font-bold text-orange-600">{participantStats.overall.totalParticipants}</span>
                      </div>
                      <div className="relative h-4 bg-gray-200 rounded-lg overflow-hidden shadow-inner border-2 border-orange-400">
                        <div 
                          className="absolute left-0 top-0 h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-1000 ease-out flex items-center justify-center"
                          style={{ width: '100%' }}
                        >
                          <span className="text-white text-[10px] font-bold">{participantStats.overall.totalParticipants}</span>
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-600">
                        <span className="text-blue-600">M: {participantStats.overall.totalMale}</span>
                        <span className="text-pink-600">F: {participantStats.overall.totalFemale}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


