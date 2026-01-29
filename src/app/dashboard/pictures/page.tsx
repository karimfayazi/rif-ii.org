"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
	Search, Filter, RefreshCw, Eye, X, Calendar, User, FileImage, 
	ChevronLeft, ChevronRight, ArrowUpDown, CheckCircle, XCircle,
	ExternalLink, Download, Trash2, AlertCircle, Loader2, Upload
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";
import Link from "next/link";

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
	
	const [pictures, setPictures] = useState<PictureRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [total, setTotal] = useState(0);
	const [viewModal, setViewModal] = useState<PictureRow | null>(null);
	const [showFilters, setShowFilters] = useState(false);
	const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; picture: PictureRow | null }>({ show: false, picture: null });
	const [deleting, setDeleting] = useState(false);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	
	// Filter options (populated from API)
	const [groupNames, setGroupNames] = useState<string[]>([]);
	const [mainCategories, setMainCategories] = useState<string[]>([]);
	const [subCategories, setSubCategories] = useState<string[]>([]);
	const [uploadedByList, setUploadedByList] = useState<string[]>([]);
	
	// Initialize filters from URL or defaults
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
		sortBy: searchParams.get('sortBy') || 'UploadDate',
		sortDir: (searchParams.get('sortDir') as 'asc' | 'desc') || 'desc',
		page: parseInt(searchParams.get('page') || '1'),
		pageSize: parseInt(searchParams.get('pageSize') || '20'),
	}));
	
	// Fetch filter options
	useEffect(() => {
		fetchFilterOptions();
	}, []);
	
	// Fetch pictures when filters change
	useEffect(() => {
		fetchPictures();
		updateURL();
	}, [filters]);
	
	// Update subcategories when main category changes
	useEffect(() => {
		if (filters.mainCategory) {
			fetchSubCategories(filters.mainCategory);
		} else {
			setSubCategories([]);
		}
		if (!filters.mainCategory) {
			setFilters(prev => ({ ...prev, subCategory: '' }));
		}
	}, [filters.mainCategory]);
	
	const fetchFilterOptions = async () => {
		try {
			// Fetch distinct values for dropdowns
			const pool = await fetch('/api/pictures?pageSize=1000');
			const data = await pool.json();
			
			if (data.data) {
				const uniqueGroups = [...new Set(data.data.map((p: PictureRow) => p.GroupName).filter(Boolean))] as string[];
				const uniqueMainCats = [...new Set(data.data.map((p: PictureRow) => p.MainCategory).filter(Boolean))] as string[];
				const uniqueSubCats = [...new Set(data.data.map((p: PictureRow) => p.SubCategory).filter(Boolean))] as string[];
				const uniqueUploaders = [...new Set(data.data.map((p: PictureRow) => p.UploadedBy).filter(Boolean))] as string[];
				
				setGroupNames(uniqueGroups.sort());
				setMainCategories(uniqueMainCats.sort());
				setSubCategories(uniqueSubCats.sort());
				setUploadedByList(uniqueUploaders.sort());
			}
		} catch (err) {
			console.error("Error fetching filter options:", err);
		}
	};
	
	const fetchSubCategories = async (mainCategory: string) => {
		try {
			const response = await fetch(`/api/pictures?mainCategory=${encodeURIComponent(mainCategory)}&pageSize=1000`);
			const data = await response.json();
			
			if (data.data) {
				const uniqueSubCats = [...new Set(data.data.map((p: PictureRow) => p.SubCategory).filter(Boolean))] as string[];
				setSubCategories(uniqueSubCats.sort());
			}
		} catch (err) {
			console.error("Error fetching subcategories:", err);
		}
	};
	
	const fetchPictures = async () => {
		try {
			setLoading(true);
			setError(null);
			
			const params = new URLSearchParams();
			params.append('page', filters.page.toString());
			params.append('pageSize', filters.pageSize.toString());
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
			params.append('sortBy', filters.sortBy);
			params.append('sortDir', filters.sortDir);
			
			const response = await fetch(`/api/pictures?${params.toString()}`);
			const data = await response.json();
			
			if (data.error) {
				setError(data.message || data.error);
				return;
			}
			
			setPictures(data.data || []);
			setTotal(data.total || 0);
		} catch (err) {
			console.error("Error fetching pictures:", err);
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
		if (filters.sortBy !== 'UploadDate') params.set('sortBy', filters.sortBy);
		if (filters.sortDir !== 'desc') params.set('sortDir', filters.sortDir);
		if (filters.page !== 1) params.set('page', filters.page.toString());
		if (filters.pageSize !== 20) params.set('pageSize', filters.pageSize.toString());
		
		router.replace(`/dashboard/pictures?${params.toString()}`, { scroll: false });
	};
	
	const handleFilterChange = (key: keyof FilterState, value: any) => {
		setFilters(prev => ({ ...prev, [key]: value, page: 1 })); // Reset to page 1 on filter change
	};
	
	const handleSort = (column: string) => {
		setFilters(prev => ({
			...prev,
			sortBy: column,
			sortDir: prev.sortBy === column && prev.sortDir === 'asc' ? 'desc' : 'asc',
			page: 1
		}));
	};
	
	const resetFilters = () => {
		setFilters({
			search: '',
			groupName: '',
			mainCategory: '',
			subCategory: '',
			uploadedBy: '',
			isActive: 'all',
			uploadFrom: '',
			uploadTo: '',
			eventFrom: '',
			eventTo: '',
			sortBy: 'UploadDate',
			sortDir: 'desc',
			page: 1,
			pageSize: 20,
		});
		router.replace('/dashboard/pictures', { scroll: false });
	};
	
	const getImageUrl = (filePath: string | null) => {
		if (!filePath) return '';
		
		if (filePath.startsWith('https://') || filePath.startsWith('http://')) {
			return filePath;
		}
		
		let normalizedPath = filePath.replace(/\\/g, '/');
		normalizedPath = normalizedPath.replace(/^[A-Za-z]:/, '');
		
		if (normalizedPath.startsWith('~/')) {
			normalizedPath = normalizedPath.substring(2);
		}
		
		normalizedPath = normalizedPath.replace(/^\/+/, '');
		
		if (!normalizedPath.startsWith('uploads/')) {
			if (normalizedPath.includes('pictures/')) {
				normalizedPath = `uploads/${normalizedPath}`;
			} else if (!normalizedPath.startsWith('public/')) {
				normalizedPath = `uploads/pictures/${normalizedPath}`;
			}
		}
		
		if (normalizedPath.startsWith('public/')) {
			normalizedPath = normalizedPath.substring(7);
		}
		
		const relativePath = normalizedPath.startsWith('uploads/') 
			? normalizedPath.substring(8)
			: normalizedPath;
		
		const encodedPath = relativePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
		return `/api/pictures/file/${encodedPath}`;
	};
	
	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		// If date includes time (format: YYYY-MM-DD HH:MI:SS), extract only date part
		if (dateString.includes(' ')) {
			return dateString.split(' ')[0];
		}
		// If date is in DD-MM-YYYY format, return as is
		return dateString;
	};
	
	const formatFileSize = (sizeKB: number | null) => {
		if (!sizeKB) return "Unknown";
		if (sizeKB < 1024) return `${sizeKB} KB`;
		return `${(sizeKB / 1024).toFixed(1)} MB`;
	};
	
	const totalPages = Math.ceil(total / filters.pageSize);
	
	const canDelete = isAdmin || accessDelete;
	
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
				// Refresh the list
				await fetchPictures();
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
						onClick={fetchPictures}
						disabled={loading}
						className="inline-flex items-center justify-center px-4 py-2 h-10 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
					>
						<RefreshCw className={`h-4 w-4 mr-2 flex-shrink-0 ${loading ? 'animate-spin' : ''}`} />
						Refresh
					</button>
				</div>
			</div>
			
			{/* Summary Card */}
			<div className="bg-white rounded-lg border border-gray-200 p-6">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-gray-600">Total Pictures</p>
						<p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
					</div>
					<FileImage className="h-8 w-8 text-[#0b4d2b]" />
				</div>
			</div>
			
			{/* Filters Panel */}
			{showFilters && (
				<div className="bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 shadow-lg p-3">
					<div className="space-y-3">
						{/* Search - Full Width */}
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

						{/* Row 1: Group Name, Main Category, Sub Category, Uploaded By */}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
							{/* GroupName */}
							<div className="min-w-0">
								<label className="block text-xs font-medium text-gray-700 mb-1">
									Group Name
								</label>
								<select
									value={filters.groupName}
									onChange={(e) => handleFilterChange('groupName', e.target.value)}
									className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								>
									<option value="">All Groups</option>
									{groupNames.map(g => (
										<option key={g} value={g}>{g}</option>
									))}
								</select>
							</div>
							
							{/* MainCategory */}
							<div className="min-w-0">
								<label className="block text-xs font-medium text-gray-700 mb-1">
									Main Category
								</label>
								<select
									value={filters.mainCategory}
									onChange={(e) => handleFilterChange('mainCategory', e.target.value)}
									className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								>
									<option value="">All Categories</option>
									{mainCategories.map(cat => (
										<option key={cat} value={cat}>{cat}</option>
									))}
								</select>
							</div>
							
							{/* SubCategory */}
							<div className="min-w-0">
								<label className="block text-xs font-medium text-gray-700 mb-1">
									Sub Category
								</label>
								<select
									value={filters.subCategory}
									onChange={(e) => handleFilterChange('subCategory', e.target.value)}
									disabled={!filters.mainCategory}
									className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
								>
									<option value="">All Sub Categories</option>
									{subCategories.map(sub => (
										<option key={sub} value={sub}>{sub}</option>
									))}
								</select>
							</div>
							
							{/* UploadedBy */}
							<div className="min-w-0">
								<label className="block text-xs font-medium text-gray-700 mb-1">
									Uploaded By
								</label>
								<select
									value={filters.uploadedBy}
									onChange={(e) => handleFilterChange('uploadedBy', e.target.value)}
									className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								>
									<option value="">All Users</option>
									{uploadedByList.map(user => (
										<option key={user} value={user}>{user}</option>
									))}
								</select>
							</div>
						</div>

						{/* Row 2: Upload Date From, Upload Date To, Event Date From, Event Date To */}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
							{/* UploadDate From */}
							<div className="min-w-0">
								<label className="block text-xs font-medium text-gray-700 mb-1">
									Upload Date From
								</label>
								<input
									type="date"
									value={filters.uploadFrom}
									onChange={(e) => handleFilterChange('uploadFrom', e.target.value)}
									className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>
							
							{/* UploadDate To */}
							<div className="min-w-0">
								<label className="block text-xs font-medium text-gray-700 mb-1">
									Upload Date To
								</label>
								<input
									type="date"
									value={filters.uploadTo}
									onChange={(e) => handleFilterChange('uploadTo', e.target.value)}
									className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>
							
							{/* EventDate From */}
							<div className="min-w-0">
								<label className="block text-xs font-medium text-gray-700 mb-1">
									Event Date From
								</label>
								<input
									type="date"
									value={filters.eventFrom}
									onChange={(e) => handleFilterChange('eventFrom', e.target.value)}
									className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
							</div>
							
							{/* EventDate To */}
							<div className="min-w-0">
								<label className="block text-xs font-medium text-gray-700 mb-1">
									Event Date To
								</label>
								<input
									type="date"
									value={filters.eventTo}
									onChange={(e) => handleFilterChange('eventTo', e.target.value)}
									className="w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
								/>
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
					<button
						onClick={() => setSuccessMessage(null)}
						className="text-green-600 hover:text-green-800 transition-colors"
					>
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
					<button
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
						<thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
							<tr>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									<button
										onClick={() => handleSort('GroupName')}
										className="flex items-center hover:text-[#0b4d2b] transition-colors"
									>
										Group Name
										<ArrowUpDown className="h-3 w-3 ml-1" />
									</button>
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									<button
										onClick={() => handleSort('MainCategory')}
										className="flex items-center hover:text-[#0b4d2b] transition-colors"
									>
										Main Category
										<ArrowUpDown className="h-3 w-3 ml-1" />
									</button>
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Sub Category
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									<button
										onClick={() => handleSort('FileName')}
										className="flex items-center hover:text-[#0b4d2b] transition-colors"
									>
										File Name
										<ArrowUpDown className="h-3 w-3 ml-1" />
									</button>
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Uploaded By
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									<button
										onClick={() => handleSort('UploadDate')}
										className="flex items-center hover:text-[#0b4d2b] transition-colors"
									>
										Upload Date
										<ArrowUpDown className="h-3 w-3 ml-1" />
									</button>
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									<button
										onClick={() => handleSort('EventDate')}
										className="flex items-center hover:text-[#0b4d2b] transition-colors"
									>
										Event Date
										<ArrowUpDown className="h-3 w-3 ml-1" />
									</button>
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{loading ? (
								<tr>
									<td colSpan={8} className="px-4 py-12 text-center">
										<div className="flex items-center justify-center">
											<RefreshCw className="h-6 w-6 animate-spin text-[#0b4d2b] mr-3" />
											<span className="text-gray-600">Loading pictures...</span>
										</div>
									</td>
								</tr>
							) : pictures.length === 0 ? (
								<tr>
									<td colSpan={8} className="px-4 py-12 text-center">
										<FileImage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
										<p className="text-gray-600">No pictures found</p>
										<p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
									</td>
								</tr>
							) : (
								pictures.map((picture) => (
									<tr key={picture.PictureID} className="hover:bg-gray-50 transition-colors">
										<td className="px-4 py-3 text-sm text-gray-900">
											{picture.GroupName || 'N/A'}
										</td>
										<td className="px-4 py-3 text-sm text-gray-900">
											{picture.MainCategory || 'N/A'}
										</td>
										<td className="px-4 py-3 text-sm text-gray-900">
											{picture.SubCategory || 'N/A'}
										</td>
										<td className="px-4 py-3 text-sm text-gray-900">
											{picture.FileName || 'N/A'}
										</td>
										<td className="px-4 py-3 text-sm text-gray-600">
											{picture.UploadedBy || 'N/A'}
										</td>
										<td className="px-4 py-3 text-sm text-gray-600">
											{formatDate(picture.UploadDate)}
										</td>
										<td className="px-4 py-3 text-sm text-gray-600">
											{formatDate(picture.EventDate)}
										</td>
										<td className="px-4 py-3 text-sm">
											<div className="flex items-center space-x-2">
												<button
													onClick={() => setViewModal(picture)}
													className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-[#0b4d2b] rounded-lg hover:bg-[#0a3d24] transition-colors"
												>
													<Eye className="h-3 w-3 mr-1" />
													View
												</button>
												{canDelete && (
													<button
														onClick={() => setDeleteConfirm({ show: true, picture })}
														className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
														title="Delete picture"
													>
														<Trash2 className="h-3 w-3 mr-1" />
														Delete
													</button>
												)}
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
				
				{/* Pagination */}
				{totalPages > 1 && (
					<div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
						<div className="text-sm text-gray-700">
							Showing <span className="font-medium">{(filters.page - 1) * filters.pageSize + 1}</span> to{' '}
							<span className="font-medium">{Math.min(filters.page * filters.pageSize, total)}</span> of{' '}
							<span className="font-medium">{total}</span> results
						</div>
						<div className="flex items-center space-x-2">
							<button
								onClick={() => handleFilterChange('page', Math.max(1, filters.page - 1))}
								disabled={filters.page === 1}
								className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								<ChevronLeft className="h-4 w-4" />
							</button>
							<span className="text-sm text-gray-700">
								Page {filters.page} of {totalPages}
							</span>
							<button
								onClick={() => handleFilterChange('page', Math.min(totalPages, filters.page + 1))}
								disabled={filters.page === totalPages}
								className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								<ChevronRight className="h-4 w-4" />
							</button>
						</div>
					</div>
				)}
			</div>
			
			{/* View Modal */}
			{viewModal && (
				<div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
					<div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200">
						{/* Modal Header */}
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
						
						{/* Modal Content */}
						<div className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-gray-50 to-white">
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
								{/* Image Preview - Takes 2 columns */}
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
													if (fallback) {
														fallback.classList.remove('hidden');
													}
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
								
								{/* Metadata - Takes 1 column */}
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
						
						{/* Modal Footer */}
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
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
						{/* Modal Header */}
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
						
						{/* Modal Content */}
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
						
						{/* Modal Footer */}
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
