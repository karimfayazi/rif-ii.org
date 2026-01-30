"use client";

import { useState, useEffect } from "react";
import { X, Plus, Edit2, Trash2, Save, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";

type SubCategory = {
	SubCategoryID: number;
	MainCategoryID: number;
	SubCategory: string;
};

type ReportSubCategoryModalProps = {
	isOpen: boolean;
	onClose: () => void;
	onSubCategorySelect?: (subCategory: string) => void;
	onSubCategoryChange?: () => void;
	mainCategoryID: number | null;
	mainCategoryName: string;
};

export default function ReportSubCategoryModal({ 
	isOpen, 
	onClose, 
	onSubCategorySelect,
	onSubCategoryChange,
	mainCategoryID, 
	mainCategoryName 
}: ReportSubCategoryModalProps) {
	const { user, getUserId } = useAuth();
	const userId = user?.id || user?.username || getUserId() || null;
	const { canManageSubCategories, isAdmin, loading: accessLoading } = useAccess(userId);
	
	// Allow managing subcategories if user is admin or has explicit permission
	const hasManagePermission = canManageSubCategories || isAdmin;
	
	const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editValue, setEditValue] = useState("");
	const [newSubCategory, setNewSubCategory] = useState("");

	useEffect(() => {
		if (isOpen && mainCategoryID) {
			fetchSubCategories();
		}
	}, [isOpen, mainCategoryID]);

	const fetchSubCategories = async () => {
		if (!mainCategoryID) return;
		
		try {
			setLoading(true);
			const response = await fetch(`/api/reports/subcategories?mainCategoryID=${mainCategoryID}`);
			const data = await response.json();
			
			if (data.success) {
				setSubCategories(data.subCategories || []);
			} else {
				setError(data.message || "Failed to fetch sub categories");
			}
		} catch (err) {
			setError("Error fetching sub categories");
			console.error("Error fetching sub categories:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleAddSubCategory = async () => {
		const trimmedSubCategory = newSubCategory.trim();
		
		if (!trimmedSubCategory) {
			setError("Sub Category name is required");
			return;
		}

		if (trimmedSubCategory.length > 255) {
			setError("Sub Category name cannot exceed 255 characters");
			return;
		}

		if (!mainCategoryID) {
			setError("Select main category first");
			return;
		}

		try {
			setLoading(true);
			setError(null);
			
			const response = await fetch('/api/reports/subcategories', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ 
					mainCategoryID: mainCategoryID,
					subCategory: trimmedSubCategory
				}),
			});

			// Parse JSON response
			let data;
			try {
				data = await response.json();
			} catch (parseError) {
				const responseText = await response.text();
				console.error("Failed to parse API response:", {
					status: response.status,
					statusText: response.statusText,
					responseText,
					parseError
				});
				setError("Server returned invalid response. Please check console for details.");
				return;
			}
			
			// Handle successful response
			if (response.ok && data.success && data.data) {
				// Add new subcategory to the list
				const newSubCategoryObj: SubCategory = {
					SubCategoryID: data.data.subCategoryId,
					MainCategoryID: data.data.mainCategoryId,
					SubCategory: data.data.subCategory
				};
				
				setSubCategories(prev => [...prev, newSubCategoryObj].sort((a, b) => 
					a.SubCategory.localeCompare(b.SubCategory)
				));
				
				setNewSubCategory("");
				setSuccess("Sub Category added successfully");
				setTimeout(() => setSuccess(null), 3000);
				
				// Notify parent component to refresh
				if (onSubCategoryChange) {
					onSubCategoryChange();
				}
				
				// Auto-select the newly created subcategory if callback provided
				if (onSubCategorySelect) {
					onSubCategorySelect(data.data.subCategory);
					// Close modal after a short delay to show success message
					setTimeout(() => {
						onClose();
					}, 1500);
				}
			} else {
				// Show specific error message from API
				const errorMsg = data.message || data.error || "Failed to add sub category";
				setError(errorMsg);
				console.error("API error creating sub category:", {
					status: response.status,
					data,
					mainCategoryID,
					subCategory: trimmedSubCategory
				});
			}
		} catch (err) {
			console.error("Error adding sub category:", {
				error: err,
				message: err instanceof Error ? err.message : "Unknown error",
				mainCategoryID,
				subCategory: trimmedSubCategory
			});
			setError("Error adding sub category. Please check console for details.");
		} finally {
			setLoading(false);
		}
	};

	const handleUpdateSubCategory = async (id: number) => {
		const trimmedValue = editValue.trim();
		
		if (!trimmedValue) {
			setError("Sub Category name is required");
			return;
		}

		if (trimmedValue.length > 255) {
			setError("Sub Category name cannot exceed 255 characters");
			return;
		}

		try {
			setLoading(true);
			setError(null);
			
			const response = await fetch('/api/reports/subcategories', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ 
					subCategoryID: id, 
					subCategory: trimmedValue
				}),
			});

			const data = await response.json();
			
			if (data.success) {
				setSubCategories(prev => 
					prev.map(subCat => 
						subCat.SubCategoryID === id 
							? { ...subCat, SubCategory: trimmedValue }
							: subCat
					).sort((a, b) => a.SubCategory.localeCompare(b.SubCategory))
				);
				setEditingId(null);
				setEditValue("");
				setSuccess("Sub Category updated successfully");
				setTimeout(() => setSuccess(null), 3000);
				if (onSubCategoryChange) onSubCategoryChange();
			} else {
				setError(data.message || "Failed to update sub category");
			}
		} catch (err) {
			setError("Error updating sub category. Please try again.");
			console.error("Error updating sub category:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteSubCategory = async (id: number, subCategoryName: string) => {
		if (!confirm(`Are you sure you want to delete "${subCategoryName}"? This action cannot be undone.`)) {
			return;
		}

		try {
			setLoading(true);
			setError(null);
			
			const response = await fetch(`/api/reports/subcategories?subCategoryID=${id}`, {
				method: 'DELETE',
			});

			const data = await response.json();
			
			if (data.success) {
				setSubCategories(prev => prev.filter(subCat => subCat.SubCategoryID !== id));
				setSuccess("Sub Category deleted successfully");
				setTimeout(() => setSuccess(null), 3000);
				if (onSubCategoryChange) onSubCategoryChange();
			} else {
				setError(data.message || "Failed to delete sub category");
			}
		} catch (err) {
			setError("Error deleting sub category");
			console.error("Error deleting sub category:", err);
		} finally {
			setLoading(false);
		}
	};

	const startEdit = (subCategory: SubCategory) => {
		setEditingId(subCategory.SubCategoryID);
		setEditValue(subCategory.SubCategory);
	};

	const cancelEdit = () => {
		setEditingId(null);
		setEditValue("");
	};

	const handleSubCategoryClick = (subCategory: string) => {
		if (onSubCategorySelect) {
			onSubCategorySelect(subCategory);
		}
		onClose();
	};

	if (!isOpen || !mainCategoryID) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#0b4d2b] to-[#0a3d24] text-white">
					<div>
						<h2 className="text-xl font-semibold">Manage Sub Categories</h2>
						<p className="text-sm opacity-90">
							For Main Category: <span className="font-medium">{mainCategoryName}</span>
						</p>
					</div>
					<button
						onClick={onClose}
						className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Content */}
				<div className="p-6 max-h-[60vh] overflow-y-auto">
					{/* Success/Error Messages */}
					{success && (
						<div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
							<AlertCircle className="h-4 w-4 text-green-500 mr-2" />
							<span className="text-sm text-green-700">{success}</span>
						</div>
					)}
					
					{error && (
						<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
							<AlertCircle className="h-4 w-4 text-red-500 mr-2" />
							<span className="text-sm text-red-700">{error}</span>
						</div>
					)}

					{/* Add New Sub Category */}
					{hasManagePermission && (
						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Sub Category Name <span className="text-red-500">*</span>
								<span className="text-xs text-gray-500 ml-2">(Max 255 characters)</span>
							</label>
							<div className="flex items-center space-x-2">
								<input
									type="text"
									value={newSubCategory}
									onChange={(e) => {
										setNewSubCategory(e.target.value);
										if (error && error.includes("Sub Category name")) {
											setError(null);
										}
									}}
									maxLength={255}
									placeholder="Enter sub category name"
									className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
									onKeyPress={(e) => {
										if (e.key === 'Enter' && !loading && newSubCategory.trim()) {
											handleAddSubCategory();
										}
									}}
									disabled={loading}
								/>
								<button
									onClick={handleAddSubCategory}
									disabled={loading || !newSubCategory.trim()}
									className="px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center whitespace-nowrap"
								>
									{loading ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
											Saving...
										</>
									) : (
										<>
											<Plus className="h-4 w-4 mr-1" />
											Add
										</>
									)}
								</button>
								{newSubCategory && !loading && (
									<button
										onClick={() => {
											setNewSubCategory("");
											setError(null);
										}}
										className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
									>
										Cancel
									</button>
								)}
							</div>
						</div>
					)}

					{/* Sub Categories List */}
					<div className="space-y-2">
						<h3 className="text-sm font-medium text-gray-700 mb-3">Existing Sub Categories</h3>
						{loading && subCategories.length === 0 ? (
							<div className="text-center py-8">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto"></div>
								<p className="text-gray-500 mt-2">Loading sub categories...</p>
							</div>
						) : subCategories.length === 0 ? (
							<div className="text-center py-8 text-gray-500">
								<p>No sub categories found. Add one above to get started.</p>
							</div>
						) : (
							subCategories
								.filter(subCategory => subCategory.SubCategoryID != null && subCategory.SubCategory)
								.map((subCategory, index) => (
								<div
									key={`sub-modal-${subCategory.SubCategoryID}-${index}`}
									className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
								>
									{editingId === subCategory.SubCategoryID ? (
										<div className="flex items-center space-x-2 flex-1">
											<input
												type="text"
												value={editValue}
												onChange={(e) => {
													setEditValue(e.target.value);
													if (error && error.includes("Sub Category name")) {
														setError(null);
													}
												}}
												maxLength={255}
												disabled={loading}
												className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none disabled:bg-gray-100"
												onKeyPress={(e) => {
													if (e.key === 'Enter' && !loading && editValue.trim()) {
														handleUpdateSubCategory(subCategory.SubCategoryID);
													}
												}}
											/>
											<button
												onClick={() => handleUpdateSubCategory(subCategory.SubCategoryID)}
												disabled={loading || !editValue.trim()}
												className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center whitespace-nowrap"
											>
												{loading ? (
													<>
														<div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-1"></div>
														Saving...
													</>
												) : (
													<>
														<Save className="h-3.5 w-3.5 mr-1" />
														Update
													</>
												)}
											</button>
											<button
												onClick={cancelEdit}
												disabled={loading}
												className="px-4 py-2 text-sm text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded-lg transition-colors flex items-center"
											>
												<X className="h-3.5 w-3.5 mr-1" />
												Cancel
											</button>
										</div>
									) : (
										<>
											<div className="flex-1">
												{onSubCategorySelect ? (
													<button
														onClick={() => handleSubCategoryClick(subCategory.SubCategory)}
														className="text-left text-gray-900 hover:text-[#0b4d2b] transition-colors font-medium"
													>
														{subCategory.SubCategory}
													</button>
												) : (
													<span className="text-gray-900 font-medium">
														{subCategory.SubCategory}
													</span>
												)}
											</div>
											{hasManagePermission && (
												<div className="flex items-center space-x-2">
													<button
														onClick={() => startEdit(subCategory)}
														className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center"
														title="Edit sub category"
													>
														<Edit2 className="h-3.5 w-3.5 mr-1" />
														Edit
													</button>
													<button
														onClick={() => handleDeleteSubCategory(subCategory.SubCategoryID, subCategory.SubCategory)}
														className="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors flex items-center"
														title="Delete sub category"
													>
														<Trash2 className="h-3.5 w-3.5 mr-1" />
														Delete
													</button>
												</div>
											)}
										</>
									)}
								</div>
							))
						)}
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
					<button
						onClick={onClose}
						className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}














