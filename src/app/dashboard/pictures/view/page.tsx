"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Folder, Image as ImageIcon, Download, User, FileText, Clock, Edit, Trash2, AlertCircle, Loader2, Upload } from "lucide-react";
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

	const { user, getUserId } = useAuth();
	const userId = user?.id || user?.username || getUserId() || null;
	const { isAdmin, accessEdit, accessDelete, canUploadPictures, loading: accessLoading } = useAccess(userId);

	const [picture, setPicture] = useState<PictureData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [deleteConfirm, setDeleteConfirm] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [success, setSuccess] = useState<string | null>(null);

	const getImageUrl = (filePath: string | null) => {
		if (!filePath) return '';
		
		// If already a full URL (from Blob Storage or external server), return as-is
		if (filePath.startsWith('https://') || filePath.startsWith('http://')) {
			return filePath;
		}
		
		// Normalize backslashes to forward slashes
		let normalizedPath = filePath.replace(/\\/g, '/');
		
		// Handle ~/ prefix (remove it)
		if (normalizedPath.startsWith('~/')) {
			normalizedPath = normalizedPath.replace('~/', '');
		}
		
		// Handle legacy formats (convert to lowercase)
		if (normalizedPath.startsWith('Uploads/Pictures/')) {
			normalizedPath = normalizedPath.replace('Uploads/Pictures/', 'uploads/pictures/');
		}
		
		// Ensure path starts with uploads/ for relative paths
		// But don't add if it already starts with uploads/
		if (!normalizedPath.startsWith('uploads/') && !normalizedPath.startsWith('/uploads/')) {
			// Only add prefix if it's not already a full path
			if (!normalizedPath.includes('/')) {
				normalizedPath = `uploads/pictures/${normalizedPath}`;
			} else {
				normalizedPath = `uploads/${normalizedPath}`;
			}
		}
		
		// Remove leading slash if present (we'll add it back for local, or use in GitHub URL)
		if (normalizedPath.startsWith('/')) {
			normalizedPath = normalizedPath.substring(1);
		}
		
		// For both local and production, use the current origin
		// Next.js automatically serves files from public/ folder at the root URL
		if (typeof window !== 'undefined') {
			const origin = window.location.origin;
			// Use current origin (works for both local and Vercel)
			// Files in public/uploads/ are accessible at /uploads/
			return `${origin}/${normalizedPath}`;
		}
		
		// For server-side or fallback, use relative path with leading slash
		return `/${normalizedPath}`;
	};

	// Try alternative paths if the main path fails (handle folder name mismatches)
	const getAlternativeImageUrls = (filePath: string | null): string[] => {
		if (!filePath) return [];
		
		const alternatives: string[] = [];
		const mainUrl = getImageUrl(filePath);
		alternatives.push(mainUrl);
		
		// Try replacing underscores with spaces in folder names
		if (filePath.includes('_')) {
			const altPath = filePath.replace(/_/g, ' ');
			alternatives.push(getImageUrl(altPath));
		}
		
		// Try replacing spaces with underscores
		if (filePath.includes(' ')) {
			const altPath = filePath.replace(/ /g, '_');
			alternatives.push(getImageUrl(altPath));
		}
		
		// Try adding "Consultative workshop" parent folder if Workshop is in path
		if (filePath.includes('Workshop/') && !filePath.includes('Consultative workshop')) {
			const altPath = filePath.replace('Workshop/', 'Workshop/Consultative workshop/');
			alternatives.push(getImageUrl(altPath));
			
			// Also try with spaces instead of underscores
			if (altPath.includes('_')) {
				const altPath2 = altPath.replace(/_/g, ' ');
				alternatives.push(getImageUrl(altPath2));
			}
		}
		
		// Try removing date folder (YYYY-MM-DD pattern) if present
		const dateFolderPattern = /\d{4}-\d{2}-\d{2}\//;
		if (dateFolderPattern.test(filePath)) {
			const altPath = filePath.replace(dateFolderPattern, '');
			alternatives.push(getImageUrl(altPath));
			
			// Also try with spaces
			if (altPath.includes('_')) {
				const altPath2 = altPath.replace(/_/g, ' ');
				alternatives.push(getImageUrl(altPath2));
			}
			
			// Try with Consultative workshop parent folder and no date folder
			if (altPath.includes('Workshop/') && !altPath.includes('Consultative workshop')) {
				const altPath3 = altPath.replace('Workshop/', 'Workshop/Consultative workshop/');
				alternatives.push(getImageUrl(altPath3));
				
				if (altPath3.includes('_')) {
					const altPath4 = altPath3.replace(/_/g, ' ');
					alternatives.push(getImageUrl(altPath4));
				}
			}
		}
		
		// Try production domain as fallback if on local
		if (typeof window !== 'undefined') {
			const origin = window.location.origin;
			// On local, try production domain as fallback
			if (!origin.includes('rif-ii.org') && !origin.includes('vercel.app')) {
				alternatives.push(getImageUrl(filePath).replace(origin, 'https://rif-ii-org.vercel.app'));
			}
		}
		
		// Remove duplicates
		return [...new Set(alternatives)];
	};

	useEffect(() => {
		const fetchPicture = async () => {
			if (!pictureId) {
				setError("Picture ID is required");
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				setError(null);
				
				const response = await fetch(`/api/pictures/${pictureId}`);
				const data = await response.json();

				if (data.success && data.picture) {
					console.log('[Picture View] Fetched picture:', data.picture);
					console.log('[Picture View] FilePath:', data.picture.FilePath);
					setPicture(data.picture);
				} else {
					setError(data.message || "Picture not found");
				}
			} catch (err) {
				setError("Error fetching picture");
				console.error("Error fetching picture:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchPicture();
	}, [pictureId]);

	// Debug logging - moved before conditional returns to follow Rules of Hooks
	useEffect(() => {
		if (picture) {
			const imageUrl = getImageUrl(picture.FilePath);
			const alternatives = getAlternativeImageUrls(picture.FilePath);
			console.log('[Picture View] Picture data:', picture);
			console.log('[Picture View] FilePath:', picture.FilePath);
			console.log('[Picture View] Constructed URL:', imageUrl);
			console.log('[Picture View] Alternative URLs:', alternatives);
			console.log('[Picture View] Current origin:', typeof window !== 'undefined' ? window.location.origin : 'server-side');
		}
	}, [picture]);

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

	const handleDelete = async () => {
		if (!picture?.PictureID) return;

		try {
			setDeleting(true);
			const response = await fetch(`/api/pictures/delete?pictureId=${picture.PictureID}`, {
				method: 'DELETE'
			});
			
			const data = await response.json();
			
			if (data.success) {
				setSuccess('Picture deleted successfully');
				setDeleteConfirm(false);
				// Redirect to pictures page after 2 seconds
				setTimeout(() => {
					router.push('/dashboard/pictures');
				}, 2000);
			} else {
				setError(data.message || "Failed to delete picture");
				setDeleteConfirm(false);
			}
		} catch (err) {
			console.error("Error deleting picture:", err);
			setError("Error deleting picture");
			setDeleteConfirm(false);
		} finally {
			setDeleting(false);
		}
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center space-x-4">
					<Link
						href="/dashboard"
						className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Dashboard
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
						href="/dashboard"
						className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Dashboard
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
			{/* Success Message */}
			{success && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between animate-in slide-in-from-top">
					<div className="flex items-center">
						<AlertCircle className="h-5 w-5 text-green-600 mr-3" />
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

			{/* Back Button */}
			<div className="flex items-center justify-between">
				<Link
					href="/dashboard/pictures"
					className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Pictures
				</Link>
				
				{/* Action Buttons */}
				<div className="flex items-center space-x-3">
					<Link
						href="/dashboard/pictures/upload"
						className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#0b4d2b] rounded-lg hover:bg-[#0a3d24] transition-colors"
					>
						<Upload className="h-4 w-4 mr-2" />
						Upload Pictures
					</Link>
					{(accessEdit || accessDelete || isAdmin) && (
						<>
							{accessEdit && (
								<Link
									href={`/dashboard/pictures/upload?edit=${picture?.PictureID}`}
									className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
								>
									<Edit className="h-4 w-4 mr-2" />
									Update
								</Link>
							)}
							{accessDelete && (
								<button
									onClick={() => setDeleteConfirm(true)}
									className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
								>
									<Trash2 className="h-4 w-4 mr-2" />
									Delete
								</button>
							)}
						</>
					)}
				</div>
			</div>

			{/* Picture Detail Card */}
			<div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
				{/* Image Section */}
				<div className="relative w-full bg-gradient-to-br from-gray-50 to-gray-100" style={{ minHeight: '500px' }}>
					{imageUrl && imageUrl !== '' ? (
						<>
							<Image
								src={imageUrl}
								alt={picture.FileName || "Picture"}
								fill
								className="object-contain"
								unoptimized
								priority
								onError={(e) => {
									try {
										const target = (e.target || e.currentTarget) as HTMLImageElement;
										if (target) {
											// Try alternative URLs
											const alternativeUrls = getAlternativeImageUrls(picture.FilePath);
											const currentIndex = alternativeUrls.indexOf(target.src);
											
											if (currentIndex < alternativeUrls.length - 1) {
												// Try next alternative URL
												target.src = alternativeUrls[currentIndex + 1];
												return;
											}
											
											// All alternatives failed, show error
											target.style.display = 'none';
											const errorDiv = target.parentElement?.querySelector('.image-error');
											if (errorDiv) {
												errorDiv.classList.remove('hidden');
											}
										}
									} catch (error) {
										console.error('Error in image error handler:', error);
									}
								}}
								onLoad={() => {
									console.log('Image loaded successfully:', imageUrl);
								}}
							/>
							<div className="image-error hidden absolute inset-0 flex flex-col items-center justify-center bg-gray-100 p-4 overflow-auto">
								<ImageIcon className="h-24 w-24 text-gray-400 mb-4" />
								<p className="text-sm font-medium text-gray-700 mb-2">Failed to load image</p>
								<div className="text-xs text-gray-500 text-center max-w-md space-y-1 mb-3">
									<p><strong>Database Path:</strong> {picture.FilePath}</p>
									<p><strong>File Name:</strong> {picture.FileName || 'N/A'}</p>
									<p><strong>Last Tried URL:</strong> {imageUrl}</p>
									{typeof window !== 'undefined' && (
										<p><strong>Current Origin:</strong> {window.location.origin}</p>
									)}
								</div>
								<div className="text-xs text-gray-400 text-center max-w-md p-3 bg-yellow-50 rounded border border-yellow-200">
									<p className="font-medium text-yellow-800 mb-2">Possible Issues:</p>
									<ul className="text-left space-y-1 text-yellow-700 mb-2">
										<li>• File may not exist at this path</li>
										<li>• Folder names may have spaces instead of underscores</li>
										<li>• File may have been moved or deleted</li>
										<li>• On Vercel: Files must be in <code className="bg-yellow-100 px-1 rounded">public/</code> folder</li>
										<li>• Check browser console for detailed error messages</li>
									</ul>
									<p className="text-yellow-600 text-xs mt-2">
										Try accessing the file directly: <br/>
										<a href={imageUrl} target="_blank" rel="noopener noreferrer" className="underline break-all">
											{imageUrl}
										</a>
									</p>
								</div>
							</div>
						</>
					) : (
						<div className="flex flex-col items-center justify-center h-full min-h-[500px] p-4">
							<ImageIcon className="h-24 w-24 text-gray-400 mb-4" />
							<p className="text-sm font-medium text-gray-700 mb-2">No image URL available</p>
							{picture.FilePath && (
								<div className="text-xs text-gray-500 text-center max-w-md">
									<p className="mb-1">File Path: {picture.FilePath}</p>
									{picture.FileName && (
										<p>File Name: {picture.FileName}</p>
									)}
								</div>
							)}
						</div>
					)}
					
					{/* Action Buttons Overlay */}
					<div className="absolute top-4 right-4 flex items-center space-x-2">
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
						<h1 className="text-3xl font-bold text-gray-900 mb-2">
							{picture.FileName || "Untitled Picture"}
						</h1>
						<div className="h-1 w-20 bg-gradient-to-r from-[#0b4d2b] to-[#0a3d24] rounded-full"></div>
					</div>

					{/* Information Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Group Name */}
						{picture.GroupName && (
							<div className="flex items-start space-x-3 p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
								<div className="p-2 bg-blue-500 rounded-lg">
									<Folder className="h-5 w-5 text-white" />
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium text-gray-600 mb-1">Group / Event</p>
									<p className="text-lg font-semibold text-gray-900">{picture.GroupName}</p>
								</div>
							</div>
						)}

						{/* Main Category */}
						{picture.MainCategory && (
							<div className="flex items-start space-x-3 p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
								<div className="p-2 bg-green-500 rounded-lg">
									<Folder className="h-5 w-5 text-white" />
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium text-gray-600 mb-1">Main Category</p>
									<p className="text-lg font-semibold text-gray-900">{picture.MainCategory}</p>
								</div>
							</div>
						)}

						{/* Sub Category */}
						{picture.SubCategory && (
							<div className="flex items-start space-x-3 p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
								<div className="p-2 bg-purple-500 rounded-lg">
									<Folder className="h-5 w-5 text-white" />
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium text-gray-600 mb-1">Sub Category</p>
									<p className="text-lg font-semibold text-gray-900">{picture.SubCategory}</p>
								</div>
							</div>
						)}

						{/* Event Date */}
						{picture.EventDate && (
							<div className="flex items-start space-x-3 p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
								<div className="p-2 bg-orange-500 rounded-lg">
									<Calendar className="h-5 w-5 text-white" />
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium text-gray-600 mb-1">Event Date</p>
									<p className="text-lg font-semibold text-gray-900">{formatDate(picture.EventDate)}</p>
								</div>
							</div>
						)}

						{/* Uploaded By */}
						{picture.UploadedBy && (
							<div className="flex items-start space-x-3 p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200">
								<div className="p-2 bg-indigo-500 rounded-lg">
									<User className="h-5 w-5 text-white" />
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium text-gray-600 mb-1">Uploaded By</p>
									<p className="text-lg font-semibold text-gray-900">{picture.UploadedBy}</p>
								</div>
							</div>
						)}

						{/* Upload Date */}
						{picture.UploadDate && (
							<div className="flex items-start space-x-3 p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg border border-pink-200">
								<div className="p-2 bg-pink-500 rounded-lg">
									<Clock className="h-5 w-5 text-white" />
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium text-gray-600 mb-1">Upload Date</p>
									<p className="text-lg font-semibold text-gray-900">{formatDate(picture.UploadDate)}</p>
								</div>
							</div>
						)}

						{/* File Size */}
						<div className="flex items-start space-x-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
							<div className="p-2 bg-gray-500 rounded-lg">
								<FileText className="h-5 w-5 text-white" />
							</div>
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-600 mb-1">File Size</p>
								<p className="text-lg font-semibold text-gray-900">{formatFileSize(picture.FileSizeKB)}</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Delete Confirmation Modal */}
			{deleteConfirm && (
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
									{picture?.FilePath && (
										<div className="mb-3">
											<img
												src={getImageUrl(picture.FilePath)}
												alt={picture.FileName || "Picture"}
												className="w-full h-32 object-cover rounded-lg"
											/>
										</div>
									)}
									<p className="text-sm font-medium text-gray-500 mb-1">File Name:</p>
									<p className="text-base font-semibold text-gray-900">
										{picture?.FileName || "N/A"}
									</p>
									{picture?.GroupName && (
										<>
											<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Event:</p>
											<p className="text-base text-gray-700">{picture.GroupName}</p>
										</>
									)}
									{picture?.MainCategory && (
										<>
											<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Category:</p>
											<p className="text-base text-gray-700">
												{picture.MainCategory}
												{picture.SubCategory && ` - ${picture.SubCategory}`}
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
								onClick={() => setDeleteConfirm(false)}
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

