'use client';

import { useEffect, useState, useRef } from 'react';
import { 
	ArrowLeft, Upload, Layers, Search, MapPin, Eye, EyeOff, 
	Target, Sliders, Map as MapIcon, ChevronDown, ChevronRight,
	Trash2, X, AlertCircle, CheckCircle, Loader2, GripVertical,
	ZoomIn, Filter
} from 'lucide-react';
import Link from 'next/link';

// Type definitions
interface LayerData {
	id: string;
	name: string;
	type: 'polygon' | 'line' | 'point' | 'mixed';
	geojson: any;
	bounds: [number, number, number, number];
	defaultVisible: boolean;
	visible: boolean;
	opacity: number;
	order: number;
	style?: {
		color?: string;
		fillColor?: string;
		fillOpacity?: number;
		weight?: number;
	};
}

interface ParsedKMZ {
	layers: LayerData[];
	sourceName: string;
}

export default function GoogleEarthProViewerPage() {
	// State management
	const [layers, setLayers] = useState<LayerData[]>([]);
	const [sourceName, setSourceName] = useState<string>('');
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string>('');
	const [uploadSuccess, setUploadSuccess] = useState(false);
	const [layerSearch, setLayerSearch] = useState('');
	const [selectedTab, setSelectedTab] = useState<'layers' | 'filters'>('layers');
	const [baseMap, setBaseMap] = useState<'street' | 'satellite' | 'terrain'>('satellite');
	const [mapLoaded, setMapLoaded] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());
	const [tooltip, setTooltip] = useState<{
		visible: boolean;
		x: number;
		y: number;
		title: string;
		props: Record<string, any>;
	}>({ visible: false, x: 0, y: 0, title: '', props: {} });
	
	// Refs
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<any>(null);
	const layerRefsRef = useRef<{ [key: string]: any }>({});
	const baseLayerRefsRef = useRef<{ [key: string]: any }>({});
	const fileInputRef = useRef<HTMLInputElement>(null);
	const rafIdRef = useRef<number | null>(null);
	const pendingTooltipRef = useRef<{ x: number; y: number } | null>(null);
	
	// Handle file upload
	const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;
		
		// Validate file extension
		const fileName = file.name.toLowerCase();
		if (!fileName.endsWith('.kmz') && !fileName.endsWith('.kml')) {
			setUploadError('Please select a KMZ or KML file');
			if (fileInputRef.current) fileInputRef.current.value = '';
			return;
		}
		
		// Check file size (500MB limit)
		const maxSize = 500 * 1024 * 1024; // 500MB
		const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
		
		if (file.size > maxSize) {
			setUploadError(`File is too large (${fileSizeMB}MB). Maximum size is 500MB. Please use a smaller KMZ file or simplify your data.`);
			if (fileInputRef.current) fileInputRef.current.value = '';
			return;
		}
		
		setUploading(true);
		setUploadError('');
		setUploadSuccess(false);
		
		try {
			console.log('[Upload] Starting file upload:', file.name, 'Size:', fileSizeMB, 'MB');
			
			const formData = new FormData();
			formData.append('file', file);
			
			const response = await fetch('/api/gis/kmz/parse', {
				method: 'POST',
				body: formData
			});
			
			console.log('[Upload] Response status:', response.status);
			
			const result = await response.json();
			console.log('[Upload] Response:', result);
			
			if (!result.success) {
				throw new Error(result.message || 'Failed to parse KMZ file');
			}
			
			const parsedData: ParsedKMZ = result.data;
			console.log('[Upload] Parsed data:', parsedData.layers.length, 'layers from', parsedData.sourceName);
			
			// Initialize layer state
			const initializedLayers = parsedData.layers.map((layer, index) => ({
				...layer,
				visible: layer.defaultVisible,
				opacity: 1,
				order: index
			}));
			
			setLayers(initializedLayers);
			setSourceName(parsedData.sourceName);
			setUploadSuccess(true);
			
			// Clear file input
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
			
			setTimeout(() => setUploadSuccess(false), 5000);
		} catch (error) {
			console.error('Upload error:', error);
			const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
			setUploadError(errorMessage);
			
			// Clear file input on error
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		} finally {
			setUploading(false);
		}
	};
	
	// Initialize map
	useEffect(() => {
		if (!mapContainerRef.current || mapInstanceRef.current) return;
		
		let isMounted = true;
		let timeoutId: NodeJS.Timeout | null = null;
		
		const initializeMap = () => {
			if (!isMounted || !mapContainerRef.current) return;
			
			const L = (window as any).L;
			if (!L) {
				timeoutId = setTimeout(initializeMap, 100);
				return;
			}
			
			try {
				// Initialize Leaflet icon defaults
				delete (L.Icon.Default.prototype as any)._getIconUrl;
				L.Icon.Default.mergeOptions({
					iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
					iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
					shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
				});
				
				// Create map
				const map = L.map(mapContainerRef.current, {
					center: [31.8, 70.9], // DI Khan coordinates
					zoom: 10,
					zoomControl: true
				});
				
				mapInstanceRef.current = map;
				
				// Create base layers
				const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution: '© OpenStreetMap contributors',
					maxZoom: 19
				});
				
				const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
					attribution: '© Esri',
					maxZoom: 19
				});
				
				const terrainLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
					attribution: '© OpenTopoMap',
					maxZoom: 17
				});
				
				// Store base layer refs
				baseLayerRefsRef.current = {
					street: streetLayer,
					satellite: satelliteLayer,
					terrain: terrainLayer
				};
				
				// Add default base layer
				satelliteLayer.addTo(map);
				
				if (isMounted) setMapLoaded(true);
			} catch (error) {
				console.error('Error initializing map:', error);
			}
		};
		
		// Load Leaflet if not already loaded
		if (!(window as any).L) {
			const linkElement = document.createElement('link');
			linkElement.rel = 'stylesheet';
			linkElement.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
			document.head.appendChild(linkElement);
			
			const scriptElement = document.createElement('script');
			scriptElement.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
			scriptElement.async = true;
			scriptElement.onload = () => {
				if (isMounted) initializeMap();
			};
			document.body.appendChild(scriptElement);
		} else {
			initializeMap();
		}
		
		return () => {
			isMounted = false;
			if (timeoutId) clearTimeout(timeoutId);
			if (rafIdRef.current) {
				cancelAnimationFrame(rafIdRef.current);
				rafIdRef.current = null;
			}
			if (mapInstanceRef.current) {
				try {
					mapInstanceRef.current.remove();
				} catch (e) {
					console.warn('Error removing map:', e);
				}
				mapInstanceRef.current = null;
			}
		};
	}, []);
	
	// Handle basemap changes
	useEffect(() => {
		if (!mapInstanceRef.current || !baseLayerRefsRef.current) return;
		
		const { street, satellite, terrain } = baseLayerRefsRef.current;
		
		// Remove all base layers
		[street, satellite, terrain].forEach(layer => {
			if (layer && mapInstanceRef.current.hasLayer(layer)) {
				mapInstanceRef.current.removeLayer(layer);
			}
		});
		
		// Add selected base layer
		const selectedLayer = baseLayerRefsRef.current[baseMap];
		if (selectedLayer) {
			selectedLayer.addTo(mapInstanceRef.current);
		}
	}, [baseMap]);
	
	// Render layers on map
	useEffect(() => {
		if (!mapInstanceRef.current || layers.length === 0) return;
		
		const L = (window as any).L;
		if (!L) return;
		
		// Clear existing layers
		Object.values(layerRefsRef.current).forEach(layer => {
			if (layer && mapInstanceRef.current.hasLayer(layer)) {
				mapInstanceRef.current.removeLayer(layer);
			}
		});
		layerRefsRef.current = {};
		
		// Sort layers by order
		const sortedLayers = [...layers].sort((a, b) => a.order - b.order);
		
		// Add layers to map
		sortedLayers.forEach(layerData => {
			try {
				// Determine style
				const defaultStyle: any = {
					color: layerData.style?.color || '#3388ff',
					weight: layerData.style?.weight || 2,
					opacity: layerData.opacity * 0.8,
					fillColor: layerData.style?.fillColor || '#3388ff',
					fillOpacity: (layerData.style?.fillOpacity || 0.2) * layerData.opacity
				};
				
				if (layerData.type === 'line') {
					defaultStyle.fillOpacity = 0;
				}
				
				const geoJsonLayer = L.geoJSON(layerData.geojson, {
					style: () => defaultStyle,
					pointToLayer: (feature: any, latlng: any) => {
						return L.circleMarker(latlng, {
							radius: 6,
							fillColor: layerData.style?.fillColor || '#3388ff',
							color: '#fff',
							weight: 2,
							opacity: layerData.opacity,
							fillOpacity: layerData.opacity * 0.8
						});
					},
					onEachFeature: (feature: any, layer: any) => {
						if (feature.properties) {
							// Existing click popup
							let popupContent = '<div style="max-width: 200px;">';
							popupContent += `<div style="font-weight: bold; margin-bottom: 8px; color: #1f2937;">${feature.properties.name || layerData.name}</div>`;
							popupContent += '<div style="font-size: 12px; color: #4b5563;">';
							
							Object.entries(feature.properties).forEach(([key, value]) => {
								if (key !== 'name' && key !== '_style' && value) {
									popupContent += `<div><strong>${key}:</strong> ${value}</div>`;
								}
							});
							
							popupContent += '</div></div>';
							layer.bindPopup(popupContent);
							
							// Add hover tooltip for point features
							if (layerData.type === 'point' || layerData.type === 'mixed') {
								layer.on('mouseover', (e: any) => {
									if (!mapContainerRef.current) return;
									
									const rect = mapContainerRef.current.getBoundingClientRect();
									const mouseX = e.originalEvent.clientX - rect.left;
									const mouseY = e.originalEvent.clientY - rect.top;
									
									const sanitized = sanitizeProperties(feature.properties);
									
									setTooltip({
										visible: true,
										x: mouseX,
										y: mouseY,
										title: feature.properties.name || layerData.name || 'Feature',
										props: sanitized
									});
								});
								
								layer.on('mousemove', (e: any) => {
									if (!mapContainerRef.current) return;
									
									const rect = mapContainerRef.current.getBoundingClientRect();
									const mouseX = e.originalEvent.clientX - rect.left;
									const mouseY = e.originalEvent.clientY - rect.top;
									
									updateTooltipPosition(mouseX, mouseY);
								});
								
								layer.on('mouseout', () => {
									setTooltip(prev => ({ ...prev, visible: false }));
									if (rafIdRef.current) {
										cancelAnimationFrame(rafIdRef.current);
										rafIdRef.current = null;
									}
								});
							}
						}
					}
				});
				
				layerRefsRef.current[layerData.id] = geoJsonLayer;
				
				if (layerData.visible) {
					geoJsonLayer.addTo(mapInstanceRef.current);
				}
			} catch (error) {
				console.error(`Error rendering layer ${layerData.name}:`, error);
			}
		});
		
		// Fit bounds to visible layers
		const visibleLayers = sortedLayers.filter(l => l.visible);
		if (visibleLayers.length > 0) {
			const allBounds = visibleLayers
				.map(l => layerRefsRef.current[l.id])
				.filter(layer => layer && layer.getBounds);
			
			if (allBounds.length > 0) {
				const group = L.featureGroup(allBounds);
				if (group.getBounds && group.getBounds().isValid()) {
					mapInstanceRef.current.fitBounds(group.getBounds(), { padding: [50, 50] });
				}
			}
		}
	}, [layers]);
	
	// Toggle layer visibility
	const toggleLayerVisibility = (layerId: string) => {
		setLayers(prev => prev.map(layer => 
			layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
		));
	};
	
	// Update layer opacity
	const updateLayerOpacity = (layerId: string, opacity: number) => {
		setLayers(prev => prev.map(layer => 
			layer.id === layerId ? { ...layer, opacity } : layer
		));
	};
	
	// Zoom to layer
	const zoomToLayer = (layerId: string) => {
		const layer = layerRefsRef.current[layerId];
		if (layer && layer.getBounds && mapInstanceRef.current) {
			const bounds = layer.getBounds();
			if (bounds.isValid()) {
				mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
			}
		}
	};
	
	// Reset view
	const resetView = () => {
		if (mapInstanceRef.current) {
			mapInstanceRef.current.setView([31.8, 70.9], 10);
		}
	};
	
	// Clear all layers
	const clearAllLayers = () => {
		setLayers([]);
		setSourceName('');
		Object.values(layerRefsRef.current).forEach(layer => {
			if (layer && mapInstanceRef.current.hasLayer(layer)) {
				mapInstanceRef.current.removeLayer(layer);
			}
		});
		layerRefsRef.current = {};
	};
	
	// Filter layers by search
	const filteredLayers = layers.filter(layer => 
		layer.name.toLowerCase().includes(layerSearch.toLowerCase())
	);
	
	// Count stats
	const visibleCount = layers.filter(l => l.visible).length;
	
	// Helper: Format property key for display
	const formatPropertyKey = (key: string): string => {
		return key
			.replace(/_/g, ' ')
			.replace(/([A-Z])/g, ' $1')
			.split(' ')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(' ')
			.trim();
	};
	
	// Helper: Sanitize properties for tooltip
	const sanitizeProperties = (props: Record<string, any>): Record<string, any> => {
		const sanitized: Record<string, any> = {};
		const excludeKeys = ['name', '_style', 'styleUrl', 'styleHash', 'stroke', 'stroke-opacity', 
			'stroke-width', 'fill', 'fill-opacity', 'icon', 'marker-color', 'marker-size', 
			'marker-symbol'];
		
		Object.entries(props).forEach(([key, value]) => {
			if (!excludeKeys.includes(key) && value != null && value !== '' && typeof value !== 'object') {
				sanitized[key] = value;
			}
		});
		
		return sanitized;
	};
	
	// Update tooltip position with RAF
	const updateTooltipPosition = (x: number, y: number) => {
		pendingTooltipRef.current = { x, y };
		
		if (!rafIdRef.current) {
			rafIdRef.current = requestAnimationFrame(() => {
				if (pendingTooltipRef.current && mapContainerRef.current) {
					const rect = mapContainerRef.current.getBoundingClientRect();
					const tooltipWidth = 320;
					const tooltipHeight = 200; // approximate
					
					let clampedX = Math.max(8, Math.min(pendingTooltipRef.current.x + 12, rect.width - tooltipWidth - 8));
					let clampedY = Math.max(8, Math.min(pendingTooltipRef.current.y + 12, rect.height - tooltipHeight - 8));
					
					setTooltip(prev => ({
						...prev,
						x: clampedX,
						y: clampedY
					}));
				}
				rafIdRef.current = null;
				pendingTooltipRef.current = null;
			});
		}
	};
	
	return (
		<div className="flex flex-col h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<Link
							href="/dashboard/remote-monitoring"
							className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
						>
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back
						</Link>
						<div>
							<h1 className="text-2xl font-bold text-gray-900">Google Earth Pro Viewer</h1>
							<p className="text-sm text-gray-600">Online GIS map from KMZ layers with professional layer controls</p>
						</div>
					</div>
					
					<div className="flex items-center gap-3">
						{/* Upload Button */}
						<input
							ref={fileInputRef}
							type="file"
							accept=".kmz,.kml"
							onChange={handleFileUpload}
							className="hidden"
						/>
						<button
							onClick={() => fileInputRef.current?.click()}
							disabled={uploading}
							className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
						>
							{uploading ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Processing... (this may take a moment for large files)
								</>
							) : (
								<>
									<Upload className="h-4 w-4 mr-2" />
									Upload KMZ/KML (Max 500MB)
								</>
							)}
						</button>
						
						{layers.length > 0 && (
							<button
								onClick={clearAllLayers}
								className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
							>
								<Trash2 className="h-4 w-4 mr-2" />
								Clear
							</button>
						)}
						
						<button
							onClick={resetView}
							className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
						>
							<Target className="h-4 w-4 mr-2" />
							Reset View
						</button>
					</div>
				</div>
				
				{/* Status Messages */}
				{uploadError && (
					<div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
						<AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
						<div>
							<p className="text-sm font-medium text-red-900">Upload Error</p>
							<p className="text-sm text-red-700">{uploadError}</p>
						</div>
						<button onClick={() => setUploadError('')} className="ml-auto">
							<X className="h-4 w-4 text-red-600" />
						</button>
					</div>
				)}
				
				{uploadSuccess && (
					<div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
						<CheckCircle className="h-5 w-5 text-green-600" />
						<p className="text-sm text-green-900">
							Successfully loaded <strong>{sourceName}</strong> with {layers.length} layer(s)
						</p>
					</div>
				)}
			</div>
			
			{/* Main Content */}
			<div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
				{/* Sidebar */}
				{sidebarOpen && (
					<div className="w-full lg:w-[22%] lg:max-w-xs shrink-0 bg-white border-r border-gray-200 flex flex-col">
						{/* Tabs */}
						<div className="flex border-b border-gray-200">
							<button
								onClick={() => setSelectedTab('layers')}
								className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
									selectedTab === 'layers'
										? 'text-emerald-600 border-b-2 border-emerald-600'
										: 'text-gray-600 hover:text-gray-900'
								}`}
							>
								<Layers className="h-4 w-4 inline mr-2" />
								Layers ({layers.length})
							</button>
							<button
								onClick={() => setSelectedTab('filters')}
								className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
									selectedTab === 'filters'
										? 'text-emerald-600 border-b-2 border-emerald-600'
										: 'text-gray-600 hover:text-gray-900'
								}`}
							>
								<Filter className="h-4 w-4 inline mr-2" />
								Filters
							</button>
						</div>
						
						{/* Layers Tab */}
						{selectedTab === 'layers' && (
							<div className="flex-1 flex flex-col overflow-hidden">
								{/* Search */}
								<div className="p-3 border-b border-gray-200">
									<div className="relative">
										<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
										<input
											type="text"
											placeholder="Search layers..."
											value={layerSearch}
											onChange={(e) => setLayerSearch(e.target.value)}
											className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
										/>
									</div>
								</div>
								
								{/* Basemap Selector */}
								<div className="p-3 border-b border-gray-200">
									<label className="block text-xs font-medium text-gray-700 mb-2">Basemap</label>
									<div className="grid grid-cols-3 gap-2">
										{(['street', 'satellite', 'terrain'] as const).map(type => (
											<button
												key={type}
												onClick={() => setBaseMap(type)}
												className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
													baseMap === type
														? 'bg-emerald-600 text-white'
														: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
												}`}
											>
												{type.charAt(0).toUpperCase() + type.slice(1)}
											</button>
										))}
									</div>
								</div>
								
								{/* Layer List */}
								<div className="flex-1 overflow-y-auto">
									{layers.length === 0 ? (
										<div className="p-6 text-center">
											<MapIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
											<p className="text-sm text-gray-600 mb-2">No layers loaded</p>
											<p className="text-xs text-gray-500">Upload a KMZ/KML file to get started</p>
										</div>
									) : filteredLayers.length === 0 ? (
										<div className="p-6 text-center">
											<Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
											<p className="text-sm text-gray-600">No layers match your search</p>
										</div>
									) : (
										<div className="p-2 space-y-1">
											{filteredLayers.map((layer) => (
												<div
													key={layer.id}
													className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
												>
													<div className="p-3">
														<div className="flex items-start gap-2 mb-2">
															<button
																onClick={() => toggleLayerVisibility(layer.id)}
																className="flex-shrink-0 mt-0.5"
															>
																{layer.visible ? (
																	<Eye className="h-4 w-4 text-emerald-600" />
																) : (
																	<EyeOff className="h-4 w-4 text-gray-400" />
																)}
															</button>
															<div className="flex-1 min-w-0">
																<p className="text-sm font-medium text-gray-900 truncate">
																	{layer.name}
																</p>
																<p className="text-xs text-gray-500 capitalize">
																	{layer.type} • {layer.geojson.features.length} feature(s)
																</p>
															</div>
															<button
																onClick={() => zoomToLayer(layer.id)}
																className="flex-shrink-0 p-1 hover:bg-gray-200 rounded"
																title="Zoom to layer"
															>
																<Target className="h-4 w-4 text-gray-600" />
															</button>
														</div>
														
														{/* Opacity Slider */}
														<div className="flex items-center gap-2">
															<Sliders className="h-3 w-3 text-gray-500 flex-shrink-0" />
															<input
																type="range"
																min="0"
																max="1"
																step="0.1"
																value={layer.opacity}
																onChange={(e) => updateLayerOpacity(layer.id, parseFloat(e.target.value))}
																className="flex-1 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
																style={{
																	background: `linear-gradient(to right, #10b981 0%, #10b981 ${layer.opacity * 100}%, #d1d5db ${layer.opacity * 100}%, #d1d5db 100%)`
																}}
															/>
															<span className="text-xs text-gray-600 w-8 text-right">
																{Math.round(layer.opacity * 100)}%
															</span>
														</div>
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						)}
						
						{/* Filters Tab */}
						{selectedTab === 'filters' && (
							<div className="flex-1 p-4 overflow-y-auto">
								<div className="text-center py-8">
									<Filter className="h-12 w-12 text-gray-400 mx-auto mb-3" />
									<p className="text-sm text-gray-600 mb-2">Advanced Filters</p>
									<p className="text-xs text-gray-500">
										Filter by District, Tehsil, or custom attributes from your KMZ file
									</p>
									<div className="mt-6 space-y-3">
										<div>
											<label className="block text-xs font-medium text-gray-700 mb-1 text-left">
												Filter by name
											</label>
											<input
												type="text"
												placeholder="Enter text..."
												className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
											/>
										</div>
										<div>
											<label className="block text-xs font-medium text-gray-700 mb-1 text-left">
												Filter by type
											</label>
											<select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
												<option>All types</option>
												<option>Polygon</option>
												<option>Line</option>
												<option>Point</option>
											</select>
										</div>
									</div>
								</div>
							</div>
						)}
						
						{/* Footer Stats */}
						<div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
							<div className="flex items-center justify-between text-xs text-gray-600">
								<span>Layers loaded: <strong>{layers.length}</strong></span>
								<span>Visible: <strong>{visibleCount}</strong></span>
							</div>
						</div>
					</div>
				)}
				
				{/* Toggle Sidebar Button */}
				<button
					onClick={() => setSidebarOpen(!sidebarOpen)}
					className="absolute left-0 top-1/2 -translate-y-1/2 z-[1000] bg-white border border-gray-200 rounded-r-lg px-1 py-3 hover:bg-gray-50 transition-colors shadow-lg lg:left-[22%]"
					style={{ left: sidebarOpen ? undefined : '0' }}
				>
					{sidebarOpen ? (
						<ChevronDown className="h-4 w-4 text-gray-600 rotate-90" />
					) : (
						<ChevronRight className="h-4 w-4 text-gray-600" />
					)}
				</button>
				
				{/* Map Container */}
				<div className="flex-1 min-w-0 relative">
					{!mapLoaded && (
						<div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-[999]">
							<div className="text-center">
								<Loader2 className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-2" />
								<p className="text-sm text-gray-600">Loading map...</p>
							</div>
						</div>
					)}
					<div ref={mapContainerRef} className="w-full h-full" />
					
					{/* Hover Tooltip */}
					{tooltip.visible && (
						<div
							className="absolute z-[1000] w-[320px] max-w-[90vw] rounded-xl border border-gray-200 bg-white shadow-2xl pointer-events-none"
							style={{
								left: `${tooltip.x}px`,
								top: `${tooltip.y}px`,
							}}
						>
							{/* Header */}
							<div className="px-3 pt-3 pb-2 border-b border-gray-100">
								<div className="flex items-center gap-2">
									<MapPin className="h-4 w-4 text-emerald-600 flex-shrink-0" />
									<h3 className="text-sm font-semibold text-gray-900 truncate">
										{tooltip.title}
									</h3>
								</div>
							</div>
							
							{/* Body */}
							{Object.keys(tooltip.props).length > 0 ? (
								<div className="px-3 py-3 space-y-2 max-h-[300px] overflow-y-auto">
									{Object.entries(tooltip.props).slice(0, 10).map(([key, value], idx) => (
										<div
											key={key}
											className={`flex items-start justify-between gap-3 ${
												idx !== 0 ? 'pt-2 border-t border-gray-50' : ''
											}`}
										>
											<span className="text-xs font-medium text-gray-500 flex-shrink-0">
												{formatPropertyKey(key)}:
											</span>
											<span className="text-xs text-gray-900 text-right break-words">
												{String(value)}
											</span>
										</div>
									))}
									{Object.keys(tooltip.props).length > 10 && (
										<div className="pt-2 border-t border-gray-50 text-center">
											<span className="text-xs text-gray-500 italic">
												+{Object.keys(tooltip.props).length - 10} more fields
											</span>
										</div>
									)}
								</div>
							) : (
								<div className="px-3 py-3">
									<p className="text-xs text-gray-500 italic">No additional properties</p>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
