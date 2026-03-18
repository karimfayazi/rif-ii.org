import AdmZip from "adm-zip";
import { parseStringPromise } from "xml2js";

export interface GeoJSONFeature {
	type: "Feature";
	geometry: {
		type: string;
		coordinates: any;
	};
	properties: Record<string, any>;
}

export interface GeoJSON {
	type: "FeatureCollection";
	features: GeoJSONFeature[];
}

export interface KMZLayer {
	id: string;
	name: string;
	type: "polygon" | "line" | "point" | "mixed";
	geojson: GeoJSON;
	bounds: [number, number, number, number];
	defaultVisible: boolean;
	style?: {
		color?: string;
		fillColor?: string;
		fillOpacity?: number;
		weight?: number;
	};
}

export interface ParsedKMZ {
	layers: KMZLayer[];
	sourceName: string;
}

function parseCoordinates(coordsString: string, geometryType: string): any {
	if (!coordsString) {
		return geometryType === "Point" ? [0, 0] : [];
	}

	const cleanedString = coordsString.trim().replace(/\s+/g, " ");

	const coords = cleanedString
		.split(/[\s\n]+/)
		.map((coord) => {
			const trimmed = coord.trim();
			if (!trimmed) return null;

			const parts = trimmed.split(",");
			if (parts.length < 2) return null;

			const lng = parseFloat(parts[0]);
			const lat = parseFloat(parts[1]);

			if (Number.isNaN(lng) || Number.isNaN(lat)) return null;

			return [lng, lat];
		})
		.filter((coord): coord is [number, number] => coord !== null);

	if (coords.length === 0) {
		return geometryType === "Point" ? [0, 0] : [];
	}

	if (geometryType === "Point") return coords[0] || [0, 0];
	if (geometryType === "LineString") return coords;
	if (geometryType === "Polygon") return [coords];

	return coords;
}

function kmlColorToHex(kmlColor: string): string {
	if (kmlColor.length === 8) {
		const bb = kmlColor.substring(2, 4);
		const gg = kmlColor.substring(4, 6);
		const rr = kmlColor.substring(6, 8);
		return `#${rr}${gg}${bb}`;
	}

	return "#3388ff";
}

function extractStyle(placemark: any) {
	const style: NonNullable<KMZLayer["style"]> = {};

	if (placemark.Style && Array.isArray(placemark.Style) && placemark.Style[0]) {
		const styleObj = placemark.Style[0];

		if (styleObj.LineStyle && styleObj.LineStyle[0]) {
			const lineStyle = styleObj.LineStyle[0];
			if (lineStyle.color?.[0]) {
				style.color = kmlColorToHex(lineStyle.color[0]);
			}
			if (lineStyle.width?.[0]) {
				style.weight = parseFloat(lineStyle.width[0]);
			}
		}

		if (styleObj.PolyStyle && styleObj.PolyStyle[0]) {
			const polyStyle = styleObj.PolyStyle[0];
			if (polyStyle.color?.[0]) {
				style.fillColor = kmlColorToHex(polyStyle.color[0]);
			}
			style.fillOpacity = polyStyle.fill?.[0] === "0" ? 0 : 0.5;
		}
	}

	return Object.keys(style).length > 0 ? style : undefined;
}

function parsePlacemark(placemark: any): GeoJSONFeature | null {
	const properties: Record<string, any> = {};

	if (placemark.name?.[0]) {
		properties.name = placemark.name[0];
	}

	if (placemark.description?.[0]) {
		properties.description = placemark.description[0];
	}

	if (placemark.ExtendedData?.[0]?.Data) {
		const dataArray = placemark.ExtendedData[0].Data;
		dataArray.forEach((data: any) => {
			const name = data.$?.name;
			const value = data.value?.[0];
			if (name && value) {
				properties[name] = value;
			}
		});
	}

	let geometry: GeoJSONFeature["geometry"] | null = null;
	let geometryType = "Point";

	if (placemark.Point?.[0]?.coordinates?.[0]) {
		geometryType = "Point";
		geometry = {
			type: "Point",
			coordinates: parseCoordinates(placemark.Point[0].coordinates[0], "Point"),
		};
	} else if (placemark.LineString?.[0]?.coordinates?.[0]) {
		geometryType = "LineString";
		geometry = {
			type: "LineString",
			coordinates: parseCoordinates(placemark.LineString[0].coordinates[0], "LineString"),
		};
	} else if (placemark.Polygon?.[0]) {
		geometryType = "Polygon";
		const polygon = placemark.Polygon[0];
		let outerCoords: any[] = [];

		if (polygon.outerBoundaryIs?.[0]?.LinearRing?.[0]?.coordinates?.[0]) {
			outerCoords = parseCoordinates(
				polygon.outerBoundaryIs[0].LinearRing[0].coordinates[0],
				"Polygon",
			);
		}

		geometry = {
			type: "Polygon",
			coordinates: outerCoords,
		};
	} else if (placemark.MultiGeometry?.[0]) {
		const multi = placemark.MultiGeometry[0];

		if (multi.Point?.[0]?.coordinates?.[0]) {
			geometryType = "Point";
			geometry = {
				type: "Point",
				coordinates: parseCoordinates(multi.Point[0].coordinates[0], "Point"),
			};
		} else if (multi.LineString?.[0]?.coordinates?.[0]) {
			geometryType = "LineString";
			geometry = {
				type: "LineString",
				coordinates: parseCoordinates(multi.LineString[0].coordinates[0], "LineString"),
			};
		} else if (multi.Polygon?.[0]) {
			geometryType = "Polygon";
			const polygon = multi.Polygon[0];
			let outerCoords: any[] = [];

			if (polygon.outerBoundaryIs?.[0]?.LinearRing?.[0]?.coordinates?.[0]) {
				outerCoords = parseCoordinates(
					polygon.outerBoundaryIs[0].LinearRing[0].coordinates[0],
					"Polygon",
				);
			}

			geometry = {
				type: "Polygon",
				coordinates: outerCoords,
			};
		}
	}

	if (!geometry) {
		return null;
	}

	const style = extractStyle(placemark);
	if (style) {
		properties._style = style;
	}

	return {
		type: "Feature",
		geometry,
		properties,
	};
}

