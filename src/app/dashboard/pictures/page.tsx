"use client";

import { useEffect, useState } from "react";
import { Calendar, Folder, FileImage, RotateCcw, ArrowLeft, Eye, Upload, RefreshCw, Download, Plus, Trash2, AlertCircle, Loader2 } from "lucide-react";
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
	const { canUploadPictures, isAdmin, loading: accessLoading, accessLevel } = useAccess(userId);
	
	const [pictures, setPictures] = useState<PictureData[]>([]);
	const [pictureDetails, setPictureDetails] = useState<PictureDetail[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<'categories' | 'details'>('categories');
	const [selectedCategory, setSelectedCategory] = useState<{mainCategory: string, subCategory: string} | null>(null);
	const [selectedImage, setSelectedImage] = useState<PictureDetail | null>(null);
	const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; picture: PictureDetail | null }>({ show: false, picture: null });
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		fetchPictures();
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

	const fetchPictures = async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/pictures");
			const data = await response.json();
			
			if (data.success) {
				setPictures(data.pictures || []);
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

	const filteredPictures = pictures.filter(picture =>
		picture.MainCategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
		picture.SubCategory?.toLowerCase().includes(searchTerm.toLowerCase())
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
		if (filePath.startsWith('https://') || filePath.startsWith('http://')) {
			return filePath;
		} else if (filePath.startsWith('~/')) {
			// Remove the ~/ prefix
			return `https://rif-ii.org/${filePath.replace('~/', '')}`;
		} else if (filePath.startsWith('uploads/')) {
			return `/${filePath}`;
		} else {
			return `https://rif-ii.org/${filePath}`;
		}
	};

	const fetchPictureDetails = async (mainCategory: string, subCategory: string) => {
		try {
			setLoading(true);
			const response = await fetch(`/api/pictures/details?mainCategory=${encodeURIComponent(mainCategory)}&subCategory=${encodeURIComponent(subCategory)}`);
			const data = await response.json();
			
			if (data.success) {
				console.log("Picture details fetched:", data.pictures);
				setPictureDetails(data.pictures || []);
				setSelectedCategory({ mainCategory, subCategory });
				setViewMode('details');
			} else {
				setError(data.message || "Failed to fetch picture details");
			}
		} catch (err) {
			setError("Error fetching picture details");
			console.error("Error fetching picture details:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleBackToCategories = () => {
		setViewMode('categories');
		setSelectedCategory(null);
		setPictureDetails([]);
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
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Important Pictures</h1>
					<p className="text-gray-600 mt-2">Browse and manage uploaded pictures</p>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600">{error}</p>
					<button
						onClick={fetchPictures}
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
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Important Pictures</h1>
					<p className="text-gray-600 mt-2">
						{viewMode === 'categories' ? 'Browse and manage uploaded pictures by category' : 'View pictures in selected category'}
					</p>
				</div>
				{viewMode === 'categories' && (
					<div className="flex items-center space-x-3">
						<Link
							href="/dashboard/pictures/upload"
							className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
						>
							<Upload className="h-4 w-4 mr-2" />
							Upload picture
						</Link>
						{/* Show Add Pictures button only for Admin users */}
						{!accessLoading && isAdmin && accessLevel === 'Admin' && (
							<Link
								href="/dashboard/pictures/add_pictures"
								className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							>
								<Plus className="h-4 w-4 mr-2" />
								Add Pictures
							</Link>
						)}
						<button
							onClick={fetchPictures}
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

			{viewMode === 'categories' ? (
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
									{filteredPictures.length} result{filteredPictures.length !== 1 ? 's' : ''} found
								</div>
							</div>
						)}
					</div>

					{/* Pictures Grid */}
					{filteredPictures.length === 0 ? (
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
							{filteredPictures.map((picture, index) => (
								<div
									key={`${picture.MainCategory}-${picture.SubCategory}-${index}`}
									className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
									onClick={() => fetchPictureDetails(picture.MainCategory || "", picture.SubCategory || "")}
								>
									<div className="aspect-video relative bg-gradient-to-br from-blue-50 to-indigo-100 rounded-t-lg overflow-hidden">
										{picture.PreviewImage ? (
											<Image
												src={getImageUrl(picture.PreviewImage)}
												alt={picture.MainCategory || "Preview"}
												fill
												className="object-cover group-hover:scale-105 transition-transform duration-200"
												sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
												unoptimized
												onError={(e) => {
													const target = e.target as HTMLImageElement;
													const fallback = target.parentElement?.querySelector('.fallback-icon');
													if (fallback) {
														fallback.classList.remove('hidden');
													}
												}}
											/>
										) : (
											<div className="absolute inset-0 flex items-center justify-center">
												<FileImage className="h-16 w-16 text-blue-400 group-hover:scale-110 transition-transform duration-200" />
											</div>
										)}
										<div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200"></div>
										<div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded z-10">
											{picture.TotalPictures} Pictures
										</div>
									</div>
									<div className="p-6">
										<div className="flex items-start justify-between mb-4">
											<div className="flex-1">
												<h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#0b4d2b] transition-colors line-clamp-2">
													{picture.MainCategory || "Uncategorized"}
												</h3>
											</div>
											<Folder className="h-5 w-5 text-gray-400 group-hover:text-[#0b4d2b] transition-colors flex-shrink-0 ml-2" />
										</div>
										
										<div className="space-y-2 text-sm text-gray-600 mb-4">
											{picture.SubCategory && (
												<div className="flex items-center">
													<Folder className="h-4 w-4 mr-2" />
													<span className="line-clamp-1">{picture.SubCategory}</span>
												</div>
											)}
											{picture.EventDate && (
												<div className="flex items-center">
													<Calendar className="h-4 w-4 mr-2" />
													<span>{formatDate(picture.EventDate)}</span>
												</div>
											)}
										</div>
										
										<div className="flex items-center justify-between">
											<div className="flex items-center text-xs text-gray-500">
												<FileImage className="h-3 w-3 mr-1" />
												<span className="truncate max-w-[200px]">
													{picture.TotalPictures} Total Pictures
												</span>
											</div>
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
												Click to view
											</span>
										</div>
									</div>
								</div>
							))}
						</div>
					)}

					{/* Results Count */}
					{filteredPictures.length > 0 && (
						<div className="text-center text-sm text-gray-500">
							Showing {filteredPictures.length} of {pictures.length} categories
							{searchTerm && ` matching "${searchTerm}"`}
						</div>
					)}
				</>
			) : (
				<>
					{/* Back Button */}
					<div className="flex items-center justify-between mb-6">
						<button
							onClick={handleBackToCategories}
							className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
						>
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Categories
						</button>
						<div className="text-sm text-gray-600">
							{selectedCategory?.mainCategory} - {selectedCategory?.subCategory}
						</div>
					</div>


					{/* Pictures Detail Grid */}
					{pictureDetails.length === 0 ? (
						<div className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center">
							<FileImage className="mx-auto h-12 w-12 text-gray-400 mb-4" />
							<h3 className="text-lg font-medium text-gray-900 mb-2">No pictures found</h3>
							<p className="text-gray-600">No pictures available in this category</p>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
							{pictureDetails.map((picture) => (
								<div
									key={picture.PictureID}
									className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group relative"
								>
									<div 
										className="cursor-pointer"
										onClick={() => setSelectedImage(picture)}
									>
										<div className="aspect-video relative bg-gray-100 rounded-t-lg overflow-hidden">
											{picture.FilePath ? (
												<>
													<Image
														src={getImageUrl(picture.FilePath)}
														alt={picture.FileName || "Picture"}
														fill
														className="object-cover group-hover:scale-105 transition-transform duration-200"
														unoptimized
														onError={(e) => {
															console.log("Image load error for:", picture.FilePath);
															console.log("Constructed URL:", getImageUrl(picture.FilePath));
														}}
													/>
												</>
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
											
											<div className="space-y-1 text-xs text-gray-600">
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
										</div>
									</div>
									{/* Delete Button - Only show for Admin */}
									{isAdmin && accessLevel === 'Admin' && (
										<div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
											<button
												onClick={(e) => {
													e.stopPropagation();
													setDeleteConfirm({ show: true, picture });
												}}
												className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg"
												title="Delete Picture"
											>
												<Trash2 className="h-4 w-4" />
											</button>
										</div>
									)}
								</div>
							))}
						</div>
					)}

					{/* Results Count */}
					{pictureDetails.length > 0 && (
						<div className="text-center text-sm text-gray-500">
							Showing {pictureDetails.length} pictures in this category
						</div>
					)}
				</>
			)}

			{/* Modal for Full Size Image */}
			{selectedImage && (
				<div 
					className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
					onClick={() => setSelectedImage(null)}
				>
					<div className="relative max-w-4xl max-h-[90vh] w-full">
						<div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
							{isAdmin && accessLevel === 'Admin' && (
								<button
									onClick={(e) => {
										e.stopPropagation();
										setSelectedImage(null);
										setDeleteConfirm({ show: true, picture: selectedImage });
									}}
									className="bg-red-600 text-white rounded-full p-2 hover:bg-red-700 transition-colors"
									title="Delete Picture"
								>
									<Trash2 className="w-6 h-6" />
								</button>
							)}
							<button
								onClick={() => setSelectedImage(null)}
								className="bg-white text-gray-800 rounded-full p-2 hover:bg-gray-100"
							>
								<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
						<div className="bg-white rounded-lg overflow-hidden">
							<div className="relative aspect-video">
								{selectedImage.FilePath ? (
									<Image
										src={getImageUrl(selectedImage.FilePath)}
										alt={selectedImage.FileName || "Picture"}
										fill
										className="object-contain"
										unoptimized
									/>
								) : (
									<div className="flex items-center justify-center h-full">
										<FileImage className="h-24 w-24 text-gray-400" />
									</div>
								)}
							</div>
							<div className="p-6">
								<h3 className="text-lg font-semibold text-gray-900 mb-2">
									{selectedImage.FileName || "Untitled"}
								</h3>
								<div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
									{selectedImage.GroupName && (
										<div>
											<span className="font-medium">Event:</span> {selectedImage.GroupName}
										</div>
									)}
									{selectedImage.MainCategory && (
										<div>
											<span className="font-medium">Main Category:</span> {selectedImage.MainCategory}
										</div>
									)}
									{selectedImage.SubCategory && (
										<div>
											<span className="font-medium">Sub Category:</span> {selectedImage.SubCategory}
										</div>
									)}
									{selectedImage.EventDate && (
										<div>
											<span className="font-medium">Event Date:</span> {formatDate(selectedImage.EventDate)}
										</div>
									)}
									{selectedImage.UploadedBy && (
										<div>
											<span className="font-medium">Uploaded By:</span> {selectedImage.UploadedBy}
										</div>
									)}
									<div>
										<span className="font-medium">File Size:</span> {formatFileSize(selectedImage.FileSizeKB)}
									</div>
									<div>
										<span className="font-medium">Upload Date:</span> {formatDate(selectedImage.UploadDate)}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
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
								<p className="text-gray-700 text-base mb-3">
									Are you sure you want to delete this picture?
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
											// Refresh the picture details
											if (selectedCategory) {
												fetchPictureDetails(selectedCategory.mainCategory, selectedCategory.subCategory);
											} else {
												fetchPictures();
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

		</div>
	);
}

