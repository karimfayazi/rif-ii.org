"use client";

import { useEffect, useState, useCallback } from "react";
import { 
	Filter, 
	RefreshCw, 
	BarChart3, 
	MapPin, 
	Users, 
	Activity,
	Loader2,
	ArrowLeft,
	TrendingUp,
	Target
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";

type TrackingData = {
	OutputID: number;
	Output: string;
	MainActivityName: string;
	SubActivityName: string;
	Sub_Sub_ActivityName: string;
	UnitName: string;
	PlannedTargets: number;
	AchievedTargets: number;
	ActivityProgress: number;
	ActivityWeightage: number;
	ActivityWeightageProgress: number;
	PlannedStartDate: string;
	PlannedEndDate: string;
	Remarks: string;
	Links: string;
	Sector_Name: string;
	District: string;
	Tehsil: string;
	Beneficiaries_Male: number;
	Beneficiaries_Female: number;
	Total_Beneficiaries: number;
	Beneficiary_Types: string;
};

type TehsilProgress = {
	tehsil: string;
	district: string;
	totalActivities: number;
	totalPlanned: number;
	totalAchieved: number;
	overallProgress: number;
	weightedProgress: number;
	totalBeneficiaries: number;
	activities: TrackingData[];
};

export default function TehsilWiseProgressPage() {
	const { user, getUserId } = useAuth();
	const userId = user?.id || getUserId();
	const { trackingSection, loading: accessLoading } = useAccess(userId);
	
	const [trackingData, setTrackingData] = useState<TrackingData[]>([]);
	const [tehsilProgress, setTehsilProgress] = useState<TehsilProgress[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedDistrict, setSelectedDistrict] = useState("");
	const [selectedTehsil, setSelectedTehsil] = useState("");
	const [districts, setDistricts] = useState<string[]>([]);
	const [tehsils, setTehsils] = useState<string[]>([]);
	const [expandedTehsils, setExpandedTehsils] = useState<Set<string>>(new Set());

	const fetchTehsils = useCallback(async () => {
		try {
			const params = new URLSearchParams();
			if (selectedDistrict) params.append('district', selectedDistrict);
			
			const response = await fetch(`/api/tracking-sheet/tehsils?${params.toString()}`);
			const data = await response.json();
			
			if (data.success) {
				setTehsils(data.tehsils || []);
			}
		} catch (err) {
			console.error("Error fetching tehsils:", err);
		}
	}, [selectedDistrict]);

	const fetchTrackingData = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const params = new URLSearchParams();
			if (selectedDistrict) params.append('district', selectedDistrict);
			if (selectedTehsil) params.append('tehsil', selectedTehsil);

			const response = await fetch(`/api/tracking-sheet?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				const dataArray = data.trackingData || [];
				setTrackingData(dataArray);
				
				// Extract unique districts
				const uniqueDistricts = [...new Set(dataArray.map((item: TrackingData) => item.District).filter(Boolean))] as string[];
				setDistricts(uniqueDistricts);
				
				// Group data by tehsil and calculate progress
				const tehsilMap = new Map<string, TehsilProgress>();
				
				dataArray.forEach((item: TrackingData) => {
					if (!item.Tehsil) return;
					
					const key = `${item.District}-${item.Tehsil}`;
					
					if (!tehsilMap.has(key)) {
						tehsilMap.set(key, {
							tehsil: item.Tehsil,
							district: item.District || "",
							totalActivities: 0,
							totalPlanned: 0,
							totalAchieved: 0,
							overallProgress: 0,
							weightedProgress: 0,
							totalBeneficiaries: 0,
							activities: []
						});
					}
					
					const progress = tehsilMap.get(key)!;
					progress.totalActivities++;
					progress.totalPlanned += item.PlannedTargets || 0;
					progress.totalAchieved += item.AchievedTargets || 0;
					progress.totalBeneficiaries += item.Total_Beneficiaries || 0;
					progress.activities.push(item);
				});
				
				// Calculate overall progress for each tehsil
				const progressArray = Array.from(tehsilMap.values()).map(progress => {
					progress.overallProgress = progress.totalPlanned > 0 
						? (progress.totalAchieved / progress.totalPlanned) * 100 
						: 0;
					
					// Calculate weighted progress
					const totalWeightage = progress.activities.reduce((sum, act) => sum + (act.ActivityWeightage || 0), 0);
					const weightedSum = progress.activities.reduce((sum, act) => 
						sum + ((act.ActivityWeightageProgress || 0) * (act.ActivityWeightage || 0)), 0
					);
					progress.weightedProgress = totalWeightage > 0 ? (weightedSum / totalWeightage) : 0;
					
					return progress;
				});
				
				// Sort by district and tehsil
				progressArray.sort((a, b) => {
					if (a.district !== b.district) {
						return a.district.localeCompare(b.district);
					}
					return a.tehsil.localeCompare(b.tehsil);
				});
				
				setTehsilProgress(progressArray);
			} else {
				setError(data.message || "Failed to fetch tracking data");
			}
		} catch (err) {
			setError("Error fetching tracking data");
			console.error("Error fetching tracking data:", err);
		} finally {
			setLoading(false);
		}
	}, [selectedDistrict, selectedTehsil]);

	useEffect(() => {
		fetchTehsils();
	}, [fetchTehsils]);

	useEffect(() => {
		if (trackingSection) {
			fetchTrackingData();
		}
	}, [fetchTrackingData, trackingSection]);

	const toggleTehsil = (tehsilKey: string) => {
		setExpandedTehsils(prev => {
			const newSet = new Set(prev);
			if (newSet.has(tehsilKey)) {
				newSet.delete(tehsilKey);
			} else {
				newSet.add(tehsilKey);
			}
			return newSet;
		});
	};

	const handleReset = () => {
		setSelectedDistrict("");
		setSelectedTehsil("");
	};

	if (accessLoading || loading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Tehsil Wise Progress</h1>
				</div>
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-[#0b4d2b]" />
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		);
	}

	if (!trackingSection) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Tehsil Wise Progress</h1>
					<p className="text-gray-600 mt-2">You don't have access to this section.</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Tehsil Wise Progress</h1>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600">{error}</p>
					<button
						onClick={fetchTrackingData}
						className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link
						href="/dashboard"
						className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-green-50 rounded-lg transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back
					</Link>
					<div>
						<h1 className="text-2xl font-bold text-gray-900">Tehsil Wise Progress</h1>
						<p className="text-gray-600 mt-1">Track progress by tehsil across all districts</p>
					</div>
				</div>
			</div>

			{/* Filters */}
			<div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
				<div className="flex flex-wrap items-end gap-4">
					<div className="flex-1 min-w-[200px]">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							<Filter className="h-4 w-4 inline mr-1" />
							District
						</label>
						<select
							value={selectedDistrict}
							onChange={(e) => {
								setSelectedDistrict(e.target.value);
								setSelectedTehsil("");
							}}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						>
							<option value="">All Districts</option>
							{districts.map((district) => (
								<option key={district} value={district}>
									{district}
								</option>
							))}
						</select>
					</div>
					<div className="flex-1 min-w-[200px]">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							<MapPin className="h-4 w-4 inline mr-1" />
							Tehsil
						</label>
						<select
							value={selectedTehsil}
							onChange={(e) => setSelectedTehsil(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							disabled={!selectedDistrict}
						>
							<option value="">All Tehsils</option>
							{tehsils.map((tehsil) => (
								<option key={tehsil} value={tehsil}>
									{tehsil}
								</option>
							))}
						</select>
					</div>
					<div className="flex gap-2">
						<button
							onClick={fetchTrackingData}
							className="px-4 py-2 bg-[#0b4d2b] text-white rounded-md hover:bg-[#0a3d22] transition-colors flex items-center gap-2"
						>
							<RefreshCw className="h-4 w-4" />
							Refresh
						</button>
						<button
							onClick={handleReset}
							className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
						>
							Reset
						</button>
					</div>
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-gray-600">Total Tehsils</p>
							<p className="text-2xl font-bold text-gray-900 mt-1">{tehsilProgress.length}</p>
						</div>
						<MapPin className="h-8 w-8 text-[#0b4d2b]" />
					</div>
				</div>
				<div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-gray-600">Total Activities</p>
							<p className="text-2xl font-bold text-gray-900 mt-1">
								{tehsilProgress.reduce((sum, tp) => sum + tp.totalActivities, 0)}
							</p>
						</div>
						<Activity className="h-8 w-8 text-blue-600" />
					</div>
				</div>
				<div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-gray-600">Total Beneficiaries</p>
							<p className="text-2xl font-bold text-gray-900 mt-1">
								{tehsilProgress.reduce((sum, tp) => sum + tp.totalBeneficiaries, 0).toLocaleString()}
							</p>
						</div>
						<Users className="h-8 w-8 text-purple-600" />
					</div>
				</div>
				<div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-gray-600">Avg. Progress</p>
							<p className="text-2xl font-bold text-gray-900 mt-1">
								{tehsilProgress.length > 0
									? `${Math.round(tehsilProgress.reduce((sum, tp) => sum + tp.overallProgress, 0) / tehsilProgress.length)}%`
									: "0%"}
							</p>
						</div>
						<TrendingUp className="h-8 w-8 text-green-600" />
					</div>
				</div>
			</div>

			{/* Tehsil Progress List */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
				<div className="p-4 border-b border-gray-200 bg-gray-50">
					<h2 className="text-lg font-semibold text-gray-900">Tehsil Progress Details</h2>
				</div>
				<div className="divide-y divide-gray-200">
					{tehsilProgress.length === 0 ? (
						<div className="p-8 text-center text-gray-500">
							<MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
							<p>No data available for the selected filters.</p>
						</div>
					) : (
						tehsilProgress.map((progress) => {
							const tehsilKey = `${progress.district}-${progress.tehsil}`;
							const isExpanded = expandedTehsils.has(tehsilKey);
							
							return (
								<div key={tehsilKey} className="p-4 hover:bg-gray-50 transition-colors">
									<div 
										className="flex items-center justify-between cursor-pointer"
										onClick={() => toggleTehsil(tehsilKey)}
									>
										<div className="flex-1">
											<div className="flex items-center gap-3">
												<MapPin className="h-5 w-5 text-[#0b4d2b]" />
												<div>
													<h3 className="text-lg font-semibold text-gray-900">
														{progress.tehsil}
													</h3>
													<p className="text-sm text-gray-600">{progress.district}</p>
												</div>
											</div>
										</div>
										<div className="flex items-center gap-6">
											<div className="text-right">
												<p className="text-sm text-gray-600">Activities</p>
												<p className="text-lg font-semibold text-gray-900">{progress.totalActivities}</p>
											</div>
											<div className="text-right">
												<p className="text-sm text-gray-600">Progress</p>
												<p className="text-lg font-semibold text-gray-900">
													{Math.round(progress.overallProgress)}%
												</p>
											</div>
											<div className="text-right">
												<p className="text-sm text-gray-600">Weighted</p>
												<p className="text-lg font-semibold text-gray-900">
													{Math.round(progress.weightedProgress)}%
												</p>
											</div>
											<div className="w-32">
												<div className="h-2 bg-gray-200 rounded-full overflow-hidden">
													<div
														className="h-full bg-[#0b4d2b] transition-all"
														style={{ width: `${Math.min(progress.overallProgress, 100)}%` }}
													/>
												</div>
											</div>
										</div>
									</div>
									
									{isExpanded && (
										<div className="mt-4 pt-4 border-t border-gray-200">
											<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
												<div className="bg-blue-50 p-3 rounded-lg">
													<p className="text-sm text-gray-600">Planned Targets</p>
													<p className="text-xl font-bold text-blue-900">{progress.totalPlanned.toLocaleString()}</p>
												</div>
												<div className="bg-green-50 p-3 rounded-lg">
													<p className="text-sm text-gray-600">Achieved Targets</p>
													<p className="text-xl font-bold text-green-900">{progress.totalAchieved.toLocaleString()}</p>
												</div>
												<div className="bg-purple-50 p-3 rounded-lg">
													<p className="text-sm text-gray-600">Beneficiaries</p>
													<p className="text-xl font-bold text-purple-900">{progress.totalBeneficiaries.toLocaleString()}</p>
												</div>
											</div>
											
											<div className="overflow-x-auto">
												<table className="min-w-full divide-y divide-gray-200">
													<thead className="bg-gray-50">
														<tr>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Activity
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Planned
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Achieved
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Progress
															</th>
															<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Beneficiaries
															</th>
														</tr>
													</thead>
													<tbody className="bg-white divide-y divide-gray-200">
														{progress.activities.map((activity, idx) => (
															<tr key={idx} className="hover:bg-gray-50">
																<td className="px-4 py-3 whitespace-nowrap">
																	<div className="text-sm font-medium text-gray-900">
																		{activity.Sub_Sub_ActivityName || activity.SubActivityName || activity.MainActivityName}
																	</div>
																	<div className="text-xs text-gray-500">{activity.Output}</div>
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{activity.PlannedTargets?.toLocaleString() || 0}
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{activity.AchievedTargets?.toLocaleString() || 0}
																</td>
																<td className="px-4 py-3 whitespace-nowrap">
																	<div className="flex items-center gap-2">
																		<div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
																			<div
																				className="h-full bg-[#0b4d2b]"
																				style={{ width: `${Math.min(activity.ActivityProgress || 0, 100)}%` }}
																			/>
																		</div>
																		<span className="text-sm text-gray-900">
																			{Math.round(activity.ActivityProgress || 0)}%
																		</span>
																	</div>
																</td>
																<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
																	{activity.Total_Beneficiaries?.toLocaleString() || 0}
																</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										</div>
									)}
								</div>
							);
						})
					)}
				</div>
			</div>
		</div>
	);
}

