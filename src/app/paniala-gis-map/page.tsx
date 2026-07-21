import ParoaGisMapContent from "@/components/remote-monitoring/ParoaGisMapContent";
import {
	PANIALA_KMZ_DISPLAY_NAMES,
	PANIALA_KMZ_LAYER_ORDER,
	PANIALA_LAYER_STYLE_SETTINGS_PANEL,
} from "@/config/gis/paniala-map-config";

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
					layerStyleSettingsPanel={PANIALA_LAYER_STYLE_SETTINGS_PANEL}
					enableMapExport
				/>
			</div>
		</div>
	);
}
