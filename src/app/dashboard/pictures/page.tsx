"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
	Filter, RefreshCw, Eye, X, Calendar, User, FileImage,
	CheckCircle, ExternalLink, Trash2, AlertCircle, Loader2, Upload
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";
import Link from "next/link";

type SummaryRow = {
	GroupName: string | null;
	MainCategory: string | null;
	SubCategory: string | null;
	PictureCount: number;
	LatestUploadDate: string | null;
	LatestEventDate: string | null;
};

type PictureRow = {
	PictureID: number;
	GroupName: string | null;
	MainCategory: string | null;
	SubCategory: string | null;
	FileName: string | null;
	FilePath: string | null;
	FileSizeKB: number | null;
	UploadedBy: string | null;
	UploadDate: string | null;
	IsActive: boolean | null;
	EventDate: string | null;
};

type GalleryModalState = {
	groupName: string | null;
	mainCategory: string | null;
	subCategory: string | null;
	pictures: PictureRow[];
	loading: boolean;
};

type FilterState = {
	search: string;
	groupName: string;
	mainCategory: string;
	subCategory: string;
	uploadedBy: string;
	isActive: 'all' | '1' | '0';
	uploadFrom: string;
	uploadTo: string;
	eventFrom: string;
	eventTo: string;
	sortBy: string;
	sortDir: 'asc' | 'desc';
	page: number;
	pageSize: number;
};

