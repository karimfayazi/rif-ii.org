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

type DocumentSubCategoryModalProps = {
	isOpen: boolean;
	onClose: () => void;
	onSubCategorySelect?: (subCategory: string) => void;
	onSubCategoryChange?: () => void;
	mainCategoryID: number | null;
	mainCategoryName: string;
};

export default function DocumentSubCategoryModal({ 
	isOpen, 
	onClose, 
	onSubCategorySelect,
	onSubCategoryChange,
	mainCategoryID, 
	mainCategoryName 
}: DocumentSubCategoryModalProps) {
	const { user, getUserId } = useAuth();
	const userId = user?.id || user?.username || getUserId() || null;
	const { canManageSubCategories, loading: accessLoading } = useAccess(userId);
	
	const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editValue, setEditValue] = useState("");
	const [newSubCategory, setNewSubCategory] = useState("");
	const [showAddForm, setShowAddForm] = useState(false);

	useEffect(() => {
		if (isOpen && mainCategoryID) {
			fetchSubCategories();
		}
	}, [isOpen, mainCategoryID]);

	const fetchSubCategories = async () => {
		if (!mainCategoryID) return;
		
		try {
			setLoading(true);
			const response = await fetch(`/api/documents/subcategories?mainCategoryID=${mainCategoryID}`);
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
		if (!newSubCategory.trim()) {
			setError("Sub Category name is required");
			return;
		}

		if (!mainCategoryID) {
			setError("Main Category is required");
			return;
		}

		try {
			setLoading(true);
			setError(null);
			
			const response = await fetch('/api/documents/subcategories', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ 
					mainCategoryID: mainCategoryID,
					subCategory: newSubCategory.trim() 
				}),
			});

			const data = await response.json();
			
			if (data.success) {
				setSubCategories(prev => [...prev, data.subCategory]);
				setNewSubCategory("");
				setShowAddForm(false);
				setSuccess("Sub Category added successfully");
				setTimeout(() => setSuccess(null), 3000);
				if (onSubCategoryChange) onSubCategoryChange();
			} else {
				setError(data.message || "Failed to add sub category");
			}
		} catch (err) {
			setError("Error adding sub category");
			console.error("Error adding sub category:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleUpdateSubCategory = async (id: number) => {
		if (!editValue.trim()) {
			setError("Sub Category name is required");
			return;
		}

		try {
			setLoading(true);
			setError(null);
			
			const response = await fetch('/api/documents/subcategories', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ 
					subCategoryID: id, 
					subCategory: editValue.trim() 
				}),
			});

			const data = await response.json();
			
			if (data.success) {
				setSubCategories(prev => 
					prev.map(subCat => 
						subCat.SubCategoryID === id 
							? { ...subCat, SubCategory: editValue.trim() }
							: subCat
					)
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
			setError("Error updating sub category");
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
			
			const response = await fetch(`/api/documents/subcategories?subCategoryID=${id}`, {
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
					{canManageSubCategories && (
						<div className="mb-6">
							{!showAddForm ? (
								<button
									onClick={() => setShowAddForm(true)}
									className="w-full flex items-center justify-center px-4 py-3 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors"
								>
									<Plus className="h-4 w-4 mr-2" />
									Add New Sub Category
								</button>
							) : (
							<div className="space-y-3">
								<div className="flex items-center space-x-2">
									<input
										type="text"
										value={newSubCategory}
										onChange={(e) => setNewSubCategory(e.target.value)}
										placeholder="Enter sub category name"
										className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
										onKeyPress={(e) => e.key === 'Enter' && handleAddSubCategory()}
									/>
									<button
										onClick={handleAddSubCategory}
										disabled={loading || !newSubCategory.trim()}
										className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										<Save className="h-4 w-4" />
									</button>
									<button
										onClick={() => {
											setShowAddForm(false);
											setNewSubCategory("");
										}}
										className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
									>
										<X className="h-4 w-4" />
									</button>
								</div>
							</div>
						)}
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
							subCategories.map((subCategory) => (
								<div
									key={subCategory.SubCategoryID}
									className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
								>
									{editingId === subCategory.SubCategoryID ? (
										<div className="flex items-center space-x-2 flex-1">
											<input
												type="text"
												value={editValue}
												onChange={(e) => setEditValue(e.target.value)}
												className="flex-1 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
												onKeyPress={(e) => e.key === 'Enter' && handleUpdateSubCategory(subCategory.SubCategoryID)}
											/>
											<button
												onClick={() => handleUpdateSubCategory(subCategory.SubCategoryID)}
												disabled={loading}
												className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
											>
												<Save className="h-4 w-4" />
											</button>
											<button
												onClick={cancelEdit}
												className="p-1 text-gray-500 hover:text-gray-700"
											>
												<X className="h-4 w-4" />
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
											{canManageSubCategories && (
												<div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
													<button
														onClick={() => startEdit(subCategory)}
														className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
														title="Edit sub category"
													>
														<Edit2 className="h-4 w-4" />
													</button>
													<button
														onClick={() => handleDeleteSubCategory(subCategory.SubCategoryID, subCategory.SubCategory)}
														className="p-1 text-red-600 hover:text-red-700 transition-colors"
														title="Delete sub category"
													>
														<Trash2 className="h-4 w-4" />
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





