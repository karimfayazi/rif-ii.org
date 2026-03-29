"use client";

import { useEffect, useState, useMemo } from "react";
import {
	Shield,
	Filter,
	RefreshCw,
	Download,
	Plus,
	Edit,
	Trash2,
	AlertCircle,
	Loader2,
	CheckCircle,
	ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";

type IncidentSummary = {
	id: number;
	QTR_No: number;
	QPR_QTR_No: string;
	Month_Year: string;
	District: string;
	Militants_Killed: number;
	Militants_Injured: number;
	Militants_Arrested: number;
	LEA_Killed: number;
	LEA_Injured: number;
	Civilians_Killed: number;
	Civilians_Injured: number;
	IEDs: number;
	Target_Killings: number;
	Abductions: number;
	Fire_Raid: number;
	Extortions: number;
	username: string;
	update_date: string;
};

type FilterOptions = {
	months: string[];
	districts: string[];
	quarters: number[];
	qprQtrNos: string[];
};

const NUMERIC_KEYS: (keyof IncidentSummary)[] = [
	"Militants_Killed", "Militants_Injured", "Militants_Arrested",
	"LEA_Killed", "LEA_Injured", "Civilians_Killed", "Civilians_Injured",
	"IEDs", "Target_Killings", "Abductions", "Fire_Raid", "Extortions",
];

function rowTotal(row: IncidentSummary): number {
	let sum = 0;
	for (const k of NUMERIC_KEYS) sum += Number(row[k]) || 0;
	return sum;
}

export default function SecurityIncidentsDataPage() {
	const { user, getUserId } = useAuth();
	const userId = user?.id || user?.username || getUserId() || null;
	const { accessSecurityIncidentsData, loading: accessLoading } = useAccess(userId);
	const [rows, setRows] = useState<IncidentSummary[]>([]);
	const [totalCount, setTotalCount] = useState(0);
	const [filterOptions, setFilterOptions] = useState<FilterOptions>({
		months: [],
		districts: [],
		quarters: [],
		qprQtrNos: [],
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const [selectedMonth, setSelectedMonth] = useState("");
	const [selectedDistrict, setSelectedDistrict] = useState("");
	const [selectedQprQtr, setSelectedQprQtr] = useState("");
	const [selectedQtr, setSelectedQtr] = useState("");

	const [deleteConfirm, setDeleteConfirm] = useState<{
		show: boolean;
		incident: IncidentSummary | null;
	}>({ show: false, incident: null });
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		fetchData();
	}, []);

	const fetchData = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (selectedMonth) params.append("monthYear", selectedMonth);
			if (selectedDistrict) params.append("district", selectedDistrict);
			if (selectedQprQtr) params.append("qprQtrNo", selectedQprQtr);
			if (selectedQtr) params.append("qtrNo", selectedQtr);

			const response = await fetch(
				`/api/security-incidents-data?${params.toString()}`
			);
			const data = await response.json();

			if (data.success) {
				setRows(data.rows || []);
				setTotalCount(data.totalCount ?? 0);
				if (data.filterOptions) {
					setFilterOptions(data.filterOptions);
				}
			} else {
				setError(data.message || "Failed to fetch data");
			}
		} catch (err) {
			setError("Error fetching security incidents data");
			console.error("Error:", err);
			setRows([]);
		} finally {
			setLoading(false);
		}
	};

	const handleSearch = () => fetchData();

	const handleReset = () => {
		setSelectedMonth("");
		setSelectedDistrict("");
		setSelectedQprQtr("");
		setSelectedQtr("");
		setTimeout(() => fetchData(), 0);
	};

	const handleDelete = async () => {
		if (!deleteConfirm.incident) return;
		if (!accessSecurityIncidentsData) {
			setError("You do not have permission to delete records.");
			setDeleteConfirm({ show: false, incident: null });
			return;
		}
		try {
			setDeleting(true);
			const response = await fetch(
				`/api/security-incidents-data/delete?id=${deleteConfirm.incident.id}`,
				{ method: "DELETE" }
			);
			const data = await response.json();
			if (data.success) {
				setDeleteConfirm({ show: false, incident: null });
				setSuccess("Record deleted successfully");
				setRows((prev) =>
					prev.filter((r) => r.id !== deleteConfirm.incident!.id)
				);
				setTotalCount((prev) => prev - 1);
				setTimeout(() => setSuccess(null), 3000);
			} else {
				setError(data.message || "Failed to delete");
				setDeleteConfirm({ show: false, incident: null });
			}
		} catch (err) {
			console.error("Error deleting:", err);
			setError("Error deleting record");
			setDeleteConfirm({ show: false, incident: null });
		} finally {
			setDeleting(false);
		}
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			const day = String(date.getDate()).padStart(2, "0");
			const months = [
				"Jan",
				"Feb",
				"Mar",
				"Apr",
				"May",
				"Jun",
				"Jul",
				"Aug",
				"Sep",
				"Oct",
				"Nov",
				"Dec",
			];
			const mon = months[date.getMonth()];
			const year = date.getFullYear();
			const hours = String(date.getHours()).padStart(2, "0");
			const mins = String(date.getMinutes()).padStart(2, "0");
			return `${day}-${mon}-${year} ${hours}:${mins}`;
		} catch {
			return dateString;
		}
	};

	const grandTotal = useMemo(() => rows.reduce((s, r) => s + rowTotal(r), 0), [rows]);

	const exportCSV = () => {
		if (rows.length === 0) return;
		const headers = [
			"ID","QTR_No","QPR_QTR_No","Month_Year","District",
			"Militants_Killed","Militants_Injured","Militants_Arrested",
			"LEA_Killed","LEA_Injured","Civilians_Killed","Civilians_Injured",
			"IEDs","Target_Killings","Abductions","Fire_Raid","Extortions",
			"Total","Username","Updated"
		];
		const csvRows = rows.map((r) => [
			r.id, r.QTR_No, r.QPR_QTR_No || "", r.Month_Year, r.District,
			r.Militants_Killed, r.Militants_Injured, r.Militants_Arrested,
			r.LEA_Killed, r.LEA_Injured, r.Civilians_Killed, r.Civilians_Injured,
			r.IEDs, r.Target_Killings, r.Abductions, r.Fire_Raid, r.Extortions,
			rowTotal(r), r.username || "", formatDate(r.update_date),
		]);
		const csv = [headers.join(","), ...csvRows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `security_incidents_data_${new Date().toISOString().slice(0, 10)}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Security Incidents Data
					</h1>
					<p className="text-gray-600 mt-2">
						View and manage security incidents summary
					</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading data...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Success Message */}
			{success && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between animate-in slide-in-from-top">
					<div className="flex items-center">
						<CheckCircle className="h-5 w-5 text-green-600 mr-3" />
						<p className="text-green-800 font-medium">{success}</p>
					</div>
					<button
						onClick={() => setSuccess(null)}
						className="text-green-600 hover:text-green-800 transition-colors"
					>
						<svg
							className="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
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
						<svg
							className="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
			)}

			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link
						href="/dashboard"
						className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-green-50 rounded-lg transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back
					</Link>
					<div>
						<h1 className="text-2xl font-bold text-gray-900">
							Security Incidents Data
						</h1>
						<p className="text-sm text-gray-600 mt-1">
							View and manage security incidents summary records
						</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					{/* Total badge */}
					<div className="inline-flex items-center px-4 py-2 h-10 text-sm font-semibold bg-red-50 text-red-700 border border-red-200 rounded-lg whitespace-nowrap">
						Total Incidents: {grandTotal}
					</div>
					{accessSecurityIncidentsData && !accessLoading ? (
						<Link
							href="/dashboard/security-incidents-data/add"
							className="inline-flex items-center justify-center px-4 py-2 h-10 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
						>
							<Plus className="h-4 w-4 mr-2 flex-shrink-0" />
							Add New Incident
						</Link>
					) : (
						<button
							type="button"
							disabled
							title="You do not have permission to add records"
							className="inline-flex items-center justify-center px-4 py-2 h-10 text-sm font-medium bg-green-600 text-white rounded-lg whitespace-nowrap opacity-50 cursor-not-allowed"
						>
							<Plus className="h-4 w-4 mr-2 flex-shrink-0" />
							Add New Incident
						</button>
					)}
					<button
						onClick={fetchData}
						className="inline-flex items-center justify-center px-4 py-2 h-10 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
					>
						<RefreshCw className="h-4 w-4 mr-2 flex-shrink-0" />
						Refresh
					</button>
					<button
						onClick={exportCSV}
						disabled={rows.length === 0}
						className="inline-flex items-center justify-center px-4 py-2 h-10 text-sm font-medium bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Download className="h-4 w-4 mr-2 flex-shrink-0" />
						Export CSV
					</button>
				</div>
			</div>

			{/* Search and Filters */}
			<div className="bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 shadow-lg p-6">
				<div className="flex items-center justify-between mb-4">
					<div>
						<h3 className="text-lg font-semibold text-gray-900">
							Search & Filter
						</h3>
						<p className="text-sm text-gray-600">
							Filter incidents by month, district, quarter or username
						</p>
					</div>
					<button
						onClick={handleReset}
						className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200"
					>
						<RefreshCw className="h-3 w-3 mr-1" />
						Reset
					</button>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
					{/* Month_Year */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Month / Year
						</label>
						<select
							value={selectedMonth}
							onChange={(e) => setSelectedMonth(e.target.value)}
							className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						>
							<option value="">All Months</option>
							{filterOptions.months.map((m) => (
								<option key={m} value={m}>
									{m}
								</option>
							))}
						</select>
					</div>

					{/* District */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							District
						</label>
						<select
							value={selectedDistrict}
							onChange={(e) => setSelectedDistrict(e.target.value)}
							className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						>
							<option value="">All Districts</option>
							{filterOptions.districts.map((d) => (
								<option key={d} value={d}>
									{d}
								</option>
							))}
						</select>
					</div>

					{/* QPR_QTR_No — placed before QTR */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							QPR
						</label>
						<select
							value={selectedQprQtr}
							onChange={(e) => setSelectedQprQtr(e.target.value)}
							className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						>
							<option value="">ALL QPR</option>
							{filterOptions.qprQtrNos.map((q) => (
								<option key={q} value={q}>
									{q}
								</option>
							))}
						</select>
					</div>

					{/* QTR_No */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Quarter
						</label>
						<select
							value={selectedQtr}
							onChange={(e) => setSelectedQtr(e.target.value)}
							className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] outline-none"
						>
							<option value="">All Quarters</option>
							{filterOptions.quarters.map((q) => (
								<option key={q} value={String(q)}>
									QTR {q}
								</option>
							))}
						</select>
					</div>

				</div>

				<div className="flex justify-end">
					<button
						onClick={handleSearch}
						className="inline-flex items-center px-6 py-3 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors shadow-sm"
					>
						<Filter className="h-4 w-4 mr-2" />
						Apply Filters
					</button>
				</div>
			</div>

			{/* GridView Table */}
			{rows.length === 0 ? (
				<div className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center">
					<Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
					<h3 className="text-lg font-medium text-gray-900 mb-2">
						No records found
					</h3>
					<p className="text-gray-600 mb-4">
						{selectedMonth || selectedDistrict || selectedQprQtr || selectedQtr
							? "Try adjusting your filter criteria"
							: "Records will appear here once they are added"}
					</p>
					{accessSecurityIncidentsData && !accessLoading ? (
						<Link
							href="/dashboard/security-incidents-data/add"
							className="inline-flex items-center px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors"
						>
							<Plus className="h-4 w-4 mr-2" />
							Add First Record
						</Link>
					) : (
						<button
							type="button"
							disabled
							title="You do not have permission to add records"
							className="inline-flex items-center px-4 py-2 bg-[#0b4d2b] text-white rounded-lg transition-colors opacity-50 cursor-not-allowed"
						>
							<Plus className="h-4 w-4 mr-2" />
							Add First Record
						</button>
					)}
				</div>
			) : (
				<div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden ring-1 ring-black/5">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gradient-to-r from-gray-100 via-gray-50 to-white border-b-2 border-[#0b4d2b]/25">
								<tr>
									<th
										scope="col"
										className="px-4 py-3.5 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider"
									>
										ID
									</th>
									<th
										scope="col"
										className="px-4 py-3.5 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider"
									>
										QPR
									</th>
									<th
										scope="col"
										className="px-4 py-3.5 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider"
									>
										Month/Year
									</th>
									<th
										scope="col"
										className="px-4 py-3.5 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider"
									>
										District
									</th>
									<th
										scope="col"
										className="px-4 py-3.5 text-center text-xs font-semibold text-gray-800 uppercase tracking-wider"
									>
										Mil. Killed
									</th>
									<th
										scope="col"
										className="px-4 py-3.5 text-center text-xs font-semibold text-gray-800 uppercase tracking-wider"
									>
										Mil. Injured
									</th>
									<th
										scope="col"
										className="px-4 py-3.5 text-center text-xs font-semibold text-gray-800 uppercase tracking-wider"
									>
										Mil. Arrested
									</th>
									<th
										scope="col"
										className="px-4 py-3.5 text-center text-xs font-semibold text-gray-800 uppercase tracking-wider"
									>
										LEA Killed
									</th>
									<th
										scope="col"
										className="px-4 py-3.5 text-center text-xs font-semibold text-gray-800 uppercase tracking-wider"
									>
										LEA Injured
									</th>
									<th
										scope="col"
										className="px-4 py-3.5 text-center text-xs font-semibold text-gray-800 uppercase tracking-wider"
									>
										Civ. Killed
									</th>
									<th
										scope="col"
										className="px-4 py-3.5 text-center text-xs font-semibold text-gray-800 uppercase tracking-wider"
									>
										Civ. Injured
									</th>
									<th
										scope="col"
										className="px-4 py-3.5 text-center text-xs font-semibold text-gray-800 uppercase tracking-wider"
									>
										IEDs
									</th>
									<th
										scope="col"
										className="px-4 py-3.5 text-center text-xs font-semibold text-gray-800 uppercase tracking-wider"
									>
										Tgt Kill
									</th>
									<th
										scope="col"
										className="px-4 py-3.5 text-center text-xs font-semibold text-gray-800 uppercase tracking-wider"
									>
										Abduct.
									</th>
									<th
										scope="col"
										className="px-4 py-3.5 text-center text-xs font-semibold text-gray-800 uppercase tracking-wider"
									>
										Fire Raid
									</th>
									<th
										scope="col"
										className="px-4 py-3.5 text-center text-xs font-semibold text-gray-800 uppercase tracking-wider"
									>
										Extort.
									</th>
									<th
										scope="col"
										className="px-4 py-3.5 text-center text-xs font-semibold text-gray-800 uppercase tracking-wider bg-gray-100/90"
									>
										Total
									</th>
									<th
										scope="col"
										className="px-4 py-3.5 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider"
									>
										User
									</th>
									<th
										scope="col"
										className="px-4 py-3.5 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider"
									>
										Updated
									</th>
									<th
										scope="col"
										className="px-4 py-3.5 text-center text-xs font-semibold text-gray-800 uppercase tracking-wider"
									>
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100 bg-white">
								{rows.map((row, rowIdx) => (
									<tr
										key={row.id}
										className={
											(rowIdx % 2 === 0 ? "bg-white " : "bg-gray-50/60 ") +
											"transition-colors hover:bg-emerald-50/45"
										}
									>
										<td className="px-4 py-3 whitespace-nowrap text-sm font-medium tabular-nums text-gray-900">
											{row.id}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
											{row.QPR_QTR_No || "—"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
											{row.Month_Year}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
											{row.District}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-center tabular-nums text-gray-700">
											{row.Militants_Killed}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-center tabular-nums text-gray-700">
											{row.Militants_Injured}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-center tabular-nums text-gray-700">
											{row.Militants_Arrested}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-center tabular-nums text-gray-700">
											{row.LEA_Killed}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-center tabular-nums text-gray-700">
											{row.LEA_Injured}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-center tabular-nums text-gray-700">
											{row.Civilians_Killed}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-center tabular-nums text-gray-700">
											{row.Civilians_Injured}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-center tabular-nums text-gray-700">
											{row.IEDs}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-center tabular-nums text-gray-700">
											{row.Target_Killings}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-center tabular-nums text-gray-700">
											{row.Abductions}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-center tabular-nums text-gray-700">
											{row.Fire_Raid}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-center tabular-nums text-gray-700">
											{row.Extortions}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-center font-semibold tabular-nums text-gray-900 bg-emerald-50/50">
											{rowTotal(row)}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
											{row.username || "—"}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
											{formatDate(row.update_date)}
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
											<div className="flex items-center justify-center gap-2">
												{accessSecurityIncidentsData && (
													<>
														<Link
															href={`/dashboard/security-incidents-data/add?id=${row.id}`}
															className="inline-flex items-center px-3 py-1.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
															title="Edit"
														>
															<Edit className="h-4 w-4" />
														</Link>
														<button
															onClick={() =>
																setDeleteConfirm({
																	show: true,
																	incident: row,
																})
															}
															className="inline-flex items-center px-3 py-1.5 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
															title="Delete"
														>
															<Trash2 className="h-4 w-4" />
														</button>
													</>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Results Count */}
			{rows.length > 0 && (
				<div className="text-center text-sm text-gray-500">
					Showing {rows.length} of {totalCount} record
					{totalCount !== 1 ? "s" : ""}
				{(selectedMonth ||
					selectedDistrict ||
					selectedQprQtr ||
					selectedQtr) &&
					" matching your criteria"}
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{deleteConfirm.show && deleteConfirm.incident && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all">
						<div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-xl">
							<div className="flex items-center">
								<div className="p-2 bg-white/20 rounded-lg mr-4">
									<Trash2 className="h-6 w-6" />
								</div>
								<div>
									<h2 className="text-2xl font-bold">Confirm Delete</h2>
									<p className="text-red-100 text-sm mt-1">
										This action cannot be undone
									</p>
								</div>
							</div>
						</div>
						<div className="p-6">
							<p className="text-gray-700 text-base mb-3">
								Are you sure you want to delete this record?
							</p>
							<div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
								<p className="text-sm font-medium text-gray-500 mb-1">
									District:
								</p>
								<p className="text-base font-semibold text-gray-900">
									{deleteConfirm.incident.District}
								</p>
								<p className="text-sm font-medium text-gray-500 mb-1 mt-2">
									Month/Year:
								</p>
								<p className="text-base text-gray-700">
									{deleteConfirm.incident.Month_Year}
								</p>
							</div>
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start mt-4">
								<AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
								<p className="text-sm text-yellow-800">
									<strong>Warning:</strong> This will permanently delete this
									record from the database.
								</p>
							</div>
						</div>
						<div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end space-x-3 border-t border-gray-200">
							<button
								onClick={() =>
									setDeleteConfirm({ show: false, incident: null })
								}
								disabled={deleting}
								className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								onClick={handleDelete}
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
