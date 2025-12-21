"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, FileText, Calendar, Folder } from "lucide-react";

type ReportData = {
	ReportID: number;
	ReportTitle: string;
	Description: string;
	FilePath: string;
	EventDate: string;
	MainCategory: string;
	SubCategory: string;
};

export default function ReportViewPage() {
	const searchParams = useSearchParams();
	const reportId = searchParams.get('id');

	const [report, setReport] = useState<ReportData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const getReportUrl = (filePath: string | null) => {
		if (!filePath) return '';
		
		// If already a full URL, return as is
		if (filePath.startsWith('https://') || filePath.startsWith('http://')) {
			return filePath;
		}
		
		// Extract filename from various path formats
		let fileName = filePath;
		
		// Remove ~/Uploads/Reports/ prefix if present
		if (filePath.startsWith('~/Uploads/Reports/')) {
			fileName = filePath.replace('~/Uploads/Reports/', '');
		} 
		// Remove Uploads/Reports/ prefix if present
		else if (filePath.startsWith('Uploads/Reports/')) {
			fileName = filePath.replace('Uploads/Reports/', '');
		}
		// Remove uploads/reports/ prefix if present (to avoid duplication)
		else if (filePath.startsWith('uploads/reports/')) {
			fileName = filePath.replace('uploads/reports/', '');
		}
		
		// Construct URL with uploads/reports/ prefix
		return `https://rif-ii.org/uploads/reports/${fileName}`;
	};

	useEffect(() => {
		const fetchReport = async () => {
			if (!reportId) {
				setError("Report ID is required");
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const response = await fetch(`/api/reports/${reportId}`);
				const data = await response.json();

				if (data.success && data.report) {
					setReport(data.report);
				} else {
					setError(data.message || "Report not found");
				}
			} catch (err) {
				setError("Error fetching report");
				console.error("Error fetching report:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchReport();
	}, [reportId]);

	const handleDownload = () => {
		if (!report) return;
		
		try {
			const fullUrl = getReportUrl(report.FilePath);
			
			// Create a temporary link element to trigger download
			const link = document.createElement('a');
			link.href = fullUrl;
			link.download = report.ReportTitle || 'report';
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

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading report...</span>
				</div>
			</div>
		);
	}

	if (error || !report) {
		return (
			<div className="space-y-6">
				<div className="flex items-center space-x-4">
					<Link
						href="/dashboard/reports"
						className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Reports
					</Link>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600">{error || "Report not found"}</p>
				</div>
			</div>
		);
	}

	const reportUrl = getReportUrl(report.FilePath);

	return (
		<div className="space-y-6">
			{/* Header with Back Button */}
			<div className="flex items-center justify-between">
				<Link
					href="/dashboard/reports"
					className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Reports
				</Link>
				<button
					onClick={handleDownload}
					className="inline-flex items-center px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors"
				>
					<Download className="h-4 w-4 mr-2" />
					Download
				</button>
			</div>

			{/* Report Information Card */}
			<div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
				<h1 className="text-2xl font-bold text-gray-900 mb-4">{report.ReportTitle}</h1>
				
				{/* Report Details */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
					{report.Description && (
						<div className="md:col-span-2">
							<p className="text-gray-600">{report.Description}</p>
						</div>
					)}
					
					{report.MainCategory && (
						<div className="flex items-center text-sm text-gray-600">
							<Folder className="h-4 w-4 mr-2" />
							<span className="font-medium">Main Category:</span>
							<span className="ml-2">{report.MainCategory}</span>
						</div>
					)}
					
					{report.SubCategory && (
						<div className="flex items-center text-sm text-gray-600">
							<Folder className="h-4 w-4 mr-2" />
							<span className="font-medium">Sub Category:</span>
							<span className="ml-2">{report.SubCategory}</span>
						</div>
					)}
					
					{report.EventDate && (
						<div className="flex items-center text-sm text-gray-600">
							<Calendar className="h-4 w-4 mr-2" />
							<span className="font-medium">Event Date:</span>
							<span className="ml-2">{formatDate(report.EventDate)}</span>
						</div>
					)}
				</div>
			</div>

			{/* PDF Viewer */}
			<div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
				<div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
					<h2 className="text-lg font-semibold text-gray-900">Report Preview</h2>
					<button
						onClick={handleDownload}
						className="inline-flex items-center px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
					>
						<Download className="h-4 w-4 mr-2" />
						Download
					</button>
				</div>
				
				<div className="w-full" style={{ height: 'calc(100vh - 300px)', minHeight: '600px' }}>
					{reportUrl ? (
						<iframe
							src={reportUrl}
							className="w-full h-full border-0"
							title={report.ReportTitle}
							style={{ minHeight: '600px' }}
						/>
					) : (
						<div className="flex items-center justify-center h-full min-h-[600px] bg-gray-50">
							<div className="text-center">
								<FileText className="h-24 w-24 text-gray-400 mx-auto mb-4" />
								<p className="text-gray-600">Unable to load report preview</p>
								<button
									onClick={handleDownload}
									className="mt-4 inline-flex items-center px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors"
								>
									<Download className="h-4 w-4 mr-2" />
									Download Report
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
