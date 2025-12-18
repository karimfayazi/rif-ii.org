"use client";

import { useEffect, useState } from "react";
import { Shield, AlertTriangle, Search, Filter, RefreshCw, Calendar, User, Download, Plus, Edit, Trash2, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function SecurityUpdatesPage() {
	const router = useRouter();
	const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("");
	const [selectedDistrict, setSelectedDistrict] = useState("");
	const [selectedProvince, setSelectedProvince] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; incident: SecurityIncident | null }>({ show: false, incident: null });
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		fetchSecurityIncidents();
	}, []);

	const fetchSecurityIncidents = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (selectedCategory) params.append('category', selectedCategory);
			if (selectedDistrict) params.append('locationDistrict', selectedDistrict);
			if (selectedProvince) params.append('locationProvince', selectedProvince);
			if (searchTerm) params.append('search', searchTerm);

			const response = await fetch(`/api/security-updates?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setIncidents(data.incidents || []);
			} else {
				setError(data.message || "Failed to fetch security incidents");
			}
		} catch (err) {
			setError("Error fetching security incidents");
			console.error("Error fetching security incidents:", err);
			setIncidents([]);
		} finally {
			setLoading(false);
		}
	};

	const handleSearch = () => {
		fetchSecurityIncidents();
	};

	const handleReset = () => {
		setSearchTerm("");
		setSelectedCategory("");
		setSelectedDistrict("");
		setSelectedProvince("");
		fetchSecurityIncidents();
	};

	const handleDelete = async () => {
		if (!deleteConfirm.incident || !deleteConfirm.incident.id) return;

		try {
			setDeleting(true);
			const response = await fetch(`/api/security-updates/delete?id=${deleteConfirm.incident.id}`, {
				method: 'DELETE'
			});

			const data = await response.json();

			if (data.success) {
				setDeleteConfirm({ show: false, incident: null });
				setSuccess('Security incident deleted successfully');
				setError(null);
				// Remove the deleted item from the list
				setIncidents(prev => prev.filter(incident => incident.id !== deleteConfirm.incident!.id));
				// Auto-hide success message after 3 seconds
				setTimeout(() => {
					setSuccess(null);
				}, 3000);
			} else {
				setError(data.message || "Failed to delete security incident");
				setSuccess(null);
				setDeleteConfirm({ show: false, incident: null });
			}
		} catch (err) {
			console.error("Error deleting security incident:", err);
			setError("Error deleting security incident");
			setSuccess(null);
			setDeleteConfirm({ show: false, incident: null });
		} finally {
			setDeleting(false);
		}
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return dateString;
		}
	};

	// Get unique values for filters
	const categories = [...new Set(incidents.map(i => i.category).filter(Boolean))];
	const districts = [...new Set(incidents.map(i => i.location_district).filter(Boolean))];
	const provinces = [...new Set(incidents.map(i => i.location_province).filter(Boolean))];

	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Security Updates</h1>
					<p className="text-gray-600 mt-2">Stay informed about the latest security updates and patches</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading security updates...</span>
				</div>
			</div>
		);
	}

	if (error && incidents.length === 0) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Security Updates</h1>
					<p className="text-gray-600 mt-2">Stay informed about the latest security updates and patches</p>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600">{error}</p>
					<button
						onClick={fetchSecurityIncidents}
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
					<h1 className="text-2xl font-bold text-gray-900">Security Incidents</h1>
					<p className="text-gray-600 mt-2">View and manage security incident records</p>
				</div>
				<div className="flex items-center space-x-3">
					<Link
						href="/dashboard/security-updates/add"
						className="inline-flex items-center px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors"
					>
						<Plus className="h-4 w-4 mr-2" />
						Add Record
					</Link>
					<button
						onClick={fetchSecurityIncidents}
						className="inline-flex items-center px-4 py-2 text-[#0b4d2b] bg-[#0b4d2b]/10 rounded-lg hover:bg-[#0b4d2b]/20 transition-colors"
					>
						<RefreshCw className="h-4 w-4 mr-2" />
						Refresh
					</button>
					<button className="inline-flex items-center px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors">
						<Download className="h-4 w-4 mr-2" />
						Export
					</button>
				</div>
			</div>

			{/* Search and Filters */}
			<div className="bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 shadow-lg p-6">
				<div className="flex items-center justify-between mb-4">
					<div>
						<h3 className="text-lg font-semibold text-gray-900">Search & Filter Incidents</h3>
						<p className="text-sm text-gray-600">Find specific security incidents by title, category, or location</p>
					</div>
					<button
						onClick={handleReset}
						className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200"
					>
						<RefreshCw className="h-3 w-3 mr-1" />
						Reset
					</button>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
					{/* Search Input */}
					<div className="md:col-span-2">
						<label className="block text-sm font-medium text-gray-700 mb-2">Search Incidents</label>
						<div className="relative">
							<input
								type="text"
								placeholder="Search by title or summary..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full px-4 py-3 text-gray-900 placeholder-gray-500 bg-white border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-[#0b4d2b]/20 focus:border-[#0b4d2b] focus:outline-none transition-all duration-200 shadow-sm hover:shadow-md"
								onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
							/>
						</div>
					</div>

					{/* Category Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
						<select
							value={selectedCategory}
							onChange={(e) => setSelectedCategory(e.target.value)}
							className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						>
							<option value="">All Categories</option>
							{categories.map((cat) => (
								<option key={cat} value={cat}>{cat}</option>
							))}
						</select>
					</div>

					{/* District Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">District</label>
						<select
							value={selectedDistrict}
							onChange={(e) => setSelectedDistrict(e.target.value)}
							className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						>
							<option value="">All Districts</option>
							{districts.map((dist) => (
								<option key={dist} value={dist}>{dist}</option>
							))}
						</select>
					</div>
				</div>

				{/* Search Button */}
				<div className="flex justify-end">
					<button
						onClick={handleSearch}
						className="inline-flex items-center px-6 py-3 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors shadow-sm"
					>
						<Filter className="h-4 w-4 mr-2" />
						Apply Filters
					</button>
				</div>
			</div>

			{/* Gridview Table */}
			{incidents.length === 0 ? (
				<div className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center">
					<Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
					<h3 className="text-lg font-medium text-gray-900 mb-2">No security incidents found</h3>
					<p className="text-gray-600 mb-4">
						{searchTerm || selectedCategory || selectedDistrict || selectedProvince
							? "Try adjusting your search criteria"
							: "Security incidents will appear here once they are added"
						}
					</p>
					<Link
						href="/dashboard/security-updates/add"
						className="inline-flex items-center px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors"
					>
						<Plus className="h-4 w-4 mr-2" />
						Add First Record
					</Link>
				</div>
			) : (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-gray-50 border-b border-gray-200">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ID</th>
									<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Incident Title</th>
									<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
									<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Location</th>
									<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Reference #</th>
									<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Incident Date</th>
									<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Reported By</th>
									<th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date Reported</th>
									<th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{incidents.map((incident) => (
									<tr key={incident.id} className="hover:bg-gray-50 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
											{incident.id}
										</td>
										<td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
											<div className="font-medium">{incident.incident_title}</div>
											<div className="text-xs text-gray-500 mt-1 line-clamp-2">{incident.incident_summary}</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
												{incident.category}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
											<div>{incident.location_district}</div>
											<div className="text-xs text-gray-500">{incident.location_province}</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
											{incident.ReferenceNumber || 'N/A'}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
											{formatDate(incident.incident_date)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
											{incident.reported_by || 'N/A'}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
											{formatDate(incident.date_reported)}
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
											<div className="flex items-center justify-center gap-2">
												<Link
													href={`/dashboard/security-updates/add?id=${incident.id}`}
													className="inline-flex items-center px-3 py-1.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
													title="Edit"
												>
													<Edit className="h-4 w-4" />
												</Link>
												<button
													onClick={() => setDeleteConfirm({ show: true, incident: incident })}
													className="inline-flex items-center px-3 py-1.5 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
													title="Delete"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Results Count */}
			{incidents.length > 0 && (
				<div className="text-center text-sm text-gray-500">
					Showing {incidents.length} incident{incidents.length !== 1 ? 's' : ''}
					{(searchTerm || selectedCategory || selectedDistrict || selectedProvince) && ' matching your criteria'}
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{deleteConfirm.show && deleteConfirm.incident && (
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
									Are you sure you want to delete this security incident?
								</p>
								<div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
									{deleteConfirm.incident.incident_title && (
										<>
											<p className="text-sm font-medium text-gray-500 mb-1">Incident Title:</p>
											<p className="text-base font-semibold text-gray-900">
												{deleteConfirm.incident.incident_title}
											</p>
										</>
									)}
									{deleteConfirm.incident.category && (
										<>
											<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Category:</p>
											<p className="text-base text-gray-700">{deleteConfirm.incident.category}</p>
										</>
									)}
									{deleteConfirm.incident.location_district && (
										<>
											<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Location:</p>
											<p className="text-base text-gray-700">
												{deleteConfirm.incident.location_district}
												{deleteConfirm.incident.location_province && `, ${deleteConfirm.incident.location_province}`}
											</p>
										</>
									)}
									{deleteConfirm.incident.incident_date && (
										<>
											<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Incident Date:</p>
											<p className="text-base text-gray-700">{formatDate(deleteConfirm.incident.incident_date)}</p>
										</>
									)}
								</div>
							</div>
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start">
								<AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
								<p className="text-sm text-yellow-800">
									<strong>Warning:</strong> This will permanently delete this security incident from the database. This action cannot be undone.
								</p>
							</div>
						</div>

						{/* Modal Footer */}
						<div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end space-x-3 border-t border-gray-200">
							<button
								onClick={() => setDeleteConfirm({ show: false, incident: null })}
								disabled={deleting}
								className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								onClick={handleDelete}
								disabled={deleting}
								className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
							>
								{deleting ? (
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

