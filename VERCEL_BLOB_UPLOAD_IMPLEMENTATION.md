# Vercel Blob Direct Upload Implementation

## Overview

This implementation enables direct client-side uploads to Vercel Blob storage, bypassing serverless function payload limits. Files up to **100MB** can now be uploaded directly from the browser to Vercel Blob.

## Why Direct Upload?

**Problem**: Serverless functions have payload size limits (~4.5MB on Vercel Hobby, ~4.5-10MB on Pro). Uploading large files through Next.js API routes fails with payload errors.

**Solution**: Use Vercel Blob's client-side upload API (`@vercel/blob/client`) to upload files directly from the browser to Blob storage, then save metadata to the database.

## Architecture

```
┌─────────────┐
│   Browser   │
│  (Client)   │
└──────┬──────┘
       │
       │ 1. Request upload token
       ├──────────────────────────────┐
       │                              │
       │                    ┌─────────▼────────────┐
       │                    │ /api/blob/upload     │
       │                    │ (Token Generator)    │
       │                    └─────────┬────────────┘
       │                              │
       │ 2. Receive upload token      │
       │◄─────────────────────────────┘
       │
       │ 3. Upload file directly (bypasses Next.js)
       ├──────────────────────────────────────────┐
       │                                          │
       │                                ┌─────────▼──────────┐
       │                                │   Vercel Blob      │
       │                                │   Storage          │
       │                                └─────────┬──────────┘
       │                                          │
       │ 4. Receive blob URL                      │
       │◄─────────────────────────────────────────┘
       │
       │ 5. Save metadata (blob URL + form data)
       ├──────────────────────────────────────────┐
       │                                          │
       │                              ┌───────────▼──────────┐
       │                              │ /api/reports/        │
       │                              │  save-metadata       │
       │                              │                      │
       │                              └───────────┬──────────┘
       │                                          │
       │                                          │ Insert to DB
       │                                          │
       │                                    ┌─────▼──────┐
       │                                    │  Database  │
       │                                    └────────────┘
       │
       │ 6. Success response
       │◄─────────────────────────────────┘
       │
       ▼
   [Upload Complete]
```

## Files Modified/Created

### New Files

1. **`src/app/api/blob/upload/route.ts`**
   - Token generation endpoint for Vercel Blob uploads
   - Uses `handleUpload` from `@vercel/blob/client`
   - Validates file types and sizes (max 100MB)
   - Generates safe pathnames: `remote-monitoring/testing-report/{year-month}/{timestamp}-{randomId}-{filename}`
   - Checks user permissions before issuing tokens

2. **`src/app/api/reports/save-metadata/route.ts`**
   - Saves report metadata to database after blob upload
   - Receives blob URLs, form data, and file metadata
   - Inserts records into `tblReports` table

3. **`src/lib/uploads.ts`**
   - Client-side upload utilities
   - `uploadToBlob()`: Upload single file with progress tracking
   - `uploadMultipleToBlob()`: Upload multiple files sequentially
   - File validation (type, size, extensions)
   - Progress callbacks for UI updates

### Modified Files

1. **`src/components/reports/ReportUploadPage.tsx`**
   - Updated to use direct Vercel Blob uploads for new reports
   - Added progress tracking per file
   - Updated max file size to 100MB
   - Kept old upload method for edit mode (for backwards compatibility)
   - Better error handling and validation

## Environment Variables

Add to `.env.local` (development) and Vercel Environment Variables (production):

```bash
# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

### Getting Your Token

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Storage** → **Blob**
4. Create a new Blob store (if not exists)
5. Copy the `BLOB_READ_WRITE_TOKEN`

## Usage

### For Users

Navigate to: `/dashboard/remote-monitoring/testing-report`

1. Fill in report details
2. Select files (up to 100MB each)
3. Click "Upload Reports"
4. Files upload directly to Vercel Blob with progress tracking
5. Metadata saves to database
6. Redirects to reports page on success

### For Developers

**Upload a file programmatically:**

```typescript
import { uploadToBlob } from '@/lib/uploads';

const file = new File(['content'], 'report.pdf', { type: 'application/pdf' });

const result = await uploadToBlob(file, (progress) => {
  console.log(`Upload progress: ${progress.percentage}%`);
});

console.log('Uploaded to:', result.url);
```

**Upload multiple files:**

```typescript
import { uploadMultipleToBlob } from '@/lib/uploads';

const files = [file1, file2, file3];

const results = await uploadMultipleToBlob(files, (index, fileName, progress) => {
  console.log(`File ${index + 1}: ${fileName} - ${progress.percentage}%`);
});

