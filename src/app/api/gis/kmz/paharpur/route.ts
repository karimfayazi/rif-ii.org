import { NextResponse } from "next/server";
import { PAHARPUR_KMZ_STANDALONE_CONFIG } from "@/config/gis/kmz-standalone-sites";
import { loadKmzDirectoryFiles } from "@/lib/gis/loadKmzDirectory";

export const maxDuration = 300;

export async function GET() {
	try {
		const { files, warnings } = await loadKmzDirectoryFiles(
			"maps/kmz/Paharpur_kmz_gis_maps",
			PAHARPUR_KMZ_STANDALONE_CONFIG.kmzLayerFileOrder,
		);

		return NextResponse.json({
			success: true,
			files,
			warnings,
		});
	} catch (error) {
		console.error("Error loading Paharpur KMZ files:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to load Paharpur KMZ files",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
