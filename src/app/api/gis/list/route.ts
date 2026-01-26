/**
 * API Route: GET /api/gis/list
 * 
 * Returns a list of available GIS layers from the shapefiles directory
 */

import { NextResponse } from 'next/server';
import { scanShapefiles } from '@/lib/gis/shapefileLoader';

export async function GET() {
  try {
    const layers = await scanShapefiles();
    
    return NextResponse.json({
      success: true,
      layers
    });
  } catch (error) {
    console.error('Error listing GIS layers:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to list layers',
        error: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
