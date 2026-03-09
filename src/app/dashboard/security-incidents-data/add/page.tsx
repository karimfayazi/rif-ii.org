"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	ArrowLeft,
	Save,
	AlertCircle,
	CheckCircle,
	Loader2,
	Trash2,
	Shield,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";

type FormData = {
	id?: number;
	QTR_No?: string;
	QPR_QTR_No?: string;
	Month_Year?: string;
	District?: string;
	Militants_Killed?: number | string;
	Militants_Injured?: number | string;
	Militants_Arrested?: number | string;
	LEA_Killed?: number | string;
	LEA_Injured?: number | string;
	Civilians_Killed?: number | string;
	Civilians_Injured?: number | string;
	IEDs?: number | string;
	Target_Killings?: number | string;
	Abductions?: number | string;
	Fire_Raid?: number | string;
	Extortions?: number | string;
	username?: string;
};

const NUMERIC_FIELDS = [
	"Militants_Killed",
	"Militants_Injured",
	"Militants_Arrested",
	"LEA_Killed",
	"LEA_Injured",
	"Civilians_Killed",
	"Civilians_Injured",
	"IEDs",
	"Target_Killings",
	"Abductions",
	"Fire_Raid",
	"Extortions",
] as const;

const FIELD_LABELS: Record<string, string> = {
	Militants_Killed: "Militants Killed",
	Militants_Injured: "Militants Injured",
	Militants_Arrested: "Militants Arrested",
	LEA_Killed: "LEA Killed",
	LEA_Injured: "LEA Injured",
	Civilians_Killed: "Civilians Killed",
	Civilians_Injured: "Civilians Injured",
	IEDs: "IEDs",
	Target_Killings: "Target Killings",
	Abductions: "Abductions",
	Fire_Raid: "Fire Raid",
	Extortions: "Extortions",
};

const DISTRICT_OPTIONS = ["DIK", "Bannu"];

const MONTH_ABBR = [
	"Jan", "Feb", "Mar", "Apr", "May", "Jun",
	"Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function deriveQtrNo(monthYear: string): string {
	if (!monthYear) return "";
	const parts = monthYear.split("-");
	if (parts.length !== 2) return "";
	const monthStr = parts[0];
	const yearStr = parts[1];
	const monthIdx = MONTH_ABBR.indexOf(monthStr);
	if (monthIdx === -1) return "";
	const qtr = Math.floor(monthIdx / 3) + 1;
	return `Q${qtr}-${yearStr}`;
}

function monthYearToPickerValue(monthYear: string): string {
	if (!monthYear) return "";
	const parts = monthYear.split("-");
	if (parts.length !== 2) return "";
	const monthIdx = MONTH_ABBR.indexOf(parts[0]);
	if (monthIdx === -1) return "";
	return `${parts[1]}-${String(monthIdx + 1).padStart(2, "0")}`;
}

function pickerValueToMonthYear(pickerVal: string): string {
	if (!pickerVal) return "";
	const [year, month] = pickerVal.split("-");
	const idx = parseInt(month, 10) - 1;
	if (idx < 0 || idx > 11) return "";
	return `${MONTH_ABBR[idx]}-${year}`;
}

export default function AddSecurityIncidentDataPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const id = searchParams.get("id");
	const isEditMode = !!id;

	const { user, getUserId } = useAuth();
	const userId = user?.id || user?.username || getUserId() || null;
	const { accessSecurityIncidentsData, loading: accessLoading } = useAccess(userId);
	const userName = user?.name || user?.username || "System";

	const [formData, setFormData] = useState<FormData>({});
	const [loading, setLoading] = useState(false);
	const [fetching, setFetching] = useState(isEditMode);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	useEffect(() => {
		if (isEditMode && id) {
			fetchRecord();
		}
	}, [isEditMode, id]);

	const fetchRecord = async () => {
		try {
			setFetching(true);
			const response = await fetch(`/api/security-incidents-data?id=${id}`);
			const data = await response.json();

			if (data.success && data.incident) {
				const r = data.incident;
				setFormData({
					id: r.id,
					QTR_No: r.QTR_No != null ? String(r.QTR_No) : "",
					QPR_QTR_No: r.QPR_QTR_No != null ? String(r.QPR_QTR_No) : "",
					Month_Year: r.Month_Year || "",
					District: r.District || "",
					Militants_Killed: r.Militants_Killed ?? 0,
					Militants_Injured: r.Militants_Injured ?? 0,
					Militants_Arrested: r.Militants_Arrested ?? 0,
					LEA_Killed: r.LEA_Killed ?? 0,
					LEA_Injured: r.LEA_Injured ?? 0,
					Civilians_Killed: r.Civilians_Killed ?? 0,
					Civilians_Injured: r.Civilians_Injured ?? 0,
					IEDs: r.IEDs ?? 0,
					Target_Killings: r.Target_Killings ?? 0,
					Abductions: r.Abductions ?? 0,
					Fire_Raid: r.Fire_Raid ?? 0,
					Extortions: r.Extortions ?? 0,
					username: r.username || "",
				});
			} else {
				setError("Failed to fetch record");
			}
		} catch (err) {
			console.error("Error fetching record:", err);
			setError("Error fetching record");
		} finally {
			setFetching(false);
		}
	};

	const handleInputChange = (field: keyof FormData, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		setError(null);
	};

	const handleMonthPickerChange = (pickerVal: string) => {
		const monthYear = pickerValueToMonthYear(pickerVal);
		const qtrNo = deriveQtrNo(monthYear);
		setFormData((prev) => ({
			...prev,
			Month_Year: monthYear,
			QTR_No: qtrNo,
		}));
		setError(null);
	};

	const total = useMemo(() => {
		let sum = 0;
		for (const field of NUMERIC_FIELDS) {
			sum += parseInt(String(formData[field] ?? 0), 10) || 0;
		}
		return sum;
	}, [formData]);

	const validateForm = (): boolean => {
		if (!formData.Month_Year?.toString().trim()) {
			setError("Month/Year is required");
			return false;
		}
		if (!formData.District?.toString().trim()) {
			setError("District is required");
			return false;
		}
		return true;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!accessSecurityIncidentsData) {
			setError("You do not have permission to modify incident records.");
			return;
		}
		if (!validateForm()) return;

		setLoading(true);
		setError(null);
		setSuccess(false);

		try {
			const submitData = {
				...formData,
				Total: total,
				username: formData.username || userName,
			};

			const url = isEditMode
				? "/api/security-incidents-data/update"
				: "/api/security-incidents-data/add";
			const method = isEditMode ? "PUT" : "POST";

			const response = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(submitData),
			});

			const data = await response.json();

			if (data.success) {
				setSuccess(true);
				setTimeout(() => {
					router.push("/dashboard/security-incidents-data");
				}, 1500);
			} else {
				setError(data.message || "Failed to save record");
			}
		} catch (err) {
			console.error("Error saving record:", err);
			setError("Error saving record");
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!isEditMode || !id) return;
		if (!accessSecurityIncidentsData) {
			setError("You do not have permission to delete incident records.");
			return;
		}
		if (
			!confirm(
				"Are you sure you want to delete this record? This action cannot be undone."
			)
		)
			return;

		setLoading(true);
		setError(null);

		try {
			const response = await fetch(
				`/api/security-incidents-data/delete?id=${id}`,
				{ method: "DELETE" }
			);
			const data = await response.json();

			if (data.success) {
				setSuccess(true);
				setTimeout(() => {
					router.push("/dashboard/security-incidents-data");
				}, 1500);
			} else {
				setError(data.message || "Failed to delete record");
			}
		} catch (err) {
			console.error("Error deleting record:", err);
			setError("Error deleting record");
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

	const monthPickerValue = monthYearToPickerValue(formData.Month_Year || "");

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link
						href="/dashboard/security-incidents-data"
						className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-green-50 rounded-lg transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back
					</Link>
					<div>
						<h1 className="text-2xl font-bold text-gray-900">
							{isEditMode ? "Edit Incident Record" : "Add New Incident Record"}
						</h1>
						<p className="text-gray-600 mt-1">
							{isEditMode
								? "Update the incident summary record"
								: "Create a new incident summary record"}
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
						{isEditMode
							? "Record updated successfully!"
							: "Record added successfully!"}
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
			<form
				onSubmit={handleSubmit}
				className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 space-y-6"
			>
				{/* Basic Information */}
				<div className="border-b border-gray-200 pb-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
						<Shield className="h-5 w-5 mr-2 text-[#0b4d2b]" />
						Basic Information
					</h2>
				<div className="grid grid-cols-1 md:grid-cols-5 gap-6">
					{/* Month_Year — month picker */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Month / Year <span className="text-red-500">*</span>
						</label>
						<input
							type="month"
							value={monthPickerValue}
							onChange={(e) => handleMonthPickerChange(e.target.value)}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
							required
						/>
						{formData.Month_Year && (
							<p className="text-xs text-gray-500 mt-1">
								Stored as: {formData.Month_Year}
							</p>
						)}
					</div>

					{/* QTR_No — readonly, auto-derived */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Quarter No
						</label>
						<input
							type="text"
							value={formData.QTR_No || ""}
							readOnly
							disabled
							className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed outline-none"
							placeholder="Auto from Month/Year"
						/>
					</div>

					{/* QPR_QTR_No */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							QPR QTR No
						</label>
						<input
							type="text"
							value={formData.QPR_QTR_No || ""}
							onChange={(e) =>
								handleInputChange("QPR_QTR_No", e.target.value)
							}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
							placeholder="e.g. QPR-Q1-2026"
						/>
					</div>

					{/* District — dropdown */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							District <span className="text-red-500">*</span>
						</label>
						<select
							value={formData.District || ""}
							onChange={(e) =>
								handleInputChange("District", e.target.value)
							}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
							required
						>
							<option value="">Select District</option>
							{DISTRICT_OPTIONS.map((d) => (
								<option key={d} value={d}>
									{d}
								</option>
							))}
						</select>
					</div>

					{/* Total — readonly auto-sum */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Total
						</label>
						<input
							type="number"
							value={total}
							readOnly
							disabled
							className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-900 font-semibold cursor-not-allowed outline-none"
						/>
					</div>
				</div>
				</div>

				{/* Category Fields */}
				<div className="border-b border-gray-200 pb-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">
						Incident Categories
					</h2>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
						{NUMERIC_FIELDS.map((field) => (
							<div key={field}>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									{FIELD_LABELS[field]}
								</label>
								<input
									type="number"
									value={formData[field] ?? 0}
									onChange={(e) =>
										handleInputChange(field, e.target.value)
									}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
									min={0}
								/>
							</div>
						))}
					</div>
				</div>

				{/* Username */}
				<div>
					<h2 className="text-lg font-semibold text-gray-900 mb-4">
						Record Info
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Username
							</label>
							<input
								type="text"
								value={formData.username || userName}
								readOnly
								disabled
								className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed outline-none"
								placeholder="Username"
							/>
						</div>
					</div>
				</div>

				{/* Form Actions */}
				<div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
					<Link
						href="/dashboard/security-incidents-data"
						className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
					>
						Cancel
					</Link>
					<button
						type="submit"
						disabled={loading || !accessSecurityIncidentsData || accessLoading}
						title={!accessSecurityIncidentsData ? "You do not have permission to modify records" : undefined}
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
								{isEditMode ? "Update Record" : "Save Record"}
							</>
						)}
					</button>
				</div>
			</form>
		</div>
	);
}
