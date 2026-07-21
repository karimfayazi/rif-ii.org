export interface ClientGeoJSONFeature {
	type: "Feature";
	geometry: {
		type: string;
		coordinates: unknown;
	};
	properties: Record<string, unknown>;
}

export interface ClientGeoJSON {
	type: "FeatureCollection";
	features: ClientGeoJSONFeature[];
}

export interface ClientKMZLayer {
	id: string;
	name: string;
	type: "polygon" | "line" | "point" | "mixed";
	geojson: ClientGeoJSON;
	bounds: [number, number, number, number];
}

export interface ClientParsedKMZ {
	layers: ClientKMZLayer[];
	sourceName: string;
}

function parseCoordinates(coordsString: string, geometryType: string): unknown {
	if (!coordsString) {
		return geometryType === "Point" ? [0, 0] : [];
	}

	const coords = coordsString
		.trim()
		.replace(/\s+/g, " ")
		.split(/[\s\n]+/)
		.map((coord) => {
			const trimmed = coord.trim();
			if (!trimmed) return null;

			const parts = trimmed.split(",");
			if (parts.length < 2) return null;

			const lng = parseFloat(parts[0]);
			const lat = parseFloat(parts[1]);
			if (Number.isNaN(lng) || Number.isNaN(lat)) return null;

			return [lng, lat] as [number, number];
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

function getDirectChildText(parent: Element, tagName: string): string | null {
	for (const child of Array.from(parent.children)) {
		if (child.tagName === tagName || child.localName === tagName) {
			return child.textContent?.trim() || null;
		}
	}
	return null;
}

function getTextContent(parent: Element, tagName: string): string | null {
	return getDirectChildText(parent, tagName) || parent.getElementsByTagName(tagName)[0]?.textContent?.trim() || null;
}

function extractStyle(placemark: Element) {
	const style: {
		color?: string;
		fillColor?: string;
		fillOpacity?: number;
		weight?: number;
	} = {};

	const styleNode = placemark.getElementsByTagName("Style")[0];
	if (!styleNode) return undefined;

	const lineStyle = styleNode.getElementsByTagName("LineStyle")[0];
	if (lineStyle) {
		const color = getTextContent(lineStyle, "color");
		const width = getTextContent(lineStyle, "width");
		if (color && color.length === 8) {
			style.color = `#${color.substring(6, 8)}${color.substring(4, 6)}${color.substring(2, 4)}`;
		}
		if (width) {
			style.weight = parseFloat(width);
		}
	}

	const polyStyle = styleNode.getElementsByTagName("PolyStyle")[0];
	if (polyStyle) {
		const color = getTextContent(polyStyle, "color");
		const fill = getTextContent(polyStyle, "fill");
		if (color && color.length === 8) {
			style.fillColor = `#${color.substring(6, 8)}${color.substring(4, 6)}${color.substring(2, 4)}`;
		}
		style.fillOpacity = fill === "0" ? 0 : 0.35;
	}

	return Object.keys(style).length > 0 ? style : undefined;
}

function extractDescriptionAttributes(description: string | null): Record<string, string> {
	if (!description) return {};

	const attributes: Record<string, string> = {};
	const rowRegex = /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
	let match: RegExpExecArray | null;

	while ((match = rowRegex.exec(description)) !== null) {
		const key = match[1].replace(/<[^>]+>/g, "").trim();
		const value = match[2].replace(/<[^>]+>/g, "").trim();
		if (key && value) {
			attributes[key] = value;
		}
	}

	return attributes;
}

function deriveFeatureName(
	explicitName: string | null,
	attributes: Record<string, string>,
	fallbackName: string,
): string {
	if (explicitName && explicitName.trim()) {
		return explicitName.trim();
	}

	const preferredKeys = [
		"VCs",
		"VC",
		"NC",
		"Tehsil",
		"Tehsil_Nam",
		"Tehsil_Name",
		"District",
		"ADM2_EN",
		"Provience",
		"Province",
		"ADM1_EN",
		"Name",
		"NAME",
		"Project Area",
		"Project_Area",
	];

	for (const key of preferredKeys) {
		const value = attributes[key];
		if (!value) continue;
		if (value.toLowerCase() === key.toLowerCase()) continue;
		return value;
	}

	const firstValue = Object.values(attributes)[0];
	return firstValue || fallbackName;
}

function parsePolygonCoordinates(polygon: Element): unknown[] | null {
	const outer = polygon.getElementsByTagName("outerBoundaryIs")[0];
	const ring = outer?.getElementsByTagName("LinearRing")[0];
	const coordsText = ring ? getTextContent(ring, "coordinates") : null;
	if (!coordsText) return null;

	const parsed = parseCoordinates(coordsText, "Polygon");
	return Array.isArray(parsed) ? (parsed as unknown[]) : null;
}

function parseGeometryFromPlacemark(placemark: Element): ClientGeoJSONFeature["geometry"] | null {
	const multiGeometry = placemark.getElementsByTagName("MultiGeometry")[0];

	if (multiGeometry) {
		const polygons = Array.from(multiGeometry.getElementsByTagName("Polygon"));
		const lineStrings = Array.from(multiGeometry.getElementsByTagName("LineString"));
		const points = Array.from(multiGeometry.getElementsByTagName("Point"));

		if (polygons.length > 1) {
			const coordinates = polygons
				.map((polygon) => parsePolygonCoordinates(polygon))
				.filter((coords): coords is unknown[] => Array.isArray(coords));

			if (coordinates.length > 0) {
				return {
					type: "MultiPolygon",
					coordinates,
				};
			}
		}

		if (polygons.length === 1) {
			const coordinates = parsePolygonCoordinates(polygons[0]);
			if (coordinates) {
				return {
					type: "Polygon",
					coordinates,
				};
			}
		}

		if (lineStrings.length === 1) {
			const coords = getTextContent(lineStrings[0], "coordinates");
			return {
				type: "LineString",
				coordinates: parseCoordinates(coords || "", "LineString"),
			};
		}

		if (points.length === 1) {
			const coords = getTextContent(points[0], "coordinates");
			return {
				type: "Point",
				coordinates: parseCoordinates(coords || "", "Point"),
			};
		}
	}

	const point = placemark.getElementsByTagName("Point")[0];
	const lineString = placemark.getElementsByTagName("LineString")[0];
	const polygon = placemark.getElementsByTagName("Polygon")[0];

	if (point) {
		const coords = getTextContent(point, "coordinates");
		return {
			type: "Point",
			coordinates: parseCoordinates(coords || "", "Point"),
		};
	}

	if (lineString) {
		const coords = getTextContent(lineString, "coordinates");
		return {
			type: "LineString",
			coordinates: parseCoordinates(coords || "", "LineString"),
		};
	}

	if (polygon) {
		const coordinates = parsePolygonCoordinates(polygon);
		if (coordinates) {
			return {
				type: "Polygon",
				coordinates,
			};
		}
	}

	return null;
}

function parsePlacemark(placemark: Element, fallbackName: string): ClientGeoJSONFeature | null {
	const properties: Record<string, unknown> = {};
	const explicitName = getDirectChildText(placemark, "name");
	const description = getDirectChildText(placemark, "description");
	const attributes = extractDescriptionAttributes(description);
	const name = deriveFeatureName(explicitName, attributes, fallbackName);

	properties.name = name;
	Object.entries(attributes).forEach(([key, value]) => {
		properties[key] = value;
	});
	if (description) properties.description = description;

	const extendedData = placemark.getElementsByTagName("ExtendedData")[0];
	if (extendedData) {
		Array.from(extendedData.getElementsByTagName("Data")).forEach((dataNode) => {
			const key = dataNode.getAttribute("name");
			const value = getTextContent(dataNode, "value");
			if (key && value) {
				properties[key] = value;
			}
		});
	}

	const geometry = parseGeometryFromPlacemark(placemark);
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

function calculateBounds(geojson: ClientGeoJSON): [number, number, number, number] {
	let minLng = Infinity;
	let minLat = Infinity;
	let maxLng = -Infinity;
	let maxLat = -Infinity;

	const extractCoords = (coords: unknown): void => {
		if (!Array.isArray(coords)) return;
		if (typeof coords[0] === "number" && typeof coords[1] === "number") {
			const [lng, lat] = coords as [number, number];
			minLng = Math.min(minLng, lng);
			minLat = Math.min(minLat, lat);
			maxLng = Math.max(maxLng, lng);
			maxLat = Math.max(maxLat, lat);
			return;
		}
		coords.forEach((child) => extractCoords(child));
	};

	geojson.features.forEach((feature) => extractCoords(feature.geometry.coordinates));

	if (!Number.isFinite(minLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLng) || !Number.isFinite(maxLat)) {
		return [69.0, 31.0, 74.0, 37.0];
	}

	return [minLng, minLat, maxLng, maxLat];
}

function getLayerType(geojson: ClientGeoJSON): ClientKMZLayer["type"] {
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

function collectFolderGroups(root: Element): Array<{ name: string; placemarks: Element[] }> {
	const groups: Array<{ name: string; placemarks: Element[] }> = [];

	const walk = (node: Element, parentName: string) => {
		const localName = getDirectChildText(node, "name") || parentName || "Unnamed Layer";
		const directPlacemarks = Array.from(node.children).filter(
			(child) => child.tagName === "Placemark" || child.localName === "Placemark",
		);

		if (directPlacemarks.length > 0) {
			groups.push({
				name: localName,
				placemarks: directPlacemarks as Element[],
			});
		}

		Array.from(node.children).forEach((child) => {
			const tag = child.tagName || child.localName;
			if (tag === "Folder" || tag === "Document") {
				walk(child as Element, localName);
			}
		});
	};

	walk(root, "Layer");
	return groups;
}

function parseKmlContent(kmlContent: string, sourceName: string): ClientParsedKMZ {
	const parser = new DOMParser();
	const doc = parser.parseFromString(kmlContent, "text/xml");

	if (doc.getElementsByTagName("parsererror").length > 0) {
		throw new Error("Invalid KML XML content");
	}

	const kmlRoot = doc.getElementsByTagName("kml")[0] || doc.documentElement;
	const groups = collectFolderGroups(kmlRoot);
	const layers: ClientKMZLayer[] = [];

	if (groups.length === 0) {
		const allPlacemarks = Array.from(doc.getElementsByTagName("Placemark"));
		if (allPlacemarks.length > 0) {
			groups.push({
				name: sourceName.replace(/\.(kmz|kml)$/i, ""),
				placemarks: allPlacemarks,
			});
		}
	}

	groups.forEach((group, index) => {
		const features = group.placemarks
			.map((placemark) => parsePlacemark(placemark, group.name || sourceName))
			.filter((feature): feature is ClientGeoJSONFeature => feature !== null);

		if (features.length === 0) return;

		const geojson: ClientGeoJSON = {
			type: "FeatureCollection",
			features,
		};

		layers.push({
			id: `layer-${index}`,
			name: group.name,
			type: getLayerType(geojson),
			geojson,
			bounds: calculateBounds(geojson),
		});
	});

	if (layers.length === 0) {
		throw new Error("No valid layers found in KML file");
	}

	return {
		layers,
		sourceName,
	};
}

export async function parseKmzArrayBuffer(buffer: ArrayBuffer, sourceName: string): Promise<ClientParsedKMZ> {
	const lower = sourceName.toLowerCase();

	if (lower.endsWith(".kml")) {
		const text = new TextDecoder("utf-8").decode(buffer);
		return parseKmlContent(text, sourceName);
	}

	if (!lower.endsWith(".kmz")) {
		throw new Error("File must be a KMZ or KML file");
	}

	const JSZip = (await import("jszip")).default;
	const zip = await JSZip.loadAsync(buffer);
	const kmlEntry = Object.values(zip.files).find(
		(entry) => !entry.dir && entry.name.toLowerCase().endsWith(".kml"),
	);

	if (!kmlEntry) {
		throw new Error("No KML file found in KMZ archive");
	}

	const kmlContent = await kmlEntry.async("text");
	return parseKmlContent(kmlContent, sourceName);
}
