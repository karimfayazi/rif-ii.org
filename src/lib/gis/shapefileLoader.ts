/**
 * Shapefile Loader Utility
 * 
 * Server-side utility for:
 * - Scanning shapefile directories
 * - Converting shapefiles to GeoJSON
 * - Caching converted GeoJSON
 * - Handling CRS/projection conversion
 * 
 * SETUP INSTRUCTIONS:
 * 1. Place shapefiles in the directory specified by GIS_SHAPEFILES_DIR environment variable
 * 2. Each layer should have: .shp, .shx, .dbf, and optionally .prj files
 * 3. Set GIS_SHAPEFILES_DIR in .env.local:
 *    GIS_SHAPEFILES_DIR="D:\\PERSONAL\\AHT GROUP\\GIS-Map\\Jan-2026\\26-Jan2026\\Final shapefiles\\Final shapefiles"
 * 4. To add a new layer: Drop the shapefile set (.shp, .shx, .dbf, .prj) into the directory
 * 5. Refresh the page - the layer will appear in the list automatically
 */

import * as shapefile from 'shapefile';
import * as fs from 'fs/promises';
import * as path from 'path';
// @ts-ignore - proj4 doesn't have proper TypeScript definitions
import proj4 from 'proj4';
import type { LayerInfo, GeoJSONFeatureCollection } from './types';

// In-memory cache for converted GeoJSON
const geoJsonCache = new Map<string, { data: GeoJSONFeatureCollection; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Cache for layer list
let layerListCache: LayerInfo[] | null = null;
let layerListCacheTime: number = 0;
const LAYER_LIST_CACHE_TTL = 300000; // 5 minutes

/**
 * Get the shapefiles directory from environment variable
 */
function getShapefilesDir(): string {
  const dir = process.env.GIS_SHAPEFILES_DIR;
  if (!dir) {
    throw new Error('GIS_SHAPEFILES_DIR environment variable is not set. Please set it in .env.local');
  }
  return dir;
}

/**
 * Read .prj file and convert to proj4 string
 */
async function readPrjFile(prjPath: string): Promise<string | null> {
  try {
    const prjContent = await fs.readFile(prjPath, 'utf-8');
    
    // Common WGS84 projections
    if (prjContent.includes('WGS 84') || prjContent.includes('EPSG:4326')) {
      return '+proj=longlat +datum=WGS84 +no_defs';
    }
    
    // Try to parse common projections
    // This is a simplified parser - for production, consider using proj4js or ogr2ogr
    if (prjContent.includes('UTM')) {
      // Extract UTM zone if present
      const zoneMatch = prjContent.match(/UTM zone (\d+)/i);
      if (zoneMatch) {
        const zone = parseInt(zoneMatch[1]);
        const hemisphere = prjContent.includes('Northern') ? 'north' : 'south';
        return `+proj=utm +zone=${zone} +${hemisphere} +datum=WGS84 +units=m +no_defs`;
      }
    }
    
    // Default: assume WGS84 if we can't parse
    console.warn(`Could not parse .prj file: ${prjPath}. Assuming WGS84.`);
    return '+proj=longlat +datum=WGS84 +no_defs';
  } catch (error) {
    console.warn(`Could not read .prj file: ${prjPath}. Assuming WGS84.`);
    return null;
  }
}

/**
 * Reproject coordinates from source CRS to WGS84 (EPSG:4326)
 */
function reprojectToWGS84(coordinates: any, sourceProj: string | null): any {
  if (!sourceProj || sourceProj.includes('longlat') || sourceProj.includes('EPSG:4326')) {
    return coordinates; // Already in WGS84
  }

  try {
    const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';
    
    if (Array.isArray(coordinates[0])) {
      // Multi-dimensional array (LineString, Polygon, etc.)
      return coordinates.map((coord: any) => {
        if (Array.isArray(coord[0])) {
          return reprojectToWGS84(coord, sourceProj);
        }
        if (typeof coord[0] === 'number' && typeof coord[1] === 'number') {
          const [x, y] = proj4(sourceProj, wgs84, coord);
          return [x, y];
        }
        return coord;
      });
    } else if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
      // Point
      const [x, y] = proj4(sourceProj, wgs84, coordinates);
      return [x, y];
    }
    
    return coordinates;
  } catch (error) {
    console.error('Reprojection error:', error);
    return coordinates; // Return original if reprojection fails
  }
}

/**
 * Reproject a GeoJSON feature to WGS84
 */
