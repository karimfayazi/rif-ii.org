"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
	ArrowLeft, 
	Save, 
	AlertCircle, 
	CheckCircle, 
	Loader2,
	Trash2,
	Shield,
	Upload,
	X,
	ChevronDown
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";
import { uploadToBlob } from "@/lib/uploads";
import { parseCategoryValues, serializeCategoryValues } from "@/lib/security-incidents";

type SecurityIncidentFormData = {
	id?: number;
	incident_title?: string;
	category?: string[];
	location_district?: string;
	location_province?: string;
	incident_date_from?: string;
	incident_date_to?: string;
	incident_summary?: string;
	operational_impact?: string;
	recommended_actions?: string;
	date_reported?: string;
	reported_by?: string;
	Comment?: string;
	ReferenceNumber?: string;
	incident_image_1?: string;
	incident_image_2?: string;
	incident_image_3?: string;
	incident_youtube_link?: string;
};

const CATEGORY_OPTIONS = [
	"Militants Killed",
	"Militants Injured",
	"Militants Arrested",
	"LEA Killed",
	"LEA Injured",
	"Civilians Killed",
	"Civilians Injured",
	"IEDs",
	"Target Killings",
	"Abductions",
	"Fire Raid",
	"Extortions"
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
	const userId = user?.id || user?.username || getUserId() || null;
	const { accessSecurityUpdates, loading: accessLoading } = useAccess(userId);
	const userName = user?.name || user?.username || "System";

	const [formData, setFormData] = useState<SecurityIncidentFormData>({});
	const [loading, setLoading] = useState(false);
	const [fetching, setFetching] = useState(isEditMode);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [imageUploading, setImageUploading] = useState<Record<string, boolean>>({});
	const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
	const categoryDropdownRef = useRef<HTMLDivElement>(null);

	const handleImageUpload = async (
		file: File,
		field: 'incident_image_1' | 'incident_image_2' | 'incident_image_3'
	) => {
		if (!accessSecurityUpdates) {
			setError("You do not have permission to upload security incident images.");
			return;
		}
		setImageUploading(prev => ({ ...prev, [field]: true }));
		setError(null);
		try {
			const result = await uploadToBlob(file, 'pictures');
			setFormData(prev => ({ ...prev, [field]: result.url }));
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Upload failed';
			setError(msg);
		} finally {
			setImageUploading(prev => ({ ...prev, [field]: false }));
		}
	};

	const handleImageFileChange = (
		e: React.ChangeEvent<HTMLInputElement>,
		field: 'incident_image_1' | 'incident_image_2' | 'incident_image_3'
	) => {
		const file = e.target.files?.[0];
		if (file) {
			handleImageUpload(file, field);
		}
		e.target.value = '';
	};

	const clearImage = (field: 'incident_image_1' | 'incident_image_2' | 'incident_image_3') => {
		setFormData(prev => ({ ...prev, [field]: '' }));
	};

	// Fetch existing data if editing
	useEffect(() => {
		if (isEditMode && id) {
			fetchIncidentData();
		}
	}, [isEditMode, id]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				categoryDropdownRef.current &&
				!categoryDropdownRef.current.contains(event.target as Node)
			) {
				setCategoryDropdownOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

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
					category: parseCategoryValues(incident.category),
					location_district: incident.location_district || "",
					location_province: incident.location_province || "",
					incident_date_from: incident.incident_date_from || incident.incident_date || "",
					incident_date_to: incident.incident_date_to || "",
					incident_summary: incident.incident_summary || "",
					operational_impact: incident.operational_impact || "",
					recommended_actions: incident.recommended_actions || "",
					date_reported: incident.date_reported || "",
					reported_by: incident.reported_by || "",
					Comment: incident.Comment || "",
					ReferenceNumber: incident.ReferenceNumber || "",
					incident_image_1: incident.incident_image_1 || "",
					incident_image_2: incident.incident_image_2 || "",
					incident_image_3: incident.incident_image_3 || "",
					incident_youtube_link: incident.incident_youtube_link || ""
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

	const toggleCategory = (categoryValue: string) => {
		setFormData((prev) => {
			const currentCategories = prev.category || [];
			const nextCategories = currentCategories.includes(categoryValue)
				? currentCategories.filter((item) => item !== categoryValue)
				: [...currentCategories, categoryValue];

			return {
				...prev,
				category: nextCategories
			};
		});
		setError(null);
	};

	const removeCategory = (categoryValue: string) => {
		setFormData((prev) => ({
			...prev,
			category: (prev.category || []).filter((item) => item !== categoryValue)
		}));
		setError(null);
	};

	const validateForm = (): boolean => {
		if (!formData.incident_title?.trim()) {
			setError("Incident Title is required");
			return false;
		}
		if (!formData.category?.length) {
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
		if (!formData.incident_date_from) {
			setError("Incident Date From is required");
			return false;
		}
		if (
			formData.incident_date_from &&
			formData.incident_date_to &&
			formData.incident_date_to < formData.incident_date_from
		) {
			setError("Incident Date To cannot be earlier than Incident Date From");
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
		if (formData.incident_youtube_link?.trim() && !/^https?:\/\//.test(formData.incident_youtube_link.trim())) {
			setError("YouTube link must start with http:// or https://");
			return false;
		}
		return true;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!accessSecurityUpdates) {
			setError("You do not have permission to modify security incidents.");
			return;
		}
		
		if (!validateForm()) {
			return;
		}

		setLoading(true);
		setError(null);
		setSuccess(false);

		try {
			const submitData = {
				...formData,
				category: serializeCategoryValues(formData.category),
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
		if (!accessSecurityUpdates) {
			setError("You do not have permission to delete security incidents.");
			return;
		}
		
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
						<div className="relative" ref={categoryDropdownRef}>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Category <span className="text-red-500">*</span>
							</label>
							<button
								type="button"
								onClick={() => setCategoryDropdownOpen((prev) => !prev)}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none bg-white text-left flex items-center justify-between"
							>
								<span className={(formData.category?.length || 0) > 0 ? "text-gray-900" : "text-gray-500"}>
									{(formData.category?.length || 0) > 0
										? `${formData.category?.length} categor${formData.category?.length === 1 ? "y" : "ies"} selected`
										: "Select Category"}
								</span>
								<ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${categoryDropdownOpen ? "rotate-180" : ""}`} />
							</button>
							{categoryDropdownOpen && (
								<div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
									<div className="p-2 space-y-1">
										{CATEGORY_OPTIONS.map((cat) => (
											<label
												key={cat}
												className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer"
											>
												<input
													type="checkbox"
													checked={(formData.category || []).includes(cat)}
													onChange={() => toggleCategory(cat)}
													className="h-4 w-4 text-[#0b4d2b] focus:ring-[#0b4d2b] border-gray-300 rounded"
												/>
												<span className="text-sm text-gray-700">{cat}</span>
											</label>
										))}
									</div>
								</div>
							)}
							<div className="mt-3 flex flex-wrap gap-2">
								{(formData.category || []).map((cat) => (
									<span
										key={cat}
										className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
									>
										{cat}
										<button
											type="button"
											onClick={() => removeCategory(cat)}
											className="text-blue-700 hover:text-blue-900"
											aria-label={`Remove ${cat}`}
										>
											<X className="h-3 w-3" />
										</button>
									</span>
								))}
							</div>
						</div>

						{/* Incident Date From */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Incident Date From <span className="text-red-500">*</span>
							</label>
							<input
								type="date"
								value={formData.incident_date_from || ""}
								onChange={(e) => handleInputChange('incident_date_from', e.target.value)}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
								required
							/>
						</div>

						{/* Incident Date To */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Incident Date To
							</label>
							<input
								type="date"
								value={formData.incident_date_to || ""}
								onChange={(e) => handleInputChange('incident_date_to', e.target.value)}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
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

			{/* Media / Attachments Section */}
			<div className="border-b border-gray-200 pb-6">
				<h2 className="text-lg font-semibold text-gray-900 mb-4">Media / Attachments</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{(['incident_image_1', 'incident_image_2', 'incident_image_3'] as const).map((field, idx) => (
						<div key={field}>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Image {idx + 1}
							</label>
							{formData[field]?.trim() ? (
								<div className="relative group">
									<a href={formData[field]} target="_blank" rel="noopener noreferrer">
										<img
											src={formData[field]}
											alt={`Image ${idx + 1}`}
											className="w-full h-40 object-cover rounded-lg border border-gray-200"
											onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
										/>
									</a>
									<button
										type="button"
										onClick={() => clearImage(field)}
										className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
									>
										<X className="h-4 w-4" />
									</button>
								</div>
							) : (
								<div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-[#0b4d2b] transition-colors">
									{imageUploading[field] ? (
										<div className="flex flex-col items-center py-2">
											<Loader2 className="h-8 w-8 animate-spin text-[#0b4d2b] mb-2" />
											<p className="text-sm text-gray-500">Uploading...</p>
										</div>
									) : (
										<>
											<input
												type="file"
												accept="image/*"
												onChange={(e) => handleImageFileChange(e, field)}
												disabled={!accessSecurityUpdates}
												className="hidden"
												id={`file-${field}`}
											/>
											<label htmlFor={`file-${field}`} className={`flex flex-col items-center ${!accessSecurityUpdates ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
												<Upload className="h-8 w-8 text-gray-400 mb-2" />
												<p className="text-sm font-medium text-gray-700">Click to upload</p>
												<p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP up to 100MB</p>
											</label>
										</>
									)}
								</div>
							)}
						</div>
					))}
				</div>

				{/* YouTube Link */}
				<div className="mt-6">
					<label className="block text-sm font-medium text-gray-700 mb-2">
						YouTube Link
					</label>
					<input
						type="text"
						value={formData.incident_youtube_link || ""}
						onChange={(e) => handleInputChange('incident_youtube_link', e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						placeholder="https://www.youtube.com/watch?v=..."
					/>
					{formData.incident_youtube_link?.trim() && /^https?:\/\//.test(formData.incident_youtube_link.trim()) && (
						<a href={formData.incident_youtube_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center mt-2 text-sm text-blue-600 hover:underline">
							Open YouTube Link
						</a>
					)}
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
						disabled={loading || !accessSecurityUpdates || accessLoading}
						title={!accessSecurityUpdates ? "You do not have permission to modify security incidents" : undefined}
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

