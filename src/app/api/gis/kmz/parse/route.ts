import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { parseStringPromise } from "xml2js";

/**
 * API route to parse KMZ files into GeoJSON layers
 * KMZ files are ZIP archives containing KML files and related assets
 */

// For App Router - set max duration to 5 minutes for large files
export const maxDuration = 300; // 5 minutes (allows processing of large KMZ files)

interface GeoJSONFeature {
	type: "Feature";
	geometry: {
		type: string;
		coordinates: any;
	};
	properties: Record<string, any>;
}

interface GeoJSON {
	type: "FeatureCollection";
	features: GeoJSONFeature[];
}

interface Layer {
	id: string;
	name: string;
	type: "polygon" | "line" | "point" | "mixed";
	geojson: GeoJSON;
	bounds: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
	defaultVisible: boolean;
	style?: {
		color?: string;
		fillColor?: string;
		fillOpacity?: number;
		weight?: number;
	};
}

interface ParsedKMZ {
	layers: Layer[];
	sourceName: string;
}

/**
 * Convert KML coordinates string to GeoJSON coordinates
 */
function parseCoordinates(coordsString: string, geometryType: string): any {
	if (!coordsString) {
		console.warn('[Coords Parser] Empty coordinate string');
		return geometryType === 'Point' ? [0, 0] : [];
	}
	
	// Clean up the coordinate string - handle various whitespace and newlines
	const cleanedString = coordsString.trim().replace(/\s+/g, ' ');
	
	const coords = cleanedString
		.split(/[\s\n]+/)
		.map(coord => {
			const trimmed = coord.trim();
			if (!trimmed) return null;
			
			const parts = trimmed.split(',');
			if (parts.length < 2) return null;
			
			const lng = parseFloat(parts[0]);
			const lat = parseFloat(parts[1]);
			// const alt = parts[2] ? parseFloat(parts[2]) : 0; // Altitude (optional)
			
			if (isNaN(lng) || isNaN(lat)) return null;
			
			return [lng, lat]; // [lng, lat] - GeoJSON format
		})
		.filter(coord => coord !== null) as [number, number][];

	if (coords.length === 0) {
		console.warn('[Coords Parser] No valid coordinates parsed from:', coordsString.substring(0, 100));
		return geometryType === 'Point' ? [0, 0] : [];
	}

	if (geometryType === 'Point') {
		return coords[0] || [0, 0];
	} else if (geometryType === 'LineString') {
		return coords;
	} else if (geometryType === 'Polygon') {
		return [coords]; // Outer ring
	}
	return coords;
}

/**
 * Extract style information from KML placemark
 */
function extractStyle(placemark: any): any {
	const style: any = {};
	
	// Check for inline Style
	if (placemark.Style && Array.isArray(placemark.Style) && placemark.Style[0]) {
		const styleObj = placemark.Style[0];
		
		// LineStyle
		if (styleObj.LineStyle && styleObj.LineStyle[0]) {
			const lineStyle = styleObj.LineStyle[0];
			if (lineStyle.color && lineStyle.color[0]) {
				style.color = kmlColorToHex(lineStyle.color[0]);
			}
			if (lineStyle.width && lineStyle.width[0]) {
				style.weight = parseFloat(lineStyle.width[0]);
			}
		}
		
		// PolyStyle
		if (styleObj.PolyStyle && styleObj.PolyStyle[0]) {
			const polyStyle = styleObj.PolyStyle[0];
			if (polyStyle.color && polyStyle.color[0]) {
				style.fillColor = kmlColorToHex(polyStyle.color[0]);
			}
			if (polyStyle.fill && polyStyle.fill[0] === '0') {
				style.fillOpacity = 0;
			} else {
				style.fillOpacity = 0.5;
			}
		}
	}
	
	return Object.keys(style).length > 0 ? style : undefined;
}

/**
 * Convert KML color (aabbggrr) to hex color (#rrggbb)
 */
