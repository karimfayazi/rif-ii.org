"use client";

import { useEffect, useState, useCallback } from "react";
import { 
	GraduationCap, 
	Users, 
	TrendingUp, 
	Filter, 
	RefreshCw,
	User,
	UserCheck,
	UserCircle2,
	Award,
	FileText,
	Image as ImageIcon,
	List,
	Building2,
	MapPin,
	BarChart3,
	Eye,
	X,
	ExternalLink,
	Loader2,
	ChevronDown,
	ChevronUp
} from "lucide-react";
import { Chart, Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	LineElement,
	PointElement,
	ArcElement,
	Title,
	Tooltip,
	Legend,
	Filler,
	BarController,
	LineController
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
	CategoryScale,
	LinearScale,
	BarElement,
	LineElement,
	PointElement,
	ArcElement,
	BarController,
	LineController,
	Title,
	Tooltip,
	Legend,
	Filler
);

// Chart Type Switcher Component
type ChartType = 'bar' | 'horizontal-bar' | 'line' | 'area' | 'pie';

interface ChartTypeSwitcherProps {
	currentType: ChartType;
	onTypeChange: (type: ChartType) => void;
	availableTypes?: ChartType[];
}

function ChartTypeSwitcher({ currentType, onTypeChange, availableTypes }: ChartTypeSwitcherProps) {
	const defaultTypes: ChartType[] = ['bar', 'horizontal-bar', 'line', 'area', 'pie'];
	const types = availableTypes || defaultTypes;

	const typeLabels: Record<ChartType, string> = {
		'bar': 'V-Bar',
		'horizontal-bar': 'H-Bar',
		'line': 'Line',
		'area': 'Area',
		'pie': 'Pie'
	};

	return (
		<div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
			{types.map((type) => (
				<button
					key={type}
					onClick={() => onTypeChange(type)}
					className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
						currentType === type
							? 'bg-white text-gray-900 shadow-sm'
							: 'text-gray-600 hover:text-gray-900'
					}`}
				>
					{typeLabels[type]}
				</button>
			))}
		</div>
	);
}

// Dynamic Chart Renderer Component
interface DynamicChartRendererProps {
	chartType: ChartType;
	data: any;
	options?: any;
	height?: string;
	showDataLabels?: boolean;
}

function DynamicChartRenderer({ chartType, data, options, height = '280px', showDataLabels = false }: DynamicChartRendererProps) {
	const baseOptions = options || {};

	if (chartType === 'pie') {
		const pieOptions = {
			...baseOptions,
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				...baseOptions.plugins,
				legend: {
					display: true,
					position: 'right' as const,
					labels: {
						boxWidth: 12,
						padding: 10,
						font: { size: 10 }
					}
				},
				datalabels: showDataLabels ? {
					color: '#fff',
					font: { weight: 'bold' as const, size: 10 },
					formatter: (value: number) => value
				} : { display: false }
			}
		};
		
		return (
			<div style={{ height }}>
				<Pie data={data} options={pieOptions} plugins={showDataLabels ? [ChartDataLabels] : []} />
			</div>
		);
	} else if (chartType === 'horizontal-bar') {
		const horizontalOptions = {
			...baseOptions,
			indexAxis: 'y' as const,
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				...baseOptions.plugins,
				datalabels: showDataLabels ? {
					color: '#000',
					font: { weight: 'bold' as const, size: 10 },
					anchor: 'end' as const,
					align: 'end' as const,
					formatter: (value: number) => value
				} : { display: false }
			}
		};
		
		return (
			<div style={{ height }}>
				<Bar data={data} options={horizontalOptions} plugins={showDataLabels ? [ChartDataLabels] : []} />
			</div>
		);
	} else if (chartType === 'area') {
		const areaData = {
			...data,
			datasets: data.datasets.map((dataset: any) => ({
				...dataset,
				fill: true,
				backgroundColor: dataset.backgroundColor?.replace('0.7', '0.2') || 'rgba(59, 130, 246, 0.2)',
				tension: 0.4
			}))
		};
		
		return (
			<div style={{ height }}>
				<Line data={areaData} options={{ ...baseOptions, responsive: true, maintainAspectRatio: false }} />
			</div>
		);
	} else if (chartType === 'line') {
		const lineData = {
			...data,
			datasets: data.datasets.map((dataset: any) => ({
				...dataset,
				fill: false,
				tension: 0.3
			}))
		};
		
		return (
			<div style={{ height }}>
				<Line data={lineData} options={{ ...baseOptions, responsive: true, maintainAspectRatio: false }} />
			</div>
		);
	} else {
		// Default bar chart
		return (
			<div style={{ height }}>
				<Bar data={data} options={{ ...baseOptions, responsive: true, maintainAspectRatio: false }} plugins={showDataLabels ? [ChartDataLabels] : []} />
			</div>
		);
	}
}

type KPIData = {
	totalEvents: number;
	totalParticipants: number;
	registeredParticipants: number;
	totalMale: number;
	totalFemale: number;
	avgParticipantsPerEvent: number;
	avgDuration: number;
	avgPreEvaluation: number;
	avgPostEvaluation: number;
	evaluationImprovement: number;
	eventsWithCompletionReport: number;
	eventsWithParticipantList: number;
	eventsWithPictures: number;
};

type ChartData = {
	eventsOverTime: Array<{ month: string; eventCount: number }>;
	participantsOverTime: Array<{ month: string; participantCount: number }>;
	districtParticipants: Array<{ district: string; participantCount: number }>;
	tehsilParticipants: Array<{ tehsil: string; participantCount: number }>;
	sectorData: Array<{ sector: string; eventCount: number; participantCount: number }>;
	eventTypeDistribution: Array<{ eventType: string; eventCount: number }>;
	orgParticipation: Array<{ organization: string; participantCount: number }>;
	trainingUnitDistribution: Array<{ trainingUnit: string; participantCount: number }>;
	genderDistribution: Array<{ gender: string; participantCount: number }>;
};

type TrainingEvent = {
	SN: number;
	TrainingEventCode: string;
	TrainingTitle: string;
	District: string;
	LocationTehsil: string;
	Sector: string;
	EventType: string;
	StartDate: string;
	EndDate: string;
	TotalDays: number;
	TotalParticipants: number;
	TotalMale: number;
	TotalFemale: number;
	TrainingFacilitatorName: string;
	PreTrainingEvaluation: string;
	PostTrainingEvaluation: string;
	ActivityCompletionReportLink: string;
	ParticipantListAttachment: string;
	PictureAttachment: string;
	Venue: string;
	Output: string;
	SubActivityName: string;
};

type EventParticipant = {
	sn: number;
	participant_name: string;
	so_do_wo_ho: string;
	gender: string;
	organization_department: string;
	designation: string;
	profession: string;
	cnic_number: string;
	contact_number: string;
	tehsil: string;
	district: string;
	NC_VC: string;
	workshop_training_name: string;
	workshop_session_conference: string;
	start_date: string;
	end_date: string;
	Training_Unit: string;
	Venue: string;
	Duration_Days: number;
};

// Unique Participants Types
type UniqueByWorkshopRow = { 
	workshop: string; 
	unique: number; 
};

type UniqueByWorkshopGenderRow = { 
	workshop: string; 
	total: number; 
	male: number; 
	female: number; 
};

type UniqueParticipantsData = {
	uniqueByWorkshop: UniqueByWorkshopRow[];
	uniqueByWorkshopGender: UniqueByWorkshopGenderRow[];
};

// Unique CNIC Summary Types (for tables)
type UniqueCNICByWorkshopRow = {
	workshopTrainingName: string;
	uniqueParticipants: number;
};

type UniqueCNICByWorkshopGenderRow = {
	workshopTrainingName: string;
	uniqueTotal: number;
	uniqueMale: number;
	uniqueFemale: number;
};

type UniqueCNICSummaryData = {
	uniqueByWorkshop: UniqueCNICByWorkshopRow[];
	uniqueByWorkshopGender: UniqueCNICByWorkshopGenderRow[];
};

export default function TrainingWorkshopsDashboardPage() {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [kpis, setKpis] = useState<KPIData | null>(null);
	const [charts, setCharts] = useState<ChartData | null>(null);
	const [events, setEvents] = useState<TrainingEvent[]>([]);
	const [uniqueParticipants, setUniqueParticipants] = useState<UniqueParticipantsData | null>(null);
	const [uniqueParticipantsError, setUniqueParticipantsError] = useState<string | null>(null);
	const [uniqueCNICSummary, setUniqueCNICSummary] = useState<UniqueCNICSummaryData | null>(null);
	const [uniqueCNICSummaryError, setUniqueCNICSummaryError] = useState<string | null>(null);
	const [showAllUniqueByWorkshop, setShowAllUniqueByWorkshop] = useState(false);
	const [showAllUniqueByWorkshopGender, setShowAllUniqueByWorkshopGender] = useState(false);
	const [filterOptions, setFilterOptions] = useState({
		districts: [] as string[],
		tehsils: [] as string[],
		sectors: [] as string[],
		eventTypes: [] as string[],
		facilitators: [] as string[]
	});

	// Filter state
	const [filters, setFilters] = useState({
		fromDate: '',
		toDate: '',
		district: '',
		tehsil: '',
		sector: '',
		eventType: '',
		facilitator: ''
	});
	const [showFilters, setShowFilters] = useState(true);
	const [showSummaryReports, setShowSummaryReports] = useState(true);
	const [showEventsTable, setShowEventsTable] = useState(false);

	// Summary-all: Events + Participants + Evaluation (single fetch)
	type SummaryAllData = {
		eventsSummary: {
			totalEvents: number;
			totalParticipants: number;
			totalMale: number;
			totalFemale: number;
		};
		participantsSummary: {
			totalUniquePersons: number;
			uniqueMale: number;
			uniqueFemale: number;
			repeatBreakdown: Array<{ attendedTimes: number | string; persons: number }>;
		};
		evaluationSummary: {
			preEvaluation: number | null;
			postEvaluation: number | null;
			improvement: number | null;
		};
	};
	const [summaryAllData, setSummaryAllData] = useState<SummaryAllData | null>(null);
	const [summaryAllLoading, setSummaryAllLoading] = useState(true);

	// Event details modal
	const [selectedEvent, setSelectedEvent] = useState<TrainingEvent | null>(null);
	const [eventParticipants, setEventParticipants] = useState<EventParticipant[]>([]);
	const [loadingParticipants, setLoadingParticipants] = useState(false);

	// Chart type states
	const [chartTypes, setChartTypes] = useState({
		eventsAndParticipantsOverTime: 'combo' as ChartType,
		districtParticipants: 'bar' as ChartType,
		tehsilParticipants: 'bar' as ChartType,
		sectorData: 'bar' as ChartType,
		eventTypeDistribution: 'pie' as ChartType,
		genderDistribution: 'pie' as ChartType,
		orgParticipation: 'horizontal-bar' as ChartType,
		trainingUnitDistribution: 'bar' as ChartType,
		prePostEvaluation: 'bar' as ChartType,
		uniqueByWorkshop: 'bar' as ChartType,
		uniqueByWorkshopGender: 'bar' as ChartType
	});

	const updateChartType = (chartName: keyof typeof chartTypes, type: ChartType) => {
		setChartTypes(prev => ({ ...prev, [chartName]: type }));
	};

	// Fetch filter options
	const fetchFilterOptions = useCallback(async () => {
		try {
			const response = await fetch('/api/training-workshops/filters');
			const data = await response.json();
			if (data.success) {
				setFilterOptions(data.filters);
			}
		} catch (error) {
			console.error('Error fetching filter options:', error);
		}
	}, []);

	// Fetch summary-all (Events + Participants + Evaluation in one call)
	const fetchSummaryAll = useCallback(async () => {
		try {
			setSummaryAllLoading(true);
			const response = await fetch("/api/training-workshops/summary-all", { cache: "no-store" });
			const data = await response.json();
			if (data.success && data.data) {
				const d = data.data;
				setSummaryAllData({
					eventsSummary: {
						totalEvents: Number(d.eventsSummary?.totalEvents) ?? 0,
						totalParticipants: Number(d.eventsSummary?.totalParticipants) ?? 0,
						totalMale: Number(d.eventsSummary?.totalMale) ?? 0,
						totalFemale: Number(d.eventsSummary?.totalFemale) ?? 0,
					},
					participantsSummary: {
						totalUniquePersons: Number(d.participantsSummary?.totalUniquePersons) ?? 0,
						uniqueMale: Number(d.participantsSummary?.uniqueMale) ?? 0,
						uniqueFemale: Number(d.participantsSummary?.uniqueFemale) ?? 0,
						repeatBreakdown: Array.isArray(d.participantsSummary?.repeatBreakdown)
							? d.participantsSummary.repeatBreakdown.map(
									(r: { attendedTimes: number | string; persons: number }) => ({
										attendedTimes: typeof r.attendedTimes === "number" ? r.attendedTimes : String(r.attendedTimes ?? "5+"),
										persons: Number(r.persons) ?? 0,
									})
								)
							: [],
					},
					evaluationSummary: {
						preEvaluation:
							d.evaluationSummary?.preEvaluation != null
								? Number(d.evaluationSummary.preEvaluation)
								: null,
						postEvaluation:
							d.evaluationSummary?.postEvaluation != null
								? Number(d.evaluationSummary.postEvaluation)
								: null,
						improvement:
							d.evaluationSummary?.improvement != null
								? Number(d.evaluationSummary.improvement)
								: null,
					},
				});
			} else {
				setSummaryAllData(null);
			}
		} catch (error) {
			console.error("Error fetching summary-all:", error);
			setSummaryAllData(null);
		} finally {
			setSummaryAllLoading(false);
		}
	}, []);

	// Fetch dashboard data
	const fetchDashboardData = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const params = new URLSearchParams();
			if (filters.fromDate) params.append('fromDate', filters.fromDate);
			if (filters.toDate) params.append('toDate', filters.toDate);
			if (filters.district) params.append('district', filters.district);
			if (filters.tehsil) params.append('tehsil', filters.tehsil);
			if (filters.sector) params.append('sector', filters.sector);
			if (filters.eventType) params.append('eventType', filters.eventType);
			if (filters.facilitator) params.append('facilitator', filters.facilitator);

			console.log('Fetching dashboard data with params:', params.toString());
			const response = await fetch(`/api/training-workshops/dashboard?${params.toString()}`, {
				cache: 'no-store'
			});
			
			// Handle non-OK responses
			if (!response.ok) {
				const errorText = await response.text().catch(() => 'Unknown error');
				try {
					const errorJson = JSON.parse(errorText);
					throw new Error(errorJson.message || `Server error: ${response.status}`);
				} catch {
					throw new Error(`Server error: ${response.status} - ${errorText}`);
				}
			}

			const data = await response.json().catch(() => {
				throw new Error('Invalid JSON response from server');
			});

			console.log('Dashboard API response:', data);

			if (data.success) {
				setKpis(data.kpis || {
					totalEvents: 0,
					totalParticipants: 0,
					totalMale: 0,
					totalFemale: 0,
					avgParticipantsPerEvent: 0,
					avgDuration: 0,
					avgPreEvaluation: 0,
					avgPostEvaluation: 0,
					eventsWithCompletionReport: 0,
					eventsWithParticipantList: 0,
					eventsWithPictures: 0,
					registeredParticipants: 0,
					evaluationImprovement: 0
				});
				setCharts(data.charts || {
					eventsOverTime: [],
					participantsOverTime: [],
					districtParticipants: [],
					tehsilParticipants: [],
					sectorData: [],
					eventTypeDistribution: [],
					orgParticipation: [],
					trainingUnitDistribution: [],
					genderDistribution: []
				});
				console.log('Charts data set:', data.charts);
			} else {
				setError(data.message || 'Failed to fetch dashboard data');
				console.error('API returned error:', data.message);
			}
		} catch (error) {
			console.error('Error fetching dashboard data:', error);
			setError(error instanceof Error ? error.message : 'Failed to load dashboard data. Please refresh the page.');
		} finally {
			setLoading(false);
		}
	}, [filters]);

	// Fetch events list
	const fetchEvents = useCallback(async () => {
		try {
			const params = new URLSearchParams();
			if (filters.fromDate) params.append('fromDate', filters.fromDate);
			if (filters.toDate) params.append('toDate', filters.toDate);
			if (filters.district) params.append('district', filters.district);
			if (filters.tehsil) params.append('tehsil', filters.tehsil);
			if (filters.sector) params.append('sector', filters.sector);
			if (filters.eventType) params.append('eventType', filters.eventType);
			if (filters.facilitator) params.append('facilitator', filters.facilitator);

			const response = await fetch(`/api/training-workshops/events?${params.toString()}`);
			const data = await response.json();

			if (data.success) {
				setEvents(data.events);
			}
		} catch (error) {
			console.error('Error fetching events:', error);
		}
	}, [filters]);

	// Fetch event participants
	const fetchEventParticipants = async (trainingEventCode: string) => {
		try {
			setLoadingParticipants(true);
			const response = await fetch(`/api/training-workshops/event-participants?trainingEventCode=${trainingEventCode}`);
			const data = await response.json();

			if (data.success) {
				setEventParticipants(data.participants);
			}
		} catch (error) {
			console.error('Error fetching event participants:', error);
		} finally {
			setLoadingParticipants(false);
		}
	};

	// Fetch unique participants data (CNIC-based) - for charts
	const fetchUniqueParticipants = useCallback(async () => {
		try {
			setUniqueParticipantsError(null);
			const params = new URLSearchParams();
			if (filters.fromDate) params.append('fromDate', filters.fromDate);
			if (filters.toDate) params.append('toDate', filters.toDate);
			if (filters.district) params.append('district', filters.district);
			if (filters.tehsil) params.append('tehsil', filters.tehsil);

			const response = await fetch(`/api/training-workshops/unique-participants?${params.toString()}`, {
				cache: 'no-store'
			});

			if (!response.ok) {
				throw new Error(`Server error: ${response.status}`);
			}

			const data = await response.json();

			if (data.success) {
				setUniqueParticipants(data.data || {
					uniqueByWorkshop: [],
					uniqueByWorkshopGender: []
				});
			} else {
				setUniqueParticipantsError(data.message || 'Failed to fetch unique participants data');
			}
		} catch (error) {
			console.error('Error fetching unique participants:', error);
			setUniqueParticipantsError('Charts data is not available right now.');
		}
	}, [filters]);

	// Fetch unique CNIC summary data - for tables
	const fetchUniqueCNICSummary = useCallback(async () => {
		try {
			setUniqueCNICSummaryError(null);
			const params = new URLSearchParams();
			if (filters.fromDate) params.append('fromDate', filters.fromDate);
			if (filters.toDate) params.append('toDate', filters.toDate);
			if (filters.district) params.append('district', filters.district);
			if (filters.tehsil) params.append('tehsil', filters.tehsil);

			const response = await fetch(`/api/training-workshops/unique-cnic-summary?${params.toString()}`, {
				cache: 'no-store'
			});

			if (!response.ok) {
				throw new Error(`Server error: ${response.status}`);
			}

			const data = await response.json();

			if (data.success) {
				setUniqueCNICSummary(data.data || {
					uniqueByWorkshop: [],
					uniqueByWorkshopGender: []
				});
			} else {
				setUniqueCNICSummaryError(data.message || 'Failed to fetch unique CNIC summary data');
			}
		} catch (error) {
			console.error('Error fetching unique CNIC summary:', error);
			setUniqueCNICSummaryError('Table data is not available right now.');
		}
	}, [filters]);

	useEffect(() => {
		fetchFilterOptions();
	}, [fetchFilterOptions]);

	useEffect(() => {
		fetchSummaryAll();
	}, [fetchSummaryAll]);

	useEffect(() => {
		fetchDashboardData();
	}, [fetchDashboardData]);

	useEffect(() => {
		fetchUniqueParticipants();
	}, [fetchUniqueParticipants]);

	useEffect(() => {
		fetchUniqueCNICSummary();
	}, [fetchUniqueCNICSummary]);

	useEffect(() => {
		if (showEventsTable) {
			fetchEvents();
		}
	}, [showEventsTable, fetchEvents]);

	const handleClearFilters = () => {
		setFilters({
			fromDate: '',
			toDate: '',
			district: '',
			tehsil: '',
			sector: '',
			eventType: '',
			facilitator: ''
		});
	};

	const handleViewEventDetails = (event: TrainingEvent) => {
		setSelectedEvent(event);
		if (event.TrainingEventCode) {
			fetchEventParticipants(event.TrainingEventCode);
		}
	};

	const formatNumber = (num: number | null | undefined) => {
		if (!num && num !== 0) return "0";
		return num.toLocaleString();
	};

	const formatDecimal = (num: number | null | undefined, decimals = 1) => {
		if (!num && num !== 0) return "0";
		return num.toFixed(decimals);
	};

	if (loading && !kpis) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Training-Workshops Dashboard</h1>
					<p className="text-gray-600 mt-2">Comprehensive analysis of training events and workshop activities</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading dashboard data...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Training-Workshops Dashboard</h1>
					<p className="text-gray-600 mt-2">Comprehensive analysis of training events and workshop activities</p>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6">
					<div className="flex items-center mb-3">
						<X className="h-5 w-5 text-red-600 mr-2" />
						<h3 className="text-lg font-semibold text-red-900">Error Loading Dashboard</h3>
					</div>
					<p className="text-red-700 mb-4">{error}</p>
					<button
						onClick={fetchDashboardData}
						className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
					>
						<RefreshCw className="h-4 w-4 mr-2" />
						Try Again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Training-Workshops Dashboard</h1>
					<p className="text-sm text-gray-600 mt-1">Comprehensive analysis of training events and workshop activities</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={() => setShowSummaryReports(!showSummaryReports)}
						className="inline-flex items-center px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
					>
						<BarChart3 className="h-4 w-4 mr-2" />
						{showSummaryReports ? "Hide" : "Show"} Summary Reports
					</button>
					<button
						onClick={() => setShowFilters(!showFilters)}
						className="inline-flex items-center px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
					>
						<Filter className="h-4 w-4 mr-2" />
						{showFilters ? 'Hide' : 'Show'} Filters
					</button>
					<button
						onClick={fetchDashboardData}
						className="inline-flex items-center px-4 py-2 text-sm font-medium bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors"
					>
						<RefreshCw className="h-4 w-4 mr-2" />
						Refresh
					</button>
				</div>
			</div>

			{/* Filters */}
			{showFilters && (
				<div className="bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 shadow-lg p-4">
					<div className="flex items-center justify-between mb-3">
						<div className="flex items-center">
							<Filter className="h-4 w-4 text-gray-500 mr-2" />
							<h2 className="text-lg font-semibold text-gray-900">Filters</h2>
						</div>
						<button
							onClick={handleClearFilters}
							className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
						>
							Clear All
						</button>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
						{/* Date Range */}
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
							<input
								type="date"
								value={filters.fromDate}
								onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
								className="w-full h-9 px-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							/>
						</div>
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
							<input
								type="date"
								value={filters.toDate}
								onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
								className="w-full h-9 px-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							/>
						</div>

						{/* District */}
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">District</label>
							<select
								value={filters.district}
								onChange={(e) => setFilters({ ...filters, district: e.target.value })}
								className="w-full h-9 px-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							>
								<option value="">All Districts</option>
								{filterOptions.districts.map((d) => (
									<option key={d} value={d}>{d}</option>
								))}
							</select>
						</div>

						{/* Tehsil */}
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">Tehsil</label>
							<select
								value={filters.tehsil}
								onChange={(e) => setFilters({ ...filters, tehsil: e.target.value })}
								className="w-full h-9 px-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							>
								<option value="">All Tehsils</option>
								{filterOptions.tehsils.map((t) => (
									<option key={t} value={t}>{t}</option>
								))}
							</select>
						</div>

						{/* Sector */}
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">Sector</label>
							<select
								value={filters.sector}
								onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
								className="w-full h-9 px-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							>
								<option value="">All Sectors</option>
								{filterOptions.sectors.map((s) => (
									<option key={s} value={s}>{s}</option>
								))}
							</select>
						</div>

						{/* Event Type */}
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">Event Type</label>
							<select
								value={filters.eventType}
								onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
								className="w-full h-9 px-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							>
								<option value="">All Types</option>
								{filterOptions.eventTypes.map((et) => (
									<option key={et} value={et}>{et}</option>
								))}
							</select>
						</div>

						{/* Facilitator */}
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">Facilitator</label>
							<select
								value={filters.facilitator}
								onChange={(e) => setFilters({ ...filters, facilitator: e.target.value })}
								className="w-full h-9 px-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent"
							>
								<option value="">All Facilitators</option>
								{filterOptions.facilitators.map((f) => (
									<option key={f} value={f}>{f}</option>
								))}
							</select>
						</div>
					</div>
				</div>
			)}

			{/* Summary: 3 cards in one row — Events, Participants, Evaluation */}
			{showSummaryReports && (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
				{/* Card 1: Events Summary */}
				<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full">
					<div className="px-4 py-3 border-b border-gray-100">
						<h2 className="text-base font-semibold text-gray-900">Events Summary</h2>
						<p className="text-xs text-gray-500 mt-0.5">Totals from all training events</p>
					</div>
					<div className="p-4 flex-1 flex flex-col">
						{summaryAllLoading ? (
							<div className="flex flex-col gap-3">
								{[1, 2, 3, 4].map((i) => (
									<div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 animate-pulse">
										<div className="flex items-center justify-between gap-3">
											<div className="w-9 h-9 bg-gray-200 rounded-lg flex-shrink-0" />
											<div className="h-8 bg-gray-200 rounded w-16 flex-shrink-0" />
										</div>
									</div>
								))}
							</div>
						) : summaryAllData ? (
							<div className="flex flex-col gap-3">
								<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-4">
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-3 min-w-0 flex-1">
											<div className="p-2 rounded-lg flex-shrink-0 bg-blue-50">
												<GraduationCap className="h-5 w-5 text-blue-600" />
											</div>
											<p className="text-sm font-medium text-gray-700 truncate">Events</p>
										</div>
										<p className="text-2xl font-semibold text-gray-900 tabular-nums flex-shrink-0">{summaryAllData.eventsSummary.totalEvents.toLocaleString()}</p>
									</div>
								</div>
								<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-4">
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-3 min-w-0 flex-1">
											<div className="p-2 rounded-lg flex-shrink-0 bg-purple-50">
												<Users className="h-5 w-5 text-purple-600" />
											</div>
											<p className="text-sm font-medium text-gray-700 truncate">Participants</p>
										</div>
										<p className="text-2xl font-semibold text-gray-900 tabular-nums flex-shrink-0">{summaryAllData.eventsSummary.totalParticipants.toLocaleString()}</p>
									</div>
								</div>
								<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-4">
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-3 min-w-0 flex-1">
											<div className="p-2 rounded-lg flex-shrink-0 bg-green-50">
												<User className="h-5 w-5 text-green-600" />
											</div>
											<p className="text-sm font-medium text-gray-700 truncate">Male</p>
										</div>
										<p className="text-2xl font-semibold text-gray-900 tabular-nums flex-shrink-0">{summaryAllData.eventsSummary.totalMale.toLocaleString()}</p>
									</div>
								</div>
								<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-4">
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-3 min-w-0 flex-1">
											<div className="p-2 rounded-lg flex-shrink-0 bg-pink-50">
												<UserCircle2 className="h-5 w-5 text-pink-600" />
											</div>
											<p className="text-sm font-medium text-gray-700 truncate">Female</p>
										</div>
										<p className="text-2xl font-semibold text-gray-900 tabular-nums flex-shrink-0">{summaryAllData.eventsSummary.totalFemale.toLocaleString()}</p>
									</div>
								</div>
							</div>
						) : (
							<div className="flex flex-col gap-3">
								{[["Events", "—"], ["Participants", "—"], ["Male", "—"], ["Female", "—"]].map(([label]) => (
									<div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
										<p className="text-sm font-medium text-gray-700 truncate">{label}</p>
										<p className="text-2xl font-semibold text-gray-500 flex-shrink-0">—</p>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Card 2: Participants Summary */}
				<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full">
					<div className="px-4 py-3 border-b border-gray-100">
						<h2 className="text-base font-semibold text-gray-900">Participants Summary</h2>
						<p className="text-xs text-gray-500 mt-0.5">Actual persons and repeat training (CNIC based)</p>
					</div>
					<div className="p-4 flex-1 flex flex-col">
						{summaryAllLoading ? (
							<div className="flex flex-col gap-3">
								<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 animate-pulse">
									<div className="flex items-center justify-between gap-3">
										<div className="w-9 h-9 bg-gray-200 rounded-lg flex-shrink-0" />
										<div className="h-8 bg-gray-200 rounded w-16 flex-shrink-0" />
									</div>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 animate-pulse">
										<div className="flex items-center justify-between gap-3">
											<div className="w-9 h-9 bg-gray-200 rounded-lg flex-shrink-0" />
											<div className="h-8 bg-gray-200 rounded w-16 flex-shrink-0" />
										</div>
									</div>
									<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 animate-pulse">
										<div className="flex items-center justify-between gap-3">
											<div className="w-9 h-9 bg-gray-200 rounded-lg flex-shrink-0" />
											<div className="h-8 bg-gray-200 rounded w-16 flex-shrink-0" />
										</div>
									</div>
								</div>
							</div>
						) : summaryAllData ? (
							<>
								<div className="flex flex-col gap-3">
									{/* Row 1: Total Actual Persons */}
									<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-4">
										<div className="flex items-center justify-between gap-3">
											<div className="flex items-center gap-3 min-w-0 flex-1">
												<div className="p-2 rounded-lg flex-shrink-0 bg-blue-50">
													<Users className="h-5 w-5 text-blue-600" />
												</div>
												<p className="text-sm font-medium text-gray-700 truncate">Total Actual Persons</p>
											</div>
											<p className="text-2xl font-semibold text-gray-900 tabular-nums flex-shrink-0">{summaryAllData.participantsSummary.totalUniquePersons.toLocaleString()}</p>
										</div>
									</div>
									{/* Row 2: Actual Male and Actual Female */}
									<div className="grid grid-cols-2 gap-3">
										<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-4">
											<div className="flex items-center justify-between gap-3">
												<div className="flex items-center gap-3 min-w-0 flex-1">
													<div className="p-2 rounded-lg flex-shrink-0 bg-green-50">
														<User className="h-5 w-5 text-green-600" />
													</div>
													<p className="text-sm font-medium text-gray-700 truncate">Actual Male</p>
												</div>
												<p className="text-2xl font-semibold text-gray-900 tabular-nums flex-shrink-0">{summaryAllData.participantsSummary.uniqueMale.toLocaleString()}</p>
											</div>
										</div>
										<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-4">
											<div className="flex items-center justify-between gap-3">
												<div className="flex items-center gap-3 min-w-0 flex-1">
													<div className="p-2 rounded-lg flex-shrink-0 bg-pink-50">
														<UserCircle2 className="h-5 w-5 text-pink-600" />
													</div>
													<p className="text-sm font-medium text-gray-700 truncate">Actual Female</p>
												</div>
												<p className="text-2xl font-semibold text-gray-900 tabular-nums flex-shrink-0">{summaryAllData.participantsSummary.uniqueFemale.toLocaleString()}</p>
											</div>
										</div>
									</div>
								</div>
								<div className="mt-3">
									<h3 className="text-xs font-semibold text-gray-700 mb-2">Repeat Training Breakdown</h3>
									{summaryAllData.participantsSummary.repeatBreakdown.length === 0 ? (
										<p className="text-sm text-gray-500">No data.</p>
									) : (
										<table className="w-full text-sm border-collapse">
											<thead>
												<tr className="border-b border-gray-200">
													<th className="text-left py-1.5 px-2 font-medium text-gray-600">Attended</th>
													<th className="text-right py-1.5 px-2 font-medium text-gray-600">Persons</th>
												</tr>
											</thead>
											<tbody>
												{summaryAllData.participantsSummary.repeatBreakdown.map((row, idx) => (
													<tr key={idx} className="border-b border-gray-100 last:border-0">
														<td className="py-1.5 px-2 text-gray-900">
															{typeof row.attendedTimes === "number" ? `${row.attendedTimes} time${row.attendedTimes === 1 ? "" : "s"}` : "5+ times"}
														</td>
														<td className="py-1.5 px-2 text-right text-gray-900 tabular-nums">{row.persons.toLocaleString()}</td>
													</tr>
												))}
											</tbody>
										</table>
									)}
								</div>
							</>
						) : (
							<div className="flex flex-col gap-3">
								<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
									<p className="text-sm font-medium text-gray-700">Total Actual Persons</p>
									<p className="text-2xl font-semibold text-gray-500">—</p>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
										<p className="text-sm font-medium text-gray-700">Actual Male</p>
										<p className="text-2xl font-semibold text-gray-500">—</p>
									</div>
									<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
										<p className="text-sm font-medium text-gray-700">Actual Female</p>
										<p className="text-2xl font-semibold text-gray-500">—</p>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Card 3: Evaluation Summary */}
				<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full">
					<div className="px-4 py-3 border-b border-gray-100">
						<h2 className="text-base font-semibold text-gray-900">Evaluation Summary</h2>
						<p className="text-xs text-gray-500 mt-0.5">Average pre/post scores and improvement</p>
					</div>
					<div className="p-4 flex-1 flex flex-col">
						{summaryAllLoading ? (
							<div className="flex flex-col gap-3">
								{[1, 2, 3].map((i) => (
									<div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 animate-pulse">
										<div className="flex items-center justify-between gap-3">
											<div className="w-9 h-9 bg-gray-200 rounded-lg flex-shrink-0" />
											<div className="h-8 bg-gray-200 rounded w-16 flex-shrink-0" />
										</div>
									</div>
								))}
							</div>
						) : summaryAllData ? (
							<div className="flex flex-col gap-3">
								<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-4">
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-3 min-w-0 flex-1">
											<div className="p-2 rounded-lg flex-shrink-0 bg-yellow-50">
												<Award className="h-5 w-5 text-yellow-600" />
											</div>
											<p className="text-sm font-medium text-gray-700 truncate">Pre-Evaluation</p>
										</div>
										<p className="text-2xl font-semibold text-gray-900 tabular-nums flex-shrink-0">
											{summaryAllData.evaluationSummary.preEvaluation != null
												? Number(summaryAllData.evaluationSummary.preEvaluation).toFixed(2)
												: "—"}
										</p>
									</div>
								</div>
								<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-4">
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-3 min-w-0 flex-1">
											<div className="p-2 rounded-lg flex-shrink-0 bg-green-50">
												<Award className="h-5 w-5 text-green-600" />
											</div>
											<p className="text-sm font-medium text-gray-700 truncate">Post-Evaluation</p>
										</div>
										<p className="text-2xl font-semibold text-gray-900 tabular-nums flex-shrink-0">
											{summaryAllData.evaluationSummary.postEvaluation != null
												? Number(summaryAllData.evaluationSummary.postEvaluation).toFixed(2)
												: "—"}
										</p>
									</div>
								</div>
								<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-4">
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-3 min-w-0 flex-1">
											<div className="p-2 bg-teal-50 rounded-lg flex-shrink-0">
												<TrendingUp className="h-5 w-5 text-teal-600" />
											</div>
											<p className="text-sm font-medium text-gray-700 truncate">Improvement</p>
										</div>
										<p
											className={`text-2xl font-semibold tabular-nums flex-shrink-0 ${
												summaryAllData.evaluationSummary.improvement != null
													? summaryAllData.evaluationSummary.improvement >= 0
														? "text-green-600"
														: "text-red-600"
													: "text-gray-500"
											}`}
										>
											{summaryAllData.evaluationSummary.improvement != null
												? (summaryAllData.evaluationSummary.improvement >= 0 ? "+" : "") +
													Number(summaryAllData.evaluationSummary.improvement).toFixed(2)
												: "—"}
										</p>
									</div>
								</div>
							</div>
						) : (
							<div className="flex flex-col gap-3">
								<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
									<p className="text-sm font-medium text-gray-700">Pre-Evaluation</p>
									<p className="text-2xl font-semibold text-gray-500">—</p>
								</div>
								<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
									<p className="text-sm font-medium text-gray-700">Post-Evaluation</p>
									<p className="text-2xl font-semibold text-gray-500">—</p>
								</div>
								<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
									<p className="text-sm font-medium text-gray-700">Improvement</p>
									<p className="text-2xl font-semibold text-gray-500">—</p>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
			)}

			{/* Charts Section */}
			{charts && (
				charts.eventsOverTime?.length > 0 ||
				charts.participantsOverTime?.length > 0 ||
				charts.districtParticipants?.length > 0 ||
				charts.tehsilParticipants?.length > 0 ||
				charts.sectorData?.length > 0 ||
				charts.eventTypeDistribution?.length > 0 ||
				charts.genderDistribution?.length > 0 ||
				charts.orgParticipation?.length > 0 ||
				charts.trainingUnitDistribution?.length > 0
			) ? (
				<div className="space-y-4">
					{/* Two Charts in One Row - Events/Participants Over Time + Pre/Post Evaluation */}
					{((charts.eventsOverTime && charts.eventsOverTime.length > 0 && charts.participantsOverTime && charts.participantsOverTime.length > 0) || 
					  (kpis && (kpis.avgPreEvaluation > 0 || kpis.avgPostEvaluation > 0))) && (
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
							{/* Events and Participants Over Time */}
							{charts.eventsOverTime && charts.eventsOverTime.length > 0 && charts.participantsOverTime && charts.participantsOverTime.length > 0 && (
								<Card className="bg-white rounded-lg border border-gray-200 shadow-sm h-full">
									<CardHeader className="pb-2">
										<div className="space-y-1">
											<CardTitle className="text-base font-semibold">Events and Participants Over Time</CardTitle>
											<p className="text-xs text-muted-foreground">This chart shows how events and participants change over time.</p>
										</div>
									</CardHeader>
									<CardContent className="pt-0">
										<div className="h-[180px] w-full">
											<Chart
												type="bar"
												data={{
													labels: (charts.eventsOverTime || []).map(d => d.month),
													datasets: [
														{
															type: 'bar' as const,
															label: 'Events',
															data: (charts.eventsOverTime || []).map(d => d.eventCount),
															backgroundColor: 'rgba(59, 130, 246, 0.7)',
															borderColor: 'rgb(59, 130, 246)',
															borderWidth: 1,
															yAxisID: 'y'
														},
														{
															type: 'line' as const,
															label: 'Participants',
															data: (charts.participantsOverTime || []).map(d => d.participantCount),
															borderColor: 'rgb(168, 85, 247)',
															backgroundColor: 'rgba(168, 85, 247, 0.2)',
															borderWidth: 2,
															fill: false,
															tension: 0.3,
															yAxisID: 'y1'
														}
													]
												}}
												options={{
													responsive: true,
													maintainAspectRatio: false,
													interaction: {
														mode: 'index' as const,
														intersect: false
													},
													plugins: {
														legend: {
															display: true,
															position: 'top' as const,
															labels: { boxWidth: 12, padding: 10, font: { size: 10 } }
														},
														tooltip: {
															enabled: true
														}
													},
													scales: {
														x: {
															ticks: {
																maxRotation: 45,
																minRotation: 45,
																font: { size: 9 }
															}
														},
														y: {
															type: 'linear' as const,
															display: true,
															position: 'left' as const,
															beginAtZero: true,
															title: {
																display: true,
																text: 'Events',
																font: { size: 10 }
															},
															ticks: { font: { size: 9 } }
														},
														y1: {
															type: 'linear' as const,
															display: true,
															position: 'right' as const,
															beginAtZero: true,
															title: {
																display: true,
																text: 'Participants',
																font: { size: 10 }
															},
															ticks: { font: { size: 9 } },
															grid: {
																drawOnChartArea: false
															}
														}
													}
												}}
											/>
										</div>
									</CardContent>
								</Card>
							)}

							{/* Pre and Post Evaluation - With Rounded Numbers */}
							{kpis && (kpis.avgPreEvaluation > 0 || kpis.avgPostEvaluation > 0) && (
								<Card className="bg-white rounded-lg border border-gray-200 shadow-sm h-full">
									<CardHeader className="pb-2">
										<div className="flex items-center justify-between">
											<div className="space-y-1 flex-1">
												<CardTitle className="text-base font-semibold">Pre and Post Evaluation</CardTitle>
												<p className="text-xs text-muted-foreground">This chart compares scores before and after the training.</p>
											</div>
											<ChartTypeSwitcher
												currentType={chartTypes.prePostEvaluation}
												onTypeChange={(type) => updateChartType('prePostEvaluation', type)}
												availableTypes={['bar', 'line', 'horizontal-bar']}
											/>
										</div>
									</CardHeader>
									<CardContent className="pt-0">
										<div className="h-[180px] w-full">
											<DynamicChartRenderer
												chartType={chartTypes.prePostEvaluation}
												data={{
													labels: ['Pre-Training', 'Post-Training'],
													datasets: [{
														label: 'Average Score',
														data: [
															Math.round(Number(kpis?.avgPreEvaluation) || 0),
															Math.round(Number(kpis?.avgPostEvaluation) || 0)
														],
														borderColor: ['rgb(251, 191, 36)', 'rgb(34, 197, 94)'],
														backgroundColor: ['rgba(251, 191, 36, 0.7)', 'rgba(34, 197, 94, 0.7)']
													}]
												}}
												options={{
													responsive: true,
													maintainAspectRatio: false,
													plugins: { 
														legend: { display: false },
														tooltip: {
															callbacks: {
																label: (ctx: any) => {
																	const v = ctx.parsed?.y ?? ctx.raw;
																	const n = Number(v);
																	return `${ctx.dataset.label}: ${Number.isFinite(n) ? Math.round(n) : v}`;
																}
															}
														}
													},
													scales: { 
														y: { 
															beginAtZero: true,
															ticks: {
																callback: (value: any) => Math.round(Number(value)).toString()
															}
														} 
													}
												}}
												height="180px"
												showDataLabels={true}
											/>
										</div>
									</CardContent>
								</Card>
							)}
						</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

					{/* District-wise Participants */}
					{charts.districtParticipants && charts.districtParticipants.length > 0 && (
						<Card className="bg-white rounded-lg border border-gray-200 shadow-sm h-full flex flex-col">
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<div className="space-y-1 flex-1">
										<CardTitle className="text-base font-semibold">Participants by District</CardTitle>
										<p className="text-xs text-muted-foreground">This chart shows participant counts by district.</p>
									</div>
									<ChartTypeSwitcher
										currentType={chartTypes.districtParticipants}
										onTypeChange={(type) => updateChartType('districtParticipants', type)}
										availableTypes={['bar', 'horizontal-bar', 'pie']}
									/>
								</div>
							</CardHeader>
							<CardContent className="flex-1">
								<div className="h-[200px] w-full">
									<DynamicChartRenderer
										chartType={chartTypes.districtParticipants}
										data={{
											labels: charts.districtParticipants.map(d => d.district),
											datasets: [{
												label: 'Participants',
												data: charts.districtParticipants.map(d => d.participantCount),
												backgroundColor: chartTypes.districtParticipants === 'pie' 
													? ['rgba(34, 197, 94, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(168, 85, 247, 0.7)', 'rgba(249, 115, 22, 0.7)', 'rgba(239, 68, 68, 0.7)', 'rgba(14, 165, 233, 0.7)']
													: 'rgba(34, 197, 94, 0.7)'
											}]
										}}
										options={{
											plugins: { legend: { display: chartTypes.districtParticipants === 'pie' } },
											scales: chartTypes.districtParticipants !== 'pie' ? { y: { beginAtZero: true } } : undefined
										}}
										height="200px"
										showDataLabels={chartTypes.districtParticipants === 'pie'}
									/>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Tehsil-wise Participants */}
					{charts.tehsilParticipants && charts.tehsilParticipants.length > 0 && (
						<Card className="bg-white rounded-lg border border-gray-200 shadow-sm h-full flex flex-col">
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<div className="space-y-1 flex-1">
										<CardTitle className="text-base font-semibold">Participants by Tehsil</CardTitle>
										<p className="text-xs text-muted-foreground">This chart shows participant counts by tehsil.</p>
									</div>
									<ChartTypeSwitcher
										currentType={chartTypes.tehsilParticipants}
										onTypeChange={(type) => updateChartType('tehsilParticipants', type)}
										availableTypes={['bar', 'horizontal-bar', 'pie']}
									/>
								</div>
							</CardHeader>
							<CardContent className="flex-1">
								<div className="h-[200px] w-full">
									<DynamicChartRenderer
										chartType={chartTypes.tehsilParticipants}
										data={{
											labels: charts.tehsilParticipants.map(d => d.tehsil),
											datasets: [{
												label: 'Participants',
												data: charts.tehsilParticipants.map(d => d.participantCount),
												backgroundColor: chartTypes.tehsilParticipants === 'pie'
													? ['rgba(249, 115, 22, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(34, 197, 94, 0.7)', 'rgba(168, 85, 247, 0.7)', 'rgba(239, 68, 68, 0.7)', 'rgba(14, 165, 233, 0.7)']
													: 'rgba(249, 115, 22, 0.7)'
											}]
										}}
										options={{
											plugins: { legend: { display: chartTypes.tehsilParticipants === 'pie' } },
											scales: chartTypes.tehsilParticipants !== 'pie' ? {
												y: { beginAtZero: true },
												x: { ticks: { maxRotation: 45, minRotation: 45 } }
											} : undefined
										}}
										height="200px"
										showDataLabels={chartTypes.tehsilParticipants === 'pie'}
									/>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Sector-wise Events & Participants */}
					{charts.sectorData && charts.sectorData.length > 0 && (
						<Card className="bg-white rounded-lg border border-gray-200 shadow-sm h-full flex flex-col">
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<div className="space-y-1 flex-1">
										<CardTitle className="text-base font-semibold">Sector-wise Analysis</CardTitle>
										<p className="text-xs text-muted-foreground">This chart shows events and participants by sector.</p>
									</div>
									<ChartTypeSwitcher
										currentType={chartTypes.sectorData}
										onTypeChange={(type) => updateChartType('sectorData', type)}
										availableTypes={['bar', 'horizontal-bar', 'line']}
									/>
								</div>
							</CardHeader>
							<CardContent className="flex-1">
								<div className="h-[200px] w-full">
									<DynamicChartRenderer
										chartType={chartTypes.sectorData}
										data={{
											labels: charts.sectorData.map(d => d.sector),
											datasets: [
												{
													label: 'Events',
													data: charts.sectorData.map(d => d.eventCount),
													borderColor: 'rgb(59, 130, 246)',
													backgroundColor: 'rgba(59, 130, 246, 0.7)'
												},
												{
													label: 'Participants',
													data: charts.sectorData.map(d => d.participantCount),
													borderColor: 'rgb(168, 85, 247)',
													backgroundColor: 'rgba(168, 85, 247, 0.7)'
												}
											]
										}}
										options={{
											plugins: { legend: { display: true, position: 'top' } },
											scales: { y: { beginAtZero: true } }
										}}
										height="200px"
										showDataLabels={false}
									/>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Event Type Distribution */}
					{charts.eventTypeDistribution && charts.eventTypeDistribution.length > 0 && (
						<Card className="bg-white rounded-lg border border-gray-200 shadow-sm h-full flex flex-col">
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<div className="space-y-1 flex-1">
										<CardTitle className="text-base font-semibold">Event Type Distribution</CardTitle>
										<p className="text-xs text-muted-foreground">This chart shows the distribution of different event types.</p>
									</div>
									<ChartTypeSwitcher
										currentType={chartTypes.eventTypeDistribution}
										onTypeChange={(type) => updateChartType('eventTypeDistribution', type)}
										availableTypes={['pie', 'bar', 'horizontal-bar']}
									/>
								</div>
							</CardHeader>
							<CardContent className="flex-1">
								<div className="h-[200px] w-full">
									<DynamicChartRenderer
										chartType={chartTypes.eventTypeDistribution}
										data={{
											labels: charts.eventTypeDistribution.map(d => d.eventType),
											datasets: [{
												data: charts.eventTypeDistribution.map(d => d.eventCount),
												backgroundColor: [
													'rgba(59, 130, 246, 0.7)',
													'rgba(168, 85, 247, 0.7)',
													'rgba(34, 197, 94, 0.7)',
													'rgba(249, 115, 22, 0.7)',
													'rgba(239, 68, 68, 0.7)',
													'rgba(14, 165, 233, 0.7)',
													'rgba(251, 191, 36, 0.7)',
													'rgba(236, 72, 153, 0.7)'
												]
											}]
										}}
										options={{
											plugins: { legend: { display: true, position: chartTypes.eventTypeDistribution === 'pie' ? 'right' : 'top' } },
											scales: chartTypes.eventTypeDistribution !== 'pie' ? { y: { beginAtZero: true } } : undefined
										}}
										height="200px"
										showDataLabels={chartTypes.eventTypeDistribution === 'pie'}
									/>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Gender Distribution */}
					{charts.genderDistribution && charts.genderDistribution.length > 0 && (
						<Card className="bg-white rounded-lg border border-gray-200 shadow-sm h-full flex flex-col">
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<div className="space-y-1 flex-1">
										<CardTitle className="text-base font-semibold">Gender Distribution</CardTitle>
										<p className="text-xs text-muted-foreground">This chart shows participant distribution by gender.</p>
									</div>
									<ChartTypeSwitcher
										currentType={chartTypes.genderDistribution}
										onTypeChange={(type) => updateChartType('genderDistribution', type)}
										availableTypes={['pie', 'bar', 'horizontal-bar']}
									/>
								</div>
							</CardHeader>
							<CardContent className="flex-1">
								<div className="h-[200px] w-full">
									<DynamicChartRenderer
										chartType={chartTypes.genderDistribution}
										data={{
											labels: charts.genderDistribution.map(d => d.gender.charAt(0).toUpperCase() + d.gender.slice(1)),
											datasets: [{
												data: charts.genderDistribution.map(d => d.participantCount),
												backgroundColor: [
													'rgba(59, 130, 246, 0.7)',
													'rgba(236, 72, 153, 0.7)',
													'rgba(156, 163, 175, 0.7)'
												]
											}]
										}}
										options={{
											plugins: { legend: { display: true, position: chartTypes.genderDistribution === 'pie' ? 'right' : 'top' } },
											scales: chartTypes.genderDistribution !== 'pie' ? { y: { beginAtZero: true } } : undefined
										}}
										height="200px"
										showDataLabels={chartTypes.genderDistribution === 'pie'}
									/>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Organization Participation */}
					{charts.orgParticipation && charts.orgParticipation.length > 0 && (
						<Card className="bg-white rounded-lg border border-gray-200 shadow-sm h-full flex flex-col">
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<div className="space-y-1 flex-1">
										<CardTitle className="text-base font-semibold">Organization Participation</CardTitle>
										<p className="text-xs text-muted-foreground">This chart shows participation by organization or department.</p>
									</div>
									<ChartTypeSwitcher
										currentType={chartTypes.orgParticipation}
										onTypeChange={(type) => updateChartType('orgParticipation', type)}
										availableTypes={['horizontal-bar', 'bar', 'pie']}
									/>
								</div>
							</CardHeader>
							<CardContent className="flex-1">
								<div className="h-[200px] w-full">
									<DynamicChartRenderer
										chartType={chartTypes.orgParticipation}
										data={{
											labels: charts.orgParticipation.map(d => d.organization),
											datasets: [{
												label: 'Participants',
												data: charts.orgParticipation.map(d => d.participantCount),
												backgroundColor: chartTypes.orgParticipation === 'pie'
													? ['rgba(99, 102, 241, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(34, 197, 94, 0.7)', 'rgba(249, 115, 22, 0.7)', 'rgba(239, 68, 68, 0.7)', 'rgba(14, 165, 233, 0.7)']
													: 'rgba(99, 102, 241, 0.7)'
											}]
										}}
										options={{
											plugins: { legend: { display: chartTypes.orgParticipation === 'pie' } },
											scales: chartTypes.orgParticipation !== 'pie' ? { 
												[chartTypes.orgParticipation === 'horizontal-bar' ? 'x' : 'y']: { beginAtZero: true } 
											} : undefined
										}}
										height="200px"
										showDataLabels={chartTypes.orgParticipation === 'pie'}
									/>
								</div>
							</CardContent>
						</Card>
					)}

					</div>
				</div>
			) : (
				<div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
					<BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
					<h3 className="text-lg font-semibold text-gray-900 mb-2">No Chart Data Available</h3>
					<p className="text-gray-600 mb-4">
						{charts ? 'No data found for the selected filters. Try adjusting your filter criteria.' : 'Loading chart data...'}
					</p>
					{charts && (
						<button
							onClick={handleClearFilters}
							className="inline-flex items-center px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors"
						>
							<RefreshCw className="h-4 w-4 mr-2" />
							Clear Filters
						</button>
					)}
				</div>
			)}

			{/* Unique Participants Section (CNIC-based) */}
			<div className="space-y-4">
				<div>
					<h2 className="text-xl font-bold text-gray-900">Unique Participants Analysis</h2>
					<p className="text-sm text-gray-600 mt-1">Analysis based on unique CNIC numbers to avoid counting the same person multiple times</p>
				</div>

				{uniqueParticipantsError ? (
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
						<p className="text-sm text-yellow-800">{uniqueParticipantsError}</p>
					</div>
				) : uniqueParticipants && (uniqueParticipants.uniqueByWorkshop.length > 0 || uniqueParticipants.uniqueByWorkshopGender.length > 0) ? (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{/* Chart 1: Unique Participants by Workshop */}
						{uniqueParticipants.uniqueByWorkshop.length > 0 && (
							<Card className="bg-white rounded-lg border border-gray-200 shadow-sm h-full flex flex-col">
								<CardHeader className="pb-2">
									<div className="flex items-center justify-between">
										<div className="space-y-1 flex-1">
											<CardTitle className="text-base font-semibold">Unique Participants by Workshop</CardTitle>
											<p className="text-xs text-muted-foreground">This chart shows how many different people joined each workshop.</p>
										</div>
										<ChartTypeSwitcher
											currentType={chartTypes.uniqueByWorkshop}
											onTypeChange={(type) => updateChartType('uniqueByWorkshop', type)}
											availableTypes={['bar', 'horizontal-bar', 'pie']}
										/>
									</div>
								</CardHeader>
								<CardContent className="flex-1">
									<div className="h-[200px] w-full">
								<DynamicChartRenderer
									chartType={chartTypes.uniqueByWorkshop}
									data={{
										labels: uniqueParticipants.uniqueByWorkshop.slice(0, 10).map(d => d.workshop),
										datasets: [{
											label: 'Unique Participants',
											data: uniqueParticipants.uniqueByWorkshop.slice(0, 10).map(d => d.unique),
											backgroundColor: chartTypes.uniqueByWorkshop === 'pie'
												? [
													'rgba(59, 130, 246, 0.7)',
													'rgba(168, 85, 247, 0.7)',
													'rgba(34, 197, 94, 0.7)',
													'rgba(251, 191, 36, 0.7)',
													'rgba(239, 68, 68, 0.7)',
													'rgba(14, 165, 233, 0.7)',
													'rgba(249, 115, 22, 0.7)',
													'rgba(236, 72, 153, 0.7)',
													'rgba(99, 102, 241, 0.7)',
													'rgba(156, 163, 175, 0.7)'
												]
												: 'rgba(59, 130, 246, 0.7)',
											borderColor: chartTypes.uniqueByWorkshop === 'pie' ? 'white' : 'rgba(59, 130, 246, 1)',
											borderWidth: chartTypes.uniqueByWorkshop === 'pie' ? 2 : 1
										}]
									}}
									options={{
										responsive: true,
										maintainAspectRatio: false,
										plugins: {
											legend: { 
												display: chartTypes.uniqueByWorkshop === 'pie',
												position: 'right' as const,
												labels: { boxWidth: 12, padding: 8, font: { size: 10 } }
											},
											tooltip: {
												callbacks: {
													label: function(context: any) {
														return `${context.label}: ${context.parsed.y || context.parsed} participants`;
													}
												}
											}
										},
										scales: chartTypes.uniqueByWorkshop !== 'pie' ? {
											y: { beginAtZero: true, title: { display: true, text: 'Unique Participants' } },
											x: { 
												ticks: { 
													maxRotation: 45, 
													minRotation: 45,
													font: { size: 10 }
												}
											}
										} : undefined
									}}
									height="200px"
									showDataLabels={chartTypes.uniqueByWorkshop === 'pie'}
								/>
									</div>
									{uniqueParticipants.uniqueByWorkshop.length > 10 && (
										<p className="text-xs text-gray-500 mt-2 text-center">
											Showing top 10 of {uniqueParticipants.uniqueByWorkshop.length} workshops
										</p>
									)}
								</CardContent>
							</Card>
						)}

						{/* Chart 2: Unique Participants by Workshop and Gender */}
						{uniqueParticipants.uniqueByWorkshopGender.length > 0 && (
							<Card className="bg-white rounded-lg border border-gray-200 shadow-sm h-full flex flex-col">
								<CardHeader className="pb-2">
									<div className="flex items-center justify-between">
										<div className="space-y-1 flex-1">
											<CardTitle className="text-base font-semibold">Unique Participants by Workshop and Gender</CardTitle>
											<p className="text-xs text-muted-foreground">This chart shows unique male and female participants in each workshop.</p>
										</div>
										<ChartTypeSwitcher
											currentType={chartTypes.uniqueByWorkshopGender}
											onTypeChange={(type) => updateChartType('uniqueByWorkshopGender', type)}
											availableTypes={['bar', 'horizontal-bar', 'line']}
										/>
									</div>
								</CardHeader>
								<CardContent className="flex-1">
									<div className="h-[200px] w-full">
								<DynamicChartRenderer
									chartType={chartTypes.uniqueByWorkshopGender}
									data={{
										labels: uniqueParticipants.uniqueByWorkshopGender.slice(0, 10).map(d => d.workshop),
										datasets: [
											{
												label: 'Male',
												data: uniqueParticipants.uniqueByWorkshopGender.slice(0, 10).map(d => d.male),
												backgroundColor: 'rgba(59, 130, 246, 0.7)',
												borderColor: 'rgba(59, 130, 246, 1)',
												borderWidth: 1
											},
											{
												label: 'Female',
												data: uniqueParticipants.uniqueByWorkshopGender.slice(0, 10).map(d => d.female),
												backgroundColor: 'rgba(236, 72, 153, 0.7)',
												borderColor: 'rgba(236, 72, 153, 1)',
												borderWidth: 1
											}
										]
									}}
									options={{
										responsive: true,
										maintainAspectRatio: false,
										plugins: {
											legend: { 
												display: true,
												position: 'top' as const,
												labels: { boxWidth: 12, padding: 10, font: { size: 11 } }
											},
											tooltip: {
												callbacks: {
													label: function(context: any) {
														return `${context.dataset.label}: ${context.parsed.y || context.parsed} participants`;
													}
												}
											}
										},
										scales: {
											y: { 
												beginAtZero: true, 
												stacked: false,
												title: { display: true, text: 'Unique Participants' }
											},
											x: { 
												stacked: false,
												ticks: { 
													maxRotation: 45, 
													minRotation: 45,
													font: { size: 10 }
												}
											}
										}
									}}
									height="200px"
									showDataLabels={false}
								/>
									</div>
									{uniqueParticipants.uniqueByWorkshopGender.length > 10 && (
										<p className="text-xs text-gray-500 mt-2 text-center">
											Showing top 10 of {uniqueParticipants.uniqueByWorkshopGender.length} workshops
										</p>
									)}
								</CardContent>
							</Card>
						)}
					</div>
				) : (
					<div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
						<Users className="h-10 w-10 text-gray-400 mx-auto mb-2" />
						<p className="text-sm text-gray-600">Loading unique participants data...</p>
					</div>
				)}

				{/* Table Sections for Unique CNIC Data */}
				<div className="space-y-4 mt-6">
					<div>
						<h2 className="text-xl font-bold text-gray-900">Unique CNIC Summary Tables</h2>
						<p className="text-sm text-gray-600 mt-1">Detailed tables showing unique participant counts by CNIC for each workshop</p>
					</div>

					{uniqueCNICSummaryError ? (
						<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
							<p className="text-sm text-yellow-800">{uniqueCNICSummaryError}</p>
						</div>
					) : uniqueCNICSummary && (uniqueCNICSummary.uniqueByWorkshop.length > 0 || uniqueCNICSummary.uniqueByWorkshopGender.length > 0) ? (
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
							{/* Table 1: Unique Participants by Workshop */}
							{uniqueCNICSummary.uniqueByWorkshop.length > 0 && (
								<Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
									<CardHeader className="pb-2">
										<div className="space-y-1">
											<CardTitle className="text-base font-semibold">Unique Participants by Workshop</CardTitle>
											<p className="text-xs text-muted-foreground">This table shows unique people counted by CNIC for each workshop.</p>
										</div>
									</CardHeader>
									<CardContent>
										<div className="space-y-2">
											<div className="max-h-96 overflow-auto border border-gray-200 rounded-lg">
												<table className="min-w-full divide-y divide-gray-200">
													<thead className="bg-gray-50 sticky top-0">
														<tr>
															<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Workshop Training Name</th>
															<th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unique Participants</th>
														</tr>
													</thead>
													<tbody className="bg-white divide-y divide-gray-200">
														{(showAllUniqueByWorkshop ? uniqueCNICSummary.uniqueByWorkshop : uniqueCNICSummary.uniqueByWorkshop.slice(0, 10)).map((row, idx) => (
															<tr key={idx} className="hover:bg-gray-50">
																<td className="px-4 py-2 text-sm text-gray-900" title={row.workshopTrainingName}>
																	{row.workshopTrainingName.length > 50 ? row.workshopTrainingName.substring(0, 50) + '...' : row.workshopTrainingName}
																</td>
																<td className="px-4 py-2 text-sm font-semibold text-gray-900 text-right">{row.uniqueParticipants}</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
											{uniqueCNICSummary.uniqueByWorkshop.length > 10 && (
												<div className="flex justify-center">
													<button
														onClick={() => setShowAllUniqueByWorkshop(!showAllUniqueByWorkshop)}
														className="text-xs text-blue-600 hover:text-blue-800 font-medium"
													>
														{showAllUniqueByWorkshop ? 'Show Top 10' : `Show All (${uniqueCNICSummary.uniqueByWorkshop.length})`}
													</button>
												</div>
											)}
											<div className="text-xs text-gray-500 text-center pt-2 border-t">
												Total: {uniqueCNICSummary.uniqueByWorkshop.length} workshops
											</div>
										</div>
									</CardContent>
								</Card>
							)}

							{/* Table 2: Unique Participants by Workshop and Gender */}
							{uniqueCNICSummary.uniqueByWorkshopGender.length > 0 && (
								<Card className="bg-white rounded-lg border border-gray-200 shadow-sm">
									<CardHeader className="pb-2">
										<div className="space-y-1">
											<CardTitle className="text-base font-semibold">Unique Participants by Workshop and Gender</CardTitle>
											<p className="text-xs text-muted-foreground">This table shows unique male and female participants for each workshop.</p>
										</div>
									</CardHeader>
									<CardContent>
										<div className="space-y-2">
											<div className="max-h-96 overflow-auto border border-gray-200 rounded-lg">
												<table className="min-w-full divide-y divide-gray-200">
													<thead className="bg-gray-50 sticky top-0">
														<tr>
															<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Workshop Training Name</th>
															<th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unique Total</th>
															<th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unique Male</th>
															<th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unique Female</th>
														</tr>
													</thead>
													<tbody className="bg-white divide-y divide-gray-200">
														{(showAllUniqueByWorkshopGender ? uniqueCNICSummary.uniqueByWorkshopGender : uniqueCNICSummary.uniqueByWorkshopGender.slice(0, 10)).map((row, idx) => (
															<tr key={idx} className="hover:bg-gray-50">
																<td className="px-4 py-2 text-sm text-gray-900" title={row.workshopTrainingName}>
																	{row.workshopTrainingName.length > 40 ? row.workshopTrainingName.substring(0, 40) + '...' : row.workshopTrainingName}
																</td>
																<td className="px-4 py-2 text-sm font-semibold text-gray-900 text-right">{row.uniqueTotal}</td>
																<td className="px-4 py-2 text-sm text-blue-600 text-right">{row.uniqueMale}</td>
																<td className="px-4 py-2 text-sm text-pink-600 text-right">{row.uniqueFemale}</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
											{uniqueCNICSummary.uniqueByWorkshopGender.length > 10 && (
												<div className="flex justify-center">
													<button
														onClick={() => setShowAllUniqueByWorkshopGender(!showAllUniqueByWorkshopGender)}
														className="text-xs text-blue-600 hover:text-blue-800 font-medium"
													>
														{showAllUniqueByWorkshopGender ? 'Show Top 10' : `Show All (${uniqueCNICSummary.uniqueByWorkshopGender.length})`}
													</button>
												</div>
											)}
											<div className="text-xs text-gray-500 text-center pt-2 border-t">
												Total: {uniqueCNICSummary.uniqueByWorkshopGender.length} workshops
											</div>
										</div>
									</CardContent>
								</Card>
							)}
						</div>
					) : (
						<div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
							<Users className="h-10 w-10 text-gray-400 mx-auto mb-2" />
							<p className="text-sm text-gray-600">Table data is not available right now.</p>
						</div>
					)}
				</div>
			</div>

			{/* Events Drilldown Table */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
				<div className="p-4 border-b border-gray-200 flex items-center justify-between">
					<h3 className="text-lg font-semibold text-gray-900">Training Events</h3>
					<button
						onClick={() => setShowEventsTable(!showEventsTable)}
						className="inline-flex items-center px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
					>
						{showEventsTable ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
						{showEventsTable ? 'Hide' : 'Show'} Table
					</button>
				</div>

				{showEventsTable && (
					<div className="overflow-x-auto">
						{events.length === 0 ? (
							<div className="p-8 text-center text-gray-500">
								No events found for the selected filters.
							</div>
						) : (
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Code</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">District</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tehsil</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sector</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Participants</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Male</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Female</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{events.map((event) => (
										<tr key={event.SN} className="hover:bg-gray-50">
											<td className="px-4 py-3 text-sm text-gray-900">{event.TrainingEventCode || 'N/A'}</td>
											<td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={event.TrainingTitle}>
												{event.TrainingTitle}
											</td>
											<td className="px-4 py-3 text-sm text-gray-900">{event.District}</td>
											<td className="px-4 py-3 text-sm text-gray-900">{event.LocationTehsil}</td>
											<td className="px-4 py-3 text-sm text-gray-900">{event.Sector || 'N/A'}</td>
											<td className="px-4 py-3 text-sm text-gray-900">{event.EventType}</td>
											<td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
												{event.StartDate} to {event.EndDate}
											</td>
											<td className="px-4 py-3 text-sm text-gray-900 text-center">{event.TotalDays}</td>
											<td className="px-4 py-3 text-sm font-semibold text-gray-900 text-center">{event.TotalParticipants}</td>
											<td className="px-4 py-3 text-sm text-gray-900 text-center">{event.TotalMale}</td>
											<td className="px-4 py-3 text-sm text-gray-900 text-center">{event.TotalFemale}</td>
											<td className="px-4 py-3 text-sm whitespace-nowrap">
												<div className="flex items-center gap-2">
													<button
														onClick={() => handleViewEventDetails(event)}
														className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
														title="View Details"
													>
														<Eye className="h-4 w-4" />
													</button>
													{event.ActivityCompletionReportLink && (
														<button
															onClick={() => window.open(event.ActivityCompletionReportLink, '_blank')}
															className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
															title="Open Report"
														>
															<FileText className="h-4 w-4" />
														</button>
													)}
													{event.ParticipantListAttachment && (
														<button
															onClick={() => window.open(event.ParticipantListAttachment, '_blank')}
															className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
															title="Open Participant List"
														>
															<List className="h-4 w-4" />
														</button>
													)}
													{event.PictureAttachment && (
														<button
															onClick={() => window.open(event.PictureAttachment, '_blank')}
															className="p-1.5 text-pink-600 hover:bg-pink-50 rounded transition-colors"
															title="Open Pictures"
														>
															<ImageIcon className="h-4 w-4" />
														</button>
													)}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
						{events.length > 0 && (
							<div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
								<p className="text-sm text-gray-600">
									Showing <span className="font-medium">{events.length}</span> event{events.length !== 1 ? 's' : ''}
								</p>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Event Details Modal */}
			{selectedEvent && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
						<div className="sticky top-0 bg-gradient-to-r from-[#0b4d2b] to-[#0a3d24] text-white px-6 py-4 flex items-center justify-between">
							<h2 className="text-xl font-bold">Event Details: {selectedEvent.TrainingTitle}</h2>
							<button
								onClick={() => setSelectedEvent(null)}
								className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
							>
								<X className="h-5 w-5" />
							</button>
						</div>

						<div className="p-6 space-y-6">
							{/* Event Info */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="text-sm font-medium text-gray-500">Event Code</label>
									<p className="text-sm text-gray-900 mt-1">{selectedEvent.TrainingEventCode || 'N/A'}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Event Type</label>
									<p className="text-sm text-gray-900 mt-1">{selectedEvent.EventType}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">District</label>
									<p className="text-sm text-gray-900 mt-1">{selectedEvent.District}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Tehsil</label>
									<p className="text-sm text-gray-900 mt-1">{selectedEvent.LocationTehsil}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Sector</label>
									<p className="text-sm text-gray-900 mt-1">{selectedEvent.Sector || 'N/A'}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Facilitator</label>
									<p className="text-sm text-gray-900 mt-1">{selectedEvent.TrainingFacilitatorName}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Start Date</label>
									<p className="text-sm text-gray-900 mt-1">{selectedEvent.StartDate}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">End Date</label>
									<p className="text-sm text-gray-900 mt-1">{selectedEvent.EndDate}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Total Days</label>
									<p className="text-sm text-gray-900 mt-1">{selectedEvent.TotalDays}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Total Participants</label>
									<p className="text-sm font-semibold text-gray-900 mt-1">{selectedEvent.TotalParticipants}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Male / Female</label>
									<p className="text-sm text-gray-900 mt-1">{selectedEvent.TotalMale} / {selectedEvent.TotalFemale}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-500">Venue</label>
									<p className="text-sm text-gray-900 mt-1">{selectedEvent.Venue || 'N/A'}</p>
								</div>
							</div>

							{/* Participants Table */}
							<div className="border-t pt-4">
								<h3 className="text-lg font-semibold text-gray-900 mb-3">
									Registered Participants ({eventParticipants.length})
								</h3>
								{loadingParticipants ? (
									<div className="flex items-center justify-center py-8">
										<Loader2 className="h-6 w-6 animate-spin text-[#0b4d2b]" />
										<span className="ml-2 text-gray-600">Loading participants...</span>
									</div>
								) : eventParticipants.length === 0 ? (
									<p className="text-sm text-gray-500 py-4">No registered participants found for this event.</p>
								) : (
									<div className="overflow-x-auto border border-gray-200 rounded-lg">
										<table className="min-w-full divide-y divide-gray-200">
											<thead className="bg-gray-50">
												<tr>
													<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
													<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
													<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
													<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
													<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">CNIC</th>
													<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
													<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">District</th>
												</tr>
											</thead>
											<tbody className="bg-white divide-y divide-gray-200">
												{eventParticipants.map((participant) => (
													<tr key={participant.sn} className="hover:bg-gray-50">
														<td className="px-4 py-2 text-sm text-gray-900">{participant.participant_name}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{participant.gender}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{participant.organization_department || 'N/A'}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{participant.designation || 'N/A'}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{participant.cnic_number || 'N/A'}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{participant.contact_number || 'N/A'}</td>
														<td className="px-4 py-2 text-sm text-gray-900">{participant.district}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</div>
						</div>

						<div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
							<button
								onClick={() => setSelectedEvent(null)}
								className="px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
