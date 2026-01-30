'use client';

import { useEffect, useState, useRef } from 'react';
import { MapPin, Building2, Layers, Droplet, Trash2, ChevronDown, Maximize, Minimize } from 'lucide-react';

type MapType = {
	id: string;
	name: string;
	type: 'boundary' | 'water' | 'sw' | 'projectarea' | 'district' | 'tehsil';
	icon: React.ComponentType<{ className?: string }>;
	color: string;
	file: string;
	filePath?: string; // Optional custom file path for layers not in DIK/Paharpur folder
};

// Paniala Tehsil Maps
const panialaMaps: MapType[] = [
	{ id: 'paniala-boundary', name: 'NC Boundary', type: 'boundary', icon: MapPin, color: 'bg-blue-500', file: 'paniala-boundary.geojson', filePath: '/maps/testing-gis/paniala-boundary.geojson' },
	{ id: 'paniala-water', name: 'Water Infrastructure', type: 'water', icon: Droplet, color: 'bg-cyan-500', file: 'paniala-water.geojson', filePath: '/maps/testing-gis/paniala-water.geojson' },
	{ id: 'paniala-sw', name: 'Solid Waste', type: 'sw', icon: Trash2, color: 'bg-red-500', file: 'paniala-sw.geojson', filePath: '/maps/testing-gis/paniala-sw.geojson' },
];

// Additional Layers (like KPK Districts)
const additionalLayers: MapType[] = [
	{ id: 'kpk-districts', name: 'KPK Districts', type: 'district', icon: Layers, color: 'bg-purple-500', file: 'kp-districts.geojson', filePath: '/maps/testing-gis/kp-districts.geojson' },
	{ id: 'dik-tehsil', name: 'DIK Tehsil', type: 'tehsil', icon: Building2, color: 'bg-green-500', file: 'dik-tehsil.geojson', filePath: '/maps/testing-gis/dik-tehsil.geojson' },
];

