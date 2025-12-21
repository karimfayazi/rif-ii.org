import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import AdmZip from "adm-zip";
import { parseStringPromise } from "xml2js";

// Get KMZ file path from environment variable or use default
function getKMZFilePath(): string {
	// Try environment variable first (for production)
	const envPath = process.env.KMZ_FILE_PATH;
	if (envPath) {
		return envPath;
	}

	// Try in public folder (if file is uploaded there)
	const publicPath = path.join(process.cwd(), 'public', 'maps', 'kmz', 'Paniala Data.kmz');
	
	// Fallback to development path (Windows)
	if (process.platform === 'win32') {
		return "D:\\PERSONAL\\AHT GROUP\\GIS-Map\\6-Mapping Workshop Data\\6-Mapping Workshop Data\\Mapping Workshop Field Verification\\kmz\\DIK\\Paniala Data.kmz";
	}

	// Linux/Unix fallback
	return "/var/www/maps/kmz/Paniala Data.kmz";
}

// Helper function to parse KML XML to extract layers and features
async function parseKMLToGeoJSON(kmlContent: string): Promise<any> {
	try {
		const result = await parseStringPromise(kmlContent, { 
			explicitArray: false, 
			mergeAttrs: true,
			ignoreAttrs: false
		});

		const features: any[] = [];
		const layers: any[] = [];

		// Recursive function to extract folders and placemarks
		const extractFolders = (folder: any, parentName?: string): void => {
			const folderName = folder.name || folder.Name || "Unnamed Folder";
			const fullName = parentName ? `${parentName} > ${folderName}` : folderName;
			
			// Get placemarks in this folder
			const folderPlacemarks = Array.isArray(folder.Placemark) ? folder.Placemark : (folder.Placemark ? [folder.Placemark] : []);
			
			// Get nested folders
			const nestedFolders = Array.isArray(folder.Folder) ? folder.Folder : (folder.Folder ? [folder.Folder] : []);
			
			// Process placemarks in this folder
			const layerFeatures: any[] = [];
			folderPlacemarks.forEach((placemark: any) => {
				const feature = parsePlacemark(placemark);
				if (feature) {
					layerFeatures.push(feature);
					features.push(feature);
				}
			});

			// If this folder has placemarks, create a layer
			if (layerFeatures.length > 0) {
				layers.push({
					name: folderName,
					features: layerFeatures,
					featureCount: layerFeatures.length
				});
			}

			// Recursively process nested folders
			nestedFolders.forEach((nestedFolder: any) => {
				extractFolders(nestedFolder, fullName);
			});
		};

		// Extract Document or Folder structure
		const kml = result.kml || {};
		const document = kml.Document || kml.Folder || {};
		const folders = Array.isArray(document.Folder) ? document.Folder : (document.Folder ? [document.Folder] : []);
		const placemarks = Array.isArray(document.Placemark) ? document.Placemark : (document.Placemark ? [document.Placemark] : []);

		// Process all folders recursively (including nested folders like "MIS Data")
		folders.forEach((folder: any) => {
			extractFolders(folder);
		});

		// Process root-level placemarks
		placemarks.forEach((placemark: any) => {
			const feature = parsePlacemark(placemark);
			if (feature) {
				features.push(feature);
			}
		});

		// If we have root placemarks but no folders, create a default layer
		if (placemarks.length > 0 && layers.length === 0) {
			layers.push({
				name: "Default Layer",
				features: features,
				featureCount: features.length
			});
		}

		return {
			type: "FeatureCollection",
			features: features,
			layers: layers
		};
	} catch (parseError) {
		throw parseError;
	}
}

// Helper function to parse a placemark into GeoJSON
function parsePlacemark(placemark: any): any | null {
	try {
		const name = placemark.name || placemark.Name || "Unnamed";
		const description = placemark.description || placemark.Description || "";
		
		let geometry: any = null;

		// Helper function to parse KML coordinates
		const parseCoordinates = (coordString: string): number[][] => {
			if (!coordString) return [];
			// KML coordinates are space-separated, each in format "lon,lat,alt" or "lon,lat"
			return coordString.trim().split(/\s+/).map((coord: string) => {
				const parts = coord.split(',').map((p: string) => parseFloat(p.trim()));
				// Return [longitude, latitude] (ignore altitude if present)
				return [parts[0] || 0, parts[1] || 0];
			}).filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]));
		};

		// Parse Point
		if (placemark.Point) {
			const point = placemark.Point;
			const coordinates = point.coordinates || point.coordinates || point.Coordinates || point.coordinates;
			if (coordinates) {
				const coordString = typeof coordinates === 'string' ? coordinates : (coordinates._ || coordinates);
				if (coordString) {
					const coords = parseCoordinates(coordString);
					if (coords.length > 0) {
						geometry = {
							type: "Point",
							coordinates: coords[0] // [longitude, latitude]
						};
					}
				}
			}
		}

		// Parse LineString
		if (placemark.LineString) {
			const lineString = placemark.LineString;
			const coordinates = lineString.coordinates || lineString.Coordinates || lineString.coordinates;
			if (coordinates) {
				const coordString = typeof coordinates === 'string' ? coordinates : (coordinates._ || coordinates);
				if (coordString) {
					const coords = parseCoordinates(coordString);
					if (coords.length > 0) {
						geometry = {
							type: "LineString",
							coordinates: coords
						};
					}
				}
			}
		}

		// Parse Polygon
		if (placemark.Polygon) {
			const polygon = placemark.Polygon;
			const outerBoundary = polygon.outerBoundaryIs || polygon.OuterBoundaryIs || polygon.outerBoundaryIs;
			if (outerBoundary) {
				const linearRing = outerBoundary.LinearRing || outerBoundary.linearRing || outerBoundary.LinearRing;
				if (linearRing) {
					const coordinates = linearRing.coordinates || linearRing.Coordinates || linearRing.coordinates;
					if (coordinates) {
						const coordString = typeof coordinates === 'string' ? coordinates : (coordinates._ || coordinates);
						if (coordString) {
							const coords = parseCoordinates(coordString);
							if (coords.length > 0) {
								geometry = {
									type: "Polygon",
									coordinates: [coords]
								};
							}
						}
					}
				}
			}
		}

		// Parse MultiGeometry
		if (placemark.MultiGeometry) {
			const multiGeometry = placemark.MultiGeometry;
			const geometries: any[] = [];
			
			if (multiGeometry.Point) {
				const points = Array.isArray(multiGeometry.Point) ? multiGeometry.Point : [multiGeometry.Point];
				points.forEach((point: any) => {
					if (point.coordinates) {
						const coords = point.coordinates.trim().split(',').map((c: string) => parseFloat(c.trim()));
						if (coords.length >= 2) {
							geometries.push({
								type: "Point",
								coordinates: [coords[0], coords[1]]
							});
						}
					}
				});
			}

			if (geometries.length === 1) {
				geometry = geometries[0];
			} else if (geometries.length > 1) {
				geometry = {
					type: "GeometryCollection",
					geometries: geometries
				};
			}
		}

		if (!geometry) {
			return null;
		}

		return {
			type: "Feature",
			properties: {
				name: name,
				description: description,
				...extractExtendedData(placemark)
			},
			geometry: geometry
		};
	} catch (error) {
		console.error("Error parsing placemark:", error);
		return null;
	}
}

