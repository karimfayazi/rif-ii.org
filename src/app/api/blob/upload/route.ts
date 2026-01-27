import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';

type UploadFolder = 'reports' | 'documents' | 'pictures';

// Helper function to check if user can upload based on folder type
async function checkUploadAccess(
	userId: string | null, 
	folder: UploadFolder
): Promise<{ canUpload: boolean; message?: string }> {
	if (!userId) {
		return { canUpload: false, message: "Unauthorized" };
	}

	try {
		const { getDb } = await import('@/lib/db');
		const pool = await getDb();
		
		// Map folder to permission field
		const permissionField = folder === 'reports' ? 'Upload_Report' 
			: folder === 'documents' ? 'Upload_Documents'
			: 'Upload_Pictures';
		
		const accessQuery = `
			SELECT [access_level], [${permissionField}]
			FROM [_rifiiorg_db].[dbo].[tbl_user_access]
			WHERE [username] = @userId OR [email] = @userId
		`;
		
		const accessResult = await pool.request()
			.input('userId', userId)
			.query(accessQuery);
		
		if (accessResult.recordset.length === 0) {
			return { canUpload: false, message: "User not found" };
		}

		const userAccess = accessResult.recordset[0];
		const accessLevel = userAccess.access_level;
		const isAdmin = accessLevel === 'Admin';
		
		// Check specific upload permission
		const uploadPermissionRaw = userAccess[permissionField];
		const checkBitField = (value: any): boolean => {
			if (value === null || value === undefined) return false;
			if (Buffer.isBuffer(value)) return value[0] === 1;
			if (typeof value === 'boolean') return value === true;
			if (typeof value === 'number') return value === 1;
			if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
			return false;
		};
		
		const hasPermission = checkBitField(uploadPermissionRaw);
		const canUpload = isAdmin || hasPermission;
		
		if (!canUpload) {
			return { 
				canUpload: false, 
				message: `Insufficient Permissions. This action requires Admin level access or ${permissionField.replace('_', ' ')} permission.` 
			};
		}

		return { canUpload: true };
	} catch (error) {
		console.error("Error checking upload access:", error);
		return { canUpload: false, message: "Error checking access permissions" };
	}
}

// Get allowed file extensions and content types based on folder
function getAllowedFileTypes(folder: UploadFolder) {
	if (folder === 'pictures') {
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
		// Get folder type from query params
		const { searchParams } = new URL(request.url);
		const folder = (searchParams.get('folder') || 'reports') as UploadFolder;
		
		// Validate folder type
		if (!['reports', 'documents', 'pictures'].includes(folder)) {
			return NextResponse.json(
				{ success: false, message: 'Invalid folder type' },
				{ status: 400 }
			);
		}
		
		// Check upload access based on folder type
		const userId = getUserIdFromRequest(request);
		const accessCheck = await checkUploadAccess(userId, folder);
		
		if (!accessCheck.canUpload) {
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

		const jsonResponse = await handleUpload({
			body,
			request,
			onBeforeGenerateToken: async (pathname) => {
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
				
				// Return configuration for token generation
				return {
					allowedContentTypes: contentTypes,
					maximumSizeInBytes: 100 * 1024 * 1024, // 100MB
					tokenPayload: JSON.stringify({ userId, folder }),
					pathname: `${folder}/${yearMonth}/${timestamp}-${randomId}-${sanitizedName}`,
				};
			},
			onUploadCompleted: async ({ blob, tokenPayload }) => {
				console.log(`${folder} upload completed:`, blob.url);
			},
		});

		return NextResponse.json(jsonResponse);
	} catch (error) {
		console.error('Blob upload error:', error);
		return NextResponse.json(
			{
				success: false,
				message: error instanceof Error ? error.message : 'Upload token generation failed'
			},
			{ status: 400 }
		);
	}
}

// Must use Node.js runtime for Vercel Blob
export const runtime = 'nodejs';
