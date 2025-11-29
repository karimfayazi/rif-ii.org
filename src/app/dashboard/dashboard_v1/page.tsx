"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Activity, ChevronDown, ChevronUp, Info } from "lucide-react";

type OutputWeightage = {
	OutputID: string;
	TotalWeightage: number;
};

type ActivityProgress = {
	ActivityID: string | number;
	MainActivityName: string;
	OutputID: string | number;
	Weightage_of_Main_Activity: number;
	TotalActivityWeightageProgress: number;
	OutputWeightage: number;
};

export default function DashboardV1Page() {
	const [outputWeightage, setOutputWeightage] = useState<OutputWeightage[]>([]);
	const [activityProgress, setActivityProgress] = useState<ActivityProgress[]>([]);
	const [loading, setLoading] = useState(true);
	const [expandedSections, setExpandedSections] = useState({
		outputA: false,
		outputB: false,
		outputC: false,
	});
	const [showFormula, setShowFormula] = useState(false);

	useEffect(() => {
		fetchOutputWeightage();
		fetchActivityProgress();
	}, []);

	const fetchOutputWeightage = async () => {
		try {
			const response = await fetch('/api/tracking-sheet/output-weightage');
			const data = await response.json();

			if (data.success) {
				setOutputWeightage(data.outputWeightage || []);
			} else {
				console.error("Failed to fetch output weightage:", data.message);
			}
		} catch (err) {
			console.error("Error fetching output weightage:", err);
		}
	};

	const fetchActivityProgress = async () => {
		try {
			const response = await fetch('/api/tracking-sheet/activity-progress-summary');
			const data = await response.json();

			if (data.success) {
				setActivityProgress(data.activityProgress || []);
			} else {
				console.error("Failed to fetch activity progress:", data.message);
			}
		} catch (err) {
			console.error("Error fetching activity progress:", err);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Dashboard - Process Tracking</h1>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900">Dashboard - Process Tracking</h1>
			</div>

			{/* Output Weightage Section */}
			<div className="space-y-6">
				<div>
					<h2 className="text-2xl font-bold text-gray-900">Output Weightage</h2>
					<p className="text-gray-600 mt-2">Total weightage by output</p>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
					{(() => {
						// Get weightage for Output A, B, C
						let outputA = 0;
						let outputB = 0;
						let outputC = 0;
						let outputAId = 'N/A';
						let outputBId = 'N/A';
						let outputCId = 'N/A';
						
						// Try to find by OutputID matching A/1, B/2, C/3
						const foundA = outputWeightage.find(item => {
							const id = item.OutputID?.toString().toUpperCase().trim();
							return id === 'A' || id === '1' || id === 'OUTPUT A' || id === 'OUTPUTA';
						});
						const foundB = outputWeightage.find(item => {
							const id = item.OutputID?.toString().toUpperCase().trim();
							return id === 'B' || id === '2' || id === 'OUTPUT B' || id === 'OUTPUTB';
						});
						const foundC = outputWeightage.find(item => {
							const id = item.OutputID?.toString().toUpperCase().trim();
							return id === 'C' || id === '3' || id === 'OUTPUT C' || id === 'OUTPUTC';
						});
						
						// If not found by ID, try to get first 3 outputs in order
						if (!foundA && outputWeightage.length > 0) {
							outputA = outputWeightage[0]?.TotalWeightage || 0;
							outputAId = outputWeightage[0]?.OutputID || 'N/A';
						} else {
							outputA = foundA?.TotalWeightage || 0;
							outputAId = foundA?.OutputID || 'N/A';
						}
						
						if (!foundB && outputWeightage.length > 1) {
							outputB = outputWeightage[1]?.TotalWeightage || 0;
							outputBId = outputWeightage[1]?.OutputID || 'N/A';
						} else {
							outputB = foundB?.TotalWeightage || 0;
							outputBId = foundB?.OutputID || 'N/A';
						}
						
						if (!foundC && outputWeightage.length > 2) {
							outputC = outputWeightage[2]?.TotalWeightage || 0;
							outputCId = outputWeightage[2]?.OutputID || 'N/A';
						} else {
							outputC = foundC?.TotalWeightage || 0;
							outputCId = foundC?.OutputID || 'N/A';
						}
						
						const total = outputA + outputB + outputC;

						// If no data found, show message
						if (outputWeightage.length === 0) {
							return (
								<div className="col-span-4 bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
									<p className="text-yellow-800">No output weightage data available</p>
								</div>
							);
						}

						return (
							<>
								<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
									<div className="flex items-center">
										<div className="p-2 bg-blue-100 rounded-lg">
											<TrendingUp className="h-6 w-6 text-blue-600" />
										</div>
										<div className="ml-4">
											<p className="text-sm font-medium text-gray-600">Total Output A</p>
											<p className="text-2xl font-bold text-gray-900">{outputA}</p>
											<p className="text-xs text-gray-500 mt-1">ID: {outputAId}</p>
										</div>
									</div>
								</div>

								<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
									<div className="flex items-center">
										<div className="p-2 bg-green-100 rounded-lg">
											<TrendingUp className="h-6 w-6 text-green-600" />
										</div>
										<div className="ml-4">
											<p className="text-sm font-medium text-gray-600">Total Output B</p>
											<p className="text-2xl font-bold text-gray-900">{outputB}</p>
											<p className="text-xs text-gray-500 mt-1">ID: {outputBId}</p>
										</div>
									</div>
								</div>

								<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
									<div className="flex items-center">
										<div className="p-2 bg-purple-100 rounded-lg">
											<TrendingUp className="h-6 w-6 text-purple-600" />
										</div>
										<div className="ml-4">
											<p className="text-sm font-medium text-gray-600">Total Output C</p>
											<p className="text-2xl font-bold text-gray-900">{outputC}</p>
											<p className="text-xs text-gray-500 mt-1">ID: {outputCId}</p>
										</div>
									</div>
								</div>

								<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
									<div className="flex items-center">
										<div className="p-2 bg-orange-100 rounded-lg">
											<TrendingUp className="h-6 w-6 text-orange-600" />
										</div>
										<div className="ml-4">
											<p className="text-sm font-medium text-gray-600">Total</p>
											<p className="text-2xl font-bold text-gray-900">{total}</p>
										</div>
									</div>
								</div>
							</>
						);
					})()}
				</div>
			</div>

			{/* Progress Section */}
			<div className="space-y-6">
				<div>
					<h2 className="text-2xl font-bold text-gray-900">Progress %</h2>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
					{(() => {
						// Group activities by OutputID
						const outputAGroup = activityProgress.filter(item => {
							const id = item.OutputID?.toString().toUpperCase().trim();
							return id === 'A' || id === '1' || id === 'OUTPUT A' || id === 'OUTPUTA';
						});
						const outputBGroup = activityProgress.filter(item => {
							const id = item.OutputID?.toString().toUpperCase().trim();
							return id === 'B' || id === '2' || id === 'OUTPUT B' || id === 'OUTPUTB';
						});
						const outputCGroup = activityProgress.filter(item => {
							const id = item.OutputID?.toString().toUpperCase().trim();
							return id === 'C' || id === '3' || id === 'OUTPUT C' || id === 'OUTPUTC';
						});

						// Calculate Progress % for Output A, B, C (simple sum of OutputWeightage)
						const outputASum = Math.round(outputAGroup.reduce((sum, item) => sum + (item.OutputWeightage || 0), 0));
						const outputBSum = Math.round(outputBGroup.reduce((sum, item) => sum + (item.OutputWeightage || 0), 0));
						const outputCSum = Math.round(outputCGroup.reduce((sum, item) => sum + (item.OutputWeightage || 0), 0));
						
						// Get Output Weightage values (from Output Weightage section)
						let outputAWeightage = 0;
						let outputBWeightage = 0;
						let outputCWeightage = 0;
						
						const foundA = outputWeightage.find(item => {
							const id = item.OutputID?.toString().toUpperCase().trim();
							return id === 'A' || id === '1' || id === 'OUTPUT A' || id === 'OUTPUTA';
						});
						const foundB = outputWeightage.find(item => {
							const id = item.OutputID?.toString().toUpperCase().trim();
							return id === 'B' || id === '2' || id === 'OUTPUT B' || id === 'OUTPUTB';
						});
						const foundC = outputWeightage.find(item => {
							const id = item.OutputID?.toString().toUpperCase().trim();
							return id === 'C' || id === '3' || id === 'OUTPUT C' || id === 'OUTPUTC';
						});
						
						if (!foundA && outputWeightage.length > 0) {
							outputAWeightage = outputWeightage[0]?.TotalWeightage || 0;
						} else {
							outputAWeightage = foundA?.TotalWeightage || 0;
						}
						
						if (!foundB && outputWeightage.length > 1) {
							outputBWeightage = outputWeightage[1]?.TotalWeightage || 0;
						} else {
							outputBWeightage = foundB?.TotalWeightage || 0;
						}
						
						if (!foundC && outputWeightage.length > 2) {
							outputCWeightage = outputWeightage[2]?.TotalWeightage || 0;
						} else {
							outputCWeightage = foundC?.TotalWeightage || 0;
						}
						
						// Calculate Total Progress % using Weight Percentage Formula: (Percentage × Weightage) ÷ 100
						// Formula: (Output A Progress % × Output A Weightage) ÷ 100 + (Output B Progress % × Output B Weightage) ÷ 100 + (Output C Progress % × Output C Weightage) ÷ 100
						const totalProgressRaw = 
							((outputASum * outputAWeightage) / 100) +
							((outputBSum * outputBWeightage) / 100) +
							((outputCSum * outputCWeightage) / 100);
						
						// Show one decimal place (e.g., 28.5%)
						const totalProgress = Math.round(totalProgressRaw * 10) / 10;

						return (
							<>
								<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
									<div className="flex items-center">
										<div className="p-2 bg-blue-100 rounded-lg">
											<TrendingUp className="h-6 w-6 text-blue-600" />
										</div>
										<div className="ml-4">
											<p className="text-sm font-medium text-gray-600">Output A</p>
											<p className="text-2xl font-bold text-gray-900">{outputASum}%</p>
										</div>
									</div>
								</div>

								<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
									<div className="flex items-center">
										<div className="p-2 bg-green-100 rounded-lg">
											<TrendingUp className="h-6 w-6 text-green-600" />
										</div>
										<div className="ml-4">
											<p className="text-sm font-medium text-gray-600">Output B</p>
											<p className="text-2xl font-bold text-gray-900">{outputBSum}%</p>
										</div>
									</div>
								</div>

								<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
									<div className="flex items-center">
										<div className="p-2 bg-purple-100 rounded-lg">
											<TrendingUp className="h-6 w-6 text-purple-600" />
										</div>
										<div className="ml-4">
											<p className="text-sm font-medium text-gray-600">Output C</p>
											<p className="text-2xl font-bold text-gray-900">{outputCSum}%</p>
										</div>
									</div>
								</div>

								<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
									<div className="flex items-center justify-between">
										<div className="flex items-center">
											<div className="p-2 bg-orange-100 rounded-lg">
												<TrendingUp className="h-6 w-6 text-orange-600" />
											</div>
											<div className="ml-4">
												<p className="text-sm font-medium text-gray-600">Total Progress %</p>
												<p className="text-2xl font-bold text-gray-900">{totalProgress.toFixed(1)}%</p>
											</div>
										</div>
										<button
											onClick={() => setShowFormula(!showFormula)}
											className="p-2 hover:bg-orange-50 rounded-lg transition-colors"
											title="Show/Hide Formula"
										>
											<Info className="h-5 w-5 text-orange-600" />
										</button>
									</div>
									{showFormula && (
										<div className="mt-4 pt-4 border-t border-gray-200">
											<p className="text-xs text-gray-500 mb-2">Formula:</p>
											<p className="text-xs font-mono text-gray-700">
												Total Progress % = (Total Output A × Progress % Output A) / 100 + (Total Output B × Progress % Output B) / 100 + (Total Output C × Progress % Output C) / 100
											</p>
											<p className="text-xs text-gray-500 mt-2">
												Calculation: ({outputAWeightage} × {outputASum}) / 100 + ({outputBWeightage} × {outputBSum}) / 100 + ({outputCWeightage} × {outputCSum}) / 100 = {totalProgress.toFixed(1)}%
											</p>
										</div>
									)}
								</div>
							</>
						);
					})()}
				</div>
			</div>

			{/* Activity Progress Summary Report */}
			{(() => {
				// Group activities by OutputID
				const outputAGroup = activityProgress.filter(item => {
					const id = item.OutputID?.toString().toUpperCase().trim();
					return id === 'A' || id === '1' || id === 'OUTPUT A' || id === 'OUTPUTA';
				});
				const outputBGroup = activityProgress.filter(item => {
					const id = item.OutputID?.toString().toUpperCase().trim();
					return id === 'B' || id === '2' || id === 'OUTPUT B' || id === 'OUTPUTB';
				});
				const outputCGroup = activityProgress.filter(item => {
					const id = item.OutputID?.toString().toUpperCase().trim();
					return id === 'C' || id === '3' || id === 'OUTPUT C' || id === 'OUTPUTC';
				});

				const toggleSection = (section: 'outputA' | 'outputB' | 'outputC') => {
					setExpandedSections(prev => ({
						...prev,
						[section]: !prev[section]
					}));
				};

				return (
					<div className="space-y-8">
						{/* Three Buttons Row */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							{/* Output A Button */}
							<button
								onClick={() => toggleSection('outputA')}
								className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
							>
								<h2 className="text-[10px] font-bold text-gray-900">
									Output A - Progress
								</h2>
								{expandedSections.outputA ? (
									<ChevronUp className="h-6 w-6 text-gray-600" />
								) : (
									<ChevronDown className="h-6 w-6 text-gray-600" />
								)}
							</button>

							{/* Output B Button */}
							<button
								onClick={() => toggleSection('outputB')}
								className="flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
							>
								<h2 className="text-[10px] font-bold text-gray-900">
									Output B - Progress
								</h2>
								{expandedSections.outputB ? (
									<ChevronUp className="h-6 w-6 text-gray-600" />
								) : (
									<ChevronDown className="h-6 w-6 text-gray-600" />
								)}
							</button>

							{/* Output C Button */}
							<button
								onClick={() => toggleSection('outputC')}
								className="flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
							>
								<h2 className="text-[10px] font-bold text-gray-900">
									Output C - Progress
								</h2>
								{expandedSections.outputC ? (
									<ChevronUp className="h-6 w-6 text-gray-600" />
								) : (
									<ChevronDown className="h-6 w-6 text-gray-600" />
								)}
							</button>
						</div>

						{/* Output A Section */}
						{expandedSections.outputA && outputAGroup.length > 0 && (
							<div className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
									{outputAGroup.map((activity, index) => (
										<div key={index} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
											<div className="flex items-center mb-3">
												<div className="p-2 bg-blue-100 rounded-lg">
													<Activity className="h-5 w-5 text-blue-600" />
												</div>
												<div className="ml-2">
													<p className="text-xs font-medium text-gray-600">Activity ID</p>
													<p className="text-sm font-bold text-gray-900">{activity.ActivityID}</p>
												</div>
											</div>
											<div className="space-y-2">
												<div>
													<p className="text-xs text-gray-500">Weightage of Main Activity</p>
													<p className="text-lg font-semibold text-gray-900">{activity.Weightage_of_Main_Activity || 0}</p>
												</div>
												<div>
													<p className="text-xs text-gray-500">Total Activity Weightage Progress</p>
													<p className="text-lg font-semibold text-gray-900">{activity.TotalActivityWeightageProgress || 0}</p>
												</div>
												<div>
													<p className="text-xs text-gray-500">Output Weightage</p>
													<p className="text-lg font-semibold text-blue-600">{Math.round(activity.OutputWeightage || 0)}%</p>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Output B Section */}
						{expandedSections.outputB && outputBGroup.length > 0 && (
							<div className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
									{outputBGroup.map((activity, index) => (
										<div key={index} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
											<div className="flex items-center mb-3">
												<div className="p-2 bg-green-100 rounded-lg">
													<Activity className="h-5 w-5 text-green-600" />
												</div>
												<div className="ml-2">
													<p className="text-xs font-medium text-gray-600">Activity ID</p>
													<p className="text-sm font-bold text-gray-900">{activity.ActivityID}</p>
												</div>
											</div>
											<div className="space-y-2">
												<div>
													<p className="text-xs text-gray-500">Weightage of Main Activity</p>
													<p className="text-lg font-semibold text-gray-900">{activity.Weightage_of_Main_Activity || 0}</p>
												</div>
												<div>
													<p className="text-xs text-gray-500">Total Activity Weightage Progress</p>
													<p className="text-lg font-semibold text-gray-900">{activity.TotalActivityWeightageProgress || 0}</p>
												</div>
												<div>
													<p className="text-xs text-gray-500">Output Weightage</p>
													<p className="text-lg font-semibold text-green-600">{Math.round(activity.OutputWeightage || 0)}%</p>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Output C Section */}
						{expandedSections.outputC && outputCGroup.length > 0 && (
							<div className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
									{outputCGroup.map((activity, index) => (
										<div key={index} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
											<div className="flex items-center mb-3">
												<div className="p-2 bg-purple-100 rounded-lg">
													<Activity className="h-5 w-5 text-purple-600" />
												</div>
												<div className="ml-2">
													<p className="text-xs font-medium text-gray-600">Activity ID</p>
													<p className="text-sm font-bold text-gray-900">{activity.ActivityID}</p>
												</div>
											</div>
											<div className="space-y-2">
												<div>
													<p className="text-xs text-gray-500">Weightage of Main Activity</p>
													<p className="text-lg font-semibold text-gray-900">{activity.Weightage_of_Main_Activity || 0}</p>
												</div>
												<div>
													<p className="text-xs text-gray-500">Total Activity Weightage Progress</p>
													<p className="text-lg font-semibold text-gray-900">{activity.TotalActivityWeightageProgress || 0}</p>
												</div>
												<div>
													<p className="text-xs text-gray-500">Output Weightage</p>
													<p className="text-lg font-semibold text-purple-600">{Math.round(activity.OutputWeightage || 0)}%</p>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{activityProgress.length === 0 && !loading && (
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
								<p className="text-yellow-800">No activity progress data available</p>
							</div>
						)}
					</div>
				);
			})()}
		</div>
	);
}

