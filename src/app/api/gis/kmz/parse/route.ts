import { NextRequest, NextResponse } from "next/server";
import { parseKmzBuffer, type ParsedKMZ } from "@/lib/gis/kmz-parser";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const kmzFile = formData.get('file') as File;
		
		if (!kmzFile) {
			return NextResponse.json({
				success: false,
				message: "No KMZ file provided"
			}, { status: 400 });
		}
		
		// Validate file extension
		const fileName = kmzFile.name.toLowerCase();
		if (!fileName.endsWith('.kmz') && !fileName.endsWith('.kml')) {
			return NextResponse.json({
				success: false,
				message: "File must be a KMZ or KML file"
			}, { status: 400 });
		}
		
		// Validate file size (500MB limit for large GIS files)
		const maxSize = 500 * 1024 * 1024; // 500MB
		if (kmzFile.size > maxSize) {
			return NextResponse.json({
				success: false,
				message: `File size must be less than 500MB. Your file is ${(kmzFile.size / (1024 * 1024)).toFixed(2)}MB`
			}, { status: 400 });
		}
		
		const arrayBuffer = await kmzFile.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const result: ParsedKMZ = await parseKmzBuffer(buffer, kmzFile.name);
		
		return NextResponse.json({
			success: true,
			data: result
		});
		
	} catch (error) {
		console.error("Error processing KMZ file:", error);
		return NextResponse.json({
			success: false,
			message: "Failed to process KMZ file",
			error: error instanceof Error ? error.message : "Unknown error"
		}, { status: 500 });
	}
}
