"use client";

import { useState, useEffect } from "react";
import { Upload, ArrowLeft, X, Check, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AccessDenied from "@/components/AccessDenied";
import { useAccess } from "@/hooks/useAccess";
import { useAuth } from "@/hooks/useAuth";
import ReportMainCategoryModal from "@/components/ReportMainCategoryModal";
import ReportSubCategoryModal from "@/components/ReportSubCategoryModal";

type UploadFormData = {
	reportTitle: string;
	description: string;
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

export default function UploadReportsPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const reportId = searchParams.get('id');
	const isEditMode = !!reportId;
	
	// Get user ID using useAuth hook (more reliable)
	const { user, userProfile, getUserId, loading: authLoading } = useAuth();
	const userId = user?.id || user?.username || getUserId() || null;
	
	const { canUpload, loading: accessLoading, error: accessError } = useAccess(userId);
	
	const [formData, setFormData] = useState<UploadFormData>({
		reportTitle: "",
		description: "",
		mainCategory: "",
		subCategory: "",
		eventDate: "",
		uploadedBy: ""
	});
	const [files, setFiles] = useState<UploadedFile[]>([]);
	const [uploading, setUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
	const [error, setError] = useState<string | null>(null);
	const [mainCategories, setMainCategories] = useState<Array<{ MainCategoryID: number; Category: string }>>([]);
	const [subCategories, setSubCategories] = useState<Array<{ SubCategoryID: number; MainCategoryID: number; SubCategory: string }>>([]);
	const [selectedMainCategoryID, setSelectedMainCategoryID] = useState<number | null>(null);
	const [loadingCategories, setLoadingCategories] = useState(false);
	const [loadingReport, setLoadingReport] = useState(false);
	const [showMainCategoryModal, setShowMainCategoryModal] = useState(false);
	const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);

	// Fetch sub categories when main category changes
	const fetchSubCategories = async (mainCategoryID: number) => {
		try {
			setLoadingCategories(true);
			const response = await fetch(`/api/reports/subcategories?mainCategoryID=${mainCategoryID}`);
			const data = await response.json();
			
			if (data.success) {
				setSubCategories(data.subCategories || []);
			} else {
				setSubCategories([]);
			}
		} catch (err) {
			console.error("Error fetching sub categories:", err);
			setSubCategories([]);
		} finally {
			setLoadingCategories(false);
		}
	};

	useEffect(() => {
		console.log('[Upload Page] Access check result:', { canUpload, accessLoading, accessError, userId });
	}, [canUpload, accessLoading, accessError, userId]);

	// Auto-populate "Uploaded By" with user's full name
	useEffect(() => {
		if (userProfile?.full_name || user?.name) {
			const fullName = userProfile?.full_name || user?.name || '';
			setFormData(prev => ({
				...prev,
				uploadedBy: fullName
			}));
		}
	}, [userProfile, user]);

	// Fetch existing report data for editing
	useEffect(() => {
		const fetchReportData = async () => {
			if (!isEditMode || !reportId) return;

			try {
				setLoadingReport(true);
				const response = await fetch(`/api/reports/${reportId}`);
				
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				
				const contentType = response.headers.get("content-type");
				if (!contentType || !contentType.includes("application/json")) {
					throw new Error("Server returned non-JSON response");
				}
				
				const data = await response.json();

				if (data.success && data.report) {
					const report = data.report;
					
					// Format event date for input (YYYY-MM-DD)
					let formattedDate = '';
					if (report.EventDate) {
						try {
							const date = new Date(report.EventDate);
							formattedDate = date.toISOString().split('T')[0];
						} catch (e) {
							console.error("Error formatting date:", e);
						}
					}
					
					// Populate form with existing data
					setFormData({
						reportTitle: report.ReportTitle || "",
						description: report.Description || "",
						mainCategory: report.MainCategory || "",
						subCategory: report.SubCategory || "",
						eventDate: formattedDate,
						uploadedBy: userProfile?.full_name || user?.name || ""
					});

					// Find and set the main category ID to load sub categories
					// Wait a bit for mainCategories to be populated if they're still loading
					if (report.MainCategory) {
						// Try to find immediately
						let selectedCategory = mainCategories.find(cat => cat.Category === report.MainCategory);
						
						// If not found and mainCategories might still be loading, wait a moment
						if (!selectedCategory && mainCategories.length === 0) {
							// Wait for mainCategories to load
							setTimeout(() => {
								selectedCategory = mainCategories.find(cat => cat.Category === report.MainCategory);
								if (selectedCategory) {
									setSelectedMainCategoryID(selectedCategory.MainCategoryID);
									fetchSubCategories(selectedCategory.MainCategoryID);
								}
							}, 500);
						} else if (selectedCategory) {
							setSelectedMainCategoryID(selectedCategory.MainCategoryID);
							// Fetch sub categories for the selected main category
							fetchSubCategories(selectedCategory.MainCategoryID);
						}
					}
				} else {
					setError(data.message || "Failed to load report data");
				}
			} catch (err) {
				console.error("Error fetching report data:", err);
				setError("Error loading report data. Please try again.");
			} finally {
				setLoadingReport(false);
			}
		};

		// Fetch report data when in edit mode
		if (isEditMode) {
			fetchReportData();
		}
	}, [isEditMode, reportId, userProfile, user]);
	
	// Update sub categories when main category is set and mainCategories are loaded
	useEffect(() => {
		if (isEditMode && formData.mainCategory && mainCategories.length > 0 && !subCategories.length) {
			const selectedCategory = mainCategories.find(cat => cat.Category === formData.mainCategory);
			if (selectedCategory && selectedCategory.MainCategoryID !== selectedMainCategoryID) {
				setSelectedMainCategoryID(selectedCategory.MainCategoryID);
				fetchSubCategories(selectedCategory.MainCategoryID);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [formData.mainCategory, mainCategories, isEditMode, selectedMainCategoryID]);

	// Fetch main categories
	const fetchMainCategories = async () => {
		try {
			setLoadingCategories(true);
			const response = await fetch('/api/reports/categories');
			const data = await response.json();
			
			if (data.success) {
				setMainCategories(data.categories || []);
			}
		} catch (err) {
			console.error("Error fetching main categories:", err);
		} finally {
			setLoadingCategories(false);
		}
	};

	// Fetch main categories on component mount
	useEffect(() => {
		fetchMainCategories();
	}, []);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
		const { name, value } = e.target;
		
		// If main category changes, fetch sub categories
		if (name === 'mainCategory') {
			const selectedCategory = mainCategories.find(cat => cat.Category === value);
			setSelectedMainCategoryID(selectedCategory?.MainCategoryID || null);
			setSubCategories([]); // Clear sub categories
			setFormData(prev => ({
				...prev,
				mainCategory: value,
				subCategory: "" // Reset sub category
			}));
			
			if (selectedCategory?.MainCategoryID) {
				fetchSubCategories(selectedCategory.MainCategoryID);
			}
		} else {
			setFormData(prev => ({
				...prev,
				[name]: value
			}));
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = Array.from(e.target.files || []);
		const documentFiles = selectedFiles.filter(file => 
			file.type.includes('pdf') || 
			file.type.includes('document') || 
			file.type.includes('spreadsheet') || 
			file.type.includes('presentation') ||
			file.name.endsWith('.pdf') ||
			file.name.endsWith('.doc') ||
			file.name.endsWith('.docx') ||
			file.name.endsWith('.xls') ||
			file.name.endsWith('.xlsx') ||
			file.name.endsWith('.ppt') ||
			file.name.endsWith('.pptx')
		);
		
		const newFiles: UploadedFile[] = documentFiles.map(file => ({
			file,
			preview: URL.createObjectURL(file),
			id: Math.random().toString(36).substr(2, 9)
		}));

		setFiles(prev => [...prev, ...newFiles]);
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

	const getFileIcon = (fileName: string) => {
		const extension = fileName.split('.').pop()?.toLowerCase();
		if (extension === 'pdf') return '📄';
		if (['doc', 'docx'].includes(extension || '')) return '📝';
		if (['xls', 'xlsx'].includes(extension || '')) return '📊';
		if (['ppt', 'pptx'].includes(extension || '')) return '📋';
		return '📄';
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		// File upload is optional in edit mode
		if (!isEditMode && files.length === 0) {
			setError("Please select at least one report file to upload");
			return;
		}

		if (!formData.reportTitle || !formData.mainCategory || !formData.subCategory || !formData.eventDate || !formData.uploadedBy) {
			setError("Please fill in all required fields");
			return;
		}

		setUploading(true);
		setUploadStatus('uploading');
		setError(null);

		try {
			if (isEditMode) {
				// Update existing report
				if (files.length > 0) {
					// If file is uploaded, use upload endpoint which handles both metadata and file
					const formDataToSend = new FormData();
					formDataToSend.append('reportTitle', formData.reportTitle);
					formDataToSend.append('description', formData.description);
					formDataToSend.append('mainCategory', formData.mainCategory);
					formDataToSend.append('subCategory', formData.subCategory);
					formDataToSend.append('eventDate', formData.eventDate);
					formDataToSend.append('uploadedBy', formData.uploadedBy);
					formDataToSend.append('reportId', reportId || '');

					files.forEach((fileObj) => {
						formDataToSend.append(`files`, fileObj.file);
					});

					const uploadResponse = await fetch('/api/reports/upload', {
						method: 'POST',
						body: formDataToSend,
					});

					const uploadResult = await uploadResponse.json();
					
					if (uploadResult.success) {
						setUploadStatus('success');
						setUploadProgress(100);
						
						// Redirect to reports page after 2 seconds
						setTimeout(() => {
							router.push('/dashboard/reports');
						}, 2000);
					} else {
						// Show detailed error message
						let errorMessage = uploadResult.message || 'Failed to update report';
						if (uploadResult.error) {
							errorMessage += ` (${uploadResult.error})`;
						}
						if (uploadResult.hint) {
							errorMessage += ` ${uploadResult.hint}`;
						}
						setError(errorMessage);
						setUploadStatus('error');
						console.error('Upload error details:', uploadResult);
					}
				} else {
					// No file uploaded, just update metadata via PUT
					const response = await fetch(`/api/reports/${reportId}`, {
						method: 'PUT',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							reportTitle: formData.reportTitle,
							description: formData.description,
							mainCategory: formData.mainCategory,
							subCategory: formData.subCategory,
							eventDate: formData.eventDate
						}),
					});

					const result = await response.json();

					if (result.success) {
						setUploadStatus('success');
						setUploadProgress(100);
						
						// Redirect to reports page after 2 seconds
						setTimeout(() => {
							router.push('/dashboard/reports');
						}, 2000);
					} else {
						setError(result.message || 'Update failed');
						setUploadStatus('error');
					}
				}
			} else {
				// Create new report (POST request)
				const formDataToSend = new FormData();
				
				// Add form fields
				formDataToSend.append('reportTitle', formData.reportTitle);
				formDataToSend.append('description', formData.description);
				formDataToSend.append('mainCategory', formData.mainCategory);
				formDataToSend.append('subCategory', formData.subCategory);
				formDataToSend.append('eventDate', formData.eventDate);
				formDataToSend.append('uploadedBy', formData.uploadedBy);

				// Add files
				files.forEach((fileObj) => {
					formDataToSend.append(`files`, fileObj.file);
				});

				const response = await fetch('/api/reports/upload', {
					method: 'POST',
					body: formDataToSend,
				});

				const result = await response.json();

				if (result.success) {
					setUploadStatus('success');
					setUploadProgress(100);
					
					// Redirect to reports page after 2 seconds
					setTimeout(() => {
						router.push('/dashboard/reports');
					}, 2000);
				} else {
					// Show detailed error message
					let errorMessage = result.message || 'Upload failed';
					if (result.error) {
						errorMessage += ` (${result.error})`;
					}
					if (result.hint) {
						errorMessage += ` ${result.hint}`;
					}
					setError(errorMessage);
					setUploadStatus('error');
					console.error('Upload error details:', result);
				}
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error';
			setError(isEditMode 
				? `Update failed: ${errorMessage}. Please try again.` 
				: `Upload failed: ${errorMessage}. Please try again.`
			);
			setUploadStatus('error');
			console.error('Submit error:', err);
		} finally {
			setUploading(false);
		}
	};

	const resetForm = () => {
		const fullName = userProfile?.full_name || user?.name || '';
		setFormData({
			reportTitle: "",
			description: "",
			mainCategory: "",
			subCategory: "",
			eventDate: "",
			uploadedBy: fullName // Preserve user's full name
		});
		setFiles([]);
		setError(null);
		setUploadStatus('idle');
		setUploadProgress(0);
		setSubCategories([]);
		setSelectedMainCategoryID(null);
	};

	// Show loading state while checking access or loading user data or loading report
	if (accessLoading || authLoading || loadingReport) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Report' : 'Upload Reports'}</h1>
					<p className="text-gray-600 mt-2">{loadingReport ? 'Loading report data...' : 'Checking permissions...'}</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		);
	}

	// Show access denied if user doesn't have upload permission
	if (!canUpload) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">Upload Reports</h1>
						<p className="text-gray-600 mt-2">Upload new reports to the system</p>
					</div>
					<Link
						href="/dashboard/reports"
						className="inline-flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Reports
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
					action={isEditMode ? "edit reports" : "upload reports"} 
					customMessage={isEditMode 
						? "This action requires Admin access or Edit permission. Please contact your administrator if you believe this is an error."
						: "This action requires Admin access or Upload Report permission. Please contact your administrator if you believe this is an error."
					}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Report' : 'Upload Reports'}</h1>
					<p className="text-gray-600 mt-2">{isEditMode ? 'Update report information' : 'Upload new reports to the system'}</p>
				</div>
				<Link
					href="/dashboard/reports"
					className="inline-flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Reports
				</Link>
			</div>

			{/* Upload Form */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
				<div className="p-6">
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Form Fields */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="md:col-span-2">
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Report Title <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="reportTitle"
									value={formData.reportTitle}
									onChange={handleInputChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
									placeholder="Enter report title"
									required
								/>
							</div>

							<div className="md:col-span-2">
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Description
								</label>
								<textarea
									name="description"
									value={formData.description}
									onChange={handleInputChange}
									rows={3}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
									placeholder="Enter report description"
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
										disabled={loadingCategories}
										className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
										required
									>
										<option value="">Select Main Category</option>
										{mainCategories.map((category) => (
											<option key={category.MainCategoryID} value={category.Category}>
												{category.Category}
											</option>
										))}
									</select>
									<button
										type="button"
										onClick={() => setShowMainCategoryModal(true)}
										className="px-3 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors flex items-center justify-center"
										title="Manage Main Categories"
									>
										<Plus className="h-4 w-4" />
									</button>
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
										disabled={!formData.mainCategory || loadingCategories || subCategories.length === 0}
										className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
										required
									>
										<option value="">
											{!formData.mainCategory 
												? "Select Main Category first" 
												: loadingCategories 
												? "Loading sub categories..." 
												: subCategories.length === 0 
												? "No sub categories available" 
												: "Select Sub Category"}
										</option>
										{subCategories.map((subCategory) => (
											<option key={subCategory.SubCategoryID} value={subCategory.SubCategory}>
												{subCategory.SubCategory}
											</option>
										))}
									</select>
									<button
										type="button"
										onClick={() => {
											if (selectedMainCategoryID && formData.mainCategory) {
												setShowSubCategoryModal(true);
											}
										}}
										disabled={!formData.mainCategory || !selectedMainCategoryID}
										className="px-3 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
										title="Manage Sub Categories"
									>
										<Plus className="h-4 w-4" />
									</button>
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

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Uploaded By <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="uploadedBy"
									value={formData.uploadedBy}
									onChange={handleInputChange}
									disabled
									readOnly
									className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed outline-none"
									placeholder={authLoading ? "Loading..." : "Enter your name"}
									required
								/>
							</div>
						</div>

						{/* File Upload */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Select Report Files {!isEditMode && <span className="text-red-500">*</span>}
								{isEditMode && <span className="text-gray-500 text-xs ml-2">(Optional - leave empty to keep existing file)</span>}
							</label>
							<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#0b4d2b] transition-colors">
								<input
									type="file"
									multiple
									accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
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
										Click to upload report files
									</p>
									<p className="text-sm text-gray-500">
										PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX up to 10MB each
									</p>
								</label>
							</div>
						</div>

						{/* Selected Files Preview */}
						{files.length > 0 && (
							<div>
								<h3 className="text-sm font-medium text-gray-700 mb-3">
									Selected Report Files ({files.length})
								</h3>
								<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
									{files.map((fileObj) => (
										<div key={fileObj.id} className="relative group">
											<div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden flex flex-col items-center justify-center p-2">
												<div className="text-3xl mb-2">
													{getFileIcon(fileObj.file.name)}
												</div>
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
									<span className="text-sm font-medium text-blue-900">Uploading...</span>
									<span className="text-sm text-blue-700">{uploadProgress}%</span>
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
										Reports uploaded successfully! Redirecting...
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
								disabled={uploading || (!isEditMode && files.length === 0)}
								className="px-6 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{uploading ? (isEditMode ? 'Updating...' : 'Uploading...') : (isEditMode ? 'Update Report' : 'Upload Reports')}
							</button>
						</div>
					</form>
				</div>
			</div>

			{/* Main Category Modal */}
			<ReportMainCategoryModal
				isOpen={showMainCategoryModal}
				onClose={() => setShowMainCategoryModal(false)}
				onCategorySelect={(category) => {
					setFormData(prev => ({
						...prev,
						mainCategory: category
					}));
					const selectedCategory = mainCategories.find(cat => cat.Category === category);
					if (selectedCategory) {
						setSelectedMainCategoryID(selectedCategory.MainCategoryID);
						fetchSubCategories(selectedCategory.MainCategoryID);
					}
				}}
				onCategoryChange={() => {
					fetchMainCategories();
				}}
			/>

			{/* Sub Category Modal */}
			<ReportSubCategoryModal
				isOpen={showSubCategoryModal}
				onClose={() => setShowSubCategoryModal(false)}
				onSubCategorySelect={(subCategory) => {
					setFormData(prev => ({
						...prev,
						subCategory: subCategory
					}));
				}}
				onSubCategoryChange={() => {
					if (selectedMainCategoryID) {
						fetchSubCategories(selectedMainCategoryID);
					}
				}}
				mainCategoryID={selectedMainCategoryID}
				mainCategoryName={formData.mainCategory || ""}
			/>
		</div>
	);
}
