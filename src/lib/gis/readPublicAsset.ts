import { promises as fs } from "fs";
import path from "path";

/**
 * Resolve a file under /public for serverless (Vercel) and local runtimes.
 * 1) Try disk at process.cwd()/public/...
 * 2) Fall back to fetching the static public URL (Vercel serves /public as CDN assets).
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

	try {
		return await fs.readFile(diskPath);
	} catch (diskError) {
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
		return Buffer.from(arrayBuffer);
	}
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
