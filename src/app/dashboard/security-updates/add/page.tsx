"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
	ArrowLeft, 
	Save, 
	AlertCircle, 
	CheckCircle, 
	Loader2,
	Trash2,
	Shield
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

type SecurityIncidentFormData = {
	id?: number;
	incident_title?: string;
	category?: string;
	location_district?: string;
	location_province?: string;
	incident_date?: string;
	incident_summary?: string;
	operational_impact?: string;
	recommended_actions?: string;
	reported_by?: string;
	Comment?: string;
	ReferenceNumber?: string;
};

const CATEGORY_OPTIONS = [
	"Security Breach",
	"Physical Security",
	"Cybersecurity",
	"Data Breach",
	"Unauthorized Access",
	"System Compromise",
	"Network Attack",
	"Malware",
	"Phishing",
	"Other"
];

const PROVINCE_OPTIONS = [
	"Khyber Pakhtunkhwa",
	"Punjab",
	"Sindh",
	"Balochistan",
	"Gilgit-Baltistan",
	"Azad Jammu and Kashmir"
];

const DISTRICT_OPTIONS = [
	"DIK",
	"Bannu",
	"Peshawar",
	"Mardan",
	"Swat",
	"Kohat",
	"Bannu",
	"Charsadda",
	"Nowshera",
	"Other"
];

