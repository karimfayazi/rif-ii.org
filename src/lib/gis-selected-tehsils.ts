import { promises as fs } from "fs";
import path from "path";

const GIS_MAPS_FOLDER = path.join(process.cwd(), "public", "maps", "SelectedTehsils");
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const MAP_METADATA: Record<string, { title: string; category: string }> = {
	"Paharpur Cattle Frams Map.jpg": {
		title: "Paharpur Cattle Farms Map",
		category: "Cattle Farms",
	},
	"Paharpur HH Map without Zoning Layer.jpg": {
		title: "Paharpur HH Map without Zoning Layer",
		category: "Household",
	},
	"Paharpur Scrape Dealers Hospitals & Clinics Map.jpg": {
		title: "Paharpur Scrape Dealers Hospitals & Clinics Map",
		category: "Scrape Dealers",
	},
	"Paharpur Scrape Dealers Map.jpg": {
		title: "Paharpur Scrape Dealers Map",
		category: "Scrape Dealers",
	},
	"Paroa Cattle Frams Map.jpg": {
		title: "Paroa Cattle Farms Map",
		category: "Cattle Farms",
	},
	"Paroa HH Map.jpg": {
		title: "Paroa HH Map",
		category: "Household",
	},
	"Paroa Scrape Dealers Hospitals & Clinics Map.jpg": {
		title: "Paroa Scrape Dealers Hospitals & Clinics Map",
		category: "Scrape Dealers",
	},
	"Paroa Scrape Dealers Map.jpg": {
		title: "Paroa Scrape Dealers Map",
		category: "Scrape Dealers",
	},
};

export type GISMapImage = {
	fileName: string;
	title: string;
	imageUrl: string;
	detailUrl: string;
	category: string;
};

function isAllowedImage(fileName: string) {
	return ALLOWED_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function buildImageUrl(fileName: string) {
	return `/maps/SelectedTehsils/${encodeURIComponent(fileName)}`;
}

function buildDetailUrl(fileName: string) {
	return `/dashboard/maps/gis-maps/${encodeURIComponent(fileName)}`;
}

function buildTitle(fileName: string) {
	const mappedTitle = MAP_METADATA[fileName]?.title;
	if (mappedTitle) {
		return mappedTitle;
	}

	return path.basename(fileName, path.extname(fileName));
}

function detectCategory(fileName: string) {
	const mappedCategory = MAP_METADATA[fileName]?.category;
	if (mappedCategory) {
		return mappedCategory;
	}

	const lower = fileName.toLowerCase();

	if (lower.includes("boundary")) return "Boundary";
	if (lower.includes("water")) return "Water";
	if (lower.includes("sanitation")) return "Sanitation";
	if (lower.includes("road network")) return "Road Network";
	if (lower.includes("sw zone")) return "SW Zone";
	if (lower.includes("sw map")) return "Solid Waste";
	if (lower.includes("demographic")) return "Demographic";
	if (lower.includes("district")) return "District";
	if (lower.includes("tehsil")) return "Tehsil";

	return "Other";
}

export async function getSelectedTehsilMaps(): Promise<GISMapImage[]> {
	const files = await fs.readdir(GIS_MAPS_FOLDER, { withFileTypes: true });

	return files
		.filter((entry) => entry.isFile() && isAllowedImage(entry.name))
		.map((entry) => ({
			fileName: entry.name,
			title: buildTitle(entry.name),
			imageUrl: buildImageUrl(entry.name),
			detailUrl: buildDetailUrl(entry.name),
			category: detectCategory(entry.name),
		}))
		.sort((a, b) => a.fileName.localeCompare(b.fileName));
}

export async function getSelectedTehsilMapByName(fileName: string): Promise<GISMapImage | null> {
	const maps = await getSelectedTehsilMaps();
	return maps.find((item) => item.fileName === fileName) ?? null;
}
