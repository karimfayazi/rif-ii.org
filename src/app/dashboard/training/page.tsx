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
	X,
	FileText,
	Image as ImageIcon,
	FileDown,
	AlertCircle,
	Loader2,
	CheckCircle,
	ArrowLeft
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";
import * as XLSX from "xlsx";

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
	const { accessAdd, accessEdit, accessDelete, trainingSection, loading: accessLoading } = useAccess(userId);
	
	const [trainingData, setTrainingData] = useState<TrainingEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
	const [viewingRecord, setViewingRecord] = useState<TrainingEvent | null>(null);
	const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; record: TrainingEvent | null }>({ show: false, record: null });
	const [selectedDistrict, setSelectedDistrict] = useState("");
	const [selectedOutput, setSelectedOutput] = useState("");
	const [selectedEventType, setSelectedEventType] = useState("");
	const [selectedLocationTehsil, setSelectedLocationTehsil] = useState("");
	const [selectedTrainingFacilitator, setSelectedTrainingFacilitator] = useState("");
	const [trainingName, setTrainingName] = useState("");
	const [eventDate, setEventDate] = useState("");
	const [outputs, setOutputs] = useState<string[]>([]);
	const [eventTypes, setEventTypes] = useState<string[]>([]);
	const [locationTehsils, setLocationTehsils] = useState<string[]>([]);
	const [showFilters, setShowFilters] = useState<boolean>(true);

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
		setTrainingName("");
		setEventDate("");
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

	const handleDelete = async () => {
		if (!deleteConfirm.record || !deleteConfirm.record.SN) return;

		const recordSn = deleteConfirm.record.SN;

		try {
			setDeleteLoading(recordSn);
			const response = await fetch(`/api/training/delete`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ id: recordSn }),
			});

			const data = await response.json();

			if (data.success) {
				setDeleteConfirm({ show: false, record: null });
				setSuccess('Training event deleted successfully');
				setError(null);
				// Remove the deleted item from the list
				setTrainingData(prev => prev.filter(item => item.SN !== recordSn));
				// Auto-hide success message after 3 seconds
				setTimeout(() => {
					setSuccess(null);
				}, 3000);
			} else {
				setError(data.message || "Failed to delete training event");
				setSuccess(null);
				setDeleteConfirm({ show: false, record: null });
			}
		} catch (err) {
			console.error("Error deleting training event:", err);
			setError("Error deleting training event");
			setSuccess(null);
			setDeleteConfirm({ show: false, record: null });
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

	const handleDownloadFile = async (filePath: string, fileName: string) => {
		try {
			// Construct the full URL
			const fullPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
			const url = `${window.location.origin}${fullPath}`;
			
			// Fetch the file
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error('File not found');
			}
			
			// Get the blob
			const blob = await response.blob();
			
			// Create a download link
			const downloadUrl = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = downloadUrl;
			link.download = fileName || filePath.split('/').pop() || 'download';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(downloadUrl);
		} catch (error) {
			console.error('Error downloading file:', error);
			alert('Failed to download file. Please check if the file exists.');
		}
	};

	const handleDownloadPictures = async (picturePath: string) => {
		try {
			// Picture path might contain multiple files separated by comma
			const paths = picturePath.split(',').map(p => p.trim());
			
			for (const path of paths) {
				const fullPath = path.startsWith('/') ? path : `/${path}`;
				const url = `${window.location.origin}${fullPath}`;
				
				const response = await fetch(url);
				if (!response.ok) {
					console.warn(`File not found: ${path}`);
					continue;
				}
				
				const blob = await response.blob();
				const downloadUrl = window.URL.createObjectURL(blob);
				const link = document.createElement('a');
				link.href = downloadUrl;
				link.download = path.split('/').pop() || 'picture.jpg';
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				window.URL.revokeObjectURL(downloadUrl);
				
				// Small delay between downloads
				await new Promise(resolve => setTimeout(resolve, 500));
			}
		} catch (error) {
			console.error('Error downloading pictures:', error);
			alert('Failed to download pictures. Please check if the files exist.');
		}
	};

	// Filter data based on selected filters
	const filteredData = trainingData.filter(item => {
		const matchesDistrict = !selectedDistrict || selectedDistrict === "All" || item.District === selectedDistrict;
		const matchesOutput = !selectedOutput || item.Output === selectedOutput;
		const matchesEventType = !selectedEventType || item.EventType === selectedEventType;
		const matchesLocationTehsil = !selectedLocationTehsil || item.LocationTehsil === selectedLocationTehsil;
		const matchesTrainingFacilitator = !selectedTrainingFacilitator || item.TrainingFacilitatorName === selectedTrainingFacilitator;
		const matchesTrainingName = !trainingName || (item.TrainingTitle && item.TrainingTitle.toLowerCase().includes(trainingName.toLowerCase()));
		const matchesEventDate = !eventDate || item.StartDate === eventDate;
		
		return matchesDistrict && matchesOutput && matchesEventType && matchesLocationTehsil && matchesTrainingFacilitator && matchesTrainingName && matchesEventDate;
	});

	// Calculate summary statistics
	const totalDays = filteredData.reduce((sum, item) => sum + (item.TotalDays || 0), 0);
	const totalMale = filteredData.reduce((sum, item) => sum + (item.TotalMale || 0), 0);
	const totalFemale = filteredData.reduce((sum, item) => sum + (item.TotalFemale || 0), 0);
	const totalParticipants = filteredData.reduce((sum, item) => sum + (item.TotalParticipants || 0), 0);

	const handleExportToExcel = () => {
		try {
			// Prepare data for Excel export
			const exportData = filteredData.map((item, index) => ({
				"SN": item.SN || index + 1,
				"Training Title": item.TrainingTitle || "",
				"Output": item.Output || "",
				"Sub No": item.SubNo || "",
				"Sub Activity Name": item.SubActivityName || "",
				"Event Type": item.EventType || "",
				"Venue": item.Venue || "",
				"Location Tehsil": item.LocationTehsil || "",
				"District": item.District || "",
				"Start Date": item.StartDate || "",
				"End Date": item.EndDate || "",
				"Total Days": item.TotalDays || 0,
				"Training Facilitator Name": item.TrainingFacilitatorName || "",
				"TMA Male": item.TMAMale || 0,
				"TMA Female": item.TMAFemale || 0,
				"PHED Male": item.PHEDMale || 0,
				"PHED Female": item.PHEDFemale || 0,
				"LGRD Male": item.LGRDMale || 0,
				"LGRD Female": item.LGRDFemale || 0,
				"PDD Male": item.PDDMale || 0,
				"PDD Female": item.PDDFemale || 0,
				"Community Male": item.CommunityMale || 0,
				"Community Female": item.CommunityFemale || 0,
				"Any Other Male": item.AnyOtherMale || 0,
				"Any Other Female": item.AnyOtherFemale || 0,
				"Any Other Specify": item.AnyOtherSpecify || "",
				"Total Male": item.TotalMale || 0,
				"Total Female": item.TotalFemale || 0,
				"Total Participants": item.TotalParticipants || 0,
				"Pre Training Evaluation": item.PreTrainingEvaluation || "",
				"Post Training Evaluation": item.PostTrainingEvaluation || "",
				"Event Agendas": item.EventAgendas || "",
				"Expected Outcomes": item.ExpectedOutcomes || "",
				"Challenges Faced": item.ChallengesFaced || "",
				"Suggested Actions": item.SuggestedActions || "",
				"Activity Completion Report Link": item.ActivityCompletionReportLink || "",
				"Participant List Attachment": item.ParticipantListAttachment || "",
				"Picture Attachment": item.PictureAttachment || "",
				"Remarks": item.Remarks || "",
				"Data Compiler Name": item.DataCompilerName || "",
				"Data Verified By": item.DataVerifiedBy || "",
				"Created Date": item.CreatedDate || "",
				"Last Modified Date": item.LastModifiedDate || ""
			}));

			// Create a new workbook and worksheet
			const worksheet = XLSX.utils.json_to_sheet(exportData);
			const workbook = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(workbook, worksheet, "Training Data");

			// Set column widths for better readability
			const columnWidths = [
				{ wch: 8 },   // SN
				{ wch: 30 },  // Training Title
				{ wch: 20 },  // Output
				{ wch: 10 },  // Sub No
				{ wch: 25 },  // Sub Activity Name
				{ wch: 15 },  // Event Type
				{ wch: 25 },  // Venue
				{ wch: 18 },  // Location Tehsil
				{ wch: 12 },  // District
				{ wch: 12 },  // Start Date
				{ wch: 12 },  // End Date
				{ wch: 10 },  // Total Days
				{ wch: 25 },  // Training Facilitator Name
				{ wch: 10 },  // TMA Male
				{ wch: 12 },  // TMA Female
				{ wch: 12 },  // PHED Male
				{ wch: 14 },  // PHED Female
				{ wch: 12 },  // LGRD Male
				{ wch: 14 },  // LGRD Female
				{ wch: 10 },  // PDD Male
				{ wch: 12 },  // PDD Female
				{ wch: 15 },  // Community Male
				{ wch: 17 },  // Community Female
				{ wch: 15 },  // Any Other Male
				{ wch: 17 },  // Any Other Female
				{ wch: 18 },  // Any Other Specify
				{ wch: 12 },  // Total Male
				{ wch: 14 },  // Total Female
				{ wch: 18 },  // Total Participants
				{ wch: 25 },  // Pre Training Evaluation
				{ wch: 25 },  // Post Training Evaluation
				{ wch: 30 },  // Event Agendas
				{ wch: 25 },  // Expected Outcomes
				{ wch: 25 },  // Challenges Faced
				{ wch: 20 },  // Suggested Actions
				{ wch: 35 },  // Activity Completion Report Link
				{ wch: 30 },  // Participant List Attachment
				{ wch: 25 },  // Picture Attachment
				{ wch: 30 },  // Remarks
				{ wch: 20 },  // Data Compiler Name
				{ wch: 18 },  // Data Verified By
				{ wch: 15 },  // Created Date
				{ wch: 18 }   // Last Modified Date
			];
			worksheet['!cols'] = columnWidths;

			// Generate Excel file and download
			const fileName = `training_data_${new Date().toISOString().split('T')[0]}.xlsx`;
			XLSX.writeFile(workbook, fileName);
		} catch (error) {
			console.error('Error exporting to Excel:', error);
			alert('Failed to export data to Excel. Please try again.');
		}
	};

	if (accessLoading || loading) {
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

	if (!trainingSection) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Training, Capacity Building & Awareness</h1>
					<p className="text-gray-600 mt-2">View and manage training events</p>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<h2 className="text-xl font-semibold text-red-900 mb-2">Access Denied</h2>
					<p className="text-red-700">You do not have access to the Training Section. Please contact your administrator.</p>
				</div>
			</div>
		);
	}

	if (error && !trainingData.length) {
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
		<div className="space-y-3">
			{/* Success Message */}
			{success && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between animate-in slide-in-from-top">
					<div className="flex items-center">
						<CheckCircle className="h-5 w-5 text-green-600 mr-3" />
						<p className="text-green-800 font-medium">{success}</p>
					</div>
					<button
						onClick={() => setSuccess(null)}
						className="text-green-600 hover:text-green-800 transition-colors"
					>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			)}

			{/* Error Message */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
					<div className="flex items-center">
						<AlertCircle className="h-5 w-5 text-red-600 mr-3" />
						<p className="text-red-800 font-medium">{error}</p>
					</div>
					<button
						onClick={() => setError(null)}
						className="text-red-600 hover:text-red-800 transition-colors"
					>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			)}

			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Training, Capacity Building & Awareness</h1>
					<p className="text-sm text-gray-600 mt-1">View and manage training events</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={() => setShowFilters(prev => !prev)}
						className="inline-flex items-center justify-center px-4 py-2 h-10 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
					>
						<Filter className="h-4 w-4 mr-2 flex-shrink-0" />
						Filter On/Off
					</button>
					{accessAdd && trainingSection && !accessLoading && (
						<a
							href="/dashboard/training/add"
							className="inline-flex items-center justify-center px-4 py-2 h-10 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
						>
							<Plus className="h-4 w-4 mr-2 flex-shrink-0" />
							Add Record
						</a>
					)}
					<button
						onClick={() => router.push('/dashboard/training-workshops')}
						className="inline-flex items-center justify-center px-4 py-2 h-10 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
					>
						<ArrowLeft className="h-4 w-4 mr-2 flex-shrink-0" />
						Back to Training-Workshops
					</button>
					<button
						onClick={fetchTrainingData}
						className="inline-flex items-center justify-center px-4 py-2 h-10 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
					>
						<RefreshCw className="h-4 w-4 mr-2 flex-shrink-0" />
						Refresh
					</button>
					<button
						onClick={handleExportToExcel}
						disabled={filteredData.length === 0}
						className="inline-flex items-center justify-center px-4 py-2 h-10 text-sm font-medium bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
					>
						<Download className="h-4 w-4 mr-2 flex-shrink-0" />
						Export to Excel
					</button>
				</div>
			</div>

		{/* Filters */}
		{showFilters && (
			<div className="bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 shadow-lg p-3">
				<div className="flex items-center mb-2">
					<Filter className="h-4 w-4 text-gray-500 mr-2" />
					<h2 className="text-lg font-semibold text-gray-900">Filters</h2>
				</div>

				<div className="space-y-3">
					{/* Row 1: Training Name, District, Tehsil, Event Type */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
						{/* Training Name Filter */}
						<div className="min-w-0">
							<label className="block text-xs font-medium text-gray-700 mb-1">
								Training Name
							</label>
							<input
								type="text"
								value={trainingName}
								onChange={(e) => setTrainingName(e.target.value)}
								placeholder="Search by training name..."
								className="w-full h-9 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							/>
						</div>

						{/* District Filter */}
						<div className="min-w-0">
							<label className="block text-xs font-medium text-gray-700 mb-1">
								District
							</label>
							<select
								value={selectedDistrict}
								onChange={(e) => setSelectedDistrict(e.target.value)}
								className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							>
								<option value="">All</option>
								{DISTRICT_OPTIONS.filter(d => d !== "All").map((district) => (
									<option key={district} value={district}>
										{district}
									</option>
								))}
							</select>
						</div>

						{/* Tehsil Filter */}
						<div className="min-w-0">
							<label className="block text-xs font-medium text-gray-700 mb-1">
								Tehsil
							</label>
							<select
								value={selectedLocationTehsil}
								onChange={(e) => setSelectedLocationTehsil(e.target.value)}
								className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							>
								<option value="">All Tehsils</option>
								{locationTehsils.map((tehsil) => (
									<option key={tehsil} value={tehsil}>
										{tehsil}
									</option>
								))}
							</select>
						</div>

						{/* Event Type Filter */}
						<div className="min-w-0">
							<label className="block text-xs font-medium text-gray-700 mb-1">
								Event Type
							</label>
							<select
								value={selectedEventType}
								onChange={(e) => setSelectedEventType(e.target.value)}
								className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							>
								<option value="">All Event Types</option>
								{eventTypes.map((type) => (
									<option key={type} value={type}>
										{type}
									</option>
								))}
							</select>
						</div>
					</div>

					{/* Row 2: Event Date, Training Facilitator, Output, Buttons */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
						{/* Event Date Filter */}
						<div className="min-w-0">
							<label className="block text-xs font-medium text-gray-700 mb-1">
								Event Date
							</label>
							<input
								type="date"
								value={eventDate}
								onChange={(e) => setEventDate(e.target.value)}
								className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							/>
						</div>

						{/* Training Facilitator Filter */}
						<div className="min-w-0">
							<label className="block text-xs font-medium text-gray-700 mb-1">
								Training Facilitator
							</label>
							<select
								value={selectedTrainingFacilitator}
								onChange={(e) => setSelectedTrainingFacilitator(e.target.value)}
								className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							>
								<option value="">All Facilitators</option>
								{TRAINING_FACILITATOR_OPTIONS.map((facilitator) => (
									<option key={facilitator} value={facilitator}>
										{facilitator}
									</option>
								))}
							</select>
						</div>

						{/* Output Filter */}
						<div className="min-w-0">
							<label className="block text-xs font-medium text-gray-700 mb-1">
								Output
							</label>
							<select
								value={selectedOutput}
								onChange={(e) => setSelectedOutput(e.target.value)}
								className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							>
								<option value="">All Outputs</option>
								{outputs.map((output) => (
									<option key={output} value={output}>
										{output}
									</option>
								))}
							</select>
						</div>

						{/* Buttons - Right Aligned */}
						<div className="min-w-0 flex items-end gap-2">
							<button
								onClick={handleReset}
								className="flex-1 inline-flex items-center justify-center px-3 py-1.5 h-9 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
							>
								Reset
							</button>
							<button
								onClick={handleSearch}
								className="flex-1 inline-flex items-center justify-center px-3 py-1.5 h-9 text-sm bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors shadow-sm"
							>
								<Filter className="h-4 w-4 mr-1" />
								Apply
							</button>
						</div>
					</div>
				</div>
			</div>
		)}

		{/* Summary Cards */}
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
			{/* Total Number of Days */}
			<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-4 h-full">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
							<Calendar className="h-5 w-5 text-blue-600" />
						</div>
						<p className="text-sm font-medium text-gray-700 truncate">
							Total Number of Days
						</p>
					</div>
					<p className="text-2xl font-semibold text-gray-900 tabular-nums flex-shrink-0">
						{formatNumber(totalDays)}
					</p>
				</div>
			</div>

			{/* Male Participants */}
			<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-4 h-full">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<div className="p-2 bg-green-50 rounded-lg flex-shrink-0">
							<User className="h-5 w-5 text-green-600" />
						</div>
						<p className="text-sm font-medium text-gray-700 truncate">
							Male
						</p>
					</div>
					<p className="text-2xl font-semibold text-gray-900 tabular-nums flex-shrink-0">
						{formatNumber(totalMale)}
					</p>
				</div>
			</div>

			{/* Female Participants */}
			<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-4 h-full">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<div className="p-2 bg-pink-50 rounded-lg flex-shrink-0">
							<UserCheck className="h-5 w-5 text-pink-600" />
						</div>
						<p className="text-sm font-medium text-gray-700 truncate">
							Female
						</p>
					</div>
					<p className="text-2xl font-semibold text-gray-900 tabular-nums flex-shrink-0">
						{formatNumber(totalFemale)}
					</p>
				</div>
			</div>

			{/* Total Participants */}
			<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-4 h-full">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
							<Users className="h-5 w-5 text-purple-600" />
						</div>
						<p className="text-sm font-medium text-gray-700 truncate">
							Total Participant
						</p>
					</div>
					<p className="text-2xl font-semibold text-gray-900 tabular-nums flex-shrink-0">
						{formatNumber(totalParticipants)}
					</p>
				</div>
			</div>
		</div>

			{/* Training Data Grid */}
			{filteredData.length === 0 ? (
				<div className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center">
					<BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
					<h3 className="text-lg font-medium text-gray-900 mb-2">No training events found</h3>
					<p className="text-gray-600">
						{selectedDistrict || selectedOutput || selectedEventType || selectedLocationTehsil || selectedTrainingFacilitator || trainingName || eventDate
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
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Training Details</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">District</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Location Tehsil</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Venue</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Start Date</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">End Date</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Total Days</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">TMA Male</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">TMA Female</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">PHED Male</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">PHED Female</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">LGRD Male</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">LGRD Female</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">PDD Male</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">PDD Female</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Community Male</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Community Female</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Any Other Male</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Any Other Female</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Any Other Specify</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-blue-50">Total Male</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-pink-50">Total Female</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-purple-50">Total Participants</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Training Facilitator</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Output</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Link Completion Report</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Participant List</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Event Pictures</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap sticky right-0 bg-gray-50">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{filteredData.map((item, index) => (
									<tr key={item.SN || index} className="hover:bg-gray-50">
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm font-semibold text-gray-900 max-w-xs truncate" title={item.TrainingTitle}>
												{item.TrainingTitle || "N/A"}
											</div>
											{item.EventType && (
												<div className="text-xs text-gray-500">
													{item.EventType}
												</div>
											)}
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900">
												{item.District || "N/A"}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900">
												{item.LocationTehsil || "N/A"}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900 max-w-xs truncate" title={item.Venue}>
												{item.Venue || "N/A"}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900">
												{item.StartDate || "N/A"}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900">
												{item.EndDate || "N/A"}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm font-medium text-gray-900 text-center">
												{formatNumber(item.TotalDays)}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900 text-center">
												{formatNumber(item.TMAMale)}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900 text-center">
												{formatNumber(item.TMAFemale)}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900 text-center">
												{formatNumber(item.PHEDMale)}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900 text-center">
												{formatNumber(item.PHEDFemale)}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900 text-center">
												{formatNumber(item.LGRDMale)}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900 text-center">
												{formatNumber(item.LGRDFemale)}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900 text-center">
												{formatNumber(item.PDDMale)}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900 text-center">
												{formatNumber(item.PDDFemale)}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900 text-center">
												{formatNumber(item.CommunityMale)}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900 text-center">
												{formatNumber(item.CommunityFemale)}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900 text-center">
												{formatNumber(item.AnyOtherMale)}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900 text-center">
												{formatNumber(item.AnyOtherFemale)}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900 max-w-xs truncate" title={item.AnyOtherSpecify}>
												{item.AnyOtherSpecify || "N/A"}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap bg-blue-50">
											<div className="text-sm font-semibold text-gray-900 text-center">
												{formatNumber(item.TotalMale)}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap bg-pink-50">
											<div className="text-sm font-semibold text-gray-900 text-center">
												{formatNumber(item.TotalFemale)}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap bg-purple-50">
											<div className="text-sm font-bold text-gray-900 text-center">
												{formatNumber(item.TotalParticipants)}
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900">
												{item.TrainingFacilitatorName || "N/A"}
											</div>
										</td>
									<td className="px-4 py-3 whitespace-nowrap">
										<div className="text-sm text-gray-900">
											{item.Output || "N/A"}
										</div>
									</td>
									<td className="px-4 py-3 whitespace-nowrap">
										{item.ActivityCompletionReportLink ? (
											<button
												onClick={() => window.open(item.ActivityCompletionReportLink, "_blank", "noopener,noreferrer")}
												className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
											>
												Link Completion Report
											</button>
										) : (
											<span className="text-sm text-gray-400">-</span>
										)}
									</td>
									<td className="px-4 py-3 whitespace-nowrap">
										{item.ParticipantListAttachment ? (
											<button
												onClick={() => window.open(item.ParticipantListAttachment, "_blank", "noopener,noreferrer")}
												className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
											>
												Participant List
											</button>
										) : (
											<span className="text-sm text-gray-400">-</span>
										)}
									</td>
									<td className="px-4 py-3 whitespace-nowrap">
										{item.PictureAttachment ? (
											<button
												onClick={() => window.open(item.PictureAttachment, "_blank", "noopener,noreferrer")}
												className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
											>
												Event Pictures
											</button>
										) : (
											<span className="text-sm text-gray-400">-</span>
										)}
									</td>
									<td className="px-4 py-3 whitespace-nowrap sticky right-0 bg-white">
										<div className="flex items-center space-x-2">
											<button
												onClick={() => handleView(item)}
												className="inline-flex items-center px-3 py-1.5 text-sm text-green-600 bg-green-50 rounded hover:bg-green-100 transition-colors"
												title="View"
											>
												<Eye className="h-4 w-4" />
											</button>
												{trainingSection && !accessLoading && (
													<>
														{accessEdit && (
															<button
																onClick={() => handleEdit(item.SN)}
																className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
																title="Edit"
															>
																<Edit className="h-4 w-4" />
															</button>
														)}
														{accessDelete && (
															<button
																onClick={() => setDeleteConfirm({ show: true, record: item })}
																disabled={deleteLoading === item.SN}
																className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
																title="Delete"
															>
																<Trash2 className="h-4 w-4" />
															</button>
														)}
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
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeViewModal}>
					<div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
						<div className="sticky top-0 bg-gradient-to-r from-[#0b4d2b] to-[#0a3d24] text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
							<h2 className="text-2xl font-bold">Training Event Details</h2>
							<button
								onClick={closeViewModal}
								className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
							>
								<X className="h-6 w-6" />
							</button>
						</div>
						<div className="p-6 space-y-6">
							{/* Basic Information */}
							<div className="bg-gray-50 rounded-lg p-4">
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
							<div className="bg-gray-50 rounded-lg p-4">
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
							<div className="bg-gray-50 rounded-lg p-4">
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
								<div className="bg-gray-50 rounded-lg p-4">
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
								<div className="bg-gray-50 rounded-lg p-4">
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
						<div className="bg-gray-50 rounded-lg p-4">
							<h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
							<div className="space-y-4">
								{/* External Links Section */}
								{(viewingRecord.ActivityCompletionReportLink || viewingRecord.ParticipantListAttachment || viewingRecord.PictureAttachment) && (
									<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
										<h4 className="text-sm font-semibold text-gray-900 mb-3">External Links</h4>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
											{viewingRecord.ActivityCompletionReportLink && (
												<button
													onClick={() => window.open(viewingRecord.ActivityCompletionReportLink, "_blank", "noopener,noreferrer")}
													className="flex items-center justify-center space-x-2 px-4 py-3 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium text-blue-700"
												>
													<FileText className="h-5 w-5" />
													<span>Link Completion Report</span>
												</button>
											)}
											{viewingRecord.ParticipantListAttachment && (
												<button
													onClick={() => window.open(viewingRecord.ParticipantListAttachment, "_blank", "noopener,noreferrer")}
													className="flex items-center justify-center space-x-2 px-4 py-3 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium text-blue-700"
												>
													<FileText className="h-5 w-5" />
													<span>Participant List</span>
												</button>
											)}
											{viewingRecord.PictureAttachment && (
												<button
													onClick={() => window.open(viewingRecord.PictureAttachment, "_blank", "noopener,noreferrer")}
													className="flex items-center justify-center space-x-2 px-4 py-3 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium text-blue-700"
												>
													<ImageIcon className="h-5 w-5" />
													<span>Event Pictures</span>
												</button>
											)}
										</div>
									</div>
								)}
									
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
						</div>
						<div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end rounded-b-lg">
							<button
								onClick={closeViewModal}
								className="px-6 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors font-medium"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{deleteConfirm.show && deleteConfirm.record && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all">
						{/* Modal Header */}
						<div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-xl">
							<div className="flex items-center">
								<div className="p-2 bg-white/20 rounded-lg mr-4">
									<Trash2 className="h-6 w-6" />
								</div>
								<div>
									<h2 className="text-2xl font-bold">Confirm Delete</h2>
									<p className="text-red-100 text-sm mt-1">This action cannot be undone</p>
								</div>
							</div>
						</div>

						{/* Modal Content */}
						<div className="p-6">
							<div className="mb-4">
								<p className="text-gray-700 text-base mb-3">
									Are you sure you want to delete this training event?
								</p>
								<div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
									{deleteConfirm.record.TrainingTitle && (
										<>
											<p className="text-sm font-medium text-gray-500 mb-1">Training Title:</p>
											<p className="text-base font-semibold text-gray-900">
												{deleteConfirm.record.TrainingTitle}
											</p>
										</>
									)}
									{deleteConfirm.record.Output && (
										<>
											<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Output:</p>
											<p className="text-base text-gray-700">{deleteConfirm.record.Output}</p>
										</>
									)}
									{deleteConfirm.record.EventType && (
										<>
											<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Event Type:</p>
											<p className="text-base text-gray-700">{deleteConfirm.record.EventType}</p>
										</>
									)}
									{(deleteConfirm.record.District || deleteConfirm.record.LocationTehsil) && (
										<>
											<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Location:</p>
											<p className="text-base text-gray-700">
												{deleteConfirm.record.District}
												{deleteConfirm.record.LocationTehsil && `, ${deleteConfirm.record.LocationTehsil}`}
											</p>
										</>
									)}
									{deleteConfirm.record.SN && (
										<>
											<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Record ID:</p>
											<p className="text-base text-gray-700">#{deleteConfirm.record.SN}</p>
										</>
									)}
								</div>
							</div>
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start">
								<AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
								<p className="text-sm text-yellow-800">
									<strong>Warning:</strong> This will permanently delete this training event from the database. This action cannot be undone.
								</p>
							</div>
						</div>

						{/* Modal Footer */}
						<div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end space-x-3 border-t border-gray-200">
							<button
								onClick={() => setDeleteConfirm({ show: false, record: null })}
								disabled={deleteLoading === deleteConfirm.record.SN}
								className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								onClick={handleDelete}
								disabled={deleteLoading === deleteConfirm.record.SN}
								className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
							>
								{deleteLoading === deleteConfirm.record.SN ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Deleting...
									</>
								) : (
									<>
										<Trash2 className="h-4 w-4 mr-2" />
										Yes, Delete
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
