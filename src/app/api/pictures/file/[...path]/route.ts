import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join, normalize, resolve } from "path";
import { existsSync } from "fs";

// Define the uploads directory (where images are stored)
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

// Map file extensions to MIME types
const MIME_TYPES: { [key: string]: string } = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.bmp': 'image/bmp',
	'.svg': 'image/svg+xml',
};

export async function GET(
	request: NextRequest,
	{ params }: { params: { path: string[] } }
) {
	try {
		// Get the requested path segments
		const pathSegments = params.path || [];
		
		if (pathSegments.length === 0) {
			return NextResponse.json(
				{ success: false, message: "No file path provided" },
				{ status: 400 }
			);
		}

		// Decode each segment (handles URL encoding like %20 for spaces)
		const decodedSegments = pathSegments.map(segment => {
			try {
				return decodeURIComponent(segment);
			} catch (e) {
				// If decode fails, use the original segment
				return segment;
			}
		});
		
		// Join decoded segments
		let requestedPath = decodedSegments.join('/');
		
		// Normalize backslashes to forward slashes (Windows paths)
		requestedPath = requestedPath.replace(/\\/g, '/');
		
		// Security: Prevent path traversal attacks
		// Check for dangerous patterns before joining paths
		if (requestedPath.includes('..') || requestedPath.includes('~')) {
			console.error("Path traversal attempt detected:", requestedPath);
			return NextResponse.json(
				{ success: false, message: "Invalid file path", error: "Path traversal not allowed" },
				{ status: 400 }
			);
		}

		// Build absolute file path using resolve for security
		const filePath = resolve(UPLOAD_DIR, requestedPath);
		
		// Normalize paths for comparison (handle Windows vs Unix)
		const normalizedFilePath = normalize(filePath);
		const normalizedUploadDir = normalize(UPLOAD_DIR);
		
		// Security: Ensure resolved path is within UPLOAD_DIR
		// This prevents any path traversal attempts
		if (!normalizedFilePath.startsWith(normalizedUploadDir)) {
			console.error("Access denied - path outside UPLOAD_DIR:", normalizedFilePath);
			return NextResponse.json(
				{ success: false, message: "Access denied", error: "Path outside allowed directory" },
				{ status: 403 }
			);
		}

		// Check if file exists
		if (!existsSync(filePath)) {
			console.error("File not found:", filePath);
			return NextResponse.json(
				{ 
					success: false, 
					message: "File not found", 
					requestedPath: requestedPath,
					absolutePath: filePath
				},
				{ status: 404 }
			);
		}

		// Get file stats
		const fileStat = await stat(filePath);
		
		// Ensure it's a file, not a directory
		if (!fileStat.isFile()) {
			return NextResponse.json(
				{ success: false, message: "Path is not a file" },
				{ status: 400 }
			);
		}

		// Read file
		const fileBuffer = await readFile(filePath);
		
		// Determine content type based on extension
		const extension = requestedPath.substring(requestedPath.lastIndexOf('.')).toLowerCase();
		const contentType = MIME_TYPES[extension] || 'application/octet-stream';

		// Get the original filename (decoded)
		const fileName = decodedSegments[decodedSegments.length - 1];

		// Return file with appropriate headers
		return new NextResponse(fileBuffer, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Content-Length': fileBuffer.length.toString(),
				'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
				'Content-Disposition': `inline; filename="${fileName}"`,
			},
		});

	} catch (error) {
		console.error("Error serving file:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to serve file",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
