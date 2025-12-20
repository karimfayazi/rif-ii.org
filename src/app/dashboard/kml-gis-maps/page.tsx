'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Building2, Layers, Upload, CheckCircle2 } from 'lucide-react';

// GIS Map Component using GeoJSON files
function GeoJSONMapViewer({ shpFile, mapType }: { shpFile: string; mapType: string }) {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<any>(null);
	const [mapLoaded, setMapLoaded] = useState(false);
	const [mapError, setMapError] = useState<string | null>(null);
	const [loadingProgress, setLoadingProgress] = useState('Loading map...');

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

					const map = L.map(container, {
						center: [31.8, 70.9], // DIK area coordinates
						zoom: 10,
						zoomControl: true,
						attributionControl: true
					});

					mapInstanceRef.current = map;

					L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
						attribution: '© OpenStreetMap contributors',
						maxZoom: 19
					}).addTo(map);

					const loadGeoJSON = async () => {
						try {
							if (isMounted) setLoadingProgress('Loading map data...');
							
							// Get base filename without extension
							const baseName = shpFile.replace('.shp', '');
							
							// Load GeoJSON file directly
							const geoJsonResponse = await fetch(`/maps/Shapefiles/${baseName}.geojson`);
							
							if (!geoJsonResponse.ok) {
								throw new Error(`GeoJSON file not found. Please convert the shapefile to GeoJSON format using the converter below.`);
							}
							
							const geoJson = await geoJsonResponse.json();
							
							if (isMounted) setLoadingProgress('Rendering map...');
							renderGeoJSON(geoJson);
							
						} catch (error) {
							if (isMounted) {
								const errorMsg = error instanceof Error ? error.message : 'Unknown error';
								setMapError(
									`Failed to load map data: ${errorMsg}. ` +
									`Please use the converter below to convert this shapefile to GeoJSON format.`
								);
								setLoadingProgress('');
							}
						}
					};

					const renderGeoJSON = (geoJson: any) => {
						if (!mapInstanceRef.current) return;
							
						// Determine style based on map type
						let style: any = {
							color: '#0b4d2b',
							weight: 2,
							opacity: 0.8,
							fillColor: '#0b4d2b',
							fillOpacity: 0.2
						};

						if (mapType === 'tehsil') {
							style = {
								color: '#28a745',
								weight: 2,
								opacity: 0.8,
								fillColor: '#28a745',
								fillOpacity: 0.15
							};
						}

						const layer = L.geoJSON(geoJson, {
							style: style,
							onEachFeature: (feature: any, layer: any) => {
								if (feature.properties) {
									const props = feature.properties;
									let popupContent = '<div style="font-weight: bold; margin-bottom: 5px;">';
									
									// Try to find a name property
									const nameProps = ['NAME', 'Name', 'name', 'TEHSIL', 'TEHSIL_NAME', 'NAME_1', 'NAME_2', 'Tehsil'];
									let name = 'Feature';
									for (const prop of nameProps) {
										if (props[prop]) {
											name = props[prop];
											break;
										}
									}
									popupContent += name + '</div>';
									
									// Add other properties
									Object.keys(props).slice(0, 10).forEach(key => {
										if (!nameProps.includes(key)) {
											popupContent += `<div><strong>${key}:</strong> ${props[key]}</div>`;
										}
									});
									
									layer.bindPopup(popupContent);
								}
							}
						}).addTo(mapInstanceRef.current);

						if (layer.getBounds && layer.getBounds().isValid()) {
							mapInstanceRef.current.fitBounds(layer.getBounds(), { padding: [20, 20] });
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
								loadGeoJSON();
							} catch (e) {
								if (isMounted) {
									setMapError('Failed to initialize map');
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

		// Load Leaflet and initialize map
		const initializeMapWithLeaflet = () => {
			if (isMounted) {
				setLoadingProgress('Initializing map...');
				setTimeout(() => {
					if (isMounted) initializeMap();
				}, 100);
			}
		};

		// Small delay to ensure component is fully mounted
		initDelay = setTimeout(() => {
			// Check if Leaflet is already loaded
			if ((window as any).L) {
				initializeMapWithLeaflet();
				return;
			}

			// Check if CSS is already loaded
			const existingCSS = document.querySelector('link[href*="leaflet"]');
			if (!existingCSS) {
				linkElement = document.createElement('link');
				linkElement.rel = 'stylesheet';
				linkElement.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
				linkElement.crossOrigin = 'anonymous';
				document.head.appendChild(linkElement);
			}

			// Check if script is already loading/loaded
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
			// Clean up dynamically added scripts and links
			if (linkElement && linkElement.parentNode) {
				linkElement.parentNode.removeChild(linkElement);
			}
			if (scriptElement && scriptElement.parentNode) {
				scriptElement.parentNode.removeChild(scriptElement);
			}
		};
	}, [shpFile, mapType]);

	return (
		<div className="relative w-full overflow-hidden rounded-lg border border-gray-200">
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
	);
}

export default function KMLGISMapsPage() {
	const [converting, setConverting] = useState(false);
	const [conversionStatus, setConversionStatus] = useState<'success' | 'error' | null>(null);
	const [hasGeoJson, setHasGeoJson] = useState(false);
	const [showMap, setShowMap] = useState(false);
	const shapefileName = 'DIK-Tehsil.shp';

	// Check if GeoJSON exists
	useEffect(() => {
		checkGeoJSON();
	}, []);

	const checkGeoJSON = async () => {
		try {
			const response = await fetch('/maps/Shapefiles/DIK-Tehsil.geojson');
			if (response.ok) {
				setHasGeoJson(true);
				setShowMap(true);
			}
		} catch (error) {
			// GeoJSON doesn't exist yet
		}
	};

	const convertShapefile = async () => {
		setConverting(true);
		setConversionStatus(null);
		
		try {
			const response = await fetch('/api/maps/convert-shapefile', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ filename: shapefileName }),
			});

			const result = await response.json();

			if (result.success) {
				setConversionStatus('success');
				setHasGeoJson(true);
				setShowMap(true);
				// Clear status after 3 seconds
				setTimeout(() => {
					setConversionStatus(null);
				}, 3000);
			} else {
				setConversionStatus('error');
			}
		} catch (error) {
			setConversionStatus('error');
		} finally {
			setConverting(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-gray-900">KML/GIS Maps</h1>
				<p className="text-gray-600 mt-2">Interactive GIS maps showing DIK Tehsil boundaries</p>
			</div>

			{/* Info Banner & Converter */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<div className="flex items-start justify-between">
					<div className="flex items-start flex-1">
						<svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<div className="flex-1">
							<h3 className="text-sm font-semibold text-blue-900 mb-1">Shapefile to GeoJSON Converter</h3>
							<p className="text-sm text-blue-800 mb-3">
								For best performance, shapefiles should be converted to GeoJSON format. The page will automatically use GeoJSON versions if available.
							</p>
							{!hasGeoJson && (
								<button
									onClick={convertShapefile}
									disabled={converting}
									className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{converting ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
											Converting...
										</>
									) : (
										<>
											<Upload className="w-4 h-4 mr-2" />
											Convert DIK-Tehsil.shp to GeoJSON
										</>
									)}
								</button>
							)}
							{hasGeoJson && (
								<div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 text-sm rounded-md">
									<CheckCircle2 className="w-4 h-4 mr-2" />
									GeoJSON Available - Map Ready to View
								</div>
							)}
							{conversionStatus === 'success' && (
								<div className="mt-2 text-sm text-green-600 font-medium">
									✓ Conversion successful! Map is now available.
								</div>
							)}
							{conversionStatus === 'error' && (
								<div className="mt-2 text-sm text-red-600 font-medium">
									✗ Conversion failed. Please try again.
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Map Display */}
			{showMap && hasGeoJson ? (
				<div className="space-y-4">
					{/* Map Header */}
					<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
						<div className="flex items-center justify-between">
							<div className="flex-1">
								<div className="flex items-center gap-3 mb-2">
									<h2 className="text-2xl font-semibold text-gray-900">DIK Tehsil Boundaries</h2>
									<span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
										<svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
										</svg>
										GeoJSON Available - Fast Loading
									</span>
								</div>
								<p className="text-gray-600">Interactive map showing DIK Tehsil administrative boundaries</p>
							</div>
							<div className="inline-flex p-3 bg-green-500 rounded-lg text-white ml-4">
								<Building2 className="h-6 w-6" />
							</div>
						</div>
					</div>

					{/* Map Container */}
					<div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
						<div className="p-6">
							<GeoJSONMapViewer shpFile={shapefileName} mapType="tehsil" />
						</div>
					</div>

					{/* Map Legend */}
					<div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
						<h3 className="text-sm font-semibold text-gray-700 mb-3">Map Legend</h3>
						<div className="flex items-center space-x-2">
							<div className="w-4 h-4 border-2 border-green-500 bg-green-500/20 rounded"></div>
							<span className="text-xs text-gray-600">DIK Tehsil Boundaries</span>
						</div>
					</div>
				</div>
			) : (
				<div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
					<Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
					<h3 className="text-lg font-semibold text-gray-900 mb-2">Map Not Available</h3>
					<p className="text-gray-600 mb-4">
						Please convert the shapefile to GeoJSON format using the converter above to view the map.
					</p>
					{!hasGeoJson && (
						<button
							onClick={convertShapefile}
							disabled={converting}
							className="inline-flex items-center px-6 py-3 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{converting ? (
								<>
									<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
									Converting...
								</>
							) : (
								<>
									<Upload className="w-5 h-5 mr-2" />
									Convert Shapefile
								</>
							)}
						</button>
					)}
				</div>
			)}
		</div>
	);
}
