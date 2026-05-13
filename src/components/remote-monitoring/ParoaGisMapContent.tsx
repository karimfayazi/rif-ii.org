"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	AlertCircle,
	ArrowLeft,
	ChevronDown,
	Download,
	Layers,
	Loader2,
	Map,
	MapPinned,
	RefreshCw,
	Square,
	X,
} from "lucide-react";
import Link from "next/link";

type GeoJsonFeature = {
	type: "Feature";
	geometry: {
		type: string;
		coordinates: any;
	};
	properties: Record<string, any>;
};

type KMZLayer = {
	id: string;
	name: string;
	type: "polygon" | "line" | "point" | "mixed";
	geojson: {
		type: "FeatureCollection";
		features: GeoJsonFeature[];
	};
	bounds: [number, number, number, number];
	style?: {
		color?: string;
		fillColor?: string;
		fillOpacity?: number;
		weight?: number;
	};
};

type KMZFile = {
	fileName: string;
	displayName: string;
	layers: KMZLayer[];
	totalLayers: number;
	totalFeatures: number;
};

type BaseMapType = "satellite" | "street" | "hybrid" | "topographic";

type DisplayLayerStyle = {
	color: string;
	fillColor: string;
	fillOpacity: number;
	opacity: number;
	weight: number;
};

type LayerStyleSettings = {
	fillColor: string;
	borderColor: string;
	fillOpacityPercent: number;
	borderOpacityPercent: number;
	borderWidth: number;
};

type LayerStyleSettingsPanelConfig = {
	title?: string;
	description?: string;
	defaultStylesByFile?: Record<string, Partial<LayerStyleSettings>>;
};

const BASE_MAP_LABELS: Record<BaseMapType, string> = {
	satellite: "Satellite Map",
	street: "Street / Road Map",
	hybrid: "Hybrid Map",
	topographic: "Topographic Map",
};

const DEFAULT_LAYER_STYLE: LayerStyleSettings = {
	fillColor: "#2563eb",
	borderColor: "#1e40af",
	fillOpacityPercent: 25,
	borderOpacityPercent: 90,
	borderWidth: 2,
};

function clampNumber(value: number, min: number, max: number) {
	if (Number.isNaN(value)) return min;
	return Math.min(max, Math.max(min, value));
}