export default function AddSecurityIncidentPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const id = searchParams.get('id');
	const isEditMode = !!id;
	
	const { user, getUserId } = useAuth();
	const userName = user?.name || user?.username || "System";

	const [formData, setFormData] = useState<SecurityIncidentFormData>({});
	const [loading, setLoading] = useState(false);
	const [fetching, setFetching] = useState(isEditMode);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	// Fetch existing data if editing
	useEffect(() => {
		if (isEditMode && id) {
			fetchIncidentData();
		}
	}, [isEditMode, id]);

	const fetchIncidentData = async () => {
		try {
			setFetching(true);
			const response = await fetch(`/api/security-updates?id=${id}`);
			const data = await response.json();

			if (data.success && data.incident) {
				const incident = data.incident;
				setFormData({
					id: incident.id,
					incident_title: incident.incident_title || "",
					category: incident.category || "",
					location_district: incident.location_district || "",
					location_province: incident.location_province || "",
					incident_date: incident.incident_date || "",
					incident_summary: incident.incident_summary || "",
					operational_impact: incident.operational_impact || "",
					recommended_actions: incident.recommended_actions || "",
					reported_by: incident.reported_by || "",
					Comment: incident.Comment || "",
					ReferenceNumber: incident.ReferenceNumber || ""
				});
			} else {
				setError("Failed to fetch security incident data");
			}
		} catch (err) {
			console.error("Error fetching security incident data:", err);
			setError("Error fetching security incident data");
		} finally {
			setFetching(false);
		}
	};

	const handleInputChange = (field: keyof SecurityIncidentFormData, value: any) => {
		setFormData(prev => ({ ...prev, [field]: value }));
		setError(null);
	};

	const validateForm = (): boolean => {
		if (!formData.incident_title?.trim()) {
			setError("Incident Title is required");
			return false;
		}
		if (!formData.category) {
			setError("Category is required");
			return false;
		}
		if (!formData.location_district?.trim()) {
			setError("Location District is required");
			return false;
		}
		if (!formData.location_province?.trim()) {
			setError("Location Province is required");
			return false;
		}
		if (!formData.incident_date) {
			setError("Incident Date is required");
			return false;
		}
		if (!formData.incident_summary?.trim()) {
			setError("Incident Summary is required");
			return false;
		}
		if (!formData.operational_impact?.trim()) {
			setError("Operational Impact is required");
			return false;
		}
		if (!formData.recommended_actions?.trim()) {
			setError("Recommended Actions is required");
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
				reported_by: formData.reported_by || userName
			};

			const url = isEditMode 
				? '/api/security-updates/update'
				: '/api/security-updates/add';
			
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
					router.push('/dashboard/security-updates');
				}, 1500);
			} else {
				setError(data.message || "Failed to save security incident");
			}
		} catch (err) {
			console.error("Error saving security incident:", err);
			setError("Error saving security incident record");
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!isEditMode || !id) return;
		
		if (!confirm("Are you sure you want to delete this security incident? This action cannot be undone.")) {
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const response = await fetch(`/api/security-updates/delete?id=${id}`, {
				method: 'DELETE'
			});

			const data = await response.json();

			if (data.success) {
				setSuccess(true);
				setTimeout(() => {
					router.push('/dashboard/security-updates');
				}, 1500);
			} else {
				setError(data.message || "Failed to delete security incident");
			}
		} catch (err) {
			console.error("Error deleting security incident:", err);
			setError("Error deleting security incident record");
		} finally {
			setLoading(false);
		}
	};

	if (fetching) {
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
				<div className="flex items-center gap-4">
					<Link
						href="/dashboard/security-updates"
						className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-green-50 rounded-lg transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back
					</Link>
					<div>
						<h1 className="text-2xl font-bold text-gray-900">
							{isEditMode ? "Edit Security Incident" : "Add Security Incident"}
						</h1>
						<p className="text-gray-600 mt-1">
							{isEditMode ? "Update security incident information" : "Create a new security incident record"}
						</p>
					</div>
				</div>
				{isEditMode && (
					<button
						onClick={handleDelete}
						className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
					>
						<Trash2 className="h-4 w-4 mr-2" />
						Delete
					</button>
				)}
			</div>

			{/* Success Message */}
			{success && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
					<CheckCircle className="h-5 w-5 text-green-600 mr-3" />
					<span className="text-green-800">
						{isEditMode ? "Security incident updated successfully!" : "Security incident added successfully!"}
					</span>
				</div>
			)}

			{/* Error Message */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
					<AlertCircle className="h-5 w-5 text-red-600 mr-3" />
					<span className="text-red-800">{error}</span>
				</div>
			)}

			{/* Form */}
			<form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 space-y-6">
				{/* Basic Information Section */}
				<div className="border-b border-gray-200 pb-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
						<Shield className="h-5 w-5 mr-2 text-[#0b4d2b]" />
						Basic Information
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Incident Title */}
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Incident Title <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={formData.incident_title || ""}
								onChange={(e) => handleInputChange('incident_title', e.target.value)}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
								placeholder="Enter incident title"
								maxLength={100}
								required
							/>
						</div>

						{/* Category */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Category <span className="text-red-500">*</span>
							</label>
							<select
								value={formData.category || ""}
								onChange={(e) => handleInputChange('category', e.target.value)}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
								required
							>
								<option value="">Select Category</option>
								{CATEGORY_OPTIONS.map((cat) => (
									<option key={cat} value={cat}>{cat}</option>
								))}
							</select>
						</div>

						{/* Incident Date */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Incident Date <span className="text-red-500">*</span>
							</label>
							<input
								type="date"
								value={formData.incident_date || ""}
								onChange={(e) => handleInputChange('incident_date', e.target.value)}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
								required
							/>
						</div>

						{/* Location Province */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Location Province <span className="text-red-500">*</span>
							</label>
							<select
								value={formData.location_province || ""}
								onChange={(e) => handleInputChange('location_province', e.target.value)}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
								required
							>
								<option value="">Select Province</option>
								{PROVINCE_OPTIONS.map((prov) => (
									<option key={prov} value={prov}>{prov}</option>
								))}
							</select>
						</div>

						{/* Location District */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Location District <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={formData.location_district || ""}
								onChange={(e) => handleInputChange('location_district', e.target.value)}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
								placeholder="Enter district name"
								maxLength={150}
								required
							/>
						</div>
					</div>
				</div>

				{/* Incident Details Section */}
				<div className="border-b border-gray-200 pb-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">Incident Details</h2>
					<div className="space-y-6">
						{/* Incident Summary */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Incident Summary <span className="text-red-500">*</span>
							</label>
							<textarea
								value={formData.incident_summary || ""}
								onChange={(e) => handleInputChange('incident_summary', e.target.value)}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
								rows={5}
								placeholder="Provide a detailed summary of the security incident..."
								required
							/>
						</div>

						{/* Operational Impact */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Operational Impact <span className="text-red-500">*</span>
							</label>
							<textarea
								value={formData.operational_impact || ""}
								onChange={(e) => handleInputChange('operational_impact', e.target.value)}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
								rows={5}
								placeholder="Describe the operational impact of this incident..."
								required
							/>
						</div>

						{/* Recommended Actions */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Recommended Actions <span className="text-red-500">*</span>
							</label>
							<textarea
								value={formData.recommended_actions || ""}
								onChange={(e) => handleInputChange('recommended_actions', e.target.value)}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
								rows={5}
								placeholder="List the recommended actions to address this incident..."
								required
							/>
						</div>
					</div>
				</div>

				{/* Additional Information Section */}
				<div>
					<h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Reference Number */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Reference #
							</label>
							<input
								type="text"
								value={formData.ReferenceNumber || ""}
								onChange={(e) => handleInputChange('ReferenceNumber', e.target.value)}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
								placeholder="Enter reference number"
							/>
						</div>

						{/* Reported By */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Reported By
							</label>
							<input
								type="text"
								value={formData.reported_by || userName}
								onChange={(e) => handleInputChange('reported_by', e.target.value)}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none bg-gray-50"
								placeholder="Enter reporter name"
								maxLength={100}
							/>
						</div>

						{/* Comment */}
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Comment
							</label>
							<textarea
								value={formData.Comment || ""}
								onChange={(e) => handleInputChange('Comment', e.target.value)}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
								rows={3}
								placeholder="Enter any additional comments..."
							/>
						</div>
					</div>
				</div>

				{/* Form Actions */}
				<div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
					<Link
						href="/dashboard/security-updates"
						className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
					>
						Cancel
					</Link>
					<button
						type="submit"
						disabled={loading}
						className="inline-flex items-center px-6 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Saving...
							</>
						) : (
							<>
								<Save className="h-4 w-4 mr-2" />
								{isEditMode ? "Update Incident" : "Save Incident"}
							</>
						)}
					</button>
				</div>
			</form>
		</div>
	);
}

