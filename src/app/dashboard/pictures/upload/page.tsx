"use client";

import { useState, useEffect } from "react";
import { Upload, ArrowLeft, X, Check, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CategoryModal from "@/components/CategoryModal";
import SubCategoryModal from "@/components/SubCategoryModal";
import AccessDenied from "@/components/AccessDenied";
import { useAccess } from "@/hooks/useAccess";
import { useAuth } from "@/hooks/useAuth";
import { uploadMultipleToBlob, type BlobUploadResult } from "@/lib/uploads";

type UploadFormData = {
	groupName: string;
	mainCategory: string;
	subCategory: string;
	eventDate: string;
	uploadedBy: string;
};

type UploadedFile = {
	file: File;
	preview: string;
	id: string;
};

type Category = {
	MainCategoryID: number;
	Category: string;
};

type SubCategory = {
	SubCategoryID: number;
	MainCategoryID: number;
	SubCategory: string;
	MainCategoryName: string;
};

export default function UploadPicturesPage() {
	const router = useRouter();
	
	// Get user ID using useAuth hook (more reliable)
	const { user, getUserId, loading: authLoading } = useAuth();
	
	// Fallback function to get user ID directly from cookie if useAuth hasn't loaded yet
	const getUserIdFromCookie = (): string | null => {
		if (typeof window === 'undefined') return null;
		const authCookie = document.cookie
			.split("; ")
			.find((row) => row.startsWith("auth="))
			?.split("=")[1];
		if (authCookie && authCookie.startsWith("authenticated:")) {
			return decodeURIComponent(authCookie.split(":")[1]);
		}
		return null;
	};
	
	const userId = user?.id || user?.username || getUserId() || getUserIdFromCookie() || null;
	
	const { canUploadPictures, canManageCategories, canManageSubCategories, loading: accessLoading, error: accessError } = useAccess(userId);
	
	useEffect(() => {
		console.log('[Pictures Upload Page] Auth state:', { 
			userId, 
			user, 
			authLoading, 
			getUserId: getUserId(),
			canUploadPictures, 
			accessLoading, 
			accessError 
		});
	}, [userId, user, authLoading, canUploadPictures, accessLoading, accessError, getUserId]);

	// Set uploadedBy to username when user is loaded
	useEffect(() => {
		if (!authLoading && (user?.username || userId)) {
			// Prefer username from user object, fallback to userId (which could be username or email)
			const username = user?.username || userId;
			setFormData(prev => ({
				...prev,
				uploadedBy: username || ''
			}));
		}
	}, [user, userId, authLoading]);
	
	const [formData, setFormData] = useState<UploadFormData>({
		groupName: "",
		mainCategory: "",
		subCategory: "",
		eventDate: "",
		uploadedBy: ""
	});
	const [files, setFiles] = useState<UploadedFile[]>([]);
	const [uploading, setUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [currentFileUploading, setCurrentFileUploading] = useState<string>('');
	const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
	const [error, setError] = useState<string | null>(null);
	const [categories, setCategories] = useState<Category[]>([]);
	const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
	const [showCategoryModal, setShowCategoryModal] = useState(false);
	const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
	const [selectedMainCategoryID, setSelectedMainCategoryID] = useState<number | null>(null);

	useEffect(() => {
		fetchCategories();
	}, []);

	const fetchCategories = async () => {
		try {
			const response = await fetch('/api/pictures/categories');
			const data = await response.json();
			
			if (data.success) {
				setCategories(data.categories || []);
			}
		} catch (err) {
			console.error("Error fetching categories:", err);
		}
	};

	const handleCategorySelect = (category: string) => {
		const selectedCategory = categories.find(cat => cat.Category === category);
		setFormData(prev => ({
			...prev,
			mainCategory: category,
			subCategory: "" // Reset sub category when main category changes
		}));
		setSelectedMainCategoryID(selectedCategory?.MainCategoryID || null);
		setSubCategories([]); // Clear sub categories
	};

	const handleSubCategorySelect = (subCategory: string) => {
		setFormData(prev => ({
			...prev,
			subCategory: subCategory
		}));
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setFormData(prev => ({
			...prev,
			[name]: value
		}));

		// If main category changes, fetch sub categories
		if (name === 'mainCategory') {
			const selectedCategory = categories.find(cat => cat.Category === value);
			setSelectedMainCategoryID(selectedCategory?.MainCategoryID || null);
			setSubCategories([]); // Clear sub categories
			setFormData(prev => ({
				...prev,
				subCategory: "" // Reset sub category
			}));
			
			if (selectedCategory?.MainCategoryID) {
				fetchSubCategories(selectedCategory.MainCategoryID);
			}
		}
	};

	const fetchSubCategories = async (mainCategoryID: number) => {
		try {
			const response = await fetch(`/api/pictures/subcategories?mainCategoryID=${mainCategoryID}`);
			const data = await response.json();
			
			if (data.success) {
				setSubCategories(data.subCategories || []);
			}
		} catch (err) {
			console.error("Error fetching sub categories:", err);
		}
	};

	// Callback to refresh categories after modal operations
	const handleCategoryDataChange = () => {
		fetchCategories();
	};

	// Callback to refresh subcategories after modal operations
	const handleSubCategoryDataChange = () => {
		if (selectedMainCategoryID) {
			fetchSubCategories(selectedMainCategoryID);
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = Array.from(e.target.files || []);
		const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
		
		// Validate file sizes before adding (100MB limit)
		const maxSize = 100 * 1024 * 1024; // 100MB
		const invalidFiles = imageFiles.filter(file => file.size > maxSize);
		
		if (invalidFiles.length > 0) {
			const invalidFileNames = invalidFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`).join(', ');
			setError(`The following files exceed the 100MB limit: ${invalidFileNames}`);
			return;
		}
		
		const newFiles: UploadedFile[] = imageFiles.map(file => ({
			file,
			preview: URL.createObjectURL(file),
			id: Math.random().toString(36).substr(2, 9)
		}));

		setFiles(prev => [...prev, ...newFiles]);
		setError(null); // Clear any previous errors
	};

	const removeFile = (id: string) => {
		setFiles(prev => {
			const fileToRemove = prev.find(f => f.id === id);
			if (fileToRemove) {
				URL.revokeObjectURL(fileToRemove.preview);
			}
			return prev.filter(f => f.id !== id);
		});
	};

	const formatFileSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (files.length === 0) {
			setError("Please select at least one image to upload");
			return;
		}

		if (!formData.groupName || !formData.mainCategory || !formData.subCategory || !formData.eventDate || !formData.uploadedBy) {
			setError("Please fill in all required fields");
			return;
		}

		setUploading(true);
		setUploadStatus('uploading');
		setError(null);
		setUploadProgress(0);

		try {
			console.log('Starting direct Vercel Blob upload for', files.length, 'picture files');
			
			// Step 1: Upload files directly to Vercel Blob
			const fileObjects = files.map(f => f.file);
			let uploadedBlobs: BlobUploadResult[] = [];

			try {
				uploadedBlobs = await uploadMultipleToBlob(
					fileObjects,
					'pictures',
					(fileIndex, fileName, progress) => {
						setCurrentFileUploading(`${fileName} (${progress.percentage}%)`);
						// Calculate overall progress
						const overallProgress = Math.round(
							((fileIndex + (progress.percentage / 100)) / files.length) * 80
						); // Reserve 20% for metadata save
						setUploadProgress(overallProgress);
					}
				);
				console.log('All pictures uploaded to Vercel Blob:', uploadedBlobs);
			} catch (uploadError) {
				console.error('Blob upload error:', uploadError);
				throw uploadError;
			}

			setCurrentFileUploading('Saving metadata...');
			setUploadProgress(85);

			// Step 2: Save metadata to database
			const response = await fetch('/api/pictures/save-metadata', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					groupName: formData.groupName,
					mainCategory: formData.mainCategory,
					subCategory: formData.subCategory,
					eventDate: formData.eventDate,
					uploadedBy: formData.uploadedBy,
					files: uploadedBlobs
				}),
			});

			const result = await response.json();

			if (result.success) {
				console.log('Metadata saved successfully:', result);
				setUploadStatus('success');
				setUploadProgress(100);
				setCurrentFileUploading('');
				
				// Redirect to pictures page after 2 seconds
				setTimeout(() => {
					router.push('/dashboard/pictures');
				}, 2000);
			} else {
				throw new Error(result.message || 'Failed to save picture metadata');
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error';
			setError(`Upload failed: ${errorMessage}`);
			setUploadStatus('error');
			console.error('Submit error:', err);
		} finally {
			setUploading(false);
			setCurrentFileUploading('');
		}
	};

	const resetForm = () => {
		setFormData({
			groupName: "",
			mainCategory: "",
			subCategory: "",
			eventDate: "",
			uploadedBy: ""
		});
		setFiles([]);
		setError(null);
		setUploadStatus('idle');
		setUploadProgress(0);
	};

	// Show loading state while checking auth or access
	if (authLoading || accessLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">Upload Pictures</h1>
						<p className="text-gray-600 mt-2">Checking permissions...</p>
					</div>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		);
	}
	
	// Show error if no user ID is found
	if (!userId && !authLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">Upload Pictures</h1>
						<p className="text-gray-600 mt-2">Upload new pictures to the system</p>
					</div>
					<Link
						href="/dashboard/pictures"
						className="inline-flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Pictures
					</Link>
				</div>
				<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
					<p className="text-sm text-yellow-800">
						<strong>Authentication Required:</strong> Please log in to upload pictures.
					</p>
					<p className="text-xs text-yellow-700 mt-2">
						Debug: User ID not found. Cookie: {typeof window !== 'undefined' ? document.cookie : 'N/A'}
					</p>
				</div>
				<AccessDenied 
					action="upload pictures" 
					customMessage="You must be logged in to upload pictures. Please log in and try again."
				/>
			</div>
		);
	}

	// Show access denied if user doesn't have upload permission
	if (!canUploadPictures) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">Upload Pictures</h1>
						<p className="text-gray-600 mt-2">Upload new pictures to the system</p>
					</div>
					<Link
						href="/dashboard/pictures"
						className="inline-flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Pictures
					</Link>
				</div>
				{accessError && (
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
						<p className="text-sm text-yellow-800">
							<strong>Debug Info:</strong> {accessError}
							{userId && <span className="block mt-1">User ID: {userId}</span>}
						</p>
					</div>
				)}
				<AccessDenied 
					action="upload pictures" 
					customMessage="This action requires Admin access or Upload Pictures permission. Please contact your administrator if you believe this is an error."
				/>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Upload Pictures</h1>
					<p className="text-gray-600 mt-2">Upload new pictures to the system</p>
				</div>
				<Link
					href="/dashboard/pictures"
					className="inline-flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Pictures
				</Link>
			</div>

			{/* Upload Form */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
				<div className="p-6">
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Form Fields */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Event Name <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="groupName"
									value={formData.groupName}
									onChange={handleInputChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
									placeholder="Enter event name"
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Main Category <span className="text-red-500">*</span>
								</label>
								<div className="flex items-center space-x-2">
									<select
										name="mainCategory"
										value={formData.mainCategory}
										onChange={handleInputChange}
										className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
										required
									>
										<option value="">Select Main Category</option>
										{categories.map((category) => (
											<option key={category.MainCategoryID} value={category.Category}>
												{category.Category}
											</option>
										))}
									</select>
									{canManageCategories && (
										<button
											type="button"
											onClick={() => setShowCategoryModal(true)}
											className="px-3 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors flex items-center whitespace-nowrap"
											title="Manage Categories"
										>
											<Plus className="h-4 w-4 mr-1" />
											<span className="text-sm">Main Category</span>
										</button>
									)}
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Sub Category <span className="text-red-500">*</span>
								</label>
								<div className="flex items-center space-x-2">
									<select
										name="subCategory"
										value={formData.subCategory}
										onChange={handleInputChange}
										className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
										required
										disabled={!selectedMainCategoryID}
									>
										<option value="">
											{!selectedMainCategoryID ? "Select Main Category first" : "Select Sub Category"}
										</option>
										{subCategories.map((subCategory) => (
											<option key={subCategory.SubCategoryID} value={subCategory.SubCategory}>
												{subCategory.SubCategory}
											</option>
										))}
									</select>
									{canManageSubCategories && (
										<button
											type="button"
											onClick={() => setShowSubCategoryModal(true)}
											disabled={!selectedMainCategoryID}
											className="px-3 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center whitespace-nowrap"
											title="Manage Sub Categories"
										>
											<Plus className="h-4 w-4 mr-1" />
											<span className="text-sm">Sub Category +</span>
										</button>
									)}
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Event Date <span className="text-red-500">*</span>
								</label>
								<input
									type="date"
									name="eventDate"
									value={formData.eventDate}
									onChange={handleInputChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
									required
								/>
							</div>

							<div className="md:col-span-2">
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Uploaded By <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="uploadedBy"
									value={formData.uploadedBy}
									readOnly
									className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed outline-none"
									placeholder="Username will be auto-filled"
									required
								/>
							</div>
						</div>

						{/* File Upload */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Select Pictures <span className="text-red-500">*</span>
							</label>
							<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#0b4d2b] transition-colors">
								<input
									type="file"
									multiple
									accept="image/*"
									onChange={handleFileChange}
									className="hidden"
									id="file-upload"
								/>
								<label
									htmlFor="file-upload"
									className="cursor-pointer flex flex-col items-center"
								>
									<Upload className="h-12 w-12 text-gray-400 mb-4" />
									<p className="text-lg font-medium text-gray-900 mb-2">
										Click to upload pictures
									</p>
									<p className="text-sm text-gray-500">
										PNG, JPG, JPEG, GIF, WEBP up to 100MB each
									</p>
								</label>
							</div>
						</div>

						{/* Selected Files Preview */}
						{files.length > 0 && (
							<div>
								<h3 className="text-sm font-medium text-gray-700 mb-3">
									Selected Pictures ({files.length})
								</h3>
								<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
									{files.map((fileObj) => (
										<div key={fileObj.id} className="relative group">
											<div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
												<img
													src={fileObj.preview}
													alt={fileObj.file.name}
													className="w-full h-full object-cover"
												/>
												<button
													type="button"
													onClick={() => removeFile(fileObj.id)}
													className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
												>
													<X className="h-3 w-3" />
												</button>
											</div>
											<p className="text-xs text-gray-600 mt-1 truncate">
												{fileObj.file.name}
											</p>
											<p className="text-xs text-gray-500">
												{formatFileSize(fileObj.file.size)}
											</p>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Upload Progress */}
						{uploading && (
							<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
								<div className="flex items-center justify-between mb-2">
									<div className="flex-1">
										<span className="text-sm font-medium text-blue-900">Uploading...</span>
										{currentFileUploading && (
											<p className="text-xs text-blue-700 mt-1">{currentFileUploading}</p>
										)}
									</div>
									<span className="text-sm font-semibold text-blue-700">{uploadProgress}%</span>
								</div>
								<div className="w-full bg-blue-200 rounded-full h-2">
									<div
										className="bg-blue-600 h-2 rounded-full transition-all duration-300"
										style={{ width: `${uploadProgress}%` }}
									></div>
								</div>
							</div>
						)}

						{/* Success Message */}
						{uploadStatus === 'success' && (
							<div className="bg-green-50 border border-green-200 rounded-lg p-4">
								<div className="flex items-center">
									<Check className="h-5 w-5 text-green-500 mr-2" />
									<span className="text-sm font-medium text-green-900">
										Pictures uploaded successfully! Redirecting...
									</span>
								</div>
							</div>
						)}

						{/* Error Message */}
						{error && (
							<div className="bg-red-50 border border-red-200 rounded-lg p-4">
								<div className="flex items-center">
									<X className="h-5 w-5 text-red-500 mr-2" />
									<span className="text-sm font-medium text-red-900">{error}</span>
								</div>
							</div>
						)}

						{/* Action Buttons */}
						<div className="flex items-center justify-end space-x-4">
							<button
								type="button"
								onClick={resetForm}
								className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
							>
								Reset
							</button>
							<button
								type="submit"
								disabled={uploading || files.length === 0}
								className="px-6 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{uploading ? 'Uploading...' : 'Upload Pictures'}
							</button>
						</div>
					</form>
				</div>
			</div>

			{/* Category Management Modal */}
			<CategoryModal
				isOpen={showCategoryModal}
				onClose={() => setShowCategoryModal(false)}
				onCategorySelect={handleCategorySelect}
				onDataChange={handleCategoryDataChange}
			/>

			{/* Sub Category Management Modal */}
			<SubCategoryModal
				isOpen={showSubCategoryModal}
				onClose={() => setShowSubCategoryModal(false)}
				onSubCategorySelect={handleSubCategorySelect}
				mainCategoryID={selectedMainCategoryID}
				mainCategoryName={formData.mainCategory}
				onDataChange={handleSubCategoryDataChange}
			/>
		</div>
	);
}
