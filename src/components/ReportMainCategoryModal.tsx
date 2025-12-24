"use client";

import { useState, useEffect } from "react";
import { X, Plus, Edit2, Trash2, Save, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";

type Category = {
	MainCategoryID: number;
	Category: string;
};

type ReportMainCategoryModalProps = {
	isOpen: boolean;
	onClose: () => void;
	onCategorySelect?: (category: string) => void;
	onCategoryChange?: () => void;
};

export default function ReportMainCategoryModal({ 
	isOpen, 
	onClose, 
	onCategorySelect,
	onCategoryChange 
}: ReportMainCategoryModalProps) {
	const { user, getUserId } = useAuth();
	const userId = user?.id || user?.username || getUserId() || null;
	const { canManageCategories, loading: accessLoading } = useAccess(userId);
	
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editValue, setEditValue] = useState("");
	const [newCategory, setNewCategory] = useState("");
	const [showAddForm, setShowAddForm] = useState(false);

	useEffect(() => {
		if (isOpen) {
			fetchCategories();
		}
	}, [isOpen]);

	const fetchCategories = async () => {
		try {
			setLoading(true);
			const response = await fetch('/api/reports/categories');
			const data = await response.json();
			
			if (data.success) {
				setCategories(data.categories || []);
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
			
			const response = await fetch('/api/reports/categories', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ category: newCategory.trim() }),
			});

			const data = await response.json();
			
			if (data.success) {
				setCategories(prev => [...prev, data.category]);
				setNewCategory("");
				setShowAddForm(false);
				setSuccess("Category added successfully");
				setTimeout(() => setSuccess(null), 3000);
				if (onCategoryChange) onCategoryChange();
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
			
			const response = await fetch('/api/reports/categories', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ 
					mainCategoryID: id, 
					category: editValue.trim() 
				}),
			});

			const data = await response.json();
			
			if (data.success) {
				setCategories(prev => 
					prev.map(cat => 
						cat.MainCategoryID === id 
							? { ...cat, Category: editValue.trim() }
							: cat
					)
				);
				setEditingId(null);
				setEditValue("");
				setSuccess("Category updated successfully");
				setTimeout(() => setSuccess(null), 3000);
				if (onCategoryChange) onCategoryChange();
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
			
			const response = await fetch(`/api/reports/categories?mainCategoryID=${id}`, {
				method: 'DELETE',
			});

			const data = await response.json();
			
			if (data.success) {
				setCategories(prev => prev.filter(cat => cat.MainCategoryID !== id));
				setSuccess("Category deleted successfully");
				setTimeout(() => setSuccess(null), 3000);
				if (onCategoryChange) onCategoryChange();
			} else {
				setError(data.message || "Failed to delete category");
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
		if (onCategorySelect) {
			onCategorySelect(category);
		}
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
						<p className="text-sm opacity-90">Add, edit, or delete report main categories</p>
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
					{canManageCategories && (
						<div className="mb-6">
							{!showAddForm ? (
								<button
									onClick={() => setShowAddForm(true)}
									className="w-full flex items-center justify-center px-4 py-3 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors"
								>
									<Plus className="h-4 w-4 mr-2" />
									Add New Category
								</button>
							) : (
							<div className="space-y-3">
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
										className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										<Save className="h-4 w-4" />
									</button>
									<button
										onClick={() => {
											setShowAddForm(false);
											setNewCategory("");
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
												className="flex-1 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
												onKeyPress={(e) => e.key === 'Enter' && handleUpdateCategory(category.MainCategoryID)}
											/>
											<button
												onClick={() => handleUpdateCategory(category.MainCategoryID)}
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
												{onCategorySelect ? (
													<button
														onClick={() => handleCategoryClick(category.Category)}
														className="text-left text-gray-900 hover:text-[#0b4d2b] transition-colors font-medium"
													>
														{category.Category}
													</button>
												) : (
													<span className="text-gray-900 font-medium">
														{category.Category}
													</span>
												)}
											</div>
											{canManageCategories && (
												<div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
													<button
														onClick={() => startEdit(category)}
														className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
														title="Edit category"
													>
														<Edit2 className="h-4 w-4" />
													</button>
													<button
														onClick={() => handleDeleteCategory(category.MainCategoryID, category.Category)}
														className="p-1 text-red-600 hover:text-red-700 transition-colors"
														title="Delete category"
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














