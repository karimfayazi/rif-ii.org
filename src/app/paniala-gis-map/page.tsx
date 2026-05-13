import ParoaGisMapContent from "@/components/remote-monitoring/ParoaGisMapContent";

const PANIALA_KMZ_LAYER_ORDER: string[] = [
	"paniala-nc-boundary",
	"paniala-zones",
	"paniala-dump-sites",
	"paniala-existing-drainage",
	"paniala-proposed-drainage",
	"paniala-water-supply",
];

const PANIALA_KMZ_DISPLAY_NAMES: Record<string, string> = {
	"paniala-nc-boundary": "Paniala NC Boundary",
	"paniala-zones": "Paniala Zones",
	"paniala-dump-sites": "Paniala Dump Sites",
	"paniala-existing-drainage": "Paniala Existing Drainage",
	"paniala-proposed-drainage": "Paniala Proposed Drainage (Community)",
	"paniala-water-supply": "Paniala Water Supply Schemes",
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
					layerStyleSettingsPanel={{
						title: "Layer Style Settings",
						description: "Customize visibility, colors, opacity, and stroke width for each Paniala GIS layer.",
						storageKey: "paniala_gis_layer_style_settings",
						defaultStylesByFile: {
							"paniala-nc-boundary": {
								fillColor: "#2563eb",
								borderColor: "#1e40af",
								fillOpacityPercent: 25,
								borderOpacityPercent: 90,
								borderWidth: 2,
							},
							"paniala-zones": {
								fillColor: "#16a34a",
								borderColor: "#166534",
								fillOpacityPercent: 25,
								borderOpacityPercent: 90,
								borderWidth: 2,
							},
							"paniala-dump-sites": {
								fillColor: "#f97316",
								borderColor: "#c2410c",
								fillOpacityPercent: 80,
								borderOpacityPercent: 100,
								borderWidth: 2,
							},
							"paniala-existing-drainage": {
								fillColor: "#0ea5e9",
								borderColor: "#0369a1",
								fillOpacityPercent: 60,
								borderOpacityPercent: 95,
								borderWidth: 3,
							},
							"paniala-proposed-drainage": {
								fillColor: "#14b8a6",
								borderColor: "#0f766e",
								fillOpacityPercent: 60,
								borderOpacityPercent: 95,
								borderWidth: 3,
							},
							"paniala-water-supply": {
								fillColor: "#06b6d4",
								borderColor: "#0e7490",
								fillOpacityPercent: 80,
								borderOpacityPercent: 100,
								borderWidth: 2,
							},
						},
					}}
					enableMapExport
				/>
			</div>
		</div>
	);
}
