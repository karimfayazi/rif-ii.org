'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Layers, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, Info, Globe, Satellite } from 'lucide-react';

type LayerInfo = {
	name: string;
	features: any[];
	featureCount: number;
};

// GIS Map Component using Leaflet with layer support
function GISMapViewer({ layers, geoJsonData }: { layers: LayerInfo[]; geoJsonData: any }) {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<any>(null);
	const layerRefsRef = useRef<{ [key: string]: any }>({});
	const [mapLoaded, setMapLoaded] = useState(false);
	const [mapError, setMapError] = useState<string | null>(null);
	const [loadingProgress, setLoadingProgress] = useState('Loading map...');
	const [activeLayers, setActiveLayers] = useState<{ [key: string]: boolean }>({});
	const [layerBounds, setLayerBounds] = useState<{ [key: string]: any }>({});
	const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
	const baseLayerRef = useRef<any>(null);

	// Initialize all layers as active by default
	useEffect(() => {
		const initialActive: { [key: string]: boolean } = {};
		layers.forEach((layer) => {
			initialActive[layer.name] = true;
		});
		setActiveLayers(initialActive);
	}, [layers]);

	useEffect(() => {
		if (!mapContainerRef.current || !geoJsonData) return;

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

					// Initialize map centered on Pakistan/KPK area
					const map = L.map(container, {
						center: [34.0, 71.5],
						zoom: 7,
						zoomControl: true,
						attributionControl: true
					});

					mapInstanceRef.current = map;

					// Add base tile layer (standard or satellite)
					const updateBaseLayer = (type: 'standard' | 'satellite') => {
						if (baseLayerRef.current && mapInstanceRef.current) {
							mapInstanceRef.current.removeLayer(baseLayerRef.current);
						}

						if (type === 'satellite') {
							// Esri World Imagery (Satellite)
							baseLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
								attribution: '© Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
								maxZoom: 19
							});
						} else {
							// OpenStreetMap (Standard)
							baseLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
								attribution: '© OpenStreetMap contributors',
								maxZoom: 19
							});
						}

						if (mapInstanceRef.current) {
							baseLayerRef.current.addTo(mapInstanceRef.current);
						}
					};

					// Initialize with standard map
					updateBaseLayer(mapType);

					const renderLayers = () => {
						if (!mapInstanceRef.current || !layers) return;

						// Clear existing layers
						Object.values(layerRefsRef.current).forEach((layer: any) => {
							if (layer && mapInstanceRef.current) {
								mapInstanceRef.current.removeLayer(layer);
							}
						});
						layerRefsRef.current = {};
						const bounds: any[] = [];

						// Render each layer
						layers.forEach((layerInfo, index) => {
							if (!activeLayers[layerInfo.name]) return;

							// Create a feature collection for this layer
							const layerGeoJson = {
								type: "FeatureCollection",
								features: layerInfo.features
							};

							// Different colors for different layers
							const colors = [
								'#0b4d2b', '#2563eb', '#dc2626', '#16a34a', 
								'#ea580c', '#9333ea', '#0891b2', '#be123c'
							];
							const color = colors[index % colors.length];

							const style: any = {
								color: color,
								weight: 2,
								opacity: 0.8,
								fillColor: color,
								fillOpacity: 0.2
							};

							// Style points differently
							const pointToLayer = (feature: any, latlng: any) => {
								if (feature.geometry.type === 'Point') {
									return L.circleMarker(latlng, {
										radius: 6,
										fillColor: color,
										color: color,
										weight: 2,
										opacity: 0.8,
										fillOpacity: 0.6
									});
								}
								return null;
							};

							const layer = L.geoJSON(layerGeoJson, {
								style: style,
								pointToLayer: pointToLayer,
								onEachFeature: (feature: any, layer: any) => {
									if (feature.properties) {
										const props = feature.properties;
										let popupContent = '<div style="font-weight: bold; margin-bottom: 5px; font-size: 14px;">';
										
										// Add layer name
										popupContent += `<div style="color: ${color}; margin-bottom: 5px;">${layerInfo.name}</div>`;
										
										// Add feature name
										if (props.name) {
											popupContent += `<div style="font-size: 13px; margin-bottom: 8px;">${props.name}</div>`;
										}
										
										// Add description
										if (props.description) {
											popupContent += `<div style="margin-bottom: 5px; font-size: 12px; color: #666;">${props.description}</div>`;
										}
										
										// Add other properties
										Object.keys(props).forEach(key => {
											if (key !== 'name' && key !== 'description') {
												popupContent += `<div style="margin-top: 3px; font-size: 11px;"><strong>${key}:</strong> ${props[key]}</div>`;
											}
										});
										
										popupContent += '</div>';
										layer.bindPopup(popupContent);
									}
								}
							}).addTo(mapInstanceRef.current);

							layerRefsRef.current[layerInfo.name] = layer;

							// Store bounds for this layer
							if (layer.getBounds && layer.getBounds().isValid()) {
								bounds.push(layer.getBounds());
								setLayerBounds((prev) => ({
									...prev,
									[layerInfo.name]: layer.getBounds()
								}));
							}
						});

						// Fit map to show all active layers
						if (bounds.length > 0) {
							const group = new (L as any).LatLngBounds(bounds);
							mapInstanceRef.current.fitBounds(group, { padding: [20, 20] });
						}

						if (isMounted) {
							setMapLoaded(true);
							setLoadingProgress('');
						}
					};

					map.whenReady(() => {
						if (!isMounted) return;
						setTimeout(() => {
							if (!isMounted) return;
							try {
								if (mapInstanceRef.current) {
									mapInstanceRef.current.invalidateSize();
								}
								if (isMounted) setLoadingProgress('Rendering map layers...');
								renderLayers();
							} catch (e) {
								if (isMounted) {
									setMapError('Failed to render map');
									setLoadingProgress('');
								}
							}
						}, 200);
					});
				} catch (error) {
					if (isMounted) {
						setMapError('Failed to initialize map: ' + (error instanceof Error ? error.message : 'Unknown error'));
						setLoadingProgress('');
					}
				}
			}, 300);
		};

		const initializeMapWithLeaflet = () => {
			if (isMounted) {
				setLoadingProgress('Initializing map...');
				setTimeout(() => {
					if (isMounted) initializeMap();
				}, 100);
			}
		};

		initDelay = setTimeout(() => {
			if ((window as any).L) {
				initializeMapWithLeaflet();
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
						initializeMapWithLeaflet();
					}
				}, 100);
				
				timeoutId = setTimeout(() => {
					if (checkInterval) clearInterval(checkInterval);
					if (!(window as any).L && isMounted) {
						setMapError('Map library is taking too long to load');
					}
				}, 8000);
			} else {
				scriptElement = document.createElement('script');
				scriptElement.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
				scriptElement.crossOrigin = 'anonymous';
				scriptElement.async = true;
				scriptElement.onload = () => {
					if (isMounted) {
						initializeMapWithLeaflet();
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
					// Silently handle cleanup errors
				}
				mapInstanceRef.current = null;
			}
			if (linkElement && linkElement.parentNode) {
				linkElement.parentNode.removeChild(linkElement);
			}
			if (scriptElement && scriptElement.parentNode) {
				scriptElement.parentNode.removeChild(scriptElement);
			}
		};
	}, [geoJsonData, layers, activeLayers]);

	// Re-render layers when activeLayers changes
	useEffect(() => {
		if (mapInstanceRef.current && mapLoaded) {
			// Re-render all layers
			const renderLayers = () => {
				if (!mapInstanceRef.current || !layers) return;

				// Clear existing layers
				Object.values(layerRefsRef.current).forEach((layer: any) => {
					if (layer && mapInstanceRef.current) {
						mapInstanceRef.current.removeLayer(layer);
					}
				});
				layerRefsRef.current = {};
				const bounds: any[] = [];

				// Render each layer
				layers.forEach((layerInfo, index) => {
					if (!activeLayers[layerInfo.name]) return;

					const layerGeoJson = {
						type: "FeatureCollection",
						features: layerInfo.features
					};

					const colors = [
						'#0b4d2b', '#2563eb', '#dc2626', '#16a34a', 
						'#ea580c', '#9333ea', '#0891b2', '#be123c'
					];
					const color = colors[index % colors.length];

					const style: any = {
						color: color,
						weight: 2,
						opacity: 0.8,
						fillColor: color,
						fillOpacity: 0.2
					};

					const pointToLayer = (feature: any, latlng: any) => {
						if (feature.geometry.type === 'Point') {
							return (window as any).L.circleMarker(latlng, {
								radius: 6,
								fillColor: color,
								color: color,
								weight: 2,
								opacity: 0.8,
								fillOpacity: 0.6
							});
						}
						return null;
					};

					const layer = (window as any).L.geoJSON(layerGeoJson, {
						style: style,
						pointToLayer: pointToLayer,
						onEachFeature: (feature: any, layer: any) => {
							if (feature.properties) {
								const props = feature.properties;
								let popupContent = `<div style="font-weight: bold; margin-bottom: 5px; font-size: 14px;"><div style="color: ${color}; margin-bottom: 5px;">${layerInfo.name}</div>`;
								if (props.name) {
									popupContent += `<div style="font-size: 13px; margin-bottom: 8px;">${props.name}</div>`;
								}
								if (props.description) {
									popupContent += `<div style="margin-bottom: 5px; font-size: 12px; color: #666;">${props.description}</div>`;
								}
								Object.keys(props).forEach(key => {
									if (key !== 'name' && key !== 'description') {
										popupContent += `<div style="margin-top: 3px; font-size: 11px;"><strong>${key}:</strong> ${props[key]}</div>`;
									}
								});
								popupContent += '</div>';
								layer.bindPopup(popupContent);
							}
						}
					}).addTo(mapInstanceRef.current);

					layerRefsRef.current[layerInfo.name] = layer;

					if (layer.getBounds && layer.getBounds().isValid()) {
						bounds.push(layer.getBounds());
					}
				});

				if (bounds.length > 0) {
					const group = new (window as any).L.LatLngBounds(bounds);
					mapInstanceRef.current.fitBounds(group, { padding: [20, 20] });
				}
			};

			renderLayers();
		}
	}, [activeLayers, layers, mapLoaded]);

	// Update base layer when map type changes
	useEffect(() => {
		if (mapInstanceRef.current && mapLoaded && baseLayerRef.current) {
			const L = (window as any).L;
			if (!L) return;

			// Remove current base layer
			if (baseLayerRef.current) {
				mapInstanceRef.current.removeLayer(baseLayerRef.current);
			}

			// Add new base layer
			if (mapType === 'satellite') {
				baseLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
					attribution: '© Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
					maxZoom: 19
				});
			} else {
				baseLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution: '© OpenStreetMap contributors',
					maxZoom: 19
				});
			}

			baseLayerRef.current.addTo(mapInstanceRef.current);
		}
	}, [mapType, mapLoaded]);

	const toggleLayer = (layerName: string) => {
		setActiveLayers((prev) => ({
			...prev,
			[layerName]: !prev[layerName]
		}));
	};

	const selectAllLayers = () => {
		const allActive: { [key: string]: boolean } = {};
		layers.forEach((layer) => {
			allActive[layer.name] = true;
		});
		setActiveLayers(allActive);
	};

	const deselectAllLayers = () => {
		const allInactive: { [key: string]: boolean } = {};
		layers.forEach((layer) => {
			allInactive[layer.name] = false;
		});
		setActiveLayers(allInactive);
	};

	const colors = [
		'#0b4d2b', '#2563eb', '#dc2626', '#16a34a', 
		'#ea580c', '#9333ea', '#0891b2', '#be123c',
		'#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'
	];

	return (
		<div className="relative w-full overflow-hidden rounded-lg border border-gray-200">
			<div className="flex flex-col lg:flex-row">
				{/* Map Container */}
				<div className="flex-1 relative">
					{/* Map Type Toggle */}
					<div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 p-1 flex gap-1">
						<button
							onClick={() => setMapType('standard')}
							className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
								mapType === 'standard'
									? 'bg-[#0b4d2b] text-white'
									: 'bg-white text-gray-700 hover:bg-gray-100'
							}`}
							title="Standard Map"
						>
							<Globe className="w-4 h-4" />
							Standard
						</button>
						<button
							onClick={() => setMapType('satellite')}
							className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
								mapType === 'satellite'
									? 'bg-[#0b4d2b] text-white'
									: 'bg-white text-gray-700 hover:bg-gray-100'
							}`}
							title="Satellite Map"
						>
							<Satellite className="w-4 h-4" />
							Satellite
						</button>
					</div>
					<div 
						ref={mapContainerRef}
						className="w-full bg-gray-100"
						style={{ 
							height: '700px', 
							minHeight: '700px', 
							position: 'relative',
							zIndex: 1
						}}
					>
						{!mapLoaded && !mapError && (
							<div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20 pointer-events-none">
								<div className="text-center">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b4d2b] mx-auto mb-2"></div>
									<p className="text-sm text-gray-600">{loadingProgress || 'Loading map...'}</p>
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

				{/* Layer Control Panel */}
				<div className="w-full lg:w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto max-h-[700px]">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-gray-900 flex items-center">
							<Layers className="w-5 h-5 mr-2 text-[#0b4d2b]" />
							Map Layers ({layers.length})
						</h3>
					</div>
					<div className="flex gap-2 mb-4">
						<button
							onClick={selectAllLayers}
							className="flex-1 px-3 py-1.5 text-xs bg-[#0b4d2b] text-white rounded hover:bg-[#0a3d24] transition-colors"
						>
							Select All
						</button>
						<button
							onClick={deselectAllLayers}
							className="flex-1 px-3 py-1.5 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
						>
							Deselect All
						</button>
					</div>
					<div className="space-y-2">
						{layers.map((layer, index) => (
							<div
								key={layer.name}
								className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
							>
								<div className="flex items-start">
									<input
										type="checkbox"
										id={`layer-${index}`}
										checked={activeLayers[layer.name] || false}
										onChange={() => toggleLayer(layer.name)}
										className="mt-1 h-4 w-4 text-[#0b4d2b] border-gray-300 rounded focus:ring-[#0b4d2b] focus:ring-2 cursor-pointer flex-shrink-0"
									/>
									<label
										htmlFor={`layer-${index}`}
										className="flex-1 ml-3 cursor-pointer"
									>
										<div className="flex items-center justify-between mb-1">
											<div className="flex items-center flex-1 min-w-0">
												<div
													className="w-3 h-3 rounded mr-2 flex-shrink-0"
													style={{ backgroundColor: colors[index % colors.length] }}
												></div>
												<span className="text-sm font-medium text-gray-900 truncate">
													{layer.name}
												</span>
											</div>
										</div>
										<div className="flex items-center text-xs text-gray-500 ml-5">
											<Info className="w-3 h-3 mr-1" />
											{layer.featureCount} feature{layer.featureCount !== 1 ? 's' : ''}
										</div>
									</label>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

export default function KMLGISMapsPage() {
	const [layers, setLayers] = useState<LayerInfo[]>([]);
	const [geoJsonData, setGeoJsonData] = useState<any>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Fetch KMZ layers and additional shapefile layers on component mount
	useEffect(() => {
		loadAllLayers();
	}, []);

	const loadAdditionalLayers = async (): Promise<LayerInfo[]> => {
		const additionalLayers: LayerInfo[] = [];

		// Load DIKhanDistrict
		try {
			const dikDistrictResponse = await fetch('/maps/Shapefiles/DIKhanDistrict.geojson');
			if (dikDistrictResponse.ok) {
				const dikDistrictData = await dikDistrictResponse.json();
				if (dikDistrictData.features && dikDistrictData.features.length > 0) {
					additionalLayers.push({
						name: 'DIKhanDistrict',
						features: dikDistrictData.features,
						featureCount: dikDistrictData.features.length
					});
				}
			}
		} catch (err) {
			console.warn('Failed to load DIKhanDistrict:', err);
		}

		// Load DIKhan_Tehsil
		try {
			const dikTehsilResponse = await fetch('/maps/Shapefiles/DIKhan_Tehsil.geojson');
			if (dikTehsilResponse.ok) {
				const dikTehsilData = await dikTehsilResponse.json();
				if (dikTehsilData.features && dikTehsilData.features.length > 0) {
					additionalLayers.push({
						name: 'DIKhan_Tehsil',
						features: dikTehsilData.features,
						featureCount: dikTehsilData.features.length
					});
				}
			}
		} catch (err) {
			console.warn('Failed to load DIKhan_Tehsil:', err);
		}

		return additionalLayers;
	};

	const loadAllLayers = async () => {
		setLoading(true);
		setError(null);
		try {
			// Load KMZ layers
			const kmzResponse = await fetch('/api/maps/kmz-layers');
			const kmzResult = await kmzResponse.json();

			let allLayers: LayerInfo[] = [];
			let combinedGeoJson: any = { type: "FeatureCollection", features: [] };

			if (kmzResult.success) {
				allLayers = [...(kmzResult.layers || [])];
				combinedGeoJson = kmzResult.geoJson || combinedGeoJson;
			} else {
				setError(kmzResult.message || 'Failed to load KMZ file');
			}

			// Load additional shapefile layers
			const additionalLayers = await loadAdditionalLayers();
			allLayers = [...additionalLayers, ...allLayers];

			// Combine features from additional layers
			additionalLayers.forEach(layer => {
				combinedGeoJson.features = [...combinedGeoJson.features, ...layer.features];
			});

			setLayers(allLayers);
			setGeoJsonData(combinedGeoJson);
		} catch (err) {
			setError('Error loading layers: ' + (err instanceof Error ? err.message : 'Unknown error'));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-gray-900">KML/GIS Maps</h1>
				<p className="text-gray-600 mt-2">Interactive online GIS map displaying all layers from KMZ file (Paniala Data.kmz)</p>
			</div>

			{/* Error Banner */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
					<AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
					<div className="flex-1">
						<h3 className="text-sm font-semibold text-red-900 mb-1">Error</h3>
						<p className="text-sm text-red-800">{error}</p>
						<button
							onClick={loadAllLayers}
							className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
						>
							Retry
						</button>
					</div>
					<button
						onClick={() => setError(null)}
						className="text-red-600 hover:text-red-800"
					>
						×
					</button>
				</div>
			)}

			{/* Loading State */}
			{loading && (
				<div className="bg-white rounded-lg border border-gray-200 p-12">
					<div className="flex items-center justify-center">
						<Loader2 className="w-8 h-8 animate-spin text-[#0b4d2b] mr-3" />
						<p className="text-gray-600">Loading KMZ file and parsing layers...</p>
					</div>
				</div>
			)}

			{/* Map Container */}
			{!loading && geoJsonData && layers.length > 0 && (
				<div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
					<div className="p-6 border-b border-gray-200 bg-gray-50">
						<div className="flex items-center justify-between">
							<div>
								<h2 className="text-xl font-semibold text-gray-900">KMZ Map Viewer</h2>
								<p className="text-sm text-gray-600 mt-1">
									Total: {layers.length} layer{layers.length !== 1 ? 's' : ''} • {geoJsonData.features.length} feature{geoJsonData.features.length !== 1 ? 's' : ''}
								</p>
							</div>
							<button
								onClick={loadAllLayers}
								className="px-4 py-2 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors text-sm flex items-center"
							>
								<Loader2 className="w-4 h-4 mr-2" />
								Refresh
							</button>
						</div>
					</div>
					<div className="p-6">
						<GISMapViewer layers={layers} geoJsonData={geoJsonData} />
					</div>
				</div>
			)}

			{/* Empty State */}
			{!loading && !error && layers.length === 0 && (
				<div className="bg-white rounded-lg border border-gray-200 p-12">
					<div className="text-center">
						<AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
						<p className="text-gray-600">No layers found in KMZ file</p>
						<p className="text-sm text-gray-500 mt-2">
							File: D:\PERSONAL\AHT GROUP\GIS-Map\6-Mapping Workshop Data\6-Mapping Workshop Data\Mapping Workshop Field Verification\kmz\DIK\Paniala Data.kmz
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