function hexToRgba(hex: string | undefined, opacity: number) {
	const fallback = "#3388ff";
	const value = (hex || fallback).replace("#", "");
	const normalized =
		value.length === 3
			? value
					.split("")
					.map((char) => `${char}${char}`)
					.join("")
			: value;
	const numeric = Number.parseInt(normalized, 16);
	if (Number.isNaN(numeric)) return `rgba(51, 136, 255, ${opacity})`;
	const r = (numeric >> 16) & 255;
	const g = (numeric >> 8) & 255;
	const b = numeric & 255;
	return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function formatGisExportFileBase(fileBasePrefix: string) {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${fileBasePrefix}_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function formatExportTimestamp() {
	return new Intl.DateTimeFormat("en", {
		year: "numeric",
		month: "short",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date());
}

function getShapeLabel(type: KMZLayer["type"]) {
	if (type === "line") return "Polyline";
	if (type === "point") return "Point Marker";
	if (type === "mixed") return "Mixed Geometry";
	return "Polygon";
}

function getBoundaryLabel(type: KMZLayer["type"]) {
	if (type === "line") return "Stroke";
	if (type === "point") return "Marker outline";
	if (type === "mixed") return "Mixed style";
	return "Boundary";
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
	const words = text.split(" ");
	const lines: string[] = [];
	let currentLine = "";

	words.forEach((word) => {
		const testLine = currentLine ? `${currentLine} ${word}` : word;
		if (ctx.measureText(testLine).width > maxWidth && currentLine) {
			lines.push(currentLine);
			currentLine = word;
		} else {
			currentLine = testLine;
		}
	});

	if (currentLine) lines.push(currentLine);
	return lines;
}

interface ParoaGisMapContentProps {
	showBackButton?: boolean;
	backHref?: string;
	title?: string;
	description?: string;
	legendDisplayMode?: "sidebar" | "modal";
	/** When set, KMZ file list / legend / map draw order follows this sequence (unknown files append last). */
	kmzLayerFileOrder?: string[];
	/** Optional per-file UI labels (layer picker + legend); merged ahead of built-in legend names when provided. */
	kmzDisplayNamesByFile?: Record<string, string>;
	/** When set, each KMZ file uses this stroke/fill color for layers and legend swatches (overrides KMZ feature colors for that file only). */
	kmzLayerColorsByFile?: Record<string, string>;
	/** When true, show Download (JPG/PDF) for the visible map area (client-side capture). */
	enableMapExport?: boolean;
	/** API route that returns parsed KMZ payload (default: Paroa bundle). */
	kmzApiPath?: string;
	/** Small brand line above “Legends” in modal layout (default: Paroa). */
	legendsModalBrandLabel?: string;
	/** Prefix for exported JPG/PDF filenames (default: Paroa_GIS_Map). */
	exportFileBasePrefix?: string;
	/** Optional live per-layer style controls, used by standalone site pages such as Paniala. */
	layerStyleSettingsPanel?: LayerStyleSettingsPanelConfig;
}

const FALLBACK_COLORS = [
	"#0ea5e9",
	"#10b981",
	"#f97316",
	"#8b5cf6",
	"#ef4444",
	"#14b8a6",
	"#eab308",
	"#6366f1",
];

const LEGEND_NAME_BY_FILE: Record<string, string> = {
	"Paroa_CommercialArea.kmz": "Commercial Area",
	"Paroa_DairyFarm.kmz": "Dairy Farm",
	"Paroa_DumpSites.kmz": "Paroa_DS",
	"Paroa_ExistingDrain.kmz": "Existing Drains",
	"Paroa_NCBoundary.kmz": "NC Boundary",
	"Paroa_ProposedDrainByCommunity.kmz": "Proposed Drain by Community",
	"Paroa_Waste WaterPonds.kmz": "Stagnant Wastewater Ponds",
	"Paroa_WaterData.kmz": "Paroa_WaterData",
	"Paroa_WaterSchemes.kmz": "Paroa_WaterData",
	"Paroa_WaterSupplyLines.kmz": "Paroa_Water_Supply_Lines",
	"Paroa_Zone.kmz": "Paroa_Zone_Updated",
};

function formatPropertyKey(key: string) {
	return key
		.replace(/_/g, " ")
		.replace(/([A-Z])/g, " $1")
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ")
		.trim();
}

function getLayerStyle(layer: KMZLayer, fallbackColor: string): DisplayLayerStyle {
	const featureStyle =
		layer.geojson.features.find((feature) => feature.properties?._style)?.properties?._style || {};

	return {
		color: featureStyle.color || layer.style?.color || fallbackColor,
		fillColor: featureStyle.fillColor || layer.style?.fillColor || fallbackColor,
		fillOpacity:
			featureStyle.fillOpacity ?? layer.style?.fillOpacity ?? (layer.type === "polygon" ? 0.25 : 0),
		opacity: 0.9,
		weight: featureStyle.weight ?? layer.style?.weight ?? 2,
	};
}

function sortKmzFilesByOrder(files: KMZFile[], order: string[] | undefined): KMZFile[] {
	if (!order?.length) return files;
	return [...files].sort((a, b) => {
		const ia = order.indexOf(a.fileName);
		const ib = order.indexOf(b.fileName);
		const ra = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
		const rb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
		if (ra !== rb) return ra - rb;
		return a.fileName.localeCompare(b.fileName);
	});
}

export default function ParoaGisMapContent({
	showBackButton = true,
	backHref = "/dashboard/remote-monitoring",
	title = "Paroa GIS Maps",
	description = "View Paroa KMZ layers on one online GIS map with selectable visibility and legends",
	legendDisplayMode = "sidebar",
	kmzLayerFileOrder,
	kmzDisplayNamesByFile,
	kmzLayerColorsByFile,
	enableMapExport = false,
	kmzApiPath = "/api/gis/kmz/paroa",
	legendsModalBrandLabel = "Paroa GIS Map",
	exportFileBasePrefix = "Paroa_GIS_Map",
	layerStyleSettingsPanel,
}: ParoaGisMapContentProps) {
	const [files, setFiles] = useState<KMZFile[]>([]);
	const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>("");
	const [warnings, setWarnings] = useState<Array<{ fileName: string; displayName: string; message: string }>>([]);
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [legendModalOpen, setLegendModalOpen] = useState(false);
	const [mapLoaded, setMapLoaded] = useState(false);
	const [baseMapType, setBaseMapType] = useState<BaseMapType>("satellite");
	const [exportMenuOpen, setExportMenuOpen] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [exportError, setExportError] = useState("");
	const showInlineExportLegend = false;
	const [layerStyles, setLayerStyles] = useState<Record<string, LayerStyleSettings>>({});
	const [layerStylePanelOpen, setLayerStylePanelOpen] = useState(true);

	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<any>(null);
	const layerRefsRef = useRef<Record<string, any>>({});
	const baseLayerRefsRef = useRef<Record<string, any>>({});
	const labelLayerRef = useRef<any>(null);
	const lastFitBoundsSignatureRef = useRef("");
	const dropdownRef = useRef<HTMLDivElement>(null);
	const exportDropdownRef = useRef<HTMLDivElement>(null);

	const resolveLegendDisplayName = (fileName: string, layerName: string) =>
		kmzDisplayNamesByFile?.[fileName] ?? LEGEND_NAME_BY_FILE[fileName] ?? layerName;

	const resolveFilePickerLabel = (file: KMZFile) =>
		kmzDisplayNamesByFile?.[file.fileName] ?? file.displayName;

	const fallbackColorIndexForFile = (file: KMZFile, selectedIndex: number) => {
		if (kmzLayerFileOrder?.length) {
			const idx = kmzLayerFileOrder.indexOf(file.fileName);
			if (idx !== -1) return idx % FALLBACK_COLORS.length;
		}
		return selectedIndex % FALLBACK_COLORS.length;
	};

	const getDefaultEditableLayerStyle = useCallback(
		(layer: KMZLayer, file: KMZFile, fileIndex: number): LayerStyleSettings => {
			const fallback = FALLBACK_COLORS[fallbackColorIndexForFile(file, fileIndex)];
			const baseStyle = getLayerStyle(layer, fallback);
			return {
				...DEFAULT_LAYER_STYLE,
				fillColor: baseStyle.fillColor || fallback,
				borderColor: baseStyle.color || fallback,
				fillOpacityPercent: Math.round(clampNumber((baseStyle.fillOpacity ?? 0.25) * 100, 0, 100)),
				borderOpacityPercent: 90,
				borderWidth: clampNumber(baseStyle.weight ?? 2, 1, 12),
				...layerStyleSettingsPanel?.defaultStylesByFile?.[file.fileName],
			};
		},
		[kmzLayerFileOrder, layerStyleSettingsPanel],
	);

	const getEditableLayerStyle = useCallback(
		(layer: KMZLayer, file: KMZFile, fileIndex: number) =>
			layerStyles[file.fileName] ?? getDefaultEditableLayerStyle(layer, file, fileIndex),
		[getDefaultEditableLayerStyle, layerStyles],
	);

	const getEditableLeafletStyle = useCallback((style: LayerStyleSettings): DisplayLayerStyle => ({
		color: style.borderColor,
		fillColor: style.fillColor,
		fillOpacity: style.fillOpacityPercent / 100,
		opacity: style.borderOpacityPercent / 100,
		weight: style.borderWidth,
	}), []);

	/** Legend + Leaflet styling: optional per-file palette keeps swatches and geometry in sync. */
	const getDisplayLayerStyle = useCallback(
		(layer: KMZLayer, file: KMZFile, fileIndex: number) => {
			if (layerStyleSettingsPanel) {
				return getEditableLeafletStyle(getEditableLayerStyle(layer, file, fileIndex));
			}

			const forced = kmzLayerColorsByFile?.[file.fileName];
			const fallback = FALLBACK_COLORS[fallbackColorIndexForFile(file, fileIndex)];
			if (forced) {
				const featureStyle =
					layer.geojson.features.find((f) => f.properties?._style)?.properties?._style || {};
				return {
					color: forced,
					fillColor: forced,
					fillOpacity:
						featureStyle.fillOpacity ??
						layer.style?.fillOpacity ??
						(layer.type === "polygon" ? 0.25 : 0),
					opacity: 0.9,
					weight: featureStyle.weight ?? layer.style?.weight ?? 2,
				};
			}
			return getLayerStyle(layer, fallback);
		},
		[getEditableLayerStyle, getEditableLeafletStyle, kmzLayerColorsByFile, kmzLayerFileOrder, layerStyleSettingsPanel],
	);

	const loadFiles = useCallback(async (options?: { preserveSelection?: boolean }) => {
		try {
			setLoading(true);
			setError("");

			const response = await fetch(kmzApiPath, { cache: "no-store" });
			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.message || "Failed to load KMZ files");
			}

			const loadedFiles: KMZFile[] = result.files || [];
			setFiles(loadedFiles);
			setWarnings(result.warnings || []);
			setSelectedFiles((previous) => {
				if (!options?.preserveSelection) {
					return new Set(loadedFiles.map((file) => file.fileName));
				}

				const availableFileNames = new Set(loadedFiles.map((file) => file.fileName));
				const preservedSelection = Array.from(previous).filter((fileName) => availableFileNames.has(fileName));

				return new Set(
					preservedSelection.length > 0 ? preservedSelection : loadedFiles.map((file) => file.fileName),
				);
			});
		} catch (fetchError) {
			console.error("Error loading GIS KMZ files:", fetchError);
			setError(fetchError instanceof Error ? fetchError.message : "Failed to load KMZ files");
		} finally {
			setLoading(false);
		}
	}, [kmzApiPath]);

	useEffect(() => {
		void loadFiles();
	}, [loadFiles]);

	const orderedFiles = useMemo(
		() => sortKmzFilesByOrder(files, kmzLayerFileOrder),
		[files, kmzLayerFileOrder],
	);

	useEffect(() => {
		if (!dropdownOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setDropdownOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [dropdownOpen]);

	useEffect(() => {
		if (!exportMenuOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
				setExportMenuOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [exportMenuOpen]);

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

			delete (L.Icon.Default.prototype as any)._getIconUrl;
			L.Icon.Default.mergeOptions({
				iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
				iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
				shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
			});

			const map = L.map(mapContainerRef.current, {
				center: [31.8, 70.9],
				zoom: 10,
				zoomControl: true,
			});

			const streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				attribution: "© OpenStreetMap contributors",
				maxZoom: 19,
			});

			const satelliteLayer = L.tileLayer(
				"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
				{
					attribution: "Tiles © Esri",
					maxZoom: 19,
				},
			);

			const topographicLayer = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
				attribution: "© OpenTopoMap contributors",
				maxZoom: 17,
			});

			const hybridLabelsLayer = L.tileLayer(
				"https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png",
				{
					attribution: "© OpenStreetMap contributors © CARTO",
					subdomains: "abcd",
					maxZoom: 20,
				},
			);

			baseLayerRefsRef.current = {
				satellite: satelliteLayer,
				street: streetLayer,
				hybrid: satelliteLayer,
				topographic: topographicLayer,
			};
			labelLayerRef.current = hybridLabelsLayer;

			satelliteLayer.addTo(map);

			mapInstanceRef.current = map;
			if (isMounted) setMapLoaded(true);
		};

		if (!(window as any).L) {
			const existingCss = document.querySelector('link[href*="leaflet.css"]');
			if (!existingCss) {
				const linkElement = document.createElement("link");
				linkElement.rel = "stylesheet";
				linkElement.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css";
				document.head.appendChild(linkElement);
			}

			const scriptElement = document.createElement("script");
			scriptElement.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js";
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

			if (mapInstanceRef.current) {
				try {
					mapInstanceRef.current.remove();
				} catch (removeError) {
					console.warn("Error removing map:", removeError);
				}
				mapInstanceRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		if (!mapInstanceRef.current) return;

		const map = mapInstanceRef.current;
		const baseLayers = baseLayerRefsRef.current;
		const labelLayer = labelLayerRef.current;

		Object.values(baseLayers).forEach((layer) => {
			if (layer && map.hasLayer(layer)) {
				map.removeLayer(layer);
			}
		});

		if (labelLayer && map.hasLayer(labelLayer)) {
			map.removeLayer(labelLayer);
		}

		const selectedBaseLayer = baseLayers[baseMapType];
		if (selectedBaseLayer) {
			selectedBaseLayer.addTo(map);
		}

		if (baseMapType === "hybrid" && labelLayer) {
			labelLayer.addTo(map);
		}
	}, [baseMapType]);

	const selectedFileData = useMemo(
		() => orderedFiles.filter((file) => selectedFiles.has(file.fileName)),
		[orderedFiles, selectedFiles],
	);

	const legendItems = useMemo(
		() =>
			selectedFileData.flatMap((file, fileIndex) =>
				file.layers.map((layer) => ({
					key: `${file.fileName}-${layer.id}`,
					style: getDisplayLayerStyle(layer, file, fileIndex),
					type: layer.type,
					displayName: resolveLegendDisplayName(file.fileName, layer.name),
				})),
			),
		[selectedFileData, kmzDisplayNamesByFile, kmzLayerFileOrder, getDisplayLayerStyle],
	);

	const exportLegendItems = useMemo(
		() =>
			legendItems.map((item) => ({
				...item,
				shapeLabel: getShapeLabel(item.type),
				boundaryLabel: getBoundaryLabel(item.type),
				fillOpacityPercent: Math.round(clampNumber((item.style.fillOpacity ?? 0) * 100, 0, 100)),
				strokeOpacityPercent: Math.round(clampNumber((item.style.opacity ?? 0.9) * 100, 0, 100)),
				strokeWidth: item.style.weight ?? 2,
			})),
		[legendItems],
	);

	useEffect(() => {
		if (!mapInstanceRef.current) return;

		const L = (window as any).L;
		if (!L) return;

		Object.values(layerRefsRef.current).forEach((layer) => {
			if (layer && mapInstanceRef.current.hasLayer(layer)) {
				mapInstanceRef.current.removeLayer(layer);
			}
		});
		layerRefsRef.current = {};

		const visibleLeafletLayers: any[] = [];
		const fitBoundsSignature = selectedFileData
			.flatMap((file) => file.layers.map((layer) => `${file.fileName}:${layer.id}`))
			.join("|");

		selectedFileData.forEach((file, fileIndex) => {
			file.layers.forEach((layer) => {
				const resolvedStyle = getDisplayLayerStyle(layer, file, fileIndex);
				const useSyncedPalette = Boolean(kmzLayerColorsByFile?.[file.fileName]);
				const useEditableStyle = Boolean(layerStyleSettingsPanel);
				const layerKey = `${file.fileName}:${layer.id}`;

				const geoJsonLayer = L.geoJSON(layer.geojson, {
					style: (feature: any) => {
						const featureStyle = feature?.properties?._style || {};
						if (useEditableStyle) {
							return {
								color: resolvedStyle.color,
								fillColor: resolvedStyle.fillColor,
								fillOpacity: resolvedStyle.fillOpacity,
								weight: resolvedStyle.weight,
								opacity: resolvedStyle.opacity,
							};
						}
						if (useSyncedPalette) {
							return {
								color: resolvedStyle.color,
								fillColor: resolvedStyle.fillColor,
								fillOpacity:
									featureStyle.fillOpacity ??
									resolvedStyle.fillOpacity ??
									(layer.type === "polygon" ? 0.25 : 0),
								weight: featureStyle.weight ?? resolvedStyle.weight ?? 2,
								opacity: 0.9,
							};
						}
						return {
							color: featureStyle.color || resolvedStyle.color,
							fillColor: featureStyle.fillColor || resolvedStyle.fillColor,
							fillOpacity:
								featureStyle.fillOpacity ??
								resolvedStyle.fillOpacity ??
								(layer.type === "polygon" ? 0.25 : 0),
							weight: featureStyle.weight ?? resolvedStyle.weight ?? 2,
							opacity: 0.9,
						};
					},
					pointToLayer: (feature: any, latlng: any) =>
						L.circleMarker(latlng, {
							radius: 6,
							fillColor: useEditableStyle
								? resolvedStyle.fillColor
								: useSyncedPalette
								? resolvedStyle.fillColor
								: feature?.properties?._style?.fillColor || resolvedStyle.fillColor,
							color: useEditableStyle
								? resolvedStyle.color
								: useSyncedPalette
								? resolvedStyle.color
								: feature?.properties?._style?.color || resolvedStyle.color,
							weight: resolvedStyle.weight ?? 2,
							opacity: resolvedStyle.opacity ?? 1,
							fillOpacity: resolvedStyle.fillOpacity ?? 0.8,
						}),
					onEachFeature: (feature: any, leafletLayer: any) => {
						const props = feature.properties || {};
						const title = props.name || layer.name || file.displayName;
						const visibleEntries = Object.entries(props)
							.filter(([key, value]) => key !== "_style" && value !== null && value !== "")
							.slice(0, 8);

						const popupContent = `
							<div style="max-width: 280px;">
								<div style="font-weight:700; color:#111827; margin-bottom:8px;">${title}</div>
								<div style="font-size:12px; color:#374151;">
									${visibleEntries
										.map(([key, value]) => `<div><strong>${formatPropertyKey(key)}:</strong> ${String(value)}</div>`)
										.join("")}
								</div>
							</div>
						`;

						leafletLayer.bindPopup(popupContent);
					},
				});

				geoJsonLayer.addTo(mapInstanceRef.current);
				layerRefsRef.current[layerKey] = geoJsonLayer;
				visibleLeafletLayers.push(geoJsonLayer);
			});
		});

		if (visibleLeafletLayers.length === 0) {
			lastFitBoundsSignatureRef.current = "";
			return;
		}

		if (lastFitBoundsSignatureRef.current !== fitBoundsSignature) {
			const group = L.featureGroup(visibleLeafletLayers);
			if (group.getBounds && group.getBounds().isValid()) {
				mapInstanceRef.current.fitBounds(group.getBounds(), { padding: [40, 40] });
				lastFitBoundsSignatureRef.current = fitBoundsSignature;
			}
		}
	}, [selectedFileData, kmzLayerFileOrder, getDisplayLayerStyle, layerStyleSettingsPanel]);

	const toggleFileSelection = (fileName: string) => {
		setSelectedFiles((previous) => {
			const updated = new Set(previous);
			if (updated.has(fileName)) {
				updated.delete(fileName);
			} else {
				updated.add(fileName);
			}
			return updated;
		});
	};

	const selectAll = () => {
		setSelectedFiles(new Set(orderedFiles.map((file) => file.fileName)));
	};

	const clearAll = () => {
		setSelectedFiles(new Set());
	};

	const updateLayerStyle = (file: KMZFile, layer: KMZLayer, fileIndex: number, updates: Partial<LayerStyleSettings>) => {
		setLayerStyles((previous) => ({
			...previous,
			[file.fileName]: {
				...getEditableLayerStyle(layer, file, fileIndex),
				...updates,
			},
		}));
	};

	const resetLayerStyle = (fileName: string) => {
		setLayerStyles((previous) => {
			const next = { ...previous };
			delete next[fileName];
			return next;
		});
	};

	const resetAllLayerStyles = () => {
		setLayerStyles({});
	};

	const handleMapExport = async (format: "jpg" | "png" | "pdf") => {
		setExportMenuOpen(false);
		setExportError("");
		if (!mapContainerRef.current || !mapInstanceRef.current) {
			setExportError("Map is not ready to export yet. Please wait and try again.");
			return;
		}
		try {
			setExporting(true);
			const map = mapInstanceRef.current;
			if (typeof map.invalidateSize === "function") {
				map.invalidateSize();
			}
			await new Promise<void>((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
			);
			await new Promise((r) => setTimeout(r, 300));
			const html2canvas = (await import("html2canvas")).default;
			const element = mapContainerRef.current;
			const canvas = await html2canvas(element, {
				useCORS: true,
				allowTaint: false,
				logging: false,
				scale: Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
				backgroundColor: "#e5e7eb",
				imageTimeout: 20000,
			});
			const base = formatGisExportFileBase(exportFileBasePrefix);
			const selectedLayerLabels = orderedFiles
				.filter((f) => selectedFiles.has(f.fileName))
				.map((f) => resolveFilePickerLabel(f));
			const timestamp = formatExportTimestamp();
			const imageExportCanvas = document.createElement("canvas");
			const imageExportCtx = imageExportCanvas.getContext("2d");
			const canvasScale = canvas.width / Math.max(1, element.clientWidth || canvas.width);
			const legendPadding = Math.round(26 * canvasScale);
			const legendHeaderHeight = Math.round(82 * canvasScale);
			const legendCardHeight = Math.round(126 * canvasScale);
			const legendGap = Math.round(14 * canvasScale);
			const legendHeight =
				legendPadding * 2 +
				legendHeaderHeight +
				Math.max(1, exportLegendItems.length) * legendCardHeight +
				Math.max(0, exportLegendItems.length - 1) * legendGap;
			let dataUrl: string;

			if (imageExportCtx) {
				imageExportCanvas.width = canvas.width;
				imageExportCanvas.height = canvas.height + legendHeight;
				imageExportCtx.fillStyle = "#ffffff";
				imageExportCtx.fillRect(0, 0, imageExportCanvas.width, imageExportCanvas.height);
				imageExportCtx.drawImage(canvas, 0, 0);
				imageExportCtx.fillStyle = "#f8fafc";
				imageExportCtx.fillRect(0, canvas.height, imageExportCanvas.width, legendHeight);

				let y = canvas.height + legendPadding;
				imageExportCtx.fillStyle = "#0f172a";
				imageExportCtx.font = `${Math.round(22 * canvasScale)}px Arial, sans-serif`;
				imageExportCtx.fillText("Visible Layers & Styles", legendPadding, y + Math.round(24 * canvasScale));
				imageExportCtx.font = `${Math.round(13 * canvasScale)}px Arial, sans-serif`;
				imageExportCtx.fillStyle = "#475569";
				imageExportCtx.fillText(`${title} | Exported ${timestamp}`, legendPadding, y + Math.round(48 * canvasScale));
				imageExportCtx.fillText(
					"Only currently visible layers are included below.",
					legendPadding,
					y + Math.round(68 * canvasScale),
				);
				y += legendHeaderHeight;

				if (exportLegendItems.length === 0) {
					imageExportCtx.fillStyle = "#334155";
					imageExportCtx.font = `${Math.round(15 * canvasScale)}px Arial, sans-serif`;
					imageExportCtx.fillText("No visible GIS layers selected.", legendPadding, y + Math.round(28 * canvasScale));
				}

				exportLegendItems.forEach((item, index) => {
					const cardX = legendPadding;
					const cardY = y;
					const cardW = imageExportCanvas.width - legendPadding * 2;
					const rowGap = Math.round(22 * canvasScale);
					imageExportCtx.fillStyle = "#ffffff";
					imageExportCtx.strokeStyle = "#cbd5e1";
					imageExportCtx.lineWidth = Math.max(1, Math.round(canvasScale));
					imageExportCtx.beginPath();
					imageExportCtx.roundRect(cardX, cardY, cardW, legendCardHeight, Math.round(10 * canvasScale));
					imageExportCtx.fill();
					imageExportCtx.stroke();

					const swatchX = cardX + Math.round(16 * canvasScale);
					const swatchY = cardY + Math.round(16 * canvasScale);
					imageExportCtx.fillStyle = hexToRgba(item.style.fillColor, item.fillOpacityPercent / 100);
					imageExportCtx.strokeStyle = hexToRgba(item.style.color, item.strokeOpacityPercent / 100);
					imageExportCtx.lineWidth = Math.max(2, Math.round(item.strokeWidth * canvasScale));
					if (item.type === "line") {
						imageExportCtx.beginPath();
						imageExportCtx.moveTo(swatchX, swatchY + Math.round(10 * canvasScale));
						imageExportCtx.lineTo(swatchX + Math.round(32 * canvasScale), swatchY + Math.round(10 * canvasScale));
						imageExportCtx.stroke();
					} else if (item.type === "point") {
						imageExportCtx.beginPath();
						imageExportCtx.arc(
							swatchX + Math.round(14 * canvasScale),
							swatchY + Math.round(12 * canvasScale),
							Math.round(8 * canvasScale),
							0,
							Math.PI * 2,
						);
						imageExportCtx.fill();
						imageExportCtx.stroke();
					} else {
						imageExportCtx.fillRect(swatchX, swatchY, Math.round(28 * canvasScale), Math.round(22 * canvasScale));
						imageExportCtx.strokeRect(swatchX, swatchY, Math.round(28 * canvasScale), Math.round(22 * canvasScale));
					}

					const textX = cardX + Math.round(62 * canvasScale);
					const textW = cardW - Math.round(78 * canvasScale);
					imageExportCtx.fillStyle = "#0f172a";
					imageExportCtx.font = `bold ${Math.round(15 * canvasScale)}px Arial, sans-serif`;
					const nameLines = wrapCanvasText(
						imageExportCtx,
						`Layer ${index + 1}: ${item.displayName}`,
						textW,
					).slice(0, 2);
					nameLines.forEach((line, lineIndex) => {
						imageExportCtx.fillText(line, textX, cardY + Math.round(24 * canvasScale) + lineIndex * Math.round(18 * canvasScale));
					});

					imageExportCtx.fillStyle = "#334155";
					imageExportCtx.font = `${Math.round(13 * canvasScale)}px Arial, sans-serif`;
					const detailY = cardY + Math.round(58 * canvasScale);
					imageExportCtx.fillText(`Shape Type: ${item.shapeLabel}`, textX, detailY);
					imageExportCtx.fillText(`Fill Color: ${item.style.fillColor || "N/A"}`, textX, detailY + rowGap);
					imageExportCtx.fillText(`Border Color: ${item.style.color || "N/A"}`, textX + Math.round(260 * canvasScale), detailY + rowGap);
					imageExportCtx.fillText(`Fill Opacity: ${item.fillOpacityPercent}%`, textX, detailY + rowGap * 2);
					imageExportCtx.fillText(`Border Opacity: ${item.strokeOpacityPercent}%`, textX + Math.round(260 * canvasScale), detailY + rowGap * 2);
					imageExportCtx.fillText(`Border Width: ${item.strokeWidth}px`, textX, detailY + rowGap * 3);
					imageExportCtx.fillText("Visibility Status: Visible", textX + Math.round(260 * canvasScale), detailY + rowGap * 3);

					y += legendCardHeight + legendGap;
				});

				dataUrl =
					format === "png"
						? imageExportCanvas.toDataURL("image/png")
						: imageExportCanvas.toDataURL("image/jpeg", 0.92);
			} else {
				dataUrl = format === "png" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.92);
			}
			if (format === "jpg" || format === "png") {
				const anchor = document.createElement("a");
				anchor.href = dataUrl;
				anchor.download = `${base}.${format}`;
				anchor.click();
			} else {
				const { jsPDF } = await import("jspdf/dist/jspdf.es.min.js");
				const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
				const pageW = pdf.internal.pageSize.getWidth();
				const pageH = pdf.internal.pageSize.getHeight();
				const margin = 12;
				let cursorY = margin;
				pdf.setFontSize(14);
				pdf.setTextColor(17, 24, 39);
				pdf.text(title, margin, cursorY);
				cursorY += 8;
				pdf.setFontSize(9);
				pdf.setTextColor(71, 85, 105);
				const zoom = typeof map.getZoom === "function" ? String(map.getZoom()) : "—";
				const headLine = `Basemap: ${BASE_MAP_LABELS[baseMapType]}  |  Zoom: ${zoom}`;
				const layersLine =
					selectedLayerLabels.length > 0
						? `Visible KMZ: ${selectedLayerLabels.join(", ")}`
						: "Visible KMZ: (basemap only)";
				const headSplit = pdf.splitTextToSize(headLine, pageW - 2 * margin);
				pdf.text(headSplit, margin, cursorY);
				cursorY += headSplit.length * 4.2;
				const layersSplit = pdf.splitTextToSize(layersLine, pageW - 2 * margin);
				pdf.text(layersSplit, margin, cursorY);
				cursorY += layersSplit.length * 4.2 + 6;
				const maxImgH = pageH - cursorY - margin;
				let imgWmm = pageW - 2 * margin;
				let imgHmm = (canvas.height / canvas.width) * imgWmm;
				if (imgHmm > maxImgH) {
					imgHmm = maxImgH;
					imgWmm = (canvas.width / canvas.height) * imgHmm;
				}
				pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", margin, cursorY, imgWmm, imgHmm);

				pdf.addPage();
				cursorY = margin;
				pdf.setFont("helvetica", "bold");
				pdf.setFontSize(16);
				pdf.setTextColor(15, 23, 42);
				pdf.text("Visible Layers & Styles", margin, cursorY);
				cursorY += 7;
				pdf.setFont("helvetica", "normal");
				pdf.setFontSize(9);
				pdf.setTextColor(71, 85, 105);
				pdf.text(`Only currently visible layers are included. Exported ${timestamp}.`, margin, cursorY);
				cursorY += 8;

				if (exportLegendItems.length === 0) {
					pdf.setFontSize(10);
					pdf.text("No visible GIS layers selected.", margin, cursorY);
				}

				exportLegendItems.forEach((item, index) => {
					const blockX = margin;
					const blockW = pageW - margin * 2;
					const lineHeight = 5.2;
					const nameLines = pdf.splitTextToSize(`Layer ${index + 1}: ${item.displayName}`, blockW - 18);
					const detailLines = [
						`Layer Name: ${item.displayName}`,
						`Shape Type: ${item.shapeLabel}`,
						`Fill Color: ${item.style.fillColor || "N/A"}`,
						`Border Color: ${item.style.color || "N/A"}`,
						`Fill Opacity: ${item.fillOpacityPercent}%`,
						`Border Opacity: ${item.strokeOpacityPercent}%`,
						`Border Width: ${item.strokeWidth}px`,
						"Visibility Status: Visible",
					];
					const blockH = 17 + nameLines.length * lineHeight + detailLines.length * lineHeight;

					if (cursorY + blockH > pageH - margin) {
						pdf.addPage();
						cursorY = margin;
					}

					pdf.setDrawColor(203, 213, 225);
					pdf.setFillColor(248, 250, 252);
					pdf.roundedRect(blockX, cursorY, blockW, blockH, 2, 2, "FD");

					const swatchX = blockX + 4;
					const swatchY = cursorY + 7;
					pdf.setDrawColor(item.style.color || "#334155");
					pdf.setFillColor(item.style.fillColor || "#3388ff");
					pdf.setLineWidth(Math.max(0.3, Math.min(2, item.strokeWidth * 0.2)));
					if (item.type === "line") {
						pdf.line(swatchX, swatchY + 2, swatchX + 9, swatchY + 2);
					} else if (item.type === "point") {
						pdf.circle(swatchX + 4, swatchY + 2, 2.2, "FD");
					} else {
						pdf.rect(swatchX, swatchY, 7, 5, "FD");
					}

					let blockY = cursorY + 7;
					pdf.setFont("helvetica", "bold");
					pdf.setFontSize(11);
					pdf.setTextColor(15, 23, 42);
					pdf.text(nameLines, blockX + 16, blockY);
					blockY += nameLines.length * lineHeight + 3;

					pdf.setFont("helvetica", "normal");
					pdf.setFontSize(9);
					pdf.setTextColor(51, 65, 85);
					detailLines.forEach((detail) => {
						const wrapped = pdf.splitTextToSize(detail, blockW - 20);
						pdf.text(wrapped, blockX + 16, blockY);
						blockY += wrapped.length * lineHeight;
					});

					cursorY += blockH + 5;
				});

				pdf.save(`${base}.pdf`);
			}
		} catch (exportErr) {
			console.error("Map export failed:", exportErr);
			setExportError(
				exportErr instanceof Error
					? exportErr.message
					: "Export failed. Some basemap tiles may block capture in this browser—try another basemap or a different browser.",
			);
		} finally {
			setExporting(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				{showBackButton ? (
					<Link
						href={backHref}
						className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-green-50 rounded-lg transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back
					</Link>
				) : null}
				<div>
					<h1 className="text-2xl font-bold text-gray-900">{title}</h1>
					<p className="text-gray-600 mt-1">{description}</p>
				</div>
			</div>

			{warnings.length > 0 && (
				<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
					<div className="flex items-start gap-3">
						<AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
						<div>
							<p className="text-sm font-medium text-amber-900">Some KMZ files could not be loaded</p>
							<p className="text-sm text-amber-700 mt-1">
								{warnings.map((warning) => warning.displayName).join(", ")}
							</p>
						</div>
					</div>
				</div>
			)}

			<div className={legendDisplayMode === "modal" ? "grid grid-cols-1" : "grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6"}>
				<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
					<div className="border-b border-gray-200 px-6 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<div className="flex flex-wrap items-center gap-3">
							<div className="p-3 bg-cyan-100 rounded-xl">
								<Map className="h-6 w-6 text-cyan-700" />
							</div>
						</div>

						<div className="flex items-center gap-3">
							<div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 p-2">
								{([
									{ id: "satellite", label: "Satellite Map" },
									{ id: "street", label: "Street / Road Map" },
									{ id: "hybrid", label: "Hybrid Map" },
									{ id: "topographic", label: "Topographic Map" },
								] as Array<{ id: BaseMapType; label: string }>).map((mapType) => (
									<button
										key={mapType.id}
										type="button"
										onClick={() => setBaseMapType(mapType.id)}
										className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
											baseMapType === mapType.id
												? "bg-emerald-600 text-white shadow-sm"
												: "bg-white text-gray-700 hover:bg-gray-100"
										}`}
									>
										{mapType.label}
									</button>
								))}
							</div>

							<div className="relative" ref={dropdownRef}>
								<button
									type="button"
									onClick={() => setDropdownOpen((previous) => !previous)}
									className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
								>
									<Layers className="h-4 w-4 mr-2" />
									KMZ Layers
									<span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
										{selectedFiles.size}
									</span>
									<ChevronDown className="h-4 w-4 ml-2" />
								</button>

								{dropdownOpen && (
									<div className="absolute right-0 top-full mt-2 z-[1000] w-80 rounded-xl border border-gray-200 bg-white shadow-xl">
										<div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
											<div>
												<p className="text-sm font-semibold text-gray-900">Select KMZ Files</p>
												<p className="text-xs text-gray-500">Choose one or more layers to display</p>
											</div>
										</div>
										<div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100">
											<button
												type="button"
												onClick={selectAll}
												className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
											>
												Select All
											</button>
											<button
												type="button"
												onClick={clearAll}
												className="text-xs font-medium text-gray-600 hover:text-gray-800"
											>
												Unselect All
											</button>
										</div>
										<div className="max-h-80 overflow-y-auto p-2">
											{orderedFiles.map((file) => {
												const checked = selectedFiles.has(file.fileName);
												return (
													<label
														key={file.fileName}
														className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 cursor-pointer"
													>
														<input
															type="checkbox"
															checked={checked}
															onChange={() => toggleFileSelection(file.fileName)}
															className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
														/>
														<div className="min-w-0 flex-1">
															<p className="text-sm font-medium text-gray-900 truncate">{resolveFilePickerLabel(file)}</p>
															<p className="text-xs text-gray-500">
																{file.totalLayers} layer(s) • {file.totalFeatures} feature(s)
															</p>
														</div>
													</label>
												);
											})}
										</div>
									</div>
								)}
							</div>

							{legendDisplayMode === "modal" ? (
								<button
									type="button"
									onClick={() => setLegendModalOpen(true)}
									className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
								>
									<Square className="h-4 w-4 mr-2" />
									Legends
								</button>
							) : null}

							{enableMapExport ? (
								<div className="relative" ref={exportDropdownRef}>
									<button
										type="button"
										disabled={exporting || !mapLoaded || loading || Boolean(error)}
										onClick={() => {
											setExportError("");
											setExportMenuOpen((previous) => !previous);
										}}
										className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:pointer-events-none"
									>
										{exporting ? (
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										) : (
											<Download className="h-4 w-4 mr-2" />
										)}
										Download
										<ChevronDown className="h-4 w-4 ml-2" />
									</button>
									{exportMenuOpen && !exporting ? (
										<div className="absolute right-0 top-full mt-2 z-[1000] w-52 rounded-xl border border-gray-200 bg-white shadow-xl py-1">
											<button
												type="button"
												className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50"
												onClick={() => void handleMapExport("jpg")}
											>
												Download as JPG
											</button>
											<button
												type="button"
												className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50"
												onClick={() => void handleMapExport("png")}
											>
												Download as PNG
											</button>
											<button
												type="button"
												className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50"
												onClick={() => void handleMapExport("pdf")}
											>
												Download as PDF
											</button>
										</div>
									) : null}
								</div>
							) : null}

							<button
								type="button"
								onClick={() => loadFiles({ preserveSelection: true })}
								className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
							>
								<RefreshCw className="h-4 w-4 mr-2" />
								Refresh
							</button>
						</div>
					</div>
					{enableMapExport && exportError ? (
						<div className="px-6 pb-3">
							<p className="text-xs text-red-600">{exportError}</p>
						</div>
					) : null}

					{layerStyleSettingsPanel ? (
						<div className="border-b border-gray-200 bg-slate-50 px-6 py-4">
							<div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
								<div>
									<button
										type="button"
										onClick={() => setLayerStylePanelOpen((previous) => !previous)}
										className="inline-flex items-center text-sm font-semibold text-gray-900 hover:text-emerald-700"
									>
										{layerStyleSettingsPanel.title ?? "Layer Style Settings"}
										<ChevronDown
											className={`ml-2 h-4 w-4 transition-transform ${layerStylePanelOpen ? "rotate-180" : ""}`}
										/>
									</button>
									<p className="mt-1 text-xs text-gray-600">
										{layerStyleSettingsPanel.description ??
											"Customize each GIS layer color, opacity, stroke width, and visibility."}
									</p>
								</div>
								<button
									type="button"
									onClick={resetAllLayerStyles}
									className="self-start rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:self-auto"
								>
									Reset All Styles
								</button>
							</div>

							{layerStylePanelOpen ? (
								<div className="grid gap-4 xl:grid-cols-2">
									{orderedFiles.map((file, fileIndex) => {
										const layer = file.layers[0];
										if (!layer) return null;

										const style = getEditableLayerStyle(layer, file, fileIndex);
										const checked = selectedFiles.has(file.fileName);

										return (
											<div
												key={file.fileName}
												className={`rounded-xl border bg-white p-4 shadow-sm ${
													checked ? "border-gray-200" : "border-gray-200 opacity-70"
												}`}
											>
												<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
													<div className="min-w-0">
														<div className="flex flex-wrap items-center gap-2">
															<p className="text-sm font-semibold text-gray-900">{resolveFilePickerLabel(file)}</p>
															<span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium capitalize text-gray-600">
																{layer.type}
															</span>
														</div>
														<p className="mt-1 text-xs text-gray-500">
															{file.totalFeatures} feature(s) • {checked ? "Visible" : "Hidden"}
														</p>
													</div>
													<div className="flex items-center gap-3">
														<label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700">
															<input
																type="checkbox"
																checked={checked}
																onChange={() => toggleFileSelection(file.fileName)}
																className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
															/>
															Show
														</label>
														<button
															type="button"
															onClick={() => resetLayerStyle(file.fileName)}
															className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
														>
															Reset
														</button>
													</div>
												</div>

												<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
													<label className="space-y-2">
														<span className="text-xs font-medium text-gray-700">Fill Color</span>
														<div className="flex items-center gap-2">
															<input
																type="color"
																value={style.fillColor}
																onChange={(event) => updateLayerStyle(file, layer, fileIndex, { fillColor: event.target.value })}
																className="h-9 w-12 cursor-pointer rounded border border-gray-200 bg-white p-1"
															/>
															<span className="font-mono text-xs text-gray-600">{style.fillColor}</span>
														</div>
													</label>

													<label className="space-y-2">
														<span className="text-xs font-medium text-gray-700">Stroke Color</span>
														<div className="flex items-center gap-2">
															<input
																type="color"
																value={style.borderColor}
																onChange={(event) => updateLayerStyle(file, layer, fileIndex, { borderColor: event.target.value })}
																className="h-9 w-12 cursor-pointer rounded border border-gray-200 bg-white p-1"
															/>
															<span className="font-mono text-xs text-gray-600">{style.borderColor}</span>
														</div>
													</label>

													<label className="space-y-2">
														<span className="flex items-center justify-between text-xs font-medium text-gray-700">
															Fill Opacity <span>{style.fillOpacityPercent}%</span>
														</span>
														<input
															type="range"
															min="0"
															max="100"
															value={style.fillOpacityPercent}
															onChange={(event) =>
																updateLayerStyle(file, layer, fileIndex, {
																	fillOpacityPercent: clampNumber(Number(event.target.value), 0, 100),
																})
															}
															className="w-full accent-emerald-600"
														/>
														<input
															type="number"
															min="0"
															max="100"
															value={style.fillOpacityPercent}
															onChange={(event) =>
																updateLayerStyle(file, layer, fileIndex, {
																	fillOpacityPercent: clampNumber(Number(event.target.value), 0, 100),
																})
															}
															className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
														/>
													</label>

													<label className="space-y-2">
														<span className="flex items-center justify-between text-xs font-medium text-gray-700">
															Stroke Opacity <span>{style.borderOpacityPercent}%</span>
														</span>
														<input
															type="range"
															min="0"
															max="100"
															value={style.borderOpacityPercent}
															onChange={(event) =>
																updateLayerStyle(file, layer, fileIndex, {
																	borderOpacityPercent: clampNumber(Number(event.target.value), 0, 100),
																})
															}
															className="w-full accent-emerald-600"
														/>
														<input
															type="number"
															min="0"
															max="100"
															value={style.borderOpacityPercent}
															onChange={(event) =>
																updateLayerStyle(file, layer, fileIndex, {
																	borderOpacityPercent: clampNumber(Number(event.target.value), 0, 100),
																})
															}
															className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
														/>
													</label>

													<label className="space-y-2">
														<span className="flex items-center justify-between text-xs font-medium text-gray-700">
															Stroke Width <span>{style.borderWidth}px</span>
														</span>
														<input
															type="range"
															min="1"
															max="12"
															value={style.borderWidth}
															onChange={(event) =>
																updateLayerStyle(file, layer, fileIndex, {
																	borderWidth: clampNumber(Number(event.target.value), 1, 12),
																})
															}
															className="w-full accent-emerald-600"
														/>
														<input
															type="number"
															min="1"
															max="12"
															value={style.borderWidth}
															onChange={(event) =>
																updateLayerStyle(file, layer, fileIndex, {
																	borderWidth: clampNumber(Number(event.target.value), 1, 12),
																})
															}
															className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
														/>
													</label>
												</div>
											</div>
										);
									})}
								</div>
							) : null}
						</div>
					) : null}

					<div className="relative h-[650px]">
						{(!mapLoaded || loading) && (
							<div className="absolute inset-0 z-[999] flex items-center justify-center bg-gray-50">
								<div className="text-center">
									<RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-2" />
									<p className="text-sm text-gray-600">
										{loading ? "Loading KMZ files..." : "Preparing map..."}
									</p>
								</div>
							</div>
						)}

						{error ? (
							<div className="absolute inset-0 z-[999] flex items-center justify-center bg-red-50 px-6">
								<div className="text-center max-w-md">
									<AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
									<p className="text-base font-semibold text-red-900">Unable to load GIS KMZ Maps</p>
									<p className="text-sm text-red-700 mt-1">{error}</p>
								</div>
							</div>
						) : null}

						{!loading && !error && selectedFileData.length === 0 && (
							<div className="absolute inset-0 z-[999] flex items-center justify-center bg-gray-50 px-6">
								<div className="text-center max-w-md">
									<MapPinned className="h-10 w-10 text-gray-400 mx-auto mb-3" />
									<p className="text-base font-semibold text-gray-900">No KMZ file selected</p>
									<p className="text-sm text-gray-600 mt-1">
										Open the KMZ Layers dropdown and select one or more files to display on the map.
									</p>
								</div>
							</div>
						)}

						<div ref={mapContainerRef} className="absolute inset-0">
							{showInlineExportLegend ? (
								<div
									className="pointer-events-none absolute bottom-4 right-4 z-[1000] max-w-[400px] rounded-xl p-4"
									style={{
										backgroundColor: "rgba(255, 255, 255, 0.98)",
										border: "2px solid rgb(15, 118, 110)",
										boxShadow: "0 20px 50px rgba(15, 23, 42, 0.28)",
										color: "rgb(15, 23, 42)",
									}}
								>
									<div className="mb-3 pb-2" style={{ borderBottom: "2px solid rgb(204, 251, 241)" }}>
										<p
											className="uppercase tracking-[0.12em]"
											style={{
												color: "rgb(15, 118, 110)",
												fontSize: 12,
												fontWeight: 800,
												lineHeight: 1.2,
											}}
										>
											Paniala GIS Map Legend
										</p>
										<p
											className="mt-1"
											style={{
												color: "rgb(2, 6, 23)",
												fontSize: 14,
												fontWeight: 700,
												lineHeight: 1.25,
											}}
										>
											Visible Layers & Styles
										</p>
										<p className="mt-0.5" style={{ color: "rgb(71, 85, 105)", fontSize: 11 }}>
											{title} | Exported {formatExportTimestamp()}
										</p>
									</div>

									{exportLegendItems.length > 0 ? (
										<div className="max-h-[330px] space-y-2 overflow-hidden">
											{exportLegendItems.map((item) => (
												<div key={item.key} className="grid grid-cols-[28px_minmax(0,1fr)] gap-2">
													<div
														className="flex h-7 w-7 items-center justify-center rounded-md"
														style={{
															backgroundColor: "rgb(248, 250, 252)",
															border: "1px solid rgb(226, 232, 240)",
														}}
													>
														{item.type === "line" ? (
															<div
																className="h-1.5 w-5 rounded-full"
																style={{
																	backgroundColor: hexToRgba(
																		item.style.color,
																		item.strokeOpacityPercent / 100,
																	),
																}}
															/>
														) : item.type === "point" ? (
															<div
																className="h-3.5 w-3.5 rounded-full"
																style={{
																	backgroundColor: hexToRgba(
																		item.style.fillColor,
																		item.fillOpacityPercent / 100,
																	),
																	border: `${Math.max(1, Math.min(3, item.strokeWidth))}px solid ${hexToRgba(
																		item.style.color,
																		item.strokeOpacityPercent / 100,
																	)}`,
																}}
															/>
														) : (
															<div
																className="h-4 w-4 rounded-sm"
																style={{
																	backgroundColor: hexToRgba(
																		item.style.fillColor,
																		item.fillOpacityPercent / 100,
																	),
																	border: `${Math.max(1, Math.min(3, item.strokeWidth))}px solid ${hexToRgba(
																		item.style.color,
																		item.strokeOpacityPercent / 100,
																	)}`,
																}}
															/>
														)}
													</div>
													<div className="min-w-0">
														<p
															className="truncate font-semibold"
															style={{ color: "rgb(2, 6, 23)", fontSize: 12, lineHeight: 1.25 }}
														>
															{item.displayName}
														</p>
														<p style={{ color: "rgb(51, 65, 85)", fontSize: 11, lineHeight: 1.35 }}>
															{item.shapeLabel} | {item.boundaryLabel}: {item.strokeWidth}px | Fill{" "}
															{item.fillOpacityPercent}% | Stroke {item.strokeOpacityPercent}%
														</p>
													</div>
												</div>
											))}
										</div>
									) : (
										<p className="text-xs" style={{ color: "rgb(71, 85, 105)" }}>
											No visible GIS layers selected.
										</p>
									)}
								</div>
							) : null}
						</div>
					</div>
				</div>

				{legendDisplayMode === "sidebar" ? (
				<div className="space-y-6">
					<div className="bg-white rounded-xl border border-gray-200 shadow-sm">
						<div className="p-5 space-y-3 max-h-[460px] overflow-y-auto">
							{selectedFileData.length === 0 ? (
								<p className="text-sm text-gray-500">Legends will appear after selecting KMZ files.</p>
							) : (
								legendItems.map((item) => (
											<div key={item.key} className="flex items-center gap-3">
												<div className="flex items-center justify-center h-6 w-6 rounded bg-gray-100 border border-gray-200">
													{item.type === "line" ? (
														<div
															className="h-1.5 w-4 rounded-full"
															style={{ backgroundColor: item.style.color }}
														/>
													) : item.type === "point" ? (
														<div
															className="h-3 w-3 rounded-full"
															style={{ backgroundColor: item.style.fillColor, border: `2px solid ${item.style.color}` }}
														/>
													) : (
														<Square className="h-4 w-4" style={{ color: item.style.fillColor }} />
													)}
												</div>
												<p className="text-sm font-medium text-gray-900 truncate">{item.displayName}</p>
											</div>
								))
							)}
						</div>
					</div>
				</div>
				) : null}
			</div>

			{legendDisplayMode === "modal" && legendModalOpen ? (
				<div className="fixed inset-0 z-[1200] bg-slate-950/40 backdrop-blur-[2px]">
					<div className="flex h-full justify-start">
						<div className="relative h-full w-full max-w-xl border-r border-emerald-200 bg-gradient-to-b from-[#f4fbf7] via-white to-[#f7fbff] shadow-2xl">
							<div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 px-6 py-5 text-white">
								<div className="flex items-start justify-between gap-4">
									<div>
										<p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">
											{legendsModalBrandLabel}
										</p>
										<h2 className="mt-2 text-2xl font-semibold">Legends</h2>
										<p className="mt-1 text-sm text-emerald-50/90">
											Clear visual references for the currently visible GIS layers.
										</p>
									</div>
									<button
										type="button"
										onClick={() => setLegendModalOpen(false)}
										className="rounded-xl border border-white/20 bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
										aria-label="Close legends"
									>
										<X className="h-5 w-5" />
									</button>
								</div>
							</div>

							<div className="border-b border-slate-200 bg-white/80 px-6 py-3">
								<p className="text-sm text-slate-600">
									Visible legends: <span className="font-semibold text-slate-900">{legendItems.length}</span>
								</p>
							</div>

							<div className="h-[calc(100%-132px)] overflow-y-auto px-6 py-5">
								{legendItems.length === 0 ? (
									<div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-5 py-8 text-center">
										<p className="text-sm font-medium text-slate-700">No legends available right now</p>
										<p className="mt-1 text-sm text-slate-500">
											Select one or more KMZ files to view their legend items here.
										</p>
									</div>
								) : (
									<div className="space-y-3">
										{legendItems.map((item) => (
											<div
												key={item.key}
												className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
											>
												<div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
													{item.type === "line" ? (
														<div
															className="h-1.5 w-5 rounded-full"
															style={{ backgroundColor: item.style.color }}
														/>
													) : item.type === "point" ? (
														<div
															className="h-3.5 w-3.5 rounded-full"
															style={{ backgroundColor: item.style.fillColor, border: `2px solid ${item.style.color}` }}
														/>
													) : (
														<Square className="h-4 w-4" style={{ color: item.style.fillColor }} />
													)}
												</div>
												<p className="text-sm font-semibold text-slate-900">{item.displayName}</p>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
						<button
							type="button"
							onClick={() => setLegendModalOpen(false)}
							className="flex-1 cursor-default"
							aria-label="Close legends overlay"
						/>
					</div>
				</div>
			) : null}
		</div>
	);
}