function kmlColorToHex(kmlColor: string): string {
	if (kmlColor.length === 8) {
		const aa = kmlColor.substring(0, 2);
		const bb = kmlColor.substring(2, 4);
		const gg = kmlColor.substring(4, 6);
		const rr = kmlColor.substring(6, 8);
		return `#${rr}${gg}${bb}`;
	}
	return '#3388ff'; // Default blue
}

/**
 * Parse KML Placemark to GeoJSON Feature
 */
function parsePlacemark(placemark: any): GeoJSONFeature | null {
	const properties: Record<string, any> = {};
	
	// Extract name
	if (placemark.name && placemark.name[0]) {
		properties.name = placemark.name[0];
	}
	
	// Extract description
	if (placemark.description && placemark.description[0]) {
		properties.description = placemark.description[0];
	}
	
	// Extract ExtendedData
	if (placemark.ExtendedData && placemark.ExtendedData[0] && placemark.ExtendedData[0].Data) {
		const dataArray = placemark.ExtendedData[0].Data;
		dataArray.forEach((data: any) => {
			const name = data.$.name;
			const value = data.value && data.value[0];
			if (name && value) {
				properties[name] = value;
			}
		});
	}
	
	let geometry: any = null;
	let geometryType = 'Point';
	
	// Parse Point
	if (placemark.Point && placemark.Point[0] && placemark.Point[0].coordinates) {
		geometryType = 'Point';
		const coords = parseCoordinates(placemark.Point[0].coordinates[0], 'Point');
		geometry = {
			type: 'Point',
			coordinates: coords
		};
	}
	// Parse LineString
	else if (placemark.LineString && placemark.LineString[0] && placemark.LineString[0].coordinates) {
		geometryType = 'LineString';
		const coords = parseCoordinates(placemark.LineString[0].coordinates[0], 'LineString');
		geometry = {
			type: 'LineString',
			coordinates: coords
		};
	}
	// Parse Polygon
	else if (placemark.Polygon && placemark.Polygon[0]) {
		geometryType = 'Polygon';
		const polygon = placemark.Polygon[0];
		
		// Outer boundary
		let outerCoords: any[] = [];
		if (polygon.outerBoundaryIs && polygon.outerBoundaryIs[0] && 
				polygon.outerBoundaryIs[0].LinearRing && polygon.outerBoundaryIs[0].LinearRing[0] &&
				polygon.outerBoundaryIs[0].LinearRing[0].coordinates) {
			outerCoords = parseCoordinates(
				polygon.outerBoundaryIs[0].LinearRing[0].coordinates[0], 
				'Polygon'
			);
		}
		
		geometry = {
			type: 'Polygon',
			coordinates: outerCoords
		};
	}
	// Parse MultiGeometry
	else if (placemark.MultiGeometry && placemark.MultiGeometry[0]) {
		// For now, we'll handle the first geometry in MultiGeometry
		const multi = placemark.MultiGeometry[0];
		if (multi.Point && multi.Point[0] && multi.Point[0].coordinates) {
			geometryType = 'Point';
			const coords = parseCoordinates(multi.Point[0].coordinates[0], 'Point');
			geometry = {
				type: 'Point',
				coordinates: coords
			};
		} else if (multi.LineString && multi.LineString[0] && multi.LineString[0].coordinates) {
			geometryType = 'LineString';
			const coords = parseCoordinates(multi.LineString[0].coordinates[0], 'LineString');
			geometry = {
				type: 'LineString',
				coordinates: coords
			};
		} else if (multi.Polygon && multi.Polygon[0]) {
			geometryType = 'Polygon';
			const polygon = multi.Polygon[0];
			let outerCoords: any[] = [];
			if (polygon.outerBoundaryIs && polygon.outerBoundaryIs[0] && 
					polygon.outerBoundaryIs[0].LinearRing && polygon.outerBoundaryIs[0].LinearRing[0] &&
					polygon.outerBoundaryIs[0].LinearRing[0].coordinates) {
				outerCoords = parseCoordinates(
					polygon.outerBoundaryIs[0].LinearRing[0].coordinates[0], 
					'Polygon'
				);
			}
			geometry = {
				type: 'Polygon',
				coordinates: outerCoords
			};
		}
	}
	
	if (!geometry) {
		// Log what we found for debugging
		const hasPoint = placemark.Point ? 'Yes' : 'No';
		const hasLine = placemark.LineString ? 'Yes' : 'No';
		const hasPoly = placemark.Polygon ? 'Yes' : 'No';
		const hasMulti = placemark.MultiGeometry ? 'Yes' : 'No';
		console.warn(`[Placemark] No geometry extracted. Point: ${hasPoint}, Line: ${hasLine}, Polygon: ${hasPoly}, Multi: ${hasMulti}`);
		return null;
	}
	
	// Add style to properties
	const style = extractStyle(placemark);
	if (style) {
		properties._style = style;
	}
	
	return {
		type: 'Feature',
		geometry,
		properties
	};
}

