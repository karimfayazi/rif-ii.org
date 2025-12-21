import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import * as shapefile from "shapefile";

// User's specified shapefile directory
const SHAPEFILE_DIR = "D:\\PERSONAL\\AHT GROUP\\GIS-Map\\20-June-25\\Selected\\KPK-Districts";

// GET - List all shapefiles in the KPK-Districts directory
export async function GET(request: NextRequest) {
	try {
		// Check if directory exists
		try {
			const dirStat = await stat(SHAPEFILE_DIR);
			if (!dirStat.isDirectory()) {
				return NextResponse.json(
					{ 
						success: false, 
						message: "Path is not a directory",
						path: SHAPEFILE_DIR
					},
					{ status: 400 }
				);
			}
		} catch (statError) {
			return NextResponse.json(
				{ 
					success: false, 
					message: "Directory not found or not accessible",
					path: SHAPEFILE_DIR,
					error: statError instanceof Error ? statError.message : "Unknown error"
				},
				{ status: 404 }
			);
		}

		const files = await readdir(SHAPEFILE_DIR);
		const shapefiles = files
			.filter((file: string) => file.toLowerCase().endsWith('.shp'))
			.map((file: string) => {
				const baseName = file.replace(/\.shp$/i, '');
				const hasGeoJson = files.some(f => f.toLowerCase() === `${baseName}.geojson`.toLowerCase());
				const hasShx = files.some(f => f.toLowerCase() === `${baseName}.shx`.toLowerCase());
				const hasDbf = files.some(f => f.toLowerCase() === `${baseName}.dbf`.toLowerCase());
				
				return {
					filename: file,
					baseName: baseName,
					hasGeoJson: hasGeoJson,
					hasShx: hasShx,
					hasDbf: hasDbf,
					complete: hasShx && hasDbf, // Shapefile is complete if it has .shx and .dbf
					geojsonPath: hasGeoJson ? null : null // Will be generated on demand
				};
			});

		return NextResponse.json({
			success: true,
			shapefiles: shapefiles,
			directory: SHAPEFILE_DIR,
			total: shapefiles.length
		});

	} catch (error) {
		console.error("Error listing shapefiles:", error);
		return NextResponse.json(
			{ 
				success: false, 
				message: "Failed to list shapefiles",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

// POST - Convert a shapefile to GeoJSON and return it
export async function POST(request: NextRequest) {
	try {
		const { filename } = await request.json();

		if (!filename) {
			return NextResponse.json(
				{ success: false, message: "Filename parameter is required" },
				{ status: 400 }
			);
		}

		// Get the base name without extension
		const baseName = filename.replace(/\.shp$/i, '');
		const shpPath = path.join(SHAPEFILE_DIR, `${baseName}.shp`);

		try {
			// Check if shapefile exists
			await stat(shpPath);

			// Convert shapefile to GeoJSON using shapefile library
			const source = await shapefile.open(shpPath);

			const features: any[] = [];
			let result = await source.read();
			
			while (!result.done) {
				if (result.value) {
					features.push(result.value);
				}
				result = await source.read();
			}

			const geoJson = {
				type: "FeatureCollection",
				features: features
			};

			// Return GeoJSON directly (don't save to disk)
			return NextResponse.json({
				success: true,
				message: "Shapefile converted to GeoJSON successfully",
				filename: `${baseName}.geojson`,
				featureCount: features.length,
				geoJson: geoJson
			});

		} catch (fileError) {
			console.error('Error converting shapefile:', fileError);
			return NextResponse.json(
				{ 
					success: false, 
					message: "Failed to convert shapefile",
					error: fileError instanceof Error ? fileError.message : "Unknown error"
				},
				{ status: 500 }
			);
		}

	} catch (error) {
		console.error("Error in shapefile conversion API:", error);
		return NextResponse.json(
			{ 
				success: false, 
				message: "Failed to process request",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

