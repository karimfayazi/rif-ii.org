"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, Filter, Map, RefreshCw, Search, X } from "lucide-react";

type GISMapImage = {
	fileName: string;
	title: string;
	imageUrl: string;
	detailUrl: string;
	category: string;
};

export default function GISMapsPage() {
	const [maps, setMaps] = useState<GISMapImage[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showFilters, setShowFilters] = useState(true);
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState("all");

	const fetchMaps = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			// New gallery image loading and filtering source: fetch allowed image files from the new API route.
			const response = await fetch("/api/gis-maps/selected-tehsils", {
				cache: "no-store",
			});
			const data = await response.json();

			if (!data.success) {
				setError(data.message || "Failed to load GIS maps");
				return;
			}

			setMaps(data.maps || []);
		} catch (err) {
			console.error("Error loading GIS maps:", err);
			setError("Failed to load GIS maps");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchMaps();
	}, [fetchMaps]);

	const categories = useMemo(() => {
		return ["all", ...Array.from(new Set(maps.map((item) => item.category)))];
	}, [maps]);

	const filteredMaps = useMemo(() => {
		return maps.filter((item) => {
			const matchesSearch = item.fileName.toLowerCase().includes(search.toLowerCase());
			const matchesCategory = category === "all" || item.category === category;
			return matchesSearch && matchesCategory;
		});
	}, [maps, search, category]);

	const clearFilters = () => {
		setSearch("");
		setCategory("all");
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">GIS Maps</h1>
					<p className="mt-1 text-sm text-gray-600">
						Browse selected tehsil map images from `/maps/SelectedTehsils`
					</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={() => setShowFilters((prev) => !prev)}
						className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
					>
						<Filter className="mr-2 h-4 w-4" />
						{showFilters ? "Hide" : "Show"} Filters
					</button>
					<button
						onClick={fetchMaps}
						className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
					>
						<RefreshCw className="mr-2 h-4 w-4" />
						Refresh
					</button>
				</div>
			</div>

			{showFilters && (
				<div className="rounded-xl border border-gray-200 bg-gradient-to-r from-white to-gray-50 p-4 shadow-sm">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div>
							<label className="mb-1 block text-xs font-medium text-gray-700">Search File Name</label>
							<div className="relative">
								<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
								<input
									type="text"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Search by file name..."
									className="h-10 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-[#0b4d2b]"
								/>
							</div>
						</div>
						<div>
							<label className="mb-1 block text-xs font-medium text-gray-700">Category</label>
							<select
								value={category}
								onChange={(e) => setCategory(e.target.value)}
								className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-transparent focus:ring-2 focus:ring-[#0b4d2b]"
							>
								{categories.map((item) => (
									<option key={item} value={item}>
										{item === "all" ? "All Categories" : item}
									</option>
								))}
							</select>
						</div>
						<div className="flex items-end">
							<button
								onClick={clearFilters}
								className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
							>
								<X className="mr-2 h-4 w-4" />
								Clear Filters
							</button>
						</div>
					</div>
				</div>
			)}

			<div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
				<p className="text-sm text-gray-600">
					Showing <span className="font-semibold text-gray-900">{filteredMaps.length}</span> of{" "}
					<span className="font-semibold text-gray-900">{maps.length}</span> maps
				</p>
			</div>

			{loading ? (
				<div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
					<RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#0b4d2b]" />
					<p className="mt-3 text-sm text-gray-600">Loading GIS maps...</p>
				</div>
			) : error ? (
				<div className="rounded-lg border border-red-200 bg-red-50 p-12 text-center">
					<Map className="mx-auto h-10 w-10 text-red-400" />
					<p className="mt-3 text-sm font-medium text-red-700">{error}</p>
				</div>
			) : filteredMaps.length === 0 ? (
				<div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
					<Map className="mx-auto h-12 w-12 text-gray-400" />
					<p className="mt-4 text-base font-medium text-gray-900">No GIS maps found</p>
					<p className="mt-1 text-sm text-gray-500">Try adjusting the search or category filter.</p>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{filteredMaps.map((item) => (
						<div
							key={item.fileName}
							className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
						>
							<Link href={item.detailUrl} className="block">
								<div className="relative aspect-[4/3] bg-gray-100">
									<Image
										src={item.imageUrl}
										alt={item.title}
										fill
										className="object-cover"
										unoptimized
									/>
								</div>
							</Link>
							<div className="space-y-3 p-4">
								<div>
									<p className="line-clamp-2 text-sm font-semibold text-gray-900">{item.title}</p>
									<p className="mt-1 text-xs text-gray-500">{item.fileName}</p>
								</div>
								<div className="flex items-center justify-between">
									<span className="inline-flex items-center rounded-full bg-[#0b4d2b]/10 px-2.5 py-1 text-xs font-medium text-[#0b4d2b]">
										{item.category}
									</span>
									<Link
										href={item.detailUrl}
										className="inline-flex items-center gap-1 rounded-lg bg-[#0b4d2b] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0a4226]"
									>
										<Eye className="h-3.5 w-3.5" />
										Open
									</Link>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
