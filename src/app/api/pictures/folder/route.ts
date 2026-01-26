import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { join, relative } from "path";
import { existsSync } from "fs";

// Define the uploads directory (where images are stored)
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'pictures');

// Supported image extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

// Recursively get all image files from a directory
async function getAllImageFiles(dir: string, fileList: Array<{path: string, mtime: Date}> = []): Promise<Array<{path: string, mtime: Date}>> {
	try {
		if (!existsSync(dir)) {
			return fileList;
		}

		const entries = await readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			
			if (entry.isDirectory()) {
				// Recursively scan subdirectories
				await getAllImageFiles(fullPath, fileList);
			} else if (entry.isFile()) {
				// Check if it's an image file
				const ext = entry.name.substring(entry.name.lastIndexOf('.')).toLowerCase();
				if (IMAGE_EXTENSIONS.includes(ext)) {
					const stats = await stat(fullPath);
					fileList.push({
						path: fullPath,
						mtime: stats.mtime
					});
				}
			}
		}

		return fileList;
	} catch (error) {
		console.error(`Error reading directory ${dir}:`, error);
		return fileList;
	}
}

export async function GET() {
	try {
		// Check if uploads directory exists
		if (!existsSync(UPLOAD_DIR)) {
			return NextResponse.json({
				success: true,
				files: [],
				message: "Uploads directory does not exist"
			});
		}

		// Get all image files recursively
		const allFiles = await getAllImageFiles(UPLOAD_DIR);

		// Sort by modification time (newest first)
		allFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

		// Helper to encode path segments for URLs
		const encodePathSegments = (path: string): string => {
			return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
		};

		// Convert to relative paths and create URLs
		const files = allFiles.map(file => {
			const relativePath = relative(join(process.cwd(), 'public', 'uploads'), file.path);
			// Normalize path separators to forward slashes for URLs
			const normalizedPath = relativePath.replace(/\\/g, '/');
			// Encode path segments to handle spaces and special characters
			const encodedPath = encodePathSegments(normalizedPath);
			
			return {
				name: file.path.substring(file.path.lastIndexOf(require('path').sep) + 1),
				relativePath: normalizedPath,
				url: `/api/pictures/file/${encodedPath}`,
				directUrl: `/uploads/${encodedPath}`,
				modifiedDate: file.mtime.toISOString(),
			};
		});

		return NextResponse.json({
			success: true,
			count: files.length,
			files: files
		});

	} catch (error) {
		console.error("Error listing folder images:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to list images",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
