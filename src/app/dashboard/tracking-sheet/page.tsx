"use client";

import { useEffect, useState, useCallback } from "react";
import { 
	Filter, 
	Download, 
	RefreshCw, 
	BarChart3, 
	Target, 
	Calendar, 
	MapPin, 
	Users, 
	Activity,
	Eye,
	ExternalLink,
	Plus,
	Edit,
	Trash2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";

type TrackingData = {
	id?: number;
	OutputID: number;
	Output: string;
	MainActivityName: string;
	SubActivityName: string;
	Sub_Sub_ActivityID_ID: number;
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
	SubActivityID: number;
	ActivityID: number;
	Sub_Sub_ActivityID: number;
};

export default function TrackingSheetPage() {
	const { user, getUserId } = useAuth();
	const userId = user?.id || getUserId();
	const { isAdmin, loading: accessLoading } = useAccess(userId);
	
	const [trackingData, setTrackingData] = useState<TrackingData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedSubSubActivityID, setSelectedSubSubActivityID] = useState("");
	const [selectedSector, setSelectedSector] = useState("");
	const [selectedDistrict, setSelectedDistrict] = useState("");
	const [selectedTehsil, setSelectedTehsil] = useState("");
	const [selectedOutputID, setSelectedOutputID] = useState("");
	const [selectedActivityID, setSelectedActivityID] = useState("");
	const [selectedSubActivityID, setSelectedSubActivityID] = useState("");
	const [sectors, setSectors] = useState<string[]>([]);
	const [districts, setDistricts] = useState<string[]>([]);
	const [tehsils, setTehsils] = useState<string[]>([]);
	const [outputIDs, setOutputIDs] = useState<string[]>([]);
	const [activityIDs, setActivityIDs] = useState<string[]>([]);
	const [subActivityIDs, setSubActivityIDs] = useState<string[]>([]);
	const [subSubActivityIDs, setSubSubActivityIDs] = useState<Array<{id: number, activityName: string}>>([]);
	const [subSubActivityIDToActivityName, setSubSubActivityIDToActivityName] = useState<Map<number, string>>(new Map());
	const [subSubActivityIDToSubSubActivityName, setSubSubActivityIDToSubSubActivityName] = useState<Map<number, string>>(new Map());
	

	const fetchTrackingData = useCallback(async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (selectedSector) params.append('sector', selectedSector);
			if (selectedDistrict) params.append('district', selectedDistrict);
			if (selectedTehsil) params.append('tehsil', selectedTehsil);
			if (selectedOutputID) params.append('outputID', selectedOutputID);
			if (selectedActivityID) params.append('activityID', selectedActivityID);
			if (selectedSubActivityID) params.append('subActivityID', selectedSubActivityID);
			if (selectedSubSubActivityID) params.append('subSubActivityID', selectedSubSubActivityID);

			const response = await fetch(`/api/tracking-sheet?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setTrackingData(data.trackingData || []);
				
				// Extract unique values for filters
				const uniqueSectors = [...new Set(data.trackingData.map((item: TrackingData) => item.Sector_Name).filter(Boolean))] as string[];
				const uniqueDistricts = [...new Set(data.trackingData.map((item: TrackingData) => item.District).filter(Boolean))] as string[];
				const uniqueTehsils = [...new Set(data.trackingData.map((item: TrackingData) => item.Tehsil).filter(Boolean))] as string[];
				const uniqueOutputIDs = [...new Set(data.trackingData.map((item: TrackingData) => item.OutputID).filter(Boolean))] as string[];
				const uniqueActivityIDs = [...new Set(data.trackingData.map((item: TrackingData) => item.ActivityID).filter(Boolean))].map(String);
				const uniqueSubActivityIDs = [...new Set(data.trackingData.map((item: TrackingData) => item.SubActivityID).filter(Boolean))].map(String);
				
				// Extract unique Sub_Sub_ActivityIDs with their corresponding MainActivityName and Sub_Sub_ActivityName
				const subSubActivityMap = new Map<number, string>();
				const subSubActivityNameMap = new Map<number, string>();
				data.trackingData.forEach((item: TrackingData) => {
					if (item.Sub_Sub_ActivityID) {
						if (item.MainActivityName) {
							subSubActivityMap.set(item.Sub_Sub_ActivityID, item.MainActivityName);
						}
						if (item.Sub_Sub_ActivityName) {
							subSubActivityNameMap.set(item.Sub_Sub_ActivityID, item.Sub_Sub_ActivityName);
						}
					}
				});
				
				const uniqueSubSubActivityIDs = Array.from(subSubActivityMap.entries())
					.map(([id, activityName]) => ({ id, activityName }))
					.sort((a, b) => a.id - b.id);
				
				setSectors(uniqueSectors);
				setDistricts(uniqueDistricts);
				setTehsils(uniqueTehsils);
				setOutputIDs(uniqueOutputIDs);
				setActivityIDs(uniqueActivityIDs);
				setSubActivityIDs(uniqueSubActivityIDs);
				setSubSubActivityIDs(uniqueSubSubActivityIDs);
				setSubSubActivityIDToActivityName(subSubActivityMap);
				setSubSubActivityIDToSubSubActivityName(subSubActivityNameMap);
			} else {
				setError(data.message || "Failed to fetch tracking data");
			}
		} catch (err) {
			setError("Error fetching tracking data");
			console.error("Error fetching tracking data:", err);
		} finally {
			setLoading(false);
		}
	}, [selectedSector, selectedDistrict, selectedTehsil, selectedOutputID, selectedActivityID, selectedSubActivityID, selectedSubSubActivityID]);

	useEffect(() => {
		fetchTrackingData();
	}, [fetchTrackingData]);

	const handleSearch = () => {
		fetchTrackingData();
	};

	const handleReset = () => {
		setSelectedSubSubActivityID("");
		setSelectedSector("");
		setSelectedDistrict("");
		setSelectedTehsil("");
		setSelectedOutputID("");
		setSelectedActivityID("");
		setSelectedSubActivityID("");
		fetchTrackingData();
	};

	// CRUD Functions
	const handleEditRecord = (record: TrackingData) => {
		// TODO: Implement edit functionality
		console.log('Edit record:', record);
	};

	const handleDeleteRecord = async (record: TrackingData) => {
		if (!record.id) return;
		
		if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
			return;
		}

		try {
			const response = await fetch('/api/tracking-sheet/delete', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ id: record.id }),
			});

			const data = await response.json();

			if (data.success) {
				await fetchTrackingData(); // Refresh data
				alert('Record deleted successfully');
			} else {
				alert(data.message || 'Failed to delete record');
			}
		} catch (error) {
			console.error('Error deleting record:', error);
			alert('Error deleting record');
		}
	};


	const getProgressColor = (progress: number) => {
		if (progress >= 80) return "bg-green-500";
		if (progress >= 60) return "bg-yellow-500";
		if (progress >= 40) return "bg-orange-500";
		return "bg-red-500";
	};

	const getProgressTextColor = (progress: number) => {
		if (progress >= 80) return "text-green-700";
		if (progress >= 60) return "text-yellow-700";
		if (progress >= 40) return "text-orange-700";
		return "text-red-700";
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return "N/A";
		return dateString;
	};

	const formatNumber = (num: number) => {
		if (!num) return "0";
		return num.toLocaleString();
	};

	// Filter data based on search and filters
	const filteredData = trackingData.filter(item => {
		const matchesSubSubActivityID = !selectedSubSubActivityID || item.Sub_Sub_ActivityID.toString() === selectedSubSubActivityID;
		
		const matchesSector = !selectedSector || item.Sector_Name === selectedSector;
		const matchesDistrict = !selectedDistrict || item.District === selectedDistrict;
		const matchesTehsil = !selectedTehsil || item.Tehsil === selectedTehsil;
		const matchesOutputID = !selectedOutputID || item.OutputID.toString() === selectedOutputID;
		const matchesActivityID = !selectedActivityID || item.ActivityID.toString() === selectedActivityID;
		const matchesSubActivityID = !selectedSubActivityID || item.SubActivityID.toString() === selectedSubActivityID;
		
		return matchesSubSubActivityID && matchesSector && matchesDistrict && matchesTehsil && matchesOutputID && matchesActivityID && matchesSubActivityID;
	});

	// Deduplicate by Sub_Sub_ActivityID to show only unique Sub-Sub-Activity IDs in gridview
	const uniqueFilteredData = filteredData.filter((item, index, self) => {
		// Keep only the first occurrence of each Sub_Sub_ActivityID
		// Convert to string for comparison to handle both number and string types
		const currentId = item.Sub_Sub_ActivityID?.toString();
		return index === self.findIndex((t) => t.Sub_Sub_ActivityID?.toString() === currentId);
	});

	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Tracking Sheet</h1>
					<p className="text-gray-600 mt-2">Monitor project activities and progress</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading tracking data...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Tracking Sheet</h1>
					<p className="text-gray-600 mt-2">Monitor project activities and progress</p>
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
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Tracking Sheet</h1>
					<p className="text-gray-600 mt-2">Monitor project activities and progress</p>
				</div>
				<div className="flex items-center space-x-3">
					{isAdmin && !accessLoading && (
						<a
							href="/dashboard/tracking-sheet/add"
							className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
						>
							<Plus className="h-4 w-4 mr-2" />
							Add Record
						</a>
					)}
					<button
						onClick={fetchTrackingData}
						className="inline-flex items-center px-4 py-2 text-[#0b4d2b] bg-[#0b4d2b]/10 rounded-lg hover:bg-[#0b4d2b]/20 transition-colors"
					>
						<RefreshCw className="h-4 w-4 mr-2" />
						Refresh
					</button>
					<button className="inline-flex items-center px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors">
						<Download className="h-4 w-4 mr-2" />
						Export
					</button>
				</div>
			</div>

			{/* Search and Filters */}
			<div className="bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 shadow-lg p-6">
				<div className="flex items-center justify-between mb-4">
					<div>
						<h3 className="text-lg font-semibold text-gray-900">Search & Filter Activities</h3>
						<p className="text-sm text-gray-600">Find specific activities by name, sector, or location</p>
					</div>
					<div className="flex items-center space-x-4">
						<div className="flex items-center space-x-2">
							<div className="h-2 w-2 bg-green-500 rounded-full"></div>
							<span className="text-xs text-gray-500 font-medium">Live Search</span>
						</div>
						<button
							onClick={handleReset}
							className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200"
						>
							<Filter className="h-3 w-3 mr-1" />
							Reset
						</button>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-8 gap-4">
					{/* Sub-Sub-Activity ID Dropdown */}
					<div className="md:col-span-2">
						<label className="block text-sm font-medium text-gray-700 mb-2">Sub-Sub-Activity ID</label>
						<select
							value={selectedSubSubActivityID}
							onChange={(e) => setSelectedSubSubActivityID(e.target.value)}
							className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						>
							<option value="">All Sub-Sub-Activity IDs</option>
							{subSubActivityIDs.map((item) => (
								<option key={item.id} value={item.id.toString()}>
									{item.id}
								</option>
							))}
						</select>
						{/* Display Sub-Sub-Activity Name as label below the dropdown */}
						{selectedSubSubActivityID && subSubActivityIDToSubSubActivityName.has(Number(selectedSubSubActivityID)) && (
							<label className="block text-sm text-gray-600 mt-2">
								Sub-Sub-Activity Name: <span className="font-medium text-gray-900">{subSubActivityIDToSubSubActivityName.get(Number(selectedSubSubActivityID))}</span>
							</label>
						)}
					</div>

					{/* Output ID Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Output ID</label>
						<select
							value={selectedOutputID}
							onChange={(e) => setSelectedOutputID(e.target.value)}
							className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						>
							<option value="">All Output IDs</option>
							{outputIDs.map((outputID) => (
								<option key={outputID} value={outputID}>
									{outputID}
								</option>
							))}
						</select>
					</div>

					{/* Activity ID Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Activity ID</label>
						<select
							value={selectedActivityID}
							onChange={(e) => setSelectedActivityID(e.target.value)}
							className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						>
							<option value="">All Activity IDs</option>
							{activityIDs.map((activityID) => (
								<option key={activityID} value={activityID}>
									{activityID}
								</option>
							))}
						</select>
					</div>

					{/* Sub Activity ID Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Sub Activity ID</label>
						<select
							value={selectedSubActivityID}
							onChange={(e) => setSelectedSubActivityID(e.target.value)}
							className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						>
							<option value="">All Sub Activity IDs</option>
							{subActivityIDs.map((subActivityID) => (
								<option key={subActivityID} value={subActivityID}>
									{subActivityID}
								</option>
							))}
						</select>
					</div>

					{/* Sector Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Sector</label>
						<select
							value={selectedSector}
							onChange={(e) => setSelectedSector(e.target.value)}
							className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						>
							<option value="">All Sectors</option>
							{sectors.map((sector) => (
								<option key={sector} value={sector}>
									{sector}
								</option>
							))}
						</select>
					</div>

					{/* District Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">District</label>
						<select
							value={selectedDistrict}
							onChange={(e) => setSelectedDistrict(e.target.value)}
							className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						>
							<option value="">All Districts</option>
							{districts.map((district) => (
								<option key={district} value={district}>
									{district}
								</option>
							))}
						</select>
					</div>

					{/* Tehsil Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Tehsil</label>
						<select
							value={selectedTehsil}
							onChange={(e) => setSelectedTehsil(e.target.value)}
							className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						>
							<option value="">All Tehsils</option>
							{tehsils.map((tehsil) => (
								<option key={tehsil} value={tehsil}>
									{tehsil}
								</option>
							))}
						</select>
					</div>

				</div>

				{/* Search Button */}
				<div className="flex justify-end mt-4">
					<button
						onClick={handleSearch}
						className="inline-flex items-center px-6 py-3 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors shadow-sm"
					>
						<Filter className="h-4 w-4 mr-2" />
						Apply Filters
					</button>
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<div className="flex items-center">
						<div className="p-2 bg-blue-100 rounded-lg">
							<Activity className="h-6 w-6 text-blue-600" />
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Total Activities</p>
							<p className="text-2xl font-bold text-gray-900">
								{uniqueFilteredData.length}
							</p>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<div className="flex items-center">
						<div className="p-2 bg-green-100 rounded-lg">
							<Target className="h-6 w-6 text-green-600" />
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Avg Progress</p>
							<p className="text-2xl font-bold text-gray-900">
								{uniqueFilteredData.length > 0 
									? Math.round(uniqueFilteredData.reduce((sum, item) => sum + (item.ActivityProgress || 0), 0) / uniqueFilteredData.length)
									: 0}%
							</p>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<div className="flex items-center">
						<div className="p-2 bg-purple-100 rounded-lg">
							<Users className="h-6 w-6 text-purple-600" />
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Total Beneficiaries</p>
							<p className="text-2xl font-bold text-gray-900">
								{formatNumber(uniqueFilteredData.reduce((sum, item) => sum + (item.Total_Beneficiaries || 0), 0))}
							</p>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<div className="flex items-center">
						<div className="p-2 bg-orange-100 rounded-lg">
							<MapPin className="h-6 w-6 text-orange-600" />
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Districts</p>
							<p className="text-2xl font-bold text-gray-900">
								{new Set(uniqueFilteredData.map(item => item.District).filter(Boolean)).size}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Tracking Data Grid */}
			{uniqueFilteredData.length === 0 ? (
				<div className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center">
					<BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
					<h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
					<p className="text-gray-600">
						{selectedSubSubActivityID || selectedSector || selectedDistrict || selectedTehsil 
							? "Try adjusting your search criteria" 
							: "No tracking data available"
						}
					</p>
				</div>
			) : (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Output & Activities</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Targets</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiaries</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{uniqueFilteredData.map((item, index) => (
									<tr key={index} className="hover:bg-gray-50">
										<td className="px-6 py-4">
											<div className="space-y-2">
												{/* Output */}
												<div className="border-b border-gray-200 pb-2">
													<div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
														<span className="font-bold">Output</span> | <span className="text-blue-600 font-medium">{item.OutputID}</span>
													</div>
													<div className="text-sm text-gray-900 leading-tight">
														{item.Output}
													</div>
												</div>
												
												{/* Main Activity */}
												<div className="border-b border-gray-200 pb-2">
													<div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
														<span className="font-bold">Main Activity</span> | <span className="text-blue-600 font-medium">{item.ActivityID}</span>
													</div>
													<div className="text-sm text-gray-900">
														{item.MainActivityName}
													</div>
												</div>
												
												{/* Sub Activity */}
												<div className="border-b border-gray-200 pb-2">
													<div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
														<span className="font-bold">Sub Activity</span> | <span className="text-blue-600 font-medium">{item.SubActivityID}</span>
													</div>
													<div className="text-sm text-gray-900">
														{item.SubActivityName}
													</div>
												</div>
												
												{/* Sub-Sub Activity */}
												{item.Sub_Sub_ActivityID && (
													<div className="border-b border-gray-200 pb-2">
														<div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
															<span className="font-bold">Sub-Sub Activity</span> | <span className="text-blue-600 font-medium">{item.Sub_Sub_ActivityID}</span>
														</div>
														<div className="text-sm text-gray-900">
															{item.Sub_Sub_ActivityName || 'N/A'}
														</div>
													</div>
												)}
												
												{/* Sector */}
												<div className="border-b border-gray-200 pb-2">
													<div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Sector</div>
													<div className="text-sm text-gray-900">
														{item.Sector_Name}
													</div>
												</div>

											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="flex items-center">
												<div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
													<div
														className={`h-2 rounded-full ${getProgressColor(item.ActivityProgress || 0)}`}
														style={{ width: `${Math.min(item.ActivityProgress || 0, 100)}%` }}
													></div>
												</div>
												<span className={`text-sm font-medium ${getProgressTextColor(item.ActivityProgress || 0)}`}>
													{item.ActivityProgress || 0}%
												</span>
											</div>
											<div className="text-xs text-gray-500 mt-1">
												Weight: {item.ActivityWeightage || 0}%
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											<div className="font-medium">
												{formatNumber(item.AchievedTargets || 0)} / {formatNumber(item.PlannedTargets || 0)}
											</div>
											<div className="text-xs text-gray-500">
												{item.UnitName}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											<div className="flex items-center">
												<MapPin className="h-4 w-4 text-gray-400 mr-1" />
												<div>
													<div className="font-medium">{item.District}</div>
													<div className="text-xs text-gray-500">{item.Tehsil}</div>
												</div>
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											<div className="font-medium">
												{formatNumber(item.Total_Beneficiaries || 0)}
											</div>
											<div className="text-xs text-gray-500">
												M: {formatNumber(item.Beneficiaries_Male || 0)} | F: {formatNumber(item.Beneficiaries_Female || 0)}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											<div className="flex items-center">
												<Calendar className="h-4 w-4 text-gray-400 mr-1" />
												<div>
													<div className="text-xs">Start: {formatDate(item.PlannedStartDate)}</div>
													<div className="text-xs">End: {formatDate(item.PlannedEndDate)}</div>
												</div>
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
											<div className="flex items-center space-x-2">
												<button 
													onClick={() => {
														const params = new URLSearchParams();
														params.append('subSubActivityID', item.Sub_Sub_ActivityID?.toString() || '');
														params.append('outputID', item.OutputID?.toString() || '');
														params.append('activityID', item.ActivityID?.toString() || '');
														params.append('subActivityID', item.SubActivityID?.toString() || '');
														window.location.href = `/dashboard/tracking-sheet/sub-sub-activity?${params.toString()}`;
													}}
													className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
													title="View Sub-Sub Activity Details"
												>
													<Eye className="h-4 w-4" />
												</button>
												{item.Links && (
													<a 
														href={item.Links} 
														target="_blank" 
														rel="noopener noreferrer"
														className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
														title="Open External Link"
													>
														<ExternalLink className="h-4 w-4" />
													</a>
												)}
												{isAdmin && !accessLoading && (
													<>
														<button 
															onClick={() => handleEditRecord(item)}
															className="text-yellow-600 hover:text-yellow-900 p-1 rounded hover:bg-yellow-50 transition-colors"
															title="Edit Record"
														>
															<Edit className="h-4 w-4" />
														</button>
														<button 
															onClick={() => handleDeleteRecord(item)}
															className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
															title="Delete Record"
														>
															<Trash2 className="h-4 w-4" />
														</button>
													</>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Results Count */}
			{uniqueFilteredData.length > 0 && (
				<div className="text-center text-sm text-gray-500">
					Showing {uniqueFilteredData.length} unique Sub-Sub-Activity {uniqueFilteredData.length !== 1 ? 'IDs' : 'ID'} 
					({filteredData.length} total record{filteredData.length !== 1 ? 's' : ''})
					{(selectedSubSubActivityID || selectedSector || selectedDistrict || selectedTehsil) && ' matching your criteria'}
				</div>
			)}

		</div>
	);
}