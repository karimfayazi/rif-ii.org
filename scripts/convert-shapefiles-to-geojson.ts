/**
 * Shapefile to GeoJSON Conversion Script
 * 
 * Converts all shapefiles from GIS_SOURCE_DIR to GeoJSON files
 * and creates a manifest.json for the GIS map application.
 * 
 * Usage:
 *   npm run gis:convert
 * 
 * Environment:
 *   GIS_SOURCE_DIR - Path to folder containing shapefiles
 *   Example: D:\PERSONAL\AHT GROUP\GIS-Map\Jan-2026\26-Jan2026\Final shapefiles\Final shapefiles
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as shapefile from 'shapefile';

interface LayerManifest {
  key: string;
  name: string;
  file: string;
  type: string;
}

interface Manifest {
  layers: LayerManifest[];
}

/**
 * Determine layer key and name from filename
 */
function getLayerInfo(filename: string): { key: string; name: string } {
  const lower = filename.toLowerCase();
  
  if (lower.includes('district')) {
    return { key: 'district', name: 'District wise' };
  } else if (lower.includes('tehsil')) {
    return { key: 'tehsil', name: 'Tehsil wise' };
  } else if (lower.includes('uc') || lower.includes('union')) {
    return { key: 'uc', name: 'UC wise' };
  }
  
  // Use filename as key and name (remove extension, capitalize)
  const baseName = filename.replace(/\.(shp|geojson)$/i, '');
  const key = baseName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const name = baseName
    .split(/[-_\s]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return { key, name };
}

/**
 * Determine geometry type from GeoJSON
 */
function getGeometryType(geoJson: any): string {
  if (!geoJson.features || geoJson.features.length === 0) {
    return 'unknown';
  }
  
  const firstFeature = geoJson.features[0];
  if (!firstFeature.geometry) {
    return 'unknown';
  }
  
  const geomType = firstFeature.geometry.type.toLowerCase();
  
  if (geomType.includes('polygon')) return 'polygon';
  if (geomType.includes('linestring')) return 'line';
  if (geomType.includes('point')) return 'point';
  if (geomType.includes('multipolygon')) return 'polygon';
  if (geomType.includes('multilinestring')) return 'line';
  if (geomType.includes('multipoint')) return 'point';
  
  return geomType;
}

/**
 * Convert a single shapefile to GeoJSON
 */
async function convertShapefile(
  baseName: string,
  sourceDir: string,
  outputDir: string
): Promise<{ success: boolean; filename: string; featureCount: number; geometryType?: string; error?: string }> {
  try {
    const shpPath = path.join(sourceDir, `${baseName}.shp`);
    const shxPath = path.join(sourceDir, `${baseName}.shx`);
    const dbfPath = path.join(sourceDir, `${baseName}.dbf`);
    
    // Check if required files exist
    try {
      await fs.access(shpPath);
      await fs.access(shxPath);
      await fs.access(dbfPath);
    } catch {
      return {
        success: false,
        filename: baseName,
        featureCount: 0,
        error: 'Missing required files (.shp, .shx, .dbf)'
      };
    }
    
    console.log(`  Converting ${baseName}...`);
    
    // Convert shapefile to GeoJSON
    const source = await shapefile.open(shpPath);
    const features: any[] = [];
    let result = await source.read();
    
    while (!result.done) {
      if (result.value) {
        features.push(result.value);
      }
      result = await source.read();
    }
    
    const geoJson = {
      type: 'FeatureCollection',
      features: features
    };
    
    // Determine geometry type
    const geometryType = getGeometryType(geoJson);
    
    // Get layer info
    const { key } = getLayerInfo(baseName);
    const outputFile = `${key}.geojson`;
    const outputPath = path.join(outputDir, outputFile);
    
    // Write GeoJSON file
    await fs.writeFile(outputPath, JSON.stringify(geoJson, null, 2), 'utf-8');
    
    console.log(`  ✓ ${baseName} → ${outputFile} (${features.length} features, ${geometryType})`);
    
    return {
      success: true,
      filename: baseName,
      featureCount: features.length,
      geometryType
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`  ✗ Failed to convert ${baseName}: ${errorMessage}`);
    return {
      success: false,
      filename: baseName,
      featureCount: 0,
      error: errorMessage
    };
  }
}

/**
 * Recursively find all .shp files in a directory
 */
async function findShapefiles(dir: string): Promise<string[]> {
  const shapefiles: string[] = [];
  
  async function scan(currentDir: string) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.shp')) {
          const baseName = path.basename(entry.name, '.shp');
          shapefiles.push(baseName);
        }
      }
    } catch (error) {
      console.warn(`  Warning: Could not read directory ${currentDir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  await scan(dir);
  return shapefiles;
}

/**
 * Main conversion function
 */
async function main() {
  console.log('=== Shapefile to GeoJSON Conversion ===\n');
  
  // Get source directory from environment
  const sourceDir = process.env.GIS_SOURCE_DIR;
  if (!sourceDir) {
    console.error('ERROR: GIS_SOURCE_DIR environment variable is not set.');
    console.error('Please set it in .env.local:');
    console.error('  GIS_SOURCE_DIR=D:\\PERSONAL\\AHT GROUP\\GIS-Map\\Jan-2026\\26-Jan2026\\Final shapefiles\\Final shapefiles');
    process.exit(1);
  }
  
  // Check if source directory exists
  try {
    await fs.access(sourceDir);
  } catch {
    console.error(`ERROR: Source directory does not exist: ${sourceDir}`);
    process.exit(1);
  }
  
  // Setup output directory
  const outputDir = path.join(process.cwd(), 'gis-data', 'geojson');
  const manifestPath = path.join(process.cwd(), 'gis-data', 'manifest.json');
  
  // Create output directory if it doesn't exist
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (error) {
    console.error(`ERROR: Could not create output directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
  
  console.log(`Source: ${sourceDir}`);
  console.log(`Output: ${outputDir}\n`);
  
  // Find all shapefiles
  console.log('Scanning for shapefiles...');
  const shapefileBases = await findShapefiles(sourceDir);
  
  if (shapefileBases.length === 0) {
    console.log('No shapefiles found in source directory.');
    process.exit(0);
  }
  
  console.log(`Found ${shapefileBases.length} shapefile(s)\n`);
  
  // Convert each shapefile
  const manifest: LayerManifest[] = [];
  const results = await Promise.all(
    shapefileBases.map(baseName => convertShapefile(baseName, sourceDir, outputDir))
  );
  
  // Build manifest from successful conversions
  for (const result of results) {
    if (result.success) {
      const { key, name } = getLayerInfo(result.filename);
      const layerInfo: LayerManifest = {
        key,
        name,
        file: `${key}.geojson`,
        type: result.geometryType || 'unknown'
      };
      
      // Check if key already exists (handle duplicates)
      const existingIndex = manifest.findIndex(l => l.key === key);
      if (existingIndex >= 0) {
        // Append number to make unique
        let counter = 2;
        let newKey = `${key}-${counter}`;
        while (manifest.findIndex(l => l.key === newKey) >= 0) {
          counter++;
          newKey = `${key}-${counter}`;
        }
        layerInfo.key = newKey;
        layerInfo.file = `${newKey}.geojson`;
        // Rename the file
        const oldPath = path.join(outputDir, `${key}.geojson`);
        const newPath = path.join(outputDir, `${newKey}.geojson`);
        try {
          await fs.rename(oldPath, newPath);
        } catch {
          // Ignore if file doesn't exist
        }
      }
      
      manifest.push(layerInfo);
    }
  }
  
  // Write manifest
  const manifestData: Manifest = { layers: manifest };
  await fs.writeFile(manifestPath, JSON.stringify(manifestData, null, 2), 'utf-8');
  
  // Summary
  console.log('\n=== Conversion Summary ===');
  console.log(`Total shapefiles: ${shapefileBases.length}`);
  console.log(`Successfully converted: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  console.log(`Layers in manifest: ${manifest.length}`);
  console.log(`\nManifest saved to: ${manifestPath}`);
  console.log('\n✓ Conversion complete!');
  
  if (results.some(r => !r.success)) {
    console.log('\nFailed conversions:');
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`  - ${r.filename}: ${r.error}`));
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
