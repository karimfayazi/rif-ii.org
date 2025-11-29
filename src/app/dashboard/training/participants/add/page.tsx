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

const DISTRICT_OPTIONS = ["DIK", "Bannu"];
const GENDER_OPTIONS = ["Male", "Female"];

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
	workshop_training_name?: string;
	workshop_session_conference?: string;
	start_date?: string;
	end_date?: string;
	date_entered_by?: string;
};

export default function AddParticipantPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const sn = searchParams.get('sn');
	const isEditMode = !!sn;
	
	const { user, getUserId } = useAuth();
	const userId = user?.id || getUserId();
	const { isAdmin, loading: accessLoading } = useAccess(userId);

	const [formData, setFormData] = useState<ParticipantFormData>({});
	const [loading, setLoading] = useState(false);
	const [fetching, setFetching] = useState(isEditMode);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [tehsils, setTehsils] = useState<string[]>([]);
	const [workshopTrainingNames, setWorkshopTrainingNames] = useState<string[]>([]);
	const [loadingTehsils, setLoadingTehsils] = useState(false);

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
			fetchTehsils(formData.district);
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
					tehsil: participant.tehsil || "",
					district: participant.district || "",
					workshop_training_name: participant.workshop_training_name || "",
					workshop_session_conference: participant.workshop_session_conference || "",
					start_date: participant.start_date || "",
					end_date: participant.end_date || "",
					date_entered_by: participant.date_entered_by || ""
				});
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
		if (!district || district === 'ALL') {
			setTehsils([]);
			return;
		}
		try {
			setLoadingTehsils(true);
			const res = await fetch(`/api/tracking-sheet/tehsils?district=${encodeURIComponent(district)}`);
			const data = await res.json();
			if (data.success) {
				const tehsilList = data.tehsils || [];
				setTehsils(tehsilList);
			} else {
				setTehsils([]);
			}
		} catch (e) {
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
		
		if (!confirm("Are you sure you want to delete this participant record? This action cannot be undone.")) {
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const response = await fetch(`/api/training/participants/delete?sn=${sn}`, {
				method: 'DELETE'
			});

			const data = await response.json();

			if (data.success) {
				setSuccess(true);
				setTimeout(() => {
					router.push('/dashboard/training/participants');
				}, 1500);
			} else {
				setError(data.message || "Failed to delete participant record");
			}
		} catch (err) {
			console.error("Error deleting participant:", err);
			setError("Error deleting participant record");
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
					{isEditMode && isAdmin && (
						<button
							onClick={handleDelete}
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
		</div>
	);
}