function reprojectFeature(feature: any, sourceProj: string | null): any {
  if (!sourceProj || sourceProj.includes('longlat') || sourceProj.includes('EPSG:4326')) {
    return feature;
  }

  const reprojected = {
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: reprojectToWGS84(feature.geometry.coordinates, sourceProj)
    }
  };

  return reprojected;
}

/**
 * Convert shapefile to GeoJSON
 */
export async function convertShapefileToGeoJSON(
  fileBase: string,
  shapefileDir?: string
): Promise<GeoJSONFeatureCollection> {
  const dir = shapefileDir || getShapefilesDir();
  const shpPath = path.join(dir, `${fileBase}.shp`);
  
  // Check cache first
  const cacheKey = `${dir}:${fileBase}`;
  const cached = geoJsonCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // Check if files exist
    const shxPath = path.join(dir, `${fileBase}.shx`);
    const dbfPath = path.join(dir, `${fileBase}.dbf`);
    const prjPath = path.join(dir, `${fileBase}.prj`);

    await fs.access(shpPath);
    await fs.access(shxPath);
    await fs.access(dbfPath);

    // Read .prj file if it exists
    let sourceProj: string | null = null;
    try {
      await fs.access(prjPath);
      sourceProj = await readPrjFile(prjPath);
    } catch {
      // .prj file doesn't exist, assume WGS84
      sourceProj = '+proj=longlat +datum=WGS84 +no_defs';
    }

    // Convert shapefile to GeoJSON
    const source = await shapefile.open(shpPath);
    const features: any[] = [];
    let result = await source.read();

    while (!result.done) {
      if (result.value) {
        // Reproject if needed
        const feature = reprojectFeature(result.value, sourceProj);
        features.push(feature);
      }
      result = await source.read();
    }

    const geoJson: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      features: features
    };

    // Cache the result
    geoJsonCache.set(cacheKey, { data: geoJson, timestamp: Date.now() });

    return geoJson;
  } catch (error) {
    console.error(`Error converting shapefile ${fileBase}:`, error);
    throw new Error(
      `Failed to convert shapefile ${fileBase}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Scan directory for available shapefiles
 */
export async function scanShapefiles(shapefileDir?: string): Promise<LayerInfo[]> {
  const dir = shapefileDir || getShapefilesDir();
  
  // Check cache
  if (layerListCache && Date.now() - layerListCacheTime < LAYER_LIST_CACHE_TTL) {
    return layerListCache;
  }

  try {
    const files = await fs.readdir(dir);
    const shapefileBases = new Set<string>();

    // Find all .shp files
    files.forEach((file) => {
      if (file.endsWith('.shp')) {
        const baseName = file.replace('.shp', '');
        shapefileBases.add(baseName);
      }
    });

    // Build layer info
    const layers: LayerInfo[] = [];
    
    for (const baseName of shapefileBases) {
      const shpPath = path.join(dir, `${baseName}.shp`);
      const shxPath = path.join(dir, `${baseName}.shx`);
      const dbfPath = path.join(dir, `${baseName}.dbf`);

      // Verify all required files exist
      try {
        await Promise.all([
          fs.access(shpPath),
          fs.access(shxPath),
          fs.access(dbfPath)
        ]);

        // Try to determine geometry type by reading first feature
        let geometryType: LayerInfo['geometryType'] | undefined;
        try {
          const source = await shapefile.open(shpPath);
          const result = await source.read();
          if (!result.done && result.value?.geometry) {
            const geomType = result.value.geometry.type;
            geometryType = geomType as LayerInfo['geometryType'];
          }
        } catch {
          // Ignore errors when reading geometry type
        }

        layers.push({
          name: baseName,
          fileBase: baseName,
          geometryType
        });
      } catch {
        // Skip if required files are missing
        console.warn(`Skipping ${baseName}: missing required files (.shp, .shx, .dbf)`);
      }
    }

    // Sort alphabetically
    layers.sort((a, b) => a.name.localeCompare(b.name));

    // Update cache
    layerListCache = layers;
    layerListCacheTime = Date.now();

    return layers;
  } catch (error) {
    console.error('Error scanning shapefiles:', error);
    throw new Error(
      `Failed to scan shapefiles directory: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Clear caches (useful for testing or manual refresh)
 */
export function clearCaches(): void {
  geoJsonCache.clear();
  layerListCache = null;
  layerListCacheTime = 0;
}
