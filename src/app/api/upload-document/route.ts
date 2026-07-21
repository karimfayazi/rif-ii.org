import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const document = formData.get('document') as File;

    if (!document) {
      return NextResponse.json(
        { success: false, message: 'No document file provided' },
        { status: 400 }
      );
    }

    // Validate file type (PDF and DOC formats)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(document.type)) {
      return NextResponse.json(
        { success: false, message: 'File must be PDF, DOC, or DOCX format' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (document.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = document.name;
    const extension = originalName.split('.').pop();
    const uniqueFilename = `${timestamp}_${Math.random().toString(36).substring(2)}.${extension}`;

    // Convert file to buffer
    const bytes = await document.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL_ENV;
    const useBlobStorage = isVercel && !!process.env.BLOB_READ_WRITE_TOKEN;

    // Vercel: use Blob (filesystem is read-only)
    if (useBlobStorage) {
      const blob = await put(`documents/test/${uniqueFilename}`, buffer, {
        access: 'public',
        contentType: document.type || 'application/octet-stream',
      });

      return NextResponse.json({
        success: true,
        message: 'Document uploaded successfully!',
        url: blob.url,
        filename: uniqueFilename,
        originalName: originalName,
        size: document.size,
        type: document.type,
        uploadMethod: 'vercel-blob',
      });
    }

    if (isVercel && !useBlobStorage) {
      return NextResponse.json({
        success: false,
        message: 'Upload is not configured for this environment. BLOB_READ_WRITE_TOKEN is required on Vercel.',
      }, { status: 500 });
    }

    // Local / self-hosted filesystem path
    const externalUploadPath = process.env.DOCUMENTS_UPLOAD_PATH || process.env.UPLOAD_PATH;
    let uploadDir: string;
    let fileUrl: string;
    let baseUrl: string;

    if (externalUploadPath) {
      const { join } = await import('path');
      uploadDir = join(externalUploadPath, 'Uploads', 'test');
      fileUrl = `https://rif-ii.org/Uploads/test/${uniqueFilename}`;
      baseUrl = 'https://rif-ii.org';
      console.log(`✓ Using external upload path: ${uploadDir}`);
    } else {
      const { ensureLocalUploadDir } = await import('@/lib/localUploadFs');
      uploadDir = await ensureLocalUploadDir('uploads', 'test');
      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
      fileUrl = `${baseUrl}/uploads/test/${uniqueFilename}`;
      console.log(`✓ Using Next.js public folder: ${uploadDir}`);
    }

    try {
      if (externalUploadPath) {
        const { mkdir, writeFile, stat } = await import('fs/promises');
        const { existsSync } = await import('fs');
        const { join } = await import('path');

        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }

        const filePath = join(uploadDir, uniqueFilename);
        await writeFile(filePath, buffer);

        let fileVerified = false;
        let fileSize = 0;
        try {
          const stats = await stat(filePath);
          fileVerified = true;
          fileSize = stats.size;
        } catch (verifyError) {
          console.error(`✗ File verification failed:`, verifyError);
        }

        return NextResponse.json({
          success: true,
          message: 'Document uploaded successfully!',
          url: fileUrl,
          filename: uniqueFilename,
          originalName: originalName,
          size: document.size,
          type: document.type,
          uploadMethod: 'external-server',
          filePath,
          fileVerified,
          fileSizeOnDisk: fileSize,
          baseUrl,
          uploadDirectory: uploadDir,
        });
      }

      const { writeLocalUploadFile } = await import('@/lib/localUploadFs');
      const filePath = await writeLocalUploadFile(uploadDir, uniqueFilename, buffer);

      return NextResponse.json({
        success: true,
        message: 'Document uploaded successfully!',
        url: fileUrl,
        filename: uniqueFilename,
        originalName: originalName,
        size: document.size,
        type: document.type,
        uploadMethod: 'local-server',
        filePath,
        baseUrl,
        uploadDirectory: uploadDir,
      });
    } catch (saveError) {
      console.error('Error saving file:', saveError);
      const errorMessage = saveError instanceof Error ? saveError.message : 'Unknown error';
      
      return NextResponse.json({
        success: false,
        message: `Failed to save file: ${errorMessage}`,
        error: errorMessage,
        uploadDir,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Upload failed due to server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle GET requests for testing
export async function GET() {
  const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL_ENV;
  const externalUploadPath = process.env.DOCUMENTS_UPLOAD_PATH || process.env.UPLOAD_PATH;
  
  return NextResponse.json({
    success: true,
    message: 'Document upload endpoint ready',
    configuration: {
      uploadMethod: isVercel
        ? (process.env.BLOB_READ_WRITE_TOKEN ? 'vercel-blob' : 'vercel-unconfigured')
        : externalUploadPath
          ? 'external-server'
          : 'local-server',
      uploadPath: isVercel
        ? 'vercel-blob:documents/test/'
        : externalUploadPath 
          ? `${externalUploadPath}/Uploads/test`
          : 'public/uploads/test',
      supportedTypes: ['PDF', 'DOC', 'DOCX'],
      maxFileSize: '10MB'
    },
  });
}
