"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
	AlertCircle,
	AlertTriangle,
	ArrowLeft,
	Calendar,
	CheckCircle,
	ExternalLink,
	FileText,
	Loader2,
	MapPin,
	Shield,
	TrendingUp,
	User,
} from "lucide-react";
import Link from "next/link";
import { parseCategoryValues } from "@/lib/security-incidents";

type SecurityIncident = {
	id: number;
	incident_title: string;
	category: string;
	location_district: string;
	location_province: string;
	incident_date_from: string;
	incident_date_to?: string;
	incident_summary: string;
	operational_impact: string;
	recommended_actions: string;
	date_reported: string;
	reported_by: string;
	Comment?: string;
	ReferenceNumber?: string;
	incident_image_1?: string;
	incident_image_2?: string;
	incident_image_3?: string;
	incident_youtube_link?: string;
};

function ReadOnlyField({
	label,
	value,
	className = "",
}: {
	label: string;
	value?: string | null;
	className?: string;
}) {
	return (
		<div className={className}>
			<label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
			<div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 min-h-11">
				{value?.trim() ? value : "N/A"}
			</div>
		</div>
	);
}

export default function SecurityIncidentViewPage() {
	const searchParams = useSearchParams();
	const incidentId = searchParams.get("id");
	const refNumber = searchParams.get("ref");
	const [incident, setIncident] = useState<SecurityIncident | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (incidentId) {
			fetchIncidentById(incidentId);
			return;
		}

		if (refNumber) {
			fetchIncidentByReference(refNumber);
			return;
		}

		setError("Incident id or reference number is required");
		setLoading(false);
	}, [incidentId, refNumber]);

	const fetchIncidentById = async (id: string) => {
		try {
			setLoading(true);
			setError(null);

			const response = await fetch(`/api/security-updates?id=${encodeURIComponent(id)}`);
			const data = await response.json();

			if (data.success && data.incident) {
				setIncident(data.incident);
			} else {
				setError(data.message || "Security incident not found");
			}
		} catch (err) {
			console.error("Error fetching security incident:", err);
			setError("Error fetching security incident");
		} finally {
			setLoading(false);
		}
	};

	const fetchIncidentByReference = async (ref: string) => {
		try {
			setLoading(true);
			setError(null);

			const response = await fetch("/api/security-updates");
			const data = await response.json();

			if (data.success && data.incidents) {
				const foundIncident = data.incidents.find(
					(inc: SecurityIncident & { ["Reference #"]?: string }) =>
						inc.ReferenceNumber === ref || inc["Reference #"] === ref,
				);

				if (foundIncident) {
					setIncident({
						...foundIncident,
						ReferenceNumber: foundIncident.ReferenceNumber || foundIncident["Reference #"],
					});
				} else {
					setError("Security incident not found with the provided reference number");
				}
			} else {
				setError("Failed to fetch security incident");
			}
		} catch (err) {
			console.error("Error fetching security incident:", err);
			setError("Error fetching security incident");
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString?: string) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			});
		} catch {
			return dateString;
		}
	};

	const formatIncidentDateRange = (record: SecurityIncident) => {
		if (!record.incident_date_from && !record.incident_date_to) return "N/A";
		if (!record.incident_date_to || record.incident_date_to === record.incident_date_from) {
			return formatDate(record.incident_date_from);
		}
		return `${formatDate(record.incident_date_from)} to ${formatDate(record.incident_date_to)}`;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-[#0b4d2b]" />
				<span className="ml-3 text-gray-600">Loading security incident details...</span>
			</div>
		);
	}

	if (error || !incident) {
		return (
			<div className="space-y-6">
				<Link
					href="/dashboard/security-updates"
					className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-green-50 rounded-lg transition-colors"
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back
				</Link>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
					<p className="text-red-800">{error || "Security incident not found"}</p>
				</div>
			</div>
		);
	}

	const incidentImages = [
		incident.incident_image_1,
		incident.incident_image_2,
		incident.incident_image_3,
	].filter((image): image is string => Boolean(image?.trim()));

	return (
		<div className="space-y-6">
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
						<h1 className="text-2xl font-bold text-gray-900">View Security Incident</h1>
						<p className="text-gray-600 mt-1">Review security incident information in read-only mode</p>
					</div>
				</div>
			</div>

			<div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 space-y-6">
				<div className="border-b border-gray-200 pb-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
						<Shield className="h-5 w-5 mr-2 text-[#0b4d2b]" />
						Basic Information
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<ReadOnlyField
							label="Incident Title"
							value={incident.incident_title}
							className="md:col-span-2"
						/>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
							<div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 min-h-11">
								<div className="flex flex-wrap gap-2">
									{parseCategoryValues(incident.category).length > 0 ? (
										parseCategoryValues(incident.category).map((category) => (
											<span
												key={category}
												className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
											>
												{category}
											</span>
										))
									) : (
										<span className="text-gray-500">N/A</span>
									)}
								</div>
							</div>
						</div>
						<ReadOnlyField label="Incident Date From" value={formatDate(incident.incident_date_from)} />
						<ReadOnlyField label="Incident Date To" value={formatDate(incident.incident_date_to)} />
						<ReadOnlyField label="Location Province" value={incident.location_province} />
						<ReadOnlyField label="Location District" value={incident.location_district} />
					</div>
				</div>

				<div className="border-b border-gray-200 pb-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">Incident Details</h2>
					<div className="space-y-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
								<AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
								Incident Summary
							</label>
							<div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 min-h-32 whitespace-pre-wrap">
								{incident.incident_summary?.trim() || "N/A"}
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
								<TrendingUp className="h-4 w-4 mr-2 text-orange-600" />
								Operational Impact
							</label>
							<div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 min-h-32 whitespace-pre-wrap">
								{incident.operational_impact?.trim() || "N/A"}
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
								<CheckCircle className="h-4 w-4 mr-2 text-green-600" />
								Recommended Actions
							</label>
							<div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 min-h-32 whitespace-pre-wrap">
								{incident.recommended_actions?.trim() || "N/A"}
							</div>
						</div>
					</div>
				</div>

				<div className="border-b border-gray-200 pb-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">Media / Attachments</h2>
					{incidentImages.length > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							{incidentImages.map((imageUrl, idx) => (
								<div key={`${imageUrl}-${idx}`}>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Image {idx + 1}
									</label>
									<a href={imageUrl} target="_blank" rel="noopener noreferrer" className="block group">
										<img
											src={imageUrl}
											alt={`Incident image ${idx + 1}`}
											className="w-full h-40 object-cover rounded-lg border border-gray-200 group-hover:shadow-md transition-shadow"
										/>
									</a>
								</div>
							))}
						</div>
					) : (
						<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-500">
							No incident images available
						</div>
					)}

					<div className="mt-6">
						<label className="block text-sm font-medium text-gray-700 mb-2">YouTube Link</label>
						<div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">
							{incident.incident_youtube_link?.trim() ? incident.incident_youtube_link : "N/A"}
						</div>
						{incident.incident_youtube_link?.trim() && /^https?:\/\//.test(incident.incident_youtube_link.trim()) && (
							<a
								href={incident.incident_youtube_link}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center mt-2 text-sm text-blue-600 hover:underline"
							>
								Open YouTube Link
								<ExternalLink className="h-3.5 w-3.5 ml-1.5" />
							</a>
						)}
					</div>
				</div>

				<div>
					<h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<ReadOnlyField label="Reference #" value={incident.ReferenceNumber} />
						<ReadOnlyField label="Reported By" value={incident.reported_by} />
						<ReadOnlyField label="Incident Date Range" value={formatIncidentDateRange(incident)} />
						<ReadOnlyField label="Date Reported" value={formatDate(incident.date_reported)} />
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
								<FileText className="h-4 w-4 mr-2 text-[#0b4d2b]" />
								Comment
							</label>
							<div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 min-h-24 whitespace-pre-wrap">
								{incident.Comment?.trim() || "N/A"}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

