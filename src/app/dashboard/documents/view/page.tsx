"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, FileText, Calendar, Folder, User, X } from "lucide-react";

type DocumentData = {
	Title: string;
	Description: string;
	FilePath: string;
	UploadDate: string;
	UploadedBy: string;
	FileType: string;
	Documentstype: string;
	AllowPriorityUsers: boolean;
	AllowInternalUsers: boolean;
	AllowOthersUsers: boolean;
	Category: string;
	SubCategory: string;
	document_date: string;
	DocumentID: number;
};

export default function DocumentViewPage() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const documentId = searchParams.get('id');

	const [document, setDocument] = useState<DocumentData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const getDocumentUrl = (filePath: string | null) => {
		if (!filePath) return '';
		
		// Check if filePath already contains the full path or starts with ~/Uploads/Documents/
		if (filePath.startsWith('~/Uploads/Documents/')) {
			// Remove the ~/Uploads/Documents/ prefix and construct the correct URL
			const fileName = filePath.replace('~/Uploads/Documents/', '');
			return `https://rif-ii.org/${fileName}`;
		} else if (filePath.startsWith('https://') || filePath.startsWith('http://')) {
			// Already a full URL
			return filePath;
		} else if (filePath.startsWith('Uploads/Documents/')) {
			// Remove Uploads/Documents/ prefix and construct the correct URL
			const fileName = filePath.replace('Uploads/Documents/', '');
			return `https://rif-ii.org/${fileName}`;
		} else {
			// Just a filename, construct the full URL
			return `https://rif-ii.org/${filePath}`;
		}
	};

	useEffect(() => {
		const fetchDocument = async () => {
			if (!documentId) {
				setError("Document ID is required");
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const response = await fetch(`/api/documents/${documentId}`);
				const data = await response.json();

				if (data.success && data.document) {
					setDocument(data.document);
				} else {
					setError(data.message || "Document not found");
				}
			} catch (err) {
				setError("Error fetching document");
				console.error("Error fetching document:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchDocument();
	}, [documentId]);

	const handleDownload = () => {
		if (!document) return;
		
		try {
			const fullUrl = getDocumentUrl(document.FilePath);
			
			// Create a temporary link element to trigger download
			const link = window.document.createElement('a');
			link.href = fullUrl;
			link.download = document.Title || 'document';
			link.target = '_blank';
			window.document.body.appendChild(link);
			link.click();
			window.document.body.removeChild(link);
		} catch (error) {
			console.error('Download failed:', error);
			alert('Download failed. Please try again.');
		}
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return dateString;
		}
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading document...</span>
				</div>
			</div>
		);
	}

	if (error || !document) {
		return (
			<div className="space-y-6">
				<div className="flex items-center space-x-4">
					<Link
						href="/dashboard/documents"
						className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Documents
					</Link>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600">{error || "Document not found"}</p>
				</div>
			</div>
		);
	}

	const documentUrl = getDocumentUrl(document.FilePath);

	return (
		<div className="space-y-6">
			{/* Header with Back Button */}
			<div className="flex items-center justify-between">
				<Link
					href="/dashboard/documents"
					className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Documents
				</Link>
				<button
					onClick={handleDownload}
					className="inline-flex items-center px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors"
				>
					<Download className="h-4 w-4 mr-2" />
					Download
				</button>
			</div>

			{/* Document Information Card */}
			<div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
				<h1 className="text-2xl font-bold text-gray-900 mb-4">{document.Title}</h1>
				
				{/* Document Details */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
					{document.Description && (
						<div className="md:col-span-2">
							<p className="text-gray-600">{document.Description}</p>
						</div>
					)}
					
					{document.Category && (
						<div className="flex items-center text-sm text-gray-600">
							<Folder className="h-4 w-4 mr-2" />
							<span className="font-medium">Category:</span>
							<span className="ml-2">{document.Category}</span>
						</div>
					)}
					
					{document.SubCategory && (
						<div className="flex items-center text-sm text-gray-600">
							<Folder className="h-4 w-4 mr-2" />
							<span className="font-medium">Sub Category:</span>
							<span className="ml-2">{document.SubCategory}</span>
						</div>
					)}
					
					{document.document_date && (
						<div className="flex items-center text-sm text-gray-600">
							<Calendar className="h-4 w-4 mr-2" />
							<span className="font-medium">Document Date:</span>
							<span className="ml-2">{formatDate(document.document_date)}</span>
						</div>
					)}
					
					{document.UploadedBy && (
						<div className="flex items-center text-sm text-gray-600">
							<User className="h-4 w-4 mr-2" />
							<span className="font-medium">Uploaded By:</span>
							<span className="ml-2">{document.UploadedBy}</span>
						</div>
					)}
					
					{document.FileType && (
						<div className="flex items-center text-sm text-gray-600">
							<FileText className="h-4 w-4 mr-2" />
							<span className="font-medium">File Type:</span>
							<span className="ml-2">{document.FileType}</span>
						</div>
					)}
				</div>
			</div>

			{/* PDF Viewer */}
			<div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
				<div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
					<h2 className="text-lg font-semibold text-gray-900">Document Preview</h2>
					<button
						onClick={handleDownload}
						className="inline-flex items-center px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
					>
						<Download className="h-4 w-4 mr-2" />
						Download
					</button>
				</div>
				
				<div className="w-full" style={{ height: 'calc(100vh - 300px)', minHeight: '600px' }}>
					{documentUrl ? (
						<iframe
							src={documentUrl}
							className="w-full h-full border-0"
							title={document.Title}
							style={{ minHeight: '600px' }}
						/>
					) : (
						<div className="flex items-center justify-center h-full min-h-[600px] bg-gray-50">
							<div className="text-center">
								<FileText className="h-24 w-24 text-gray-400 mx-auto mb-4" />
								<p className="text-gray-600">Unable to load document preview</p>
								<button
									onClick={handleDownload}
									className="mt-4 inline-flex items-center px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors"
								>
									<Download className="h-4 w-4 mr-2" />
									Download Document
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

