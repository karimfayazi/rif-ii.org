import path from "path";
import { parseKmzBuffer, type KMZLayer } from "@/lib/gis/kmz-parser";
import { listPublicDirectory, readPublicAsset } from "@/lib/gis/readPublicAsset";

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

function isKmzOrKml(fileName: string) {
	const lower = fileName.toLowerCase();
	return lower.endsWith(".kmz") || lower.endsWith(".kml");
}

/**
 * Load and parse all KMZ/KML files from a public/maps/kmz/... directory.
 * Uses disk when available; falls back to known file list + public URL fetch on Vercel.
 */
export async function loadKmzDirectoryFiles(
	relativePublicDir: string,
	fallbackFileNames: string[] = [],
) {
	const fileNames = (await listPublicDirectory(relativePublicDir, fallbackFileNames))
		.filter(isKmzOrKml)
		.sort((a, b) => a.localeCompare(b));

	const results = await Promise.all(
		fileNames.map(async (fileName) => {
			const displayName = formatDisplayName(fileName);

			try {
				const buffer = await readPublicAsset(`${relativePublicDir}/${fileName}`);
				const parsed = await parseKmzBuffer(buffer, fileName);

				return {
					fileName,
					displayName,
					layers: parsed.layers,
					totalLayers: parsed.layers.length,
					totalFeatures: calculateFeatureCount(parsed.layers),
				};
			} catch (error) {
				return {
					fileName,
					displayName,
					error: error instanceof Error ? error.message : "Failed to parse KMZ file",
				};
			}
		}),
	);

	const files = results.filter((item) => !("error" in item));
	const warnings = results
		.filter((item): item is { fileName: string; displayName: string; error: string } => "error" in item)
		.map((item) => ({
			fileName: item.fileName,
			displayName: item.displayName,
			message: item.error,
		}));

	return { files, warnings };
}
