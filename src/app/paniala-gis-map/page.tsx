import ParoaGisMapContent from "@/components/remote-monitoring/ParoaGisMapContent";

const PANIALA_KMZ_LAYER_ORDER: string[] = [
	"Paniala_NC_Boundary.kmz",
	"Paniala_Zones_Data.kmz",
	"Paniala_DumpSites.kmz",
	"Paniala_Existing_Drain.kmz",
	"Paniala_Drain_Proposed_by_Community.kmz",
	"Paniala_WaterSupply_Schemes.kmz",
];

const PANIALA_KMZ_DISPLAY_NAMES: Record<string, string> = {
	"Paniala_NC_Boundary.kmz": "Paniala NC Boundary",
	"Paniala_Zones_Data.kmz": "Paniala Zones",
	"Paniala_DumpSites.kmz": "Paniala Dump Sites",
	"Paniala_Existing_Drain.kmz": "Paniala Existing Drainage",
	"Paniala_Drain_Proposed_by_Community.kmz": "Paniala Proposed Drainage (Community)",
	"Paniala_WaterSupply_Schemes.kmz": "Paniala Water Supply Schemes",
};

const PANIALA_KMZ_LAYER_COLORS: Record<string, string> = {
	"Paniala_NC_Boundary.kmz": "#1e40af",
	"Paniala_Zones_Data.kmz": "#6d28d9",
	"Paniala_DumpSites.kmz": "#713f12",
	"Paniala_Existing_Drain.kmz": "#0369a1",
	"Paniala_Drain_Proposed_by_Community.kmz": "#0f766e",
	"Paniala_WaterSupply_Schemes.kmz": "#0e7490",
};

export default function PanialaGisMapStandalonePage() {
	return (
		<div className="min-h-screen bg-gray-100 px-4 py-6 sm:px-6 lg:px-8">
			<div className="mx-auto w-full max-w-none">
				<ParoaGisMapContent
					showBackButton={false}
					legendDisplayMode="modal"
					title="Paniala GIS Maps"
					description="View Paniala KMZ layers on one online GIS map with selectable visibility and legends"
					kmzApiPath="/api/gis/kmz/paniala"
					legendsModalBrandLabel="Paniala GIS Map"
					exportFileBasePrefix="Paniala_GIS_Map"
					kmzLayerFileOrder={PANIALA_KMZ_LAYER_ORDER}
					kmzDisplayNamesByFile={PANIALA_KMZ_DISPLAY_NAMES}
					kmzLayerColorsByFile={PANIALA_KMZ_LAYER_COLORS}
					enableMapExport
				/>
			</div>
		</div>
	);
}
