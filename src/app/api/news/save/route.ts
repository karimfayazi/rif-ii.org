import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import sql from 'mssql';
import { getUserIdFromRequest } from "@/lib/auth";
import { checkPermission } from "@/lib/access-permissions";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		
		// Debug logging
		console.log('[News API] Received body:', {
			...body,
			bodyTextLength: body.bodyText?.length,
			postedByUserIdType: typeof body.postedByUserId,
			postedByNameType: typeof body.postedByName
		});
		
		const {
			newsId,
			title,
			newsDate,
			bodyText,
			imageUrl,
			imageCaption,
			postedByUserId,
			postedByName,
			isPublished
		} = body;

		const userId = getUserIdFromRequest(request);
		const permissionCheck = await checkPermission(userId, "access_news");
		if (!permissionCheck.allowed) {
			return NextResponse.json(
				{
					success: false,
					message: permissionCheck.message || "You do not have permission to modify news.",
				},
				{ status: 403 }
			);
		}

		// Enhanced validation - postedByUserId is now username (string)
		const missingFields: string[] = [];
		if (!title || title.trim() === '') missingFields.push('title');
		if (!newsDate) missingFields.push('newsDate');
		if (!bodyText || bodyText.trim() === '') missingFields.push('bodyText');
		
		// Validate postedByUserId as string (username)
		const userIdStr = String(postedByUserId ?? '').trim();
		if (!userIdStr) missingFields.push('postedByUserId (username)');
		
		// postedByName is optional but should be string if provided
		const userNameStr = postedByName ? String(postedByName).trim() : null;
		
		if (missingFields.length > 0) {
			console.error('[News API] Validation failed. Missing or invalid fields:', missingFields);
			console.error('[News API] Received values:', {
				title: title,
				newsDate: newsDate,
				bodyText: bodyText ? `${bodyText.substring(0, 50)}...` : 'empty',
				postedByUserId: postedByUserId,
				postedByUserIdType: typeof postedByUserId,
				postedByName: postedByName
			});
			
			return NextResponse.json(
				{
					success: false,
					message: missingFields.includes('postedByUserId (username)') 
						? 'Session expired. Please log in again.'
						: `Missing or invalid required fields: ${missingFields.join(', ')}`
				},
				{ status: missingFields.includes('postedByUserId (username)') ? 401 : 400 }
			);
		}

		if (title.length > 500) {
			return NextResponse.json(
				{ success: false, message: "Title must not exceed 500 characters" },
				{ status: 400 }
			);
		}

		if (imageCaption && imageCaption.length > 255) {
			return NextResponse.json(
				{ success: false, message: "Image caption must not exceed 255 characters" },
				{ status: 400 }
			);
		}

		if (bodyText.length < 10) {
			return NextResponse.json(
				{ success: false, message: "Body text must be at least 10 characters" },
				{ status: 400 }
			);
		}

		const pool = await getDb();

		if (newsId) {
			// UPDATE existing news
			const query = `
				UPDATE [_rifiiorg_db].[rifiiorg].[tblMISNews]
				SET 
					[Title] = @title,
					[NewsDate] = @newsDate,
					[BodyText] = @bodyText,
					[ImageUrl] = @imageUrl,
					[ImageCaption] = @imageCaption,
					[IsPublished] = @isPublished,
					[UpdatedAt] = GETDATE()
				WHERE [NewsID] = @newsId;
			`;

			const request_obj = pool.request();
			request_obj.input('newsId', sql.Int, newsId);
			request_obj.input('title', sql.NVarChar(500), title);
			request_obj.input('newsDate', sql.Date, newsDate);
			request_obj.input('bodyText', sql.NVarChar(sql.MAX), bodyText);
			request_obj.input('imageUrl', sql.NVarChar(500), imageUrl || null);
			request_obj.input('imageCaption', sql.NVarChar(255), imageCaption || null);
			request_obj.input('isPublished', sql.Bit, isPublished ? 1 : 0);

			await request_obj.query(query);
			
			console.log('[News API] News article updated successfully:', newsId);

			return NextResponse.json({
				success: true,
				message: "News article updated successfully",
				newsId: newsId
			});
		} else {
			// INSERT new news
			const query = `
				INSERT INTO [_rifiiorg_db].[rifiiorg].[tblMISNews] (
					[Title], [NewsDate], [BodyText], [ImageUrl], [ImageCaption],
					[PostedByUserId], [PostedByName], [IsPublished], [CreatedAt], [UpdatedAt]
				) VALUES (
					@title, @newsDate, @bodyText, @imageUrl, @imageCaption,
					@postedByUserId, @postedByName, @isPublished, GETDATE(), GETDATE()
				);
				SELECT SCOPE_IDENTITY() AS newsId;
			`;

			const request_obj = pool.request();
			request_obj.input('title', sql.NVarChar(500), title);
			request_obj.input('newsDate', sql.Date, newsDate);
			request_obj.input('bodyText', sql.NVarChar(sql.MAX), bodyText);
			request_obj.input('imageUrl', sql.NVarChar(500), imageUrl || null);
			request_obj.input('imageCaption', sql.NVarChar(255), imageCaption || null);
			request_obj.input('postedByUserId', sql.NVarChar(150), userIdStr);      // STRING username
			request_obj.input('postedByName', sql.NVarChar(150), userNameStr);      // STRING display name
			request_obj.input('isPublished', sql.Bit, isPublished ? 1 : 0);

			const result = await request_obj.query(query);
			const newNewsId = result.recordset[0]?.newsId;
			
			console.log('[News API] News article created successfully:', newNewsId);

			return NextResponse.json({
				success: true,
				message: "News article created successfully",
				newsId: newNewsId
			});
		}
	} catch (error) {
		console.error("Error saving news:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to save news article",
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
