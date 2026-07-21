import { NextResponse } from "next/server";
import { loadKmzDirectoryFiles } from "@/lib/gis/loadKmzDirectory";

export const maxDuration = 300;

const DOMEL_FALLBACK_FILES = [
	"Domel_VCBoundary.kmz",
	"Domel_Project Area.kmz",
	"Domel_Zone.kmz",
	"Domel_DumpSites.kmz",
	"Domel_ExistingDrain.kmz",
	"Domel_ProposedDrainByCommunity.kmz",
	"Domel_Waste WaterPond.kmz",
	"Domel_Water Served Area.kmz",
	"Domel_WaterSchemes.kmz",
];

export async function GET() {
	try {
		const { files, warnings } = await loadKmzDirectoryFiles(
			"maps/kmz/Domel_kmz_gis_maps",
			DOMEL_FALLBACK_FILES,
		);

		return NextResponse.json({
			success: true,
			files,
			warnings,
		});
	} catch (error) {
		console.error("Error loading Domel KMZ files:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to load Domel KMZ files",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
