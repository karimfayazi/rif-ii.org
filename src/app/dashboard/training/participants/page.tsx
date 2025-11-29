"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
	ArrowLeft,
	Filter, 
	RefreshCw, 
	Users,
	BarChart3,
	Download,
	User,
	UserCheck,
	Edit,
	Trash2,
	FileDown,
	Eye,
	X
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";

type WorkshopParticipant = {
	sn?: number;
	participant_name?: string;
	so_do_wo_ho?: string;
	gender?: string;
	organization_department?: string;
	designation?: string;
	profession?: string;
	cnic_number?: string;
	contact_number?: string;
	tehsil?: string;
	district?: string;
	workshop_training_name?: string;
	workshop_session_conference?: string;
	start_date?: string;
	end_date?: string;
	date_entered_by?: string;
	entry_timestamp?: string;
};

const DISTRICT_OPTIONS = ["All", "DIK", "Bannu"];
const GENDER_OPTIONS = ["Male", "Female"];

export default function TrainingParticipantsPage() {
	const router = useRouter();
	const { user, getUserId } = useAuth();
	const userId = user?.id || getUserId();
	const { isAdmin } = useAccess(userId);
	
	const [participants, setParticipants] = useState<WorkshopParticipant[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedDistrict, setSelectedDistrict] = useState("");
	const [selectedTehsil, setSelectedTehsil] = useState("");
	const [selectedGender, setSelectedGender] = useState("");
	const [selectedOrganizationDepartment, setSelectedOrganizationDepartment] = useState("");
	const [selectedWorkshopTrainingName, setSelectedWorkshopTrainingName] = useState("");
	const [tehsils, setTehsils] = useState<string[]>([]);
	const [organizationDepartments, setOrganizationDepartments] = useState<string[]>([]);
	const [workshopTrainingNames, setWorkshopTrainingNames] = useState<string[]>([]);
	const [viewingParticipant, setViewingParticipant] = useState<WorkshopParticipant | null>(null);

	const fetchParticipants = useCallback(async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (selectedDistrict && selectedDistrict !== "All") params.append('district', selectedDistrict);
			if (selectedTehsil) params.append('tehsil', selectedTehsil);
			if (selectedGender) params.append('gender', selectedGender);
			if (selectedOrganizationDepartment) params.append('organizationDepartment', selectedOrganizationDepartment);
			if (selectedWorkshopTrainingName) params.append('workshopTrainingName', selectedWorkshopTrainingName);

			const response = await fetch(`/api/training/participants?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setParticipants(data.participants || []);
				
				// Extract unique values for filters
				const uniqueTehsils = [...new Set(data.participants.map((item: WorkshopParticipant) => item.tehsil).filter(Boolean))] as string[];
				const uniqueOrganizationDepartments = [...new Set(data.participants.map((item: WorkshopParticipant) => item.organization_department).filter(Boolean))] as string[];
				const uniqueWorkshopTrainingNames = [...new Set(data.participants.map((item: WorkshopParticipant) => item.workshop_training_name).filter(Boolean))] as string[];
				
				setTehsils(uniqueTehsils);
				setOrganizationDepartments(uniqueOrganizationDepartments);
				setWorkshopTrainingNames(uniqueWorkshopTrainingNames);
			} else {
				setError(data.message || "Failed to fetch participants data");
			}
		} catch (err) {
			setError("Error fetching participants data");
			console.error("Error fetching participants data:", err);
		} finally {
			setLoading(false);
		}
	}, [selectedDistrict, selectedTehsil, selectedGender, selectedOrganizationDepartment, selectedWorkshopTrainingName]);

	useEffect(() => {
		fetchParticipants();
	}, [fetchParticipants]);

	const handleSearch = () => {
		fetchParticipants();
	};

	const handleReset = () => {
		setSelectedDistrict("");
		setSelectedTehsil("");
		setSelectedGender("");
		setSelectedOrganizationDepartment("");
		setSelectedWorkshopTrainingName("");
	};

	const formatNumber = (num: number | null | undefined) => {
		if (!num && num !== 0) return "0";
		return num.toLocaleString();
	};

	const handleExport = () => {
		// Prepare CSV data
		const headers = [
			"Participant Name",
			"SO/DO/WO/HO",
			"Gender",
			"Organization/Department",
			"CNIC Number",
			"Contact Number",
			"District",
			"Tehsil",
			"Workshop/Training Name",
			"Workshop/Session/Conference",
			"Start Date",
			"End Date"
		];

		const csvRows = [
			headers.join(","),
			...filteredData.map(item => [
				`"${(item.participant_name || "").replace(/"/g, '""')}"`,
				`"${(item.so_do_wo_ho || "").replace(/"/g, '""')}"`,
				`"${(item.gender || "").replace(/"/g, '""')}"`,
				`"${(item.organization_department || "").replace(/"/g, '""')}"`,
				`"${(item.cnic_number || "").replace(/"/g, '""')}"`,
				`"${(item.contact_number || "").replace(/"/g, '""')}"`,
				`"${(item.district || "").replace(/"/g, '""')}"`,
				`"${(item.tehsil || "").replace(/"/g, '""')}"`,
				`"${(item.workshop_training_name || "").replace(/"/g, '""')}"`,
				`"${(item.workshop_session_conference || "").replace(/"/g, '""')}"`,
				`"${(item.start_date || "").replace(/"/g, '""')}"`,
				`"${(item.end_date || "").replace(/"/g, '""')}"`
			].join(","))
		];

		const csvContent = csvRows.join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		
		link.setAttribute("href", url);
		link.setAttribute("download", `training_participants_${new Date().toISOString().split('T')[0]}.csv`);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	// Filter data based on selected filters
	const filteredData = participants.filter(item => {
		const matchesDistrict = !selectedDistrict || selectedDistrict === "All" || item.district === selectedDistrict;
		const matchesTehsil = !selectedTehsil || item.tehsil === selectedTehsil;
		const matchesGender = !selectedGender || item.gender === selectedGender;
		const matchesOrganizationDepartment = !selectedOrganizationDepartment || item.organization_department === selectedOrganizationDepartment;
		const matchesWorkshopTrainingName = !selectedWorkshopTrainingName || item.workshop_training_name === selectedWorkshopTrainingName;
		
		return matchesDistrict && matchesTehsil && matchesGender && matchesOrganizationDepartment && matchesWorkshopTrainingName;
	});

	// Calculate summary statistics
	const totalParticipants = filteredData.length;
	const totalMale = filteredData.filter(item => item.gender === "Male").length;
	const totalFemale = filteredData.filter(item => item.gender === "Female").length;
	const uniqueWorkshops = new Set(filteredData.map(item => item.workshop_training_name).filter(Boolean)).size;

	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Training Participants</h1>
					<p className="text-gray-600 mt-2">View workshop training participants</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading participants data...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Training Participants</h1>
					<p className="text-gray-600 mt-2">View workshop training participants</p>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600">{error}</p>
					<button
						onClick={fetchParticipants}
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
					<h1 className="text-2xl font-bold text-gray-900">Training Participants</h1>
					<p className="text-gray-600 mt-2">View workshop training participants</p>
				</div>
				<div className="flex items-center space-x-3">
					<button
						onClick={handleExport}
						className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
					>
						<FileDown className="h-4 w-4 mr-2" />
						Export
					</button>
					<button
						onClick={() => router.push('/dashboard/training/participants/add')}
						className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						<Users className="h-4 w-4 mr-2" />
						Add Records
					</button>
					<button
						onClick={() => router.push('/dashboard/training/dashboard')}
						className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Training
					</button>
					<button
						onClick={fetchParticipants}
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

					{/* Tehsil Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Tehsil
						</label>
						<select
							value={selectedTehsil}
							onChange={(e) => setSelectedTehsil(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						>
							<option value="">All Tehsils</option>
							{tehsils.map((tehsil) => (
								<option key={tehsil} value={tehsil}>
									{tehsil}
								</option>
							))}
						</select>
					</div>

					{/* Gender Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Gender
						</label>
						<select
							value={selectedGender}
							onChange={(e) => setSelectedGender(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						>
							<option value="">All Genders</option>
							{GENDER_OPTIONS.map((gender) => (
								<option key={gender} value={gender}>
									{gender}
								</option>
							))}
						</select>
					</div>

					{/* Organization Department Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Organization/Department
						</label>
						<select
							value={selectedOrganizationDepartment}
							onChange={(e) => setSelectedOrganizationDepartment(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						>
							<option value="">All Departments</option>
							{organizationDepartments.map((dept) => (
								<option key={dept} value={dept}>
									{dept}
								</option>
							))}
						</select>
					</div>

					{/* Workshop Training Name Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Workshop/Training Name
						</label>
						<select
							value={selectedWorkshopTrainingName}
							onChange={(e) => setSelectedWorkshopTrainingName(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						>
							<option value="">All Workshops</option>
							{workshopTrainingNames.map((workshop) => (
								<option key={workshop} value={workshop}>
									{workshop}
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
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<div className="flex items-center">
						<div className="p-2 bg-blue-100 rounded-lg">
							<Users className="h-6 w-6 text-blue-600" />
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Total Participants</p>
							<p className="text-2xl font-bold text-gray-900">
								{formatNumber(totalParticipants)}
							</p>
						</div>
					</div>
				</div>

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

				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<div className="flex items-center">
						<div className="p-2 bg-purple-100 rounded-lg">
							<BarChart3 className="h-6 w-6 text-purple-600" />
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Total Workshops</p>
							<p className="text-2xl font-bold text-gray-900">
								{formatNumber(uniqueWorkshops)}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Participants Data Grid */}
			{filteredData.length === 0 ? (
				<div className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center">
					<BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
					<h3 className="text-lg font-medium text-gray-900 mb-2">No participants found</h3>
					<p className="text-gray-600">
						{selectedDistrict || selectedTehsil || selectedGender || selectedOrganizationDepartment || selectedWorkshopTrainingName
							? "Try adjusting your search criteria" 
							: "No participants data available"
						}
					</p>
				</div>
			) : (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-white" style={{ backgroundColor: "#ffffff" }}>
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ backgroundColor: "#ffffff" }}>Participant Name</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ backgroundColor: "#ffffff" }}>Gender</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ backgroundColor: "#ffffff" }}>Organization/Department</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ backgroundColor: "#ffffff" }}>CNIC Number</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ backgroundColor: "#ffffff" }}>Contact Number</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ backgroundColor: "#ffffff" }}>Location</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ backgroundColor: "#ffffff" }}>Workshop/Training</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ backgroundColor: "#ffffff" }}>Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200" style={{ backgroundColor: "#ffffff" }}>
								{filteredData.map((item, index) => (
									<tr key={item.sn || index} className="hover:bg-gray-50" style={{ backgroundColor: "#ffffff" }}>
										<td className="px-6 py-4">
											<div className="text-sm font-semibold text-gray-900">
												{item.participant_name || "N/A"}
											</div>
											{item.so_do_wo_ho && (
												<div className="text-xs text-gray-500">
													{item.so_do_wo_ho}
												</div>
											)}
										</td>
										<td className="px-6 py-4">
											<div className="text-sm text-gray-900">
												{item.gender || "N/A"}
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="text-sm text-gray-900">
												{item.organization_department || "N/A"}
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="text-sm text-gray-900">
												{item.cnic_number || "N/A"}
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="text-sm text-gray-900">
												{item.contact_number || "N/A"}
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="text-sm text-gray-900">
												{item.district && <div>{item.district}</div>}
												{item.tehsil && <div className="text-xs text-gray-500">{item.tehsil}</div>}
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="text-sm text-gray-900">
												<div className="font-semibold">{item.workshop_training_name || "N/A"}</div>
												{item.workshop_session_conference && (
													<div className="text-xs text-gray-500">
														{item.workshop_session_conference}
													</div>
												)}
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="flex items-center space-x-2">
												<button
													onClick={() => setViewingParticipant(item)}
													className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
													title="View"
												>
													<Eye className="h-4 w-4" />
												</button>
												{isAdmin && (
													<>
														<button
															onClick={() => router.push(`/dashboard/training/participants/add?sn=${item.sn}`)}
															className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
															title="Edit"
														>
															<Edit className="h-4 w-4" />
														</button>
														<button
															onClick={async () => {
																if (confirm("Are you sure you want to delete this participant record?")) {
																	try {
																		const response = await fetch(`/api/training/participants/delete?sn=${item.sn}`, {
																			method: 'DELETE'
																		});
																		const data = await response.json();
																		if (data.success) {
																			fetchParticipants();
																		} else {
																			alert(data.message || "Failed to delete record");
																		}
																	} catch (err) {
																		console.error("Error deleting participant:", err);
																		alert("Error deleting participant record");
																	}
																}
															}}
															className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
															title="Delete"
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
					{/* Results Count */}
					<div className="bg-white px-6 py-3 border-t border-gray-200" style={{ backgroundColor: "#ffffff" }}>
						<p className="text-sm text-gray-600">
							Showing <span className="font-medium">{filteredData.length}</span> participant{filteredData.length !== 1 ? 's' : ''}
						</p>
					</div>
				</div>
			)}

			{/* View Participant Modal */}
			{viewingParticipant && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
						{/* Modal Header */}
						<div className="sticky top-0 bg-gradient-to-r from-[#0b4d2b] to-[#0a3d24] text-white p-6 rounded-t-xl flex items-center justify-between">
							<h2 className="text-2xl font-bold">Participant Details</h2>
							<button
								onClick={() => setViewingParticipant(null)}
								className="p-2 hover:bg-white/20 rounded-lg transition-colors"
							>
								<X className="h-6 w-6" />
							</button>
						</div>

						{/* Modal Content */}
						<div className="p-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{/* Personal Information */}
								<div className="space-y-4">
									<h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Personal Information</h3>
									
									<div>
										<label className="text-sm font-medium text-gray-500">Participant Name</label>
										<p className="text-base text-gray-900 mt-1">{viewingParticipant.participant_name || "N/A"}</p>
									</div>

									{viewingParticipant.so_do_wo_ho && (
										<div>
											<label className="text-sm font-medium text-gray-500">SO/DO/WO/HO</label>
											<p className="text-base text-gray-900 mt-1">{viewingParticipant.so_do_wo_ho}</p>
										</div>
									)}

									<div>
										<label className="text-sm font-medium text-gray-500">Gender</label>
										<p className="text-base text-gray-900 mt-1">{viewingParticipant.gender || "N/A"}</p>
									</div>

									<div>
										<label className="text-sm font-medium text-gray-500">CNIC Number</label>
										<p className="text-base text-gray-900 mt-1">{viewingParticipant.cnic_number || "N/A"}</p>
									</div>

									<div>
										<label className="text-sm font-medium text-gray-500">Contact Number</label>
										<p className="text-base text-gray-900 mt-1">{viewingParticipant.contact_number || "N/A"}</p>
									</div>
								</div>

								{/* Professional Information */}
								<div className="space-y-4">
									<h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Professional Information</h3>
									
									<div>
										<label className="text-sm font-medium text-gray-500">Organization/Department</label>
										<p className="text-base text-gray-900 mt-1">{viewingParticipant.organization_department || "N/A"}</p>
									</div>

									{viewingParticipant.designation && (
										<div>
											<label className="text-sm font-medium text-gray-500">Designation</label>
											<p className="text-base text-gray-900 mt-1">{viewingParticipant.designation}</p>
										</div>
									)}

									{viewingParticipant.profession && (
										<div>
											<label className="text-sm font-medium text-gray-500">Profession</label>
											<p className="text-base text-gray-900 mt-1">{viewingParticipant.profession}</p>
										</div>
									)}
								</div>

								{/* Location Information */}
								<div className="space-y-4">
									<h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Location Information</h3>
									
									<div>
										<label className="text-sm font-medium text-gray-500">District</label>
										<p className="text-base text-gray-900 mt-1">{viewingParticipant.district || "N/A"}</p>
									</div>

									<div>
										<label className="text-sm font-medium text-gray-500">Tehsil</label>
										<p className="text-base text-gray-900 mt-1">{viewingParticipant.tehsil || "N/A"}</p>
									</div>
								</div>

								{/* Training Information */}
								<div className="space-y-4">
									<h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Training Information</h3>
									
									<div>
										<label className="text-sm font-medium text-gray-500">Workshop/Training Name</label>
										<p className="text-base text-gray-900 mt-1">{viewingParticipant.workshop_training_name || "N/A"}</p>
									</div>

									{viewingParticipant.workshop_session_conference && (
										<div>
											<label className="text-sm font-medium text-gray-500">Workshop/Session/Conference</label>
											<p className="text-base text-gray-900 mt-1">{viewingParticipant.workshop_session_conference}</p>
										</div>
									)}

									{viewingParticipant.start_date && (
										<div>
											<label className="text-sm font-medium text-gray-500">Start Date</label>
											<p className="text-base text-gray-900 mt-1">{viewingParticipant.start_date}</p>
										</div>
									)}

									{viewingParticipant.end_date && (
										<div>
											<label className="text-sm font-medium text-gray-500">End Date</label>
											<p className="text-base text-gray-900 mt-1">{viewingParticipant.end_date}</p>
										</div>
									)}
								</div>
							</div>

							{/* Additional Information */}
							{(viewingParticipant.date_entered_by || viewingParticipant.entry_timestamp) && (
								<div className="mt-6 pt-6 border-t border-gray-200">
									<h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">Additional Information</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										{viewingParticipant.date_entered_by && (
											<div>
												<label className="text-sm font-medium text-gray-500">Entered By</label>
												<p className="text-base text-gray-900 mt-1">{viewingParticipant.date_entered_by}</p>
											</div>
										)}
										{viewingParticipant.entry_timestamp && (
											<div>
												<label className="text-sm font-medium text-gray-500">Entry Timestamp</label>
												<p className="text-base text-gray-900 mt-1">{viewingParticipant.entry_timestamp}</p>
											</div>
										)}
									</div>
								</div>
							)}
						</div>

						{/* Modal Footer */}
						<div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end space-x-3 border-t border-gray-200">
							<button
								onClick={() => setViewingParticipant(null)}
								className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
							>
								Close
							</button>
							{isAdmin && (
								<button
									onClick={() => {
										setViewingParticipant(null);
										router.push(`/dashboard/training/participants/add?sn=${viewingParticipant.sn}`);
									}}
									className="px-6 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors"
								>
									Edit
								</button>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
