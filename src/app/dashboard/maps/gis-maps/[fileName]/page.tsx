import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Download, Map } from "lucide-react";
import { getSelectedTehsilMapByName } from "@/lib/gis-selected-tehsils";

type PageProps = {
	params: Promise<{
		fileName: string;
	}>;
};

export default async function GISMapDetailPage({ params }: PageProps) {
	const { fileName } = await params;
	const decodedFileName = decodeURIComponent(fileName);

	// New image detail page logic: resolve the selected file from the allowed GIS maps folder only.
	const map = await getSelectedTehsilMapByName(decodedFileName);

	if (!map) {
		return (
			<div className="space-y-6">
				<Link
					href="/dashboard/maps/gis-maps"
					className="inline-flex items-center px-4 py-2 text-gray-600 transition-colors hover:text-gray-900"
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back to GIS Maps
				</Link>
				<div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
					<Map className="mx-auto h-12 w-12 text-gray-400" />
					<h1 className="mt-4 text-2xl font-bold text-gray-900">Map Not Found</h1>
					<p className="mt-2 text-sm text-gray-600">
						The selected GIS map image could not be found in `public/maps/SelectedTehsils`.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-4">
				<div className="space-y-2">
					<Link
						href="/dashboard/maps/gis-maps"
						className="inline-flex items-center text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to GIS Maps
					</Link>
					<div>
						<h1 className="text-2xl font-bold text-gray-900">{map.title}</h1>
						<p className="mt-1 text-sm text-gray-600">{map.fileName}</p>
					</div>
				</div>

				{/* New download logic: direct download from the public GIS maps image path. */}
				<a
					href={map.imageUrl}
					download={map.fileName}
					className="inline-flex items-center rounded-lg bg-[#0b4d2b] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0a4226]"
				>
					<Download className="mr-2 h-4 w-4" />
					Download
				</a>
			</div>

			<div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div className="relative min-h-[420px] overflow-hidden rounded-lg bg-gray-100">
					<Image
						src={map.imageUrl}
						alt={map.title}
						fill
						className="object-contain"
						unoptimized
						priority
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
					<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Map Title</p>
					<p className="mt-2 text-sm font-medium text-gray-900">{map.title}</p>
				</div>
				<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
					<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">File Name</p>
					<p className="mt-2 break-all text-sm font-medium text-gray-900">{map.fileName}</p>
				</div>
				<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
					<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Category</p>
					<p className="mt-2 text-sm font-medium text-gray-900">{map.category}</p>
				</div>
			</div>
		</div>
	);
}
