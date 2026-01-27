# GIS Map Route - Setup Documentation

## Route Information
**URL:** `http://172.16.171.62:3000/gis-map` (or `http://localhost:3000/gis-map`)  
**Type:** Standalone route (not in dashboard layout)  
**Framework:** Next.js 16 App Router

## Required Static Assets

This route requires GeoJSON files to be present in the `public/maps/testing-gis/` directory:

```
public/
└── maps/
    └── testing-gis/
        ├── paniala-boundary.geojson      (2 features)
        ├── paniala-water.geojson         (7 features)
        ├── paniala-sw.geojson            (92 features)
        ├── kp-districts.geojson          (35 features)
        └── dik-tehsil.geojson            (6 features)
```

### Generating GeoJSON Files

If the files don't exist, run the conversion script:

```bash
npm run gis:convert-testing
```

**Source Location:**
```
D:\PERSONAL\AHT GROUP\GIS-Map\Jan-2026\26-Jan2026\Final shapefiles\Final shapefiles
```

## Features

### Map Layers
1. **NC Boundary** - Paniala NC boundary polygon
2. **Water Infrastructure** - Water supply schemes (7 points)
3. **Solid Waste** - Combined dump sites, drains (92 features)
4. **KPK Districts** - Province-level districts
5. **DIK Tehsil** - DI Khan tehsil boundaries

### Interactive Controls
- ✅ Toggle layers on/off via dropdown menu
- ✅ Switch between Street and Satellite base layers
- ✅ Click features to view properties in popups
- ✅ Auto-fit bounds to visible layers
- ✅ Responsive design

### Technology Stack
- **Map Library:** Leaflet 1.9.4 (loaded via CDN)
- **Tile Layers:** 
  - Street: OpenStreetMap
  - Satellite: Esri World Imagery
- **Data Format:** GeoJSON (WGS84 / EPSG:4326)
- **Styling:** TailwindCSS
- **Icons:** Lucide React

## File Structure

```
src/app/gis-map/
├── page.tsx          # Main GIS map page component
└── README.md         # This file

public/maps/testing-gis/
├── *.geojson         # GeoJSON layer files

scripts/
└── convert-testing-gis.js  # Shapefile to GeoJSON converter
```

## Development

### Running Locally
```bash
npm run dev
```
Navigate to: `http://localhost:3000/gis-map`

### Building for Production
```bash
npm run build
npm run start
```

### Verifying Assets
Check that all GeoJSON files return 200:
- `http://localhost:3000/maps/testing-gis/paniala-boundary.geojson`
- `http://localhost:3000/maps/testing-gis/paniala-water.geojson`
- `http://localhost:3000/maps/testing-gis/paniala-sw.geojson`
- `http://localhost:3000/maps/testing-gis/kp-districts.geojson`
- `http://localhost:3000/maps/testing-gis/dik-tehsil.geojson`

## Troubleshooting

### Map doesn't load
1. Check browser console for errors
2. Verify GeoJSON files exist in `public/maps/testing-gis/`
3. Ensure Leaflet CDN is accessible (requires internet)

### 404 errors for layers
- Run `npm run gis:convert-testing` to generate GeoJSON files
- Check file paths match exactly (case-sensitive)

### Map appears but layers don't show
- Open browser DevTools → Network tab
- Look for failed fetch requests
- Verify GeoJSON files are valid (check for JSON parse errors)

### SSR errors
- This component uses `'use client'` directive
- Leaflet only loads on client-side (requires `window` object)
- No SSR issues expected

## Performance Notes

- GeoJSON files are cached by browser (cache-busting with `?v=20260127`)
- Leaflet library (~150KB) loaded via CDN
- Largest file: `kp-districts.geojson` (~5.6 MB)
- Initial load time: ~2-3 seconds
- Interactive performance: 60 FPS

## Differences from Original Testing-GIS Route

| Feature | Testing-GIS Route | GIS-Map Route |
|---------|------------------|---------------|
| URL | `/dashboard/maps/testing-gis` | `/gis-map` |
| Layout | Dashboard layout | Standalone |
| Back Button | Router.back() | Link to home |
| Assets | Same (`/maps/testing-gis/`) | Same |
| Component | Separate file | Embedded |
| Features | Identical | Identical |

## Future Enhancements

- [ ] Add base layer switcher UI
- [ ] Export map as PNG/PDF
- [ ] Add measurement tools
- [ ] Layer opacity controls
- [ ] Search/filter features
- [ ] Print-friendly view

## Support

For issues or questions:
- Check `/GIS_TESTING_UPDATE.md` for layer update history
- Review `/scripts/convert-testing-gis.js` for conversion details
- Verify source shapefiles exist and are readable
