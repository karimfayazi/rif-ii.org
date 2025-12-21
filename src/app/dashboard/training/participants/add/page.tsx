"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
	ArrowLeft, 
	Save, 
	AlertCircle, 
	CheckCircle, 
	Loader2,
	Trash2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";

const DISTRICT_OPTIONS = ["DIK", "Bannu", "Paharpur"];
const GENDER_OPTIONS = ["Male", "Female"];

// Helper function to format date for HTML date input (YYYY-MM-DD)
const formatDateForInput = (dateValue: string | Date | null | undefined): string => {
	if (!dateValue) return "";
	
	// If it's already a Date object
	if (dateValue instanceof Date) {
		if (isNaN(dateValue.getTime())) return "";
		const year = dateValue.getFullYear();
		const month = String(dateValue.getMonth() + 1).padStart(2, '0');
		const day = String(dateValue.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
	
	// If it's a string
	const dateString = String(dateValue).trim();
	if (!dateString || dateString === 'null' || dateString === 'undefined') return "";
	
	// If already in YYYY-MM-DD format, return as is (SQL Server format 120)
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
		return dateString;
	}
	
	// Try to parse the date string (handles formats like "Dec 18 2025 12:00AM", "2025-12-18", etc.)
	try {
		// First try parsing as-is
		let date = new Date(dateString);
		
		// If that fails, try parsing common SQL Server datetime formats
		if (isNaN(date.getTime())) {
			// Try parsing formats like "Dec 18 2025 12:00AM"
			// Remove time portion if present
			const parts = dateString.split(' ');
			if (parts.length >= 3) {
				const dateOnly = parts[0] + ' ' + parts[1] + ' ' + parts[2];
				date = new Date(dateOnly);
			}
		}
		
		if (!isNaN(date.getTime())) {
			// Format as YYYY-MM-DD
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			return `${year}-${month}-${day}`;
		}
		
		// Try parsing DD-MM-YYYY or DD/MM/YYYY format
		const parts = dateString.split(/[-\/]/);
		if (parts.length === 3) {
			const day = parts[0].padStart(2, '0');
			const month = parts[1].padStart(2, '0');
			const year = parts[2].split(' ')[0]; // Remove time if present
			if (year.length === 4) {
				return `${year}-${month}-${day}`;
			}
		}
		
		return "";
	} catch (error) {
		console.error("Error formatting date:", dateValue, error);
		return "";
	}
};

type ParticipantFormData = {
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
	NC_VC?: string;
	workshop_training_name?: string;
	workshop_session_conference?: string;
	start_date?: string;
	end_date?: string;
	date_entered_by?: string;
	Training_Unit?: string;
	Venue?: string;
	Duration_Days?: number;
};

export default function AddParticipantPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const sn = searchParams.get('sn');
	const isEditMode = !!sn;
	
	const { user, getUserId } = useAuth();
	const userId = user?.id || getUserId();
	const { accessAdd, accessEdit, accessDelete, trainingSection, loading: accessLoading } = useAccess(userId);

	const [formData, setFormData] = useState<ParticipantFormData>({});
	const [loading, setLoading] = useState(false);
	const [fetching, setFetching] = useState(isEditMode);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [tehsils, setTehsils] = useState<string[]>([]);
	const [workshopTrainingNames, setWorkshopTrainingNames] = useState<string[]>([]);
	const [loadingTehsils, setLoadingTehsils] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	// Fetch existing data if editing
	useEffect(() => {
		if (isEditMode && sn) {
			fetchParticipantData();
		}
		fetchWorkshopTrainingNames();
	}, [isEditMode, sn]);

	// Fetch tehsils when district changes
	useEffect(() => {
		if (formData.district) {
			fetchTehsils(formData.district).then(() => {
				// After tehsils are loaded, if there's a tehsil value in formData, ensure it's preserved
				// This is especially important when editing - the tehsil value should remain selected
			});
		} else {
			setTehsils([]);
		}
	}, [formData.district]);

	const fetchParticipantData = async () => {
		try {
			setFetching(true);
			const response = await fetch(`/api/training/participants?sn=${sn}`);
			const data = await response.json();

			if (data.success && data.participant) {
				const participant = data.participant;
				console.log("Fetched participant data:", participant);
				console.log("Raw start_date:", participant.start_date, "Type:", typeof participant.start_date);
				console.log("Raw end_date:", participant.end_date, "Type:", typeof participant.end_date);
				console.log("Raw tehsil:", participant.tehsil, "Raw district:", participant.district);
				
				// Format dates - handle null, undefined, and various date formats
				// SQL Server CONVERT with style 120 returns YYYY-MM-DD format
				let formattedStartDate = "";
				let formattedEndDate = "";
				
				if (participant.start_date) {
					formattedStartDate = formatDateForInput(participant.start_date);
					// If formatDateForInput returns empty, try direct assignment if already in YYYY-MM-DD format
					if (!formattedStartDate && typeof participant.start_date === 'string') {
						const trimmed = participant.start_date.trim();
						if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
							formattedStartDate = trimmed.substring(0, 10);
						}
					}
				}
				
				if (participant.end_date) {
					formattedEndDate = formatDateForInput(participant.end_date);
					// If formatDateForInput returns empty, try direct assignment if already in YYYY-MM-DD format
					if (!formattedEndDate && typeof participant.end_date === 'string') {
						const trimmed = participant.end_date.trim();
						if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
							formattedEndDate = trimmed.substring(0, 10);
						}
					}
				}
				
				console.log("Formatted start_date:", formattedStartDate);
				console.log("Formatted end_date:", formattedEndDate);
				
				// Store tehsil value before setting district (which will trigger tehsil fetch)
				const district = participant.district || "";
				const tehsilValue = participant.tehsil || "";
				
				// Set form data with district (this will trigger useEffect to fetch tehsils)
				setFormData({
					sn: participant.sn,
					participant_name: participant.participant_name || "",
					so_do_wo_ho: participant.so_do_wo_ho || "",
					gender: participant.gender || "",
					organization_department: participant.organization_department || "",
					designation: participant.designation || "",
					profession: participant.profession || "",
					cnic_number: participant.cnic_number || "",
					contact_number: participant.contact_number || "",
					tehsil: "", // Will be set after tehsils are loaded
					district: district,
					NC_VC: participant.NC_VC || "",
					workshop_training_name: participant.workshop_training_name || "",
					workshop_session_conference: participant.workshop_session_conference || "",
					start_date: formattedStartDate,
					end_date: formattedEndDate,
					date_entered_by: participant.date_entered_by || "",
					Training_Unit: participant.Training_Unit || "",
					Venue: participant.Venue || "",
					Duration_Days: participant.Duration_Days || undefined
				});
				
				// Fetch tehsils for the district, then set the tehsil value
				if (district) {
					try {
						const tehsilRes = await fetch(`/api/training/participants/tehsils?district=${encodeURIComponent(district)}`);
						const tehsilData = await tehsilRes.json();
						if (tehsilData.success) {
							const tehsilList = tehsilData.tehsils || [];
							setTehsils(tehsilList);
							// Set tehsil value after tehsils are loaded
							if (tehsilValue) {
								// Use setTimeout to ensure state update happens after tehsils are set
								setTimeout(() => {
									setFormData(prev => ({ ...prev, tehsil: tehsilValue }));
								}, 100);
							}
						}
					} catch (e) {
						console.error("Error fetching tehsils for edit:", e);
					}
				}
			} else {
				setError("Failed to fetch participant data");
			}
		} catch (err) {
			console.error("Error fetching participant data:", err);
			setError("Error fetching participant data");
		} finally {
			setFetching(false);
		}
	};

	const fetchWorkshopTrainingNames = async () => {
		try {
			const response = await fetch("/api/training/participants");
			const data = await response.json();
			if (data.success && data.participants) {
				const uniqueNames = [...new Set(
					data.participants
						.map((p: any) => p.workshop_training_name)
						.filter(Boolean)
				)] as string[];
				setWorkshopTrainingNames(uniqueNames.sort());
			}
		} catch (err) {
			console.error("Error fetching workshop training names:", err);
		}
	};

	const fetchTehsils = async (district: string) => {
		if (!district || district === 'ALL' || district === '') {
			setTehsils([]);
			return;
		}
		try {
			setLoadingTehsils(true);
			const res = await fetch(`/api/training/participants/tehsils?district=${encodeURIComponent(district)}`);
			const data = await res.json();
			if (data.success) {
				const tehsilList = data.tehsils || [];
				setTehsils(tehsilList);
			} else {
				setTehsils([]);
			}
		} catch (e) {
			console.error("Error fetching tehsils:", e);
			setTehsils([]);
		} finally {
			setLoadingTehsils(false);
		}
	};

	// Format CNIC: XXXXX-XXXXXXX-X
	const formatCNIC = (value: string) => {
		const cleaned = value.replace(/\D/g, '');
		if (cleaned.length <= 5) return cleaned;
		if (cleaned.length <= 12) return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
		return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12, 13)}`;
	};

	// Format Contact: XXXX-XXXXXXX
	const formatContact = (value: string) => {
		const cleaned = value.replace(/\D/g, '');
		if (cleaned.length <= 4) return cleaned;
		return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 11)}`;
	};

	const handleInputChange = (field: keyof ParticipantFormData, value: any) => {
		if (field === 'cnic_number') {
			value = formatCNIC(value);
		} else if (field === 'contact_number') {
			value = formatContact(value);
		}
		setFormData(prev => ({ ...prev, [field]: value }));
		setError(null);
	};

	const validateForm = (): boolean => {
		if (!formData.participant_name?.trim()) {
			setError("Participant Name is required");
			return false;
		}
		if (!formData.gender) {
			setError("Gender is required");
			return false;
		}
		if (formData.cnic_number) {
			const cnicPattern = /^\d{5}-\d{7}-\d{1}$/;
			if (!cnicPattern.test(formData.cnic_number)) {
				setError("CNIC must be in format: XXXXX-XXXXXXX-X");
				return false;
			}
		}
		if (formData.contact_number) {
			const contactPattern = /^\d{4}-\d{7}$/;
			if (!contactPattern.test(formData.contact_number)) {
				setError("Contact Number must be in format: XXXX-XXXXXXX");
				return false;
			}
		}
		if (!formData.district) {
			setError("District is required");
			return false;
		}
		if (!formData.workshop_training_name) {
			setError("Workshop/Training/Session/Conference is required");
			return false;
		}
		return true;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!validateForm()) {
			return;
		}

		setLoading(true);
		setError(null);
		setSuccess(false);

		try {
			const submitData = {
				...formData,
				date_entered_by: user?.name || user?.username || "System"
			};

			const url = isEditMode 
				? '/api/training/participants/update'
				: '/api/training/participants/add';
			
			const method = isEditMode ? 'PUT' : 'POST';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(submitData)
			});

			const data = await response.json();

			if (data.success) {
				setSuccess(true);
				setTimeout(() => {
					router.push('/dashboard/training/participants');
				}, 1500);
			} else {
				setError(data.message || "Failed to save participant record");
			}
		} catch (err) {
			console.error("Error saving participant:", err);
			setError("Error saving participant record");
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!isEditMode || !sn) return;
		
		setLoading(true);
		setError(null);

		try {
			const response = await fetch(`/api/training/participants/delete?sn=${sn}`, {
				method: 'DELETE'
			});

			const data = await response.json();

			if (data.success) {
				setShowDeleteConfirm(false);
				setSuccess(true);
				setTimeout(() => {
					router.push('/dashboard/training/participants');
				}, 1500);
			} else {
				setError(data.message || "Failed to delete participant record");
				setShowDeleteConfirm(false);
			}
		} catch (err) {
			console.error("Error deleting participant:", err);
			setError("Error deleting participant record");
			setShowDeleteConfirm(false);
		} finally {
			setLoading(false);
		}
	};

	if (accessLoading || fetching) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-[#0b4d2b]" />
				<span className="ml-3 text-gray-600">Loading...</span>
			</div>
		);
	}

	if (!trainingSection) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
					<p className="text-gray-600">You do not have access to the Training Section. Please contact your administrator.</p>
					<button
						onClick={() => router.push('/dashboard/training/participants')}
						className="mt-4 px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24]"
					>
						Back to Participants
					</button>
				</div>
			</div>
		);
	}

	if (isEditMode && !accessEdit) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
					<p className="text-gray-600">You do not have permission to edit participant records. Please contact your administrator.</p>
					<button
						onClick={() => router.push('/dashboard/training/participants')}
						className="mt-4 px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24]"
					>
						Back to Participants
					</button>
				</div>
			</div>
		);
	}

	if (!isEditMode && !accessAdd) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
					<p className="text-gray-600">You do not have permission to add participant records. Please contact your administrator.</p>
					<button
						onClick={() => router.push('/dashboard/training/participants')}
						className="mt-4 px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24]"
					>
						Back to Participants
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
					<h1 className="text-2xl font-bold text-gray-900">
						{isEditMode ? "Edit Participant" : "Add Participant"}
					</h1>
					<p className="text-gray-600 mt-2">
						{isEditMode ? "Update participant information" : "Add a new workshop participant"}
					</p>
				</div>
				<div className="flex items-center space-x-3">
					{isEditMode && accessDelete && (
						<button
							onClick={() => setShowDeleteConfirm(true)}
							disabled={loading}
							className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
						>
							<Trash2 className="h-4 w-4 mr-2" />
							Delete
						</button>
					)}
					<button
						onClick={() => router.push('/dashboard/training/participants')}
						className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back
					</button>
				</div>
			</div>

			{/* Success Message */}
			{success && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
					<CheckCircle className="h-5 w-5 text-green-600 mr-3" />
					<p className="text-green-800">
						{isEditMode ? "Participant updated successfully!" : "Participant added successfully!"}
					</p>
				</div>
			)}

			{/* Error Message */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
					<AlertCircle className="h-5 w-5 text-red-600 mr-3" />
					<p className="text-red-800">{error}</p>
				</div>
			)}

			{/* Form */}
			<form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Participant Name */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Participant Name <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							value={formData.participant_name || ""}
							onChange={(e) => handleInputChange('participant_name', e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							required
						/>
					</div>

					{/* SO/DO/WO/HO */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							SO/DO/WO/HO
						</label>
						<input
							type="text"
							value={formData.so_do_wo_ho || ""}
							onChange={(e) => handleInputChange('so_do_wo_ho', e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						/>
					</div>

					{/* Gender */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Gender <span className="text-red-500">*</span>
						</label>
						<select
							value={formData.gender || ""}
							onChange={(e) => handleInputChange('gender', e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							required
						>
							<option value="">Select Gender</option>
							{GENDER_OPTIONS.map((gender) => (
								<option key={gender} value={gender}>
									{gender}
								</option>
							))}
						</select>
					</div>

					{/* Organization/Department */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Organization/Department
						</label>
						<input
							type="text"
							value={formData.organization_department || ""}
							onChange={(e) => handleInputChange('organization_department', e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						/>
					</div>

					{/* Designation */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Designation
						</label>
						<input
							type="text"
							value={formData.designation || ""}
							onChange={(e) => handleInputChange('designation', e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						/>
					</div>

					{/* Profession */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Profession
						</label>
						<input
							type="text"
							value={formData.profession || ""}
							onChange={(e) => handleInputChange('profession', e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						/>
					</div>

					{/* CNIC Number */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							CNIC Number
							<span className="text-xs text-gray-500 ml-2">(Format: XXXXX-XXXXXXX-X)</span>
						</label>
						<input
							type="text"
							value={formData.cnic_number || ""}
							onChange={(e) => handleInputChange('cnic_number', e.target.value)}
							placeholder="12345-1234567-1"
							maxLength={15}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						/>
					</div>

					{/* Contact Number */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Contact Number
							<span className="text-xs text-gray-500 ml-2">(Format: XXXX-XXXXXXX)</span>
						</label>
						<input
							type="text"
							value={formData.contact_number || ""}
							onChange={(e) => handleInputChange('contact_number', e.target.value)}
							placeholder="0346-9750336"
							maxLength={12}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						/>
					</div>

					{/* District */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							District <span className="text-red-500">*</span>
						</label>
						<select
							value={formData.district || ""}
							onChange={(e) => {
								handleInputChange('district', e.target.value);
								handleInputChange('tehsil', ''); // Reset tehsil when district changes
							}}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							required
						>
							<option value="">Select District</option>
							{DISTRICT_OPTIONS.map((district) => (
								<option key={district} value={district}>
									{district}
								</option>
							))}
						</select>
					</div>

					{/* Tehsil */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Tehsil
						</label>
						<select
							value={formData.tehsil || ""}
							onChange={(e) => handleInputChange('tehsil', e.target.value)}
							disabled={!formData.district || loadingTehsils}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
						>
							<option value="">Select Tehsil</option>
							{tehsils.map((tehsil) => (
								<option key={tehsil} value={tehsil}>
									{tehsil}
								</option>
							))}
						</select>
					</div>

					{/* Workshop/Training/Session/Conference */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Workshop/Training/Session/Conference <span className="text-red-500">*</span>
						</label>
						<select
							value={formData.workshop_training_name || ""}
							onChange={(e) => handleInputChange('workshop_training_name', e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							required
						>
							<option value="">Select Workshop/Training</option>
							{workshopTrainingNames.map((name) => (
								<option key={name} value={name}>
									{name}
								</option>
							))}
						</select>
					</div>

					{/* Workshop Session Conference */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Workshop Session/Conference
						</label>
						<input
							type="text"
							value={formData.workshop_session_conference || ""}
							onChange={(e) => handleInputChange('workshop_session_conference', e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						/>
					</div>

					{/* Start Date */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Start Date
						</label>
						<input
							type="date"
							value={formData.start_date || ""}
							onChange={(e) => handleInputChange('start_date', e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						/>
					</div>

					{/* End Date */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							End Date
						</label>
						<input
							type="date"
							value={formData.end_date || ""}
							onChange={(e) => handleInputChange('end_date', e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						/>
					</div>

					{/* NC/VC */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							NC/VC
						</label>
						<input
							type="text"
							value={formData.NC_VC || ""}
							onChange={(e) => handleInputChange('NC_VC', e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						/>
					</div>

					{/* Training Unit */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Training Unit
						</label>
						<input
							type="text"
							value={formData.Training_Unit || ""}
							onChange={(e) => handleInputChange('Training_Unit', e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						/>
					</div>

					{/* Venue */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Venue
						</label>
						<input
							type="text"
							value={formData.Venue || ""}
							onChange={(e) => handleInputChange('Venue', e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						/>
					</div>

					{/* Duration Days */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Duration (Days)
						</label>
						<input
							type="number"
							value={formData.Duration_Days || ""}
							onChange={(e) => handleInputChange('Duration_Days', e.target.value ? parseInt(e.target.value) : undefined)}
							min="0"
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						/>
					</div>
				</div>

				{/* Submit Button */}
				<div className="mt-6 flex justify-end">
					<button
						type="submit"
						disabled={loading}
						className="inline-flex items-center px-6 py-3 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Saving...
							</>
						) : (
							<>
								<Save className="h-4 w-4 mr-2" />
								{isEditMode ? "Update Participant" : "Save Participant"}
							</>
						)}
					</button>
				</div>
			</form>

			{/* Delete Confirmation Modal */}
			{showDeleteConfirm && (
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
									Are you sure you want to delete this participant record?
								</p>
								<div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
									<p className="text-sm font-medium text-gray-500 mb-1">Participant Name:</p>
									<p className="text-base font-semibold text-gray-900">
										{formData.participant_name || "N/A"}
									</p>
									{formData.cnic_number && (
										<>
											<p className="text-sm font-medium text-gray-500 mb-1 mt-2">CNIC:</p>
											<p className="text-base text-gray-700">{formData.cnic_number}</p>
										</>
									)}
									{formData.workshop_training_name && (
										<>
											<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Workshop:</p>
											<p className="text-base text-gray-700">{formData.workshop_training_name}</p>
										</>
									)}
								</div>
							</div>
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start">
								<AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
								<p className="text-sm text-yellow-800">
									<strong>Warning:</strong> This will permanently delete this participant record from the database. This action cannot be undone.
								</p>
							</div>
						</div>

						{/* Modal Footer */}
						<div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end space-x-3 border-t border-gray-200">
							<button
								onClick={() => setShowDeleteConfirm(false)}
								disabled={loading}
								className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								onClick={handleDelete}
								disabled={loading}
								className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
							>
								{loading ? (
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

