"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
	Filter, 
	Download, 
	RefreshCw, 
	Calendar,
	Users,
	User,
	UserCheck,
	BarChart3,
	Plus,
	Edit,
	Trash2,
	Eye,
	X
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";

type TrainingEvent = {
	SN?: number;
	TrainingTitle?: string;
	Output?: string;
	SubNo?: string;
	SubActivityName?: string;
	EventType?: string;
	Venue?: string;
	LocationTehsil?: string;
	District?: string;
	StartDate?: string;
	EndDate?: string;
	TotalDays?: number;
	TrainingFacilitatorName?: string;
	TMAMale?: number;
	TMAFemale?: number;
	PHEDMale?: number;
	PHEDFemale?: number;
	LGRDMale?: number;
	LGRDFemale?: number;
	PDDMale?: number;
	PDDFemale?: number;
	CommunityMale?: number;
	CommunityFemale?: number;
	AnyOtherMale?: number;
	AnyOtherFemale?: number;
	AnyOtherSpecify?: string;
	TotalMale?: number;
	TotalFemale?: number;
	TotalParticipants?: number;
	PreTrainingEvaluation?: string;
	PostTrainingEvaluation?: string;
	EventAgendas?: string;
	ExpectedOutcomes?: string;
	ChallengesFaced?: string;
	SuggestedActions?: string;
	ActivityCompletionReportLink?: string;
	ParticipantListAttachment?: string;
	PictureAttachment?: string;
	Remarks?: string;
	DataCompilerName?: string;
	DataVerifiedBy?: string;
	CreatedDate?: string;
	LastModifiedDate?: string;
};

const DISTRICT_OPTIONS = ["All", "DIK", "Bannu"];
const TRAINING_FACILITATOR_OPTIONS = [
	"Nasrullah/Rehana",
	"Nasrullah/Asia",
	"Dr. Gohar Ali",
	"Nasrullah"
];

