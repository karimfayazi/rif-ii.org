import path from "path";
import {
	DASHBOARD_KMZ_DISPLAY_NAMES,
	DASHBOARD_KMZ_LAYER_ORDER,
} from "@/config/gis/dashboard-kmz-map-config";
import { listPublicDirectory } from "@/lib/gis/readPublicAsset";

const DASHBOARD_PUBLIC_DIR = "maps/dashboards";
const ALLOWED_EXTENSIONS = new Set([".kmz", ".kml"]);
const SAFE_FILE_NAME = /^[A-Za-z0-9._ -]+\.(kmz|kml)$/i;

export type DashboardKmzCategory =
	| "province"
	| "district"
	| "nc"
	| "vc"
	| "project-area"
	| "other";

export type DashboardKmzEntry = {
	id: string;
	fileName: string;
	displayName: string;
	category: DashboardKmzCategory;
	publicUrl: string;
	byteSize: number;
	sortPriority: number;
	color: string;
	defaultVisible: boolean;
};

const COLOR_PALETTE = [
	"#0b4d2b",
	"#1d4ed8",
	"#b45309",
	"#7c3aed",
	"#0891b2",
	"#be123c",
	"#15803d",
	"#c2410c",
	"#4338ca",
	"#0f766e",
];

function isAllowedFile(fileName: string) {
	return ALLOWED_EXTENSIONS.has(path.extname(fileName).toLowerCase()) && SAFE_FILE_NAME.test(fileName);
}

function toTitleCaseFromSnake(baseName: string) {
	return baseName
		.replace(/_/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase()
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildDisplayName(fileName: string) {
	if (DASHBOARD_KMZ_DISPLAY_NAMES[fileName]) {
		return DASHBOARD_KMZ_DISPLAY_NAMES[fileName];
	}

	const baseName = path.basename(fileName, path.extname(fileName));
	if (/provience/i.test(baseName)) {
		return toTitleCaseFromSnake(baseName.replace(/provience/i, "province"));
	}

	return toTitleCaseFromSnake(baseName);
}

function detectCategory(fileName: string): DashboardKmzCategory {
	const upper = fileName.toUpperCase();

	if (upper.includes("PROVIENCE") || upper.includes("PROVINCE") || upper.startsWith("KPK_")) {
		return "province";
	}
	if (upper.includes("DISTRICT")) {
		return "district";
	}
	if (upper.includes("PROJECTAREA") || upper.includes("PROJECT_AREA")) {
		return "project-area";
	}
	if (upper.startsWith("NC_") || upper.includes("_NC_")) {
		return "nc";
	}
	if (upper.startsWith("VC_") || upper.includes("_VC_")) {
		return "vc";
	}

	return "other";
}

function getSortPriority(fileName: string, category: DashboardKmzCategory) {
	const upper = fileName.toUpperCase();

	if (upper.includes("KPK_") && (upper.includes("PROVIENCE") || upper.includes("PROVINCE"))) {
		return 0;
	}
	if (upper.includes("DI_KHAN") || upper.includes("DIKHAN") || upper.includes("D_I_KHAN")) {
		return 1;
	}
	if (upper.includes("BANNU")) {
		return 2;
	}

	if (category === "district") return 10;
	if (category === "nc") return 20;
	if (category === "vc") return 30;
	if (category === "project-area") return 40;
	return 50;
}

function buildPublicUrl(fileName: string) {
	return `/maps/dashboards/${encodeURIComponent(fileName)}`;
}

function buildId(fileName: string) {
	return path
		.basename(fileName, path.extname(fileName))
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export async function getDashboardKmzEntries(): Promise<DashboardKmzEntry[]> {
	const fileNames = (
		await listPublicDirectory(DASHBOARD_PUBLIC_DIR, [...DASHBOARD_KMZ_LAYER_ORDER])
	).filter((name) => isAllowedFile(name));

	const mapped = fileNames.map((fileName, index) => {
		const category = detectCategory(fileName);
		const sortPriority = getSortPriority(fileName, category);

		return {
			id: buildId(fileName),
			fileName,
			displayName: buildDisplayName(fileName),
			category,
			publicUrl: buildPublicUrl(fileName),
			byteSize: 0,
			sortPriority,
			color: COLOR_PALETTE[index % COLOR_PALETTE.length],
			defaultVisible: sortPriority === 0,
		} satisfies DashboardKmzEntry;
	});

	return mapped
		.sort((a, b) => {
			if (a.sortPriority !== b.sortPriority) {
				return a.sortPriority - b.sortPriority;
			}
			return a.displayName.localeCompare(b.displayName);
		})
		.map((entry, index) => ({
			...entry,
			color: COLOR_PALETTE[index % COLOR_PALETTE.length],
		}));
}
