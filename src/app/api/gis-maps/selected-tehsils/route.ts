import { NextResponse } from "next/server";
import { getSelectedTehsilMaps } from "@/lib/gis-selected-tehsils";

export async function GET() {
	try {
		// New gallery image loading logic: safely list allowed image files from public/maps/SelectedTehsils.
		const maps = await getSelectedTehsilMaps();

		return NextResponse.json({
			success: true,
			maps,
		});
	} catch (error) {
		console.error("Error loading GIS Selected Tehsils maps:", error);

		return NextResponse.json(
			{
				success: false,
				message: "Failed to load GIS maps",
			},
			{ status: 500 }
		);
	}
}