export default function TrainingPage() {
	const router = useRouter();
	const { user, getUserId } = useAuth();
	const userId = user?.id || getUserId();
	const { isAdmin, loading: accessLoading } = useAccess(userId);
	
	const [trainingData, setTrainingData] = useState<TrainingEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
	const [viewingRecord, setViewingRecord] = useState<TrainingEvent | null>(null);
	const [selectedDistrict, setSelectedDistrict] = useState("");
	const [selectedOutput, setSelectedOutput] = useState("");
	const [selectedEventType, setSelectedEventType] = useState("");
	const [selectedLocationTehsil, setSelectedLocationTehsil] = useState("");
	const [selectedTrainingFacilitator, setSelectedTrainingFacilitator] = useState("");
	const [outputs, setOutputs] = useState<string[]>([]);
	const [eventTypes, setEventTypes] = useState<string[]>([]);
	const [locationTehsils, setLocationTehsils] = useState<string[]>([]);

	const fetchTrainingData = useCallback(async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (selectedDistrict && selectedDistrict !== "All") params.append('district', selectedDistrict);
			if (selectedOutput) params.append('output', selectedOutput);
			if (selectedEventType) params.append('eventType', selectedEventType);
			if (selectedLocationTehsil) params.append('locationTehsil', selectedLocationTehsil);
			if (selectedTrainingFacilitator) params.append('trainingFacilitator', selectedTrainingFacilitator);

			const response = await fetch(`/api/training?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setTrainingData(data.trainingData || []);
				
				// Extract unique values for filters
				const uniqueOutputs = [...new Set(data.trainingData.map((item: TrainingEvent) => item.Output).filter(Boolean))] as string[];
				const uniqueEventTypes = [...new Set(data.trainingData.map((item: TrainingEvent) => item.EventType).filter(Boolean))] as string[];
				const uniqueLocationTehsils = [...new Set(data.trainingData.map((item: TrainingEvent) => item.LocationTehsil).filter(Boolean))] as string[];
				
				setOutputs(uniqueOutputs);
				setEventTypes(uniqueEventTypes);
				setLocationTehsils(uniqueLocationTehsils);
			} else {
				setError(data.message || "Failed to fetch training data");
			}
		} catch (err) {
			setError("Error fetching training data");
			console.error("Error fetching training data:", err);
		} finally {
			setLoading(false);
		}
	}, [selectedDistrict, selectedOutput, selectedEventType, selectedLocationTehsil, selectedTrainingFacilitator]);

	useEffect(() => {
		fetchTrainingData();
	}, [fetchTrainingData]);

	const handleSearch = () => {
		fetchTrainingData();
	};

	const handleReset = () => {
		setSelectedDistrict("");
		setSelectedOutput("");
		setSelectedEventType("");
		setSelectedLocationTehsil("");
		setSelectedTrainingFacilitator("");
	};

	const formatNumber = (num: number | null | undefined) => {
		if (!num && num !== 0) return "0";
		return num.toLocaleString();
	};

	const handleEdit = (sn: number | undefined) => {
		if (sn) {
			router.push(`/dashboard/training/add?id=${sn}`);
		}
	};

	const handleDelete = async (sn: number | undefined) => {
		if (!sn) return;
		
		if (!confirm("Are you sure you want to delete this training event? This action cannot be undone.")) {
			return;
		}

		try {
			setDeleteLoading(sn);
			const response = await fetch(`/api/training/delete`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ id: sn }),
			});

			const data = await response.json();

			if (data.success) {
				// Remove the deleted item from the list
				setTrainingData(prev => prev.filter(item => item.SN !== sn));
			} else {
				alert(data.message || "Failed to delete training event");
			}
		} catch (err) {
			console.error("Error deleting training event:", err);
			alert("Error deleting training event");
		} finally {
			setDeleteLoading(null);
		}
	};

	const handleView = (item: TrainingEvent) => {
		setViewingRecord(item);
	};

	const closeViewModal = () => {
		setViewingRecord(null);
	};

	// Filter data based on selected filters
	const filteredData = trainingData.filter(item => {
		const matchesDistrict = !selectedDistrict || selectedDistrict === "All" || item.District === selectedDistrict;
		const matchesOutput = !selectedOutput || item.Output === selectedOutput;
		const matchesEventType = !selectedEventType || item.EventType === selectedEventType;
		const matchesLocationTehsil = !selectedLocationTehsil || item.LocationTehsil === selectedLocationTehsil;
		const matchesTrainingFacilitator = !selectedTrainingFacilitator || item.TrainingFacilitatorName === selectedTrainingFacilitator;
		
		return matchesDistrict && matchesOutput && matchesEventType && matchesLocationTehsil && matchesTrainingFacilitator;
	});

	// Calculate summary statistics
	const totalDays = filteredData.reduce((sum, item) => sum + (item.TotalDays || 0), 0);
	const totalMale = filteredData.reduce((sum, item) => sum + (item.TotalMale || 0), 0);
	const totalFemale = filteredData.reduce((sum, item) => sum + (item.TotalFemale || 0), 0);
	const totalParticipants = filteredData.reduce((sum, item) => sum + (item.TotalParticipants || 0), 0);

	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Training, Capacity Building & Awareness</h1>
					<p className="text-gray-600 mt-2">View and manage training events</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading training data...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Training, Capacity Building & Awareness</h1>
					<p className="text-gray-600 mt-2">View and manage training events</p>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600">{error}</p>
					<button
						onClick={fetchTrainingData}
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
					<h1 className="text-2xl font-bold text-gray-900">Training, Capacity Building & Awareness</h1>
					<p className="text-gray-600 mt-2">View and manage training events</p>
				</div>
				<div className="flex items-center space-x-3">
					{isAdmin && !accessLoading && (
						<a
							href="/dashboard/training/add"
							className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
						>
							<Plus className="h-4 w-4 mr-2" />
							Add Record
						</a>
					)}
					<button
						onClick={fetchTrainingData}
						className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
					>
						<RefreshCw className="h-4 w-4 mr-2" />
						Refresh
					</button>
				</div>
			</div>

			{/* Filters */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
				<div className="flex items-center mb-4">
					<Filter className="h-5 w-5 text-gray-500 mr-2" />
					<h2 className="text-lg font-semibold text-gray-900">Filters</h2>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{/* District Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							District
						</label>
						<select
							value={selectedDistrict}
							onChange={(e) => setSelectedDistrict(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						>
							<option value="">All</option>
							{DISTRICT_OPTIONS.filter(d => d !== "All").map((district) => (
								<option key={district} value={district}>
									{district}
								</option>
							))}
						</select>
					</div>

					{/* Training Facilitator Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Training Facilitator
						</label>
						<select
							value={selectedTrainingFacilitator}
							onChange={(e) => setSelectedTrainingFacilitator(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						>
							<option value="">All Training Facilitators</option>
							{TRAINING_FACILITATOR_OPTIONS.map((facilitator) => (
								<option key={facilitator} value={facilitator}>
									{facilitator}
								</option>
							))}
						</select>
					</div>

					{/* Output Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Output
						</label>
						<select
							value={selectedOutput}
							onChange={(e) => setSelectedOutput(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						>
							<option value="">All Outputs</option>
							{outputs.map((output) => (
								<option key={output} value={output}>
									{output}
								</option>
							))}
						</select>
					</div>

					{/* Event Type Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Event Type
						</label>
						<select
							value={selectedEventType}
							onChange={(e) => setSelectedEventType(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						>
							<option value="">All Event Types</option>
							{eventTypes.map((type) => (
								<option key={type} value={type}>
									{type}
								</option>
							))}
						</select>
					</div>

					{/* Location Tehsil Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Location Tehsil
						</label>
						<select
							value={selectedLocationTehsil}
							onChange={(e) => setSelectedLocationTehsil(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						>
							<option value="">All Tehsils</option>
							{locationTehsils.map((tehsil) => (
								<option key={tehsil} value={tehsil}>
									{tehsil}
								</option>
							))}
						</select>
					</div>

				</div>

				{/* Search and Reset Buttons */}
				<div className="flex justify-end gap-3 mt-4">
					<button
						onClick={handleReset}
						className="inline-flex items-center px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
					>
						Reset
					</button>
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
				{/* Total Number of Days */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<div className="flex items-center">
						<div className="p-2 bg-blue-100 rounded-lg">
							<Calendar className="h-6 w-6 text-blue-600" />
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Total Number of Days</p>
							<p className="text-2xl font-bold text-gray-900">
								{formatNumber(totalDays)}
							</p>
						</div>
					</div>
				</div>

				{/* Male Participants */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<div className="flex items-center">
						<div className="p-2 bg-green-100 rounded-lg">
							<User className="h-6 w-6 text-green-600" />
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Male</p>
							<p className="text-2xl font-bold text-gray-900">
								{formatNumber(totalMale)}
							</p>
						</div>
					</div>
				</div>

				{/* Female Participants */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<div className="flex items-center">
						<div className="p-2 bg-pink-100 rounded-lg">
							<UserCheck className="h-6 w-6 text-pink-600" />
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Female</p>
							<p className="text-2xl font-bold text-gray-900">
								{formatNumber(totalFemale)}
							</p>
						</div>
					</div>
				</div>

				{/* Total Participants */}
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<div className="flex items-center">
						<div className="p-2 bg-purple-100 rounded-lg">
							<Users className="h-6 w-6 text-purple-600" />
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Total Participant</p>
							<p className="text-2xl font-bold text-gray-900">
								{formatNumber(totalParticipants)}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Training Data Grid */}
			{filteredData.length === 0 ? (
				<div className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center">
					<BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
					<h3 className="text-lg font-medium text-gray-900 mb-2">No training events found</h3>
					<p className="text-gray-600">
						{selectedDistrict || selectedOutput || selectedEventType || selectedLocationTehsil || selectedTrainingFacilitator
							? "Try adjusting your search criteria" 
							: "No training data available"
						}
					</p>
				</div>
			) : (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Training Details</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Training Facilitator</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Output</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{filteredData.map((item, index) => (
									<tr key={item.SN || index} className="hover:bg-gray-50">
										<td className="px-6 py-4">
											<div className="space-y-1">
												<div className="text-sm font-semibold text-gray-900">
													{item.TrainingTitle || "N/A"}
												</div>
												{item.EventType && (
													<div className="text-xs text-gray-500">
														Type: {item.EventType}
													</div>
												)}
												{item.Venue && (
													<div className="text-xs text-gray-500">
														Venue: {item.Venue}
													</div>
												)}
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="text-sm text-gray-900">
												{item.District && <div>{item.District}</div>}
												{item.LocationTehsil && <div className="text-xs text-gray-500">{item.LocationTehsil}</div>}
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="text-sm text-gray-900">
												{item.StartDate && <div>Start: {item.StartDate}</div>}
												{item.EndDate && <div className="text-xs text-gray-500">End: {item.EndDate}</div>}
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="text-sm font-medium text-gray-900">
												{formatNumber(item.TotalDays)}
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="text-sm text-gray-900">
												<div>Male: {formatNumber(item.TotalMale)}</div>
												<div>Female: {formatNumber(item.TotalFemale)}</div>
												<div className="font-semibold">Total: {formatNumber(item.TotalParticipants)}</div>
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="text-sm text-gray-900">
												{item.TrainingFacilitatorName || "N/A"}
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="text-sm text-gray-900">
												{item.Output || "N/A"}
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="flex items-center space-x-2">
												<button
													onClick={() => handleView(item)}
													className="inline-flex items-center px-3 py-1.5 text-sm text-green-600 bg-green-50 rounded hover:bg-green-100 transition-colors"
													title="View"
												>
													<Eye className="h-4 w-4" />
												</button>
												{isAdmin && !accessLoading && (
													<>
														<button
															onClick={() => handleEdit(item.SN)}
															className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
															title="Edit"
														>
															<Edit className="h-4 w-4" />
														</button>
														<button
															onClick={() => handleDelete(item.SN)}
															disabled={deleteLoading === item.SN}
															className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
															title="Delete"
														>
															{deleteLoading === item.SN ? (
																<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
															) : (
																<Trash2 className="h-4 w-4" />
															)}
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
					{/* Results Count */}
					<div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
						<p className="text-sm text-gray-600">
							Showing <span className="font-medium">{filteredData.length}</span> training event{filteredData.length !== 1 ? 's' : ''}
						</p>
					</div>
				</div>
			)}

			{/* View Modal */}
			{viewingRecord && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
						<div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
							<h2 className="text-xl font-bold text-gray-900">Training Event Details</h2>
							<button
								onClick={closeViewModal}
								className="text-gray-400 hover:text-gray-600 transition-colors"
							>
								<X className="h-6 w-6" />
							</button>
						</div>
						<div className="p-6 space-y-6">
							{/* Basic Information */}
							<div>
								<h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label className="text-sm font-medium text-gray-500">Training Title</label>
										<p className="text-sm text-gray-900 mt-1">{viewingRecord.TrainingTitle || "N/A"}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">Event Type</label>
										<p className="text-sm text-gray-900 mt-1">{viewingRecord.EventType || "N/A"}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">Output</label>
										<p className="text-sm text-gray-900 mt-1">{viewingRecord.Output || "N/A"}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">Sub No</label>
										<p className="text-sm text-gray-900 mt-1">{viewingRecord.SubNo || "N/A"}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">Sub Activity Name</label>
										<p className="text-sm text-gray-900 mt-1">{viewingRecord.SubActivityName || "N/A"}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">Training Facilitator</label>
										<p className="text-sm text-gray-900 mt-1">{viewingRecord.TrainingFacilitatorName || "N/A"}</p>
									</div>
								</div>
							</div>

							{/* Location & Dates */}
							<div>
								<h3 className="text-lg font-semibold text-gray-900 mb-4">Location & Dates</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label className="text-sm font-medium text-gray-500">District</label>
										<p className="text-sm text-gray-900 mt-1">{viewingRecord.District || "N/A"}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">Location Tehsil</label>
										<p className="text-sm text-gray-900 mt-1">{viewingRecord.LocationTehsil || "N/A"}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">Venue</label>
										<p className="text-sm text-gray-900 mt-1">{viewingRecord.Venue || "N/A"}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">Start Date</label>
										<p className="text-sm text-gray-900 mt-1">{viewingRecord.StartDate || "N/A"}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">End Date</label>
										<p className="text-sm text-gray-900 mt-1">{viewingRecord.EndDate || "N/A"}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">Total Days</label>
										<p className="text-sm text-gray-900 mt-1">{formatNumber(viewingRecord.TotalDays)}</p>
									</div>
								</div>
							</div>

							{/* Participants */}
							<div>
								<h3 className="text-lg font-semibold text-gray-900 mb-4">Participants</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label className="text-sm font-medium text-gray-500">TMA Male</label>
										<p className="text-sm text-gray-900 mt-1">{formatNumber(viewingRecord.TMAMale)}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">TMA Female</label>
										<p className="text-sm text-gray-900 mt-1">{formatNumber(viewingRecord.TMAFemale)}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">PHED Male</label>
										<p className="text-sm text-gray-900 mt-1">{formatNumber(viewingRecord.PHEDMale)}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">PHED Female</label>
										<p className="text-sm text-gray-900 mt-1">{formatNumber(viewingRecord.PHEDFemale)}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">LGRD Male</label>
										<p className="text-sm text-gray-900 mt-1">{formatNumber(viewingRecord.LGRDMale)}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">LGRD Female</label>
										<p className="text-sm text-gray-900 mt-1">{formatNumber(viewingRecord.LGRDFemale)}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">PDD Male</label>
										<p className="text-sm text-gray-900 mt-1">{formatNumber(viewingRecord.PDDMale)}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">PDD Female</label>
										<p className="text-sm text-gray-900 mt-1">{formatNumber(viewingRecord.PDDFemale)}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">Community Male</label>
										<p className="text-sm text-gray-900 mt-1">{formatNumber(viewingRecord.CommunityMale)}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">Community Female</label>
										<p className="text-sm text-gray-900 mt-1">{formatNumber(viewingRecord.CommunityFemale)}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">Any Other Male</label>
										<p className="text-sm text-gray-900 mt-1">{formatNumber(viewingRecord.AnyOtherMale)}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">Any Other Female</label>
										<p className="text-sm text-gray-900 mt-1">{formatNumber(viewingRecord.AnyOtherFemale)}</p>
									</div>
									{viewingRecord.AnyOtherSpecify && (
										<div className="col-span-2">
											<label className="text-sm font-medium text-gray-500">Any Other Specify</label>
											<p className="text-sm text-gray-900 mt-1">{viewingRecord.AnyOtherSpecify}</p>
										</div>
									)}
									<div>
										<label className="text-sm font-medium text-gray-500">Total Male</label>
										<p className="text-sm font-semibold text-gray-900 mt-1">{formatNumber(viewingRecord.TotalMale)}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">Total Female</label>
										<p className="text-sm font-semibold text-gray-900 mt-1">{formatNumber(viewingRecord.TotalFemale)}</p>
									</div>
									<div>
										<label className="text-sm font-medium text-gray-500">Total Participants</label>
										<p className="text-sm font-bold text-gray-900 mt-1">{formatNumber(viewingRecord.TotalParticipants)}</p>
									</div>
								</div>
							</div>

							{/* Event Details */}
							{(viewingRecord.EventAgendas || viewingRecord.ExpectedOutcomes || viewingRecord.ChallengesFaced || viewingRecord.SuggestedActions) && (
								<div>
									<h3 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h3>
									<div className="space-y-4">
										{viewingRecord.EventAgendas && (
											<div>
												<label className="text-sm font-medium text-gray-500">Event Agendas</label>
												<p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{viewingRecord.EventAgendas}</p>
											</div>
										)}
										{viewingRecord.ExpectedOutcomes && (
											<div>
												<label className="text-sm font-medium text-gray-500">Expected Outcomes</label>
												<p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{viewingRecord.ExpectedOutcomes}</p>
											</div>
										)}
										{viewingRecord.ChallengesFaced && (
											<div>
												<label className="text-sm font-medium text-gray-500">Challenges Faced</label>
												<p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{viewingRecord.ChallengesFaced}</p>
											</div>
										)}
										{viewingRecord.SuggestedActions && (
											<div>
												<label className="text-sm font-medium text-gray-500">Suggested Actions</label>
												<p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{viewingRecord.SuggestedActions}</p>
											</div>
										)}
									</div>
								</div>
							)}

							{/* Evaluations */}
							{(viewingRecord.PreTrainingEvaluation || viewingRecord.PostTrainingEvaluation) && (
								<div>
									<h3 className="text-lg font-semibold text-gray-900 mb-4">Evaluations</h3>
									<div className="space-y-4">
										{viewingRecord.PreTrainingEvaluation && (
											<div>
												<label className="text-sm font-medium text-gray-500">Pre Training Evaluation</label>
												<p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{viewingRecord.PreTrainingEvaluation}</p>
											</div>
										)}
										{viewingRecord.PostTrainingEvaluation && (
											<div>
												<label className="text-sm font-medium text-gray-500">Post Training Evaluation</label>
												<p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{viewingRecord.PostTrainingEvaluation}</p>
											</div>
										)}
									</div>
								</div>
							)}

							{/* Additional Information */}
							<div>
								<h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{viewingRecord.ActivityCompletionReportLink && (
										<div>
											<label className="text-sm font-medium text-gray-500">Activity Completion Report Link</label>
											<p className="text-sm text-gray-900 mt-1 break-all">{viewingRecord.ActivityCompletionReportLink}</p>
										</div>
									)}
									{viewingRecord.ParticipantListAttachment && (
										<div>
											<label className="text-sm font-medium text-gray-500">Participant List Attachment</label>
											<p className="text-sm text-gray-900 mt-1 break-all">{viewingRecord.ParticipantListAttachment}</p>
										</div>
									)}
									{viewingRecord.PictureAttachment && (
										<div>
											<label className="text-sm font-medium text-gray-500">Picture Attachment</label>
											<p className="text-sm text-gray-900 mt-1 break-all">{viewingRecord.PictureAttachment}</p>
										</div>
									)}
									{viewingRecord.DataCompilerName && (
										<div>
											<label className="text-sm font-medium text-gray-500">Data Compiler Name</label>
											<p className="text-sm text-gray-900 mt-1">{viewingRecord.DataCompilerName}</p>
										</div>
									)}
									{viewingRecord.DataVerifiedBy && (
										<div>
											<label className="text-sm font-medium text-gray-500">Data Verified By</label>
											<p className="text-sm text-gray-900 mt-1">{viewingRecord.DataVerifiedBy}</p>
										</div>
									)}
									{viewingRecord.CreatedDate && (
										<div>
											<label className="text-sm font-medium text-gray-500">Created Date</label>
											<p className="text-sm text-gray-900 mt-1">{viewingRecord.CreatedDate}</p>
										</div>
									)}
									{viewingRecord.LastModifiedDate && (
										<div>
											<label className="text-sm font-medium text-gray-500">Last Modified Date</label>
											<p className="text-sm text-gray-900 mt-1">{viewingRecord.LastModifiedDate}</p>
										</div>
									)}
								</div>
								{viewingRecord.Remarks && (
									<div className="mt-4">
										<label className="text-sm font-medium text-gray-500">Remarks</label>
										<p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{viewingRecord.Remarks}</p>
									</div>
								)}
							</div>
						</div>
						<div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
							<button
								onClick={closeViewModal}
								className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
