"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Shield, Calendar, User, MapPin, AlertTriangle, FileText, CheckCircle, TrendingUp, AlertCircle as AlertCircleIcon } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

type SecurityIncident = {
	id: number;
	incident_title: string;
	category: string;
	location_district: string;
	location_province: string;
	incident_date: string;
	incident_summary: string;
	operational_impact: string;
	recommended_actions: string;
	date_reported: string;
	reported_by: string;
	Comment?: string;
	ReferenceNumber?: string;
};

export default function SecurityIncidentViewPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const refNumber = searchParams.get('ref');
	const [incident, setIncident] = useState<SecurityIncident | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (refNumber) {
			fetchIncidentByReference(refNumber);
		} else {
			setError("Reference number is required");
			setLoading(false);
		}
	}, [refNumber]);

	const fetchIncidentByReference = async (ref: string) => {
		try {
			setLoading(true);
			const response = await fetch('/api/security-updates');
			const data = await response.json();

			if (data.success && data.incidents) {
				const foundIncident = data.incidents.find((inc: any) => 
					(inc.ReferenceNumber === ref || inc['Reference #'] === ref)
				);

				if (foundIncident) {
					setIncident({
						...foundIncident,
						ReferenceNumber: foundIncident.ReferenceNumber || foundIncident['Reference #']
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

	const formatDate = (dateString: string) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		} catch {
			return dateString;
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto mb-4"></div>
					<p className="text-gray-600">Loading security incident details...</p>
				</div>
			</div>
		);
	}

	if (error || !incident) {
		return (
			<div className="space-y-6">
				<Link
					href="/dashboard"
					className="inline-flex items-center text-gray-600 hover:text-gray-900"
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Dashboard
				</Link>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
					<p className="text-red-800">{error || "Security incident not found"}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<Link
					href="/dashboard"
					className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-green-50 rounded-lg transition-colors"
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Dashboard
				</Link>
			</div>

			{/* Incident Details Card */}
			<div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
				{/* Header Section */}
				<div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
					<div className="flex items-center space-x-3 mb-4">
						<div className="p-2 bg-white/20 rounded-lg">
							<Shield className="h-6 w-6 text-white" />
						</div>
						<div>
							<h1 className="text-2xl font-bold text-white">{incident.incident_title}</h1>
							{incident.ReferenceNumber && (
								<p className="text-red-100 mt-1">Reference #: {incident.ReferenceNumber}</p>
							)}
						</div>
					</div>
				</div>

				{/* Content Section */}
				<div className="p-6 space-y-6">
					{/* Basic Information */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="flex items-center space-x-3">
							<Calendar className="h-5 w-5 text-gray-400" />
							<div>
								<p className="text-sm text-gray-500">Incident Date</p>
								<p className="font-medium text-gray-900">{formatDate(incident.incident_date)}</p>
							</div>
						</div>
						<div className="flex items-center space-x-3">
							<FileText className="h-5 w-5 text-gray-400" />
							<div>
								<p className="text-sm text-gray-500">Category</p>
								<p className="font-medium text-gray-900">{incident.category}</p>
							</div>
						</div>
						<div className="flex items-center space-x-3">
							<MapPin className="h-5 w-5 text-gray-400" />
							<div>
								<p className="text-sm text-gray-500">Location</p>
								<p className="font-medium text-gray-900">
									{incident.location_district}, {incident.location_province}
								</p>
							</div>
						</div>
						<div className="flex items-center space-x-3">
							<User className="h-5 w-5 text-gray-400" />
							<div>
								<p className="text-sm text-gray-500">Reported By</p>
								<p className="font-medium text-gray-900">{incident.reported_by || 'N/A'}</p>
							</div>
						</div>
						<div className="flex items-center space-x-3">
							<Calendar className="h-5 w-5 text-gray-400" />
							<div>
								<p className="text-sm text-gray-500">Date Reported</p>
								<p className="font-medium text-gray-900">{formatDate(incident.date_reported)}</p>
							</div>
						</div>
					</div>

					{/* Incident Summary */}
					<div className="border-t border-gray-200 pt-6">
						<h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
							<AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
							Incident Summary
						</h2>
						<p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{incident.incident_summary}</p>
					</div>

					{/* Operational Impact */}
					<div className="border-t border-gray-200 pt-6">
						<h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
							<TrendingUp className="h-5 w-5 mr-2 text-orange-600" />
							Operational Impact
						</h2>
						<p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{incident.operational_impact}</p>
					</div>

					{/* Recommended Actions */}
					<div className="border-t border-gray-200 pt-6">
						<h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
							<CheckCircle className="h-5 w-5 mr-2 text-green-600" />
							Recommended Actions
						</h2>
						<p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{incident.recommended_actions}</p>
					</div>

					{/* Comment */}
					{incident.Comment && (
						<div className="border-t border-gray-200 pt-6">
							<h2 className="text-lg font-semibold text-gray-900 mb-3">Additional Comments</h2>
							<p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{incident.Comment}</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

