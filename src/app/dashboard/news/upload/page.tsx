"use client";

import { useState, useEffect } from "react";
import { Newspaper, ArrowLeft, X, Check, Image as ImageIcon, User, AlertCircle, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { uploadToBlob } from "@/lib/uploads";

type NewsFormData = {
	title: string;
	newsDate: string;
	bodyText: string;
	imageUrl: string;
	imageCaption: string;
	isPublished: boolean;
};

export default function UploadNewsPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const newsId = searchParams.get('id');
	const isEditMode = !!newsId;
	
	const { user, userProfile, getUserId, loading: authLoading } = useAuth();
	const userId = user?.id || getUserId() || null;
	const username = userProfile?.full_name || user?.name || user?.username || "";
	
	const [formData, setFormData] = useState<NewsFormData>({
		title: "",
		newsDate: new Date().toISOString().split('T')[0], // Default to today
		bodyText: "",
		imageUrl: "",
		imageCaption: "",
		isPublished: true
	});
	
	const [submitting, setSubmitting] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [imagePreviewError, setImagePreviewError] = useState(false);
	const [uploadingImage, setUploadingImage] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);

	// Fetch existing news data for editing
	useEffect(() => {
		const fetchNewsData = async () => {
			if (!isEditMode || !newsId) return;

			try {
				setLoading(true);
				const response = await fetch(`/api/news?id=${newsId}`);
				
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				
				const data = await response.json();

				if (data.success && data.news) {
					const news = data.news;
					
					// Format news date for input (YYYY-MM-DD)
					let formattedDate = '';
					if (news.newsDate) {
						try {
							const date = new Date(news.newsDate);
							formattedDate = date.toISOString().split('T')[0];
						} catch (e) {
							console.error("Error formatting date:", e);
						}
					}
					
					setFormData({
						title: news.title || "",
						newsDate: formattedDate,
						bodyText: news.bodyText || "",
						imageUrl: news.imageUrl || "",
						imageCaption: news.imageCaption || "",
						isPublished: news.isPublished ?? true
					});
				} else {
					setError(data.message || "Failed to load news data");
				}
			} catch (err) {
				console.error("Error fetching news data:", err);
				setError("Error loading news data. Please try again.");
			} finally {
				setLoading(false);
			}
		};

		if (isEditMode) {
			fetchNewsData();
		}
	}, [isEditMode, newsId]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const { name, value, type } = e.target;
		
		if (type === 'checkbox') {
			const checked = (e.target as HTMLInputElement).checked;
			setFormData(prev => ({
				...prev,
				[name]: checked
			}));
		} else {
			setFormData(prev => ({
				...prev,
				[name]: value
			}));
			
			// Reset image preview error when URL changes
			if (name === 'imageUrl') {
				setImagePreviewError(false);
			}
		}
	};

	const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validate file type
		const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
		if (!validTypes.includes(file.type)) {
			setError('Please select a valid image file (JPG, PNG, GIF, WEBP)');
			e.target.value = ''; // Reset input
			return;
		}

		// Validate file size (10MB limit for images)
		const maxSize = 10 * 1024 * 1024; // 10MB
		if (file.size > maxSize) {
			setError(`Image is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 10MB.`);
			e.target.value = ''; // Reset input
			return;
		}

		setUploadingImage(true);
		setError(null);
		setUploadProgress(0);
		setImagePreviewError(false);

		try {
			console.log('[News Upload] Starting image upload:', file.name);
			
			const result = await uploadToBlob(file, 'news', (progress) => {
				setUploadProgress(progress.percentage);
			});

			console.log('[News Upload] Image uploaded successfully:', result.url);

			// Set the uploaded image URL
			setFormData(prev => ({
				...prev,
				imageUrl: result.url,
				imageCaption: formData.imageCaption || file.name.replace(/\.[^/.]+$/, '') // Use filename as caption if empty
			}));

			setUploadProgress(100);
			
			// Show brief success message
			setTimeout(() => {
				setUploadProgress(0);
			}, 2000);
		} catch (err) {
			console.error('[News Upload] Image upload error:', err);
			
			const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
			
			// Provide helpful error message based on error type
			if (errorMessage.includes('BLOB_READ_WRITE_TOKEN') || errorMessage.includes('not configured')) {
				setError(
					'⚠️ Upload Configuration Missing: ' +
					'The BLOB_READ_WRITE_TOKEN environment variable is not set. ' +
					'Please add it to .env.local for local development or to your Vercel project settings for production. ' +
					'You can paste an image URL instead as a workaround.'
				);
			} else if (errorMessage.includes('Failed to retrieve the client token')) {
				setError(
					'⚠️ Upload Service Error: ' +
					'Cannot connect to Vercel Blob storage. Please ensure BLOB_READ_WRITE_TOKEN is configured correctly. ' +
					'You can paste an image URL instead as a workaround.'
				);
			} else {
				setError(`Upload failed: ${errorMessage}`);
			}
		} finally {
			setUploadingImage(false);
			e.target.value = ''; // Reset input
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		// Client-side validation
		if (!formData.title || formData.title.length === 0) {
			setError("Please enter a news title");
			return;
		}
		
		if (formData.title.length > 500) {
			setError("Title must not exceed 500 characters");
			return;
		}
		
		if (!formData.newsDate) {
			setError("Please select a news date");
			return;
		}
		
		if (!formData.bodyText || formData.bodyText.length < 10) {
			setError("Body text must be at least 10 characters");
			return;
		}
		
		if (formData.imageCaption && formData.imageCaption.length > 255) {
			setError("Image caption must not exceed 255 characters");
			return;
		}
		
		// Enhanced user validation with debugging
		if (!userId || userId.trim() === '') {
			console.error('[News Upload] User ID is missing or empty:', { userId, user, userProfile });
			setError("User session not found. Please log in again.");
			return;
		}
		
		if (!username || username.trim() === '') {
			console.error('[News Upload] Username is missing or empty:', { username, user, userProfile });
			setError("User information not found. Please log in again.");
			return;
		}
		
		// Convert userId to number and validate
		const userIdNum = parseInt(userId, 10);
		if (isNaN(userIdNum) || userIdNum <= 0) {
			console.error('[News Upload] Invalid user ID:', { userId, userIdNum });
			setError("Invalid user ID. Please log in again.");
			return;
		}

		// Check for future date (warning only)
		const selectedDate = new Date(formData.newsDate);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		if (selectedDate > today) {
			const proceed = confirm("The news date is in the future. Do you want to continue?");
			if (!proceed) return;
		}

		setSubmitting(true);
		setError(null);

		try {
			const payload = {
				newsId: isEditMode ? parseInt(newsId!) : undefined,
				title: formData.title.trim(),
				newsDate: formData.newsDate,
				bodyText: formData.bodyText.trim(),
				imageUrl: formData.imageUrl?.trim() || null,
				imageCaption: formData.imageCaption?.trim() || null,
				postedByUserId: userIdNum,
				postedByName: username.trim(),
				isPublished: formData.isPublished
			};
			
			// Debug logging
			console.log('[News Upload] Submitting payload:', {
				...payload,
				bodyTextLength: payload.bodyText.length
			});

			const response = await fetch('/api/news/save', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			const result = await response.json();
			
			console.log('[News Upload] Server response:', result);

			if (result.success) {
				setSuccess(true);
				setTimeout(() => {
					router.push('/dashboard/news');
				}, 2000);
			} else {
				setError(result.message || (isEditMode ? 'Update failed' : 'Save failed'));
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error';
			setError(isEditMode 
				? `Update failed: ${errorMessage}` 
				: `Save failed: ${errorMessage}`
			);
			console.error('[News Upload] Submit error:', err);
		} finally {
			setSubmitting(false);
		}
	};

	const resetForm = () => {
		setFormData({
			title: "",
			newsDate: new Date().toISOString().split('T')[0],
			bodyText: "",
			imageUrl: "",
			imageCaption: "",
			isPublished: true
		});
		setError(null);
		setSuccess(false);
		setImagePreviewError(false);
	};

	// Show loading state while checking auth or loading news
	if (authLoading || loading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit News Article' : 'Upload News'}</h1>
					<p className="text-gray-600 mt-2">{loading ? 'Loading news data...' : 'Checking permissions...'}</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit News Article' : 'Upload News'}</h1>
					<p className="text-gray-600 mt-2">{isEditMode ? 'Update news article information' : 'Create and publish new news articles'}</p>
				</div>
				<Link
					href="/dashboard/news"
					className="inline-flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to News
				</Link>
			</div>

			{/* Current User Badge */}
			{username && (
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center">
					<User className="h-5 w-5 text-blue-600 mr-2" />
					<span className="text-sm text-blue-900">
						<strong>Posting as:</strong> {username}
					</span>
				</div>
			)}

			{/* Upload Form */}
			<div className="bg-white rounded-xl border border-gray-200 shadow-sm">
				<div className="p-6">
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* News Details Section */}
						<div>
							<h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
								News Details
							</h3>
							<div className="space-y-4">
								{/* Title */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Title <span className="text-red-500">*</span>
										<span className="text-xs text-gray-500 ml-2">
											({formData.title.length}/500)
										</span>
									</label>
									<input
										type="text"
										name="title"
										value={formData.title}
										onChange={handleInputChange}
										maxLength={500}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
										placeholder="Enter news title"
										required
									/>
								</div>

								{/* News Date */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										News Date <span className="text-red-500">*</span>
									</label>
									<input
										type="date"
										name="newsDate"
										value={formData.newsDate}
										onChange={handleInputChange}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
										required
									/>
								</div>
							</div>
						</div>

						{/* Content Section */}
						<div>
							<h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
								Content
							</h3>
							<div className="space-y-4">
								{/* Body Text */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Body Text <span className="text-red-500">*</span>
										<span className="text-xs text-gray-500 ml-2">
											(1 to 2 short paragraphs)
										</span>
									</label>
									<textarea
										name="bodyText"
										value={formData.bodyText}
										onChange={handleInputChange}
										rows={12}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none font-mono text-sm"
										placeholder="Enter the news article content. Use double line breaks for new paragraphs."
										required
									/>
									<p className="text-xs text-gray-500 mt-1">
										Tip: Use double line breaks (press Enter twice) to create separate paragraphs.
									</p>
								</div>

								{/* Image Upload */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Upload Image <span className="text-gray-500 text-xs">(Optional)</span>
									</label>
									<div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-[#0b4d2b] transition-colors">
										<input
											type="file"
											accept="image/jpeg,image/png,image/gif,image/webp,image/jpg"
											onChange={handleImageUpload}
											disabled={uploadingImage}
											className="hidden"
											id="image-upload"
										/>
										<label
											htmlFor="image-upload"
											className={`cursor-pointer flex flex-col items-center ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
										>
											<Upload className="h-8 w-8 text-gray-400 mb-2" />
											<p className="text-sm font-medium text-gray-900 mb-1">
												{uploadingImage ? 'Uploading...' : 'Click to upload image'}
											</p>
											<p className="text-xs text-gray-500">
												JPG, PNG, GIF, WEBP up to 10MB
											</p>
										</label>
									</div>
									
									{/* Upload Progress */}
									{uploadingImage && (
										<div className="mt-3">
											<div className="flex items-center justify-between mb-1">
												<span className="text-xs text-gray-600">Uploading image...</span>
												<span className="text-xs font-semibold text-[#0b4d2b]">{uploadProgress}%</span>
											</div>
											<div className="w-full bg-gray-200 rounded-full h-2">
												<div
													className="bg-[#0b4d2b] h-2 rounded-full transition-all duration-300"
													style={{ width: `${uploadProgress}%` }}
												></div>
											</div>
										</div>
									)}
								</div>

								{/* Image URL (Alternative) */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Or Enter Image URL <span className="text-gray-500 text-xs">(Optional)</span>
									</label>
									<input
										type="url"
										name="imageUrl"
										value={formData.imageUrl}
										onChange={handleInputChange}
										maxLength={500}
										disabled={uploadingImage}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
										placeholder="Paste image URL here"
									/>
									<p className="text-xs text-gray-500 mt-1">
										Upload an image above or paste an image URL here
									</p>
								</div>

								{/* Image Preview */}
								{formData.imageUrl && !imagePreviewError && (
									<div className="mt-3">
										<p className="text-sm font-medium text-gray-700 mb-2">Image Preview</p>
										<div className="max-w-md">
											<img
												src={formData.imageUrl}
												alt="Preview"
												className="w-full h-auto max-h-[200px] object-contain rounded-lg shadow-md border border-gray-200"
												onError={() => setImagePreviewError(true)}
											/>
										</div>
									</div>
								)}
								
								{formData.imageUrl && imagePreviewError && (
									<div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center">
										<AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
										<span className="text-sm text-yellow-800">Invalid image URL or image failed to load</span>
									</div>
								)}

								{/* Image Caption */}
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Image Caption <span className="text-gray-500 text-xs">(Optional)</span>
										<span className="text-xs text-gray-500 ml-2">
											({formData.imageCaption.length}/255)
										</span>
									</label>
									<input
										type="text"
										name="imageCaption"
										value={formData.imageCaption}
										onChange={handleInputChange}
										maxLength={255}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
										placeholder="Enter image caption (optional)"
									/>
								</div>
							</div>
						</div>

						{/* Publishing Options Section */}
						<div>
							<h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
								Publishing Options
							</h3>
							<div className="flex items-center">
								<input
									type="checkbox"
									name="isPublished"
									id="isPublished"
									checked={formData.isPublished}
									onChange={handleInputChange}
									className="h-4 w-4 text-[#0b4d2b] focus:ring-[#0b4d2b] border-gray-300 rounded"
								/>
								<label htmlFor="isPublished" className="ml-2 text-sm font-medium text-gray-700">
									Publish immediately
								</label>
							</div>
							<p className="text-xs text-gray-500 mt-1 ml-6">
								Uncheck to save as draft (not visible to public)
							</p>
						</div>

						{/* Success Message */}
						{success && (
							<div className="bg-green-50 border border-green-200 rounded-lg p-4">
								<div className="flex items-center">
									<Check className="h-5 w-5 text-green-500 mr-2" />
									<span className="text-sm font-medium text-green-900">
										News article {isEditMode ? 'updated' : 'created'} successfully! Redirecting...
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
						<div className="flex flex-col sm:flex-row items-center justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-4 border-t border-gray-200">
							<button
								type="button"
								onClick={resetForm}
								disabled={submitting}
								className="w-full sm:w-auto px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
							>
								Reset
							</button>
							<Link
								href="/dashboard/news"
								className="w-full sm:w-auto px-6 py-2 text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
							>
								Cancel
							</Link>
							<button
								type="submit"
								disabled={submitting}
								className="w-full sm:w-auto px-6 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
							>
								{submitting ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										{isEditMode ? 'Updating...' : 'Saving...'}
									</>
								) : (
									<>
										<Newspaper className="h-4 w-4 mr-2" />
										{isEditMode ? 'Update News' : 'Publish News'}
									</>
								)}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
