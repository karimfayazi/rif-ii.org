import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { parseKmzBuffer, type KMZLayer } from "@/lib/gis/kmz-parser";
import { getDashboardKmzEntries } from "@/lib/gis/dashboard-kmz";

export const maxDuration = 300;

const DASHBOARD_KMZ_ROOT = path.join(process.cwd(), "public", "maps", "dashboards");

function calculateFeatureCount(layers: KMZLayer[]) {
	return layers.reduce((total, layer) => total + layer.geojson.features.length, 0);
}

export async function GET() {
	try {
		const entries = await getDashboardKmzEntries();
		const warnings: Array<{ fileName: string; displayName: string; message: string }> = [];

		const fileResults = await Promise.all(
			entries.map(async (entry) => {
				try {
					const filePath = path.join(DASHBOARD_KMZ_ROOT, entry.fileName);
					const buffer = await fs.readFile(filePath);
					const parsed = await parseKmzBuffer(buffer, entry.fileName);

					return {
						fileName: entry.fileName,
						displayName: entry.displayName,
						layers: parsed.layers,
						totalLayers: parsed.layers.length,
						totalFeatures: calculateFeatureCount(parsed.layers),
					};
				} catch (error) {
					warnings.push({
						fileName: entry.fileName,
						displayName: entry.displayName,
						message: error instanceof Error ? error.message : "Failed to parse KMZ file",
					});
					return null;
				}
			}),
		);

		const files = fileResults.filter((file): file is NonNullable<typeof file> => file !== null);

		return NextResponse.json({
			success: true,
			files,
			warnings,
		});
	} catch (error) {
		console.error("Error loading dashboard KMZ files:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to load dashboard KMZ files",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
