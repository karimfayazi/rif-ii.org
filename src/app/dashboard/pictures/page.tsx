"use client";

import { useEffect, useState } from "react";
import { Calendar, Folder, FileImage, RotateCcw, ArrowLeft, Eye, Upload, RefreshCw, Download, Trash2, AlertCircle, Loader2, CheckCircle, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAccess } from "@/hooks/useAccess";
import { useAuth } from "@/hooks/useAuth";

type PictureData = {
	MainCategory: string | null;
	SubCategory: string | null;
	EventDate: string | null;
	TotalPictures: number;
	PreviewImage: string | null;
};

type PictureDetail = {
	PictureID: number;
	GroupName: string | null;
	MainCategory: string | null;
	SubCategory: string | null;
	FileName: string | null;
	FilePath: string | null;
	FileSizeKB: number | null;
	UploadedBy: string | null;
	UploadDate: string | null;
	IsActive: boolean | null;
	EventDate: string | null;
};

export default function PicturesPage() {
	const { user, getUserId } = useAuth();
	const userId = user?.id || user?.username || getUserId() || "1";
	const { canUploadPictures, isAdmin, loading: accessLoading, accessLevel, accessDelete } = useAccess(userId);
	
	const [mainCategories, setMainCategories] = useState<Array<{MainCategory: string; TotalPictures: number; PreviewImage: string | null}>>([]);
	const [eventNames, setEventNames] = useState<Array<{EventName: string; TotalPictures: number; PreviewImage: string | null}>>([]);
	const [eventDates, setEventDates] = useState<Array<{EventDate: string; TotalPictures: number; PreviewImage: string | null}>>([]);
	const [pictures, setPictures] = useState<PictureDetail[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<'mainCategories' | 'eventNames' | 'eventDates' | 'pictures'>('mainCategories');
	const [selectedMainCategory, setSelectedMainCategory] = useState<string | null>(null);
	const [selectedEventName, setSelectedEventName] = useState<string | null>(null);
	const [selectedEventDate, setSelectedEventDate] = useState<string | null>(null);
	const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; picture: PictureDetail | null }>({ show: false, picture: null });
	const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<{ 
		show: boolean; 
		type: 'mainCategory' | 'eventName' | 'eventDate' | null;
		name: string | null;
		mainCategory?: string | null;
		eventName?: string | null;
		eventDate?: string | null;
	}>({ show: false, type: null, name: null });
	const [deleting, setDeleting] = useState(false);
	const [deletingFolder, setDeletingFolder] = useState(false);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	useEffect(() => {
		fetchMainCategories();
	}, []);

	// Debug: Log admin status
	useEffect(() => {
		if (!accessLoading) {
			console.log('Pictures Page - Access Status:', { 
				isAdmin, 
				canUploadPictures, 
				accessLoading, 
				accessLevel,
				userId 
			});
		}
	}, [isAdmin, canUploadPictures, accessLoading, accessLevel, userId]);

	const fetchMainCategories = async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/pictures/folders");
			const data = await response.json();
			
			if (data.success) {
				setMainCategories(data.mainCategories || []);
			} else {
				setError(data.message || "Failed to fetch main categories");
			}
		} catch (err) {
			setError("Error fetching main categories");
			console.error("Error fetching main categories:", err);
		} finally {
			setLoading(false);
		}
	};

	const fetchEventNames = async (mainCategory: string) => {
		try {
			setLoading(true);
			const response = await fetch(`/api/pictures/folders?mainCategory=${encodeURIComponent(mainCategory)}`);
			const data = await response.json();
			
			if (data.success) {
				setEventNames(data.eventNames || []);
				setViewMode('eventNames');
			} else {
				setError(data.message || "Failed to fetch event names");
			}
		} catch (err) {
			setError("Error fetching event names");
			console.error("Error fetching event names:", err);
		} finally {
			setLoading(false);
		}
	};

	const fetchEventDates = async (mainCategory: string, eventName: string) => {
		try {
			setLoading(true);
			const response = await fetch(`/api/pictures/folders?mainCategory=${encodeURIComponent(mainCategory)}&eventName=${encodeURIComponent(eventName)}`);
			const data = await response.json();
			
			if (data.success) {
				setEventDates(data.eventDates || []);
				setViewMode('eventDates');
			} else {
				setError(data.message || "Failed to fetch event dates");
			}
		} catch (err) {
			setError("Error fetching event dates");
			console.error("Error fetching event dates:", err);
		} finally {
			setLoading(false);
		}
	};

	const fetchPictures = async (mainCategory: string, eventName: string, eventDate: string) => {
		try {
			setLoading(true);
			const response = await fetch(`/api/pictures/folders?mainCategory=${encodeURIComponent(mainCategory)}&eventName=${encodeURIComponent(eventName)}&eventDate=${encodeURIComponent(eventDate)}`);
			const data = await response.json();
			
			if (data.success) {
				setPictures(data.pictures || []);
				setViewMode('pictures');
			} else {
				setError(data.message || "Failed to fetch pictures");
			}
		} catch (err) {
			setError("Error fetching pictures");
			console.error("Error fetching pictures:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleMainCategoryClick = (mainCategory: string) => {
		setSelectedMainCategory(mainCategory);
		setSelectedEventName(null);
		setSelectedEventDate(null);
		setEventNames([]);
		setEventDates([]);
		setPictures([]);
		fetchEventNames(mainCategory);
	};

	const handleEventNameClick = (eventName: string) => {
		if (!selectedMainCategory) return;
		setSelectedEventName(eventName);
		setSelectedEventDate(null);
		setEventDates([]);
		setPictures([]);
		fetchEventDates(selectedMainCategory, eventName);
	};

	const handleEventDateClick = (eventDate: string) => {
		if (!selectedMainCategory || !selectedEventName) return;
		setSelectedEventDate(eventDate);
		fetchPictures(selectedMainCategory, selectedEventName, eventDate);
	};

	const handleBackToMainCategories = () => {
		setViewMode('mainCategories');
		setSelectedMainCategory(null);
		setSelectedEventName(null);
		setSelectedEventDate(null);
		setEventNames([]);
		setEventDates([]);
		setPictures([]);
	};

	const handleBackToEventNames = () => {
		if (!selectedMainCategory) return;
		setViewMode('eventNames');
		setSelectedEventName(null);
		setSelectedEventDate(null);
		setEventDates([]);
		setPictures([]);
		fetchEventNames(selectedMainCategory);
	};

	const handleBackToEventDates = () => {
		if (!selectedMainCategory || !selectedEventName) return;
		setViewMode('eventDates');
		setSelectedEventDate(null);
		setPictures([]);
		fetchEventDates(selectedMainCategory, selectedEventName);
	};

	const filteredMainCategories = mainCategories.filter(cat =>
		cat.MainCategory?.toLowerCase().includes(searchTerm.toLowerCase())
	);

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		return dateString; // Already formatted by SQL
	};

	const formatFileSize = (sizeKB: number | null) => {
		if (!sizeKB) return "Unknown";
		if (sizeKB < 1024) return `${sizeKB} KB`;
		return `${(sizeKB / 1024).toFixed(1)} MB`;
	};

	const getImageUrl = (filePath: string | null) => {
		if (!filePath) return '';
		
		// If already a full URL, return as-is
		if (filePath.startsWith('https://') || filePath.startsWith('http://')) {
			return filePath;
		}
		
		// Normalize backslashes to forward slashes
		let normalizedPath = filePath.replace(/\\/g, '/');
		
		// Handle ~/ prefix (remove it)
		if (normalizedPath.startsWith('~/')) {
			normalizedPath = normalizedPath.replace('~/', '');
		}
		
		// Ensure path starts with uploads/ for relative paths
		if (!normalizedPath.startsWith('uploads/') && !normalizedPath.startsWith('/')) {
			normalizedPath = `uploads/${normalizedPath}`;
		}
		
		// Remove leading slash if present (we'll add it)
		if (normalizedPath.startsWith('/')) {
			normalizedPath = normalizedPath.substring(1);
		}
		
		// Check if we're on production (Vercel)
		if (typeof window !== 'undefined') {
			const origin = window.location.origin;
			const isProduction = origin.includes('vercel.app') || origin.includes('rif-ii.org');
			
			if (isProduction) {
				// Use GitHub raw URL for production
				const githubRepo = 'karimfayazi/rif-ii.org';
				const githubBranch = 'main';
				return `https://raw.githubusercontent.com/${githubRepo}/${githubBranch}/public/${normalizedPath}`;
			}
			
			// On local server, use current origin
			return `${origin}/${normalizedPath}`;
		}
		
		// For server-side or fallback, use relative path
		return `/${normalizedPath}`;
	};



	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Important Pictures</h1>
					<p className="text-gray-600 mt-2">Browse and manage uploaded pictures</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading pictures...</span>
				</div>
			</div>
		);
	}

	if (error) {
		const handleRetry = () => {
			setError(null);
			setSelectedMainCategory(null);
			setSelectedEventName(null);
			setSelectedEventDate(null);
			setViewMode('mainCategories');
			fetchMainCategories();
		};

		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Important Pictures</h1>
					<p className="text-gray-600 mt-2">Browse and manage uploaded pictures</p>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600">{error}</p>
					<button
						onClick={handleRetry}
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
			{successMessage && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between animate-in slide-in-from-top-5">
					<div className="flex items-center">
						<CheckCircle className="h-5 w-5 text-green-600 mr-3" />
						<p className="text-green-800 font-medium">{successMessage}</p>
					</div>
					<button
						onClick={() => setSuccessMessage(null)}
						className="text-green-600 hover:text-green-800 transition-colors"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
			)}

			{/* Error Message */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between animate-in slide-in-from-top-5">
					<div className="flex items-center">
						<AlertCircle className="h-5 w-5 text-red-600 mr-3" />
						<p className="text-red-800 font-medium">{error}</p>
					</div>
					<button
						onClick={() => setError(null)}
						className="text-red-600 hover:text-red-800 transition-colors"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
			)}

			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Important Pictures</h1>
					<p className="text-gray-600 mt-2">
						{viewMode === 'mainCategories' ? 'Browse and manage uploaded pictures by category' : 'View pictures in selected category'}
					</p>
				</div>
				{viewMode === 'mainCategories' && (
					<div className="flex items-center space-x-3">
						<Link
							href="/dashboard/pictures/upload"
							className="inline-flex items-center px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors"
						>
							<Upload className="h-4 w-4 mr-2" />
							Upload Pictures
						</Link>
						<button
							onClick={fetchMainCategories}
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
				)}
			</div>

			{viewMode === 'mainCategories' ? (
				<>
					{/* Search Filter */}
					<div className="bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 shadow-lg p-6">
						<div className="flex items-center justify-between mb-4">
							<div>
								<h3 className="text-lg font-semibold text-gray-900">Search Pictures</h3>
								<p className="text-sm text-gray-600">Find specific pictures by category or subcategory</p>
							</div>
							<div className="flex items-center space-x-4">
								<div className="flex items-center space-x-2">
									<div className="h-2 w-2 bg-green-500 rounded-full"></div>
									<span className="text-xs text-gray-500 font-medium">Live Search</span>
								</div>
								<button
									onClick={() => setSearchTerm("")}
									disabled={!searchTerm}
									className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
								>
									<RotateCcw className="h-3 w-3 mr-1" />
									Reset
								</button>
							</div>
						</div>
						
						<div className="relative group">
							<input
								type="text"
								placeholder="Type to search pictures by category or subcategory..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full px-4 py-4 text-gray-900 placeholder-gray-500 bg-white border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-[#0b4d2b]/20 focus:border-[#0b4d2b] focus:outline-none transition-all duration-200 shadow-sm hover:shadow-md"
							/>
							{searchTerm && (
								<button
									onClick={() => setSearchTerm("")}
									className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
								>
									<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							)}
						</div>
						
						{searchTerm && (
							<div className="mt-4 flex items-center justify-between">
								<div className="flex items-center space-x-2">
									<div className="h-1.5 w-1.5 bg-[#0b4d2b] rounded-full animate-pulse"></div>
									<span className="text-sm text-gray-600">
										Searching for: <span className="font-medium text-gray-900">&ldquo;{searchTerm}&rdquo;</span>
									</span>
								</div>
								<div className="text-xs text-gray-500">
									{filteredMainCategories.length} result{filteredMainCategories.length !== 1 ? 's' : ''} found
								</div>
							</div>
						)}
					</div>

					{/* Main Categories Grid */}
					{filteredMainCategories.length === 0 ? (
						<div className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center">
							<FileImage className="mx-auto h-12 w-12 text-gray-400 mb-4" />
							<h3 className="text-lg font-medium text-gray-900 mb-2">
								{searchTerm ? "No categories found" : "No picture categories available"}
							</h3>
							<p className="text-gray-600">
								{searchTerm ? "Try adjusting your search terms" : "Picture categories will appear here once pictures are uploaded"}
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{filteredMainCategories.map((category, index) => (
								<div
									key={`${category.MainCategory}-${index}`}
									className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group relative"
								>
									<div 
										className="cursor-pointer"
										onClick={() => handleMainCategoryClick(category.MainCategory)}
									>
										<div className="aspect-video relative bg-gradient-to-br from-blue-50 to-indigo-100 rounded-t-lg overflow-hidden">
											{category.PreviewImage ? (
												<Image
													src={getImageUrl(category.PreviewImage)}
													alt={category.MainCategory || "Preview"}
													fill
													className="object-cover group-hover:scale-105 transition-transform duration-200"
													sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
													unoptimized
													onError={(e) => {
														console.log("Image load error for main category:", category.PreviewImage);
														const target = e.target as HTMLImageElement;
														target.style.display = 'none';
														const fallback = target.parentElement?.querySelector('.fallback-icon');
														if (fallback) {
															fallback.classList.remove('hidden');
														}
													}}
												/>
											) : null}
											<div className="absolute inset-0 flex items-center justify-center fallback-icon hidden">
												<Folder className="h-16 w-16 text-blue-400 group-hover:scale-110 transition-transform duration-200" />
											</div>
											{!category.PreviewImage && (
												<div className="absolute inset-0 flex items-center justify-center">
													<Folder className="h-16 w-16 text-blue-400 group-hover:scale-110 transition-transform duration-200" />
												</div>
											)}
											<div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200"></div>
											<div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded z-10">
												{category.TotalPictures} Pictures
											</div>
										</div>
										<div className="p-6">
											<div className="flex items-start justify-between mb-4">
												<div className="flex-1">
													<h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#0b4d2b] transition-colors line-clamp-2">
														{category.MainCategory || "Uncategorized"}
													</h3>
												</div>
												<Folder className="h-5 w-5 text-gray-400 group-hover:text-[#0b4d2b] transition-colors flex-shrink-0 ml-2" />
											</div>
											<div className="flex items-center justify-between">
												<div className="flex items-center text-xs text-gray-500">
													<FileImage className="h-3 w-3 mr-1" />
													<span className="truncate max-w-[200px]">
														{category.TotalPictures} Total Pictures
													</span>
												</div>
											</div>
											{/* Action Buttons */}
											<div className="flex items-center gap-2 pt-3 mt-3 border-t border-gray-100">
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleMainCategoryClick(category.MainCategory);
													}}
													className="flex-1 inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-[#0b4d2b] rounded-lg hover:bg-[#0a3d24] transition-colors"
												>
													<Eye className="h-3 w-3 mr-1" />
													View
												</button>
												{(isAdmin || accessDelete) && (
													<button
														onClick={(e) => {
															e.stopPropagation();
															setDeleteFolderConfirm({ 
																show: true, 
																type: 'mainCategory', 
																name: category.MainCategory,
																mainCategory: category.MainCategory
															});
														}}
														className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
														title="Delete Category"
													>
														<Trash2 className="h-3 w-3 mr-1" />
														Delete
													</button>
												)}
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					)}

					{/* Results Count */}
					{filteredMainCategories.length > 0 && (
						<div className="text-center text-sm text-gray-500">
							Showing {filteredMainCategories.length} of {mainCategories.length} categories
							{searchTerm && ` matching "${searchTerm}"`}
						</div>
					)}
				</>
			) : viewMode === 'eventNames' ? (
				<>
					{/* Back Button */}
					<div className="flex items-center justify-between mb-6">
						<button
							onClick={handleBackToMainCategories}
							className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
						>
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Main Categories
						</button>
						<div className="text-sm text-gray-600 font-medium">
							{selectedMainCategory}
						</div>
					</div>

					{/* Event Names Grid */}
					{eventNames.length === 0 ? (
						<div className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center">
							<FileImage className="mx-auto h-12 w-12 text-gray-400 mb-4" />
							<h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
							<p className="text-gray-600">No events available in this category</p>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{eventNames.map((event, index) => (
								<div
									key={`${event.EventName}-${index}`}
									className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group relative"
								>
									<div 
										className="cursor-pointer"
										onClick={() => handleEventNameClick(event.EventName)}
									>
										<div className="aspect-video relative bg-gradient-to-br from-green-50 to-green-100 rounded-t-lg overflow-hidden">
											{event.PreviewImage ? (
												<Image
													src={getImageUrl(event.PreviewImage)}
													alt={event.EventName || "Preview"}
													fill
													className="object-cover group-hover:scale-105 transition-transform duration-200"
													sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
													unoptimized
													onError={(e) => {
														console.log("Image load error for event name:", event.PreviewImage);
														const target = e.target as HTMLImageElement;
														target.style.display = 'none';
														const fallback = target.parentElement?.querySelector('.fallback-icon');
														if (fallback) {
															fallback.classList.remove('hidden');
														}
													}}
												/>
											) : null}
											<div className="absolute inset-0 flex items-center justify-center fallback-icon hidden">
												<Folder className="h-16 w-16 text-green-400 group-hover:scale-110 transition-transform duration-200" />
											</div>
											{!event.PreviewImage && (
												<div className="absolute inset-0 flex items-center justify-center">
													<Folder className="h-16 w-16 text-green-400 group-hover:scale-110 transition-transform duration-200" />
												</div>
											)}
											<div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200"></div>
											<div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded z-10">
												{event.TotalPictures} Pictures
											</div>
										</div>
										<div className="p-6">
											<div className="flex items-start justify-between mb-4">
												<div className="flex-1">
													<h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#0b4d2b] transition-colors line-clamp-2">
														{event.EventName || "Untitled Event"}
													</h3>
												</div>
												<Folder className="h-5 w-5 text-gray-400 group-hover:text-[#0b4d2b] transition-colors flex-shrink-0 ml-2" />
											</div>
											<div className="flex items-center justify-between">
												<div className="flex items-center text-xs text-gray-500">
													<FileImage className="h-3 w-3 mr-1" />
													<span className="truncate max-w-[200px]">
														{event.TotalPictures} Total Pictures
													</span>
												</div>
											</div>
											{/* Action Buttons */}
											<div className="flex items-center gap-2 pt-3 mt-3 border-t border-gray-100">
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleEventNameClick(event.EventName);
													}}
													className="flex-1 inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-[#0b4d2b] rounded-lg hover:bg-[#0a3d24] transition-colors"
												>
													<Eye className="h-3 w-3 mr-1" />
													View
												</button>
												{(isAdmin || accessDelete) && (
													<button
														onClick={(e) => {
															e.stopPropagation();
															setDeleteFolderConfirm({ 
																show: true, 
																type: 'eventName', 
																name: event.EventName,
																mainCategory: selectedMainCategory,
																eventName: event.EventName
															});
														}}
														className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
														title="Delete Event"
													>
														<Trash2 className="h-3 w-3 mr-1" />
														Delete
													</button>
												)}
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</>
			) : viewMode === 'eventDates' ? (
				<>
					{/* Back Button */}
					<div className="flex items-center justify-between mb-6">
						<button
							onClick={handleBackToEventNames}
							className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
						>
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Events
						</button>
						<div className="text-sm text-gray-600 font-medium">
							{selectedMainCategory} / {selectedEventName}
						</div>
					</div>

					{/* Event Dates Grid */}
					{eventDates.length === 0 ? (
						<div className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center">
							<FileImage className="mx-auto h-12 w-12 text-gray-400 mb-4" />
							<h3 className="text-lg font-medium text-gray-900 mb-2">No event dates found</h3>
							<p className="text-gray-600">No event dates available for this event</p>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{eventDates.map((eventDate, index) => (
								<div
									key={`${eventDate.EventDate}-${index}`}
									className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group relative"
								>
									<div 
										className="cursor-pointer"
										onClick={() => handleEventDateClick(eventDate.EventDate)}
									>
										<div className="aspect-video relative bg-gradient-to-br from-purple-50 to-purple-100 rounded-t-lg overflow-hidden">
											{eventDate.PreviewImage ? (
												<Image
													src={getImageUrl(eventDate.PreviewImage)}
													alt={eventDate.EventDate || "Preview"}
													fill
													className="object-cover group-hover:scale-105 transition-transform duration-200"
													sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
													unoptimized
													onError={(e) => {
														console.log("Image load error for event date:", eventDate.PreviewImage);
														const target = e.target as HTMLImageElement;
														target.style.display = 'none';
														const fallback = target.parentElement?.querySelector('.fallback-icon');
														if (fallback) {
															fallback.classList.remove('hidden');
														}
													}}
												/>
											) : null}
											<div className="absolute inset-0 flex items-center justify-center fallback-icon hidden">
												<Calendar className="h-16 w-16 text-purple-400 group-hover:scale-110 transition-transform duration-200" />
											</div>
											{!eventDate.PreviewImage && (
												<div className="absolute inset-0 flex items-center justify-center">
													<Calendar className="h-16 w-16 text-purple-400 group-hover:scale-110 transition-transform duration-200" />
												</div>
											)}
											<div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200"></div>
											<div className="absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded z-10">
												{eventDate.TotalPictures} Pictures
											</div>
										</div>
										<div className="p-6">
											<div className="flex items-start justify-between mb-4">
												<div className="flex-1">
													<h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#0b4d2b] transition-colors">
														{formatDate(eventDate.EventDate)}
													</h3>
												</div>
												<Calendar className="h-5 w-5 text-gray-400 group-hover:text-[#0b4d2b] transition-colors flex-shrink-0 ml-2" />
											</div>
											<div className="flex items-center justify-between">
												<div className="flex items-center text-xs text-gray-500">
													<FileImage className="h-3 w-3 mr-1" />
													<span className="truncate max-w-[200px]">
														{eventDate.TotalPictures} Total Pictures
													</span>
												</div>
											</div>
											{/* Action Buttons */}
											<div className="flex items-center gap-2 pt-3 mt-3 border-t border-gray-100">
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleEventDateClick(eventDate.EventDate);
													}}
													className="flex-1 inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-[#0b4d2b] rounded-lg hover:bg-[#0a3d24] transition-colors"
												>
													<Eye className="h-3 w-3 mr-1" />
													View
												</button>
												{(isAdmin || accessDelete) && (
													<button
														onClick={(e) => {
															e.stopPropagation();
															setDeleteFolderConfirm({ 
																show: true, 
																type: 'eventDate', 
																name: formatDate(eventDate.EventDate),
																mainCategory: selectedMainCategory,
																eventName: selectedEventName,
																eventDate: eventDate.EventDate
															});
														}}
														className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
														title="Delete Event Date"
													>
														<Trash2 className="h-3 w-3 mr-1" />
														Delete
													</button>
												)}
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</>
			) : (
				<>
					{/* Back Button */}
					<div className="flex items-center justify-between mb-6">
						<button
							onClick={handleBackToEventDates}
							className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
						>
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Event Dates
						</button>
						<div className="text-sm text-gray-600 font-medium">
							{selectedMainCategory} / {selectedEventName} / {selectedEventDate && formatDate(selectedEventDate)}
						</div>
					</div>

					{/* Pictures Grid */}
					{pictures.length === 0 ? (
						<div className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center">
							<FileImage className="mx-auto h-12 w-12 text-gray-400 mb-4" />
							<h3 className="text-lg font-medium text-gray-900 mb-2">No pictures found</h3>
							<p className="text-gray-600">No pictures available for this event date</p>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
							{pictures.map((picture) => (
								<div
									key={picture.PictureID}
									className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group relative"
								>
									<div className="aspect-video relative bg-gray-100 rounded-t-lg overflow-hidden">
										{picture.FilePath ? (
											<Image
												src={getImageUrl(picture.FilePath)}
												alt={picture.FileName || "Picture"}
												fill
												className="object-cover group-hover:scale-105 transition-transform duration-200"
												unoptimized
											/>
										) : (
											<div className="flex items-center justify-center h-full">
												<FileImage className="h-12 w-12 text-gray-400" />
											</div>
										)}
										<div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
											{formatFileSize(picture.FileSizeKB)}
										</div>
									</div>
									<div className="p-4">
										<div className="flex items-start justify-between mb-3">
											<div className="flex-1">
												<h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#0b4d2b] transition-colors line-clamp-2">
													{picture.FileName || "Untitled"}
												</h3>
											</div>
											<Eye className="h-4 w-4 text-gray-400 group-hover:text-[#0b4d2b] transition-colors flex-shrink-0 ml-2" />
										</div>
										<div className="space-y-1 text-xs text-gray-600 mb-3">
											{picture.GroupName && (
												<div className="flex items-center">
													<Calendar className="h-3 w-3 mr-1" />
													<span className="line-clamp-1">{picture.GroupName}</span>
												</div>
											)}
											{picture.EventDate && (
												<div className="flex items-center">
													<Calendar className="h-3 w-3 mr-1" />
													<span>{formatDate(picture.EventDate)}</span>
												</div>
											)}
											{picture.UploadedBy && (
												<div className="flex items-center">
													<FileImage className="h-3 w-3 mr-1" />
													<span className="line-clamp-1">{picture.UploadedBy}</span>
												</div>
											)}
										</div>
										{/* Action Buttons */}
										<div className="flex items-center gap-2 pt-2 border-t border-gray-100">
											<Link
												href={`/dashboard/pictures/view?id=${picture.PictureID}`}
												className="flex-1 inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-[#0b4d2b] rounded-lg hover:bg-[#0a3d24] transition-colors"
											>
												<Eye className="h-3 w-3 mr-1" />
												View
											</Link>
											{(isAdmin || accessDelete) && (
												<button
													onClick={(e) => {
														e.preventDefault();
														e.stopPropagation();
														setDeleteConfirm({ show: true, picture });
													}}
													className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
													title="Delete Picture"
												>
													<Trash2 className="h-3 w-3 mr-1" />
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
					{pictures.length > 0 && (
						<div className="text-center text-sm text-gray-500">
							Showing {pictures.length} pictures
						</div>
					)}
				</>
			)}


			{/* Delete Confirmation Modal */}
			{deleteConfirm.show && deleteConfirm.picture && (
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
								<p className="text-gray-700 text-base mb-3 font-semibold">
									Are you sure you want to delete this picture?
								</p>
								<p className="text-gray-600 text-sm mb-4">
									This action will permanently remove the picture from the system.
								</p>
								<div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
									{deleteConfirm.picture.FilePath && (
										<div className="mb-3">
											<img
												src={getImageUrl(deleteConfirm.picture.FilePath)}
												alt={deleteConfirm.picture.FileName || "Picture"}
												className="w-full h-32 object-cover rounded-lg"
											/>
										</div>
									)}
									<p className="text-sm font-medium text-gray-500 mb-1">File Name:</p>
									<p className="text-base font-semibold text-gray-900">
										{deleteConfirm.picture.FileName || "N/A"}
									</p>
									{deleteConfirm.picture.GroupName && (
										<>
											<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Event:</p>
											<p className="text-base text-gray-700">{deleteConfirm.picture.GroupName}</p>
										</>
									)}
									{deleteConfirm.picture.MainCategory && (
										<>
											<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Category:</p>
											<p className="text-base text-gray-700">
												{deleteConfirm.picture.MainCategory}
												{deleteConfirm.picture.SubCategory && ` - ${deleteConfirm.picture.SubCategory}`}
											</p>
										</>
									)}
								</div>
							</div>
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start">
								<AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
								<p className="text-sm text-yellow-800">
									<strong>Warning:</strong> This will permanently delete this picture from the database and file system. This action cannot be undone.
								</p>
							</div>
						</div>

						{/* Modal Footer */}
						<div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end space-x-3 border-t border-gray-200">
							<button
								onClick={() => setDeleteConfirm({ show: false, picture: null })}
								disabled={deleting}
								className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								onClick={async () => {
									if (!deleteConfirm.picture) return;
									
									try {
										setDeleting(true);
										const response = await fetch(`/api/pictures/delete?pictureId=${deleteConfirm.picture.PictureID}`, {
											method: 'DELETE'
										});
										const data = await response.json();
										
										if (data.success) {
											setDeleteConfirm({ show: false, picture: null });
											setSuccessMessage("Picture deleted successfully!");
											setTimeout(() => setSuccessMessage(null), 5000);
											// Refresh the pictures
											if (selectedMainCategory && selectedEventName && selectedEventDate) {
												fetchPictures(selectedMainCategory, selectedEventName, selectedEventDate);
											} else if (selectedMainCategory && selectedEventName) {
												fetchEventDates(selectedMainCategory, selectedEventName);
											} else if (selectedMainCategory) {
												fetchEventNames(selectedMainCategory);
											} else {
												fetchMainCategories();
											}
										} else {
											setError(data.message || "Failed to delete picture");
											setDeleteConfirm({ show: false, picture: null });
										}
									} catch (err) {
										console.error("Error deleting picture:", err);
										setError("Error deleting picture");
										setDeleteConfirm({ show: false, picture: null });
									} finally {
										setDeleting(false);
									}
								}}
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

			{/* Delete Folder Confirmation Modal */}
			{deleteFolderConfirm.show && deleteFolderConfirm.type && (
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
									Are you sure you want to delete this {deleteFolderConfirm.type === 'mainCategory' ? 'category' : deleteFolderConfirm.type === 'eventName' ? 'event' : 'event date'}?
								</p>
								<div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
									<p className="text-sm font-medium text-gray-500 mb-1">
										{deleteFolderConfirm.type === 'mainCategory' ? 'Category:' : deleteFolderConfirm.type === 'eventName' ? 'Event:' : 'Event Date:'}
									</p>
									<p className="text-base font-semibold text-gray-900">
										{deleteFolderConfirm.name || "N/A"}
									</p>
									{deleteFolderConfirm.type === 'eventName' && deleteFolderConfirm.mainCategory && (
										<>
											<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Main Category:</p>
											<p className="text-base text-gray-700">{deleteFolderConfirm.mainCategory}</p>
										</>
									)}
									{deleteFolderConfirm.type === 'eventDate' && (
										<>
											{deleteFolderConfirm.mainCategory && (
												<>
													<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Main Category:</p>
													<p className="text-base text-gray-700">{deleteFolderConfirm.mainCategory}</p>
												</>
											)}
											{deleteFolderConfirm.eventName && (
												<>
													<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Event:</p>
													<p className="text-base text-gray-700">{deleteFolderConfirm.eventName}</p>
												</>
											)}
										</>
									)}
								</div>
							</div>
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start">
								<AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
								<p className="text-sm text-yellow-800">
									<strong>Warning:</strong> This will permanently delete all pictures in this {deleteFolderConfirm.type === 'mainCategory' ? 'category' : deleteFolderConfirm.type === 'eventName' ? 'event' : 'event date'} from the database and file system. This action cannot be undone.
								</p>
							</div>
						</div>

						{/* Modal Footer */}
						<div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end space-x-3 border-t border-gray-200">
							<button
								onClick={() => setDeleteFolderConfirm({ show: false, type: null, name: null })}
								disabled={deletingFolder}
								className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								onClick={async () => {
									if (!deleteFolderConfirm.type || !deleteFolderConfirm.mainCategory) return;
									
									try {
										setDeletingFolder(true);
										const params = new URLSearchParams();
										params.append('mainCategory', deleteFolderConfirm.mainCategory);
										if (deleteFolderConfirm.eventName) {
											params.append('eventName', deleteFolderConfirm.eventName);
										}
										if (deleteFolderConfirm.eventDate) {
											params.append('eventDate', deleteFolderConfirm.eventDate);
										}

										const response = await fetch(`/api/pictures/folders/delete?${params.toString()}`, {
											method: 'DELETE'
										});
										
										const data = await response.json();
										
										if (data.success) {
											setDeleteFolderConfirm({ show: false, type: null, name: null });
											setSuccessMessage(`${deleteFolderConfirm.type === 'mainCategory' ? 'Category' : deleteFolderConfirm.type === 'eventName' ? 'Event' : 'Event Date'} deleted successfully!`);
											setTimeout(() => setSuccessMessage(null), 5000);
											// Refresh the current view
											if (deleteFolderConfirm.type === 'eventDate' && selectedMainCategory && selectedEventName) {
												fetchEventDates(selectedMainCategory, selectedEventName);
											} else if (deleteFolderConfirm.type === 'eventName' && selectedMainCategory) {
												fetchEventNames(selectedMainCategory);
											} else {
												fetchMainCategories();
											}
										} else {
											setError(data.message || "Failed to delete folder");
											setDeleteFolderConfirm({ show: false, type: null, name: null });
										}
									} catch (err) {
										console.error("Error deleting folder:", err);
										setError("Error deleting folder");
										setDeleteFolderConfirm({ show: false, type: null, name: null });
									} finally {
										setDeletingFolder(false);
									}
								}}
								disabled={deletingFolder}
								className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
							>
								{deletingFolder ? (
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

