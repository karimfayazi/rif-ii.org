"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar, Folder, Image as ImageIcon, ExternalLink, TrendingUp, MapPin, Building2 } from "lucide-react";
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

export default function DashboardPage() {
	const router = useRouter();
	const [pictures, setPictures] = useState<PictureData[]>([]);
	const [outputProgress, setOutputProgress] = useState<OutputProgress[]>([]);
	const [districtProgress, setDistrictProgress] = useState<DistrictProgress[]>([]);
	const [outputWeightage, setOutputWeightage] = useState<OutputWeightage[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isAutoPlaying, setIsAutoPlaying] = useState(true);
	const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

	useEffect(() => {
		fetchDashboardPictures();
		fetchOutputProgress();
		fetchDistrictProgress();
		fetchOutputWeightage();
	}, []);

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

			{/* Analytics Graphs Section */}
			<div className="space-y-8">
				<div>
					<h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics Dashboard</h2>
					<p className="text-gray-600">Key performance indicators and progress tracking</p>
				</div>

				{/* Progress Section */}
				<div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
					<div className="p-6 border-b border-gray-200">
						<div className="flex items-center">
							<div className="p-2 bg-blue-100 rounded-lg">
								<TrendingUp className="h-6 w-6 text-blue-600" />
							</div>
							<div className="ml-4">
								<h3 className="text-lg font-semibold text-gray-900">Overall Progress</h3>
								<p className="text-sm text-gray-600">Project completion status across all sectors</p>
							</div>
						</div>
					</div>
					<div className="p-6">
						{(() => {
							// Map output progress data to display format
							const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-indigo-500"];
							const outputs = outputProgress.map((item, index) => ({
								name: `Output ${item.OutputID}`,
								progress: Math.round(item.Output_Progress || 0),
								color: colors[index % colors.length]
							}));

							// Calculate overall average
							const overall = outputs.length > 0
								? Math.round(outputs.reduce((sum, o) => sum + o.progress, 0) / outputs.length)
								: 0;

							if (outputs.length === 0) {
								return (
									<div className="text-center py-12">
										<p className="text-gray-600">Loading output progress data...</p>
									</div>
								);
							}

							return (
								<>
									<div className="mb-6 flex items-center justify-center">
										<div className="text-center">
											<p className="text-sm text-gray-600">Overall average</p>
											<p className="text-3xl font-bold text-gray-900">{overall}%</p>
										</div>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
										{outputs.map((item, index) => (
											<div key={index} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 text-center">
												<div className="relative w-24 h-24 mx-auto mb-4">
													<svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
														<circle
															cx="50"
															cy="50"
															r="40"
															stroke="currentColor"
															strokeWidth="8"
															fill="none"
															className="text-gray-200"
														/>
														<circle
															cx="50"
															cy="50"
															r="40"
															stroke="currentColor"
															strokeWidth="8"
															fill="none"
															strokeDasharray={`${2 * Math.PI * 40}`}
															strokeDashoffset={`${2 * Math.PI * 40 * (1 - item.progress / 100)}`}
															className={`${item.color.replace('bg-', 'text-')} transition-all duration-1000 ease-out`}
															style={{ strokeLinecap: 'round' }}
														/>
													</svg>
													<div className="absolute inset-0 flex items-center justify-center">
														<span className="text-lg font-bold text-gray-900">{item.progress}%</span>
													</div>
												</div>
												<h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
											</div>
										))}
									</div>
								</>
							);
						})()}
					</div>
				</div>

				{/* District-Wise Comparison */}
				<div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
					<div className="p-6 border-b border-gray-200">
						<div className="flex items-center">
							<div className="p-2 bg-green-100 rounded-lg">
								<MapPin className="h-6 w-6 text-green-600" />
							</div>
							<div className="ml-4">
								<h3 className="text-lg font-semibold text-gray-900">District-Wise Comparison</h3>
								<p className="text-sm text-gray-600">Outputs A, B, C and overall % by district</p>
							</div>
						</div>
					</div>
					<div className="p-6">
						{(() => {
							// Group district progress data by district
							const districtMap = new Map<string, { outputs: Record<string, number>, color: string }>();
							const colors = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4"];
							let colorIndex = 0;

							districtProgress.forEach((item) => {
								if (!districtMap.has(item.District)) {
									districtMap.set(item.District, {
										outputs: {},
										color: colors[colorIndex % colors.length]
									});
									colorIndex++;
								}
								const districtData = districtMap.get(item.District)!;
								districtData.outputs[item.OutputID] = Math.round(item.Output_Progress || 0);
							});

							// Convert map to array for rendering
							const districts = Array.from(districtMap.entries()).map(([name, data]) => ({
								name,
								outputs: data.outputs,
								color: data.color
							}));

							if (districts.length === 0) {
								return (
									<div className="text-center py-12">
										<p className="text-gray-600">Loading district progress data...</p>
									</div>
								);
							}

							return (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									{districts.map((d, idx) => {
										const values = Object.values(d.outputs);
										const overall = values.length > 0
											? Math.round(values.reduce((s, v) => s + v, 0) / values.length)
											: 0;
										return (
											<div key={idx} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
												<div className="flex items-center justify-between mb-4">
													<h4 className="text-base font-semibold text-gray-900">{d.name}</h4>
													<span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: `${d.color}22`, color: d.color }}>
														Overall {overall}%
													</span>
												</div>
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
													{/* Overall donut */}
													<div className="flex items-center justify-center">
														<div className="relative w-28 h-28">
															<svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
																<circle cx="50" cy="50" r="40" stroke="#E5E7EB" strokeWidth="10" fill="none" />
																<circle
																	cx="50"
																	cy="50"
																	r="40"
																	stroke={d.color}
																	strokeWidth="10"
																	fill="none"
																	strokeDasharray={`${2 * Math.PI * 40}`}
																	strokeDashoffset={`${2 * Math.PI * 40 * (1 - overall / 100)}`}
																	style={{ strokeLinecap: 'round', transition: 'stroke-dashoffset 1s ease' }}
																/>
															</svg>
															<div className="absolute inset-0 flex items-center justify-center">
																<div className="text-center">
																	<div className="text-lg font-bold text-gray-900">{overall}%</div>
																	<div className="text-[10px] text-gray-500">Overall</div>
																</div>
															</div>
														</div>
													</div>

													{/* Outputs bars */}
													<div className="space-y-3">
														{Object.entries(d.outputs)
															.sort(([a], [b]) => a.localeCompare(b))
															.map(([key, val]) => (
															<div key={key}>
																<div className="flex items-center justify-between mb-1">
																	<span className="text-sm font-medium text-gray-700">Output {key}</span>
																	<span className="text-sm font-semibold text-gray-900">{val}%</span>
																</div>
																<div className="w-full bg-gray-200 rounded-full h-2">
																	<div
																		className="h-2 rounded-full"
																		style={{ width: `${val}%`, backgroundColor: d.color }}
																	></div>
																</div>
															</div>
														))}
												</div>
											</div>
										</div>
									);
									})}
								</div>
							);
						})()}
					</div>
				</div>

				{/* Training Report */}
				<div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
					<div className="p-6 border-b border-gray-200">
						<div className="flex items-center">
							<div className="p-2 bg-purple-100 rounded-lg">
								<Building2 className="h-6 w-6 text-purple-600" />
							</div>
							<div className="ml-4">
								<h3 className="text-lg font-semibold text-gray-900">Training Report-Sample data</h3>
								<p className="text-sm text-gray-600">District-wise trainings, male/female participants, and percentages</p>
							</div>
						</div>
					</div>
					<div className="p-6">
						{(() => {
							const data = [
								{ district: "Bannu", trainings: 24, male: 360, female: 190, color: "#3B82F6" },
								{ district: "DI Khan", trainings: 19, male: 290, female: 210, color: "#10B981" }
							];
							return (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									{data.map((d, idx) => {
										const totalParticipants = d.male + d.female;
										const malePct = Math.round((d.male / totalParticipants) * 100);
										const femalePct = 100 - malePct;
										return (
											<div key={idx} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
												<div className="flex items-center justify-between mb-4">
													<h4 className="text-base font-semibold text-gray-900">{d.district}</h4>
													<span className="text-sm text-gray-600">No. of Trainings: <span className="font-semibold text-gray-900">{d.trainings}</span></span>
												</div>
												<div className="grid grid-cols-1 gap-5">
													{/* Participants Count Bars */}
													<div>
														<p className="text-sm font-medium text-gray-700 mb-2">Participants</p>
														<div className="space-y-2">
															<div>
																<div className="flex items-center justify-between mb-1">
																	<span className="text-xs font-medium text-gray-600">Male</span>
																	<span className="text-xs font-semibold text-gray-900">{d.male}</span>
																</div>
																<div className="w-full bg-gray-200 rounded-full h-2">
																	<div className="h-2 rounded-full" style={{ width: `${(d.male / Math.max(1, totalParticipants)) * 100}%`, backgroundColor: d.color }}></div>
																</div>
															</div>
															<div>
																<div className="flex items-center justify-between mb-1">
																	<span className="text-xs font-medium text-gray-600">Female</span>
																	<span className="text-xs font-semibold text-gray-900">{d.female}</span>
																</div>
																<div className="w-full bg-gray-200 rounded-full h-2">
																	<div className="h-2 rounded-full" style={{ width: `${(d.female / Math.max(1, totalParticipants)) * 100}%`, backgroundColor: d.color }}></div>
																</div>
															</div>
														</div>
													</div>

													{/* Gender Percentage Donut */}
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
														<div className="flex items-center justify-center">
															<div className="relative w-24 h-24">
																<svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
																	<circle cx="50" cy="50" r="40" stroke="#E5E7EB" strokeWidth="10" fill="none" />
																	<circle cx="50" cy="50" r="40" stroke={d.color} strokeWidth="10" fill="none" strokeDasharray={`${2 * Math.PI * 40}`} strokeDashoffset={`${2 * Math.PI * 40 * (1 - malePct / 100)}`} style={{ strokeLinecap: 'round', transition: 'stroke-dashoffset 1s ease' }} />
																</svg>
																<div className="absolute inset-0 flex items-center justify-center">
																	<div className="text-center">
																		<div className="text-sm font-bold text-gray-900">{malePct}%</div>
																		<div className="text-[10px] text-gray-500">Male</div>
																	</div>
																</div>
															</div>
														</div>
														<div className="flex items-center justify-center">
															<div className="relative w-24 h-24">
																<svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
																	<circle cx="50" cy="50" r="40" stroke="#E5E7EB" strokeWidth="10" fill="none" />
																	<circle cx="50" cy="50" r="40" stroke={d.color} strokeWidth="10" fill="none" strokeDasharray={`${2 * Math.PI * 40}`} strokeDashoffset={`${2 * Math.PI * 40 * (1 - femalePct / 100)}`} style={{ strokeLinecap: 'round', transition: 'stroke-dashoffset 1s ease' }} />
																</svg>
																<div className="absolute inset-0 flex items-center justify-center">
																	<div className="text-center">
																		<div className="text-sm font-bold text-gray-900">{femalePct}%</div>
																		<div className="text-[10px] text-gray-500">Female</div>
																	</div>
																</div>
															</div>
														</div>
													</div>
												</div>
										</div>
									);
									})}
								</div>
							);
						})()}
					</div>
				</div>
			</div>

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

			{/* Output Weightage Section */}
			<div className="space-y-6">
				<div>
					<h2 className="text-2xl font-bold text-gray-900">Output Weightage</h2>
					<p className="text-gray-600 mt-2">Total weightage by output</p>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
				{(() => {
					// Debug: Log all output weightage data
					console.log("All Output Weightage:", outputWeightage);
					
					// Get weightage for Output A, B, C
					// Try multiple formats: 'A'/'1', 'B'/'2', 'C'/'3', or first 3 outputs
					let outputA = 0;
					let outputB = 0;
					let outputC = 0;
					
					// Try to find by OutputID matching A/1, B/2, C/3
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
					
					// If not found by ID, try to get first 3 outputs in order
					if (!foundA && outputWeightage.length > 0) {
						outputA = outputWeightage[0]?.TotalWeightage || 0;
					} else {
						outputA = foundA?.TotalWeightage || 0;
					}
					
					if (!foundB && outputWeightage.length > 1) {
						outputB = outputWeightage[1]?.TotalWeightage || 0;
					} else {
						outputB = foundB?.TotalWeightage || 0;
					}
					
					if (!foundC && outputWeightage.length > 2) {
						outputC = outputWeightage[2]?.TotalWeightage || 0;
					} else {
						outputC = foundC?.TotalWeightage || 0;
					}
					
					const total = outputA + outputB + outputC;
					
					console.log("Calculated values - A:", outputA, "B:", outputB, "C:", outputC, "Total:", total);

					// If no data found, show message
					if (outputWeightage.length === 0) {
						return (
							<div className="col-span-4 bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
								<p className="text-yellow-800">No output weightage data available</p>
							</div>
						);
					}

					return (
						<>
							<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
								<div className="flex items-center">
									<div className="p-2 bg-blue-100 rounded-lg">
										<TrendingUp className="h-6 w-6 text-blue-600" />
									</div>
									<div className="ml-4">
										<p className="text-sm font-medium text-gray-600">Total Output A</p>
										<p className="text-2xl font-bold text-gray-900">{outputA}</p>
										{process.env.NODE_ENV === 'development' && (
											<p className="text-xs text-gray-400 mt-1">ID: {outputWeightage.find(item => {
												const id = item.OutputID?.toString().toUpperCase().trim();
												return id === 'A' || id === '1' || id === 'OUTPUT A' || id === 'OUTPUTA';
											})?.OutputID || outputWeightage[0]?.OutputID || 'N/A'}</p>
										)}
									</div>
								</div>
							</div>

							<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
								<div className="flex items-center">
									<div className="p-2 bg-green-100 rounded-lg">
										<TrendingUp className="h-6 w-6 text-green-600" />
									</div>
									<div className="ml-4">
										<p className="text-sm font-medium text-gray-600">Total Output B</p>
										<p className="text-2xl font-bold text-gray-900">{outputB}</p>
										{process.env.NODE_ENV === 'development' && (
											<p className="text-xs text-gray-400 mt-1">ID: {outputWeightage.find(item => {
												const id = item.OutputID?.toString().toUpperCase().trim();
												return id === 'B' || id === '2' || id === 'OUTPUT B' || id === 'OUTPUTB';
											})?.OutputID || outputWeightage[1]?.OutputID || 'N/A'}</p>
										)}
									</div>
								</div>
							</div>

							<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
								<div className="flex items-center">
									<div className="p-2 bg-purple-100 rounded-lg">
										<TrendingUp className="h-6 w-6 text-purple-600" />
									</div>
									<div className="ml-4">
										<p className="text-sm font-medium text-gray-600">Total Output C</p>
										<p className="text-2xl font-bold text-gray-900">{outputC}</p>
										{process.env.NODE_ENV === 'development' && (
											<p className="text-xs text-gray-400 mt-1">ID: {outputWeightage.find(item => {
												const id = item.OutputID?.toString().toUpperCase().trim();
												return id === 'C' || id === '3' || id === 'OUTPUT C' || id === 'OUTPUTC';
											})?.OutputID || outputWeightage[2]?.OutputID || 'N/A'}</p>
										)}
									</div>
								</div>
							</div>

							<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
								<div className="flex items-center">
									<div className="p-2 bg-orange-100 rounded-lg">
										<TrendingUp className="h-6 w-6 text-orange-600" />
									</div>
									<div className="ml-4">
										<p className="text-sm font-medium text-gray-600">Total</p>
										<p className="text-2xl font-bold text-gray-900">{total}</p>
									</div>
								</div>
							</div>
						</>
					);
				})()}
				</div>
			</div>

			{/* Quick Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<div className="flex items-center">
						<div className="p-2 bg-blue-100 rounded-lg">
							<ImageIcon className="h-6 w-6 text-blue-600" />
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Total Pictures</p>
							<p className="text-2xl font-bold text-gray-900">{pictures.length}</p>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<div className="flex items-center">
						<div className="p-2 bg-green-100 rounded-lg">
							<Folder className="h-6 w-6 text-green-600" />
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Categories</p>
							<p className="text-2xl font-bold text-gray-900">
								{new Set(pictures.map(p => p.MainCategory)).size}
							</p>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<div className="flex items-center">
						<div className="p-2 bg-purple-100 rounded-lg">
							<Calendar className="h-6 w-6 text-purple-600" />
						</div>
						<div className="ml-4">
							<p className="text-sm font-medium text-gray-600">Recent Activity</p>
							<p className="text-2xl font-bold text-gray-900">
								{pictures.filter(p => p.EventDate).length}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}