results.forEach(r => console.log('Uploaded:', r.url));
```

## File Size Limits

| Limit Type | Size | Notes |
|------------|------|-------|
| Per File | 100MB | Enforced client-side and in token endpoint |
| Total Upload | Unlimited | Sequential uploads (not parallel) |
| Database Field | Text | FilePath stores blob URL |

## Supported File Types

- **Documents**: PDF, DOC, DOCX
- **Spreadsheets**: XLS, XLSX
- **Presentations**: PPT, PPTX

## Security

1. **Authentication**: Token endpoint checks user permissions via `getUserIdFromRequest()`
2. **Authorization**: Only users with `Upload_Report` permission or Admin role can upload
3. **File Type Validation**: Enforced on client and server
4. **File Size Validation**: Checked before upload and in token generation
5. **Pathname Safety**: Filenames sanitized to prevent path traversal

## Error Handling

### Client-Side Errors

- File too large (>100MB): Shows error before upload starts
- Unsupported file type: Shows error before upload starts
- Network errors: Shows detailed error message
- Upload failures: Retries not implemented (single attempt per file)

### Server-Side Errors

- Missing `BLOB_READ_WRITE_TOKEN`: Returns 500 error
- Unauthorized access: Returns 403 error
- Invalid file metadata: Returns 400 error
- Database errors: Returns 500 error with details

## Testing

### Local Development

1. Set `BLOB_READ_WRITE_TOKEN` in `.env.local`
2. Run dev server: `npm run dev`
3. Navigate to `/dashboard/remote-monitoring/testing-report`
4. Upload test files (try various sizes up to 100MB)
5. Check console for upload progress logs
6. Verify files appear in Vercel Blob dashboard

### Production (Vercel)

1. Set `BLOB_READ_WRITE_TOKEN` in Vercel project settings
2. Deploy to Vercel
3. Test with files >10MB to verify it works (old implementation would fail)
4. Monitor Vercel Blob storage usage
5. Check database for correct blob URLs

## Troubleshooting

### "Missing BLOB_READ_WRITE_TOKEN"

**Problem**: Token not set in environment variables

**Solution**: Add token to `.env.local` (dev) or Vercel dashboard (production)

### "File too large" error

**Problem**: File exceeds 100MB limit

**Solution**: 
- Reduce file size
- Or increase limit in:
  - `src/lib/uploads.ts` (line with `maxSize`)
  - `src/app/api/blob/upload/route.ts` (line with `maxSize`)
  - `src/components/reports/ReportUploadPage.tsx` (validation)

### Upload stalls at 0%

**Problem**: Network issues or token endpoint not responding

**Solution**:
- Check browser console for errors
- Verify `/api/blob/upload` endpoint is accessible
- Check user permissions

### "Unauthorized" error

**Problem**: User lacks upload permissions

**Solution**: Grant user `Upload_Report` permission or Admin role in database

## Performance

- **Upload Speed**: Direct to CDN (no server bottleneck)
- **Progress Tracking**: Real-time per-file progress
- **Concurrent Uploads**: Currently sequential (can be parallelized)
- **Memory Usage**: Minimal (streaming upload, not buffered in memory)

## Future Enhancements

1. **Parallel Uploads**: Upload multiple files simultaneously
2. **Retry Logic**: Auto-retry failed uploads
3. **Resume Support**: Resume interrupted uploads
4. **Chunked Uploads**: For files >100MB using multipart upload
5. **Client-Side Compression**: Compress files before upload
6. **Upload Queue**: Queue management for batch uploads

## Migration Notes

### From Old Implementation

The old implementation (`/api/reports/upload`) is **still used for edit mode** to maintain backwards compatibility. Only new uploads use direct Vercel Blob upload.

If you want to migrate edit mode:
1. Update edit mode logic in `ReportUploadPage.tsx`
2. Handle file replacements (delete old blob, upload new)
3. Update database with new blob URL

### Database Schema

No schema changes required. The `FilePath` column now stores blob URLs instead of filesystem paths:

```
Old: ~/Uploads/Reports/filename.pdf
New: https://xxxxx.public.blob.vercel-storage.com/remote-monitoring/testing-report/2026-01/123456-abc-filename.pdf
```

## References

- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Client-Side Uploads](https://vercel.com/docs/storage/vercel-blob/client-upload)
- [@vercel/blob API Reference](https://vercel.com/docs/storage/vercel-blob/using-blob-sdk)

## Support

For issues or questions:
1. Check browser console for detailed error messages
2. Check server logs in Vercel dashboard
3. Verify environment variables are set correctly
4. Review this documentation

---

**Last Updated**: January 27, 2026
**Implementation Version**: 1.0.0