// Multi-layer GIS Map Component
function MultiLayerGISMapViewer({ maps, additionalMaps, activeLayers, onLayerToggle, baseLayer }: { 
	maps: MapType[]; 
	additionalMaps?: MapType[];
	activeLayers: { [key: string]: boolean };
	onLayerToggle: (mapId: string) => void;
	baseLayer: 'street' | 'satellite';
}) {
	const allMaps = useRef<MapType[]>([...maps, ...(additionalMaps || [])]);
	
	// Update allMaps when props change
	useEffect(() => {
		allMaps.current = [...maps, ...(additionalMaps || [])];
	}, [maps, additionalMaps]);
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapWrapperRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<any>(null);
	const layerRefsRef = useRef<{ [key: string]: any }>({});
	const baseLayerRefsRef = useRef<{ street?: any; satellite?: any }>({});
	const [mapLoaded, setMapLoaded] = useState(false);
	const [mapError, setMapError] = useState<string | null>(null);
	const [isFullscreen, setIsFullscreen] = useState(false);

	// Toggle fullscreen
	const toggleFullscreen = async () => {
		if (!mapWrapperRef.current) return;
		
		try {
			if (!isFullscreen) {
				// Enter fullscreen
				await mapWrapperRef.current.requestFullscreen();
			} else {
				// Exit fullscreen
				if (document.fullscreenElement) {
					await document.exitFullscreen();
				}
			}
		} catch (error) {
			console.error('Fullscreen error:', error);
		}
	};

	// Listen to fullscreen changes
	useEffect(() => {
		const handleFullscreenChange = () => {
			const isCurrentlyFullscreen = !!document.fullscreenElement;
			setIsFullscreen(isCurrentlyFullscreen);
			
			// Trigger map resize after a short delay to ensure layout is updated
			if (mapInstanceRef.current) {
				setTimeout(() => {
					mapInstanceRef.current.invalidateSize();
				}, 150);
			}
		};
		
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		
		return () => {
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
		};
	}, []);

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

					// Check if container already has a map instance
					if ((container as any)._leaflet_id) {
						console.warn('Map container already initialized, skipping...');
						return;
					}

					delete (L.Icon.Default.prototype as any)._getIconUrl;
					L.Icon.Default.mergeOptions({
						iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
						iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
						shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
					});

					// Initialize map
					const map = L.map(container, {
						center: [32.0, 70.5], // Approximate center for Paniala area (Bannu district)
						zoom: 11,
						zoomControl: true,
						attributionControl: true
					});

					mapInstanceRef.current = map;

					// Create base layers
					const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
						attribution: '© OpenStreetMap contributors',
						maxZoom: 19
					});

					const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
						attribution: '© Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
						maxZoom: 19
					});

					// Store base layer references
					baseLayerRefsRef.current.street = streetLayer;
					baseLayerRefsRef.current.satellite = satelliteLayer;

					// Add default base layer
					if (baseLayer === 'satellite') {
						satelliteLayer.addTo(map);
					} else {
						streetLayer.addTo(map);
					}

					// Function to load a GeoJSON layer
					const loadLayer = async (mapItem: MapType) => {
						try {
							// Use custom filePath if provided, otherwise use default path for Paniala (files are in /maps/Bannu/)
							const filePath = mapItem.filePath || `/maps/Bannu/${mapItem.file}`;
							// Add cache-busting version parameter for testing-gis layers
							const cacheBuster = filePath.includes('/testing-gis/') ? '?v=20260127' : '';
							const fullPath = `${filePath}${cacheBuster}`;
							console.log(`Loading layer: ${mapItem.name} from ${fullPath}`);
							const response = await fetch(fullPath, { cache: 'no-store' });
							if (!response.ok) {
								console.error(`Failed to load ${mapItem.name} from ${fullPath}:`, response.status, response.statusText);
								return;
							}
							
							const geoJsonData = await response.json();
							
							// Determine style based on map type
							let style: any = {
								color: '#0b4d2b',
								weight: 3,
								opacity: 0.8,
								fillColor: '#0b4d2b',
								fillOpacity: 0.2
							};

							if (mapItem.type === 'water') {
								style = {
									color: '#007bff',
									weight: 2,
									opacity: 0.8,
									fillColor: '#007bff',
									fillOpacity: 0.15
								};
							} else if (mapItem.type === 'sw') {
								style = {
									color: '#dc3545',
									weight: 2,
									opacity: 0.8,
									fillColor: '#dc3545',
									fillOpacity: 0.15
								};
							} else if (mapItem.type === 'district') {
								style = {
									color: '#1e40af',
									weight: 2,
									opacity: 0.8,
									fillColor: '#3b82f6',
									fillOpacity: 0.2
								};
							} else if (mapItem.type === 'tehsil') {
								style = {
									color: '#28a745',
									weight: 2,
									opacity: 0.8,
									fillColor: '#28a745',
									fillOpacity: 0.15
								};
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
										
										// Handle KPK Districts properties
										if (mapItem.type === 'district' && (props.ADM2_EN || props.ADM2_PCODE)) {
											popupContent += props.ADM2_EN || props.ADM2_PCODE || 'District';
											popupContent += '</div>';
											popupContent += '<div style="font-size: 12px; line-height: 1.4;">';
											if (props.ADM2_EN) popupContent += `<div><strong>Name:</strong> ${props.ADM2_EN}</div>`;
											if (props.ADM2_PCODE) popupContent += `<div><strong>Code:</strong> ${props.ADM2_PCODE}</div>`;
											if (props.ADM1_EN) popupContent += `<div><strong>Province:</strong> ${props.ADM1_EN}</div>`;
										} else if (mapItem.type === 'tehsil') {
											// Handle Tehsil properties
											const nameProps = ['NAME', 'Name', 'name', 'TEHSIL', 'NAME_1', 'NAME_2'];
											let name = 'Tehsil';
											for (const prop of nameProps) {
												if (props[prop]) {
													name = props[prop];
													break;
												}
											}
											popupContent += name;
											popupContent += '</div>';
											popupContent += '<div style="font-size: 12px; line-height: 1.4;">';
											// Add other properties
											Object.keys(props).slice(0, 5).forEach(key => {
												if (!nameProps.includes(key)) {
													popupContent += `<div><strong>${key}:</strong> ${props[key]}</div>`;
												}
											});
										} else {
											// Handle Paharpur maps properties
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

							// Store layer reference
							layerRefsRef.current[mapItem.id] = layer;

							// Add to map if active
							if (activeLayers[mapItem.id]) {
								layer.addTo(map);
							}

						} catch (error) {
							console.error(`Error loading ${mapItem.name}:`, error);
						}
					};

					// Load all layers and fit bounds when done
					Promise.all(allMaps.current.map(mapItem => loadLayer(mapItem))).then(() => {
						// Fit bounds to all visible layers after all are loaded
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
			// Clear layer refs
			layerRefsRef.current = {};
			baseLayerRefsRef.current = {};
			if (scriptElement && scriptElement.parentNode) {
				scriptElement.parentNode.removeChild(scriptElement);
			}
		};
	}, []); // Remove baseLayer from dependencies - map should only initialize once

	// Handle base layer changes
	useEffect(() => {
		if (!mapInstanceRef.current) return;

		const streetLayer = baseLayerRefsRef.current.street;
		const satelliteLayer = baseLayerRefsRef.current.satellite;

		if (!streetLayer || !satelliteLayer) return;

		if (baseLayer === 'satellite') {
			if (mapInstanceRef.current.hasLayer(streetLayer)) {
				mapInstanceRef.current.removeLayer(streetLayer);
			}
			if (!mapInstanceRef.current.hasLayer(satelliteLayer)) {
				satelliteLayer.addTo(mapInstanceRef.current);
			}
		} else {
			if (mapInstanceRef.current.hasLayer(satelliteLayer)) {
				mapInstanceRef.current.removeLayer(satelliteLayer);
			}
			if (!mapInstanceRef.current.hasLayer(streetLayer)) {
				streetLayer.addTo(mapInstanceRef.current);
			}
		}
	}, [baseLayer]);

	// Handle layer visibility changes
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

		// Fit bounds to visible layers
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
		<div 
			ref={mapWrapperRef}
			className={`relative w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200 ${isFullscreen ? 'fixed inset-0 z-[9999] h-screen' : 'h-[600px]'}`}
		>
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
			
			{/* Fullscreen Button Overlay */}
			<button
				onClick={toggleFullscreen}
				className="absolute top-4 right-4 z-[1001] bg-white border border-gray-300 rounded-lg px-4 py-2 shadow-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700"
				title={isFullscreen ? 'Exit Fullscreen (ESC)' : 'Enter Fullscreen'}
			>
				{isFullscreen ? (
					<>
						<Minimize className="h-4 w-4" />
						<span>Exit Full Screen</span>
					</>
				) : (
					<>
						<Maximize className="h-4 w-4" />
						<span>Full Screen</span>
					</>
				)}
			</button>
		</div>
	);
}

