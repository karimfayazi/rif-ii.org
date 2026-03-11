"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Folder, Image as ImageIcon, Download, User, FileText, Clock, Edit, Save, Trash2, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";

type PictureData = {
	PictureID?: number;
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

function PictureViewContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pictureId = searchParams.get('id');
	const groupName = searchParams.get('groupName');
	const mainCategory = searchParams.get('mainCategory');
	const subCategory = searchParams.get('subCategory');

	const { user, getUserId } = useAuth();
	const userId = user?.id || user?.username || getUserId() || null;
	const { isAdmin, accessDelete, loading: accessLoading } = useAccess(userId);

	const [picture, setPicture] = useState<PictureData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	
	// Edit mode state
	const [isEditMode, setIsEditMode] = useState(false);
	const [editFormData, setEditFormData] = useState<Partial<PictureData>>({});
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	// Show edit button to all users - API will handle permission checks
	const canEdit = true;
	const canDelete = isAdmin || accessDelete;

	const getImageUrl = (filePath: string | null) => {
		if (!filePath) return '';
		// Handle Vercel Blob URLs and other absolute URLs
		if (filePath.startsWith('https://') || filePath.startsWith('http://')) {
			return filePath;
		} else if (filePath.startsWith('~/')) {
			return `https://rif-ii.org/${filePath.replace('~/', '')}`;
		} else if (filePath.startsWith('uploads/')) {
			return `/${filePath}`;
		} else {
			return `https://rif-ii.org/${filePath}`;
		}
	};

	useEffect(() => {
		const fetchPicture = async () => {
			try {
				setLoading(true);
				setError(null);
				
				// If pictureId is provided, fetch directly by ID
				if (pictureId) {
					const response = await fetch(`/api/pictures/${pictureId}`);
					const data = await response.json();

					if (data.success && data.picture) {
						setPicture(data.picture);
						setEditFormData(data.picture);
					} else {
						setError(data.message || "Picture not found");
					}
				} else if (groupName || mainCategory || subCategory) {
					// Otherwise, use the details endpoint with filters
					const params = new URLSearchParams();
					if (groupName) params.append('groupName', groupName);
					if (mainCategory) params.append('mainCategory', mainCategory);
					if (subCategory) params.append('subCategory', subCategory);

					const response = await fetch(`/api/pictures/details?${params.toString()}`);
					const data = await response.json();

					if (data.success && data.pictures && data.pictures.length > 0) {
						setPicture(data.pictures[0]);
						setEditFormData(data.pictures[0]);
					} else {
						setError("Picture not found");
					}
				} else {
					setError("No picture parameters provided");
				}
			} catch (err) {
				setError("Error fetching picture");
				console.error("Error fetching picture:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchPicture();
	}, [pictureId, groupName, mainCategory, subCategory]);

	const handleDownload = () => {
		if (!picture?.FilePath) return;
		const fullUrl = getImageUrl(picture.FilePath);
		window.open(fullUrl, '_blank');
	};

	const formatDate = (dateString: string | null) => {
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

	const formatFileSize = (sizeKB: number | null) => {
		if (!sizeKB) return "Unknown";
		if (sizeKB < 1024) return `${sizeKB} KB`;
		return `${(sizeKB / 1024).toFixed(1)} MB`;
	};

	// Format date for input field (YYYY-MM-DD)
	const formatDateForInput = (dateString: string | null) => {
		if (!dateString) return "";
		try {
			const date = new Date(dateString);
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			return `${year}-${month}-${day}`;
		} catch {
			return "";
		}
	};

	// Handle edit button click
	const handleEdit = () => {
		if (picture) {
			setEditFormData({ ...picture });
			setIsEditMode(true);
			setError(null);
			setSuccessMessage(null);
		}
	};

	// Handle cancel edit
	const handleCancelEdit = () => {
		setIsEditMode(false);
		setEditFormData({});
		setError(null);
		setSuccessMessage(null);
	};

	// Handle form field change
	const handleFieldChange = (field: keyof PictureData, value: any) => {
		setEditFormData(prev => ({
			...prev,
			[field]: value
		}));
	};

	// Handle update/save
	const handleUpdate = async () => {
		if (!picture?.PictureID) {
			setError("Picture ID is missing");
			return;
		}

		// Validation
		if (!editFormData.FileName || editFormData.FileName.trim() === '') {
			setError("File Name is required");
			return;
		}

		try {
			setSaving(true);
			setError(null);
			setSuccessMessage(null);

			const response = await fetch('/api/pictures/manage', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({
					PictureID: picture.PictureID,
					GroupName: editFormData.GroupName || null,
					MainCategory: editFormData.MainCategory || null,
					SubCategory: editFormData.SubCategory || null,
					FileName: editFormData.FileName || null,
					FilePath: picture.FilePath, // Keep original file path
					FileSizeKB: picture.FileSizeKB, // Keep original file size
					UploadedBy: editFormData.UploadedBy || null,
					IsActive: editFormData.IsActive !== undefined ? editFormData.IsActive : true,
					EventDate: editFormData.EventDate || null,
				}),
			});

			const data = await response.json();

			if (data.success) {
				setSuccessMessage("Picture updated successfully");
				setIsEditMode(false);
				// Refresh picture data
				if (pictureId) {
					const refreshResponse = await fetch(`/api/pictures/${pictureId}`);
					const refreshData = await refreshResponse.json();
					if (refreshData.success && refreshData.picture) {
						setPicture(refreshData.picture);
						setEditFormData(refreshData.picture);
					}
				} else if (picture?.PictureID) {
					// If we have PictureID but no pictureId param, fetch by ID
					const refreshResponse = await fetch(`/api/pictures/${picture.PictureID}`);
					const refreshData = await refreshResponse.json();
					if (refreshData.success && refreshData.picture) {
						setPicture(refreshData.picture);
						setEditFormData(refreshData.picture);
					}
				} else {
					// Update local state with edited data
					setPicture(prev => prev ? { ...prev, ...editFormData } : null);
				}
				setTimeout(() => setSuccessMessage(null), 3000);
			} else {
				setError(data.message || "Failed to update picture");
			}
		} catch (err) {
			console.error("Error updating picture:", err);
			setError("Error updating picture. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	// Handle delete
	const handleDelete = async () => {
		if (!picture?.PictureID) {
			setError("Picture ID is missing");
			return;
		}

		try {
			setDeleting(true);
			setError(null);
			setSuccessMessage(null);

			const response = await fetch(`/api/pictures/delete?pictureId=${picture.PictureID}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			const data = await response.json();

			if (data.success) {
				setSuccessMessage("Picture deleted successfully");
				setShowDeleteConfirm(false);
				// Redirect to pictures listing page after a short delay
				setTimeout(() => {
					router.push('/dashboard/pictures');
				}, 1500);
			} else {
				setError(data.message || "Failed to delete picture");
				setShowDeleteConfirm(false);
			}
		} catch (err) {
			console.error("Error deleting picture:", err);
			setError("Error deleting picture. Please try again.");
			setShowDeleteConfirm(false);
		} finally {
			setDeleting(false);
		}
	};

	if (loading || accessLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center space-x-4">
					<Link
						href="/dashboard/pictures"
						className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Pictures
					</Link>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading picture...</span>
				</div>
			</div>
		);
	}

	if (error || !picture) {
		return (
			<div className="space-y-6">
				<div className="flex items-center space-x-4">
					<Link
						href="/dashboard/pictures"
						className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Pictures
					</Link>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<ImageIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
					<p className="text-red-600">{error || "Picture not found"}</p>
				</div>
			</div>
		);
	}

	const imageUrl = getImageUrl(picture.FilePath);

	return (
		<div className="space-y-6">
			{/* Back Button and Action Buttons */}
			<div className="flex items-center justify-between">
				<Link
					href="/dashboard/pictures"
					className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Pictures
				</Link>
				
				{/* Action Buttons */}
				{!isEditMode && (
					<div className="flex items-center gap-3">
						<button
							onClick={handleEdit}
							className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#0b4d2b] rounded-lg hover:bg-[#0a4226] transition-colors"
						>
							<Edit className="h-4 w-4 mr-2" />
							Edit
						</button>
						{canDelete && (
							<button
								onClick={() => setShowDeleteConfirm(true)}
								className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
							>
								<Trash2 className="h-4 w-4 mr-2" />
								Delete
							</button>
						)}
					</div>
				)}
				
				{isEditMode && (
					<div className="flex items-center gap-3">
						<button
							onClick={handleCancelEdit}
							disabled={saving}
							className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<X className="h-4 w-4 mr-2" />
							Cancel
						</button>
						<button
							onClick={handleUpdate}
							disabled={saving}
							className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#0b4d2b] rounded-lg hover:bg-[#0a4226] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{saving ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Save className="h-4 w-4 mr-2" />
									Update
								</>
							)}
						</button>
					</div>
				)}
			</div>

			{/* Success Message */}
			{successMessage && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
					<div className="flex items-center">
						<CheckCircle className="h-5 w-5 text-green-600 mr-3" />
						<p className="text-green-800 font-medium">{successMessage}</p>
					</div>
					<button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800 transition-colors">
						<X className="h-5 w-5" />
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
					<button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 transition-colors">
						<X className="h-5 w-5" />
					</button>
				</div>
			)}

			{/* Picture Detail Card */}
			<div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
				{/* Image Section */}
				<div className="relative w-full bg-gradient-to-br from-gray-50 to-gray-100" style={{ minHeight: '500px' }}>
					{imageUrl ? (
						<Image
							src={imageUrl}
							alt={picture.FileName || "Picture"}
							fill
							className="object-contain"
							unoptimized
							onError={(e) => {
								console.log("Image load error for:", picture.FilePath);
							}}
						/>
					) : (
						<div className="flex items-center justify-center h-full min-h-[500px]">
							<ImageIcon className="h-24 w-24 text-gray-400" />
						</div>
					)}
					
					{/* Download Button Overlay */}
					<div className="absolute top-4 right-4">
						<button
							onClick={handleDownload}
							className="inline-flex items-center px-4 py-2 bg-white/90 hover:bg-white text-gray-900 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
						>
							<Download className="h-4 w-4 mr-2" />
							Download
						</button>
					</div>
				</div>

				{/* Information Section */}
				<div className="p-8">
					<div className="mb-6">
						{isEditMode ? (
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">File Name *</label>
									<input
										type="text"
										value={editFormData.FileName || ''}
										onChange={(e) => handleFieldChange('FileName', e.target.value)}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
										required
									/>
								</div>
							</div>
						) : (
							<>
								<h1 className="text-3xl font-bold text-gray-900 mb-2">
									{picture.FileName || "Untitled Picture"}
								</h1>
								<div className="h-1 w-20 bg-gradient-to-r from-[#0b4d2b] to-[#0a3d24] rounded-full"></div>
							</>
						)}
					</div>

					{/* Information Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{/* Group Name */}
						<div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-4">
							<div className="flex items-center mb-2">
								<div className="p-2 bg-blue-500 rounded-lg mr-3">
									<Folder className="h-5 w-5 text-white" />
								</div>
								<p className="text-xs font-medium text-gray-600">Group / Event</p>
							</div>
							{isEditMode ? (
								<input
									type="text"
									value={editFormData.GroupName || ''}
									onChange={(e) => handleFieldChange('GroupName', e.target.value)}
									className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									placeholder="Enter group name"
								/>
							) : (
								<p className="text-sm font-semibold text-gray-900">{picture.GroupName || 'N/A'}</p>
							)}
						</div>

						{/* Main Category */}
						<div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 p-4">
							<div className="flex items-center mb-2">
								<div className="p-2 bg-green-500 rounded-lg mr-3">
									<Folder className="h-5 w-5 text-white" />
								</div>
								<p className="text-xs font-medium text-gray-600">Main Category</p>
							</div>
							{isEditMode ? (
								<input
									type="text"
									value={editFormData.MainCategory || ''}
									onChange={(e) => handleFieldChange('MainCategory', e.target.value)}
									className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									placeholder="Enter main category"
								/>
							) : (
								<p className="text-sm font-semibold text-gray-900">{picture.MainCategory || 'N/A'}</p>
							)}
						</div>

						{/* Sub Category */}
						<div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 p-4">
							<div className="flex items-center mb-2">
								<div className="p-2 bg-purple-500 rounded-lg mr-3">
									<Folder className="h-5 w-5 text-white" />
								</div>
								<p className="text-xs font-medium text-gray-600">Sub Category</p>
							</div>
							{isEditMode ? (
								<input
									type="text"
									value={editFormData.SubCategory || ''}
									onChange={(e) => handleFieldChange('SubCategory', e.target.value)}
									className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									placeholder="Enter sub category"
								/>
							) : (
								<p className="text-sm font-semibold text-gray-900">{picture.SubCategory || 'N/A'}</p>
							)}
						</div>

						{/* Event Date */}
						<div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200 p-4">
							<div className="flex items-center mb-2">
								<div className="p-2 bg-orange-500 rounded-lg mr-3">
									<Calendar className="h-5 w-5 text-white" />
								</div>
								<p className="text-xs font-medium text-gray-600">Event Date</p>
							</div>
							{isEditMode ? (
								<input
									type="date"
									value={formatDateForInput(editFormData.EventDate || null)}
									onChange={(e) => handleFieldChange('EventDate', e.target.value || null)}
									className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							) : (
								<p className="text-sm font-semibold text-gray-900">{formatDate(picture.EventDate)}</p>
							)}
						</div>

						{/* Uploaded By */}
						<div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200 p-4">
							<div className="flex items-center mb-2">
								<div className="p-2 bg-indigo-500 rounded-lg mr-3">
									<User className="h-5 w-5 text-white" />
								</div>
								<p className="text-xs font-medium text-gray-600">Uploaded By</p>
							</div>
							{isEditMode ? (
								<input
									type="text"
									value={editFormData.UploadedBy || ''}
									onChange={(e) => handleFieldChange('UploadedBy', e.target.value)}
									className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									placeholder="Enter uploaded by"
								/>
							) : (
								<p className="text-sm font-semibold text-gray-900">{picture.UploadedBy || 'N/A'}</p>
							)}
						</div>

						{/* Is Active */}
						<div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg border border-teal-200 p-4">
							<div className="flex items-center mb-2">
								<div className="p-2 bg-teal-500 rounded-lg mr-3">
									<CheckCircle className="h-5 w-5 text-white" />
								</div>
								<p className="text-xs font-medium text-gray-600">Is Active</p>
							</div>
							{isEditMode ? (
								<select
									value={editFormData.IsActive ? '1' : '0'}
									onChange={(e) => handleFieldChange('IsActive', e.target.value === '1')}
									className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								>
									<option value="1">Active</option>
									<option value="0">Inactive</option>
								</select>
							) : (
								<p className="text-sm font-semibold text-gray-900">
									{picture.IsActive ? 'Active' : 'Inactive'}
								</p>
							)}
						</div>

						{/* Upload Date (Read-only) */}
						{picture.UploadDate && (
							<div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg border border-pink-200 p-4">
								<div className="flex items-center mb-2">
									<div className="p-2 bg-pink-500 rounded-lg mr-3">
										<Clock className="h-5 w-5 text-white" />
									</div>
									<p className="text-xs font-medium text-gray-600">Upload Date</p>
								</div>
								<p className="text-sm font-semibold text-gray-900">{formatDate(picture.UploadDate)}</p>
							</div>
						)}

						{/* File Size (Read-only) */}
						{picture.FileSizeKB !== null && (
							<div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-4">
								<div className="flex items-center mb-2">
									<div className="p-2 bg-gray-500 rounded-lg mr-3">
										<FileText className="h-5 w-5 text-white" />
									</div>
									<p className="text-xs font-medium text-gray-600">File Size</p>
								</div>
								<p className="text-sm font-semibold text-gray-900">{formatFileSize(picture.FileSizeKB)}</p>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Delete Confirmation Modal */}
			{showDeleteConfirm && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
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

						<div className="p-6">
							<p className="text-gray-700 text-base mb-3 font-semibold">
								Are you sure you want to delete this picture?
							</p>
							<div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
								<p className="text-sm font-medium text-gray-500 mb-1">File Name:</p>
								<p className="text-base font-semibold text-gray-900">
									{picture.FileName || 'N/A'}
								</p>
								{picture.GroupName && (
									<>
										<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Group:</p>
										<p className="text-base text-gray-700">{picture.GroupName}</p>
									</>
								)}
								{picture.MainCategory && (
									<>
										<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Category:</p>
										<p className="text-base text-gray-700">
											{picture.MainCategory}
											{picture.SubCategory && ` - ${picture.SubCategory}`}
										</p>
									</>
								)}
							</div>
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start">
								<AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
								<p className="text-sm text-yellow-800">
									<strong>Warning:</strong> This will permanently delete this picture from the database and file system. This action cannot be undone.
								</p>
							</div>
						</div>

						<div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end space-x-3 border-t border-gray-200">
							<button
								onClick={() => setShowDeleteConfirm(false)}
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

export default function PictureViewPage() {
	return (
		<Suspense fallback={
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		}>
			<PictureViewContent />
		</Suspense>
	);
}

