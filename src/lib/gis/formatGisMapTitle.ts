/**
 * Display-only Title Case formatter for GIS map titles.
 * Does not rename files or alter routes — formats strings for UI headings only.
 */

const GIS_MAP_TITLE_ACRONYMS = new Set(["GIS", "KMZ", "GPS", "RC", "LC"]);

function safeDecode(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

/**
 * Converts a GIS map file name, URL segment, or raw title into professional Title Case.
 * - Safely URL-decodes
 * - Strips common image/map extensions
 * - Replaces `_`, `+`, and `-` separators with spaces
 * - Title-cases each word
 * - Keeps GIS, KMZ, GPS, RC, LC uppercase (case-insensitive whole-word match)
 * - Preserves other already-uppercase short tokens (e.g. SW, HH, DI) from source names
 */
export function formatGisMapTitle(raw: string): string {
	const decoded = safeDecode(String(raw ?? "").trim());

	const withoutExtension = decoded.replace(/\.(png|jpe?g|webp|gif|kmz|kml)$/i, "");

	const normalized = withoutExtension
		.replace(/[_+\-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	if (!normalized) {
		return "";
	}

	return normalized
		.split(" ")
		.filter(Boolean)
		.map((word) => {
			const upper = word.toUpperCase();
			if (GIS_MAP_TITLE_ACRONYMS.has(upper)) {
				return upper;
			}

			// Preserve filename acronyms already written in uppercase (SW, HH, DI, etc.)
			if (/^[A-Z]{2,}$/.test(word)) {
				return word;
			}

			if (!/[a-zA-Z]/.test(word)) {
				return word;
			}

			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		})
		.join(" ");
}