// Extract ExtendedData from placemark
function extractExtendedData(placemark: any): any {
	const props: any = {};
	
	if (placemark.ExtendedData) {
		const extendedData = placemark.ExtendedData;
		
		if (extendedData.Data) {
			const dataArray = Array.isArray(extendedData.Data) ? extendedData.Data : [extendedData.Data];
			dataArray.forEach((data: any) => {
				if (data.name && data.value) {
					props[data.name] = data.value;
				}
			});
		}

		if (extendedData.SchemaData) {
			const schemaDataArray = Array.isArray(extendedData.SchemaData) ? extendedData.SchemaData : [extendedData.SchemaData];
			schemaDataArray.forEach((schemaData: any) => {
				if (schemaData.SimpleData) {
					const simpleDataArray = Array.isArray(schemaData.SimpleData) ? schemaData.SimpleData : [schemaData.SimpleData];
					simpleDataArray.forEach((simpleData: any) => {
						if (simpleData.name && simpleData._) {
							props[simpleData.name] = simpleData._;
						}
					});
				}
			});
		}
	}

	return props;
}

// GET - Load and parse KMZ file, return all layers
export async function GET(request: NextRequest) {
	try {
		const KMZ_FILE_PATH = getKMZFilePath();
		const alternativePaths = [
			path.join(process.cwd(), 'public', 'maps', 'kmz', 'Paniala Data.kmz'),
			path.join(process.cwd(), 'public', 'Paniala Data.kmz'),
			path.join(process.cwd(), 'Paniala Data.kmz'),
		];

		// Try primary path first
		let actualPath: string | null = null;
		try {
			await stat(KMZ_FILE_PATH);
			actualPath = KMZ_FILE_PATH;
		} catch {
			// Try alternative paths
			for (const altPath of alternativePaths) {
				try {
					await stat(altPath);
					actualPath = altPath;
					break;
				} catch {
					// Continue to next path
				}
			}
		}

		if (!actualPath) {
			return NextResponse.json(
				{ 
					success: false, 
					message: "KMZ file not found or not accessible",
					path: KMZ_FILE_PATH,
					hint: "Please set KMZ_FILE_PATH environment variable or place the file in public/maps/kmz/",
					searchedPaths: [
						KMZ_FILE_PATH,
						...alternativePaths
					]
				},
				{ status: 404 }
			);
		}

		// Read and process KMZ file
		const kmzBuffer = await readFile(actualPath);
		return await processKMZFile(kmzBuffer);
	} catch (error) {
		console.error("Error loading KMZ file:", error);
		return NextResponse.json(
			{ 
				success: false, 
				message: "Failed to load or parse KMZ file",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

// Helper function to process KMZ file
async function processKMZFile(kmzBuffer: Buffer) {
	// Extract KMZ (which is a ZIP file)
	const zip = new AdmZip(kmzBuffer);
	const zipEntries = zip.getEntries();
	
	// Find KML file in the ZIP
	const kmlEntry = zipEntries.find(entry => 
		entry.entryName.toLowerCase().endsWith('.kml')
	);

	if (!kmlEntry) {
		return NextResponse.json(
			{ 
				success: false, 
				message: "No KML file found inside the KMZ archive"
			},
			{ status: 400 }
		);
	}

	// Extract KML content
	const kmlContent = kmlEntry.getData().toString('utf8');

	// Parse KML to GeoJSON
	const geoJsonData = await parseKMLToGeoJSON(kmlContent);

	return NextResponse.json({
		success: true,
		message: "KMZ file loaded and parsed successfully",
		layers: geoJsonData.layers,
		geoJson: geoJsonData,
		totalFeatures: geoJsonData.features.length,
		totalLayers: geoJsonData.layers.length
	});
}

