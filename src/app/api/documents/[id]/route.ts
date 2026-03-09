import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";
import { checkPermission } from "@/lib/access-permissions";
import { unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// GET - Get single document by ID
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		
		if (!id) {
			return NextResponse.json({
				success: false,
				message: "Document ID is required"
			}, { status: 400 });
		}

		const pool = await getDb();
		const query = `
			SELECT TOP (1)
				[Title],
				[Description],
				[FilePath],
				[UploadDate],
				[UploadedBy],
				[FileType],
				[Documentstype],
				[AllowPriorityUsers],
				[AllowInternalUsers],
				[AllowOthersUsers],
				[Category],
				[SubCategory],
				[document_date],
				[DocumentID]
			FROM [_rifiiorg_db].[dbo].[tblDocuments]
			WHERE [DocumentID] = @documentID
		`;

		const result = await pool.request()
			.input('documentID', parseInt(id))
			.query(query);
		
		if (result.recordset.length === 0) {
			return NextResponse.json({
				success: false,
				message: "Document not found"
			}, { status: 404 });
		}
		
		return NextResponse.json({
			success: true,
			document: result.recordset[0]
		});
	} catch (error) {
		console.error("Error fetching document:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to fetch document",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

// PUT - Update document
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const userId = getUserIdFromRequest(request);
		const accessCheck = await checkPermission(userId, "Upload_Documents");
		
		if (!accessCheck.allowed) {
			return NextResponse.json(
				{
					success: false,
					message: accessCheck.message || "Access denied. Edit permission required."
				},
				{ status: 403 }
			);
		}

		const { id } = await params;
		const body = await request.json();
		
		const {
			title,
			description,
			category,
			subCategory,
			documentDate,
			uploadedBy,
			fileType,
			documentType,
			allowPriorityUsers,
			allowInternalUsers,
			allowOthersUsers
		} = body;

		if (!id) {
			return NextResponse.json({
				success: false,
				message: "Document ID is required"
			}, { status: 400 });
		}

		if (!title || !category || !subCategory || !documentDate) {
			return NextResponse.json({
				success: false,
				message: "Title, category, sub category, and document date are required"
			}, { status: 400 });
		}

		const pool = await getDb();
		const query = `
			UPDATE [_rifiiorg_db].[dbo].[tblDocuments]
			SET 
				[Title] = @title,
				[Description] = @description,
				[Category] = @category,
				[SubCategory] = @subCategory,
				[document_date] = @documentDate,
				[UploadedBy] = @uploadedBy,
				[FileType] = @fileType,
				[Documentstype] = @documentType,
				[AllowPriorityUsers] = @allowPriorityUsers,
				[AllowInternalUsers] = @allowInternalUsers,
				[AllowOthersUsers] = @allowOthersUsers
			WHERE [DocumentID] = @documentID
		`;

		const request_obj = pool.request();
		request_obj.input('documentID', parseInt(id));
		request_obj.input('title', title);
		request_obj.input('description', description || '');
		request_obj.input('category', category);
		request_obj.input('subCategory', subCategory);
		request_obj.input('documentDate', documentDate);
		request_obj.input('uploadedBy', uploadedBy || '');
		request_obj.input('fileType', fileType || '');
		request_obj.input('documentType', documentType || '');
		request_obj.input('allowPriorityUsers', allowPriorityUsers || false);
		request_obj.input('allowInternalUsers', allowInternalUsers || false);
		request_obj.input('allowOthersUsers', allowOthersUsers || false);

		const result = await request_obj.query(query);

		if (result.rowsAffected[0] === 0) {
			return NextResponse.json({
				success: false,
				message: "Document not found"
			}, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			message: "Document updated successfully"
		});
	} catch (error) {
		console.error("Error updating document:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to update document",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

// DELETE - Delete document
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const userId = getUserIdFromRequest(request);
		const accessCheck = await checkPermission(userId, "Upload_Documents");
		
		if (!accessCheck.allowed) {
			return NextResponse.json(
				{
					success: false,
					message: accessCheck.message || "Access denied. Delete permission required."
				},
				{ status: 403 }
			);
		}

		const { id } = await params;
		
		if (!id) {
			return NextResponse.json({
				success: false,
				message: "Document ID is required"
			}, { status: 400 });
		}

		const pool = await getDb();
		
		// First, get the file path
		const selectQuery = `
			SELECT [FilePath]
			FROM [_rifiiorg_db].[dbo].[tblDocuments]
			WHERE [DocumentID] = @documentID
		`;
		
		const selectResult = await pool.request()
			.input('documentID', parseInt(id))
			.query(selectQuery);
		
		if (selectResult.recordset.length === 0) {
			return NextResponse.json({
				success: false,
				message: "Document not found"
			}, { status: 404 });
		}

		const filePath = selectResult.recordset[0].FilePath;
		
		// Delete from database
		const deleteQuery = `
			DELETE FROM [_rifiiorg_db].[dbo].[tblDocuments]
			WHERE [DocumentID] = @documentID
		`;
		
		await pool.request()
			.input('documentID', parseInt(id))
			.query(deleteQuery);
		
		// Try to delete the physical file if it exists locally
		try {
			if (filePath && !filePath.startsWith('http')) {
				// Extract filename from path
				const fileName = filePath.replace('~/Uploads/Documents/', '').replace('Uploads/Documents/', '');
				const physicalPath = join(process.cwd(), 'public', 'uploads', 'documents', fileName);
				
				if (existsSync(physicalPath)) {
					await unlink(physicalPath);
				}
			}
		} catch (fileError) {
			// Log but don't fail if file deletion fails
			console.warn("Failed to delete physical file:", fileError);
		}
		
		return NextResponse.json({
			success: true,
			message: "Document deleted successfully"
		});
	} catch (error) {
		console.error("Error deleting document:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to delete document",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

