"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar, Folder, Image as ImageIcon, ExternalLink, TrendingUp, MapPin, Building2, Newspaper, Clock, Layers, Info, Loader2, ChevronDown, ChevronUp, Shield, AlertTriangle, User, X, Droplet, Trash2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import DIKPanialaGISMapSection from '@/components/DIKPanialaGISMap';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	LineElement,
	PointElement,
	ArcElement,
	Filler,
	Title,
	Tooltip,
	Legend,
	ChartOptions,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register ChartJS components (without datalabels globally)
ChartJS.register(
	CategoryScale,
	LinearScale,
	BarElement,
	LineElement,
	PointElement,
	ArcElement,
	Filler,
	Title,
	Tooltip,
	Legend
);

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

// Chart Type Switcher Component
type ChartType = 'bar' | 'horizontal-bar' | 'line' | 'area' | 'pie';

interface ChartTypeSwitcherProps {
	chartId: string;
	currentType: ChartType;
	onTypeChange: (type: ChartType) => void;
}

function ChartTypeSwitcher({ chartId, currentType, onTypeChange }: ChartTypeSwitcherProps) {
	const types: { value: ChartType; label: string }[] = [
		{ value: 'bar', label: 'V-Bar' },
		{ value: 'horizontal-bar', label: 'H-Bar' },
		{ value: 'line', label: 'Line' },
		{ value: 'area', label: 'Area' },
		{ value: 'pie', label: 'Pie' },
	];

	return (
		<div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
			{types.map((type) => (
				<button
					key={type.value}
					onClick={() => onTypeChange(type.value)}
					className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
						currentType === type.value
							? 'bg-white text-gray-900 shadow-sm'
							: 'text-gray-600 hover:text-gray-900'
					}`}
				>
					{type.label}
				</button>
			))}
		</div>
	);
}

// Dynamic Chart Renderer Component
interface DynamicChartRendererProps {
	chartType: ChartType;
	data: any;
	options: ChartOptions<'bar'> | ChartOptions<'line'> | ChartOptions<'pie'>;
	height?: string;
}

function DynamicChartRenderer({ chartType, data, options, height = '280px' }: DynamicChartRendererProps) {
	if (chartType === 'pie') {
		// Pie chart
		const pieOptions: ChartOptions<'pie'> = {
			responsive: true,
			maintainAspectRatio: true,
			aspectRatio: 1.2,
			plugins: {
				legend: {
					display: true,
					position: 'right',
					labels: {
						boxWidth: 12,
						padding: 10,
						font: {
							size: 10,
						}
					}
				},
				tooltip: {
					callbacks: {
						label: function(context) {
							const label = context.label || '';
							const value = context.parsed || 0;
							return `${label}: ${value}%`;
						}
					}
				},
				datalabels: {
					color: '#fff',
					font: {
						weight: 'bold',
						size: 10,
					},
					formatter: (value) => `${value}%`,
				}
			}
		};
		
		return (
			<div style={{ height }}>
				<Pie data={data as any} options={pieOptions} plugins={[ChartDataLabels] as any} />
			</div>
		);
	} else if (chartType === 'horizontal-bar') {
		// Horizontal bar chart
		const horizontalOptions: ChartOptions<'bar'> = {
			...options,
			indexAxis: 'y' as const,
			scales: {
				x: {
					beginAtZero: true,
					max: 100,
					title: {
						display: true,
						text: 'Progress (%)',
						font: {
							size: 11,
							weight: 'bold',
						}
					},
					ticks: {
						stepSize: 20,
						font: {
							size: 10,
						}
					},
					grid: {
						color: 'rgba(0, 0, 0, 0.05)',
					}
				},
				y: {
					title: {
						display: false,
					},
					grid: {
						display: false,
					},
					ticks: {
						font: {
							size: 9,
						}
					}
				}
			}
		};
		
		return (
			<div style={{ height }}>
				<Bar data={data as any} options={horizontalOptions} plugins={[ChartDataLabels] as any} />
			</div>
		);
	} else if (chartType === 'area') {
		// Area chart is a line chart with fill
		const areaData = {
			...data,
			datasets: data.datasets.map((dataset: any) => ({
				...dataset,
				fill: true,
				tension: 0.4,
			}))
		};
		
		return (
			<div style={{ height }}>
				<Line data={areaData as any} options={options as ChartOptions<'line'>} plugins={[ChartDataLabels] as any} />
			</div>
		);
	} else if (chartType === 'line') {
		const lineData = {
			...data,
			datasets: data.datasets.map((dataset: any) => ({
				...dataset,
				tension: 0.4,
			}))
		};
		
		return (
			<div style={{ height }}>
				<Line data={lineData as any} options={options as ChartOptions<'line'>} plugins={[ChartDataLabels] as any} />
			</div>
		);
	} else {
		// Default: vertical bar chart
		return (
			<div style={{ height }}>
				<Bar data={data as any} options={options as ChartOptions<'bar'>} plugins={[ChartDataLabels] as any} />
			</div>
		);
	}
}

// Hook for chart type persistence
function useChartType(chartId: string, defaultType: ChartType = 'bar'): [ChartType, (type: ChartType) => void] {
	const [chartType, setChartType] = useState<ChartType>(defaultType);
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
		// Load from localStorage on mount (client-side only)
		const saved = localStorage.getItem(`chartType_${chartId}`);
		const validTypes: ChartType[] = ['bar', 'horizontal-bar', 'line', 'area', 'pie'];
		if (saved && validTypes.includes(saved as ChartType)) {
			setChartType(saved as ChartType);
		}
	}, [chartId]);

	const updateChartType = (type: ChartType) => {
		setChartType(type);
		if (typeof window !== 'undefined') {
			localStorage.setItem(`chartType_${chartId}`, type);
		}
	};

	return [chartType, updateChartType];
}

// GIS Map Component with Boundaries using Leaflet (OpenStreetMap)
function GISMapWithBoundaries() {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<any>(null);
	const [mapLoaded, setMapLoaded] = useState(false);
	const [mapError, setMapError] = useState<string | null>(null);

	useEffect(() => {
		if (!mapContainerRef.current || mapLoaded) return;

		let linkElement: HTMLLinkElement | null = null;
		let scriptElement: HTMLScriptElement | null = null;
		let timeoutId: NodeJS.Timeout | null = null;
		let checkInterval: NodeJS.Timeout | null = null;
		let isMounted = true;

		const initializeMap = () => {
			if (!isMounted) return;
			// Wait a bit to ensure DOM is ready
			setTimeout(() => {
				try {
					const L = (window as any).L;
					if (!L) {
						setMapError('Map library failed to load');
						return;
					}

					if (!mapContainerRef.current) {
						setMapError('Map container not found');
						return;
					}

					const container = mapContainerRef.current;

					// Check if container already has a Leaflet map instance
					if ((container as any)._leaflet_id) {
						// Container already has a map, try to get it and remove it
						try {
							const existingMap = (container as any)._leaflet;
							if (existingMap && typeof existingMap.remove === 'function') {
								existingMap.remove();
							}
							// Clear the leaflet ID
							delete (container as any)._leaflet_id;
							delete (container as any)._leaflet;
						} catch (e) {
							console.warn('Error cleaning existing map:', e);
						}
					}

					// Clear any existing map reference
					if (mapInstanceRef.current) {
						try {
							if (typeof mapInstanceRef.current.remove === 'function') {
								mapInstanceRef.current.remove();
							}
						} catch (e) {
							console.warn('Error removing existing map instance:', e);
						}
						mapInstanceRef.current = null;
					}

					// Ensure container has proper dimensions
					if (container.offsetWidth === 0 || container.offsetHeight === 0) {
						setTimeout(initializeMap, 200);
						return;
					}

					// Fix default marker icon issue
					delete (L.Icon.Default.prototype as any)._getIconUrl;
					L.Icon.Default.mergeOptions({
						iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
						iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
						shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
					});

					// Initialize map centered on Paharpur
					const map = L.map(container, {
						center: [32.105, 70.97],
						zoom: 13,
						zoomControl: true,
						attributionControl: true
					});

					mapInstanceRef.current = map;

					// Add OpenStreetMap tile layer
					L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
						attribution: '© OpenStreetMap contributors',
						maxZoom: 19
					}).addTo(map);

					// Load and display GeoJSON layers
					const loadGeoJSONLayers = async () => {
						try {
							// Check if map still exists and is valid
							const currentMap = mapInstanceRef.current;
							if (!currentMap || !currentMap.getContainer || !currentMap.getContainer()) {
								console.warn('Map instance not available or not initialized, skipping layer load');
								return;
							}

							// Verify map container exists
							const mapContainer = currentMap.getContainer();
							if (!mapContainer || !mapContainer.parentNode) {
								console.warn('Map container not available, skipping layer load');
								return;
							}

							// Load Boundary layer
							const boundaryResponse = await fetch('/maps/DIK/Paharpur/Paharpur_NC_Boundary_WGS84.json');
							if (boundaryResponse.ok && currentMap && currentMap.getContainer()) {
								try {
									const boundaryData = await boundaryResponse.json();
									if (currentMap && currentMap.getContainer()) {
										const layer = L.geoJSON(boundaryData, {
											style: {
												color: '#0b4d2b',
												weight: 3,
												opacity: 0.8,
												fillColor: '#0b4d2b',
												fillOpacity: 0.2
											},
											onEachFeature: (feature: any, layer: any) => {
												if (feature.properties) {
													const props = feature.properties;
													const popupContent = `
														<div style="font-weight: bold; margin-bottom: 5px;">${props.NC || 'Boundary'}</div>
														<div>Tehsil: ${props.Tehsil || 'N/A'}</div>
														<div>District: ${props.District || 'N/A'}</div>
													`;
													layer.bindPopup(popupContent);
												}
											}
										});
									if (
										layer &&
										currentMap &&
										currentMap.getContainer() &&
										typeof currentMap.addLayer === 'function'
									) {
										try {
											// Re-check currentMap right before adding to ensure it's still valid
											const mapToUse = mapInstanceRef.current;
											if (mapToUse && mapToUse.getContainer && mapToUse.getContainer()) {
												layer.addTo(mapToUse);
											} else {
												console.warn('Map instance became invalid before adding boundary layer');
											}
										} catch (err) {
											console.error('Error adding boundary layer to map:', err);
										}
									} else {
										console.warn('Skipping boundary layer add due to invalid map instance');
									}
									}
								} catch (err) {
									console.error('Error adding boundary layer:', err);
								}
							}

							// Load Solid Waste points layer
							const swResponse = await fetch('/maps/DIK/Paharpur/Paharpur_NC_Sw_WGS84.json');
							if (swResponse.ok && currentMap && currentMap.getContainer()) {
								try {
									const swData = await swResponse.json();
									if (currentMap && currentMap.getContainer()) {
										const layer = L.geoJSON(swData, {
											pointToLayer: (feature: any, latlng: any) => {
												const status = feature.properties?.Status || '';
												const isOfficial = status.toLowerCase().includes('official');
												return L.circleMarker(latlng, {
													radius: 6,
													fillColor: isOfficial ? '#28a745' : '#dc3545',
													color: '#fff',
													weight: 2,
													opacity: 1,
													fillOpacity: 0.8
												});
											},
											onEachFeature: (feature: any, layer: any) => {
												if (feature.properties) {
													const props = feature.properties;
													const popupContent = `
														<div style="font-weight: bold; margin-bottom: 5px;">${props.Name || 'Dumping Site'}</div>
														<div>Status: ${props.Status || 'N/A'}</div>
													`;
													layer.bindPopup(popupContent);
												}
											}
										});
									if (
										layer &&
										currentMap &&
										currentMap.getContainer() &&
										typeof currentMap.addLayer === 'function'
									) {
										try {
											// Re-check currentMap right before adding to ensure it's still valid
											const mapToUse = mapInstanceRef.current;
											if (mapToUse && mapToUse.getContainer && mapToUse.getContainer()) {
												layer.addTo(mapToUse);
											} else {
												console.warn('Map instance became invalid before adding solid waste layer');
											}
										} catch (err) {
											console.error('Error adding solid waste layer to map:', err);
										}
									} else {
										console.warn('Skipping solid waste layer add due to invalid map instance');
									}
									}
								} catch (err) {
									console.error('Error adding solid waste layer:', err);
								}
							}

							// Load Water points layer
							const waterResponse = await fetch('/maps/DIK/Paharpur/Paharpur_NC_Water_WGS84.json');
							if (waterResponse.ok && currentMap && currentMap.getContainer()) {
								try {
									const waterData = await waterResponse.json();
									if (currentMap && currentMap.getContainer()) {
										const layer = L.geoJSON(waterData, {
											pointToLayer: (feature: any, latlng: any) => {
												const featureType = feature.properties?.Feature || '';
												const isFunctional = featureType.toLowerCase().includes('functional');
												return L.circleMarker(latlng, {
													radius: 6,
													fillColor: isFunctional ? '#007bff' : '#6c757d',
													color: '#fff',
													weight: 2,
													opacity: 1,
													fillOpacity: 0.8
												});
											},
											onEachFeature: (feature: any, layer: any) => {
												if (feature.properties) {
													const props = feature.properties;
													const popupContent = `
														<div style="font-weight: bold; margin-bottom: 5px;">${props.Name || 'Water Point'}</div>
														<div>Feature: ${props.Feature || 'N/A'}</div>
														<div>NC: ${props.NC || 'N/A'}</div>
													`;
													layer.bindPopup(popupContent);
												}
											}
										});
									if (
										layer &&
										currentMap &&
										currentMap.getContainer() &&
										typeof currentMap.addLayer === 'function'
									) {
										try {
											// Re-check currentMap right before adding to ensure it's still valid
											const mapToUse = mapInstanceRef.current;
											if (mapToUse && mapToUse.getContainer && mapToUse.getContainer()) {
												layer.addTo(mapToUse);
											} else {
												console.warn('Map instance became invalid before adding water layer');
											}
										} catch (err) {
											console.error('Error adding water layer to map:', err);
										}
									} else {
										console.warn('Skipping water layer add due to invalid map instance');
									}
									}
								} catch (err) {
									console.error('Error adding water layer:', err);
								}
							}

							// Load Points layer (combined points)
							const pointsResponse = await fetch('/maps/DIK/Paharpur/Paharpur_Points_WGS84.json');
							if (pointsResponse.ok && currentMap && currentMap.getContainer()) {
								try {
									const pointsData = await pointsResponse.json();
									if (currentMap && currentMap.getContainer()) {
										const layer = L.geoJSON(pointsData, {
											pointToLayer: (feature: any, latlng: any) => {
												const featureType = feature.properties?.Feature || '';
												let color = '#ffc107';
												if (featureType.toLowerCase().includes('dumping')) {
													color = feature.properties?.Status?.toLowerCase().includes('official') ? '#28a745' : '#dc3545';
												} else if (featureType.toLowerCase().includes('water') || featureType.toLowerCase().includes('reservoir') || featureType.toLowerCase().includes('tube well')) {
													color = feature.properties?.Status?.toLowerCase().includes('functional') ? '#007bff' : '#6c757d';
												}
												return L.circleMarker(latlng, {
													radius: 5,
													fillColor: color,
													color: '#fff',
													weight: 2,
													opacity: 1,
													fillOpacity: 0.8
												});
											},
											onEachFeature: (feature: any, layer: any) => {
												if (feature.properties) {
													const props = feature.properties;
													const popupContent = `
														<div style="font-weight: bold; margin-bottom: 5px;">${props.Name || 'Point'}</div>
														<div>Feature: ${props.Feature || 'N/A'}</div>
														${props.Status ? `<div>Status: ${props.Status}</div>` : ''}
													`;
													layer.bindPopup(popupContent);
												}
											}
										});
									if (
										layer &&
										currentMap &&
										currentMap.getContainer() &&
										typeof currentMap.addLayer === 'function'
									) {
										try {
											// Re-check currentMap right before adding to ensure it's still valid
											const mapToUse = mapInstanceRef.current;
											if (mapToUse && mapToUse.getContainer && mapToUse.getContainer()) {
												layer.addTo(mapToUse);
											} else {
												console.warn('Map instance became invalid before adding combined points layer');
											}
										} catch (err) {
											console.error('Error adding combined points layer to map:', err);
										}
									} else {
										console.warn('Skipping combined points layer add due to invalid map instance');
									}
									}
								} catch (err) {
									console.error('Error adding points layer:', err);
								}
							}

							// Fit map to show all layers
							try {
								const mapToUse = mapInstanceRef.current;
								if (mapToUse && typeof mapToUse.fitBounds === 'function' && mapToUse.getContainer && mapToUse.getContainer()) {
									mapToUse.fitBounds([
										[32.093, 70.945],
										[32.125, 70.998]
									], { padding: [20, 20] });
								}
							} catch (err) {
								console.error('Error fitting map bounds:', err);
							}

						} catch (error) {
							console.error('Error loading GeoJSON layers:', error);
						}
					};

					// Wait for map to be ready
					map.whenReady(() => {
						if (!isMounted) return;
						try {
							// Invalidate size to ensure proper rendering
							setTimeout(() => {
								if (!isMounted) return;
								try {
									if (mapInstanceRef.current) {
										mapInstanceRef.current.invalidateSize();
									}
									// Load GeoJSON layers
									loadGeoJSONLayers();
									// Mark as loaded immediately
									if (isMounted) {
										setMapLoaded(true);
									}
								} catch (e) {
									console.error('Error invalidating map size:', e);
									if (isMounted) {
										setMapLoaded(true);
									}
								}
							}, 200);
						} catch (error) {
							console.error('Error initializing map:', error);
							if (isMounted) {
								setMapError('Failed to initialize map');
							}
						}
					});
				} catch (error) {
					console.error('Error initializing map:', error);
					setMapError('Failed to initialize map: ' + (error instanceof Error ? error.message : 'Unknown error'));
				}
			}, 300);
		};

		// Check if Leaflet is already loaded
		if ((window as any).L) {
			initializeMap();
			return;
		}

		// Check if CSS is already loaded
		const existingCSS = document.querySelector('link[href*="leaflet"]');
		if (!existingCSS) {
			// Load Leaflet CSS
			linkElement = document.createElement('link');
			linkElement.rel = 'stylesheet';
			linkElement.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
			linkElement.crossOrigin = 'anonymous';
			document.head.appendChild(linkElement);
		}

		// Check if script is already loading/loaded
		const existingScript = document.querySelector('script[src*="leaflet"]');
		if (existingScript) {
			// Script exists, wait for it to load
			checkInterval = setInterval(() => {
				if ((window as any).L) {
					if (checkInterval) clearInterval(checkInterval);
					initializeMap();
				}
			}, 100);
			
			timeoutId = setTimeout(() => {
				if (checkInterval) clearInterval(checkInterval);
				if (!(window as any).L) {
					setMapError('Map library is taking too long to load');
				}
			}, 5000);
		} else {
			// Load Leaflet JS
			scriptElement = document.createElement('script');
			scriptElement.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
			scriptElement.crossOrigin = 'anonymous';
			scriptElement.async = true;
			scriptElement.onload = () => {
				setTimeout(initializeMap, 200);
			};
			scriptElement.onerror = () => {
				setMapError('Failed to load map library. Please check your internet connection.');
			};
			document.body.appendChild(scriptElement);
		}

		return () => {
			isMounted = false;
			if (timeoutId) clearTimeout(timeoutId);
			if (checkInterval) clearInterval(checkInterval);
			if (mapInstanceRef.current) {
				try {
					mapInstanceRef.current.remove();
				} catch (e) {
					console.error('Error removing map:', e);
				}
				mapInstanceRef.current = null;
			}
		};
	}, [mapLoaded]);

	return (
		<div className="relative w-full overflow-hidden rounded-lg border border-gray-200">
			<div 
				ref={mapContainerRef}
				id="gis-map-container"
				className="w-full bg-gray-100"
				style={{ 
					height: '500px', 
					minHeight: '500px', 
					position: 'relative',
					zIndex: 1
				}}
			>
				{!mapLoaded && !mapError && (
					<div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20 pointer-events-none">
						<div className="text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto mb-2"></div>
							<p className="text-sm text-gray-600">Loading map...</p>
						</div>
					</div>
				)}
				{mapError && (
					<div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20">
						<div className="text-center p-4">
							<p className="text-sm text-red-600 mb-2">{mapError}</p>
							<button
								onClick={() => {
									setMapError(null);
									setMapLoaded(false);
									window.location.reload();
								}}
								className="px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors text-sm"
							>
								Retry
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

// GIS Map Component for KML/Shapefile display
function KMLGISMapViewer() {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<any>(null);
	const layerRefsRef = useRef<any>({});
	const [mapLoaded, setMapLoaded] = useState(false);
	const [mapError, setMapError] = useState<string | null>(null);
	const [activeLayers, setActiveLayers] = useState({
		districts: true,
		bannu: false,
		dik: false,
		roads: false,
		waterways: false
	});

	useEffect(() => {
		if (!mapContainerRef.current) return;

		let linkElement: HTMLLinkElement | null = null;
		let scriptElement: HTMLScriptElement | null = null;
		let timeoutId: NodeJS.Timeout | null = null;
		let checkInterval: NodeJS.Timeout | null = null;
		let initDelay: NodeJS.Timeout | null = null;
		let isMounted = true;

		const initializeMap = () => {
			if (!isMounted || !mapContainerRef.current) return;

			if (mapInstanceRef.current) {
				return;
			}

			setTimeout(() => {
				if (!isMounted || !mapContainerRef.current) return;

				try {
					const L = (window as any).L;
					if (!L) {
						if (isMounted) setMapError('Map library failed to load');
						return;
					}

					if (!mapContainerRef.current) {
						if (isMounted) setMapError('Map container not found');
						return;
					}

					const container = mapContainerRef.current;
					if (container.offsetWidth === 0 || container.offsetHeight === 0) {
						setTimeout(initializeMap, 200);
						return;
					}

					delete (L.Icon.Default.prototype as any)._getIconUrl;
					L.Icon.Default.mergeOptions({
						iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
						iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
						shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
					});

					// Initialize map centered on KPK region
					const map = L.map(container, {
						center: [34.0, 71.5], // Centered on KPK
						zoom: 8,
						zoomControl: true,
						attributionControl: true
					});

					mapInstanceRef.current = map;

					// Add OpenStreetMap tiles
					L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
						attribution: '© OpenStreetMap contributors',
						maxZoom: 19
					}).addTo(map);

					// Layer control
					const layerControl = L.control.layers().addTo(map);
					layerRefsRef.current.layerControl = layerControl;

					// Load KP Districts layer
					const loadKPDistrictsLayer = async () => {
						try {
							const response = await fetch('/maps/Shapefiles/KP_Districts.geojson');
							if (!response.ok) {
								console.warn('KP Districts GeoJSON file not found');
								return;
							}

							const geoJsonData = await response.json();

							const districtsLayer = L.geoJSON(geoJsonData, {
								style: {
									color: '#1e40af', // Blue border
									weight: 2,
									opacity: 0.8,
									fillColor: '#3b82f6',
									fillOpacity: 0.2
								},
								onEachFeature: (feature: any, layer: any) => {
									if (feature.properties) {
										const props = feature.properties;
										let popupContent = `
											<div style="font-weight: bold; margin-bottom: 8px; color: #1e40af;">
												${props.ADM2_EN || props.ADM2_PCODE || 'District'}
											</div>
											<div style="font-size: 12px; line-height: 1.4;">
												${props.ADM2_EN ? `<div><strong>Name:</strong> ${props.ADM2_EN}</div>` : ''}
												${props.ADM2_PCODE ? `<div><strong>Code:</strong> ${props.ADM2_PCODE}</div>` : ''}
												${props.ADM1_EN ? `<div><strong>Province:</strong> ${props.ADM1_EN}</div>` : ''}
											</div>
										`;
										layer.bindPopup(popupContent);

										// Add tooltip
										if (props.ADM2_EN) {
											layer.bindTooltip(props.ADM2_EN, {
												permanent: false,
												direction: 'center',
												className: 'district-tooltip'
											});
										}
									}
								}
							});

							if (activeLayers.districts) {
								districtsLayer.addTo(map);
							}

							layerControl.addOverlay(districtsLayer, 'KP Districts');
							layerRefsRef.current.districts = districtsLayer;

							// Fit map to districts bounds
							if (districtsLayer.getBounds().isValid()) {
								map.fitBounds(districtsLayer.getBounds(), { padding: [20, 20] });
							}

						} catch (error) {
							console.warn('Error loading KP Districts:', error);
							if (isMounted && !mapError) {
								setMapError('Failed to load districts data: ' + (error instanceof Error ? error.message : 'Unknown error'));
							}
						}
					};

					// Load Bannu District layer
					const loadBannuLayer = async () => {
						try {
							const response = await fetch('/maps/Shapefiles/Bannu_District_elect_comm.geojson');
							if (!response.ok) {
								console.warn('Bannu District GeoJSON file not found, skipping Bannu layer');
								return;
							}

							const geoJsonData = await response.json();

							const bannuLayer = L.geoJSON(geoJsonData, {
								style: {
									color: '#dc2626', // Red border
									weight: 3,
									opacity: 0.9,
									fillColor: '#ef4444',
									fillOpacity: 0.3
								},
								onEachFeature: (feature: any, layer: any) => {
									if (feature.properties) {
										const props = feature.properties;
										let popupContent = `
											<div style="font-weight: bold; margin-bottom: 8px; color: #dc2626;">
												Bannu District
											</div>
											<div style="font-size: 12px; line-height: 1.4;">
												${Object.entries(props).map(([key, value]) =>
													`<div><strong>${key}:</strong> ${value}</div>`
												).join('')}
											</div>
										`;
										layer.bindPopup(popupContent);
									}
								}
							});

							if (activeLayers.bannu) {
								bannuLayer.addTo(map);
							}

							layerControl.addOverlay(bannuLayer, 'Bannu District');
							layerRefsRef.current.bannu = bannuLayer;

						} catch (error) {
							console.warn('Error loading Bannu District:', error);
						}
					};

					// Load DI Khan District layer
					const loadDIKhanLayer = async () => {
						try {
							const response = await fetch('/maps/Shapefiles/DIKhanDistrict.geojson');
							if (!response.ok) {
								console.warn('DI Khan District GeoJSON file not found, skipping DI Khan layer');
								return;
							}

							const geoJsonData = await response.json();

							const dikLayer = L.geoJSON(geoJsonData, {
								style: {
									color: '#16a34a', // Green border
									weight: 3,
									opacity: 0.9,
									fillColor: '#22c55e',
									fillOpacity: 0.3
								},
								onEachFeature: (feature: any, layer: any) => {
									if (feature.properties) {
										const props = feature.properties;
										let popupContent = `
											<div style="font-weight: bold; margin-bottom: 8px; color: #16a34a;">
												D.I. Khan District
											</div>
											<div style="font-size: 12px; line-height: 1.4;">
												${Object.entries(props).map(([key, value]) =>
													`<div><strong>${key}:</strong> ${value}</div>`
												).join('')}
											</div>
										`;
										layer.bindPopup(popupContent);
									}
								}
							});

							if (activeLayers.dik) {
								dikLayer.addTo(map);
							}

							layerControl.addOverlay(dikLayer, 'D.I. Khan District');
							layerRefsRef.current.dik = dikLayer;

						} catch (error) {
							console.warn('Error loading DI Khan District:', error);
						}
					};

					// Load Roads layer
					const loadRoadsLayer = async () => {
						try {
							const response = await fetch('/maps/Shapefiles/hotosm_pak_roads_lines_shp.geojson');
							if (!response.ok) {
								console.warn('Roads GeoJSON file not found, skipping roads layer');
								return;
							}

							const geoJsonData = await response.json();

							const roadsLayer = L.geoJSON(geoJsonData, {
								style: {
									color: '#6b7280', // Gray
									weight: 1,
									opacity: 0.6
								},
								onEachFeature: (feature: any, layer: any) => {
									if (feature.properties) {
										const props = feature.properties;
										let popupContent = `
											<div style="font-weight: bold; margin-bottom: 8px; color: #6b7280;">
												Road
											</div>
											<div style="font-size: 12px; line-height: 1.4;">
												${props.highway ? `<div><strong>Type:</strong> ${props.highway}</div>` : ''}
												${props.name ? `<div><strong>Name:</strong> ${props.name}</div>` : ''}
											</div>
										`;
										layer.bindPopup(popupContent);
									}
								}
							});

							if (activeLayers.roads) {
								roadsLayer.addTo(map);
							}

							layerControl.addOverlay(roadsLayer, 'Roads');
							layerRefsRef.current.roads = roadsLayer;

						} catch (error) {
							console.warn('Error loading roads layer:', error);
						}
					};

					// Load Waterways layer
					const loadWaterwaysLayer = async () => {
						try {
							const response = await fetch('/maps/Shapefiles/hotosm_pak_waterways_lines_shp.geojson');
							if (!response.ok) {
								console.warn('Waterways GeoJSON file not found, skipping waterways layer');
								return;
							}

							const geoJsonData = await response.json();

							const waterwaysLayer = L.geoJSON(geoJsonData, {
								style: {
									color: '#2563eb', // Blue
									weight: 2,
									opacity: 0.8
								},
								onEachFeature: (feature: any, layer: any) => {
									if (feature.properties) {
										const props = feature.properties;
										let popupContent = `
											<div style="font-weight: bold; margin-bottom: 8px; color: #2563eb;">
												Waterway
											</div>
											<div style="font-size: 12px; line-height: 1.4;">
												${props.waterway ? `<div><strong>Type:</strong> ${props.waterway}</div>` : ''}
												${props.name ? `<div><strong>Name:</strong> ${props.name}</div>` : ''}
											</div>
										`;
										layer.bindPopup(popupContent);
									}
								}
							});

							if (activeLayers.waterways) {
								waterwaysLayer.addTo(map);
							}

							layerControl.addOverlay(waterwaysLayer, 'Waterways');
							layerRefsRef.current.waterways = waterwaysLayer;

						} catch (error) {
							console.warn('Error loading waterways:', error);
						}
					};

					// Load all layers
					loadKPDistrictsLayer();
					loadBannuLayer();
					loadDIKhanLayer();
					loadRoadsLayer();
					loadWaterwaysLayer();

					map.whenReady(() => {
						if (!isMounted) return;
						setTimeout(() => {
							if (!isMounted) return;
							try {
								if (mapInstanceRef.current) {
									mapInstanceRef.current.invalidateSize();
								}
								if (isMounted) setMapLoaded(true);
							} catch (e) {
								console.error('Error:', e);
								if (isMounted) setMapLoaded(true);
							}
						}, 200);
					});
				} catch (error) {
					console.error('Error initializing map:', error);
					if (isMounted) {
						setMapError('Failed to initialize map: ' + (error instanceof Error ? error.message : 'Unknown error'));
					}
				}
			}, 300);
		};

		initDelay = setTimeout(() => {
			if ((window as any).L) {
				initializeMap();
				return;
			}

			const existingCSS = document.querySelector('link[href*="leaflet"]');
			if (!existingCSS) {
				linkElement = document.createElement('link');
				linkElement.rel = 'stylesheet';
				linkElement.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
				linkElement.crossOrigin = 'anonymous';
				document.head.appendChild(linkElement);
			}

			const existingScript = document.querySelector('script[src*="leaflet"]');
			if (existingScript) {
				checkInterval = setInterval(() => {
					if ((window as any).L) {
						if (checkInterval) clearInterval(checkInterval);
						initializeMap();
					}
				}, 100);

				timeoutId = setTimeout(() => {
					if (checkInterval) clearInterval(checkInterval);
					if (!(window as any).L && isMounted) {
						setMapError('Map library is taking too long to load');
					}
				}, 10000);
			} else {
				scriptElement = document.createElement('script');
				scriptElement.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
				scriptElement.crossOrigin = 'anonymous';
				scriptElement.async = true;
				scriptElement.onload = () => {
					if (isMounted) {
						setTimeout(initializeMap, 200);
					}
				};
				scriptElement.onerror = () => {
					if (isMounted) {
						setMapError('Failed to load map library. Please check your internet connection.');
					}
				};
				document.body.appendChild(scriptElement);
			}
		}, 100);

		return () => {
			isMounted = false;
			if (timeoutId) clearTimeout(timeoutId);
			if (checkInterval) clearInterval(checkInterval);
			if (initDelay) clearTimeout(initDelay);
			if (mapInstanceRef.current) {
				try {
					mapInstanceRef.current.remove();
				} catch (e) {
					console.error('Error removing map:', e);
				}
				mapInstanceRef.current = null;
			}
		};
	}, []);

	// Handle layer toggling
	useEffect(() => {
		if (!mapInstanceRef.current || !mapLoaded) return;

		const map = mapInstanceRef.current;
		const layerRefs = layerRefsRef.current;

		// Toggle districts layer
		if (layerRefs.districts) {
			if (activeLayers.districts && !map.hasLayer(layerRefs.districts)) {
				layerRefs.districts.addTo(map);
			} else if (!activeLayers.districts && map.hasLayer(layerRefs.districts)) {
				map.removeLayer(layerRefs.districts);
			}
		}

		// Toggle DIK layer
		if (layerRefs.dik) {
			if (activeLayers.dik && !map.hasLayer(layerRefs.dik)) {
				layerRefs.dik.addTo(map);
			} else if (!activeLayers.dik && map.hasLayer(layerRefs.dik)) {
				map.removeLayer(layerRefs.dik);
			}
		}

		// Toggle Bannu layer
		if (layerRefs.bannu) {
			if (activeLayers.bannu && !map.hasLayer(layerRefs.bannu)) {
				layerRefs.bannu.addTo(map);
			} else if (!activeLayers.bannu && map.hasLayer(layerRefs.bannu)) {
				map.removeLayer(layerRefs.bannu);
			}
		}

		// Toggle waterways layer
		if (layerRefs.waterways) {
			if (activeLayers.waterways && !map.hasLayer(layerRefs.waterways)) {
				layerRefs.waterways.addTo(map);
			} else if (!activeLayers.waterways && map.hasLayer(layerRefs.waterways)) {
				map.removeLayer(layerRefs.waterways);
			}
		}
	}, [activeLayers, mapLoaded]);

	const toggleLayer = (layerKey: keyof typeof activeLayers) => {
		setActiveLayers(prev => ({
			...prev,
			[layerKey]: !prev[layerKey]
		}));
	};

	return (
		<div className="relative w-full overflow-hidden rounded-lg border border-gray-200">
			<div className="flex flex-col lg:flex-row">
				{/* Map Container */}
				<div className="flex-1 relative">
					<div
						ref={mapContainerRef}
						className="w-full bg-gray-100"
						style={{
							height: '600px',
							minHeight: '600px',
							position: 'relative',
							zIndex: 1
						}}
					>
						{!mapLoaded && !mapError && (
							<div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20 pointer-events-none">
								<div className="text-center">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto mb-2"></div>
									<p className="text-sm text-gray-600">Loading GIS map...</p>
								</div>
							</div>
						)}
						{mapError && (
							<div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20">
								<div className="text-center p-4">
									<p className="text-sm text-red-600 mb-2">{mapError}</p>
									<button
										onClick={() => {
											setMapError(null);
											setMapLoaded(false);
											window.location.reload();
										}}
										className="px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors text-sm"
									>
										Retry
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Legend / Map Selecting Options */}
				<div className="w-full lg:w-80 bg-white border-l border-gray-200 p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
						Map Selecting Options
					</h3>
					<div className="space-y-3">
						{/* KPK Districts */}
						<label className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors group">
							<input
								type="checkbox"
								checked={activeLayers.districts}
								onChange={() => toggleLayer('districts')}
								className="w-5 h-5 text-[#0b4d2b] border-gray-300 rounded focus:ring-2 focus:ring-[#0b4d2b] focus:ring-offset-2 cursor-pointer"
							/>
							<div className="ml-3 flex items-center flex-1">
								<div className="w-6 h-6 rounded border-2 mr-3" style={{ backgroundColor: '#3b82f6', borderColor: '#1e40af', opacity: 0.3 }}></div>
								<span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">KPK Districts</span>
							</div>
						</label>

						{/* DIK District */}
						<label className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors group">
							<input
								type="checkbox"
								checked={activeLayers.dik}
								onChange={() => toggleLayer('dik')}
								className="w-5 h-5 text-[#0b4d2b] border-gray-300 rounded focus:ring-2 focus:ring-[#0b4d2b] focus:ring-offset-2 cursor-pointer"
							/>
							<div className="ml-3 flex items-center flex-1">
								<div className="w-6 h-6 rounded border-2 mr-3" style={{ backgroundColor: '#22c55e', borderColor: '#16a34a', opacity: 0.3 }}></div>
								<span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">DIK District</span>
							</div>
						</label>

						{/* Bannu District */}
						<label className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors group">
							<input
								type="checkbox"
								checked={activeLayers.bannu}
								onChange={() => toggleLayer('bannu')}
								className="w-5 h-5 text-[#0b4d2b] border-gray-300 rounded focus:ring-2 focus:ring-[#0b4d2b] focus:ring-offset-2 cursor-pointer"
							/>
							<div className="ml-3 flex items-center flex-1">
								<div className="w-6 h-6 rounded border-2 mr-3" style={{ backgroundColor: '#ef4444', borderColor: '#dc2626', opacity: 0.3 }}></div>
								<span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Bannu District</span>
							</div>
						</label>

						{/* Water Ways */}
						<label className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors group">
							<input
								type="checkbox"
								checked={activeLayers.waterways}
								onChange={() => toggleLayer('waterways')}
								className="w-5 h-5 text-[#0b4d2b] border-gray-300 rounded focus:ring-2 focus:ring-[#0b4d2b] focus:ring-offset-2 cursor-pointer"
							/>
							<div className="ml-3 flex items-center flex-1">
								<div className="w-6 h-2 rounded mr-3" style={{ backgroundColor: '#2563eb' }}></div>
								<span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Water Ways</span>
							</div>
						</label>
					</div>

					{/* Info Section */}
					<div className="mt-6 pt-4 border-t border-gray-200">
						<div className="flex items-start text-xs text-gray-500">
							<Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
							<p>Toggle layers on/off to customize your map view. Click on map features to view detailed information.</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

type OutputProgress = {
	OutputID: string;
	Output_Progress: number;
};

type DistrictProgress = {
	District: string;
	OutputID: string;
	Output_Progress: number;
};

type OutputWeightage = {
	OutputID: string;
	TotalWeightage: number;
};

type ActivityProgress = {
	ActivityID: string | number;
	MainActivityName: string;
	OutputID: string | number;
	Weightage_of_Main_Activity: number;
	TotalActivityWeightageProgress: number;
	OutputWeightage: number;
};

type SectorProgress = {
	ActivityProgress: number;
	Sector_Name: string;
};

type DistrictProgressSummary = {
	District: string;
	AvgActivityProgress: number;
};

type TrainingGraphData = {
	EventType: string;
	District: string;
	TotalMale: number;
	TotalFemale: number;
	TotalParticipants: number;
};

type OverallStats = {
	totalTrainings: number;
	totalDays: number;
	totalMale: number;
	totalFemale: number;
	totalParticipants: number;
};

type BreakdownRow = {
	eventType?: string;
	district?: string;
	totalTrainings: number;
	totalDays: number;
	totalMale: number;
	totalFemale: number;
	totalParticipants: number;
};

type DashboardResponse = 
	| {
			success: true;
			overall: OverallStats;
			byEventType: BreakdownRow[];
			byDistrict: BreakdownRow[];
		}
	| {
			success: false;
			message?: string;
		};

type DashboardData = {
	success: true;
	overall: OverallStats;
	byEventType: BreakdownRow[];
	byDistrict: BreakdownRow[];
};

// Embedded GIS Online Maps Component Types
type EmbeddedMapType = {
	id: string;
	name: string;
	type: 'boundary' | 'water' | 'sw' | 'district' | 'tehsil';
	icon: React.ComponentType<{ className?: string }>;
	color: string;
	file: string;
	filePath?: string;
};

const embeddedPanialaMaps: EmbeddedMapType[] = [
	{ id: 'paniala-boundary', name: 'NC Boundary', type: 'boundary', icon: MapPin, color: 'bg-blue-500', file: 'Paniala_NC_Boundary.json' },
	{ id: 'paniala-water', name: 'Water Infrastructure', type: 'water', icon: Droplet, color: 'bg-cyan-500', file: 'Paniala_NC_Water_WGS84.json' },
	{ id: 'paniala-sw', name: 'Solid Waste', type: 'sw', icon: Trash2, color: 'bg-red-500', file: 'Paniala_NC_SW_WGS84.json' },
];

const embeddedAdditionalLayers: EmbeddedMapType[] = [
	{ id: 'kpk-districts', name: 'KPK Districts', type: 'district', icon: Layers, color: 'bg-purple-500', file: 'KP_Districts.geojson', filePath: '/maps/Shapefiles/KP_Districts.geojson' },
	{ id: 'dik-tehsil', name: 'DIK Tehsil', type: 'tehsil', icon: Building2, color: 'bg-green-500', file: 'DIKhan_Tehsil.geojson', filePath: '/maps/Shapefiles/DIKhan_Tehsil.geojson' },
];

function EmbeddedMultiLayerGISMapViewer({ maps, additionalMaps, activeLayers }: { 
	maps: EmbeddedMapType[]; 
	additionalMaps?: EmbeddedMapType[];
	activeLayers: { [key: string]: boolean };
}) {
	const allMaps = useRef<EmbeddedMapType[]>([...maps, ...(additionalMaps || [])]);
	
	useEffect(() => {
		allMaps.current = [...maps, ...(additionalMaps || [])];
	}, [maps, additionalMaps]);
	
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<any>(null);
	const layerRefsRef = useRef<{ [key: string]: any }>({});
	const baseLayerRefsRef = useRef<{ street?: any; satellite?: any }>({});
	const [mapLoaded, setMapLoaded] = useState(false);
	const [mapError, setMapError] = useState<string | null>(null);

	useEffect(() => {
		if (!mapContainerRef.current) return;

		let linkElement: HTMLLinkElement | null = null;
		let scriptElement: HTMLScriptElement | null = null;
		let timeoutId: NodeJS.Timeout | null = null;
		let checkInterval: NodeJS.Timeout | null = null;
		let initDelay: NodeJS.Timeout | null = null;
		let isMounted = true;

		const initializeMap = () => {
			if (!isMounted || !mapContainerRef.current) return;
			
			if (mapInstanceRef.current) {
				return;
			}

			setTimeout(() => {
				if (!isMounted || !mapContainerRef.current) return;
				
				try {
					const L = (window as any).L;
					if (!L) {
						if (isMounted) setMapError('Map library failed to load');
						return;
					}

					const container = mapContainerRef.current;
					if (container.offsetWidth === 0 || container.offsetHeight === 0) {
						setTimeout(initializeMap, 200);
						return;
					}

					if ((container as any)._leaflet_id) {
						return;
					}

					delete (L.Icon.Default.prototype as any)._getIconUrl;
					L.Icon.Default.mergeOptions({
						iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
						iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
						shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
					});

					const map = L.map(container, {
						center: [32.0, 70.5],
						zoom: 11,
						zoomControl: true,
						attributionControl: true
					});

					mapInstanceRef.current = map;

					const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
						attribution: '© Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
						maxZoom: 19
					});

					baseLayerRefsRef.current.satellite = satelliteLayer;
					satelliteLayer.addTo(map);

					const loadLayer = async (mapItem: EmbeddedMapType) => {
						try {
							const filePath = mapItem.filePath || `/maps/Bannu/${mapItem.file}`;
							const response = await fetch(filePath);
							if (!response.ok) {
								return;
							}
							
							const geoJsonData = await response.json();
							
							let style: any = {
								color: '#0b4d2b',
								weight: 3,
								opacity: 0.8,
								fillColor: '#0b4d2b',
								fillOpacity: 0.2
							};

							if (mapItem.type === 'water') {
								style = { color: '#007bff', weight: 2, opacity: 0.8, fillColor: '#007bff', fillOpacity: 0.15 };
							} else if (mapItem.type === 'sw') {
								style = { color: '#dc3545', weight: 2, opacity: 0.8, fillColor: '#dc3545', fillOpacity: 0.15 };
							} else if (mapItem.type === 'district') {
								style = { color: '#1e40af', weight: 2, opacity: 0.8, fillColor: '#3b82f6', fillOpacity: 0.2 };
							} else if (mapItem.type === 'tehsil') {
								style = { color: '#28a745', weight: 2, opacity: 0.8, fillColor: '#28a745', fillOpacity: 0.15 };
							}

							const layer = L.geoJSON(geoJsonData, {
								style: style,
								pointToLayer: (feature: any, latlng: any) => {
									let color = '#0b4d2b';
									if (mapItem.type === 'water') color = '#007bff';
									else if (mapItem.type === 'sw') color = '#dc3545';
									return L.circleMarker(latlng, {
										radius: 6,
										fillColor: color,
										color: '#fff',
										weight: 2,
										opacity: 1,
										fillOpacity: 0.8
									});
								},
								onEachFeature: (feature: any, layer: any) => {
									if (feature.properties) {
										const props = feature.properties;
										let popupContent = '<div style="font-weight: bold; margin-bottom: 5px;">';
										
										if (mapItem.type === 'district' && (props.ADM2_EN || props.ADM2_PCODE)) {
											popupContent += props.ADM2_EN || props.ADM2_PCODE || 'District';
											popupContent += '</div><div style="font-size: 12px; line-height: 1.4;">';
											if (props.ADM2_EN) popupContent += `<div><strong>Name:</strong> ${props.ADM2_EN}</div>`;
											if (props.ADM2_PCODE) popupContent += `<div><strong>Code:</strong> ${props.ADM2_PCODE}</div>`;
											if (props.ADM1_EN) popupContent += `<div><strong>Province:</strong> ${props.ADM1_EN}</div>`;
										} else if (mapItem.type === 'tehsil') {
											const nameProps = ['NAME', 'Name', 'name', 'TEHSIL', 'NAME_1', 'NAME_2'];
											let name = 'Tehsil';
											for (const prop of nameProps) {
												if (props[prop]) {
													name = props[prop];
													break;
												}
											}
											popupContent += name;
											popupContent += '</div><div style="font-size: 12px; line-height: 1.4;">';
											Object.keys(props).slice(0, 5).forEach(key => {
												if (!nameProps.includes(key)) {
													popupContent += `<div><strong>${key}:</strong> ${props[key]}</div>`;
												}
											});
										} else {
											if (props.NC) popupContent += props.NC;
											else if (props.VCs) popupContent += props.VCs;
											else if (props.Name) popupContent += props.Name;
											else popupContent += 'Feature';
											popupContent += '</div>';
											if (props.Tehsil) popupContent += `<div>Tehsil: ${props.Tehsil}</div>`;
											if (props.District) popupContent += `<div>District: ${props.District}</div>`;
											if (props.Feature) popupContent += `<div>Feature: ${props.Feature}</div>`;
											if (props.Status) popupContent += `<div>Status: ${props.Status}</div>`;
										}
										popupContent += '</div>';
										layer.bindPopup(popupContent);
									}
								}
							});

							layerRefsRef.current[mapItem.id] = layer;
							if (activeLayers[mapItem.id]) {
								layer.addTo(map);
							}

						} catch (error) {
							console.error(`Error loading ${mapItem.name}:`, error);
						}
					};

					Promise.all(allMaps.current.map(mapItem => loadLayer(mapItem))).then(() => {
						const visibleLayers = allMaps.current
							.filter(mapItem => activeLayers[mapItem.id])
							.map(mapItem => layerRefsRef.current[mapItem.id])
							.filter(layer => layer && layer.getBounds);

						if (visibleLayers.length > 0) {
							const group = L.featureGroup(visibleLayers);
							if (group.getBounds && group.getBounds().isValid()) {
								map.fitBounds(group.getBounds(), { padding: [20, 20] });
							}
						}
					});

					map.whenReady(() => {
						if (!isMounted) return;
						setTimeout(() => {
							if (!isMounted) return;
							try {
								if (mapInstanceRef.current) {
									mapInstanceRef.current.invalidateSize();
								}
								if (isMounted) setMapLoaded(true);
							} catch (e) {
								if (isMounted) setMapLoaded(true);
							}
						}, 200);
					});
				} catch (error) {
					if (isMounted) {
						setMapError('Failed to initialize map: ' + (error instanceof Error ? error.message : 'Unknown error'));
					}
				}
			}, 300);
		};

		initDelay = setTimeout(() => {
			if ((window as any).L) {
				initializeMap();
				return;
			}

			const existingCSS = document.querySelector('link[href*="leaflet"]');
			if (!existingCSS) {
				linkElement = document.createElement('link');
				linkElement.rel = 'stylesheet';
				linkElement.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
				document.head.appendChild(linkElement);
			}

			scriptElement = document.createElement('script');
			scriptElement.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
			scriptElement.async = true;
			scriptElement.onload = () => {
				if (isMounted) {
					setTimeout(initializeMap, 100);
				}
			};
			document.body.appendChild(scriptElement);

			checkInterval = setInterval(() => {
				if ((window as any).L && isMounted) {
					clearInterval(checkInterval!);
					setTimeout(initializeMap, 100);
				}
			}, 100);

			timeoutId = setTimeout(() => {
				if (isMounted && !(window as any).L) {
					setMapError('Map library loading timeout');
				}
			}, 10000);
		}, 100);

		return () => {
			isMounted = false;
			if (timeoutId) clearTimeout(timeoutId);
			if (checkInterval) clearInterval(checkInterval);
			if (initDelay) clearTimeout(initDelay);
			if (mapInstanceRef.current) {
				try {
					mapInstanceRef.current.remove();
				} catch (e) {
					console.warn('Error removing map:', e);
				}
				mapInstanceRef.current = null;
			}
			layerRefsRef.current = {};
			baseLayerRefsRef.current = {};
			if (scriptElement && scriptElement.parentNode) {
				scriptElement.parentNode.removeChild(scriptElement);
			}
		};
	}, []);

	useEffect(() => {
		if (!mapInstanceRef.current) return;

		allMaps.current.forEach(mapItem => {
			const layer = layerRefsRef.current[mapItem.id];
			if (!layer) return;

			if (activeLayers[mapItem.id]) {
				if (!mapInstanceRef.current.hasLayer(layer)) {
					layer.addTo(mapInstanceRef.current);
				}
			} else {
				if (mapInstanceRef.current.hasLayer(layer)) {
					mapInstanceRef.current.removeLayer(layer);
				}
			}
		});

		const visibleLayers = allMaps.current
			.filter(mapItem => activeLayers[mapItem.id])
			.map(mapItem => layerRefsRef.current[mapItem.id])
			.filter(layer => layer && layer.getBounds);

		if (visibleLayers.length > 0 && (window as any).L) {
			const L = (window as any).L;
			const group = L.featureGroup(visibleLayers);
			if (group.getBounds && group.getBounds().isValid()) {
				mapInstanceRef.current.fitBounds(group.getBounds(), { padding: [20, 20] });
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeLayers]);

	return (
		<div className="relative w-full h-[400px] bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
			{mapError && (
				<div className="absolute top-4 left-4 right-4 bg-red-50 border border-red-200 rounded-lg p-3 z-[1000]">
					<p className="text-sm text-red-600">{mapError}</p>
				</div>
			)}
			{!mapLoaded && !mapError && (
				<div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-[999]">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto mb-2"></div>
						<p className="text-sm text-gray-600">Loading map...</p>
					</div>
				</div>
			)}
			<div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />
		</div>
	);
}

function GISOnlineMapsEmbedded() {
	const [activeLayers, setActiveLayers] = useState<{ [key: string]: boolean }>({
		'paniala-boundary': true,
		'paniala-water': true,
		'paniala-sw': true,
		'kpk-districts': true,
		'dik-tehsil': true
	});
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const toggleLayer = (mapId: string) => {
		setActiveLayers(prev => ({
			...prev,
			[mapId]: !prev[mapId]
		}));
	};

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setDropdownOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Get all layers in order: KPK Districts, DIK Tehsil, NC Boundary, Water Infrastructure, Solid Waste
	const allLayers = [
		...embeddedAdditionalLayers.filter(map => map.id === 'kpk-districts'),
		...embeddedAdditionalLayers.filter(map => map.id === 'dik-tehsil'),
		...embeddedPanialaMaps
	];

	// Count active layers
	const activeCount = Object.values(activeLayers).filter(Boolean).length;

	return (
		<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
			<div className="p-6 border-b border-gray-200">
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1">
						<h2 className="text-xl font-semibold text-gray-900">DIK District - Tehsil Wise - Paniala Maps</h2>
						<p className="text-sm text-gray-600 mt-1">Interactive GIS maps with layer controls</p>
					</div>
					<div className="flex items-center gap-3">
						{/* Layer Controls - Dropdown */}
						<div className="flex-shrink-0">
							<div className="relative" ref={dropdownRef}>
								<button
									type="button"
									onClick={() => setDropdownOpen(!dropdownOpen)}
									className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] transition-colors min-w-[200px]"
								>
									<div className="flex items-center space-x-2">
										<Layers className="h-4 w-4 text-[#0b4d2b]" />
										<span className="text-sm font-medium text-gray-700">
											{activeCount > 0 ? `${activeCount} layer${activeCount > 1 ? 's' : ''}` : 'Map Layers'}
										</span>
									</div>
									<ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
								</button>

								{dropdownOpen && (
									<div className="absolute right-0 z-50 w-80 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
										<div className="p-2">
											{allLayers.map((map) => {
												const Icon = map.icon;
												return (
													<label
														key={map.id}
														className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
													>
														<input
															type="checkbox"
															checked={activeLayers[map.id] || false}
															onChange={() => toggleLayer(map.id)}
															className="h-4 w-4 text-[#0b4d2b] focus:ring-[#0b4d2b] border-gray-300 rounded"
														/>
														<div className={`p-2 ${map.color} rounded-lg text-white flex-shrink-0`}>
															<Icon className="h-4 w-4" />
														</div>
														<div className="flex-1 min-w-0">
															<p className="text-sm font-medium text-gray-900">{map.name}</p>
															<p className="text-xs text-gray-500 capitalize">
																{map.type === 'district' ? 'Khyber Pakhtunkhwa Province Districts' : 
																 map.type === 'tehsil' ? 'DI Khan Tehsil boundaries' : 
																 map.type === 'sw' ? 'Solid Waste' : map.type}
															</p>
														</div>
													</label>
												);
											})}
										</div>
									</div>
								)}
							</div>
						</div>
						<Link href="/dashboard/kml-gis-maps" className="text-sm text-[#0b4d2b] hover:text-[#0a3d24] font-medium flex items-center space-x-1">
							<span>View Full Map</span>
							<ExternalLink className="h-4 w-4" />
						</Link>
					</div>
				</div>
			</div>
			<div className="p-6">
				<EmbeddedMultiLayerGISMapViewer 
					maps={embeddedPanialaMaps} 
					additionalMaps={embeddedAdditionalLayers}
					activeLayers={activeLayers}
				/>
			</div>
		</div>
	);
}

// Output Progress Chart Component with exact values
function OutputProgressChart() {
	const [chartType, setChartType] = useChartType('outputProgress', 'bar');

	const data = {
		labels: ['Output A', 'Output B', 'Output C', 'Total'],
		datasets: [
			{
				label: 'Progress (%)',
				data: [31, 20, 30, 28.5],
				backgroundColor: [
					'rgba(59, 130, 246, 0.85)',   // Bright Blue
					'rgba(16, 185, 129, 0.85)',   // Emerald Green
					'rgba(168, 85, 247, 0.85)',   // Vibrant Purple
					'rgba(251, 146, 60, 0.85)',   // Bright Orange
				],
				borderColor: [
					'rgb(37, 99, 235)',    // Darker Blue
					'rgb(5, 150, 105)',    // Darker Green
					'rgb(124, 58, 237)',   // Darker Purple
					'rgb(249, 115, 22)',   // Darker Orange
				],
				borderWidth: 2,
			}
		]
	};

	const weights = [50, 20, 30, 100];

	const options: ChartOptions<'bar'> = {
		responsive: true,
		maintainAspectRatio: true,
		aspectRatio: 1.2,
		plugins: {
			legend: {
				display: false,
			},
			tooltip: {
				callbacks: {
					label: function(context) {
						const value = context.parsed.y;
						return `Progress: ${value}%`;
					}
				}
			},
		datalabels: {
			anchor: 'end',
			align: 'top',
			formatter: (value) => {
				return `${value}%`;
			},
			color: '#1f2937',
			font: {
				weight: 'bold',
				size: 10,
			},
			textAlign: 'center',
		}
		},
		scales: {
			x: {
				title: {
					display: true,
					text: 'Outputs',
					font: {
						size: 11,
						weight: 'bold',
					}
				},
				grid: {
					display: false,
				},
				ticks: {
					font: {
						size: 10,
					}
				}
			},
			y: {
				beginAtZero: true,
				max: 100,
				title: {
					display: true,
					text: 'Progress (%)',
					font: {
						size: 11,
						weight: 'bold',
					}
				},
				ticks: {
					stepSize: 20,
					font: {
						size: 10,
					}
				},
				grid: {
					color: 'rgba(0, 0, 0, 0.05)',
				}
			}
		}
	};

	return (
		<div>
			<div className="flex justify-end mb-3">
				<ChartTypeSwitcher 
					chartId="outputProgress" 
					currentType={chartType} 
					onTypeChange={setChartType}
				/>
			</div>
			<DynamicChartRenderer chartType={chartType} data={data} options={options} height="280px" />
		</div>
	);
}

// Sector Wise Chart Component with exact values
function SectorWiseChart() {
	const [chartType, setChartType] = useChartType('sectorWise', 'bar');

	const data = {
		labels: ['Assessment', 'Document', 'Maps', 'Training', 'Workshop'],
		datasets: [
			{
				label: 'Progress (%)',
				data: [51, 43, 99, 46, 50],
				backgroundColor: [
					'rgba(20, 184, 166, 0.8)',   // Teal
					'rgba(251, 146, 60, 0.8)',   // Orange
					'rgba(34, 197, 94, 0.8)',    // Green
					'rgba(239, 68, 68, 0.8)',    // Red
					'rgba(168, 85, 247, 0.8)',   // Purple
				],
				borderColor: [
					'rgb(20, 184, 166)',
					'rgb(251, 146, 60)',
					'rgb(34, 197, 94)',
					'rgb(239, 68, 68)',
					'rgb(168, 85, 247)',
				],
				borderWidth: 2,
			}
		]
	};

	const options: ChartOptions<'bar'> = {
		responsive: true,
		maintainAspectRatio: true,
		aspectRatio: 1.2,
		plugins: {
			legend: {
				display: false,
			},
			tooltip: {
				callbacks: {
					label: function(context) {
						return `Progress: ${context.parsed.y}%`;
					}
				}
			},
			datalabels: {
				anchor: 'end',
				align: 'top',
				formatter: (value) => `${value}%`,
				color: '#1f2937',
				font: {
					weight: 'bold',
					size: 10,
				}
			}
		},
		scales: {
			x: {
				title: {
					display: true,
					text: 'Sectors',
					font: {
						size: 11,
						weight: 'bold',
					}
				},
				grid: {
					display: false,
				},
				ticks: {
					font: {
						size: 9,
					}
				}
			},
			y: {
				beginAtZero: true,
				max: 100,
				title: {
					display: true,
					text: 'Progress (%)',
					font: {
						size: 11,
						weight: 'bold',
					}
				},
				ticks: {
					stepSize: 20,
					font: {
						size: 10,
					}
				},
				grid: {
					color: 'rgba(0, 0, 0, 0.05)',
				}
			}
		}
	};

	return (
		<div>
			<div className="flex justify-end mb-3">
				<ChartTypeSwitcher 
					chartId="sectorWise" 
					currentType={chartType} 
					onTypeChange={setChartType}
				/>
			</div>
			<DynamicChartRenderer chartType={chartType} data={data} options={options} height="280px" />
		</div>
	);
}

// District Wise Chart Component (using existing data)
function DistrictWiseChart({ districtData }: { districtData: Array<{ District: string | null; AvgActivityProgress: number | null }> }) {
	const [chartType, setChartType] = useChartType('districtWise', 'bar');

	// Color palette for districts
	const colorPalette = [
		{ bg: 'rgba(99, 102, 241, 0.8)', border: 'rgb(99, 102, 241)' },      // Indigo
		{ bg: 'rgba(236, 72, 153, 0.8)', border: 'rgb(236, 72, 153)' },      // Pink
		{ bg: 'rgba(59, 130, 246, 0.8)', border: 'rgb(59, 130, 246)' },      // Blue
		{ bg: 'rgba(16, 185, 129, 0.8)', border: 'rgb(16, 185, 129)' },      // Emerald
		{ bg: 'rgba(245, 158, 11, 0.8)', border: 'rgb(245, 158, 11)' },      // Amber
		{ bg: 'rgba(139, 92, 246, 0.8)', border: 'rgb(139, 92, 246)' },      // Violet
		{ bg: 'rgba(14, 165, 233, 0.8)', border: 'rgb(14, 165, 233)' },      // Sky
		{ bg: 'rgba(217, 70, 239, 0.8)', border: 'rgb(217, 70, 239)' },      // Fuchsia
		{ bg: 'rgba(34, 197, 94, 0.8)', border: 'rgb(34, 197, 94)' },        // Green
		{ bg: 'rgba(251, 146, 60, 0.8)', border: 'rgb(251, 146, 60)' },      // Orange
	];

	const chartData = {
		labels: districtData.map(d => d.District || 'Unknown'),
		datasets: [
			{
				label: 'Progress (%)',
				data: districtData.map(d => Math.round(d.AvgActivityProgress || 0)),
				backgroundColor: districtData.map((_, index) => colorPalette[index % colorPalette.length].bg),
				borderColor: districtData.map((_, index) => colorPalette[index % colorPalette.length].border),
				borderWidth: 2,
			}
		]
	};

	const options: ChartOptions<'bar'> = {
		responsive: true,
		maintainAspectRatio: true,
		aspectRatio: 1.2,
		plugins: {
			legend: {
				display: false,
			},
			tooltip: {
				callbacks: {
					label: function(context) {
						return `Progress: ${context.parsed.y}%`;
					}
				}
			},
			datalabels: {
				anchor: 'end',
				align: 'top',
				formatter: (value) => `${value}%`,
				color: '#1f2937',
				font: {
					weight: 'bold',
					size: 10,
				}
			}
		},
		scales: {
			x: {
				title: {
					display: true,
					text: 'Districts',
					font: {
						size: 11,
						weight: 'bold',
					}
				},
				grid: {
					display: false,
				},
				ticks: {
					font: {
						size: 9,
					}
				}
			},
			y: {
				beginAtZero: true,
				max: 100,
				title: {
					display: true,
					text: 'Progress (%)',
					font: {
						size: 11,
						weight: 'bold',
					}
				},
				ticks: {
					stepSize: 20,
					font: {
						size: 10,
					}
				},
				grid: {
					color: 'rgba(0, 0, 0, 0.05)',
				}
			}
		}
	};

	return (
		<div>
			<div className="flex justify-end mb-3">
				<ChartTypeSwitcher 
					chartId="districtWise" 
					currentType={chartType} 
					onTypeChange={setChartType}
				/>
			</div>
			<DynamicChartRenderer chartType={chartType} data={chartData} options={options} height="280px" />
		</div>
	);
}

export default function DashboardPage() {
	const router = useRouter();
	const [pictures, setPictures] = useState<PictureData[]>([]);
	const [outputProgress, setOutputProgress] = useState<OutputProgress[]>([]);
	const [districtProgress, setDistrictProgress] = useState<DistrictProgress[]>([]);
	const [outputWeightage, setOutputWeightage] = useState<OutputWeightage[]>([]);
	const [activityProgress, setActivityProgress] = useState<ActivityProgress[]>([]);
	const [sectorProgress, setSectorProgress] = useState<SectorProgress[]>([]);
	const [districtProgressSummary, setDistrictProgressSummary] = useState<DistrictProgressSummary[]>([]);
	const [trainingDashboardData, setTrainingDashboardData] = useState<DashboardData | null>(null);
	const [trainingGraphData, setTrainingGraphData] = useState<TrainingGraphData[]>([]);
	const [selectedEventType, setSelectedEventType] = useState<BreakdownRow | null>(null);
	const [selectedDistrict, setSelectedDistrict] = useState<BreakdownRow | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isAutoPlaying, setIsAutoPlaying] = useState(false);
	const [selectedPicture, setSelectedPicture] = useState<PictureData | null>(null);
	const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
	const [newsIndex, setNewsIndex] = useState(0);
	const [isNewsAutoPlaying, setIsNewsAutoPlaying] = useState(true);
	const [securityAlerts, setSecurityAlerts] = useState<Array<{id: number; incident_title: string; ReferenceNumber?: string}>>([]);
	const [securityAlertsLoading, setSecurityAlertsLoading] = useState(false);

	useEffect(() => {
		fetchDashboardPictures();
		fetchOutputProgress();
		fetchDistrictProgress();
		fetchOutputWeightage();
		fetchActivityProgress();
		fetchSectorProgress();
		fetchDistrictProgressSummary();
		fetchTrainingDashboard();
		fetchTrainingGraphs();
		fetchSecurityAlerts();
	}, []);

	const fetchTrainingDashboard = async () => {
		try {
			const res = await fetch("/api/training/dashboard");
			const json = await res.json() as DashboardResponse;
			if (!json.success) {
				throw new Error(json.message ?? "Failed to load dashboard data");
			}
			setTrainingDashboardData(json);
		} catch (err) {
			console.error("Error fetching training dashboard:", err);
		}
	};

	const fetchSecurityAlerts = async () => {
		try {
			setSecurityAlertsLoading(true);
			const response = await fetch('/api/security-updates');
			const data = await response.json();
			
			if (data.success && data.incidents) {
				// Get only id, incident_title, and ReferenceNumber
				const alerts = data.incidents.map((incident: any) => ({
					id: incident.id,
					incident_title: incident.incident_title,
					ReferenceNumber: incident.ReferenceNumber || incident['Reference #']
				}));
				setSecurityAlerts(alerts.slice(0, 5)); // Show latest 5 alerts
			}
		} catch (err) {
			console.error("Error fetching security alerts:", err);
		} finally {
			setSecurityAlertsLoading(false);
		}
	};

	function getMaxValue(rows: BreakdownRow[], field: keyof BreakdownRow): number {
		return rows.reduce((max, row) => {
			const value = (row[field] as number) || 0;
			return value > max ? value : max;
		}, 0);
	}

	function getPercentage(part: number, total: number): string {
		if (!total || total <= 0) return "0%";
		return `${Math.round((part / total) * 100)}%`;
	}

	useEffect(() => {
		if (isAutoPlaying && pictures.length > 3) {
			const interval = setInterval(() => {
				setCurrentIndex((prevIndex) => {
					// Show 3 images at a time, so max index should be pictures.length - 3
					const maxIndex = Math.max(0, pictures.length - 3);
					return prevIndex >= maxIndex ? 0 : prevIndex + 1;
				});
			}, 10000); // Change picture every 10 seconds

			return () => clearInterval(interval);
		}
	}, [isAutoPlaying, pictures.length]);

	// Dummy news data
	const newsItems = [
		{
			id: 1,
			title: "RIF-II Project Launches New Infrastructure Initiative",
			description: "The Regional Infrastructure Fund announces a major new initiative to improve urban infrastructure across Khyber Pakhtunkhwa, focusing on sustainable development and community engagement.",
			image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop",
			date: "January 15, 2025",
			category: "Infrastructure"
		},
		{
			id: 2,
			title: "Capacity Building Workshop Successfully Completed",
			description: "Over 200 participants from various districts attended the comprehensive training workshop on resource management and sustainable practices, marking a significant milestone in the project.",
			image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=400&fit=crop",
			date: "January 12, 2025",
			category: "Training"
		},
		{
			id: 3,
			title: "Community Engagement Program Reaches 10,000 Beneficiaries",
			description: "The community engagement program has successfully reached over 10,000 beneficiaries across multiple districts, with positive feedback and high participation rates.",
			image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=400&fit=crop",
			date: "January 10, 2025",
			category: "Community"
		},
		{
			id: 4,
			title: "New Water Management System Implemented in DIK District",
			description: "A state-of-the-art water management system has been successfully implemented in DIK district, improving water supply and quality for thousands of residents.",
			image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&h=400&fit=crop",
			date: "January 8, 2025",
			category: "Water Management"
		},
		{
			id: 5,
			title: "Partnership Agreement Signed with Local NGOs",
			description: "RIF-II has signed strategic partnership agreements with five local NGOs to enhance project implementation and ensure better community outreach and support.",
			image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=400&fit=crop",
			date: "January 5, 2025",
			category: "Partnerships"
		}
	];

	useEffect(() => {
		if (isNewsAutoPlaying && newsItems.length > 0) {
			const interval = setInterval(() => {
				setNewsIndex((prevIndex) => {
					return prevIndex >= newsItems.length - 1 ? 0 : prevIndex + 1;
				});
			}, 5000); // Change news every 5 seconds

			return () => clearInterval(interval);
		}
	}, [isNewsAutoPlaying, newsItems.length]);

	const getImageUrl = (filePath: string | null) => {
		if (!filePath) return '';
		
		// If already a full URL, return as-is
		if (filePath.startsWith('https://') || filePath.startsWith('http://')) {
			return filePath;
		}
		
		// Handle ~/ prefix (remove it)
		let cleanPath = filePath;
		if (cleanPath.startsWith('~/')) {
			cleanPath = cleanPath.replace('~/', '');
		}
		
		// Ensure path starts with uploads/ for relative paths
		if (!cleanPath.startsWith('uploads/') && !cleanPath.startsWith('/')) {
			cleanPath = `uploads/${cleanPath}`;
		}
		
		// Remove leading slash if present (we'll add it)
		if (cleanPath.startsWith('/')) {
			cleanPath = cleanPath.substring(1);
		}
		
		// For client-side, use current origin
		if (typeof window !== 'undefined') {
			const origin = window.location.origin;
			return `${origin}/${cleanPath}`;
		}
		
		// For server-side or fallback, use relative path
		return `/${cleanPath}`;
	};

	const fetchDashboardPictures = async () => {
		try {
			setLoading(true);
			setError(null);
			// Fetch all pictures for the gallery
			const response = await fetch('/api/pictures/details');
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const data = await response.json();

			if (data.success) {
				const fetchedPictures = data.pictures || [];
				// Log first picture's FilePath for debugging
				if (fetchedPictures.length > 0 && fetchedPictures[0].FilePath) {
					const firstPic = fetchedPictures[0];
					const testUrl = getImageUrl(firstPic.FilePath);
					console.log('Sample picture URL:', {
						filePath: firstPic.FilePath,
						generatedUrl: testUrl
					});
				}
				setPictures(fetchedPictures);
			} else {
				const errorMsg = data.message || "Failed to fetch pictures";
				setError(errorMsg);
			}
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : "Error fetching pictures";
			setError(errorMsg);
		} finally {
			setLoading(false);
		}
	};

	const fetchOutputProgress = async () => {
		try {
			const response = await fetch('/api/tracking-sheet/output-progress');
			const data = await response.json();

			if (data.success) {
				setOutputProgress(data.outputProgress || []);
			} else {
				console.error("Failed to fetch output progress:", data.message);
			}
		} catch (err) {
			console.error("Error fetching output progress:", err);
		}
	};

	const fetchDistrictProgress = async () => {
		try {
			const response = await fetch('/api/tracking-sheet/output-progress-by-district');
			const data = await response.json();

			if (data.success) {
				setDistrictProgress(data.districtProgress || []);
			} else {
				console.error("Failed to fetch district progress:", data.message);
			}
		} catch (err) {
			console.error("Error fetching district progress:", err);
		}
	};

	const fetchOutputWeightage = async () => {
		try {
			const response = await fetch('/api/tracking-sheet/output-weightage');
			const data = await response.json();

			if (data.success) {
				console.log("Output Weightage Data:", data.outputWeightage);
				setOutputWeightage(data.outputWeightage || []);
			} else {
				console.error("Failed to fetch output weightage:", data.message);
			}
		} catch (err) {
			console.error("Error fetching output weightage:", err);
		}
	};

	const fetchActivityProgress = async () => {
		try {
			const response = await fetch('/api/tracking-sheet/activity-progress-summary');
			const data = await response.json();

			if (data.success) {
				setActivityProgress(data.activityProgress || []);
			} else {
				console.error("Failed to fetch activity progress:", data.message);
			}
		} catch (err) {
			console.error("Error fetching activity progress:", err);
		}
	};

	const fetchSectorProgress = async () => {
		try {
			const response = await fetch('/api/tracking-sheet/sector-progress');
			const data = await response.json();

			if (data.success) {
				setSectorProgress(data.sectorProgress || []);
			} else {
				console.error("Failed to fetch sector progress:", data.message);
			}
		} catch (err) {
			console.error("Error fetching sector progress:", err);
		}
	};

	const fetchDistrictProgressSummary = async () => {
		try {
			const response = await fetch('/api/tracking-sheet/district-progress-summary');
			const data = await response.json();

			if (data.success) {
				setDistrictProgressSummary(data.districtProgress || []);
			} else {
				console.error("Failed to fetch district progress summary:", data.message);
			}
		} catch (err) {
			console.error("Error fetching district progress summary:", err);
		}
	};

	const fetchTrainingGraphs = async () => {
		try {
			const response = await fetch('/api/training/graphs');
			const data = await response.json();

			if (data.success) {
				setTrainingGraphData(data.graphData || []);
			} else {
				console.error("Failed to fetch training graphs:", data.message);
			}
		} catch (err) {
			console.error("Error fetching training graphs:", err);
		}
	};

	const handlePictureClick = (picture: PictureData) => {
		setSelectedPicture(picture);
	};

	const nextPicture = () => {
		setCurrentIndex((prevIndex) => {
			// Show 3 images at a time, so max index should be pictures.length - 3
			const maxIndex = Math.max(0, pictures.length - 3);
			return prevIndex >= maxIndex ? 0 : prevIndex + 1;
		});
	};

	const prevPicture = () => {
		setCurrentIndex((prevIndex) => {
			// Show 3 images at a time, so max index should be pictures.length - 3
			const maxIndex = Math.max(0, pictures.length - 3);
			return prevIndex <= 0 ? maxIndex : prevIndex - 1;
		});
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

	// Get all pictures for the carousel
	const carouselPictures = pictures;

	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
					<p className="text-gray-600 mt-2">Welcome to the RIF-II MIS Dashboard</p>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b]"></div>
					<span className="ml-3 text-gray-600">Loading dashboard...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
					<p className="text-gray-600 mt-2">Welcome to the RIF-II MIS Dashboard</p>
				</div>
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<p className="text-red-600">{error}</p>
					<button
						onClick={fetchDashboardPictures}
						className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="space-y-1">
				<h1 className="text-3xl font-semibold text-gray-900 leading-tight tracking-tight">Dashboard</h1>
				<p className="text-sm text-gray-600 leading-relaxed">Welcome to the RIF-II MIS Dashboard</p>
			</div>

		{/* GIS Maps Section */}
		<DIKPanialaGISMapSection />

		{/* Progress % Section - Three Columns */}
		<div className="space-y-6">
			<div className="space-y-1">
				<h2 className="text-2xl font-semibold text-gray-900 leading-snug tracking-tight">Project Tracking Progress (%)</h2>
				<p className="text-sm text-gray-600 leading-relaxed">Monitor and track project completion across all outputs</p>
			</div>
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
			{/* First Chart - Output Progress */}
			<div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4">
				<h3 className="text-base font-medium text-gray-900 leading-snug mb-2 text-center">Output Progress</h3>
				<OutputProgressChart />
			</div>

			{/* Second Chart - Sector Wise */}
			<div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4">
				<h3 className="text-base font-medium text-gray-900 leading-snug mb-2 text-center">Sector Wise</h3>
				<SectorWiseChart />
			</div>

			{/* Third Chart - District Wise */}
			<div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4">
				<h3 className="text-base font-medium text-gray-900 leading-snug mb-2 text-center">District Wise</h3>
				<DistrictWiseChart districtData={districtProgressSummary} />
			</div>
		</div>
		</div>

			{/* Training Dashboard Summary Cards */}
			{trainingDashboardData && (
				<div className="space-y-6">
					<div className="space-y-1">
						<h2 className="text-2xl font-semibold text-gray-900 leading-snug tracking-tight">Training, Capacity Building & Awareness</h2>
						<p className="text-sm text-gray-600 leading-relaxed">Overview of trainings, days and participants (event type wise and district wise).</p>
					</div>

					{/* Overall cards */}
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						<div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 text-white shadow-md">
							<p className="text-xs uppercase tracking-wide opacity-80">
								Total Trainings
							</p>
							<p className="mt-2 text-2xl font-semibold">
								{trainingDashboardData.overall.totalTrainings.toLocaleString()}
							</p>
						</div>

						<div className="rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 p-4 text-white shadow-md">
							<p className="text-xs uppercase tracking-wide opacity-80">
								Total Days
							</p>
							<p className="mt-2 text-2xl font-semibold">
								{trainingDashboardData.overall.totalDays.toLocaleString()}
							</p>
						</div>

						<div className="rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 text-white shadow-md">
							<p className="text-xs uppercase tracking-wide opacity-80">
								Total Male / Female
							</p>
							<div className="mt-2 space-y-0.5 text-sm">
								<p className="font-semibold">
									<span>{trainingDashboardData.overall.totalMale.toLocaleString()}</span>
									<span className="mx-1 text-xs font-normal opacity-80">/</span>
									<span>{trainingDashboardData.overall.totalFemale.toLocaleString()}</span>
								</p>
								<p className="text-[11px] text-indigo-100">
									{getPercentage(
										trainingDashboardData.overall.totalMale,
										trainingDashboardData.overall.totalParticipants
									)}{" "}
									Male /{" "}
									{getPercentage(
										trainingDashboardData.overall.totalFemale,
										trainingDashboardData.overall.totalParticipants
									)}{" "}
									Female
								</p>
							</div>
						</div>

						<div className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-4 text-white shadow-md">
							<p className="text-xs uppercase tracking-wide opacity-80">
								Total Participants
							</p>
							<p className="mt-2 text-2xl font-semibold">
								{trainingDashboardData.overall.totalParticipants.toLocaleString()}
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Picture Gallery Section */}
			<div className="bg-gradient-to-r from-[#0b4d2b] to-[#0a3d24] rounded-xl shadow-lg overflow-hidden">
				<div className="p-6">
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<h2 className="text-2xl font-semibold text-white leading-snug tracking-tight">Project Activity Picture Gallery (click Picture for detail)</h2>
							<p className="text-sm text-green-100 leading-relaxed">
								Displaying {pictures.length} picture{pictures.length !== 1 ? 's' : ''} from your collection
							</p>
						</div>
						<div className="flex items-center space-x-2">
							<button
								onClick={() => setIsAutoPlaying(!isAutoPlaying)}
								className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
									isAutoPlaying 
										? 'bg-white/20 text-white hover:bg-white/30 border border-white/30' 
										: 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'
								}`}
							>
								{isAutoPlaying ? 'Auto Play ON' : 'Auto Play OFF'}
							</button>
						</div>
					</div>
				</div>

				{carouselPictures.length === 0 ? (
					<div className="p-12 text-center bg-white">
						<ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
						<h3 className="text-base font-medium text-gray-900 leading-snug mb-2">No pictures available</h3>
						<p className="text-sm text-gray-600 leading-relaxed">Pictures will appear here once they are uploaded</p>
					</div>
				) : (
					<div className="relative bg-white rounded-xl shadow-sm p-6">
						{/* Navigation Buttons */}
						{carouselPictures.length > 3 && (
							<>
								<button
									onClick={prevPicture}
									className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white rounded-full p-4 shadow-2xl hover:bg-[#0b4d2b] hover:text-white transition-all duration-300 border-2 border-gray-200 hover:border-[#0b4d2b] group"
									aria-label="Previous images"
								>
									<ChevronLeft className="h-7 w-7 text-gray-700 group-hover:text-white transition-colors" />
								</button>
								<button
									onClick={nextPicture}
									className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white rounded-full p-4 shadow-2xl hover:bg-[#0b4d2b] hover:text-white transition-all duration-300 border-2 border-gray-200 hover:border-[#0b4d2b] group"
									aria-label="Next images"
								>
									<ChevronRight className="h-7 w-7 text-gray-700 group-hover:text-white transition-colors" />
								</button>
							</>
						)}

						{/* Three Images Grid */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-12">
							{carouselPictures.slice(currentIndex, currentIndex + 3).map((picture, index) => {
								const actualIndex = currentIndex + index;
								const imageUrl = getImageUrl(picture.FilePath);
								const uniqueKey = picture.PictureID || `picture-${actualIndex}-${picture.FileName || index}`;
								
								return (
									<div
										key={uniqueKey}
										className="group relative"
									>
										{/* Elegant Card Container */}
										<div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:-translate-y-1 border border-gray-100 cursor-pointer" onClick={() => handlePictureClick(picture)}>
											{/* Image Frame - Reduced Height */}
											<div className="relative w-full bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-2 overflow-hidden" style={{ height: '280px' }}>
												{/* Inner Frame */}
												<div className="relative w-full h-full rounded-lg overflow-hidden shadow-inner border-2 border-white/50">
													{imageUrl ? (
														<>
															<Image
																src={imageUrl}
																alt={picture.FileName || "Picture"}
																fill
																className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
																unoptimized
																onError={(e) => {
																	// Silently handle image errors - show placeholder
																	const target = (e.target || e.currentTarget) as HTMLImageElement;
																	if (target && target.src && !target.src.includes('data:image')) {
																		target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage not found%3C/text%3E%3C/svg%3E';
																	}
																}}
															/>
															{/* Elegant Overlay */}
															<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
															{/* Shine Effect */}
															<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
														</>
													) : (
														<div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-100 to-gray-200">
															<ImageIcon className="h-16 w-16 text-gray-400" />
														</div>
													)}
													
													{/* Category Badge - Always Visible */}
													{picture.MainCategory && (
														<div className="absolute top-2 left-2 bg-gradient-to-r from-[#0b4d2b] to-[#0a3d24] text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-xl backdrop-blur-sm border border-white/20">
															{picture.MainCategory}
														</div>
													)}
													
													{/* Image Number Badge */}
													<div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full border border-white/20">
														{actualIndex + 1} / {carouselPictures.length}
													</div>
												</div>
											</div>
											
											{/* Information Panel - Compact */}
											<div className="p-4 bg-gradient-to-b from-white via-gray-50/50 to-white border-t border-gray-100">
												{/* Title */}
												{picture.FileName && (
													<h3 className="text-base font-medium text-gray-900 leading-snug line-clamp-1 mb-3 group-hover:text-[#0b4d2b] transition-colors duration-300">
														{picture.FileName}
													</h3>
												)}
												
												{/* Details - Compact Layout */}
												<div className="space-y-2">
													{picture.MainCategory && (
														<div className="flex items-center gap-2">
															<div className="p-1 bg-[#0b4d2b]/10 rounded">
																<Folder className="h-3.5 w-3.5 text-[#0b4d2b]" />
															</div>
															<div className="flex-1 min-w-0">
																<p className="text-xs font-semibold text-gray-900 truncate">{picture.MainCategory}</p>
																{picture.SubCategory && (
																	<p className="text-xs text-gray-600 truncate">{picture.SubCategory}</p>
																)}
															</div>
														</div>
													)}
													
													<div className="flex items-center gap-4">
														{picture.EventDate && (
															<div className="flex items-center gap-1.5 flex-1 min-w-0">
																<Calendar className="h-3.5 w-3.5 text-[#0b4d2b] flex-shrink-0" />
																<p className="text-xs text-gray-700 truncate">{picture.EventDate}</p>
															</div>
														)}
														
														{picture.UploadedBy && (
															<div className="flex items-center gap-1.5 flex-1 min-w-0">
																<User className="h-3.5 w-3.5 text-[#0b4d2b] flex-shrink-0" />
																<p className="text-xs text-gray-700 truncate">{picture.UploadedBy}</p>
															</div>
														)}
													</div>
												</div>
											</div>
											
											{/* Decorative Bottom Border */}
											<div className="h-0.5 bg-gradient-to-r from-[#0b4d2b] via-[#0a3d24] to-[#0b4d2b] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
										</div>
									</div>
								);
							})}
						</div>

						{/* Dots Indicator */}
						{carouselPictures.length > 3 && (
							<div className="flex justify-center items-center gap-3 mt-8 pt-6 border-t border-gray-200">
								{Array.from({ length: Math.ceil(carouselPictures.length / 3) }).map((_, index) => {
									const slideIndex = index * 3;
									const isActive = currentIndex >= slideIndex && currentIndex < slideIndex + 3;
									return (
										<button
											key={index}
											onClick={() => setCurrentIndex(slideIndex)}
											className={`h-2.5 rounded-full transition-all duration-300 ${
												isActive
													? "w-10 bg-[#0b4d2b] shadow-md"
													: "w-2.5 bg-gray-300 hover:bg-gray-400 hover:w-3"
											}`}
											aria-label={`Go to page ${index + 1}`}
										/>
									);
								})}
							</div>
						)}
					</div>
				)}
			</div>

			{/* News Section */}
			<div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-lg overflow-hidden">
				<div className="p-6 border-b border-gray-200 bg-gradient-to-r from-[#0b4d2b] to-[#0a3d24]">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-3">
							<div className="p-2 bg-white/20 rounded-lg">
								<Newspaper className="h-6 w-6 text-white" />
						</div>
							<div className="space-y-1">
								<h2 className="text-2xl font-semibold text-white leading-snug tracking-tight">Latest News & Updates [Dummy]</h2>
								<p className="text-sm text-green-100 leading-relaxed">Stay informed about our latest projects and initiatives</p>
						</div>
						</div>
						<button
							onClick={() => setIsNewsAutoPlaying(!isNewsAutoPlaying)}
							className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
								isNewsAutoPlaying 
									? 'bg-green-600 text-white hover:bg-green-700' 
									: 'bg-white/20 text-white hover:bg-white/30'
							}`}
						>
							{isNewsAutoPlaying ? 'Auto Play ON' : 'Auto Play OFF'}
						</button>
					</div>
				</div>

				<div className="relative overflow-hidden">
					<div 
						className="flex transition-transform duration-700 ease-in-out"
						style={{ transform: `translateX(-${newsIndex * 100}%)` }}
					>
						{newsItems.map((news) => (
							<div key={news.id} className="w-full flex-shrink-0">
								<div className="grid md:grid-cols-2 gap-6 p-6">
									{/* News Image */}
									<div className="relative overflow-hidden rounded-lg shadow-md">
										<div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 relative">
											<img
												src={news.image}
												alt={news.title}
												className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
												onError={(e) => {
													const target = e.target as HTMLImageElement;
													target.style.display = 'none';
												}}
											/>
											<div className="absolute top-4 left-4">
												<span className="px-3 py-1 bg-[#0b4d2b] text-white text-xs font-semibold rounded-full shadow-lg">
													{news.category}
												</span>
						</div>
					</div>
				</div>

									{/* News Content */}
									<div className="flex flex-col justify-center space-y-4">
										<div className="flex items-center space-x-2 text-sm text-gray-500">
											<Clock className="h-4 w-4" />
											<span>{news.date}</span>
						</div>
										<h3 className="text-xl font-semibold text-gray-900 leading-snug tracking-tight">
											{news.title}
										</h3>
										<p className="text-sm text-gray-600 leading-relaxed">
											{news.description}
										</p>
										<button className="inline-flex items-center px-6 py-3 bg-[#0b4d2b] text-white font-medium rounded-lg hover:bg-[#0a3d24] transition-colors w-fit">
											Read More
											<ExternalLink className="ml-2 h-4 w-4" />
										</button>
						</div>
					</div>
				</div>
						))}
			</div>

					{/* Navigation Arrows */}
					{newsItems.length > 1 && (
						<>
							<button
								onClick={() => setNewsIndex((prev) => prev <= 0 ? newsItems.length - 1 : prev - 1)}
								className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 hover:text-[#0b4d2b] p-3 rounded-full shadow-lg transition-all duration-200 z-10"
							>
								<ChevronLeft className="h-6 w-6" />
							</button>
							<button
								onClick={() => setNewsIndex((prev) => prev >= newsItems.length - 1 ? 0 : prev + 1)}
								className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 hover:text-[#0b4d2b] p-3 rounded-full shadow-lg transition-all duration-200 z-10"
							>
								<ChevronRight className="h-6 w-6" />
							</button>
						</>
					)}

					{/* Dots Indicator */}
					{newsItems.length > 1 && (
						<div className="flex justify-center space-x-2 p-4 bg-gray-50">
							{newsItems.map((_, index) => (
								<button
									key={index}
									onClick={() => setNewsIndex(index)}
									className={`h-2 rounded-full transition-all duration-300 ${
										index === newsIndex 
											? 'bg-[#0b4d2b] w-8' 
											: 'bg-gray-300 hover:bg-gray-400 w-2'
									}`}
								/>
							))}
						</div>
					)}
				</div>
			</div>

			{/* RIF-II Security Alert Section */}
			<div className="bg-gradient-to-br from-white to-red-50 rounded-xl border border-red-200 shadow-lg overflow-hidden">
				<div className="p-6 border-b border-red-200 bg-gradient-to-r from-red-600 to-red-700">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-3">
							<div className="p-2 bg-white/20 rounded-lg">
								<Shield className="h-6 w-6 text-white" />
							</div>
							<div className="space-y-1">
								<h2 className="text-2xl font-semibold text-white leading-snug tracking-tight">RIF-II Security Alert</h2>
								<p className="text-sm text-red-100 leading-relaxed">Stay informed about security incidents and alerts</p>
							</div>
						</div>
					</div>
				</div>

				<div className="p-6">
					{securityAlertsLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin text-red-600" />
							<span className="ml-3 text-gray-600">Loading security alerts...</span>
						</div>
					) : securityAlerts.length === 0 ? (
						<div className="text-center py-8">
							<AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
							<p className="text-gray-600">No security alerts at this time</p>
						</div>
					) : (
						<div className="space-y-4">
							{securityAlerts.map((alert) => (
								<div
									key={alert.id}
									className="bg-white rounded-lg border border-red-200 p-4 hover:shadow-md transition-shadow"
								>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<h3 className="text-base font-medium text-gray-900 leading-snug mb-2">
												{alert.incident_title}
											</h3>
											{alert.ReferenceNumber && (
												<Link
													href={`/dashboard/security-updates/view?ref=${encodeURIComponent(alert.ReferenceNumber)}`}
													className="inline-flex items-center text-sm font-medium text-red-600 hover:text-red-700 hover:underline"
												>
													<Shield className="h-4 w-4 mr-1" />
													Reference #: {alert.ReferenceNumber}
													<ExternalLink className="h-3 w-3 ml-1" />
												</Link>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Image Modal */}
			{selectedPicture && (
				<div 
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
					onClick={() => setSelectedPicture(null)}
				>
					<div 
						className="relative max-w-7xl max-h-[90vh] w-full mx-4"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Close Button */}
						<button
							onClick={() => setSelectedPicture(null)}
							className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-all duration-200 backdrop-blur-sm border border-white/20"
							aria-label="Close"
						>
							<X className="h-6 w-6" />
						</button>

						{/* Image Container */}
						<div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
							{getImageUrl(selectedPicture.FilePath) ? (
								<Image
									src={getImageUrl(selectedPicture.FilePath)}
									alt={selectedPicture.FileName || "Picture"}
									width={1200}
									height={800}
									className="w-full h-auto max-h-[90vh] object-contain"
									unoptimized
									onError={(e) => {
										console.log("Image load error for:", selectedPicture.FilePath);
									}}
								/>
							) : (
								<div className="flex items-center justify-center h-[500px] bg-gray-900">
									<ImageIcon className="h-24 w-24 text-gray-400" />
								</div>
							)}

							{/* Picture Information Overlay */}
							<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6">
								<div className="text-white">
									<h3 className="text-xl font-semibold leading-snug tracking-tight mb-3">
										{selectedPicture.FileName || "Untitled Picture"}
									</h3>
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
										{selectedPicture.GroupName && (
											<div className="flex items-center space-x-2">
												<Folder className="h-4 w-4" />
												<span className="font-medium">Group:</span>
												<span>{selectedPicture.GroupName}</span>
											</div>
										)}
										{selectedPicture.MainCategory && (
											<div className="flex items-center space-x-2">
												<Folder className="h-4 w-4" />
												<span className="font-medium">Category:</span>
												<span>{selectedPicture.MainCategory}</span>
											</div>
										)}
										{selectedPicture.EventDate && (
											<div className="flex items-center space-x-2">
												<Calendar className="h-4 w-4" />
												<span className="font-medium">Date:</span>
												<span>{selectedPicture.EventDate}</span>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}