export default function PicturesPage() {
	const { user, getUserId } = useAuth();
	const userId = user?.id || user?.username || getUserId() || null;
	const { isAdmin, accessDelete, canUploadPictures, loading: accessLoading } = useAccess(userId);
	const router = useRouter();
	const searchParams = useSearchParams();

	const [summaryData, setSummaryData] = useState<SummaryRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [totalPictures, setTotalPictures] = useState(0);

	const [galleryModal, setGalleryModal] = useState<GalleryModalState | null>(null);
	const [viewModal, setViewModal] = useState<PictureRow | null>(null);
	const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; picture: PictureRow | null }>({ show: false, picture: null });
	const [deleting, setDeleting] = useState(false);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [showFilters, setShowFilters] = useState(false);

	const [groupNames, setGroupNames] = useState<string[]>([]);
	const [mainCategories, setMainCategories] = useState<string[]>([]);
	const [subCategories, setSubCategories] = useState<string[]>([]);
	const [uploadedByList, setUploadedByList] = useState<string[]>([]);

	const [filters, setFilters] = useState<FilterState>(() => ({
		search: searchParams.get('search') || '',
		groupName: searchParams.get('groupName') || '',
		mainCategory: searchParams.get('mainCategory') || '',
		subCategory: searchParams.get('subCategory') || '',
		uploadedBy: searchParams.get('uploadedBy') || '',
		isActive: (searchParams.get('isActive') as 'all' | '1' | '0') || 'all',
		uploadFrom: searchParams.get('uploadFrom') || '',
		uploadTo: searchParams.get('uploadTo') || '',
		eventFrom: searchParams.get('eventFrom') || '',
		eventTo: searchParams.get('eventTo') || '',
		sortBy: searchParams.get('sortBy') || 'LatestUploadDate',
		sortDir: (searchParams.get('sortDir') as 'asc' | 'desc') || 'desc',
		page: parseInt(searchParams.get('page') || '1'),
		pageSize: parseInt(searchParams.get('pageSize') || '20'),
	}));

	const canDelete = isAdmin || accessDelete;

	const apiFilterKey = JSON.stringify({
		s: filters.search, g: filters.groupName, m: filters.mainCategory,
		sc: filters.subCategory, u: filters.uploadedBy, a: filters.isActive,
		uf: filters.uploadFrom, ut: filters.uploadTo, ef: filters.eventFrom, et: filters.eventTo,
	});

	useEffect(() => {
		fetchSummary();
	}, [apiFilterKey]);

	const allFilterKey = JSON.stringify(filters);
	useEffect(() => {
		updateURL();
	}, [allFilterKey]);

	const fetchSummary = async () => {
		try {
			setLoading(true);
			setError(null);

			const params = new URLSearchParams();
			if (filters.search) params.append('search', filters.search);
			if (filters.groupName) params.append('groupName', filters.groupName);
			if (filters.mainCategory) params.append('mainCategory', filters.mainCategory);
			if (filters.subCategory) params.append('subCategory', filters.subCategory);
			if (filters.uploadedBy) params.append('uploadedBy', filters.uploadedBy);
			if (filters.isActive !== 'all') params.append('isActive', filters.isActive);
			if (filters.uploadFrom) params.append('uploadFrom', filters.uploadFrom);
			if (filters.uploadTo) params.append('uploadTo', filters.uploadTo);
			if (filters.eventFrom) params.append('eventFrom', filters.eventFrom);
			if (filters.eventTo) params.append('eventTo', filters.eventTo);

			const response = await fetch(`/api/pictures/summary-list?${params.toString()}`);
			const data = await response.json();

			if (data.error) {
				setError(data.message || data.error);
				return;
			}

			setSummaryData(data.data || []);
			setTotalPictures(data.totalPictures || 0);

			if (data.filters) {
				setGroupNames(data.filters.groupNames || []);
				setMainCategories(data.filters.mainCategories || []);
				setSubCategories(data.filters.subCategories || []);
				setUploadedByList(data.filters.uploadedByList || []);
			}
		} catch (err) {
			console.error("Error fetching summary:", err);
			setError("Failed to load pictures. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const updateURL = () => {
		const params = new URLSearchParams();
		if (filters.search) params.set('search', filters.search);
		if (filters.groupName) params.set('groupName', filters.groupName);
		if (filters.mainCategory) params.set('mainCategory', filters.mainCategory);
		if (filters.subCategory) params.set('subCategory', filters.subCategory);
		if (filters.uploadedBy) params.set('uploadedBy', filters.uploadedBy);
		if (filters.isActive !== 'all') params.set('isActive', filters.isActive);
		if (filters.uploadFrom) params.set('uploadFrom', filters.uploadFrom);
		if (filters.uploadTo) params.set('uploadTo', filters.uploadTo);
		if (filters.eventFrom) params.set('eventFrom', filters.eventFrom);
		if (filters.eventTo) params.set('eventTo', filters.eventTo);
		if (filters.sortBy !== 'LatestUploadDate') params.set('sortBy', filters.sortBy);
		if (filters.sortDir !== 'desc') params.set('sortDir', filters.sortDir);
		if (filters.page !== 1) params.set('page', filters.page.toString());
		if (filters.pageSize !== 20) params.set('pageSize', filters.pageSize.toString());

		router.replace(`/dashboard/pictures?${params.toString()}`, { scroll: false });
	};

	const handleFilterChange = (key: keyof FilterState, value: any) => {
		setFilters(prev => {
			const next: FilterState = { ...prev, [key]: value };
			if (key !== 'page') next.page = 1;
			if (key === 'mainCategory' && value !== prev.mainCategory) next.subCategory = '';
			return next;
		});
	};

	const resetFilters = () => {
		setFilters({
			search: '', groupName: '', mainCategory: '', subCategory: '',
			uploadedBy: '', isActive: 'all', uploadFrom: '', uploadTo: '',
			eventFrom: '', eventTo: '', sortBy: 'LatestUploadDate', sortDir: 'desc',
			page: 1, pageSize: 20,
		});
		router.replace('/dashboard/pictures', { scroll: false });
	};

	const handleSort = (column: string) => {
		setFilters(prev => ({
			...prev,
			sortBy: column,
			sortDir: prev.sortBy === column && prev.sortDir === 'asc' ? 'desc' : 'asc',
			page: 1,
		}));
	};

	const parseDate105 = (d: string | null): number => {
		if (!d) return 0;
		const parts = d.split('-');
		if (parts.length !== 3) return 0;
		return parseInt(parts[2] + parts[1] + parts[0]);
	};

	const sortedData = useMemo(() => {
		const sorted = [...summaryData];
		sorted.sort((a, b) => {
			let cmp = 0;
			switch (filters.sortBy) {
				case 'GroupName':
					cmp = (a.GroupName || '').localeCompare(b.GroupName || ''); break;
				case 'MainCategory':
					cmp = (a.MainCategory || '').localeCompare(b.MainCategory || ''); break;
				case 'SubCategory':
					cmp = (a.SubCategory || '').localeCompare(b.SubCategory || ''); break;
				case 'PictureCount':
					cmp = a.PictureCount - b.PictureCount; break;
				case 'LatestUploadDate':
					cmp = parseDate105(a.LatestUploadDate) - parseDate105(b.LatestUploadDate); break;
				case 'LatestEventDate':
					cmp = parseDate105(a.LatestEventDate) - parseDate105(b.LatestEventDate); break;
				default:
					cmp = parseDate105(a.LatestUploadDate) - parseDate105(b.LatestUploadDate);
			}
			return filters.sortDir === 'asc' ? cmp : -cmp;
		});
		return sorted;
	}, [summaryData, filters.sortBy, filters.sortDir]);

	const startIdx = (filters.page - 1) * filters.pageSize;
	const totalPages = Math.max(1, Math.ceil(sortedData.length / filters.pageSize));
	const paginatedData = useMemo(() => {
		return sortedData.slice(startIdx, startIdx + filters.pageSize);
	}, [sortedData, startIdx, filters.pageSize]);

	const openGallery = async (row: SummaryRow) => {
		setGalleryModal({
			groupName: row.GroupName,
			mainCategory: row.MainCategory,
			subCategory: row.SubCategory,
			pictures: [],
			loading: true,
		});

		try {
			const params = new URLSearchParams();
			if (row.GroupName) params.append('groupName', row.GroupName);
			if (row.MainCategory) params.append('mainCategory', row.MainCategory);
			if (row.SubCategory) params.append('subCategory', row.SubCategory);

			const response = await fetch(`/api/pictures/details?${params.toString()}`);
			const data = await response.json();

			if (data.success && data.pictures) {
				setGalleryModal(prev => prev ? { ...prev, pictures: data.pictures, loading: false } : null);
			} else {
				setGalleryModal(prev => prev ? { ...prev, loading: false } : null);
			}
		} catch (err) {
			console.error('Error fetching gallery:', err);
			setGalleryModal(prev => prev ? { ...prev, loading: false } : null);
		}
	};

	const getImageUrl = (filePath: string | null) => {
		if (!filePath) return '';
		if (filePath.startsWith('https://') || filePath.startsWith('http://')) return filePath;
		let normalizedPath = filePath.replace(/\\/g, '/');
		normalizedPath = normalizedPath.replace(/^[A-Za-z]:/, '');
		if (normalizedPath.startsWith('~/')) normalizedPath = normalizedPath.substring(2);
		normalizedPath = normalizedPath.replace(/^\/+/, '');
		if (!normalizedPath.startsWith('uploads/')) {
			if (normalizedPath.includes('pictures/')) normalizedPath = `uploads/${normalizedPath}`;
			else if (!normalizedPath.startsWith('public/')) normalizedPath = `uploads/pictures/${normalizedPath}`;
		}
		if (normalizedPath.startsWith('public/')) normalizedPath = normalizedPath.substring(7);
		const relativePath = normalizedPath.startsWith('uploads/') ? normalizedPath.substring(8) : normalizedPath;
		const encodedPath = relativePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
		return `/api/pictures/file/${encodedPath}`;
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		if (dateString.includes(' ')) return dateString.split(' ')[0];
		return dateString;
	};

	const handleDelete = async (picture: PictureRow) => {
		try {
			setDeleting(true);
			setError(null);

			const response = await fetch(`/api/pictures/delete?pictureId=${picture.PictureID}`, {
				method: 'DELETE',
				credentials: 'include',
			});

			const data = await response.json();

			if (data.success) {
				setDeleteConfirm({ show: false, picture: null });
				setSuccessMessage('Picture deleted successfully');
				setTimeout(() => setSuccessMessage(null), 3000);

				if (viewModal?.PictureID === picture.PictureID) setViewModal(null);

				setGalleryModal(prev => {
					if (!prev) return null;
					const updated = prev.pictures.filter(p => p.PictureID !== picture.PictureID);
					if (updated.length === 0) return null;
					return { ...prev, pictures: updated };
				});

				await fetchSummary();
			} else {
				setError(data.message || 'Failed to delete picture');
				setDeleteConfirm({ show: false, picture: null });
			}
		} catch (err) {
			console.error('Error deleting picture:', err);
			setError('Error deleting picture. Please try again.');
			setDeleteConfirm({ show: false, picture: null });
		} finally {
			setDeleting(false);
		}
	};

	const renderSortHeader = (column: string, label: string) => (
		<th
			className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none transition-colors"
			onClick={() => handleSort(column)}
		>
			<div className="flex items-center gap-1">
				{label}
				{filters.sortBy === column && (
					<span className="text-[#0b4d2b] font-bold">{filters.sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
				)}
			</div>
		</th>
	);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Pictures</h1>
					<p className="text-sm text-gray-600 mt-1">Manage and view all uploaded pictures</p>
				</div>
				<div className="flex items-center gap-3">
					{(isAdmin || canUploadPictures) && (
						<Link
							href="/dashboard/pictures/upload"
							className="inline-flex items-center justify-center px-4 py-2 h-10 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
						>
							<Upload className="h-4 w-4 mr-2 flex-shrink-0" />
							Upload Pictures
						</Link>
					)}
					<button
						onClick={() => setShowFilters(!showFilters)}
						className="inline-flex items-center justify-center px-4 py-2 h-10 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
					>
						<Filter className="h-4 w-4 mr-2 flex-shrink-0" />
						{showFilters ? 'Hide' : 'Show'} Filters
					</button>
					<button
						onClick={fetchSummary}
						disabled={loading}
						className="inline-flex items-center justify-center px-4 py-2 h-10 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
					>
						<RefreshCw className={`h-4 w-4 mr-2 flex-shrink-0 ${loading ? 'animate-spin' : ''}`} />
						Refresh
					</button>
				</div>
			</div>

			{/* Filters Panel */}
			{showFilters && (
				<div className="bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 shadow-lg p-3">
					<div className="space-y-3">
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">
								Search (FileName or GroupName)
							</label>
							<input
								type="text"
								value={filters.search}
								onChange={(e) => handleFilterChange('search', e.target.value)}
								placeholder="Search pictures..."
								className="w-full h-9 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							/>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
							<div className="min-w-0">
								<label className="block text-xs font-medium text-gray-700 mb-1">Group Name</label>
								<select
									value={filters.groupName}
									onChange={(e) => handleFilterChange('groupName', e.target.value)}
									className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								>
									<option value="">All Groups</option>
									{groupNames.map(g => <option key={g} value={g}>{g}</option>)}
								</select>
							</div>
							<div className="min-w-0">
								<label className="block text-xs font-medium text-gray-700 mb-1">Main Category</label>
								<select
									value={filters.mainCategory}
									onChange={(e) => handleFilterChange('mainCategory', e.target.value)}
									className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								>
									<option value="">All Categories</option>
									{mainCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
								</select>
							</div>
							<div className="min-w-0">
								<label className="block text-xs font-medium text-gray-700 mb-1">Sub Category</label>
								<select
									value={filters.subCategory}
									onChange={(e) => handleFilterChange('subCategory', e.target.value)}
									disabled={!filters.mainCategory}
									className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
								>
									<option value="">All Sub Categories</option>
									{subCategories.map(sub => <option key={sub} value={sub}>{sub}</option>)}
								</select>
							</div>
							<div className="min-w-0">
								<label className="block text-xs font-medium text-gray-700 mb-1">Uploaded By</label>
								<select
									value={filters.uploadedBy}
									onChange={(e) => handleFilterChange('uploadedBy', e.target.value)}
									className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								>
									<option value="">All Users</option>
									{uploadedByList.map(u => <option key={u} value={u}>{u}</option>)}
								</select>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
							<div className="min-w-0">
								<label className="block text-xs font-medium text-gray-700 mb-1">Upload Date From</label>
								<input type="date" value={filters.uploadFrom} onChange={(e) => handleFilterChange('uploadFrom', e.target.value)} className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent" />
							</div>
							<div className="min-w-0">
								<label className="block text-xs font-medium text-gray-700 mb-1">Upload Date To</label>
								<input type="date" value={filters.uploadTo} onChange={(e) => handleFilterChange('uploadTo', e.target.value)} className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent" />
							</div>
							<div className="min-w-0">
								<label className="block text-xs font-medium text-gray-700 mb-1">Event Date From</label>
								<input type="date" value={filters.eventFrom} onChange={(e) => handleFilterChange('eventFrom', e.target.value)} className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent" />
							</div>
							<div className="min-w-0">
								<label className="block text-xs font-medium text-gray-700 mb-1">Event Date To</label>
								<input type="date" value={filters.eventTo} onChange={(e) => handleFilterChange('eventTo', e.target.value)} className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent" />
							</div>
						</div>
					</div>

					<div className="flex items-center justify-end space-x-3 mt-4 pt-4 border-t border-gray-200">
						<button
							onClick={resetFilters}
							className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
						>
							Reset Filters
						</button>
					</div>
				</div>
			)}

			{/* Success Message */}
			{successMessage && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
					<div className="flex items-center">
						<CheckCircle className="h-5 w-5 text-green-600 mr-3" />
						<p className="text-green-800 font-medium">{successMessage}</p>
					</div>
					<button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800 transition-colors">
						<X className="h-5 w-5" />
					</button>
				</div>
			)}

			{/* Error Message */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
					<div className="flex items-center">
						<AlertCircle className="h-5 w-5 text-red-600 mr-3" />
						<p className="text-red-800 font-medium">{error}</p>
					</div>
					<button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 transition-colors">
						<X className="h-5 w-5" />
					</button>
				</div>
			)}

			{/* Summary Table */}
			<div className="space-y-4">
				{loading ? (
					<div className="bg-white rounded-lg border border-gray-200 p-12">
						<div className="flex items-center justify-center">
							<RefreshCw className="h-6 w-6 animate-spin text-[#0b4d2b] mr-3" />
							<span className="text-gray-600">Loading pictures...</span>
						</div>
					</div>
				) : summaryData.length === 0 ? (
					<div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
						<FileImage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
						<p className="text-gray-600">No pictures found</p>
						<p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
					</div>
				) : (
					<>
						{/* Stats Bar */}
						<div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
							<p className="text-sm text-gray-600">
								<span className="font-semibold text-gray-900">{sortedData.length}</span> group{sortedData.length !== 1 ? 's' : ''} with <span className="font-semibold text-gray-900">{totalPictures}</span> total pictures
							</p>
							<div className="flex items-center gap-3">
								<label className="text-xs text-gray-500">Per page:</label>
								<select
									value={filters.pageSize}
									onChange={(e) => handleFilterChange('pageSize', parseInt(e.target.value))}
									className="h-8 px-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								>
									<option value={10}>10</option>
									<option value={20}>20</option>
									<option value={50}>50</option>
									<option value={100}>100</option>
								</select>
							</div>
						</div>

						{/* Table */}
						<div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">#</th>
											{renderSortHeader('GroupName', 'Group Name')}
											{renderSortHeader('MainCategory', 'Main Category')}
											{renderSortHeader('SubCategory', 'Sub Category')}
											{renderSortHeader('PictureCount', 'Images')}
											{renderSortHeader('LatestUploadDate', 'Last Upload')}
											{renderSortHeader('LatestEventDate', 'Last Event')}
											<th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Actions</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{paginatedData.map((row, idx) => (
											<tr
												key={`${row.GroupName}-${row.MainCategory}-${row.SubCategory}-${idx}`}
												className="hover:bg-gray-50 cursor-pointer transition-colors"
												onClick={() => openGallery(row)}
											>
												<td className="px-4 py-3 text-sm text-gray-500">{startIdx + idx + 1}</td>
												<td className="px-4 py-3 text-sm font-medium text-gray-900">{row.GroupName || 'Uncategorized'}</td>
												<td className="px-4 py-3 text-sm text-gray-700">{row.MainCategory || 'Uncategorized'}</td>
												<td className="px-4 py-3 text-sm text-gray-700">{row.SubCategory || 'Uncategorized'}</td>
												<td className="px-4 py-3">
													<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0b4d2b]/10 text-[#0b4d2b]">
														<FileImage className="h-3 w-3" />
														{row.PictureCount}
													</span>
												</td>
												<td className="px-4 py-3 text-sm text-gray-600">{formatDate(row.LatestUploadDate)}</td>
												<td className="px-4 py-3 text-sm text-gray-600">{formatDate(row.LatestEventDate)}</td>
												<td className="px-4 py-3 text-center">
													<button
														onClick={(e) => { e.stopPropagation(); openGallery(row); }}
														className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#0b4d2b] rounded-lg hover:bg-[#0a4226] transition-colors"
													>
														<Eye className="h-3.5 w-3.5" />
														View
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
								<p className="text-sm text-gray-600">
									Showing {startIdx + 1} to {Math.min(startIdx + filters.pageSize, sortedData.length)} of {sortedData.length} groups
								</p>
								<div className="flex items-center gap-2">
									<button
										onClick={() => handleFilterChange('page', Math.max(1, filters.page - 1))}
										disabled={filters.page <= 1}
										className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										Previous
									</button>
									<span className="px-3 py-1.5 text-sm font-medium text-gray-700">
										Page {filters.page} of {totalPages}
									</span>
									<button
										onClick={() => handleFilterChange('page', Math.min(totalPages, filters.page + 1))}
										disabled={filters.page >= totalPages}
										className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										Next
									</button>
								</div>
							</div>
						)}
					</>
				)}
			</div>

			{/* Gallery Modal */}
			{galleryModal && (
				<div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
					<div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200">
						{/* Gallery Header */}
						<div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#0b4d2b] via-[#0d5d3a] to-[#0a3d24] text-white">
							<div className="flex items-center space-x-4">
								<div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
									<FileImage className="h-6 w-6" />
								</div>
								<div>
									<h2 className="text-2xl font-bold">Picture Gallery</h2>
									<p className="text-sm opacity-90 mt-1">
										{galleryModal.groupName || 'Uncategorized'}
										{galleryModal.mainCategory && <> &middot; {galleryModal.mainCategory}</>}
										{galleryModal.subCategory && <> &middot; {galleryModal.subCategory}</>}
									</p>
								</div>
							</div>
							<button
								onClick={() => setGalleryModal(null)}
								className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
								aria-label="Close"
							>
								<X className="h-6 w-6" />
							</button>
						</div>

						{/* Gallery Content */}
						<div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-white">
							{galleryModal.loading ? (
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
									{Array.from({ length: 12 }).map((_, i) => (
										<div key={i} className="animate-pulse rounded-lg border border-gray-200 overflow-hidden">
											<div className="aspect-[4/3] bg-gray-200" />
											<div className="p-2.5 space-y-2">
												<div className="h-3 bg-gray-200 rounded w-3/4" />
												<div className="h-2.5 bg-gray-200 rounded w-1/2" />
											</div>
										</div>
									))}
								</div>
							) : galleryModal.pictures.length === 0 ? (
								<div className="text-center py-16">
									<FileImage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
									<p className="text-gray-600">No pictures found in this group</p>
								</div>
							) : (
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
									{galleryModal.pictures.map(pic => (
										<div key={pic.PictureID} className="group/tile relative rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden">
											<div className="relative aspect-[4/3] bg-gray-100 overflow-hidden cursor-pointer" onClick={() => setViewModal(pic)}>
												{pic.FilePath ? (
													<img
														src={getImageUrl(pic.FilePath)}
														alt={pic.FileName || 'Picture'}
														loading="lazy"
														className="w-full h-full object-cover group-hover/tile:scale-105 transition-transform duration-300"
													/>
												) : (
													<div className="w-full h-full flex items-center justify-center">
														<FileImage className="h-10 w-10 text-gray-300" />
													</div>
												)}
												<div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover/tile:opacity-100 transition-opacity flex items-end justify-center pb-3">
													<span className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-black/60 rounded-full backdrop-blur-sm">
														<Eye className="h-3 w-3 mr-1" /> View
													</span>
												</div>
											</div>
											<div className="p-2.5">
												<p className="text-xs font-semibold text-gray-900 truncate" title={pic.FileName || undefined}>{pic.FileName || 'Untitled'}</p>
												<p className="text-[11px] text-gray-500 mt-0.5">{formatDate(pic.EventDate || pic.UploadDate)}</p>
											</div>
											<div className="flex border-t border-gray-100">
												<button
													onClick={(e) => { e.stopPropagation(); setViewModal(pic); }}
													className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-[#0b4d2b] hover:bg-[#0b4d2b]/5 transition-colors"
												>
													<Eye className="h-3 w-3" /> View
												</button>
												{canDelete && (
													<button
														onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ show: true, picture: pic }); }}
														className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors border-l border-gray-100"
													>
														<Trash2 className="h-3 w-3" /> Delete
													</button>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Gallery Footer */}
						<div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
							<p className="text-sm text-gray-600">
								{galleryModal.loading ? 'Loading...' : `${galleryModal.pictures.length} picture${galleryModal.pictures.length !== 1 ? 's' : ''}`}
							</p>
							<button
								onClick={() => setGalleryModal(null)}
								className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}

			{/* View Modal (single picture detail) */}
			{viewModal && (
				<div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
					<div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200">
						<div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#0b4d2b] via-[#0d5d3a] to-[#0a3d24] text-white">
							<div className="flex items-center space-x-4">
								<div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
									<FileImage className="h-6 w-6" />
								</div>
								<div>
									<h2 className="text-2xl font-bold">Picture Details</h2>
									<p className="text-sm opacity-90 mt-1">{viewModal.FileName || 'Untitled Picture'}</p>
								</div>
							</div>
							<button
								onClick={() => setViewModal(null)}
								className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
								aria-label="Close"
							>
								<X className="h-6 w-6" />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-gray-50 to-white">
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
								<div className="lg:col-span-2 space-y-4">
									<div className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden shadow-lg border-4 border-white">
										{viewModal.FilePath ? (
											<img
												src={getImageUrl(viewModal.FilePath)}
												alt={viewModal.FileName || 'Picture'}
												className="w-full h-auto max-h-[70vh] object-contain mx-auto block"
												onError={(e) => {
													const target = e.target as HTMLImageElement;
													target.style.display = 'none';
													const fallback = target.parentElement?.querySelector('.fallback-message');
													if (fallback) fallback.classList.remove('hidden');
												}}
											/>
										) : null}
										<div className="absolute inset-0 flex flex-col items-center justify-center fallback-message hidden bg-gradient-to-br from-gray-100 to-gray-200">
											<FileImage className="h-20 w-20 text-gray-400 mb-4" />
											<span className="text-base font-medium text-gray-600">Preview not available</span>
										</div>
									</div>

									{viewModal.FilePath && (
										<a
											href={getImageUrl(viewModal.FilePath)}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-[#0b4d2b] to-[#0a3d24] rounded-xl hover:from-[#0d5d3a] hover:to-[#0b4d2b] transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
										>
											<ExternalLink className="h-5 w-5 mr-2" />
											Open Original Image in New Tab
										</a>
									)}
								</div>

								<div className="space-y-4">
									<div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-5">
										<div className="pb-4 border-b border-gray-200">
											<h3 className="text-lg font-bold text-gray-900 flex items-center">
												<FileImage className="h-5 w-5 mr-2 text-[#0b4d2b]" />
												Information
											</h3>
										</div>

										<div className="space-y-4">
											<div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-l-4 border-blue-500">
												<div className="flex items-start">
													<FileImage className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
													<div className="flex-1">
														<p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">File Name</p>
														<p className="text-base font-bold text-gray-900 break-words">{viewModal.FileName || 'N/A'}</p>
													</div>
												</div>
											</div>

											<div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border-l-4 border-purple-500">
												<div className="flex items-start">
													<Calendar className="h-5 w-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
													<div className="flex-1">
														<p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Group Name</p>
														<p className="text-base font-semibold text-gray-900">{viewModal.GroupName || 'N/A'}</p>
													</div>
												</div>
											</div>

											<div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-l-4 border-green-500">
												<div className="flex items-start">
													<FileImage className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
													<div className="flex-1">
														<p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Main Category</p>
														<p className="text-base font-semibold text-gray-900">{viewModal.MainCategory || 'N/A'}</p>
													</div>
												</div>
											</div>

											<div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border-l-4 border-amber-500">
												<div className="flex items-start">
													<FileImage className="h-5 w-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
													<div className="flex-1">
														<p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Sub Category</p>
														<p className="text-base font-semibold text-gray-900">{viewModal.SubCategory || 'N/A'}</p>
													</div>
												</div>
											</div>

											<div className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl p-4 border-l-4 border-cyan-500">
												<div className="flex items-start">
													<User className="h-5 w-5 text-cyan-600 mr-3 mt-0.5 flex-shrink-0" />
													<div className="flex-1">
														<p className="text-xs font-semibold text-cyan-600 uppercase tracking-wide mb-1">Uploaded By</p>
														<p className="text-base font-semibold text-gray-900">{viewModal.UploadedBy || 'N/A'}</p>
													</div>
												</div>
											</div>

											<div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 border-l-4 border-indigo-500">
												<div className="flex items-start">
													<Calendar className="h-5 w-5 text-indigo-600 mr-3 mt-0.5 flex-shrink-0" />
													<div className="flex-1">
														<p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Upload Date</p>
														<p className="text-base font-semibold text-gray-900">{formatDate(viewModal.UploadDate)}</p>
													</div>
												</div>
											</div>

											<div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border-l-4 border-violet-500">
												<div className="flex items-start">
													<Calendar className="h-5 w-5 text-violet-600 mr-3 mt-0.5 flex-shrink-0" />
													<div className="flex-1">
														<p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1">Event Date</p>
														<p className="text-base font-semibold text-gray-900">{formatDate(viewModal.EventDate)}</p>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						<div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
							<button
								onClick={() => setViewModal(null)}
								className="px-6 py-3 text-base font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow-md"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{deleteConfirm.show && deleteConfirm.picture && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
					<div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
						<div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-xl">
							<div className="flex items-center">
								<div className="p-2 bg-white/20 rounded-lg mr-4">
									<Trash2 className="h-6 w-6" />
								</div>
								<div>
									<h2 className="text-2xl font-bold">Confirm Delete</h2>
									<p className="text-red-100 text-sm mt-1">This action cannot be undone</p>
								</div>
							</div>
						</div>

						<div className="p-6">
							<p className="text-gray-700 text-base mb-3 font-semibold">
								Are you sure you want to delete this picture?
							</p>
							<div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
								<p className="text-sm font-medium text-gray-500 mb-1">File Name:</p>
								<p className="text-base font-semibold text-gray-900">
									{deleteConfirm.picture.FileName || 'N/A'}
								</p>
								{deleteConfirm.picture.GroupName && (
									<>
										<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Group:</p>
										<p className="text-base text-gray-700">{deleteConfirm.picture.GroupName}</p>
									</>
								)}
								{deleteConfirm.picture.MainCategory && (
									<>
										<p className="text-sm font-medium text-gray-500 mb-1 mt-2">Category:</p>
										<p className="text-base text-gray-700">
											{deleteConfirm.picture.MainCategory}
											{deleteConfirm.picture.SubCategory && ` - ${deleteConfirm.picture.SubCategory}`}
										</p>
									</>
								)}
							</div>
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start">
								<AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
								<p className="text-sm text-yellow-800">
									<strong>Warning:</strong> This will permanently delete this picture from the database and file system. This action cannot be undone.
								</p>
							</div>
						</div>

						<div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end space-x-3 border-t border-gray-200">
							<button
								onClick={() => setDeleteConfirm({ show: false, picture: null })}
								disabled={deleting}
								className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								onClick={() => handleDelete(deleteConfirm.picture!)}
								disabled={deleting}
								className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
							>
								{deleting ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Deleting...
									</>
								) : (
									<>
										<Trash2 className="h-4 w-4 mr-2" />
										Yes, Delete
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
