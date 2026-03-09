import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { checkPermission, type PermissionField } from '@/lib/access-permissions';

type UploadFolder = 'reports' | 'documents' | 'pictures' | 'news';

// Helper function to check if user can upload based on folder type
async function checkUploadAccess(
	userId: string | null, 
	folder: UploadFolder
): Promise<{ canUpload: boolean; message?: string }> {
	const permissionField: PermissionField =
		folder === 'reports'
			? 'Upload_Report'
			: folder === 'documents'
				? 'Upload_Documents'
				: folder === 'news'
					? 'access_news'
					: 'Upload_Pictures';

	const permissionCheck = await checkPermission(userId, permissionField);
	return {
		canUpload: permissionCheck.allowed,
		message: permissionCheck.message,
	};
}

// Get allowed file extensions and content types based on folder
function getAllowedFileTypes(folder: UploadFolder) {
	if (folder === 'pictures' || folder === 'news') {
		return {
			extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
			contentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
		};
	}
	
	// For reports and documents
	return {
		extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.rar', '.csv'],
		contentTypes: [
			'application/pdf',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/vnd.ms-excel',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.ms-powerpoint',
			'application/vnd.openxmlformats-officedocument.presentationml.presentation',
			'text/plain',
			'text/csv',
			'application/zip',
			'application/x-rar-compressed',
			'application/x-zip-compressed'
		]
	};
}

export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		// Check if BLOB_READ_WRITE_TOKEN is configured
		if (!process.env.BLOB_READ_WRITE_TOKEN) {
			console.error('BLOB_READ_WRITE_TOKEN is not configured');
			return NextResponse.json(
				{
					success: false,
					error: 'Upload is not configured. BLOB_READ_WRITE_TOKEN environment variable is missing.',
					hint: 'Add BLOB_READ_WRITE_TOKEN to your .env.local file for local development or Vercel project settings for production.'
				},
				{ status: 500 }
			);
		}

		// Get folder type from query params
		const { searchParams } = new URL(request.url);
		const folder = (searchParams.get('folder') || 'reports') as UploadFolder;
		
		console.log('[Blob Upload] Request received for folder:', folder);
		
		// Validate folder type
		if (!['reports', 'documents', 'pictures', 'news'].includes(folder)) {
			return NextResponse.json(
				{ success: false, message: 'Invalid folder type' },
				{ status: 400 }
			);
		}
		
		// Check upload access based on folder type
		const userId = getUserIdFromRequest(request);
		console.log('[Blob Upload] User ID:', userId);
		
		const accessCheck = await checkUploadAccess(userId, folder);
		
		if (!accessCheck.canUpload) {
			console.log('[Blob Upload] Access denied:', accessCheck.message);
			return NextResponse.json(
				{
					success: false,
					message: accessCheck.message || "Access denied. Upload privileges required."
				},
				{ status: 403 }
			);
		}

		const body = (await request.json()) as HandleUploadBody;
		const { extensions, contentTypes } = getAllowedFileTypes(folder);

		console.log('[Blob Upload] Generating token for file upload');

		const jsonResponse = await handleUpload({
			body,
			request,
			onBeforeGenerateToken: async (pathname) => {
				console.log('[Blob Upload] onBeforeGenerateToken called for:', pathname);
				
				// Validate file extension
				const fileExtension = pathname.substring(pathname.lastIndexOf('.')).toLowerCase();
				
				if (!extensions.includes(fileExtension)) {
					throw new Error(`File type not allowed for ${folder}. Supported formats: ${extensions.join(', ')}`);
				}

				// Generate a safe pathname with timestamp
				const timestamp = Date.now();
				const date = new Date();
				const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
				const randomId = Math.random().toString(36).substring(2, 15);
				const originalName = pathname.substring(pathname.lastIndexOf('/') + 1);
				const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
				
				const finalPathname = `${folder}/${yearMonth}/${timestamp}-${randomId}-${sanitizedName}`;
				console.log('[Blob Upload] Generated pathname:', finalPathname);
				
				// Return configuration for token generation
				return {
					allowedContentTypes: contentTypes,
					maximumSizeInBytes: 100 * 1024 * 1024, // 100MB
					tokenPayload: JSON.stringify({ userId, folder }),
					pathname: finalPathname,
				};
			},
			onUploadCompleted: async ({ blob, tokenPayload }) => {
				console.log(`[Blob Upload] ${folder} upload completed:`, blob.url);
			},
		});

		console.log('[Blob Upload] Token generated successfully');
		return NextResponse.json(jsonResponse);
	} catch (error) {
		console.error('[Blob Upload] Error:', error);
		
		// Provide more detailed error messages
		let errorMessage = 'Upload token generation failed';
		if (error instanceof Error) {
			errorMessage = error.message;
			
			// Check for specific Vercel Blob errors
			if (error.message.includes('BLOB_READ_WRITE_TOKEN')) {
				errorMessage = 'Vercel Blob is not configured. Please add BLOB_READ_WRITE_TOKEN environment variable.';
			}
		}
		
		return NextResponse.json(
			{
				success: false,
				error: errorMessage,
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}

// Must use Node.js runtime for Vercel Blob
export const runtime = 'nodejs';