/**
 * Calculate bounding box for a GeoJSON FeatureCollection
 */
function calculateBounds(geojson: GeoJSON): [number, number, number, number] {
	let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
	
	geojson.features.forEach(feature => {
		const extractCoords = (coords: any, depth: number = 0): void => {
			if (depth === 0 && feature.geometry.type === 'Point') {
				const [lng, lat] = coords;
				minLng = Math.min(minLng, lng);
				minLat = Math.min(minLat, lat);
				maxLng = Math.max(maxLng, lng);
				maxLat = Math.max(maxLat, lat);
			} else if (Array.isArray(coords)) {
				if (Array.isArray(coords[0])) {
					coords.forEach(c => extractCoords(c, depth + 1));
				} else if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
					const [lng, lat] = coords;
					minLng = Math.min(minLng, lng);
					minLat = Math.min(minLat, lat);
					maxLng = Math.max(maxLng, lng);
					maxLat = Math.max(maxLat, lat);
				}
			}
		};
		
		extractCoords(feature.geometry.coordinates);
	});
	
	// Fallback if no valid coordinates found
	if (!isFinite(minLng) || !isFinite(minLat) || !isFinite(maxLng) || !isFinite(maxLat)) {
		return [70.0, 31.0, 71.0, 32.0]; // Default to approximate DIK area
	}
	
	return [minLng, minLat, maxLng, maxLat];
}

/**
 * Determine geometry type of a layer
 */
function getLayerType(geojson: GeoJSON): "polygon" | "line" | "point" | "mixed" {
	const types = new Set(geojson.features.map(f => f.geometry.type));
	
	if (types.size === 0) return 'point';
	if (types.size === 1) {
		const type = Array.from(types)[0];
		if (type === 'Polygon' || type === 'MultiPolygon') return 'polygon';
		if (type === 'LineString' || type === 'MultiLineString') return 'line';
		if (type === 'Point' || type === 'MultiPoint') return 'point';
	}
	
	return 'mixed';
}

/**
 * Recursively extract placemarks from any KML structure
 */
function extractPlacemarksRecursive(obj: any, parentName: string = ''): { name: string, placemarks: any[] }[] {
	const result: { name: string, placemarks: any[] }[] = [];
	
	if (!obj || typeof obj !== 'object') return result;
	
	// Check if this object has placemarks
	if (obj.Placemark && Array.isArray(obj.Placemark) && obj.Placemark.length > 0) {
		const name = obj.name && obj.name[0] ? obj.name[0] : parentName || 'Unnamed Layer';
		result.push({
			name,
			placemarks: obj.Placemark
		});
	}
	
	// Recursively check Folder elements
	if (obj.Folder && Array.isArray(obj.Folder)) {
		obj.Folder.forEach((folder: any, index: number) => {
			const folderName = folder.name && folder.name[0] ? folder.name[0] : `${parentName} Folder ${index + 1}`;
			const subResults = extractPlacemarksRecursive(folder, folderName);
			result.push(...subResults);
		});
	}
	
	// Check Document
	if (obj.Document && Array.isArray(obj.Document)) {
		obj.Document.forEach((doc: any) => {
			const docName = doc.name && doc.name[0] ? doc.name[0] : parentName || 'Document';
			const subResults = extractPlacemarksRecursive(doc, docName);
			result.push(...subResults);
		});
	}
	
	return result;
}