function calculateBounds(geojson: GeoJSON): [number, number, number, number] {
	let minLng = Infinity;
	let minLat = Infinity;
	let maxLng = -Infinity;
	let maxLat = -Infinity;

	geojson.features.forEach((feature) => {
		const extractCoords = (coords: any): void => {
			if (!Array.isArray(coords)) return;

			if (typeof coords[0] === "number" && typeof coords[1] === "number") {
				const [lng, lat] = coords;
				minLng = Math.min(minLng, lng);
				minLat = Math.min(minLat, lat);
				maxLng = Math.max(maxLng, lng);
				maxLat = Math.max(maxLat, lat);
				return;
			}

			coords.forEach((child) => extractCoords(child));
		};

		extractCoords(feature.geometry.coordinates);
	});

	if (!Number.isFinite(minLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLng) || !Number.isFinite(maxLat)) {
		return [70.0, 31.0, 71.0, 32.0];
	}

	return [minLng, minLat, maxLng, maxLat];
}

function getLayerType(geojson: GeoJSON): KMZLayer["type"] {
	const types = new Set(geojson.features.map((feature) => feature.geometry.type));

	if (types.size === 0) return "point";
	if (types.size === 1) {
		const type = Array.from(types)[0];
		if (type === "Polygon" || type === "MultiPolygon") return "polygon";
		if (type === "LineString" || type === "MultiLineString") return "line";
		if (type === "Point" || type === "MultiPoint") return "point";
	}

	return "mixed";
}

function extractPlacemarksRecursive(
	obj: any,
	parentName: string = "",
): { name: string; placemarks: any[] }[] {
	const result: { name: string; placemarks: any[] }[] = [];

	if (!obj || typeof obj !== "object") return result;

	if (obj.Placemark && Array.isArray(obj.Placemark) && obj.Placemark.length > 0) {
		const name = obj.name?.[0] || parentName || "Unnamed Layer";
		result.push({
			name,
			placemarks: obj.Placemark,
		});
	}

	if (obj.Folder && Array.isArray(obj.Folder)) {
		obj.Folder.forEach((folder: any, index: number) => {
			const folderName = folder.name?.[0] || `${parentName} Folder ${index + 1}`;
			result.push(...extractPlacemarksRecursive(folder, folderName));
		});
	}

	if (obj.Document && Array.isArray(obj.Document)) {
		obj.Document.forEach((doc: any) => {
			const docName = doc.name?.[0] || parentName || "Document";
			result.push(...extractPlacemarksRecursive(doc, docName));
		});
	}

	return result;
}

function parseKMLLayers(kmlData: any): KMZLayer[] {
	const layers: KMZLayer[] = [];

	if (!kmlData?.kml) {
		return layers;
	}

	const placemarkGroups = extractPlacemarksRecursive(kmlData.kml);

	placemarkGroups.forEach((group, groupIndex) => {
		const features = group.placemarks
			.map((placemark: any) => parsePlacemark(placemark))
			.filter((feature): feature is GeoJSONFeature => feature !== null);

		if (features.length === 0) return;

		const geojson: GeoJSON = {
			type: "FeatureCollection",
			features,
		};

		const firstFeatureStyle = features[0]?.properties?._style;
		const layerType = getLayerType(geojson);

		const defaultStyle = !firstFeatureStyle
			? {
					color: layerType === "polygon" ? "#3388ff" : layerType === "line" ? "#ff7800" : "#38761d",
					fillColor: layerType === "polygon" ? "#3388ff" : layerType === "line" ? "#ff7800" : "#38761d",
					fillOpacity: 0.3,
					weight: 2,
				}
			: undefined;

		layers.push({
			id: `layer-${groupIndex}`,
			name: group.name,
			type: layerType,
			geojson,
			bounds: calculateBounds(geojson),
			defaultVisible: true,
			style: firstFeatureStyle || defaultStyle,
		});
	});

	return layers;
}

export async function parseKmzBuffer(buffer: Buffer, sourceName: string): Promise<ParsedKMZ> {
	const fileName = sourceName.toLowerCase();
	if (!fileName.endsWith(".kmz") && !fileName.endsWith(".kml")) {
		throw new Error("File must be a KMZ or KML file");
	}

	let kmlContent: string;

	if (fileName.endsWith(".kmz")) {
		const zip = new AdmZip(buffer);
		const kmlEntry = zip
			.getEntries()
			.find((entry) => entry.entryName.toLowerCase().endsWith(".kml") && !entry.isDirectory);

		if (!kmlEntry) {
			throw new Error("No KML file found in KMZ archive");
		}

		kmlContent = kmlEntry.getData().toString("utf8");
	} else {
		kmlContent = buffer.toString("utf8");
	}

	const kmlData = await parseStringPromise(kmlContent, {
		explicitArray: true,
		mergeAttrs: false,
		explicitRoot: true,
	});

	const layers = parseKMLLayers(kmlData);

	if (layers.length === 0) {
		throw new Error("No valid layers found in KML file");
	}

	return {
		layers,
		sourceName,
	};
}
