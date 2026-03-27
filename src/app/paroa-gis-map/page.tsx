import ParoaGisMapContent from "@/components/remote-monitoring/ParoaGisMapContent";

const PAROA_KMZ_LAYER_ORDER: string[] = [
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

const PAROA_KMZ_DISPLAY_NAMES: Record<string, string> = {
	"Paroa_NCBoundary.kmz": "Paroa NC Boundary",
	"Paroa_CommercialArea.kmz": "Paroa Commercial Area",
	"Paroa_Zone.kmz": "Paroa Zones",
	"Paroa_DairyFarm.kmz": "Paroa Dairy Farms",
	"Paroa_DumpSites.kmz": "Paroa Dump Sites",
	"Paroa_ExistingDrain.kmz": "Paroa Existing Drainage",
	"Paroa_ProposedDrainByCommunity.kmz": "Paroa Proposed Drainage Community",
	"Paroa_Waste WaterPonds.kmz": "Paroa Wastewater Ponds",
	"Paroa_WaterData.kmz": "Paroa Water Data",
	"Paroa_WaterSchemes.kmz": "Paroa Water Schemes",
	"Paroa_WaterSupplyLines.kmz": "Paroa Water Supply Lines",
};

/** Central palette: legend swatches and map symbology use the same hex per KMZ file. */
const PAROA_KMZ_LAYER_COLORS: Record<string, string> = {
	"Paroa_NCBoundary.kmz": "#1e40af",
	"Paroa_CommercialArea.kmz": "#d97706",
	"Paroa_Zone.kmz": "#6d28d9",
	"Paroa_DairyFarm.kmz": "#047857",
	"Paroa_DumpSites.kmz": "#713f12",
	"Paroa_ExistingDrain.kmz": "#0369a1",
	"Paroa_ProposedDrainByCommunity.kmz": "#0f766e",
	"Paroa_Waste WaterPonds.kmz": "#a21caf",
	"Paroa_WaterData.kmz": "#1d4ed8",
	"Paroa_WaterSchemes.kmz": "#0e7490",
	"Paroa_WaterSupplyLines.kmz": "#a16207",
};

export default function ParoaGisMapStandalonePage() {
	return (
		<div className="min-h-screen bg-gray-100 px-4 py-6 sm:px-6 lg:px-8">
			<div className="mx-auto w-full max-w-none">
				<ParoaGisMapContent
					showBackButton={false}
					legendDisplayMode="modal"
					kmzLayerFileOrder={PAROA_KMZ_LAYER_ORDER}
					kmzDisplayNamesByFile={PAROA_KMZ_DISPLAY_NAMES}
					kmzLayerColorsByFile={PAROA_KMZ_LAYER_COLORS}
					enableMapExport
				/>
			</div>
		</div>
	);
}
