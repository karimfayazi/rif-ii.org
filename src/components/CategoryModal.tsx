"use client";

import { useState, useEffect } from "react";
import { X, Plus, Edit2, Trash2, Save, AlertCircle } from "lucide-react";
import { useAccess } from "@/hooks/useAccess";
import { useAuth } from "@/hooks/useAuth";

type Category = {
	MainCategoryID: number;
	Category: string;
};

type CategoryModalProps = {
	isOpen: boolean;
	onClose: () => void;
	onCategorySelect: (category: string) => void;
	onDataChange?: () => void; // Callback to refresh parent component
};

export default function CategoryModal({ isOpen, onClose, onCategorySelect, onDataChange }: CategoryModalProps) {
	const { user, getUserId } = useAuth();
	const userId = user?.id || user?.username || getUserId() || null;
	const { canManageCategories, isAdmin, loading: accessLoading } = useAccess(userId);
	
	// Allow managing categories if user is admin or has explicit permission
	// This handles cases where permission check is still loading
	const hasManagePermission = canManageCategories || isAdmin;
	
	// Debug: Log permission status
	useEffect(() => {
		if (isOpen) {
			console.log('[CategoryModal] User:', user);
			console.log('[CategoryModal] User ID:', userId);
			console.log('[CategoryModal] Is Admin:', isAdmin);
			console.log('[CategoryModal] Can Manage Categories:', canManageCategories);
			console.log('[CategoryModal] Has Manage Permission:', hasManagePermission);
			console.log('[CategoryModal] Access Loading:', accessLoading);
		}
	}, [isOpen, user, userId, isAdmin, canManageCategories, hasManagePermission, accessLoading]);
	
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editValue, setEditValue] = useState("");
	const [newCategory, setNewCategory] = useState("");

	useEffect(() => {
		if (isOpen) {
			fetchCategories();
		}
	}, [isOpen]);

	const fetchCategories = async () => {
		try {
			setLoading(true);
			const response = await fetch('/api/pictures/categories');
			const data = await response.json();
			
			if (data.success) {
				// Ensure IDs are parsed as numbers
				const categoriesWithNumericIds = (data.categories || []).map((cat: any) => ({
					MainCategoryID: Number(cat.MainCategoryID),
					Category: cat.Category
				}));
				setCategories(categoriesWithNumericIds);
			} else {
				setError(data.message || "Failed to fetch categories");
			}
		} catch (err) {
			setError("Error fetching categories");
			console.error("Error fetching categories:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleAddCategory = async () => {
		if (!newCategory.trim()) {
			setError("Category name is required");
			return;
		}

		try {
			setLoading(true);
			setError(null);
			
			const response = await fetch('/api/pictures/categories', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ category: newCategory.trim() }),
			});

			const data = await response.json();
			
			if (response.ok && data.MainCategoryID) {
				// Parse ID as number and add to list
				const newCat = {
					MainCategoryID: Number(data.MainCategoryID),
					Category: data.Category
				};
				setCategories(prev => [...prev, newCat]);
				setNewCategory("");
				setSuccess("Category added successfully");
				setTimeout(() => setSuccess(null), 3000);
				// Refresh list and notify parent
				fetchCategories();
				onDataChange?.();
			} else {
				setError(data.message || "Failed to add category");
			}
		} catch (err) {
			setError("Error adding category");
			console.error("Error adding category:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleUpdateCategory = async (id: number) => {
		if (!editValue.trim()) {
			setError("Category name is required");
			return;
		}

		try {
			setLoading(true);
			setError(null);
			
			// Use URL parameter for ID as per requirements
			const response = await fetch(`/api/pictures/categories?id=${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ 
					category: editValue.trim() 
				}),
			});

			const data = await response.json();
			
			if (data.success) {
				// Refresh list from server to ensure consistency
				await fetchCategories();
				setEditingId(null);
				setEditValue("");
				setSuccess("Category updated successfully");
				setTimeout(() => setSuccess(null), 3000);
				// Notify parent to refresh
				onDataChange?.();
			} else {
				setError(data.message || "Failed to update category");
			}
		} catch (err) {
			setError("Error updating category");
			console.error("Error updating category:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteCategory = async (id: number, categoryName: string) => {
		if (!confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) {
			return;
		}

		try {
			setLoading(true);
			setError(null);
			
			const response = await fetch(`/api/pictures/categories?mainCategoryID=${id}`, {
				method: 'DELETE',
			});

			const data = await response.json();
			
			if (data.success) {
				setCategories(prev => prev.filter(cat => cat.MainCategoryID !== id));
				setSuccess("Category deleted successfully");
				setTimeout(() => setSuccess(null), 3000);
				// Refresh list and notify parent
				fetchCategories();
				onDataChange?.();
			} else {
				// Handle 409 conflict (has subcategories)
				if (response.status === 409) {
					setError(data.message || "Cannot delete category because it has subcategories");
				} else {
					setError(data.message || "Failed to delete category");
				}
			}
		} catch (err) {
			setError("Error deleting category");
			console.error("Error deleting category:", err);
		} finally {
			setLoading(false);
		}
	};

	const startEdit = (category: Category) => {
		setEditingId(category.MainCategoryID);
		setEditValue(category.Category);
	};

	const cancelEdit = () => {
		setEditingId(null);
		setEditValue("");
	};

	const handleCategoryClick = (category: string) => {
		onCategorySelect(category);
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#0b4d2b] to-[#0a3d24] text-white">
					<div>
						<h2 className="text-xl font-semibold">Manage Main Categories</h2>
						<p className="text-sm opacity-90">Add, edit, or delete picture categories</p>
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

					{/* Add New Category */}
					{hasManagePermission && (
						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Category Name
							</label>
							<div className="flex items-center space-x-2">
								<input
									type="text"
									value={newCategory}
									onChange={(e) => setNewCategory(e.target.value)}
									placeholder="Enter category name"
									className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
									onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
								/>
								<button
									onClick={handleAddCategory}
									disabled={loading || !newCategory.trim()}
									className="px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
								>
									<Plus className="h-4 w-4 mr-1" />
									Add
								</button>
								{newCategory && (
									<button
										onClick={() => setNewCategory("")}
										className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
									>
										Cancel
									</button>
								)}
							</div>
						</div>
					)}

					{/* Categories List */}
					<div className="space-y-2">
						<h3 className="text-sm font-medium text-gray-700 mb-3">Existing Categories</h3>
						{loading && categories.length === 0 ? (
							<div className="text-center py-8">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto"></div>
								<p className="text-gray-500 mt-2">Loading categories...</p>
							</div>
						) : categories.length === 0 ? (
							<div className="text-center py-8 text-gray-500">
								<p>No categories found. Add one above to get started.</p>
							</div>
						) : (
							categories.map((category) => (
								<div
									key={category.MainCategoryID}
									className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
								>
									{editingId === category.MainCategoryID ? (
										<div className="flex items-center space-x-2 flex-1">
											<input
												type="text"
												value={editValue}
												onChange={(e) => setEditValue(e.target.value)}
												className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
												onKeyPress={(e) => e.key === 'Enter' && handleUpdateCategory(category.MainCategoryID)}
											/>
											<button
												onClick={() => handleUpdateCategory(category.MainCategoryID)}
												disabled={loading || !editValue.trim()}
												className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center"
											>
												<Save className="h-3.5 w-3.5 mr-1" />
												Update
											</button>
											<button
												onClick={cancelEdit}
												className="px-4 py-2 text-sm text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors flex items-center"
											>
												<X className="h-3.5 w-3.5 mr-1" />
												Cancel
											</button>
										</div>
									) : (
										<>
											<div className="flex-1">
												<button
													onClick={() => handleCategoryClick(category.Category)}
													className="text-left text-gray-900 hover:text-[#0b4d2b] transition-colors font-medium"
												>
													{category.Category}
												</button>
											</div>
											{hasManagePermission && (
												<div className="flex items-center space-x-2">
													<button
														onClick={() => startEdit(category)}
														className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center"
														title="Edit category"
													>
														<Edit2 className="h-3.5 w-3.5 mr-1" />
														Edit
													</button>
													<button
														onClick={() => handleDeleteCategory(category.MainCategoryID, category.Category)}
														className="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors flex items-center"
														title="Delete category"
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
