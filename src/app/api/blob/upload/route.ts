import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';

// Helper function to check if user can upload reports
async function checkUploadAccess(userId: string | null): Promise<{ canUpload: boolean; message?: string }> {
	if (!userId) {
		return { canUpload: false, message: "Unauthorized" };
	}

	try {
		const { getDb } = await import('@/lib/db');
		const pool = await getDb();
		const accessQuery = `
			SELECT [access_level], [Upload_Report]
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
		
		// Check Upload_Report permission
		const uploadReportRaw = userAccess.Upload_Report;
		const checkBitField = (value: any): boolean => {
			if (value === null || value === undefined) return false;
			if (Buffer.isBuffer(value)) return value[0] === 1;
			if (typeof value === 'boolean') return value === true;
			if (typeof value === 'number') return value === 1;
			if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
			return false;
		};
		
		const uploadReport = checkBitField(uploadReportRaw);
		const canUploadReports = isAdmin || uploadReport;
		
		if (!canUploadReports) {
			return { 
				canUpload: false, 
				message: "Insufficient Permissions. This action requires Admin level access or Upload_Report permission." 
			};
		}

		return { canUpload: true };
	} catch (error) {
		console.error("Error checking upload access:", error);
		return { canUpload: false, message: "Error checking access permissions" };
	}
}

export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		// Check upload access
		const userId = getUserIdFromRequest(request);
		const accessCheck = await checkUploadAccess(userId);
		
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

		const jsonResponse = await handleUpload({
			body,
			request,
			onBeforeGenerateToken: async (pathname) => {
				// Validate file extension
				const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
				const fileExtension = pathname.substring(pathname.lastIndexOf('.')).toLowerCase();
				
				if (!allowedExtensions.includes(fileExtension)) {
					throw new Error(`File type not allowed. Supported formats: ${allowedExtensions.join(', ')}`);
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
					allowedContentTypes: [
						'application/pdf',
						'application/msword',
						'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
						'application/vnd.ms-excel',
						'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
						'application/vnd.ms-powerpoint',
						'application/vnd.openxmlformats-officedocument.presentationml.presentation'
					],
					maximumSizeInBytes: 100 * 1024 * 1024, // 100MB
					tokenPayload: JSON.stringify({ userId }),
					pathname: `remote-monitoring/testing-report/${yearMonth}/${timestamp}-${randomId}-${sanitizedName}`,
				};
			},
			onUploadCompleted: async ({ blob, tokenPayload }) => {
				console.log('Upload completed:', blob.url);
				// You can add additional logic here if needed
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
