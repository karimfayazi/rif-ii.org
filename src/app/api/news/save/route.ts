import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import sql from 'mssql';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
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

		// Validation
		if (!title || !newsDate || !bodyText || !postedByUserId || !postedByName) {
			return NextResponse.json(
				{
					success: false,
					message: "Missing required fields: title, newsDate, bodyText, postedByUserId, postedByName"
				},
				{ status: 400 }
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
			request_obj.input('postedByUserId', sql.Int, postedByUserId);
			request_obj.input('postedByName', sql.NVarChar(255), postedByName);
			request_obj.input('isPublished', sql.Bit, isPublished ? 1 : 0);

			const result = await request_obj.query(query);
			const newNewsId = result.recordset[0]?.newsId;

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
