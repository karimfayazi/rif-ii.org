"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Folder, Image as ImageIcon, Download, User, FileText, Clock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type PictureData = {
	PictureID?: number;
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

function PictureViewContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pictureId = searchParams.get('id');
	const groupName = searchParams.get('groupName');
	const mainCategory = searchParams.get('mainCategory');
	const subCategory = searchParams.get('subCategory');

	const [picture, setPicture] = useState<PictureData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const getImageUrl = (filePath: string | null) => {
		if (!filePath) return '';
		if (filePath.startsWith('https://') || filePath.startsWith('http://')) {
			return filePath;
		} else if (filePath.startsWith('~/')) {
			return `https://rif-ii.org/${filePath.replace('~/', '')}`;
		} else if (filePath.startsWith('uploads/')) {
			return `/${filePath}`;
		} else {
			return `https://rif-ii.org/${filePath}`;
		}
	};

	useEffect(() => {
		const fetchPicture = async () => {
			try {
				setLoading(true);
				setError(null);
				const params = new URLSearchParams();
				if (groupName) params.append('groupName', groupName);
				if (mainCategory) params.append('mainCategory', mainCategory);
				if (subCategory) params.append('subCategory', subCategory);

				const response = await fetch(`/api/pictures/details?${params.toString()}`);
				const data = await response.json();

				if (data.success && data.pictures && data.pictures.length > 0) {
					// If pictureId is provided, find that specific picture
					if (pictureId) {
						const found = data.pictures.find((p: PictureData) => p.PictureID?.toString() === pictureId);
						if (found) {
							setPicture(found);
						} else {
							setPicture(data.pictures[0]);
						}
					} else {
						setPicture(data.pictures[0]);
					}
				} else {
					setError("Picture not found");
				}
			} catch (err) {
				setError("Error fetching picture");
				console.error("Error fetching picture:", err);
			} finally {
				setLoading(false);
			}
		};

		if (groupName || mainCategory || subCategory) {
			fetchPicture();
		} else {
			setError("No picture parameters provided");
			setLoading(false);
		}
	}, [pictureId, groupName, mainCategory, subCategory]);

	const handleDownload = () => {
		if (!picture?.FilePath) return;
		const fullUrl = getImageUrl(picture.FilePath);
		window.open(fullUrl, '_blank');
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		} catch {
			return dateString;
		}
	};

	const formatFileSize = (sizeKB: number | null) => {
		if (!sizeKB) return "Unknown";
		if (sizeKB < 1024) return `${sizeKB} KB`;
		return `${(sizeKB / 1024).toFixed(1)} MB`;
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center space-x-4">
					<Link
						href="/dashboard"
						className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Dashboard
					</Link>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading picture...</span>
				</div>
			</div>
		);
	}

	if (error || !picture) {
		return (
			<div className="space-y-6">
				<div className="flex items-center space-x-4">
					<Link
						href="/dashboard"
						className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Dashboard
					</Link>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<ImageIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
					<p className="text-red-600">{error || "Picture not found"}</p>
				</div>
			</div>
		);
	}

	const imageUrl = getImageUrl(picture.FilePath);

	return (
		<div className="space-y-6">
			{/* Back Button */}
			<div className="flex items-center space-x-4">
				<Link
					href="/dashboard"
					className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Dashboard
				</Link>
			</div>

			{/* Picture Detail Card */}
			<div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
				{/* Image Section */}
				<div className="relative w-full bg-gradient-to-br from-gray-50 to-gray-100" style={{ minHeight: '500px' }}>
					{imageUrl ? (
						<Image
							src={imageUrl}
							alt={picture.FileName || "Picture"}
							fill
							className="object-contain"
							unoptimized
							onError={(e) => {
								console.log("Image load error for:", picture.FilePath);
							}}
						/>
					) : (
						<div className="flex items-center justify-center h-full min-h-[500px]">
							<ImageIcon className="h-24 w-24 text-gray-400" />
						</div>
					)}
					
					{/* Download Button Overlay */}
					<div className="absolute top-4 right-4">
						<button
							onClick={handleDownload}
							className="inline-flex items-center px-4 py-2 bg-white/90 hover:bg-white text-gray-900 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
						>
							<Download className="h-4 w-4 mr-2" />
							Download
						</button>
					</div>
				</div>

				{/* Information Section */}
				<div className="p-8">
					<div className="mb-6">
						<h1 className="text-3xl font-bold text-gray-900 mb-2">
							{picture.FileName || "Untitled Picture"}
						</h1>
						<div className="h-1 w-20 bg-gradient-to-r from-[#0b4d2b] to-[#0a3d24] rounded-full"></div>
					</div>

					{/* Information Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Group Name */}
						{picture.GroupName && (
							<div className="flex items-start space-x-3 p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
								<div className="p-2 bg-blue-500 rounded-lg">
									<Folder className="h-5 w-5 text-white" />
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium text-gray-600 mb-1">Group / Event</p>
									<p className="text-lg font-semibold text-gray-900">{picture.GroupName}</p>
								</div>
							</div>
						)}

						{/* Main Category */}
						{picture.MainCategory && (
							<div className="flex items-start space-x-3 p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
								<div className="p-2 bg-green-500 rounded-lg">
									<Folder className="h-5 w-5 text-white" />
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium text-gray-600 mb-1">Main Category</p>
									<p className="text-lg font-semibold text-gray-900">{picture.MainCategory}</p>
								</div>
							</div>
						)}

						{/* Sub Category */}
						{picture.SubCategory && (
							<div className="flex items-start space-x-3 p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
								<div className="p-2 bg-purple-500 rounded-lg">
									<Folder className="h-5 w-5 text-white" />
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium text-gray-600 mb-1">Sub Category</p>
									<p className="text-lg font-semibold text-gray-900">{picture.SubCategory}</p>
								</div>
							</div>
						)}

						{/* Event Date */}
						{picture.EventDate && (
							<div className="flex items-start space-x-3 p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
								<div className="p-2 bg-orange-500 rounded-lg">
									<Calendar className="h-5 w-5 text-white" />
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium text-gray-600 mb-1">Event Date</p>
									<p className="text-lg font-semibold text-gray-900">{formatDate(picture.EventDate)}</p>
								</div>
							</div>
						)}

						{/* Uploaded By */}
						{picture.UploadedBy && (
							<div className="flex items-start space-x-3 p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200">
								<div className="p-2 bg-indigo-500 rounded-lg">
									<User className="h-5 w-5 text-white" />
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium text-gray-600 mb-1">Uploaded By</p>
									<p className="text-lg font-semibold text-gray-900">{picture.UploadedBy}</p>
								</div>
							</div>
						)}

						{/* Upload Date */}
						{picture.UploadDate && (
							<div className="flex items-start space-x-3 p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg border border-pink-200">
								<div className="p-2 bg-pink-500 rounded-lg">
									<Clock className="h-5 w-5 text-white" />
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium text-gray-600 mb-1">Upload Date</p>
									<p className="text-lg font-semibold text-gray-900">{formatDate(picture.UploadDate)}</p>
								</div>
							</div>
						)}

						{/* File Size */}
						<div className="flex items-start space-x-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
							<div className="p-2 bg-gray-500 rounded-lg">
								<FileText className="h-5 w-5 text-white" />
							</div>
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-600 mb-1">File Size</p>
								<p className="text-lg font-semibold text-gray-900">{formatFileSize(picture.FileSizeKB)}</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function PictureViewPage() {
	return (
		<Suspense fallback={
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading...</span>
				</div>
			</div>
		}>
			<PictureViewContent />
		</Suspense>
	);
}

