# Vercel Blob Upload Setup Guide

This guide explains how to configure Vercel Blob storage for file uploads in the RIF-II MIS Dashboard.

## Problem
Getting error: **"Vercel Blob: Failed to retrieve the client token"**

## Root Cause
The `BLOB_READ_WRITE_TOKEN` environment variable is not configured, which is required for Vercel Blob uploads to work.

## Solution

### Step 1: Get Your Vercel Blob Token

#### Option A: Create New Blob Storage (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click **Storage** tab in the left sidebar
4. Click **Create Database** → Select **Blob**
5. Give it a name (e.g., "rif-mis-uploads")
6. Click **Create**
7. After creation, click on your Blob store
8. Click **Settings** tab
9. Under **Environment Variables**, you'll see `BLOB_READ_WRITE_TOKEN`
10. Copy the token value (starts with `vercel_blob_rw_...`)

#### Option B: Use Existing Blob Storage
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click **Storage** tab
4. Click on your existing Blob store
5. Click **Settings** → **Environment Variables**
6. Copy the `BLOB_READ_WRITE_TOKEN` value

### Step 2: Configure Local Development

1. Create or edit `.env.local` in your project root:
```bash
# .env.local
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

2. **Important**: Restart your Next.js development server:
```bash
# Stop the server (Ctrl+C)
# Then start again
npm run dev
```

### Step 3: Configure Production (Vercel)

The token should already be set automatically when you created the Blob store. To verify:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click **Settings** → **Environment Variables**
4. Confirm `BLOB_READ_WRITE_TOKEN` exists
5. If not, add it manually:
   - Name: `BLOB_READ_WRITE_TOKEN`
   - Value: Your token from Step 1
   - Environments: Production, Preview, Development

6. After adding, redeploy your application

### Step 4: Test Upload

1. Navigate to `http://localhost:3000/dashboard/news/upload`
2. Click "Upload Image" area
3. Select an image file (JPG, PNG, GIF, WEBP)
4. Upload should work without errors
5. Image URL should be auto-filled after successful upload

## How It Works

### Upload Flow
```
User selects file
    ↓
Client validates file (type, size)
    ↓
Client calls: upload(file, { handleUploadUrl: '/api/blob/upload?folder=news' })
    ↓
Server endpoint: POST /api/blob/upload
    ↓
Server checks: BLOB_READ_WRITE_TOKEN exists?
    ↓
Server generates client token using Vercel Blob SDK
    ↓
Client receives token
    ↓
Client uploads directly to Vercel Blob
    ↓
Vercel Blob returns public URL
    ↓
Client stores URL in form state
    ↓
User submits form → URL saved to database
```

### File Organization
Uploaded files are organized in Vercel Blob storage:
```
news/
  └── 2026-01/
      ├── 1738123456789-abc123-image1.jpg
      ├── 1738123567890-def456-image2.png
      └── ...
reports/
  └── 2026-01/
      └── ...
pictures/
  └── 2026-01/
      └── ...
```

## Supported Upload Types

### News Images
- **Folder**: `news/`
- **Types**: JPG, JPEG, PNG, GIF, WEBP
- **Max Size**: 10MB (client-enforced)
- **Access**: Public
- **URL Format**: `https://[your-blob].public.blob.vercel-storage.com/news/...`

### Reports
- **Folder**: `reports/`
- **Types**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- **Max Size**: 100MB
- **Access**: Public

### Pictures
- **Folder**: `pictures/`
- **Types**: JPG, JPEG, PNG, GIF, WEBP
- **Max Size**: 100MB
- **Access**: Public

## Troubleshooting

### Error: "Failed to retrieve the client token"
- **Cause**: `BLOB_READ_WRITE_TOKEN` not set
- **Fix**: Follow Steps 1-2 above, then restart dev server

### Error: "Upload is not configured"
- **Cause**: Environment variable missing
- **Fix**: Add `BLOB_READ_WRITE_TOKEN` to `.env.local` and restart

### Error: "Access denied"
- **Cause**: User doesn't have upload permissions
- **Fix**: Grant `Upload_Report` permission in database

### Upload works locally but not on Vercel
- **Cause**: Token not set in Vercel project settings
- **Fix**: Follow Step 3 above

### Upload is slow
- **Cause**: Large file or slow connection
- **Note**: Progress bar shows upload status
- **Tip**: Use smaller images (compress before upload)

## Alternative: Use Image URL

If you cannot configure Vercel Blob:
1. Upload image to any image hosting service (Imgur, Cloudinary, etc.)
2. Copy the image URL
3. Paste into "Or Enter Image URL" field
4. Image preview will show automatically

## Security Notes

- ✅ Token is stored server-side only (never exposed to client)
- ✅ User permissions checked before generating upload token
- ✅ File types validated on both client and server
- ✅ File sizes limited to prevent abuse
- ✅ Filenames sanitized to prevent path traversal
- ✅ Unique filenames prevent overwrites

## API Endpoints

### POST /api/blob/upload
Generates client token for Vercel Blob upload.

**Query Parameters:**
- `folder`: Upload folder type (news, reports, pictures, documents)

**Authentication:**
- Requires valid user session
- Checks folder-specific upload permissions

**Response:**
```json
{
  "url": "https://...",
  "token": "...",
  "expiresAt": "..."
}
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob storage token |
| `DB_USER` | Yes | Database username |
| `DB_PASSWORD` | Yes | Database password |
| `DB_SERVER` | Yes | Database server address |
| `DB_DATABASE` | Yes | Database name |
| `DB_PORT` | No | Database port (default: 1433) |

## Support

If you continue to have issues:
1. Check Vercel Dashboard for Blob storage status
2. Verify token is correct and not expired
3. Check browser console for detailed error messages
4. Check server logs for API errors
5. Ensure dev server was restarted after adding token

## Related Files

- `src/lib/uploads.ts` - Client upload logic
- `src/app/api/blob/upload/route.ts` - Server token generator
- `src/app/dashboard/news/upload/page.tsx` - News upload form
- `.env.local` - Local environment variables (create this)
- `.env.local.example` - Environment variables template
