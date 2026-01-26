/**
 * API Route: GET /api/gis/layer/[key]
 * 
 * Returns GeoJSON for a specific layer by key
 */

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    
    if (!key) {
      return NextResponse.json(
        {
          success: false,
          message: 'Layer key is required'
        },
        { status: 400 }
      );
    }
    
    // Security: prevent path traversal
    if (key.includes('..') || key.includes('/') || key.includes('\\')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid layer key'
        },
        { status: 400 }
      );
    }
    
    const geojsonPath = path.join(process.cwd(), 'gis-data', 'geojson', `${key}.geojson`);
    
    // Check if file exists
    try {
      await fs.access(geojsonPath);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: `Layer "${key}" not found`
        },
        { status: 404 }
      );
    }
    
    // Read GeoJSON file
    const geojsonContent = await fs.readFile(geojsonPath, 'utf-8');
    const geoJson = JSON.parse(geojsonContent);
    
    // Return GeoJSON with proper headers
    return NextResponse.json(geoJson, {
      headers: {
        'Content-Type': 'application/geo+json',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });
  } catch (error) {
    let key = 'unknown';
    try {
      const resolvedParams = await params;
      key = resolvedParams.key;
    } catch {
      // Ignore if params can't be resolved
    }
    console.error(`Error loading GIS layer ${key}:`, error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to load layer'
      },
      { status: 500 }
    );
  }
}
