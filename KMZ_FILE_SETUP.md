# KMZ File Setup Guide

## Problem
The KMZ file path is hardcoded for development. In production, you need to configure the file path.

## Solution Options

### Option 1: Use Environment Variable (Recommended)

1. **Create or update `.env.local` file** in your project root:

```env
KMZ_FILE_PATH=D:\PERSONAL\AHT GROUP\GIS-Map\6-Mapping Workshop Data\6-Mapping Workshop Data\Mapping Workshop Field Verification\kmz\DIK\Paniala Data.kmz
```

**For Production Server (Windows):**
```env
KMZ_FILE_PATH=C:\path\to\your\kmz\file\Paniala Data.kmz
```

**For Production Server (Linux):**
```env
KMZ_FILE_PATH=/var/www/maps/kmz/Paniala Data.kmz
```

2. **Restart your Next.js server** after adding the environment variable

### Option 2: Place File in Public Folder (Easier)

1. **Create the directory structure:**
   ```
   public/
   └── maps/
       └── kmz/
           └── Paniala Data.kmz
   ```

2. **Copy your KMZ file** to `public/maps/kmz/Paniala Data.kmz`

3. **No configuration needed!** The system will automatically find it.

### Option 3: Upload via File System

If you have access to the production server:

1. Upload `Paniala Data.kmz` to a location accessible by the Next.js server
2. Set `KMZ_FILE_PATH` environment variable to point to that location
3. Ensure the Next.js process has read permissions to that file

## Verification

After setup, visit:
- Development: `http://localhost:3000/dashboard/kml-gis-maps`
- Production: `https://your-domain.com/dashboard/kml-gis-maps`

The map should load without errors.

## Troubleshooting

### Error: "KMZ file not found or not accessible"

1. **Check file path:**
   - Verify the file exists at the specified path
   - Check file permissions (read access required)

2. **Check environment variable:**
   - Ensure `.env.local` is in the project root
   - Restart the server after adding the variable
   - Verify the path uses correct path separators (backslash for Windows, forward slash for Linux)

3. **Try public folder:**
   - Place file in `public/maps/kmz/Paniala Data.kmz`
   - This is the easiest solution and works without configuration

4. **Check server logs:**
   - Look for detailed error messages in the server console
   - The API will return searched paths in the error response

## File Path Priority

The system searches for the KMZ file in this order:

1. Path from `KMZ_FILE_PATH` environment variable
2. `public/maps/kmz/Paniala Data.kmz`
3. `public/Paniala Data.kmz`
4. Root directory `Paniala Data.kmz`
5. Development fallback path (Windows only)

