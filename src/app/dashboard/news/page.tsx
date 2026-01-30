"use client";

import { useEffect, useState } from "react";
import { Newspaper, Download, Calendar, Search, RotateCcw, Filter, Upload, RefreshCw, Eye, AlertCircle, Loader2, CheckCircle, X } from "lucide-react";
import Link from "next/link";

type NewsData = {
	newsId: number;
	title: string;
	newsDate: string;
	bodyText?: string | null;
	imageUrl?: string | null;
	imageCaption?: string | null;
};

export default function NewsPage() {
	const [news, setNews] = useState<NewsData[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [viewModal, setViewModal] = useState<{ show: boolean; news: NewsData | null }>({ show: false, news: null });

	useEffect(() => {
		fetchNews();
	}, []);

	const fetchNews = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (searchTerm) params.append('search', searchTerm);
			if (dateFrom) params.append('dateFrom', dateFrom);
			if (dateTo) params.append('dateTo', dateTo);
			params.append('sort', sortOrder);

			const response = await fetch(`/api/news?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setNews(data.data || []);
				setError(null);
			} else {
				setError(data.message || "Failed to fetch news");
				setSuccess(null);
			}
		} catch (err) {
			setError("Error fetching news");
			setSuccess(null);
			console.error("Error fetching news:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleSearch = () => {
		fetchNews();
	};

	const handleReset = () => {
		setSearchTerm("");
		setDateFrom("");
		setDateTo("");
		setSortOrder("newest");
		setTimeout(() => {
			fetchNews();
		}, 0);
	};

	const handleExport = () => {
		if (news.length === 0) {
			alert("No news to export");
			return;
		}

		// Create CSV content
		const headers = ["NewsID", "Title", "NewsDate"];
		const csvRows = [headers.join(",")];

		news.forEach(item => {
			const row = [
				item.newsId,
				`"${item.title.replace(/"/g, '""')}"`, // Escape quotes
				formatDate(item.newsDate)
			];
			csvRows.push(row.join(","));
		});

		const csvContent = csvRows.join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		
		const today = new Date().toISOString().split('T')[0];
		link.setAttribute("href", url);
		link.setAttribute("download", `news_export_${today}.csv`);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
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

	const formatBodyText = (text: string | null | undefined) => {
		if (!text) return null;
		
		// Split by double newlines for paragraphs, or single newlines
		const paragraphs = text.split(/\n\n+/);
		
		return paragraphs.map((para, idx) => {
			// Replace single newlines with <br/>
			const lines = para.split('\n').filter(line => line.trim());
			return (
				<p key={idx} className="mb-3 text-gray-700 leading-relaxed">
					{lines.map((line, lineIdx) => (
						<span key={lineIdx}>
							{line}
							{lineIdx < lines.length - 1 && <br />}
						</span>
					))}
				</p>
			);
		});
	};

	if (loading && news.length === 0) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Latest News & Updates</h1>
					<p className="text-gray-600 mt-2">Stay informed about the latest developments</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading news...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-3">
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
					<h1 className="text-2xl font-bold text-gray-900">Latest News & Updates</h1>
					<p className="text-sm text-gray-600 mt-1">Stay informed about the latest developments</p>
				</div>
				<div className="flex items-center gap-3">
					<Link
						href="/dashboard/news/upload"
						className="inline-flex items-center justify-center px-4 py-2 h-10 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
					>
						<Upload className="h-4 w-4 mr-2 flex-shrink-0" />
						Upload News
					</Link>
					<button
						onClick={fetchNews}
						className="inline-flex items-center justify-center px-4 py-2 h-10 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
					>
						<RefreshCw className="h-4 w-4 mr-2 flex-shrink-0" />
						Refresh
					</button>
					<button 
						onClick={handleExport}
						className="inline-flex items-center justify-center px-4 py-2 h-10 text-sm font-medium bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors whitespace-nowrap"
					>
						<Download className="h-4 w-4 mr-2 flex-shrink-0" />
						Export
					</button>
				</div>
			</div>

			{/* Search and Filters */}
			<div className="bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 shadow-lg p-3">
				<div className="flex items-center justify-between mb-2">
					<div>
						<h3 className="text-lg font-semibold text-gray-900">Search & Filter News</h3>
						<p className="text-xs text-gray-600">Find specific news by title or date range</p>
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

				{/* All Filters in One Row */}
				<div className="flex flex-wrap items-end gap-2">
					{/* Search Input */}
					<div className="flex-1 min-w-[250px]">
						<label className="block text-xs font-medium text-gray-700 mb-1">Search News</label>
						<div className="relative">
							<input
								type="text"
								placeholder="Search by title..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full h-9 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-500 bg-white border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-[#0b4d2b]/20 focus:border-[#0b4d2b] focus:outline-none transition-all duration-200 shadow-sm hover:shadow-md"
								onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
							/>
						</div>
					</div>

					{/* Date From Filter */}
					<div className="min-w-[180px]">
						<label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
						<input
							type="date"
							value={dateFrom}
							onChange={(e) => setDateFrom(e.target.value)}
							className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						/>
					</div>

					{/* Date To Filter */}
					<div className="min-w-[180px]">
						<label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
						<input
							type="date"
							value={dateTo}
							onChange={(e) => setDateTo(e.target.value)}
							className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						/>
					</div>

					{/* Sort Filter */}
					<div className="min-w-[150px]">
						<label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
						<select
							value={sortOrder}
							onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
							className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						>
							<option value="newest">Newest First</option>
							<option value="oldest">Oldest First</option>
						</select>
					</div>

					{/* Search Button */}
					<div className="min-w-[140px]">
						<button
							onClick={handleSearch}
							className="w-full h-9 inline-flex items-center justify-center px-4 py-1.5 text-sm bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors shadow-sm"
						>
							<Filter className="h-4 w-4 mr-2" />
							Apply
						</button>
					</div>
				</div>
			</div>

			{/* News Grid */}
			{news.length === 0 ? (
				<div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
					<Newspaper className="mx-auto h-10 w-10 text-gray-400 mb-3" />
					<h3 className="text-base font-medium text-gray-900 mb-1">No news found</h3>
					<p className="text-sm text-gray-600">
						{searchTerm || dateFrom || dateTo
							? "Try adjusting your search criteria" 
							: "News articles will appear here once they are published"
						}
					</p>
				</div>
			) : (
				<div className="space-y-2">
					{news.map((item, index) => (
						<div
							key={index}
							className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
						>
							<div className="flex flex-col lg:flex-row lg:items-center p-3 gap-2">
								{/* Left Section: Icon and Title */}
								<div className="flex items-center space-x-3 lg:w-[50%] min-w-0">
									<div className="flex-shrink-0">
										<div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
											<Newspaper className="h-5 w-5 text-blue-600" />
										</div>
									</div>
									<div className="flex-1 min-w-0">
										<h3 className="text-base font-medium text-gray-900 truncate text-left">
											{item.title}
										</h3>
										<div className="flex items-center mt-0.5">
											<Calendar className="h-3 w-3 text-gray-400 mr-1" />
											<span className="text-xs text-gray-600">
												{formatDate(item.newsDate)}
											</span>
										</div>
									</div>
								</div>

								{/* Middle Section: News ID */}
								<div className="flex items-center lg:w-[30%] px-0 lg:px-4 flex-shrink-0 border-t lg:border-t-0 lg:border-l lg:border-r border-gray-200 pt-2 lg:pt-0">
									<div className="flex flex-col w-full">
										<span className="text-xs font-medium text-gray-500 mb-0.5 text-left">News ID</span>
										<span className="text-xs text-gray-900 text-left">
											#{item.newsId}
										</span>
									</div>
								</div>

								{/* Right Section: Action Button */}
								<div className="flex items-center justify-end lg:w-[20%] flex-shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-200">
									<button
										onClick={() => setViewModal({ show: true, news: item })}
										className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 whitespace-nowrap"
									>
										<Eye className="h-3.5 w-3.5 mr-1" />
										View
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Results Count */}
			{news.length > 0 && (
				<div className="text-center text-sm text-gray-500">
					Showing {news.length} news article{news.length !== 1 ? 's' : ''}
					{(searchTerm || dateFrom || dateTo) && ' matching your criteria'}
				</div>
			)}

			{/* View Modal */}
			{viewModal.show && viewModal.news && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
					<div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full my-8 transform transition-all">
						{/* Modal Header */}
						<div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-xl">
							<div className="flex items-start justify-between">
								<div className="flex items-start">
									<div className="p-2 bg-white/20 rounded-lg mr-4 flex-shrink-0">
										<Newspaper className="h-6 w-6" />
									</div>
									<div className="flex-1">
										<h2 className="text-2xl font-bold mb-2">{viewModal.news.title}</h2>
										<div className="flex items-center text-blue-100 text-sm">
											<Calendar className="h-4 w-4 mr-2" />
											<span>{formatDate(viewModal.news.newsDate)}</span>
											<span className="mx-2">•</span>
											<span>News ID: #{viewModal.news.newsId}</span>
										</div>
									</div>
								</div>
								<button
									onClick={() => setViewModal({ show: false, news: null })}
									className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors flex-shrink-0"
								>
									<X className="h-5 w-5" />
								</button>
							</div>
						</div>

						{/* Modal Content */}
						<div className="p-6 max-h-[600px] overflow-y-auto">
							{/* Image */}
							{viewModal.news.imageUrl && (
								<div className="mb-6">
									<img 
										src={viewModal.news.imageUrl} 
										alt={viewModal.news.imageCaption || viewModal.news.title}
										className="w-full h-auto rounded-lg shadow-md"
										onError={(e) => {
											e.currentTarget.style.display = 'none';
										}}
									/>
									{viewModal.news.imageCaption && (
										<p className="text-sm text-gray-500 italic mt-2 text-center">
											{viewModal.news.imageCaption}
										</p>
									)}
								</div>
							)}

							{/* Body Text */}
							<div className="prose prose-sm max-w-none">
								{viewModal.news.bodyText ? (
									<div className="text-gray-700 leading-relaxed">
										{formatBodyText(viewModal.news.bodyText)}
									</div>
								) : (
									<p className="text-gray-500 italic">No content available</p>
								)}
							</div>
						</div>

						{/* Modal Footer */}
						<div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end border-t border-gray-200">
							<button
								onClick={() => setViewModal({ show: false, news: null })}
								className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium shadow-sm"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
