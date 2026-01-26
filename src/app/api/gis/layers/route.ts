/**
 * API Route: GET /api/gis/layers
 * 
 * Returns the manifest of available GIS layers from converted GeoJSON files
 */

import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

interface LayerManifest {
  key: string;
  name: string;
  file: string;
  type: string;
}

interface Manifest {
  layers: LayerManifest[];
}

export async function GET() {
  try {
    const manifestPath = path.join(process.cwd(), 'gis-data', 'manifest.json');
    
    // Check if manifest exists
    try {
      await fs.access(manifestPath);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: 'Manifest not found. Please run "npm run gis:convert" to generate GeoJSON files.',
          layers: []
        },
        { status: 404 }
      );
    }
    
    // Read manifest
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest: Manifest = JSON.parse(manifestContent);
    
    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      }
    });
  } catch (error) {
    console.error('Error reading GIS layers manifest:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to load layers manifest',
        layers: []
      },
      { status: 500 }
    );
  }
}
