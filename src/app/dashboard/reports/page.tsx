"use client";

import { useEffect, useState } from "react";
import { FileText, Download, Calendar, Folder, Search, RotateCcw, Filter, Upload, RefreshCw, Edit, Trash2, Eye, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useAccess } from "@/hooks/useAccess";
import { useAuth } from "@/hooks/useAuth";
import { getUserIdFromCookie } from "@/lib/client-auth";

type ReportData = {
	ReportID: number;
	ReportTitle: string;
	Description: string;
	FilePath: string;
	EventDate: string;
	MainCategory: string;
	SubCategory: string;
};

export default function ReportsPage() {
	// Get actual user ID from cookie
	const { user, getUserId } = useAuth();
	const userId = user?.id || user?.username || getUserId() || null;
	
	const { canUpload, accessEdit, accessDelete, loading: accessLoading } = useAccess(userId);
	
	const [reports, setReports] = useState<ReportData[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedMainCategory, setSelectedMainCategory] = useState("");
	const [selectedSubCategory, setSelectedSubCategory] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [mainCategories, setMainCategories] = useState<string[]>([]);
	const [subCategories, setSubCategories] = useState<string[]>([]);
	const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; report: ReportData | null }>({ show: false, report: null });
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		fetchReports();
	}, []);

	const fetchReports = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (selectedMainCategory) params.append('mainCategory', selectedMainCategory);
			if (selectedSubCategory) params.append('subCategory', selectedSubCategory);
			if (searchTerm) params.append('search', searchTerm);

			const response = await fetch(`/api/reports?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setReports(data.reports || []);
				
				// Extract unique categories for filters
				const uniqueMainCategories = [...new Set(data.reports.map((report: ReportData) => report.MainCategory).filter(Boolean))] as string[];
				const uniqueSubCategories = [...new Set(data.reports.map((report: ReportData) => report.SubCategory).filter(Boolean))] as string[];
				
				setMainCategories(uniqueMainCategories);
				setSubCategories(uniqueSubCategories);
			} else {
				setError(data.message || "Failed to fetch reports");
				setSuccess(null);
			}
		} catch (err) {
			setError("Error fetching reports");
			setSuccess(null);
			console.error("Error fetching reports:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!deleteConfirm.report || !deleteConfirm.report.ReportID) return;

		const reportId = deleteConfirm.report.ReportID;

		try {
			setDeleting(true);
			const response = await fetch(`/api/reports/${reportId}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			const data = await response.json();

			if (data.success) {
				setDeleteConfirm({ show: false, report: null });
				setSuccess('Report deleted successfully');
				setError(null);
				// Remove the deleted item from the list
				setReports(prev => prev.filter(report => report.ReportID !== reportId));
				// Auto-hide success message after 3 seconds
				setTimeout(() => {
					setSuccess(null);
				}, 3000);
			} else {
				setError(data.message || "Failed to delete report");
				setSuccess(null);
				setDeleteConfirm({ show: false, report: null });
			}
		} catch (err) {
			console.error("Error deleting report:", err);
			setError("Error deleting report");
			setSuccess(null);
			setDeleteConfirm({ show: false, report: null });
		} finally {
			setDeleting(false);
		}
	};

	const handleSearch = () => {
		fetchReports();
	};

	const handleReset = () => {
		setSearchTerm("");
		setSelectedMainCategory("");
		setSelectedSubCategory("");
		fetchReports();
	};

	const getFileUrl = (filePath: string) => {
		if (!filePath) return '';
		
		// If already a full URL, return as-is
		if (filePath.startsWith('https://') || filePath.startsWith('http://')) {
			return filePath;
		}
		
		// Normalize path
		let normalizedPath = filePath.replace(/\\/g, '/');
		
		// Handle ~/ prefix
		if (normalizedPath.startsWith('~/')) {
			normalizedPath = normalizedPath.replace('~/', '');
		}
		
		// Handle legacy formats
		if (normalizedPath.startsWith('Uploads/Reports/')) {
			normalizedPath = normalizedPath.replace('Uploads/Reports/', 'uploads/reports/');
		}
		
		// Ensure path starts with uploads/reports/
		if (!normalizedPath.startsWith('uploads/reports/') && !normalizedPath.startsWith('/uploads/reports/')) {
			normalizedPath = `uploads/reports/${normalizedPath}`;
		}
		
		// Remove leading slash if present
		if (normalizedPath.startsWith('/')) {
			normalizedPath = normalizedPath.substring(1);
		}
		
		// For client-side, use current origin
		if (typeof window !== 'undefined') {
			const origin = window.location.origin;
			return `${origin}/${normalizedPath}`;
		}
		
		// For server-side, use relative path
		return `/${normalizedPath}`;
	};

	const handleDownload = (filePath: string, reportTitle: string) => {
		try {
			const fileUrl = getFileUrl(filePath);
			
			// Create a temporary link element to trigger download
			const link = document.createElement('a');
			link.href = fileUrl;
			link.download = reportTitle || 'report';
			link.target = '_blank';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (error) {
			console.error('Download failed:', error);
			alert('Download failed. Please try again.');
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

	const getFileExtension = (filePath: string) => {
		return filePath.split('.').pop()?.toUpperCase() || 'FILE';
	};

	const getFileIcon = (filePath: string) => {
		const extension = getFileExtension(filePath).toLowerCase();
		if (['pdf'].includes(extension)) return '📄';
		if (['doc', 'docx'].includes(extension)) return '📝';
		if (['xls', 'xlsx'].includes(extension)) return '📊';
		if (['ppt', 'pptx'].includes(extension)) return '📋';
		return '📄';
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Reports</h1>
					<p className="text-gray-600 mt-2">Browse and download available reports</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading reports...</span>
				</div>
			</div>
		);
	}

	if (error && !reports.length) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Reports</h1>
					<p className="text-gray-600 mt-2">Browse and download available reports</p>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600">{error}</p>
					<button
						onClick={fetchReports}
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
				<h1 className="text-2xl font-bold text-gray-900">Reports</h1>
				<p className="text-gray-600 mt-2">Browse and download available reports</p>
			</div>
			<div className="flex items-center space-x-3">
				<Link
					href="/dashboard/reports/upload"
					className="inline-flex items-center px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors"
				>
					<Upload className="h-4 w-4 mr-2" />
					Upload report
				</Link>
				<button
					onClick={fetchReports}
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
						<h3 className="text-lg font-semibold text-gray-900">Search & Filter Reports</h3>
						<p className="text-sm text-gray-600">Find specific reports by title, description, or category</p>
					</div>
					<div className="flex items-center space-x-4">
						<div className="flex items-center space-x-2">
							<div className="h-2 w-2 bg-green-500 rounded-full"></div>
							<span className="text-xs text-gray-500 font-medium">Live Search</span>
						</div>
						<button
							onClick={handleReset}
							className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200"
						>
							<RotateCcw className="h-3 w-3 mr-1" />
							Reset
						</button>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
					{/* Search Input */}
					<div className="md:col-span-2">
						<label className="block text-sm font-medium text-gray-700 mb-2">Search Reports</label>
						<div className="relative">
							<input
								type="text"
								placeholder="Search by title or description..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full px-4 py-3 text-gray-900 placeholder-gray-500 bg-white border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-[#0b4d2b]/20 focus:border-[#0b4d2b] focus:outline-none transition-all duration-200 shadow-sm hover:shadow-md"
								onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
							/>
						</div>
					</div>

					{/* Main Category Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Main Category</label>
						<select
							value={selectedMainCategory}
							onChange={(e) => setSelectedMainCategory(e.target.value)}
							className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						>
							<option value="">All Categories</option>
							{mainCategories.map((category) => (
								<option key={category} value={category}>
									{category}
								</option>
							))}
						</select>
					</div>

					{/* Sub Category Filter */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">Sub Category</label>
						<select
							value={selectedSubCategory}
							onChange={(e) => setSelectedSubCategory(e.target.value)}
							className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						>
							<option value="">All Sub Categories</option>
							{subCategories.map((category) => (
								<option key={category} value={category}>
									{category}
								</option>
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

			{/* Reports Grid - Horizontal View */}
			{reports.length === 0 ? (
				<div className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center">
					<FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
					<h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
					<p className="text-gray-600">
						{searchTerm || selectedMainCategory || selectedSubCategory 
							? "Try adjusting your search criteria" 
							: "Reports will appear here once they are uploaded"
						}
					</p>
				</div>
			) : (
				<div className="space-y-4">
					{reports.map((report, index) => (
						<div
							key={index}
							className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
						>
							<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-6 gap-4">
								{/* Left Section: File Icon, Type, and Report Name */}
								<div className="flex items-center space-x-4 flex-1 min-w-0">
									<div className="flex items-center space-x-3 flex-shrink-0">
										<div className="text-3xl">
											{getFileIcon(report.FilePath)}
										</div>
										<div>
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
												{getFileExtension(report.FilePath)}
											</span>
										</div>
									</div>
									<div className="flex-1 min-w-0">
										<h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
											{report.ReportTitle}
										</h3>
										{report.Description && (
											<p className="text-sm text-gray-600 truncate">
												{report.Description}
											</p>
										)}
									</div>
								</div>

								{/* Middle Section: Category Information */}
								<div className="flex items-center space-x-4 lg:space-x-6 px-0 lg:px-6 flex-shrink-0 border-t lg:border-t-0 lg:border-l lg:border-r border-gray-200 pt-4 lg:pt-0">
									{report.MainCategory && (
										<div className="flex flex-col">
											<span className="text-xs font-medium text-gray-500 mb-1">Category</span>
											<span className="text-sm font-semibold text-gray-900">{report.MainCategory}</span>
										</div>
									)}
									{report.SubCategory && (
										<div className="flex flex-col">
											<span className="text-xs font-medium text-gray-500 mb-1">Sub Category</span>
											<span className="text-sm font-semibold text-gray-900">{report.SubCategory}</span>
										</div>
									)}
									{report.EventDate && (
										<div className="flex flex-col">
											<span className="text-xs font-medium text-gray-500 mb-1">Date</span>
											<span className="text-sm font-semibold text-gray-900">{formatDate(report.EventDate)}</span>
										</div>
									)}
								</div>

								{/* Right Section: Action Buttons */}
								<div className="flex items-center space-x-2 flex-shrink-0 pl-0 lg:pl-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-200">
									{/* View Button */}
									<Link
										href={`/dashboard/reports/view?id=${report.ReportID}`}
										className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
										title="View Report"
									>
										<Eye className="h-4 w-4 mr-1.5" />
										View
									</Link>

									{/* Edit/Update Button */}
									{accessEdit && (
										<Link
											href={`/dashboard/reports/upload?id=${report.ReportID}`}
											className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
											title="Edit/Update Report"
										>
											<Edit className="h-4 w-4 mr-1.5" />
											Edit
										</Link>
									)}

									{/* Delete Button */}
									{accessDelete && (
										<button
											onClick={() => setDeleteConfirm({ show: true, report: report })}
											className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
											title="Delete Report"
										>
											<Trash2 className="h-4 w-4 mr-1.5" />
											Delete
										</button>
									)}
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Results Count */}
			{reports.length > 0 && (
				<div className="text-center text-sm text-gray-500">
					Showing {reports.length} report{reports.length !== 1 ? 's' : ''}
					{(searchTerm || selectedMainCategory || selectedSubCategory) && ' matching your criteria'}
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{deleteConfirm.show && deleteConfirm.report && (
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
									Are you sure you want to delete this report?
								</p>
								<div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
									{deleteConfirm.report.ReportTitle && (
										<>
											<p className="text-sm font-medium text-gray-500 mb-1">Report Title:</p>
											<p className="text-base font-semibold text-gray-900">
												{deleteConfirm.report.ReportTitle}
											</p>
										</>
									)}
									{deleteConfirm.report.MainCategory && (
										<>
											<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Main Category:</p>
											<p className="text-base text-gray-700">{deleteConfirm.report.MainCategory}</p>
										</>
									)}
									{deleteConfirm.report.SubCategory && (
										<>
											<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Sub Category:</p>
											<p className="text-base text-gray-700">{deleteConfirm.report.SubCategory}</p>
										</>
									)}
									{deleteConfirm.report.EventDate && (
										<>
											<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Event Date:</p>
											<p className="text-base text-gray-700">{formatDate(deleteConfirm.report.EventDate)}</p>
										</>
									)}
								</div>
							</div>
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start">
								<AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
								<p className="text-sm text-yellow-800">
									<strong>Warning:</strong> This will permanently delete this report from the database. This action cannot be undone.
								</p>
							</div>
						</div>

						{/* Modal Footer */}
						<div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end space-x-3 border-t border-gray-200">
							<button
								onClick={() => setDeleteConfirm({ show: false, report: null })}
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