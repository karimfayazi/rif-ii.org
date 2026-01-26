# GIS Map Setup Guide

## Overview

This guide explains how to set up and use the GIS map feature at `/dashboard/maps/testing-gis`.

The system converts shapefiles to GeoJSON files and serves them through API routes for display on an interactive map.

## Prerequisites

1. Shapefiles stored on the server in a Windows folder
2. Node.js environment with required packages installed
3. Environment variable configured

## Step 1: Set Environment Variable

Add the following to your `.env.local` file:

```env
GIS_SOURCE_DIR=D:\PERSONAL\AHT GROUP\GIS-Map\Jan-2026\26-Jan2026\Final shapefiles\Final shapefiles
```

**Important:** Use double backslashes (`\\`) or forward slashes in the path.

## Step 2: Convert Shapefiles to GeoJSON

Run the conversion script to process all shapefiles:

```bash
npm run gis:convert
```

This script will:
- Scan the `GIS_SOURCE_DIR` folder recursively for `.shp` files
- Convert each shapefile to GeoJSON format
- Save GeoJSON files to `./gis-data/geojson/`
- Create a `manifest.json` file in `./gis-data/` listing all available layers

### What the Script Does

1. **Finds all shapefiles** in the source directory (recursively)
2. **Converts each shapefile** to GeoJSON using the `shapefile` npm package
3. **Determines layer type** (polygon, line, point) from geometry
4. **Generates layer keys and names**:
   - Files containing "district" → key: `district`, name: "District wise"
   - Files containing "tehsil" → key: `tehsil`, name: "Tehsil wise"
   - Files containing "uc" or "union" → key: `uc`, name: "UC wise"
   - Other files → key from filename, name formatted from filename
5. **Creates manifest.json** with all layer information

### Output Structure

```
gis-data/
├── manifest.json          # Layer manifest
└── geojson/
    ├── district.geojson   # District layer
    ├── tehsil.geojson     # Tehsil layer
    ├── uc.geojson         # UC layer
    └── ...                # Other layers
```

## Step 3: Access the Map

Navigate to: `http://your-server:3000/dashboard/maps/testing-gis`

## Features

### Layer Control Panel

- **Left sidebar** with checkboxes for each layer
- **Search functionality** to filter layers
- **Layer status** showing active layer count
- **Loading indicators** when layers are being fetched

### Map Features

- **OpenStreetMap basemap**
- **Layer toggling** - check/uncheck layers to show/hide
- **Hover highlight** - polygons highlight on mouseover
- **Click popups** - shows feature attributes
- **Auto-fit bounds** - map zooms to show all active layers
- **Responsive design** - works on different screen sizes

### Layer Types

The system automatically detects and styles different geometry types:

- **Polygon** - Blue fill with outline
- **Line** - Orange lines
- **Point** - Red circles

## API Routes

### GET `/api/gis/layers`

Returns the manifest of available layers.

**Response:**
```json
{
  "layers": [
    {
      "key": "district",
      "name": "District wise",
      "file": "district.geojson",
      "type": "polygon"
    },
    ...
  ]
}
```

### GET `/api/gis/layer/[key]`

Returns GeoJSON for a specific layer.

**Example:** `/api/gis/layer/district`

**Response:** GeoJSON FeatureCollection

## Troubleshooting

### "Manifest not found" Error

**Solution:** Run `npm run gis:convert` to generate the manifest and GeoJSON files.

### "Source directory does not exist" Error

**Solution:** Check that `GIS_SOURCE_DIR` in `.env.local` points to the correct folder path.

### Layers Not Appearing on Map

1. Check browser console for errors
2. Verify GeoJSON files exist in `gis-data/geojson/`
3. Check that the layer key matches the filename
4. Verify the API route is accessible: `/api/gis/layer/[key]`

### Map Not Loading

1. Check that Leaflet CSS and JS are loading (check browser Network tab)
2. Verify the map container has proper height
3. Check browser console for JavaScript errors

## Re-running Conversion

If you add new shapefiles or update existing ones:

1. Place new shapefiles in the `GIS_SOURCE_DIR` folder
2. Run `npm run gis:convert` again
3. The script will:
   - Convert new shapefiles
   - Update the manifest
   - Overwrite existing GeoJSON files with the same key

## File Structure

```
project-root/
├── scripts/
│   └── convert-shapefiles-to-geojson.js  # Conversion script
├── gis-data/
│   ├── manifest.json                      # Layer manifest
│   └── geojson/                          # Converted GeoJSON files
│       ├── district.geojson
│       ├── tehsil.geojson
│       └── ...
├── src/
│   └── app/
│       ├── api/
│       │   └── gis/
│       │       ├── layers/
│       │       │   └── route.ts          # Manifest API
│       │       └── layer/
│       │           └── [key]/
│       │               └── route.ts      # GeoJSON API
│       └── dashboard/
│           └── maps/
│               └── testing-gis/
│                   └── page.tsx          # Map UI page
└── .env.local                             # Environment variables
```

## Notes

- GeoJSON files are cached by the browser (1 hour cache)
- The manifest is cached for 5 minutes
- Large GeoJSON files are automatically compressed by Next.js
- The conversion script handles duplicate layer keys by appending numbers

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify environment variables are set correctly
3. Ensure shapefiles have all required files (.shp, .shx, .dbf)
4. Check server logs for API errors
