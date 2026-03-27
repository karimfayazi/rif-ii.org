import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { parseKmzBuffer, type KMZLayer } from "@/lib/gis/kmz-parser";

export const maxDuration = 300;

const KAKKI_KMZ_DIRECTORY = path.join(process.cwd(), "public", "maps", "kmz", "Kakki_kmz_gis_maps");

function formatDisplayName(fileName: string) {
	return path
		.basename(fileName, path.extname(fileName))
		.replace(/_/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function calculateFeatureCount(layers: KMZLayer[]) {
	return layers.reduce((total, layer) => total + layer.geojson.features.length, 0);
}

export async function GET() {
	try {
		const directoryEntries = await fs.readdir(KAKKI_KMZ_DIRECTORY, { withFileTypes: true });
		const kmzFiles = directoryEntries
			.filter(
				(entry) =>
					entry.isFile() &&
					(entry.name.toLowerCase().endsWith(".kmz") || entry.name.toLowerCase().endsWith(".kml")),
			)
			.sort((a, b) => a.name.localeCompare(b.name));

		const results = await Promise.all(
			kmzFiles.map(async (entry) => {
				const displayName = formatDisplayName(entry.name);

				try {
					const fullPath = path.join(KAKKI_KMZ_DIRECTORY, entry.name);
					const buffer = await fs.readFile(fullPath);
					const parsed = await parseKmzBuffer(buffer, entry.name);

					return {
						fileName: entry.name,
						displayName,
						layers: parsed.layers,
						totalLayers: parsed.layers.length,
						totalFeatures: calculateFeatureCount(parsed.layers),
					};
				} catch (error) {
					return {
						fileName: entry.name,
						displayName,
						error: error instanceof Error ? error.message : "Failed to parse KMZ file",
					};
				}
			}),
		);

		const files = results.filter((item) => !("error" in item));
		const warnings = results
			.filter((item) => "error" in item)
			.map((item) => ({
				fileName: item.fileName,
				displayName: item.displayName,
				message: item.error,
			}));

		return NextResponse.json({
			success: true,
			files,
			warnings,
		});
	} catch (error) {
		console.error("Error loading Kakki KMZ files:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to load Kakki KMZ files",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
