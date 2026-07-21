import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

/**
 * Local/dev filesystem helpers for uploads.
 * On Vercel, callers should use @vercel/blob instead — this module is only for
 * non-Vercel environments where the local disk is writable.
 *
 * process.cwd() is marked turbopackIgnore so NFT does not treat the project
 * root as an unintentional full-project dependency.
 */
function localPublicRoot(): string {
	return join(/* turbopackIgnore: true */ process.cwd(), "public");
}

export async function ensureLocalUploadDir(
	...relativeSegments: string[]
): Promise<string> {
	const uploadDir = join(localPublicRoot(), ...relativeSegments);
	if (!existsSync(uploadDir)) {
		await mkdir(uploadDir, { recursive: true });
	}
	return uploadDir;
}

export async function writeLocalUploadFile(
	uploadDir: string,
	fileName: string,
	buffer: Buffer
): Promise<string> {
	const filePath = join(uploadDir, fileName);
	await writeFile(filePath, buffer);
	return filePath;
}

export function getLocalPublicUploadDir(
	...relativeSegments: string[]
): string {
	return join(localPublicRoot(), ...relativeSegments);
}
