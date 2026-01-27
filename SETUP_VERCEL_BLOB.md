# Setting Up Vercel Blob for Large File Uploads

## Quick Start (5 minutes)

### 1. Get Your Vercel Blob Token

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click **Storage** in the left sidebar
4. Click **Create Database** → **Blob**
5. Name it (e.g., "report-uploads")
6. Copy the `BLOB_READ_WRITE_TOKEN` value

### 2. Set Environment Variable

#### Local Development

Create/update `.env.local`:

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

#### Production (Vercel)

1. Go to your project in Vercel Dashboard
2. Click **Settings** → **Environment Variables**
3. Add new variable:
   - **Name**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: `vercel_blob_rw_xxxxxxxxxxxxx`
   - **Environment**: Production, Preview, Development (select all)
4. Click **Save**

### 3. Test the Implementation

#### Local Testing

```bash
npm run dev
```

Navigate to: `http://localhost:3000/dashboard/remote-monitoring/testing-report`

Upload a file > 10MB to verify it works.

#### Production Testing

Deploy to Vercel:

```bash
git add .
git commit -m "Add Vercel Blob direct upload"
git push origin main
```

Once deployed, test with files > 10MB.

## How It Works

```
User selects file (100MB) 
    ↓
Browser validates size/type
    ↓
Request upload token from /api/blob/upload
    ↓
Upload file DIRECTLY to Vercel Blob (bypasses Next.js)
    ↓
Receive blob URL
    ↓
Save metadata + blob URL to database via /api/reports/save-metadata
    ↓
Done! ✅
```

## File Size Limits

| Environment | Old Limit | New Limit |
|------------|-----------|-----------|
| Development | 20MB | **100MB** |
| Vercel Production | ~4.5MB* | **100MB** |

*Serverless function payload limit

## Supported File Types

✅ PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX

## Troubleshooting

### "Missing BLOB_READ_WRITE_TOKEN"

**Error in console**: `Error: Missing BLOB_READ_WRITE_TOKEN`

**Fix**: Set the environment variable (see step 2 above)

### Upload stalls at 0%

**Possible causes**:
- No internet connection
- Token endpoint not accessible
- User lacks upload permissions

**Fix**: 
1. Check browser console for errors
2. Verify `/api/blob/upload` endpoint exists
3. Check user has `Upload_Report` permission

### "File too large" before upload

**This is expected!** Files > 100MB are rejected client-side.

**Fix**: Reduce file size or increase limit in code:
- `src/lib/uploads.ts` (line ~14)
- `src/app/api/blob/upload/route.ts` (line ~88)
- `src/components/reports/ReportUploadPage.tsx` (line ~241)

### 413 Payload Too Large (after implementing)

**This shouldn't happen anymore!** If you see this:

1. Verify you're using the new `/dashboard/remote-monitoring/testing-report` page
2. Check browser Network tab - file should go to `blob.vercel-storage.com`, not your API route
3. Clear browser cache and try again

## Verifying It's Working

### Check Browser Network Tab

When uploading, you should see:

1. **POST** to `/api/blob/upload` (small payload, gets token)
2. **PUT** to `https://blob.vercel-storage.com/...` (actual file upload)
3. **POST** to `/api/reports/save-metadata` (save metadata)

If you see **POST** to `/api/reports/upload` with a large payload, you're using the old method!

### Check Vercel Blob Dashboard

1. Go to Vercel Dashboard → Storage → Blob
2. You should see uploaded files listed
3. Path format: `remote-monitoring/testing-report/YYYY-MM/timestamp-id-filename.pdf`

### Check Database

Query:

```sql
SELECT TOP 10 
    ReportTitle, 
    FilePath, 
    EventDate, 
    MainCategory, 
    SubCategory
FROM [_rifiiorg_db].[rifiiorg].[tblReports]
ORDER BY ReportID DESC
```

`FilePath` should contain blob URLs:
```
https://xxxxx.public.blob.vercel-storage.com/remote-monitoring/testing-report/2026-01/...
```

## Cost Considerations

### Vercel Blob Pricing (as of 2024)

- **Free (Hobby)**: 1 GB storage, 100 GB bandwidth/month
- **Pro**: $0.15/GB storage, $0.40/GB bandwidth
- **Enterprise**: Custom pricing

### Tips to Reduce Costs

1. **Enable client-side compression** before upload
2. **Set file size limits** appropriately
3. **Implement file cleanup** for old/unused files
4. **Monitor usage** in Vercel dashboard
5. **Consider retention policies** (auto-delete after X days)

## Security Best Practices

✅ **Already Implemented**:
- User authentication required
- Permission checks (`Upload_Report` or Admin role)
- File type validation (client + server)
- File size limits (client + server)
- Sanitized filenames (no path traversal)
- Timestamped paths (prevents overwrites)

🔒 **Additional Recommendations**:
- Enable CORS restrictions on blob store
- Set short token expiration times
- Implement rate limiting on token endpoint
- Log all uploads for auditing
- Scan uploaded files for malware (if needed)

## Migration from Old System

### For Existing Files

Old files (uploaded before this implementation) remain in:
- **Local**: `public/uploads/reports/`
- **Vercel**: Vercel Blob (if already migrated)

Database `FilePath` column contains:
- **Old format**: `~/Uploads/Reports/filename.pdf`
- **New format**: `https://xxxxx.public.blob.vercel-storage.com/...`

### Both Work Together

The system handles both:
- Old files: Served from filesystem or existing blob storage
- New files: Uploaded via direct blob upload

No migration required unless you want to consolidate storage.

## Next Steps

1. ✅ Set `BLOB_READ_WRITE_TOKEN`
2. ✅ Test locally with file > 10MB
3. ✅ Deploy to Vercel
4. ✅ Test in production with file > 10MB
5. 📝 Monitor Vercel Blob dashboard for usage
6. 📝 Document for your team

## Support & Resources

- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Client Upload Guide](https://vercel.com/docs/storage/vercel-blob/client-upload)
- [Implementation Details](./VERCEL_BLOB_UPLOAD_IMPLEMENTATION.md)

---

**Questions?** Check the [full implementation guide](./VERCEL_BLOB_UPLOAD_IMPLEMENTATION.md) for detailed troubleshooting.
