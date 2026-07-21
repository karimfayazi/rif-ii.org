export const DASHBOARD_KMZ_LAYER_ORDER: string[] = [
	"KPK_PROVIENCE.kmz",
	"DI_KHAN_DISTRICT.kmz",
	"BANNU_DISTRICT.kmz",
	"NC_PAHARPUR.kmz",
	"NC_PAROA.kmz",
	"VC_DOMEL.kmz",
	"VC_KAKKI.kmz",
	"VC_DOMEL_PROJECTAREA.kmz",
	"VC_KAKKI_PROJECTAREA.kmz",
];

export const DASHBOARD_KMZ_DISPLAY_NAMES: Record<string, string> = {
	"KPK_PROVIENCE.kmz": "KPK Province",
	"DI_KHAN_DISTRICT.kmz": "DI Khan District",
	"BANNU_DISTRICT.kmz": "Bannu District",
	"NC_PAHARPUR.kmz": "NC Paharpur",
	"NC_PAROA.kmz": "NC Paroa",
	"VC_DOMEL.kmz": "VC Domel",
	"VC_DOMEL_PROJECTAREA.kmz": "VC Domel Project Area",
	"VC_KAKKI.kmz": "VC Kakki",
	"VC_KAKKI_PROJECTAREA.kmz": "VC Kakki Project Area",
};

export const DASHBOARD_LAYER_STYLE_SETTINGS_PANEL = {
	title: "Layer Style Settings",
	description: "Customize visibility, colors, opacity, and stroke width for each dashboard GIS layer.",
	storageKey: "dashboard_gis_layer_style_settings",
	defaultStylesByFile: {
		"KPK_PROVIENCE.kmz": {
			fillColor: "#0b4d2b",
			borderColor: "#0a3d24",
			fillOpacityPercent: 18,
			borderOpacityPercent: 95,
			borderWidth: 2,
		},
		"DI_KHAN_DISTRICT.kmz": {
			fillColor: "#2563eb",
			borderColor: "#1d4ed8",
			fillOpacityPercent: 24,
			borderOpacityPercent: 95,
			borderWidth: 2,
		},
		"BANNU_DISTRICT.kmz": {
			fillColor: "#f59e0b",
			borderColor: "#b45309",
			fillOpacityPercent: 22,
			borderOpacityPercent: 95,
			borderWidth: 2,
		},
		"NC_PAHARPUR.kmz": {
			fillColor: "#7c3aed",
			borderColor: "#5b21b6",
			fillOpacityPercent: 24,
			borderOpacityPercent: 95,
			borderWidth: 2,
		},
		"NC_PAROA.kmz": {
			fillColor: "#0891b2",
			borderColor: "#0e7490",
			fillOpacityPercent: 24,
			borderOpacityPercent: 95,
			borderWidth: 2,
		},
		"VC_DOMEL.kmz": {
			fillColor: "#be123c",
			borderColor: "#9f1239",
			fillOpacityPercent: 24,
			borderOpacityPercent: 95,
			borderWidth: 2,
		},
		"VC_KAKKI.kmz": {
			fillColor: "#15803d",
			borderColor: "#166534",
			fillOpacityPercent: 24,
			borderOpacityPercent: 95,
			borderWidth: 2,
		},
		"VC_DOMEL_PROJECTAREA.kmz": {
			fillColor: "#c2410c",
			borderColor: "#9a3412",
			fillOpacityPercent: 30,
			borderOpacityPercent: 95,
			borderWidth: 3,
		},
		"VC_KAKKI_PROJECTAREA.kmz": {
			fillColor: "#4338ca",
			borderColor: "#3730a3",
			fillOpacityPercent: 30,
			borderOpacityPercent: 95,
			borderWidth: 3,
		},
	},
} as const;
