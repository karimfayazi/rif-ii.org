import ParoaGisMapContent from "@/components/remote-monitoring/ParoaGisMapContent";

const DOMEL_KMZ_LAYER_ORDER: string[] = [
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

const DOMEL_KMZ_DISPLAY_NAMES: Record<string, string> = {
	"Domel_VCBoundary.kmz": "Domel VC Boundary",
	"Domel_Project Area.kmz": "Domel Project Area",
	"Domel_Zone.kmz": "Domel Zones",
	"Domel_DumpSites.kmz": "Domel Dump Sites",
	"Domel_ExistingDrain.kmz": "Domel Existing Drainage",
	"Domel_ProposedDrainByCommunity.kmz": "Domel Proposed Drainage (Community)",
	"Domel_Waste WaterPond.kmz": "Domel Wastewater Pond",
	"Domel_Water Served Area.kmz": "Domel Water Served Area",
	"Domel_WaterSchemes.kmz": "Domel Water Schemes",
};

/** One distinct hue per KMZ so legend swatches and map symbology are easy to tell apart. */
const DOMEL_KMZ_LAYER_COLORS: Record<string, string> = {
	"Domel_VCBoundary.kmz": "#2563eb",
	"Domel_Project Area.kmz": "#c026d3",
	"Domel_Zone.kmz": "#ca8a04",
	"Domel_DumpSites.kmz": "#57534e",
	"Domel_ExistingDrain.kmz": "#0891b2",
	"Domel_ProposedDrainByCommunity.kmz": "#059669",
	"Domel_Waste WaterPond.kmz": "#db2777",
	"Domel_Water Served Area.kmz": "#65a30d",
	"Domel_WaterSchemes.kmz": "#ea580c",
};

export default function DomelGisMapStandalonePage() {
	return (
		<div className="min-h-screen bg-gray-100 px-4 py-6 sm:px-6 lg:px-8">
			<div className="mx-auto w-full max-w-none">
				<ParoaGisMapContent
					showBackButton={false}
					legendDisplayMode="modal"
					title="Domel GIS Maps"
					description="View Domel KMZ layers on one online GIS map with selectable visibility and legends"
					kmzApiPath="/api/gis/kmz/domel"
					legendsModalBrandLabel="Domel GIS Map"
					exportFileBasePrefix="Domel_GIS_Map"
					kmzLayerFileOrder={DOMEL_KMZ_LAYER_ORDER}
					kmzDisplayNamesByFile={DOMEL_KMZ_DISPLAY_NAMES}
					kmzLayerColorsByFile={DOMEL_KMZ_LAYER_COLORS}
					enableMapExport
				/>
			</div>
		</div>
	);
}
