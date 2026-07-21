import { NextResponse } from "next/server";
import { loadKmzDirectoryFiles } from "@/lib/gis/loadKmzDirectory";

export const maxDuration = 300;

const PAROA_FALLBACK_FILES = [
	"Paroa_NCBoundary.kmz",
	"Paroa_CommercialArea.kmz",
	"Paroa_Zone.kmz",
	"Paroa_DairyFarm.kmz",
	"Paroa_DumpSites.kmz",
	"Paroa_ExistingDrain.kmz",
	"Paroa_ProposedDrainByCommunity.kmz",
	"Paroa_Waste WaterPonds.kmz",
	"Paroa_WaterData.kmz",
	"Paroa_WaterSchemes.kmz",
	"Paroa_WaterSupplyLines.kmz",
];

export async function GET() {
	try {
		const { files, warnings } = await loadKmzDirectoryFiles(
			"maps/kmz/Paroa_kmz_gis_maps",
			PAROA_FALLBACK_FILES,
		);

		return NextResponse.json({
			success: true,
			files,
			warnings,
		});
	} catch (error) {
		console.error("Error loading Paroa KMZ files:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to load Paroa KMZ files",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
