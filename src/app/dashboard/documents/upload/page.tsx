"use client";

import { useState, useEffect } from "react";
import { Upload, ArrowLeft, FileText, Calendar, Folder, User, X, Check, Plus, Edit, Trash2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AccessDenied from "@/components/AccessDenied";
import { useAccess } from "@/hooks/useAccess";
import { useAuth } from "@/hooks/useAuth";
import { uploadMultipleToBlob, type BlobUploadResult } from "@/lib/uploads";

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

type Category = {
	MainCategoryID: number;
	Category: string;
};

type SubCategory = {
	SubCategoryID: number;
	MainCategoryID: number;
	SubCategory: string;
};

type UploadedFile = {
	file: File;
	preview: string;
	id: string;
};

export default function UploadDocumentsPage() {
	const router = useRouter();
	const { user, getUserId } = useAuth();
	const userId = user?.id || user?.username || getUserId() || null;
	const { canUploadDocuments, isAdmin, loading: accessLoading, error: accessError } = useAccess(userId);
	
	// Debug logging
	useEffect(() => {
		console.log('[Upload Documents Page] Access Status:', {
			userId,
			canUploadDocuments,
			isAdmin,
			accessLoading,
			accessError,
			user: user ? { id: user.id, username: user.username } : null
		});
	}, [userId, canUploadDocuments, isAdmin, accessLoading, accessError, user]);

	// Auto-populate "Uploaded By" field with current user's username
	useEffect(() => {
		if (user) {
			const userName = user.name || user.username || user.id || "";
			if (userName) {
				setFormData(prev => {
					// Only update if not already set
					if (prev.uploadedBy) return prev;
					return {
						...prev,
						uploadedBy: userName
					};
				});
			}
		}
	}, [user]);
	
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
	const [currentFileUploading, setCurrentFileUploading] = useState<string>('');
	const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
	const [error, setError] = useState<string | null>(null);
	
	// Category and SubCategory management
	const [categories, setCategories] = useState<Category[]>([]);
	const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
	const [loadingCategories, setLoadingCategories] = useState(false);
	const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
	
	// Category Modal State
	const [showCategoryModal, setShowCategoryModal] = useState(false);
	const [categoryModalMode, setCategoryModalMode] = useState<'add' | 'edit'>('add');
	const [categoryFormData, setCategoryFormData] = useState({ MainCategoryID: 0, Category: "" });
	const [categoryError, setCategoryError] = useState<string | null>(null);
	const [savingCategory, setSavingCategory] = useState(false);
	
	// SubCategory Modal State
	const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
	const [subCategoryModalMode, setSubCategoryModalMode] = useState<'add' | 'edit'>('add');
	const [subCategoryFormData, setSubCategoryFormData] = useState({ SubCategoryID: 0, MainCategoryID: 0, SubCategory: "" });
	const [subCategoryError, setSubCategoryError] = useState<string | null>(null);
	const [savingSubCategory, setSavingSubCategory] = useState(false);

	// Fetch categories on component mount
	useEffect(() => {
		fetchCategories();
	}, []);

	// Fetch subcategories when category is selected
	useEffect(() => {
		if (selectedCategoryId) {
			fetchSubCategories(parseInt(selectedCategoryId));
		} else {
			setSubCategories([]);
			setFormData(prev => ({ ...prev, subCategory: "" }));
		}
	}, [selectedCategoryId]);

	const fetchCategories = async () => {
		try {
			setLoadingCategories(true);
			const response = await fetch('/api/documents/categories');
			const data = await response.json();
			
			if (data.success) {
				setCategories(data.categories || []);
			}
		} catch (err) {
			console.error("Error fetching categories:", err);
		} finally {
			setLoadingCategories(false);
		}
	};

	const fetchSubCategories = async (mainCategoryID: number) => {
		try {
			const response = await fetch(`/api/documents/subcategories?mainCategoryID=${mainCategoryID}`);
			const data = await response.json();
			
			if (data.success) {
				setSubCategories(data.subCategories || []);
			}
		} catch (err) {
			console.error("Error fetching subcategories:", err);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
		const { name, value, type } = e.target;
		
		// Handle category change - reset subcategory when category changes
		if (name === 'category') {
			const categoryId = value;
			setSelectedCategoryId(categoryId);
			const selectedCategory = categories.find(cat => cat.MainCategoryID.toString() === categoryId);
			setFormData(prev => ({
				...prev,
				[name]: selectedCategory ? selectedCategory.Category : "",
				subCategory: "" // Reset subcategory when category changes
			}));
		} else if (name === 'subCategory') {
			const subCategoryId = value;
			const selectedSubCategory = subCategories.find(sub => sub.SubCategoryID.toString() === subCategoryId);
			setFormData(prev => ({
				...prev,
				[name]: selectedSubCategory ? selectedSubCategory.SubCategory : ""
			}));
		} else {
			setFormData(prev => ({
				...prev,
				[name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
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
			file.name.endsWith('.rar') ||
			file.name.endsWith('.csv')
		);
		
		// Validate file sizes before adding (100MB limit)
		const maxSize = 100 * 1024 * 1024; // 100MB
		const invalidFiles = documentFiles.filter(file => file.size > maxSize);
		
		if (invalidFiles.length > 0) {
			const invalidFileNames = invalidFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`).join(', ');
			setError(`The following files exceed the 100MB limit: ${invalidFileNames}`);
			return;
		}
		
		const newFiles: UploadedFile[] = documentFiles.map(file => ({
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
		
		if (files.length === 0) {
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
		setUploadProgress(0);

		try {
			console.log('Starting direct Vercel Blob upload for', files.length, 'document files');
			
			// Step 1: Upload files directly to Vercel Blob
			const fileObjects = files.map(f => f.file);
			let uploadedBlobs: BlobUploadResult[] = [];

			try {
				uploadedBlobs = await uploadMultipleToBlob(
					fileObjects,
					'documents',
					(fileIndex, fileName, progress) => {
						setCurrentFileUploading(`${fileName} (${progress.percentage}%)`);
						// Calculate overall progress
						const overallProgress = Math.round(
							((fileIndex + (progress.percentage / 100)) / files.length) * 80
						); // Reserve 20% for metadata save
						setUploadProgress(overallProgress);
					}
				);
				console.log('All documents uploaded to Vercel Blob:', uploadedBlobs);
			} catch (uploadError) {
				console.error('Blob upload error:', uploadError);
				throw uploadError;
			}

			setCurrentFileUploading('Saving metadata...');
			setUploadProgress(85);

			// Step 2: Save metadata to database
			const response = await fetch('/api/documents/save-metadata', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
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
					allowOthersUsers: formData.allowOthersUsers,
					files: uploadedBlobs
				}),
			});

			const result = await response.json();

			if (result.success) {
				console.log('Metadata saved successfully:', result);
				setUploadStatus('success');
				setUploadProgress(100);
				setCurrentFileUploading('');
				
				// Redirect to documents page after 2 seconds
				setTimeout(() => {
					router.push('/dashboard/documents');
				}, 2000);
			} else {
				throw new Error(result.message || 'Failed to save document metadata');
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
		setFiles([]);
		setError(null);
		setUploadStatus('idle');
		setUploadProgress(0);
		setSelectedCategoryId("");
		setSubCategories([]);
	};

	// Category Management Functions
	const openCategoryModal = (mode: 'add' | 'edit', category?: Category) => {
		setCategoryModalMode(mode);
		if (mode === 'edit' && category) {
			setCategoryFormData({ MainCategoryID: category.MainCategoryID, Category: category.Category });
		} else {
			setCategoryFormData({ MainCategoryID: 0, Category: "" });
		}
		setCategoryError(null);
		setShowCategoryModal(true);
	};

	const closeCategoryModal = () => {
		setShowCategoryModal(false);
		setCategoryFormData({ MainCategoryID: 0, Category: "" });
		setCategoryError(null);
	};

	const saveCategory = async () => {
		if (!categoryFormData.Category.trim()) {
			setCategoryError("Category name is required");
			return;
		}

		setSavingCategory(true);
		setCategoryError(null);

		try {
			const url = '/api/documents/categories';
			const method = categoryModalMode === 'add' ? 'POST' : 'PUT';
			const body = categoryModalMode === 'add' 
				? { category: categoryFormData.Category }
				: { mainCategoryID: categoryFormData.MainCategoryID, category: categoryFormData.Category };

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			const data = await response.json();

			if (data.success) {
				await fetchCategories();
				closeCategoryModal();
			} else {
				setCategoryError(data.message || "Failed to save category");
			}
		} catch (err) {
			setCategoryError("Error saving category");
			console.error("Error saving category:", err);
		} finally {
			setSavingCategory(false);
		}
	};

	const deleteCategory = async (mainCategoryID: number) => {
		if (!confirm("Are you sure you want to delete this category?")) return;

		try {
			const response = await fetch(`/api/documents/categories?mainCategoryID=${mainCategoryID}`, {
				method: 'DELETE'
			});

			const data = await response.json();

			if (data.success) {
				await fetchCategories();
				if (selectedCategoryId === mainCategoryID.toString()) {
					setSelectedCategoryId("");
					setFormData(prev => ({ ...prev, category: "", subCategory: "" }));
				}
			} else {
				alert(data.message || "Failed to delete category");
			}
		} catch (err) {
			alert("Error deleting category");
			console.error("Error deleting category:", err);
		}
	};

	// SubCategory Management Functions
	const openSubCategoryModal = (mode: 'add' | 'edit', subCategory?: SubCategory) => {
		setSubCategoryModalMode(mode);
		if (mode === 'edit' && subCategory) {
			setSubCategoryFormData({ 
				SubCategoryID: subCategory.SubCategoryID, 
				MainCategoryID: subCategory.MainCategoryID, 
				SubCategory: subCategory.SubCategory 
			});
		} else {
			setSubCategoryFormData({ 
				SubCategoryID: 0, 
				MainCategoryID: selectedCategoryId ? parseInt(selectedCategoryId) : 0, 
				SubCategory: "" 
			});
		}
		setSubCategoryError(null);
		setShowSubCategoryModal(true);
	};

	const closeSubCategoryModal = () => {
		setShowSubCategoryModal(false);
		setSubCategoryFormData({ SubCategoryID: 0, MainCategoryID: 0, SubCategory: "" });
		setSubCategoryError(null);
	};

	const saveSubCategory = async () => {
		if (!subCategoryFormData.SubCategory.trim()) {
			setSubCategoryError("Sub Category name is required");
			return;
		}

		if (!subCategoryFormData.MainCategoryID) {
			setSubCategoryError("Please select a category first");
			return;
		}

		setSavingSubCategory(true);
		setSubCategoryError(null);

		try {
			const url = '/api/documents/subcategories';
			const method = subCategoryModalMode === 'add' ? 'POST' : 'PUT';
			const body = subCategoryModalMode === 'add' 
				? { mainCategoryID: subCategoryFormData.MainCategoryID, subCategory: subCategoryFormData.SubCategory }
				: { subCategoryID: subCategoryFormData.SubCategoryID, subCategory: subCategoryFormData.SubCategory };

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			const data = await response.json();

			if (data.success) {
				await fetchSubCategories(subCategoryFormData.MainCategoryID);
				closeSubCategoryModal();
			} else {
				setSubCategoryError(data.message || "Failed to save sub category");
			}
		} catch (err) {
			setSubCategoryError("Error saving sub category");
			console.error("Error saving sub category:", err);
		} finally {
			setSavingSubCategory(false);
		}
	};

	const deleteSubCategory = async (subCategoryID: number, mainCategoryID: number) => {
		if (!confirm("Are you sure you want to delete this sub category?")) return;

		try {
			const response = await fetch(`/api/documents/subcategories?subCategoryID=${subCategoryID}`, {
				method: 'DELETE'
			});

			const data = await response.json();

			if (data.success) {
				await fetchSubCategories(mainCategoryID);
				if (formData.subCategory === subCategoryID.toString()) {
					setFormData(prev => ({ ...prev, subCategory: "" }));
				}
			} else {
				alert(data.message || "Failed to delete sub category");
			}
		} catch (err) {
			alert("Error deleting sub category");
			console.error("Error deleting sub category:", err);
		}
	};

	// Show loading state while checking access
	if (accessLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Upload Documents</h1>
					<p className="text-gray-600 mt-2">Checking permissions...</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		);
	}

	// Show access denied if user doesn't have upload permission
	// Allow access if user is admin OR has canUploadDocuments permission
	const hasAccess = isAdmin || canUploadDocuments;
	
	if (!hasAccess) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">Upload Documents</h1>
						<p className="text-gray-600 mt-2">Upload new documents to the system</p>
					</div>
					<Link
						href="/dashboard/documents"
						className="inline-flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Documents
					</Link>
				</div>
				<AccessDenied action="upload documents" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Upload Documents</h1>
					<p className="text-gray-600 mt-2">Upload new documents to the system</p>
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
								<div className="flex gap-2">
									<select
										name="category"
										value={selectedCategoryId}
										onChange={handleInputChange}
										className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
										required
										disabled={loadingCategories}
									>
										<option value="">Select Category</option>
										{categories.map((cat) => (
											<option key={cat.MainCategoryID} value={cat.MainCategoryID}>
												{cat.Category}
											</option>
										))}
									</select>
									<button
										type="button"
										onClick={() => openCategoryModal('add')}
										className="px-3 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors flex items-center justify-center"
										title="Add Category"
									>
										<Plus className="h-4 w-4" />
									</button>
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Sub Category <span className="text-red-500">*</span>
								</label>
								<div className="flex gap-2">
									<select
										name="subCategory"
										value={subCategories.find(sc => sc.SubCategory === formData.subCategory)?.SubCategoryID || ""}
										onChange={handleInputChange}
										className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
										required
										disabled={!selectedCategoryId || subCategories.length === 0}
									>
										<option value="">
											{!selectedCategoryId 
												? "Select Category first" 
												: subCategories.length === 0 
													? "No sub categories available" 
													: "Select Sub Category"}
										</option>
										{subCategories.map((subCat) => (
											<option key={subCat.SubCategoryID} value={subCat.SubCategoryID}>
												{subCat.SubCategory}
											</option>
										))}
									</select>
									<button
										type="button"
										onClick={() => openSubCategoryModal('add')}
										className="px-3 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
										title="Add Sub Category"
										disabled={!selectedCategoryId}
									>
										<Plus className="h-4 w-4" />
									</button>
								</div>
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
									readOnly
									className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed outline-none"
									placeholder="Loading user..."
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
								Select Document Files <span className="text-red-500">*</span>
							</label>
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
										PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, ZIP, RAR, CSV up to 100MB each
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
										Documents uploaded successfully! Redirecting...
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
								{uploading ? 'Uploading...' : 'Upload Documents'}
							</button>
						</div>
					</form>
				</div>
			</div>

			{/* Category Management Modal */}
			{showCategoryModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
						<div className="p-6 border-b border-gray-200">
							<div className="flex items-center justify-between">
								<h2 className="text-xl font-bold text-gray-900">
									{categoryModalMode === 'add' ? 'Add Category' : 'Edit Category'}
								</h2>
								<button
									onClick={closeCategoryModal}
									className="text-gray-400 hover:text-gray-600 transition-colors"
								>
									<X className="h-5 w-5" />
								</button>
							</div>
						</div>

						<div className="p-6">
							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Category Name <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={categoryFormData.Category}
									onChange={(e) => setCategoryFormData(prev => ({ ...prev, Category: e.target.value }))}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
									placeholder="Enter category name"
								/>
							</div>

							{categoryError && (
								<div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
									<p className="text-sm text-red-600">{categoryError}</p>
								</div>
							)}

							{/* Categories List */}
							<div className="mb-4">
								<h3 className="text-sm font-medium text-gray-700 mb-2">Existing Categories</h3>
								<div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
									{categories.length === 0 ? (
										<p className="p-3 text-sm text-gray-500 text-center">No categories found</p>
									) : (
										<div className="divide-y divide-gray-200">
											{categories.map((cat) => (
												<div key={cat.MainCategoryID} className="p-3 flex items-center justify-between hover:bg-gray-50">
													<span className="text-sm text-gray-900">{cat.Category}</span>
													<div className="flex items-center space-x-2">
														<button
															onClick={() => {
																openCategoryModal('edit', cat);
															}}
															className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
															title="Edit"
														>
															<Edit className="h-4 w-4" />
														</button>
														<button
															onClick={() => deleteCategory(cat.MainCategoryID)}
															className="p-1 text-red-600 hover:text-red-800 transition-colors"
															title="Delete"
														>
															<Trash2 className="h-4 w-4" />
														</button>
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</div>

							<div className="flex items-center justify-end space-x-3">
								<button
									onClick={closeCategoryModal}
									className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
								>
									Cancel
								</button>
								<button
									onClick={saveCategory}
									disabled={savingCategory}
									className="px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
								>
									{savingCategory ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
											Saving...
										</>
									) : (
										<>
											<Save className="h-4 w-4 mr-2" />
											Save
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* SubCategory Management Modal */}
			{showSubCategoryModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
						<div className="p-6 border-b border-gray-200">
							<div className="flex items-center justify-between">
								<h2 className="text-xl font-bold text-gray-900">
									{subCategoryModalMode === 'add' ? 'Add Sub Category' : 'Edit Sub Category'}
								</h2>
								<button
									onClick={closeSubCategoryModal}
									className="text-gray-400 hover:text-gray-600 transition-colors"
								>
									<X className="h-5 w-5" />
								</button>
							</div>
						</div>

						<div className="p-6">
							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Category <span className="text-red-500">*</span>
								</label>
								<select
									value={subCategoryFormData.MainCategoryID}
									onChange={(e) => setSubCategoryFormData(prev => ({ ...prev, MainCategoryID: parseInt(e.target.value) }))}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
									disabled={subCategoryModalMode === 'edit'}
								>
									<option value="0">Select Category</option>
									{categories.map((cat) => (
										<option key={cat.MainCategoryID} value={cat.MainCategoryID}>
											{cat.Category}
										</option>
									))}
								</select>
							</div>

							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Sub Category Name <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={subCategoryFormData.SubCategory}
									onChange={(e) => setSubCategoryFormData(prev => ({ ...prev, SubCategory: e.target.value }))}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
									placeholder="Enter sub category name"
								/>
							</div>

							{subCategoryError && (
								<div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
									<p className="text-sm text-red-600">{subCategoryError}</p>
								</div>
							)}

							{/* SubCategories List */}
							{subCategoryFormData.MainCategoryID > 0 && (
								<div className="mb-4">
									<h3 className="text-sm font-medium text-gray-700 mb-2">Existing Sub Categories</h3>
									<div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
										{(() => {
											const filteredSubCats = subCategories.filter(sc => sc.MainCategoryID === subCategoryFormData.MainCategoryID);
											return filteredSubCats.length === 0 ? (
												<p className="p-3 text-sm text-gray-500 text-center">No sub categories found</p>
											) : (
												<div className="divide-y divide-gray-200">
													{filteredSubCats.map((subCat) => (
														<div key={subCat.SubCategoryID} className="p-3 flex items-center justify-between hover:bg-gray-50">
															<span className="text-sm text-gray-900">{subCat.SubCategory}</span>
															<div className="flex items-center space-x-2">
																<button
																	onClick={() => {
																		openSubCategoryModal('edit', subCat);
																	}}
																	className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
																	title="Edit"
																>
																	<Edit className="h-4 w-4" />
																</button>
																<button
																	onClick={() => deleteSubCategory(subCat.SubCategoryID, subCat.MainCategoryID)}
																	className="p-1 text-red-600 hover:text-red-800 transition-colors"
																	title="Delete"
																>
																	<Trash2 className="h-4 w-4" />
																</button>
															</div>
														</div>
													))}
												</div>
											);
										})()}
									</div>
								</div>
							)}

							<div className="flex items-center justify-end space-x-3">
								<button
									onClick={closeSubCategoryModal}
									className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
								>
									Cancel
								</button>
								<button
									onClick={saveSubCategory}
									disabled={savingSubCategory}
									className="px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
								>
									{savingSubCategory ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
											Saving...
										</>
									) : (
										<>
											<Save className="h-4 w-4 mr-2" />
											Save
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