// Main DIK Paniala GIS Map Section Component
export default function DIKPanialaGISMapSection() {
	const [gisMapActiveLayers, setGisMapActiveLayers] = useState<{ [key: string]: boolean }>({
		'paniala-boundary': true,
		'paniala-water': true,
		'paniala-sw': true,
		'kpk-districts': false,
		'dik-tehsil': false,
	});
	
	const [gisMapBaseLayer, setGisMapBaseLayer] = useState<'street' | 'satellite'>('satellite');
	const [gisMapDropdownOpen, setGisMapDropdownOpen] = useState(false);
	const gisMapDropdownRef = useRef<HTMLDivElement>(null);

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (gisMapDropdownRef.current && !gisMapDropdownRef.current.contains(event.target as Node)) {
				setGisMapDropdownOpen(false);
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const toggleGisMapLayer = (mapId: string) => {
		setGisMapActiveLayers(prev => ({
			...prev,
			[mapId]: !prev[mapId]
		}));
	};

	// Get all layers in order: KPK Districts, DIK Tehsil, NC Boundary, Water Infrastructure, Solid Waste
	const allGisMapLayers = [
		...additionalLayers,
		...panialaMaps
	];

	// Count active layers
	const gisMapActiveCount = Object.values(gisMapActiveLayers).filter(Boolean).length;

	return (
		<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
			<div className="p-6 border-b border-gray-200">
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1 space-y-1">
						<h2 className="text-2xl font-semibold text-gray-900 leading-snug tracking-tight">DIK District - Tehsil Wise - Paniala Maps</h2>
						<p className="text-sm text-gray-600 leading-relaxed">Interactive GIS map with multiple layers</p>
					</div>
					{/* Layer Controls - Dropdown */}
					<div className="flex-shrink-0">
						<div className="relative" ref={gisMapDropdownRef}>
							<button
								type="button"
								onClick={() => setGisMapDropdownOpen(!gisMapDropdownOpen)}
								className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0b4d2b] focus:border-[#0b4d2b] transition-colors min-w-[200px]"
							>
								<div className="flex items-center space-x-2">
									<Layers className="h-4 w-4 text-[#0b4d2b]" />
									<span className="text-sm font-medium text-gray-700">
										{gisMapActiveCount > 0 ? `${gisMapActiveCount} layer${gisMapActiveCount > 1 ? 's' : ''}` : 'Map Layers'}
									</span>
								</div>
								<ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${gisMapDropdownOpen ? 'rotate-180' : ''}`} />
							</button>

							{gisMapDropdownOpen && (
								<div className="absolute right-0 z-50 w-80 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
									<div className="p-2">
										{allGisMapLayers.map((map) => {
											const Icon = map.icon;
											return (
												<label
													key={map.id}
													className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
												>
													<input
														type="checkbox"
														checked={gisMapActiveLayers[map.id] || false}
														onChange={() => toggleGisMapLayer(map.id)}
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
				</div>
			</div>
			<div className="p-6">
				<MultiLayerGISMapViewer 
					maps={panialaMaps} 
					additionalMaps={additionalLayers}
					activeLayers={gisMapActiveLayers}
					onLayerToggle={toggleGisMapLayer}
					baseLayer={gisMapBaseLayer}
				/>
			</div>
		</div>
	);
}
