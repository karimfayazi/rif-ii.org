import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { parseKmzBuffer, type KMZLayer } from "@/lib/gis/kmz-parser";

export const maxDuration = 300;

/** Single production KMZ under `public/gis` (served at `/gis/Paniala_GIS_Map.kmz`). Parsed server-side for Leaflet. */
const PANIALA_KMZ_FILE = path.join(process.cwd(), "public", "gis", "Paniala_GIS_Map.kmz");
const PANIALA_KMZ_FILE_NAME = "Paniala_GIS_Map.kmz";

const PANIALA_VISIBLE_LAYERS: Array<{
	layerName: string;
	fileName: string;
	displayName: string;
}> = [
	{
		layerName: "NC Boundary",
		fileName: "paniala-nc-boundary",
		displayName: "Paniala NC Boundary",
	},
	{
		layerName: "Paniala_Zone_Updated",
		fileName: "paniala-zones",
		displayName: "Paniala Zones",
	},
	{
		layerName: "Paniala_DS",
		fileName: "paniala-dump-sites",
		displayName: "Paniala Dump Sites",
	},
	{
		layerName: "Existing Drain",
		fileName: "paniala-existing-drainage",
		displayName: "Paniala Existing Drainage",
	},
	{
		layerName: "Drain Proposed by Community",
		fileName: "paniala-proposed-drainage",
		displayName: "Paniala Proposed Drainage (Community)",
	},
	{
		layerName: "Paniala_Water_Supply_Data",
		fileName: "paniala-water-supply",
		displayName: "Paniala Water Supply Schemes",
	},
];

function calculateFeatureCount(layers: KMZLayer[]) {
	return layers.reduce((total, layer) => total + layer.geojson.features.length, 0);
}

export async function GET() {
	try {
		const buffer = await fs.readFile(PANIALA_KMZ_FILE);
		const parsed = await parseKmzBuffer(buffer, PANIALA_KMZ_FILE_NAME);
		const layersByName = new Map(parsed.layers.map((layer) => [layer.name, layer]));
		const warnings: Array<{ fileName: string; displayName: string; message: string }> = [];

		const files = PANIALA_VISIBLE_LAYERS.flatMap((layerConfig) => {
			const layer = layersByName.get(layerConfig.layerName);

			if (!layer) {
				warnings.push({
					fileName: layerConfig.fileName,
					displayName: layerConfig.displayName,
					message: `Layer "${layerConfig.layerName}" was not found in ${PANIALA_KMZ_FILE_NAME}`,
				});
				return [];
			}

			return [
				{
					fileName: layerConfig.fileName,
					displayName: layerConfig.displayName,
					layers: [layer],
					totalLayers: 1,
					totalFeatures: calculateFeatureCount([layer]),
				},
			];
		});

		return NextResponse.json({
			success: true,
			files,
			warnings,
		});
	} catch (error) {
		console.error("Error loading Paniala KMZ file:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to load Paniala KMZ file",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
