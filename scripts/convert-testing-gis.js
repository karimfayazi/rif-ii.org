/**
 * Testing GIS Page - Shapefile to GeoJSON Conversion Script
 * 
 * Converts specific shapefiles for the /dashboard/maps/testing-gis page
 * Outputs to public/maps/testing-gis/ with exact filenames expected by the UI
 * 
 * Usage:
 *   npm run gis:convert-testing
 * 
 * Source Directory:
 *   D:\PERSONAL\AHT GROUP\GIS-Map\Jan-2026\26-Jan2026\Final shapefiles\Final shapefiles
 */

const fs = require('fs').promises;
const path = require('path');
const shapefile = require('shapefile');

// Source directory (hardcoded per user's spec)
const SOURCE_DIR = 'D:\\PERSONAL\\AHT GROUP\\GIS-Map\\Jan-2026\\26-Jan2026\\Final shapefiles\\Final shapefiles';

// Output directory in Next.js public folder
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'maps', 'testing-gis');

// Layer mapping: shapefile base name -> output GeoJSON filename
const LAYER_MAPPING = {
  // Paniala layers (3 files)
  'Paniala_NC_Boundary': 'paniala-boundary.geojson',
  'Paniala_WaterSupply_Schemes': 'paniala-water.geojson',
  
  // For SW layer: we'll merge multiple shapefiles into one
  // (DumpSites, Existing_Drain, Drain_Proposed_by_Community)
  'Paniala_DumpSites': 'paniala-sw-dumpsites.geojson',
  'Paniala_Existing_Drain': 'paniala-sw-existing-drain.geojson',
  'Paniala_Drain_Proposed_by_Community': 'paniala-sw-proposed-drain.geojson',
  
  // Additional district/tehsil layers (2 files)
  'KP_Districts': 'kp-districts.geojson',
  'DI_Khan_Tehsil': 'dik-tehsil.geojson'
};

/**
 * Convert a single shapefile to GeoJSON
 */
async function convertShapefile(baseName, outputFilename) {
  try {
    const shpPath = path.join(SOURCE_DIR, `${baseName}.shp`);
    const dbfPath = path.join(SOURCE_DIR, `${baseName}.dbf`);
    
    // Check if files exist
    try {
      await fs.access(shpPath);
      await fs.access(dbfPath);
    } catch {
      return {
        success: false,
        shapefile: baseName,
        output: outputFilename,
        error: 'Missing .shp or .dbf file'
      };
    }
    
    console.log(`  Converting ${baseName}...`);
    
    // Convert shapefile to GeoJSON
    const source = await shapefile.open(shpPath, dbfPath);
    const features = [];
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
    
    // Write GeoJSON file
    const outputPath = path.join(OUTPUT_DIR, outputFilename);
    await fs.writeFile(outputPath, JSON.stringify(geoJson, null, 2), 'utf-8');
    
    console.log(`  ✓ ${baseName} → ${outputFilename} (${features.length} features)`);
    
    return {
      success: true,
      shapefile: baseName,
      output: outputFilename,
      featureCount: features.length
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`  ✗ Failed to convert ${baseName}: ${errorMessage}`);
    return {
      success: false,
      shapefile: baseName,
      output: outputFilename,
      error: errorMessage
    };
  }
}

/**
 * Merge multiple GeoJSON files into one (for solid waste layers)
 */
async function mergeSolidWasteLayers() {
  try {
    console.log(`  Merging solid waste layers into single file...`);
    
    const swFiles = [
      'paniala-sw-dumpsites.geojson',
      'paniala-sw-existing-drain.geojson',
      'paniala-sw-proposed-drain.geojson'
    ];
    
    const allFeatures = [];
    
    for (const file of swFiles) {
      const filePath = path.join(OUTPUT_DIR, file);
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const geoJson = JSON.parse(data);
        if (geoJson.features) {
          allFeatures.push(...geoJson.features);
        }
      } catch (error) {
        console.warn(`  Warning: Could not read ${file}: ${error.message}`);
      }
    }
    
    // Create merged GeoJSON
    const mergedGeoJson = {
      type: 'FeatureCollection',
      features: allFeatures
    };
    
    // Write merged file
    const outputPath = path.join(OUTPUT_DIR, 'paniala-sw.geojson');
    await fs.writeFile(outputPath, JSON.stringify(mergedGeoJson, null, 2), 'utf-8');
    
    console.log(`  ✓ Merged ${allFeatures.length} solid waste features into paniala-sw.geojson`);
    
    // Clean up individual files (optional - keep them for now)
    // for (const file of swFiles) {
    //   await fs.unlink(path.join(OUTPUT_DIR, file));
    // }
    
    return { success: true, featureCount: allFeatures.length };
  } catch (error) {
    console.error(`  ✗ Failed to merge solid waste layers: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main conversion function
 */
async function main() {
  console.log('=== Testing GIS - Shapefile Conversion ===\n');
  
  // Check if source directory exists
  try {
    await fs.access(SOURCE_DIR);
    console.log(`Source: ${SOURCE_DIR}`);
  } catch {
    console.error(`ERROR: Source directory does not exist: ${SOURCE_DIR}`);
    console.error('Please check the path is correct.');
    process.exit(1);
  }
  
  // Create output directory
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`Output: ${OUTPUT_DIR}\n`);
  } catch (error) {
    console.error(`ERROR: Could not create output directory: ${error.message}`);
    process.exit(1);
  }
  
  // Convert each shapefile
  console.log('Converting shapefiles...\n');
  const results = [];
  
  for (const [baseName, outputFilename] of Object.entries(LAYER_MAPPING)) {
    const result = await convertShapefile(baseName, outputFilename);
    results.push(result);
  }
  
  console.log('');
  
  // Merge solid waste layers
  const mergeResult = await mergeSolidWasteLayers();
  
  // Summary
  console.log('\n=== Conversion Summary ===');
  console.log(`Total shapefiles: ${Object.keys(LAYER_MAPPING).length}`);
  console.log(`Successfully converted: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  console.log(`Merged solid waste: ${mergeResult.success ? 'Yes' : 'No'}`);
  console.log('\n✓ Conversion complete!');
  console.log(`\nFiles saved to: ${OUTPUT_DIR}`);
  
  if (results.some(r => !r.success)) {
    console.log('\nFailed conversions:');
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`  - ${r.shapefile}: ${r.error}`));
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