/**
 * Parse KML Document or Folder into layers
 */
function parseKMLLayers(kmlData: any): Layer[] {
	const layers: Layer[] = [];
	
	console.log('[KML Parser] Starting to parse KML data...');
	
	// Check if we have valid KML structure
	if (!kmlData || !kmlData.kml) {
		console.error('[KML Parser] No kml root element found');
		return layers;
	}
	
	console.log('[KML Parser] KML root found, keys:', Object.keys(kmlData.kml));
	
	// Try to extract placemarks from anywhere in the structure
	const placemarkGroups = extractPlacemarksRecursive(kmlData.kml, '');
	
	console.log('[KML Parser] Found', placemarkGroups.length, 'placemark groups');
	
	// Convert each group into a layer
	placemarkGroups.forEach((group, groupIndex) => {
		console.log(`[KML Parser] Processing group "${group.name}" with ${group.placemarks.length} placemarks`);
		
		const features: GeoJSONFeature[] = [];
		let successCount = 0;
		let failCount = 0;
		
		group.placemarks.forEach((placemark: any, pmIndex: number) => {
			try {
				const feature = parsePlacemark(placemark);
				if (feature) {
					features.push(feature);
					successCount++;
				} else {
					failCount++;
					console.warn(`[KML Parser] Placemark ${pmIndex} in "${group.name}" returned null`);
				}
			} catch (error) {
				failCount++;
				console.error(`[KML Parser] Error parsing placemark ${pmIndex} in "${group.name}":`, error);
			}
		});
		
		console.log(`[KML Parser] Group "${group.name}": ${successCount} features parsed, ${failCount} failed`);
		
		if (features.length > 0) {
			const geojson: GeoJSON = {
				type: 'FeatureCollection',
				features
			};
			
			// Extract style from first feature if available
			const firstFeatureStyle = features[0]?.properties?._style;
			
			// Assign default colors based on geometry type if no style
			const layerType = getLayerType(geojson);
			const defaultStyle = !firstFeatureStyle ? {
				color: layerType === 'polygon' ? '#3388ff' :
					     layerType === 'line' ? '#ff7800' :
					     '#38761d',
				fillColor: layerType === 'polygon' ? '#3388ff' :
					         layerType === 'line' ? '#ff7800' :
					         '#38761d',
				fillOpacity: 0.3,
				weight: 2
			} : undefined;
			
			const layer: Layer = {
				id: `layer-${groupIndex}`,
				name: group.name,
				type: layerType,
				geojson,
				bounds: calculateBounds(geojson),
				defaultVisible: true,
				style: firstFeatureStyle || defaultStyle
			};
			
			layers.push(layer);
			console.log(`[KML Parser] Added layer "${group.name}" with ${features.length} features`);
		} else {
			console.warn(`[KML Parser] Group "${group.name}" had no valid features`);
		}
	});
	
	console.log('[KML Parser] Total layers created:', layers.length);
	return layers;
}

/**
 * Main POST handler for KMZ parsing
 */
