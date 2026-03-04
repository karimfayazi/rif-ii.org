"use client";

import { useEffect, useState } from "react";
import {
	ExternalLink,
	Search,
	Plus,
	Pencil,
	Trash2,
	X,
	Loader2,
	CheckCircle,
	AlertCircle,
} from "lucide-react";

type LinkData = {
	LinkID: number;
	Title: string;
	Description: string | null;
	Url: string;
};

const URL_REGEX = /^https?:\/\/.+/i;

function validateUrl(url: string): boolean {
	return URL_REGEX.test(url.trim());
}

export default function LinksPage() {
	const [links, setLinks] = useState<LinkData[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const [modalOpen, setModalOpen] = useState(false);
	const [editingLink, setEditingLink] = useState<LinkData | null>(null);
	const [formTitle, setFormTitle] = useState("");
	const [formDescription, setFormDescription] = useState("");
	const [formUrl, setFormUrl] = useState("");
	const [formErrors, setFormErrors] = useState<{ title?: string; url?: string }>({});
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	const [deleteConfirm, setDeleteConfirm] = useState<LinkData | null>(null);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		fetchLinks();
	}, []);

	const fetchLinks = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await fetch("/api/links");
			const data = await response.json();

			if (data.success) {
				setLinks(data.links || []);
			} else {
				setError(data.message || "Failed to fetch links");
			}
		} catch (err) {
			setError("Error fetching links");
			console.error("Error fetching links:", err);
		} finally {
			setLoading(false);
		}
	};

	const filteredLinks = links.filter(
		(link) =>
			link.Title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			(link.Description || "").toLowerCase().includes(searchTerm.toLowerCase())
	);

	const openAddModal = () => {
		setEditingLink(null);
		setFormTitle("");
		setFormDescription("");
		setFormUrl("");
		setFormErrors({});
		setSaveError(null);
		setModalOpen(true);
	};

	const openEditModal = (link: LinkData) => {
		setEditingLink(link);
		setFormTitle(link.Title);
		setFormDescription(link.Description || "");
		setFormUrl(link.Url);
		setFormErrors({});
		setSaveError(null);
		setModalOpen(true);
	};

	const closeModal = () => {
		if (!saving) {
			setModalOpen(false);
			setEditingLink(null);
			setFormTitle("");
			setFormDescription("");
			setFormUrl("");
			setFormErrors({});
			setSaveError(null);
		}
	};

	const validateForm = (): boolean => {
		const err: { title?: string; url?: string } = {};
		if (!formTitle.trim()) err.title = "Title is required";
		if (!formUrl.trim()) err.url = "Url is required";
		else if (!validateUrl(formUrl)) err.url = "Url must start with http:// or https://";
		setFormErrors(err);
		return Object.keys(err).length === 0;
	};

	const handleSave = async () => {
		if (!validateForm()) return;
		setSaving(true);
		setSaveError(null);
		try {
			if (editingLink) {
				const response = await fetch(`/api/links/${editingLink.LinkID}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						Title: formTitle.trim(),
						Description: formDescription.trim() || null,
						Url: formUrl.trim(),
					}),
				});
				const data = await response.json();
				if (data.success) {
					closeModal();
					setSuccessMessage("Link updated successfully");
					setTimeout(() => setSuccessMessage(null), 3000);
					await fetchLinks();
				} else {
					setSaveError(data.message || "Failed to update link");
				}
			} else {
				const response = await fetch("/api/links", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						Title: formTitle.trim(),
						Description: formDescription.trim() || null,
						Url: formUrl.trim(),
					}),
				});
				const data = await response.json();
				if (data.success) {
					closeModal();
					setSuccessMessage("Link created successfully");
					setTimeout(() => setSuccessMessage(null), 3000);
					await fetchLinks();
				} else {
					setSaveError(data.message || "Failed to create link");
				}
			}
		} catch (err) {
			setSaveError("Something went wrong. Please try again.");
			console.error("Save link error:", err);
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!deleteConfirm) return;
		setDeleting(true);
		setError(null);
		try {
			const response = await fetch(`/api/links/${deleteConfirm.LinkID}`, {
				method: "DELETE",
			});
			const data = await response.json();
			if (data.success) {
				setDeleteConfirm(null);
				setSuccessMessage("Link deleted successfully");
				setTimeout(() => setSuccessMessage(null), 3000);
				await fetchLinks();
			} else {
				setError(data.message || "Failed to delete link");
			}
		} catch (err) {
			setError("Failed to delete link. Please try again.");
			console.error("Delete link error:", err);
		} finally {
			setDeleting(false);
		}
	};

	const openLink = (url: string) => {
		window.open(url, "_blank", "noopener,noreferrer");
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Important Links</h1>
					<p className="text-gray-600 mt-2">Access important resources and external links</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]" />
					<span className="ml-3 text-gray-600">Loading links...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header + Add Link + Search */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Important Links</h1>
					<p className="text-gray-600 mt-2">Access important resources and external links</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={openAddModal}
						className="inline-flex items-center justify-center px-4 py-2 h-10 text-sm font-medium bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors"
					>
						<Plus className="h-4 w-4 mr-2" />
						Add Link
					</button>
					<div className="relative w-full sm:w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
						<input
							type="text"
							placeholder="Search by title or description..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full h-10 pl-9 pr-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
						/>
					</div>
				</div>
			</div>

			{/* Success message */}
			{successMessage && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
					<div className="flex items-center">
						<CheckCircle className="h-5 w-5 text-green-600 mr-3" />
						<p className="text-green-800 font-medium">{successMessage}</p>
					</div>
					<button
						type="button"
						onClick={() => setSuccessMessage(null)}
						className="text-green-600 hover:text-green-800 transition-colors"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
			)}

			{/* Error message */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
					<div className="flex items-center">
						<AlertCircle className="h-5 w-5 text-red-600 mr-3" />
						<p className="text-red-800 font-medium">{error}</p>
					</div>
					<button
						type="button"
						onClick={() => setError(null)}
						className="text-red-600 hover:text-red-800 transition-colors"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
			)}

			{/* Table */}
			<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-gray-50 border-b border-gray-200">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Title
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Description
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Url
								</th>
								<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{filteredLinks.length === 0 ? (
								<tr>
									<td colSpan={4} className="px-4 py-12 text-center text-gray-600">
										{searchTerm ? "No links match your search." : "No links yet. Click Add Link to create one."}
									</td>
								</tr>
							) : (
								filteredLinks.map((link) => (
									<tr key={link.LinkID} className="hover:bg-gray-50">
										<td className="px-4 py-3 text-sm font-medium text-gray-900">{link.Title}</td>
										<td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
											{link.Description || "—"}
										</td>
										<td className="px-4 py-3 text-sm">
											<a
												href={link.Url}
												target="_blank"
												rel="noopener noreferrer"
												className="text-[#0b4d2b] hover:underline inline-flex items-center gap-1"
											>
												{link.Url}
												<ExternalLink className="h-3 w-3 flex-shrink-0" />
											</a>
										</td>
										<td className="px-4 py-3 text-right">
											<div className="flex items-center justify-end gap-2">
												<button
													type="button"
													onClick={() => openEditModal(link)}
													className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
												>
													<Pencil className="h-3 w-3 mr-1" />
													Edit
												</button>
												<button
													type="button"
													onClick={() => setDeleteConfirm(link)}
													className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
												>
													<Trash2 className="h-3 w-3 mr-1" />
													Delete
												</button>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Add/Edit Modal */}
			{modalOpen && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-xl max-w-md w-full">
						<div className="flex items-center justify-between p-4 border-b border-gray-200">
							<h2 className="text-lg font-semibold text-gray-900">
								{editingLink ? "Edit Link" : "Add Link"}
							</h2>
							<button
								type="button"
								onClick={closeModal}
								disabled={saving}
								className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<div className="p-4 space-y-4">
							{saveError && (
								<div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
									{saveError}
								</div>
							)}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Title <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formTitle}
									onChange={(e) => setFormTitle(e.target.value)}
									className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									placeholder="Link title"
								/>
								{formErrors.title && (
									<p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
								<textarea
									value={formDescription}
									onChange={(e) => setFormDescription(e.target.value)}
									rows={2}
									className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									placeholder="Optional description"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Url <span className="text-red-500">*</span>
								</label>
								<input
									type="url"
									value={formUrl}
									onChange={(e) => setFormUrl(e.target.value)}
									className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
									placeholder="https://example.com"
								/>
								{formErrors.url && (
									<p className="mt-1 text-sm text-red-600">{formErrors.url}</p>
								)}
							</div>
						</div>
						<div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
							<button
								type="button"
								onClick={closeModal}
								disabled={saving}
								className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSave}
								disabled={saving}
								className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#0b4d2b] rounded-lg hover:bg-[#0a3d24] disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{saving ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Saving...
									</>
								) : (
									"Save"
								)}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Delete confirmation */}
			{deleteConfirm && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
						<h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Link</h3>
						<p className="text-gray-600 mb-4">
							Are you sure you want to delete this link?
						</p>
						<p className="text-sm font-medium text-gray-700 mb-1">{deleteConfirm.Title}</p>
						<p className="text-xs text-gray-500 truncate mb-6">{deleteConfirm.Url}</p>
						<div className="flex justify-end gap-3">
							<button
								type="button"
								onClick={() => setDeleteConfirm(null)}
								disabled={deleting}
								className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleDelete}
								disabled={deleting}
								className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{deleting ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Deleting...
									</>
								) : (
									"Delete"
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
