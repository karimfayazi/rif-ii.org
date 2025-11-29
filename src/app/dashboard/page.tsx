"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar, Folder, Image as ImageIcon, ExternalLink, TrendingUp, MapPin, Building2, Newspaper, Clock } from "lucide-react";
import Link from "next/link";

type PictureData = {
	GroupName: string;
	MainCategory: string;
	SubCategory: string;
	FileName: string;
	FilePath: string;
	EventDate: string;
};

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

					// Clear any existing map
					if (mapInstanceRef.current) {
						try {
							mapInstanceRef.current.remove();
						} catch (e) {
							console.warn('Error removing existing map:', e);
						}
						mapInstanceRef.current = null;
					}

					// Ensure container has proper dimensions
					const container = mapContainerRef.current;
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

export default function DashboardPage() {
	const router = useRouter();
	const [pictures, setPictures] = useState<PictureData[]>([]);
	const [outputProgress, setOutputProgress] = useState<OutputProgress[]>([]);
	const [districtProgress, setDistrictProgress] = useState<DistrictProgress[]>([]);
	const [outputWeightage, setOutputWeightage] = useState<OutputWeightage[]>([]);
	const [activityProgress, setActivityProgress] = useState<ActivityProgress[]>([]);
	const [trainingDashboardData, setTrainingDashboardData] = useState<DashboardData | null>(null);
	const [selectedEventType, setSelectedEventType] = useState<BreakdownRow | null>(null);
	const [selectedDistrict, setSelectedDistrict] = useState<BreakdownRow | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isAutoPlaying, setIsAutoPlaying] = useState(true);
	const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
	const [newsIndex, setNewsIndex] = useState(0);
	const [isNewsAutoPlaying, setIsNewsAutoPlaying] = useState(true);

	useEffect(() => {
		fetchDashboardPictures();
		fetchOutputProgress();
		fetchDistrictProgress();
		fetchOutputWeightage();
		fetchActivityProgress();
		fetchTrainingDashboard();
	}, []);

	const fetchTrainingDashboard = async () => {
		try {
			const res = await fetch("/api/training/dashboard");
			if (!res.ok) {
				throw new Error("Failed to load dashboard data");
			}
			const json = await res.json() as DashboardResponse;
			if (!json.success) {
				throw new Error(json.message ?? "Failed to load dashboard data");
			}
			setTrainingDashboardData(json);
		} catch (err) {
			console.error("Error fetching training dashboard:", err);
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
		if (isAutoPlaying && pictures.length > 0) {
			const interval = setInterval(() => {
				setCurrentIndex((prevIndex) => {
					// Show 4 images at a time, so max index should be pictures.length - 4
					const maxIndex = Math.max(0, pictures.length - 4);
					return prevIndex >= maxIndex ? 0 : prevIndex + 1;
				});
			}, 3000); // Change picture every 3 seconds

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
		if (!filePath) {
			console.warn('getImageUrl: filePath is null or empty');
			return '';
		}
		
		// If already a full URL, return as is
		if (filePath.startsWith('https://') || filePath.startsWith('http://')) {
			return filePath;
		}
		
		// Remove ~/ prefix if present
		let cleanPath = filePath.startsWith('~/') ? filePath.replace('~/', '') : filePath;
		
		// Ensure it starts with Uploads (capital U as per the server structure)
		if (!cleanPath.startsWith('Uploads/') && !cleanPath.startsWith('uploads/')) {
			cleanPath = `Uploads/${cleanPath}`;
		} else if (cleanPath.startsWith('uploads/')) {
			// Convert lowercase uploads to Uploads
			cleanPath = 'Uploads/' + cleanPath.substring('uploads/'.length);
		}
		
		// Construct full URL
		const fullUrl = `https://rif-ii.org/${cleanPath}`;
		
		// Debug logging (only in development)
		if (process.env.NODE_ENV === 'development') {
			console.log('getImageUrl:', { original: filePath, cleaned: cleanPath, final: fullUrl });
		}
		
		return fullUrl;
	};

	const fetchDashboardPictures = async () => {
		try {
			setLoading(true);
			const response = await fetch('/api/pictures/dashboard');
			const data = await response.json();

			if (data.success) {
				console.log('Dashboard pictures fetched:', data.pictures?.length || 0, 'pictures');
				console.log('Sample picture data:', data.pictures?.[0]);
				setPictures(data.pictures || []);
			} else {
				setError(data.message || "Failed to fetch pictures");
			}
		} catch (err) {
			setError("Error fetching pictures");
			console.error("Error fetching pictures:", err);
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

	const handlePictureClick = (picture: PictureData) => {
		const params = new URLSearchParams();
		if (picture.GroupName) params.append('groupName', picture.GroupName);
		if (picture.MainCategory) params.append('mainCategory', picture.MainCategory);
		if (picture.SubCategory) params.append('subCategory', picture.SubCategory);
		
		router.push(`/dashboard/pictures/details?${params.toString()}`);
	};

	const nextPicture = () => {
		setCurrentIndex((prevIndex) => {
			// Show 4 images at a time, so max index should be pictures.length - 4
			const maxIndex = Math.max(0, pictures.length - 4);
			return prevIndex >= maxIndex ? 0 : prevIndex + 1;
		});
	};

	const prevPicture = () => {
		setCurrentIndex((prevIndex) => {
			// Show 4 images at a time, so max index should be pictures.length - 4
			const maxIndex = Math.max(0, pictures.length - 4);
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
			<div>
				<h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
				<p className="text-gray-600 mt-2">Welcome to the RIF-II MIS Dashboard</p>
			</div>

			{/* Progress % Section */}
			<div className="space-y-6">
				<div>
					<h2 className="text-3xl font-bold text-gray-900 tracking-tight">Project Tracking Progress (%)</h2>
					<p className="text-sm text-gray-500 mt-1">Monitor and track project completion across all outputs</p>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
						{(() => {
						// Group activities by OutputID
						const outputAGroup = activityProgress.filter(item => {
							const id = item.OutputID?.toString().toUpperCase().trim();
							return id === 'A' || id === '1' || id === 'OUTPUT A' || id === 'OUTPUTA';
						});
						const outputBGroup = activityProgress.filter(item => {
							const id = item.OutputID?.toString().toUpperCase().trim();
							return id === 'B' || id === '2' || id === 'OUTPUT B' || id === 'OUTPUTB';
						});
						const outputCGroup = activityProgress.filter(item => {
							const id = item.OutputID?.toString().toUpperCase().trim();
							return id === 'C' || id === '3' || id === 'OUTPUT C' || id === 'OUTPUTC';
						});

						// Calculate Progress % for Output A, B, C (simple sum of OutputWeightage)
						const outputASum = Math.round(outputAGroup.reduce((sum, item) => sum + (item.OutputWeightage || 0), 0));
						const outputBSum = Math.round(outputBGroup.reduce((sum, item) => sum + (item.OutputWeightage || 0), 0));
						const outputCSum = Math.round(outputCGroup.reduce((sum, item) => sum + (item.OutputWeightage || 0), 0));
						
						// Get Output Weightage values (from Output Weightage section)
						let outputAWeightage = 0;
						let outputBWeightage = 0;
						let outputCWeightage = 0;
						
						const foundA = outputWeightage.find(item => {
							const id = item.OutputID?.toString().toUpperCase().trim();
							return id === 'A' || id === '1' || id === 'OUTPUT A' || id === 'OUTPUTA';
						});
						const foundB = outputWeightage.find(item => {
							const id = item.OutputID?.toString().toUpperCase().trim();
							return id === 'B' || id === '2' || id === 'OUTPUT B' || id === 'OUTPUTB';
						});
						const foundC = outputWeightage.find(item => {
							const id = item.OutputID?.toString().toUpperCase().trim();
							return id === 'C' || id === '3' || id === 'OUTPUT C' || id === 'OUTPUTC';
						});
						
						if (!foundA && outputWeightage.length > 0) {
							outputAWeightage = outputWeightage[0]?.TotalWeightage || 0;
						} else {
							outputAWeightage = foundA?.TotalWeightage || 0;
						}
						
						if (!foundB && outputWeightage.length > 1) {
							outputBWeightage = outputWeightage[1]?.TotalWeightage || 0;
						} else {
							outputBWeightage = foundB?.TotalWeightage || 0;
						}
						
						if (!foundC && outputWeightage.length > 2) {
							outputCWeightage = outputWeightage[2]?.TotalWeightage || 0;
						} else {
							outputCWeightage = foundC?.TotalWeightage || 0;
						}
						
						// Calculate Total Progress % using Weight Percentage Formula: (Percentage × Weightage) ÷ 100
						// Formula: (Output A Progress % × Output A Weightage) ÷ 100 + (Output B Progress % × Output B Weightage) ÷ 100 + (Output C Progress % × Output C Weightage) ÷ 100
						const totalProgressRaw = 
							((outputASum * outputAWeightage) / 100) +
							((outputBSum * outputBWeightage) / 100) +
							((outputCSum * outputCWeightage) / 100);
						
						// Show one decimal place (e.g., 28.5%)
						const totalProgress = Math.round(totalProgressRaw * 10) / 10;

						const totalWeightage = outputAWeightage + outputBWeightage + outputCWeightage;

						return (
							<>
								<div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200 shadow-md hover:shadow-lg transition-all duration-300 p-4">
									<div className="flex items-center">
										<div className="p-2 bg-blue-500 rounded-lg shadow-sm">
											<TrendingUp className="h-5 w-5 text-white" />
										</div>
										<div className="flex-1 text-center ml-3">
											<p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-0.5">Output A</p>
											<p className="text-2xl font-bold text-blue-900 mb-1">{outputASum}%</p>
											<p className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block">Weightage: {outputAWeightage}</p>
										</div>
									</div>
								</div>

								<div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-2 border-green-200 shadow-md hover:shadow-lg transition-all duration-300 p-4">
									<div className="flex items-center">
										<div className="p-2 bg-green-500 rounded-lg shadow-sm">
											<TrendingUp className="h-5 w-5 text-white" />
										</div>
										<div className="flex-1 text-center ml-3">
											<p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-0.5">Output B</p>
											<p className="text-2xl font-bold text-green-900 mb-1">{outputBSum}%</p>
											<p className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-block">Weightage: {outputBWeightage}</p>
										</div>
									</div>
								</div>

								<div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border-2 border-purple-200 shadow-md hover:shadow-lg transition-all duration-300 p-4">
									<div className="flex items-center">
										<div className="p-2 bg-purple-500 rounded-lg shadow-sm">
											<TrendingUp className="h-5 w-5 text-white" />
										</div>
										<div className="flex-1 text-center ml-3">
											<p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-0.5">Output C</p>
											<p className="text-2xl font-bold text-purple-900 mb-1">{outputCSum}%</p>
											<p className="text-[10px] font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full inline-block">Weightage: {outputCWeightage}</p>
										</div>
									</div>
								</div>

								<div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border-2 border-orange-200 shadow-md hover:shadow-lg transition-all duration-300 p-4">
									<div className="flex items-center">
										<div className="p-2 bg-orange-500 rounded-lg shadow-sm">
											<TrendingUp className="h-5 w-5 text-white" />
										</div>
										<div className="flex-1 text-center ml-3">
											<p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-0.5">Total Progress</p>
											<p className="text-2xl font-bold text-orange-900 mb-1">{totalProgress.toFixed(1)}%</p>
											<p className="text-[10px] font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full inline-block">Total Weightage: {totalWeightage}</p>
										</div>
									</div>
								</div>
							</>
						);
						})()}
				</div>
			</div>

			{/* Training Dashboard Summary Cards */}
			{trainingDashboardData && (
				<div className="space-y-6">
					<div>
						<h2 className="text-3xl font-bold text-gray-900 tracking-tight">Training, Capacity Building & Awareness</h2>
						<p className="text-sm text-gray-500 mt-1">Overview of trainings, days and participants (event type wise and district wise).</p>
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

			{/* GIS Report */}
			<div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
				<div className="p-6 border-b border-gray-200">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-xl font-semibold text-gray-900">GIS Report</h2>
							<p className="text-sm text-gray-600 mt-1">Interactive online GIS maps with boundaries</p>
						</div>
						<Link 
							href="/dashboard/maps/kpk-dik-bannu"
							className="inline-flex items-center px-4 py-2 text-sm font-medium text-[#0b4d2b] bg-[#0b4d2b]/10 rounded-lg hover:bg-[#0b4d2b]/20 transition-colors"
						>
							<ExternalLink className="h-4 w-4 mr-2" />
							View Full Maps
						</Link>
					</div>
				</div>
				<div className="p-6">
					<GISMapWithBoundaries />
				</div>
			</div>

			{/* Project Activities Carousel Section */}
			<div className="bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 shadow-lg overflow-hidden">
				<div className="p-6 border-b border-gray-200">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-xl font-semibold text-gray-900">Project Activities</h2>
							<p className="text-sm text-gray-600 mt-1">Click on any picture to view more details</p>
							{/* Debug info - remove after fixing */}
							{process.env.NODE_ENV === 'development' && (
								<p className="text-xs text-gray-500 mt-1">
									Debug: {pictures.length} pictures loaded | Current index: {currentIndex}
									{pictures.length > 0 && (
										<span> | First image URL: {getImageUrl(pictures[0]?.FilePath || null)}</span>
									)}
								</p>
							)}
						</div>
						<div className="flex items-center space-x-2">
							<button
								onClick={() => setIsAutoPlaying(!isAutoPlaying)}
								className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
									isAutoPlaying 
										? 'bg-green-100 text-green-800 hover:bg-green-200' 
										: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
								}`}
							>
								{isAutoPlaying ? 'Auto Play ON' : 'Auto Play OFF'}
							</button>
							<Link
								href="/dashboard/pictures"
								className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-[#0b4d2b] bg-[#0b4d2b]/10 rounded-lg hover:bg-[#0b4d2b]/20 transition-colors"
							>
								<ExternalLink className="h-3 w-3 mr-1" />
								View All
							</Link>
						</div>
					</div>
				</div>

				{carouselPictures.length === 0 ? (
					<div className="p-12 text-center">
						<ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
						<h3 className="text-lg font-medium text-gray-900 mb-2">No pictures available</h3>
						<p className="text-gray-600">Pictures will appear here once they are uploaded</p>
					</div>
				) : (
					<div className="relative overflow-hidden">
						{/* Carousel Container */}
						<div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentIndex * 25}%)` }}>
							{carouselPictures.map((picture, index) => (
								<div key={`${picture.FileName}-${index}`} className="w-1/4 flex-shrink-0 p-4">
									<div
										onClick={() => handlePictureClick(picture)}
										className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer overflow-hidden"
									>
										{/* Image */}
										<div className="aspect-video bg-gray-100 relative overflow-hidden">
											{getImageUrl(picture.FilePath) && !failedImages.has(picture.FileName || getImageUrl(picture.FilePath)) ? (
												<img
													src={getImageUrl(picture.FilePath)}
													alt={picture.FileName || 'Project activity image'}
													className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
													onError={(e) => {
														// Only log in development mode
														if (process.env.NODE_ENV === 'development') {
															console.warn('Image load error for:', picture.FileName, 'URL:', getImageUrl(picture.FilePath));
														}
														// Mark this image as failed
														setFailedImages(prev => new Set(prev).add(picture.FileName || getImageUrl(picture.FilePath)));
													}}
												/>
											) : (
												<div className="w-full h-full flex items-center justify-center text-gray-400">
													<ImageIcon className="h-12 w-12" />
												</div>
											)}
											<div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
												<div className="opacity-0 group-hover:opacity-100 bg-white bg-opacity-90 text-gray-800 px-3 py-1.5 rounded-lg transition-all duration-200">
													<span className="text-sm font-medium">Click to view</span>
												</div>
											</div>
										</div>

										{/* Picture Info */}
										<div className="p-4">
											<h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#0b4d2b] transition-colors">
												{picture.FileName}
											</h3>
											
											<div className="space-y-1 text-xs text-gray-500">
												{picture.MainCategory && (
													<div className="flex items-center">
														<Folder className="h-3 w-3 mr-1" />
														<span className="line-clamp-1">{picture.MainCategory}</span>
													</div>
												)}
												{picture.SubCategory && (
													<div className="flex items-center">
														<Folder className="h-3 w-3 mr-1" />
														<span className="line-clamp-1">{picture.SubCategory}</span>
													</div>
												)}
												{picture.EventDate && (
													<div className="flex items-center">
														<Calendar className="h-3 w-3 mr-1" />
														<span>{formatDate(picture.EventDate)}</span>
													</div>
												)}
											</div>
										</div>
									</div>
								</div>
							))}
						</div>

						{/* Navigation Arrows */}
						{carouselPictures.length > 1 && (
							<>
								<button
									onClick={prevPicture}
									className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-600 hover:text-gray-900 p-2 rounded-full shadow-lg transition-all duration-200"
								>
									<ChevronLeft className="h-5 w-5" />
								</button>
								<button
									onClick={nextPicture}
									className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-600 hover:text-gray-900 p-2 rounded-full shadow-lg transition-all duration-200"
								>
									<ChevronRight className="h-5 w-5" />
								</button>
							</>
						)}

						{/* Dots Indicator */}
						{carouselPictures.length > 1 && (
							<div className="flex justify-center space-x-2 p-4">
								{carouselPictures.map((_, index) => (
									<button
										key={index}
										onClick={() => setCurrentIndex(index)}
										className={`w-2 h-2 rounded-full transition-all duration-200 ${
											index === currentIndex 
												? 'bg-[#0b4d2b] w-6' 
												: 'bg-gray-300 hover:bg-gray-400'
										}`}
									/>
								))}
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
							<div>
								<h2 className="text-2xl font-bold text-white">Latest News & Updates [Dummy]</h2>
								<p className="text-sm text-green-100 mt-1">Stay informed about our latest projects and initiatives</p>
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
										<h3 className="text-2xl font-bold text-gray-900 leading-tight">
											{news.title}
										</h3>
										<p className="text-gray-600 leading-relaxed">
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

		</div>
	);
}


