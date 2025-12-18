"use client";

import { useState, useEffect } from "react";
import { Upload, ArrowLeft, FileText, Calendar, Folder, User, X, Check } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AccessDenied from "@/components/AccessDenied";
import { useAccess } from "@/hooks/useAccess";
import { useAuth } from "@/hooks/useAuth";

type UploadFormData = {
	title: string;
	description: string;
	category: string;
	subCategory: string;
	documentDate: string;
	uploadedBy: string;
	fileType: string;
	documentType: string;
	allowPriorityUsers: boolean;
	allowInternalUsers: boolean;
	allowOthersUsers: boolean;
};

type UploadedFile = {
	file: File;
	preview: string;
	id: string;
};

export default function UploadDocumentsPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const documentId = searchParams.get('id');
	const isEditMode = !!documentId;
	
	// Get user ID using useAuth hook (more reliable)
	const { user, userProfile, getUserId, loading: authLoading } = useAuth();
	const userId = user?.id || user?.username || getUserId() || null;
	
	const { canUploadDocuments, accessEdit, loading: accessLoading, error: accessError } = useAccess(userId);
	
	useEffect(() => {
		console.log('[Documents Upload Page] Access check result:', { canUploadDocuments, accessLoading, accessError, userId });
	}, [canUploadDocuments, accessLoading, accessError, userId]);

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

	// Fetch document data when editing
	useEffect(() => {
		const fetchDocument = async () => {
			if (!documentId) return;

			try {
				const response = await fetch(`/api/documents/${documentId}`);
				const data = await response.json();

				if (data.success && data.document) {
					const doc = data.document;
					// Format date for input field (YYYY-MM-DD)
					const formatDateForInput = (dateString: string) => {
						if (!dateString) return '';
						try {
							const date = new Date(dateString);
							const year = date.getFullYear();
							const month = String(date.getMonth() + 1).padStart(2, '0');
							const day = String(date.getDate()).padStart(2, '0');
							return `${year}-${month}-${day}`;
						} catch {
							return dateString;
						}
					};

					setFormData({
						title: doc.Title || '',
						description: doc.Description || '',
						category: doc.Category || '',
						subCategory: doc.SubCategory || '',
						documentDate: formatDateForInput(doc.document_date) || '',
						uploadedBy: doc.UploadedBy || '',
						fileType: doc.FileType || '',
						documentType: doc.Documentstype || '',
						allowPriorityUsers: doc.AllowPriorityUsers || false,
						allowInternalUsers: doc.AllowInternalUsers || false,
						allowOthersUsers: doc.AllowOthersUsers || false
					});
				}
			} catch (err) {
				console.error('Error fetching document:', err);
				setError('Failed to load document data');
			}
		};

		fetchDocument();
	}, [documentId]);
	
	const [formData, setFormData] = useState<UploadFormData>({
		title: "",
		description: "",
		category: "",
		subCategory: "",
		documentDate: "",
		uploadedBy: "",
		fileType: "",
		documentType: "",
		allowPriorityUsers: false,
		allowInternalUsers: false,
		allowOthersUsers: false
	});
	const [files, setFiles] = useState<UploadedFile[]>([]);
	const [uploading, setUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
	const [error, setError] = useState<string | null>(null);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
		const { name, value, type } = e.target;
		setFormData(prev => ({
			...prev,
			[name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
		}));
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = Array.from(e.target.files || []);
		const documentFiles = selectedFiles.filter(file => 
			file.type.includes('pdf') || 
			file.type.includes('document') || 
			file.type.includes('spreadsheet') || 
			file.type.includes('presentation') ||
			file.type.includes('text') ||
			file.name.endsWith('.pdf') ||
			file.name.endsWith('.doc') ||
			file.name.endsWith('.docx') ||
			file.name.endsWith('.xls') ||
			file.name.endsWith('.xlsx') ||
			file.name.endsWith('.ppt') ||
			file.name.endsWith('.pptx') ||
			file.name.endsWith('.txt') ||
			file.name.endsWith('.zip') ||
			file.name.endsWith('.rar')
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
		if (extension === 'txt') return '📄';
		if (['zip', 'rar'].includes(extension || '')) return '📦';
		return '📄';
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		// For new uploads, require at least one file
		if (!isEditMode && files.length === 0) {
			setError("Please select at least one document file to upload");
			return;
		}

		if (!formData.title || !formData.category || !formData.subCategory || !formData.documentDate || !formData.uploadedBy) {
			setError("Please fill in all required fields");
			return;
		}

		setUploading(true);
		setUploadStatus('uploading');
		setError(null);

		try {
			if (isEditMode) {
				// Update existing document
				const response = await fetch(`/api/documents/${documentId}`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						title: formData.title,
						description: formData.description,
						category: formData.category,
						subCategory: formData.subCategory,
						documentDate: formData.documentDate,
						uploadedBy: formData.uploadedBy,
						fileType: formData.fileType,
						documentType: formData.documentType,
						allowPriorityUsers: formData.allowPriorityUsers,
						allowInternalUsers: formData.allowInternalUsers,
						allowOthersUsers: formData.allowOthersUsers
					}),
				});

				const result = await response.json();

				if (result.success) {
					setUploadStatus('success');
					setUploadProgress(100);
					
					// Redirect to documents page after 2 seconds
					setTimeout(() => {
						router.push('/dashboard/documents');
					}, 2000);
				} else {
					setError(result.message || 'Update failed');
					setUploadStatus('error');
				}
			} else {
				// Upload new document
				const formDataToSend = new FormData();
				
				// Add form fields
				formDataToSend.append('title', formData.title);
				formDataToSend.append('description', formData.description);
				formDataToSend.append('category', formData.category);
				formDataToSend.append('subCategory', formData.subCategory);
				formDataToSend.append('documentDate', formData.documentDate);
				formDataToSend.append('uploadedBy', formData.uploadedBy);
				formDataToSend.append('fileType', formData.fileType);
				formDataToSend.append('documentType', formData.documentType);
				formDataToSend.append('allowPriorityUsers', formData.allowPriorityUsers.toString());
				formDataToSend.append('allowInternalUsers', formData.allowInternalUsers.toString());
				formDataToSend.append('allowOthersUsers', formData.allowOthersUsers.toString());

				// Add files
				files.forEach((fileObj, index) => {
					formDataToSend.append(`files`, fileObj.file);
				});

				const response = await fetch('/api/documents/upload', {
					method: 'POST',
					body: formDataToSend,
				});

				const result = await response.json();

				if (result.success) {
					setUploadStatus('success');
					setUploadProgress(100);
					
					// Redirect to documents page after 2 seconds
					setTimeout(() => {
						router.push('/dashboard/documents');
					}, 2000);
				} else {
					setError(result.message || 'Upload failed');
					setUploadStatus('error');
				}
			}
		} catch (err) {
			setError(isEditMode ? 'Update failed. Please try again.' : 'Upload failed. Please try again.');
			setUploadStatus('error');
			console.error('Error:', err);
		} finally {
			setUploading(false);
		}
	};

	const resetForm = () => {
		const fullName = userProfile?.full_name || user?.name || '';
		setFormData({
			title: "",
			description: "",
			category: "",
			subCategory: "",
			documentDate: "",
			uploadedBy: fullName, // Preserve user's full name
			fileType: "",
			documentType: "",
			allowPriorityUsers: false,
			allowInternalUsers: false,
			allowOthersUsers: false
		});
		setFiles([]);
		setError(null);
		setUploadStatus('idle');
		setUploadProgress(0);
	};

	// Show loading state while checking access or loading user data
	if (accessLoading || authLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Document' : 'Upload Documents'}</h1>
					<p className="text-gray-600 mt-2">Checking permissions...</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		);
	}

	// Show access denied if user doesn't have upload/edit permission
	const hasAccess = isEditMode ? accessEdit : canUploadDocuments;
	if (!hasAccess) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Document' : 'Upload Documents'}</h1>
						<p className="text-gray-600 mt-2">{isEditMode ? 'Update document information' : 'Upload new documents to the system'}</p>
					</div>
					<Link
						href="/dashboard/documents"
						className="inline-flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Documents
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
					action={isEditMode ? "edit documents" : "upload documents"} 
					customMessage={isEditMode 
						? "This action requires Admin access or Edit permission. Please contact your administrator if you believe this is an error."
						: "This action requires Admin access or Upload Documents permission. Please contact your administrator if you believe this is an error."
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
					<h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Document' : 'Upload Documents'}</h1>
					<p className="text-gray-600 mt-2">{isEditMode ? 'Update document information' : 'Upload new documents to the system'}</p>
				</div>
				<Link
					href="/dashboard/documents"
					className="inline-flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Documents
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
									Document Title <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="title"
									value={formData.title}
									onChange={handleInputChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
									placeholder="Enter document title"
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
									placeholder="Enter document description"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Category <span className="text-red-500">*</span>
								</label>
								<select
									name="category"
									value={formData.category}
									onChange={handleInputChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
									required
								>
									<option value="">Select Category</option>
									<option value="Workshop">Workshop</option>
									<option value="Meeting">Meeting</option>
									<option value="Training">Training</option>
									<option value="Event">Event</option>
									<option value="Conference">Conference</option>
									<option value="Policy">Policy</option>
									<option value="Procedure">Procedure</option>
									<option value="Form">Form</option>
									<option value="Other">Other</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Sub Category <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="subCategory"
									value={formData.subCategory}
									onChange={handleInputChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
									placeholder="Enter sub category"
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Document Date <span className="text-red-500">*</span>
								</label>
								<input
									type="date"
									name="documentDate"
									value={formData.documentDate}
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

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									File Type
								</label>
								<select
									name="fileType"
									value={formData.fileType}
									onChange={handleInputChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
								>
									<option value="">Select File Type</option>
									<option value="PDF">PDF</option>
									<option value="Word Document">Word Document</option>
									<option value="Excel Spreadsheet">Excel Spreadsheet</option>
									<option value="PowerPoint">PowerPoint</option>
									<option value="Text File">Text File</option>
									<option value="Archive">Archive</option>
									<option value="Other">Other</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Document Type
								</label>
								<select
									name="documentType"
									value={formData.documentType}
									onChange={handleInputChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
								>
									<option value="">Select Document Type</option>
									<option value="Policy">Policy</option>
									<option value="Procedure">Procedure</option>
									<option value="Form">Form</option>
									<option value="Report">Report</option>
									<option value="Manual">Manual</option>
									<option value="Guideline">Guideline</option>
									<option value="Template">Template</option>
									<option value="Other">Other</option>
								</select>
							</div>
						</div>

						{/* Access Permissions */}
						<div className="bg-gray-50 rounded-lg p-4">
							<h3 className="text-lg font-medium text-gray-900 mb-4">Access Permissions</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="flex items-center">
									<input
										type="checkbox"
										name="allowPriorityUsers"
										checked={formData.allowPriorityUsers}
										onChange={handleInputChange}
										className="h-4 w-4 text-[#0b4d2b] focus:ring-[#0b4d2b] border-gray-300 rounded"
									/>
									<label className="ml-2 text-sm text-gray-700">
										Priority Users
									</label>
								</div>
								<div className="flex items-center">
									<input
										type="checkbox"
										name="allowInternalUsers"
										checked={formData.allowInternalUsers}
										onChange={handleInputChange}
										className="h-4 w-4 text-[#0b4d2b] focus:ring-[#0b4d2b] border-gray-300 rounded"
									/>
									<label className="ml-2 text-sm text-gray-700">
										Internal Users
									</label>
								</div>
								<div className="flex items-center">
									<input
										type="checkbox"
										name="allowOthersUsers"
										checked={formData.allowOthersUsers}
										onChange={handleInputChange}
										className="h-4 w-4 text-[#0b4d2b] focus:ring-[#0b4d2b] border-gray-300 rounded"
									/>
									<label className="ml-2 text-sm text-gray-700">
										All Users
									</label>
								</div>
							</div>
						</div>

						{/* File Upload */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Select Document Files {!isEditMode && <span className="text-red-500">*</span>}
							</label>
							{isEditMode && (
								<p className="text-sm text-gray-500 mb-2">
									Note: Leave empty to keep the existing file. Upload a new file to replace it.
								</p>
							)}
							<div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#0b4d2b] transition-colors">
								<input
									type="file"
									multiple
									accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
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
										Click to upload document files
									</p>
									<p className="text-sm text-gray-500">
										PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, ZIP, RAR up to 10MB each
									</p>
								</label>
							</div>
						</div>

						{/* Selected Files Preview */}
						{files.length > 0 && (
							<div>
								<h3 className="text-sm font-medium text-gray-700 mb-3">
									Selected Document Files ({files.length})
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
										{isEditMode ? 'Document updated successfully! Redirecting...' : 'Documents uploaded successfully! Redirecting...'}
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
								{uploading ? (isEditMode ? 'Updating...' : 'Uploading...') : (isEditMode ? 'Update Document' : 'Upload Documents')}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