export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const kmzFile = formData.get('file') as File;
		
		if (!kmzFile) {
			return NextResponse.json({
				success: false,
				message: "No KMZ file provided"
			}, { status: 400 });
		}
		
		// Validate file extension
		const fileName = kmzFile.name.toLowerCase();
		if (!fileName.endsWith('.kmz') && !fileName.endsWith('.kml')) {
			return NextResponse.json({
				success: false,
				message: "File must be a KMZ or KML file"
			}, { status: 400 });
		}
		
		// Validate file size (500MB limit for large GIS files)
		const maxSize = 500 * 1024 * 1024; // 500MB
		if (kmzFile.size > maxSize) {
			return NextResponse.json({
				success: false,
				message: `File size must be less than 500MB. Your file is ${(kmzFile.size / (1024 * 1024)).toFixed(2)}MB`
			}, { status: 400 });
		}
		
		console.log(`[KMZ Parse] Processing file: ${kmzFile.name} (${(kmzFile.size / (1024 * 1024)).toFixed(2)}MB)`);
		
		
		// Read file buffer
		const arrayBuffer = await kmzFile.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		
		let kmlContent: string;
		
		// If KMZ, extract KML from ZIP
		if (fileName.endsWith('.kmz')) {
			try {
				const zip = new AdmZip(buffer);
				const zipEntries = zip.getEntries();
				
				// Find .kml file in the archive
				const kmlEntry = zipEntries.find(entry => 
					entry.entryName.toLowerCase().endsWith('.kml') && !entry.isDirectory
				);
				
				if (!kmlEntry) {
					return NextResponse.json({
						success: false,
						message: "No KML file found in KMZ archive"
					}, { status: 400 });
				}
				
				kmlContent = kmlEntry.getData().toString('utf8');
			} catch (error) {
				console.error("Error extracting KMZ:", error);
				return NextResponse.json({
					success: false,
					message: "Failed to extract KMZ file"
				}, { status: 500 });
			}
		} else {
			// Direct KML file
			kmlContent = buffer.toString('utf8');
		}
		
		// Parse KML XML to JavaScript object
		let kmlData: any;
		try {
			kmlData = await parseStringPromise(kmlContent, {
				explicitArray: true,
				mergeAttrs: false,
				explicitRoot: true
			});
			console.log('[KMZ Parse] KML parsed successfully. Root keys:', Object.keys(kmlData));
		} catch (error) {
			console.error("[KMZ Parse] Error parsing KML:", error);
			return NextResponse.json({
				success: false,
				message: "Failed to parse KML content: " + (error instanceof Error ? error.message : 'Unknown error')
			}, { status: 500 });
		}
		
		// Log a sample of the KML structure for debugging
		try {
			if (kmlData.kml) {
				console.log('[KMZ Parse] KML structure - kml keys:', Object.keys(kmlData.kml));
				if (kmlData.kml.Document) {
					console.log('[KMZ Parse] Document found, keys:', Object.keys(kmlData.kml.Document[0] || {}));
				}
			}
		} catch (e) {
			console.log('[KMZ Parse] Could not log KML structure');
		}
		
		// Extract layers from KML
		const layers = parseKMLLayers(kmlData);
		
		if (layers.length === 0) {
			console.error('[KMZ Parse] No layers extracted from KML');
			
			// Provide more helpful error message
			let debugInfo = 'KML structure: ';
			try {
				if (!kmlData.kml) debugInfo += 'No <kml> root. ';
				else if (!kmlData.kml.Document && !kmlData.kml.Folder) debugInfo += 'No <Document> or <Folder> found. ';
				else debugInfo += 'Found structure but no Placemarks with valid geometry. ';
			} catch (e) {
				debugInfo += 'Unable to analyze. ';
			}
			
			return NextResponse.json({
				success: false,
				message: "No valid layers found in KML file. " + debugInfo + "The file may have an unsupported structure or contain no geographic features."
			}, { status: 400 });
		}
		
		console.log(`[KMZ Parse] Successfully extracted ${layers.length} layer(s)`);
		layers.forEach((layer, i) => {
			console.log(`  Layer ${i + 1}: "${layer.name}" - ${layer.geojson.features.length} features (${layer.type})`);
		});
		
		const result: ParsedKMZ = {
			layers,
			sourceName: kmzFile.name
		};
		
		return NextResponse.json({
			success: true,
			data: result
		});
		
	} catch (error) {
		console.error("Error processing KMZ file:", error);
		return NextResponse.json({
			success: false,
			message: "Failed to process KMZ file",
			error: error instanceof Error ? error.message : "Unknown error"
		}, { status: 500 });
	}
}
