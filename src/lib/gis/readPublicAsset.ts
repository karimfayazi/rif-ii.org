import { promises as fs } from "fs";
import path from "path";

/**
 * Resolve a file under /public for serverless (Vercel) and local runtimes.
 * 1) Try disk at process.cwd()/public/...
 * 2) Fall back to fetching the static public URL (Vercel serves /public as CDN assets).
 *
 * Rejects empty / non-KMZ disk stubs (common when assets were stripped from the
 * deployment) so the URL fallback can still recover once files are on the CDN.
 */
export async function readPublicAsset(
	relativePublicPath: string,
): Promise<Buffer> {
	const normalized = relativePublicPath.replace(/^[/\\]+/, "").replace(/\\/g, "/");
	const diskPath = path.join(
		/* turbopackIgnore: true */ process.cwd(),
		"public",
		...normalized.split("/"),
	);

	let diskError: unknown;

	try {
		const diskBuffer = await fs.readFile(diskPath);
		if (isUsableMapAsset(diskBuffer, normalized)) {
			return diskBuffer;
		}
		diskError = new Error(
			`Public asset "${normalized}" on disk is empty or not a valid KMZ/KML (${diskBuffer.length} bytes)`,
		);
	} catch (error) {
		diskError = error;
	}

	const publicUrl = await resolvePublicAssetUrl(normalized);
	if (!publicUrl) {
		throw diskError;
	}

	const response = await fetch(publicUrl, { cache: "no-store" });
	if (!response.ok) {
		throw new Error(
			`Failed to load public asset "${normalized}" from disk and URL (${response.status})`,
		);
	}

	const arrayBuffer = await response.arrayBuffer();
	const urlBuffer = Buffer.from(arrayBuffer);
	if (!isUsableMapAsset(urlBuffer, normalized)) {
		throw new Error(
			`Public asset "${normalized}" from URL is empty or not a valid KMZ/KML (${urlBuffer.length} bytes)`,
		);
	}

	return urlBuffer;
}

export async function listPublicDirectory(
	relativePublicDir: string,
	fallbackFileNames: string[] = [],
): Promise<string[]> {
	const normalized = relativePublicDir.replace(/^[/\\]+/, "").replace(/\\/g, "/");
	const diskPath = path.join(
		/* turbopackIgnore: true */ process.cwd(),
		"public",
		...normalized.split("/"),
	);

	try {
		const entries = await fs.readdir(diskPath, { withFileTypes: true });
		return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
	} catch {
		return fallbackFileNames;
	}
}

/** ZIP local-file header (KMZ) or text that looks like KML. */
function isUsableMapAsset(buffer: Buffer, normalizedPath: string): boolean {
	if (buffer.length < 4) {
		return false;
	}

	// KMZ is a ZIP archive: PK\x03\x04 (or PK\x05\x06 empty zip / PK\x07\x08 spanned)
	if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
		return true;
	}

	const lower = normalizedPath.toLowerCase();
	if (lower.endsWith(".kml")) {
		const head = buffer.subarray(0, Math.min(buffer.length, 256)).toString("utf8").trimStart();
		return head.startsWith("<?xml") || head.startsWith("<kml") || head.startsWith("<KML");
	}

	return false;
}

async function resolvePublicAssetUrl(normalizedPublicPath: string): Promise<string | null> {
	const encodedPath = normalizedPublicPath
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");

	const base =
		process.env.NEXT_PUBLIC_BASE_URL ||
		(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
		(process.env.VERCEL_PROJECT_PRODUCTION_URL
			? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
			: null);

	if (!base) {
		return null;
	}

	return `${base.replace(/\/$/, "")}/${encodedPath}`;
}
