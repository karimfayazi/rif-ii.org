/**
 * Configuration for standalone KMZ GIS pages (same UX as /paroa-gis-map).
 * Layer colors are shared between Leaflet styling and legend swatches via ParoaGisMapContent.
 */

export type KmzStandaloneSiteConfig = {
	title: string;
	description: string;
	kmzApiPath: string;
	legendsModalBrandLabel: string;
	exportFileBasePrefix: string;
	kmzLayerFileOrder: string[];
	kmzDisplayNamesByFile: Record<string, string>;
	kmzLayerColorsByFile: Record<string, string>;
};

/** Distinct hues per layer — legend and map geometry stay aligned. */
const KAKKI_COLORS: Record<string, string> = {
	"Kakki_VCBoundary.kmz": "#2563eb",
	"Kakki_Project Area.kmz": "#c026d3",
	"Kakki_Zone.kmz": "#ca8a04",
	"Kakki_DumpSites.kmz": "#57534e",
	"Kakki_Existing Drain.kmz": "#0891b2",
	"Kakki_Kachkot Canal.kmz": "#059669",
	"Kakki_WaterSchemes.kmz": "#ea580c",
};

export const KAKKI_KMZ_STANDALONE_CONFIG: KmzStandaloneSiteConfig = {
	title: "Kakki GIS Maps",
	description:
		"View Kakki KMZ layers on one online GIS map with selectable visibility and legends",
	kmzApiPath: "/api/gis/kmz/kakki",
	legendsModalBrandLabel: "Kakki GIS Map",
	exportFileBasePrefix: "Kakki_GIS_Map",
	kmzLayerFileOrder: [
		"Kakki_VCBoundary.kmz",
		"Kakki_Project Area.kmz",
		"Kakki_Zone.kmz",
		"Kakki_DumpSites.kmz",
		"Kakki_Existing Drain.kmz",
		"Kakki_Kachkot Canal.kmz",
		"Kakki_WaterSchemes.kmz",
	],
	kmzDisplayNamesByFile: {
		"Kakki_VCBoundary.kmz": "Kakki VC Boundary",
		"Kakki_Project Area.kmz": "Kakki Project Area",
		"Kakki_Zone.kmz": "Kakki Zones",
		"Kakki_DumpSites.kmz": "Kakki Dump Sites",
		"Kakki_Existing Drain.kmz": "Kakki Existing Drainage",
		"Kakki_Kachkot Canal.kmz": "Kakki Kachkot Canal",
		"Kakki_WaterSchemes.kmz": "Kakki Water Schemes",
	},
	kmzLayerColorsByFile: KAKKI_COLORS,
};

const PAHARPUR_COLORS: Record<string, string> = {
	"Paharpur_NCBoundary.kmz": "#1d4ed8",
	"Paharpur_Zones.kmz": "#db2777",
	"Paharpur_DumpSites.kmz": "#65a30d",
	"Paharpur_ExistingDrain.kmz": "#f97316",
	"Paharpur_ProposedDrainByCommunity.kmz": "#0d9488",
	"Paharpur_WaterSchemes.kmz": "#7c3aed",
};

export const PAHARPUR_KMZ_STANDALONE_CONFIG: KmzStandaloneSiteConfig = {
	title: "Paharpur GIS Maps",
	description:
		"View Paharpur KMZ layers on one online GIS map with selectable visibility and legends",
	kmzApiPath: "/api/gis/kmz/paharpur",
	legendsModalBrandLabel: "Paharpur GIS Map",
	exportFileBasePrefix: "Paharpur_GIS_Map",
	kmzLayerFileOrder: [
		"Paharpur_NCBoundary.kmz",
		"Paharpur_Zones.kmz",
		"Paharpur_DumpSites.kmz",
		"Paharpur_ExistingDrain.kmz",
		"Paharpur_ProposedDrainByCommunity.kmz",
		"Paharpur_WaterSchemes.kmz",
	],
	kmzDisplayNamesByFile: {
		"Paharpur_NCBoundary.kmz": "Paharpur NC Boundary",
		"Paharpur_Zones.kmz": "Paharpur Zones",
		"Paharpur_DumpSites.kmz": "Paharpur Dump Sites",
		"Paharpur_ExistingDrain.kmz": "Paharpur Existing Drainage",
		"Paharpur_ProposedDrainByCommunity.kmz": "Paharpur Proposed Drainage (Community)",
		"Paharpur_WaterSchemes.kmz": "Paharpur Water Schemes",
	},
	kmzLayerColorsByFile: PAHARPUR_COLORS,
};
