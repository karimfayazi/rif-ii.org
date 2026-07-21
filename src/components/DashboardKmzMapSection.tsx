"use client";

import ParoaGisMapContent from "@/components/remote-monitoring/ParoaGisMapContent";
import {
	DASHBOARD_KMZ_DISPLAY_NAMES,
	DASHBOARD_KMZ_LAYER_ORDER,
	DASHBOARD_LAYER_STYLE_SETTINGS_PANEL,
} from "@/config/gis/dashboard-kmz-map-config";

export default function DashboardKmzMapSection() {
	return (
		<ParoaGisMapContent
			showBackButton={false}
			legendDisplayMode="modal"
			title="RIF-II GIS Overview Maps"
			description=""
			kmzApiPath="/api/gis/kmz/dashboards"
			legendsModalBrandLabel="RIF-II GIS Overview Maps"
			exportFileBasePrefix="RIF_II_GIS_Overview_Map"
			kmzLayerFileOrder={DASHBOARD_KMZ_LAYER_ORDER}
			kmzDisplayNamesByFile={DASHBOARD_KMZ_DISPLAY_NAMES}
			layerStyleSettingsPanel={DASHBOARD_LAYER_STYLE_SETTINGS_PANEL}
			layerPickerConfig={{
				label: "Please Select for GIS Maps",
				title: "Select KMZ Files",
				description: "Choose one or more layers to display",
			}}
			enableMapExport
		/>
	);
}
