"use client";

import { useState, useEffect } from "react";
import { Calendar, X } from "lucide-react";

export type NewsItem = {
	newsId: number;
	title: string;
	newsDate: string;
	bodyText: string;
	imageUrl?: string | null;
	imageCaption?: string | null;
	postedByName?: string | null;
};

export function formatNewsDate(input?: string): string {
	if (!input) return "-";
	const d = new Date(input);
	if (Number.isNaN(d.getTime())) return "-";
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "2-digit",
		year: "numeric",
	}).format(d);
}

function formatBodyText(text: string | null | undefined): React.ReactNode {
	if (!text) return null;
	const paragraphs = text.split(/\n\n+/);
	return paragraphs.map((para, idx) => {
		const lines = para.split("\n").filter((line) => line.trim());
		return (
			<p key={idx} className="mb-3 text-gray-700 leading-relaxed">
				{lines.map((line, lineIdx) => (
					<span key={lineIdx}>
						{line}
						{lineIdx < lines.length - 1 && <br />}
					</span>
				))}
			</p>
		);
	});
}

interface NewsModalProps {
	open: boolean;
	onClose: () => void;
	news: NewsItem | null;
}

export default function NewsModal({ open, onClose, news }: NewsModalProps) {
	const [imageError, setImageError] = useState(false);

	useEffect(() => {
		if (news?.newsId != null) setImageError(false);
	}, [news?.newsId]);

	if (!open) return null;

	const showImage = !!news?.imageUrl && !imageError;
	const showPlaceholder = !news?.imageUrl || imageError;

	const headingTitle = (news?.title && news.title.trim() !== "") ? news.title.trim() : "(No title)";

	return (
		<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
			{/* Modal ~15% larger: max-w-2xl (42rem) → ~48.5rem; max-h 90vh → 95vh */}
			<div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[48.5rem] max-h-[95vh] flex flex-col my-auto">
				{/* Fixed header: Heading (title) + date - 10% down for better view */}
				<div className="flex-shrink-0 border-b border-gray-200 bg-gray-50 rounded-t-2xl px-8 pt-10 pb-5 pr-14">
					<h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight break-words">
						{headingTitle}
					</h2>
					<div className="flex items-center gap-2 mt-3 text-base text-gray-600">
						<Calendar className="h-4 w-4 flex-shrink-0" />
						<span>{news ? formatNewsDate(news.newsDate) : "-"}</span>
						{news?.newsId != null && (
							<>
								<span>•</span>
								<span>#{news.newsId}</span>
							</>
						)}
					</div>
				</div>

				{/* Close button - top right */}
				<button
					onClick={onClose}
					className="absolute top-5 right-5 z-10 rounded-full p-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
					aria-label="Close"
				>
					<X className="h-5 w-5" />
				</button>

				{/* Scrollable content: Image → Body */}
				<div className="flex-1 overflow-y-auto flex flex-col items-center px-8 pt-5 pb-5">
					{/* Image - centered, slightly larger */}
					<div className="w-full max-w-2xl mx-auto mb-5 text-center">
						<div className="relative w-full aspect-video max-h-[320px] overflow-hidden rounded-xl bg-gray-100">
							{showImage && (
								<img
									src={news!.imageUrl!}
									alt={news!.imageCaption || news!.title || "News image"}
									className="absolute inset-0 w-full h-full object-cover"
									loading="lazy"
									onError={() => setImageError(true)}
								/>
							)}
							{showPlaceholder && (
								<div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500 bg-gray-100">
									No image available
								</div>
							)}
						</div>
						{news?.imageCaption && (
							<p className="mt-2 text-xs text-gray-500 text-center">{news.imageCaption}</p>
						)}
					</div>

					{/* Body text - readable width, slightly larger */}
					<div className="w-full max-w-2xl mx-auto text-left">
						{news?.bodyText ? (
							<div className="text-gray-700 leading-relaxed text-base md:text-lg">
								{formatBodyText(news.bodyText)}
							</div>
						) : (
							<p className="text-gray-500 italic">No content available</p>
						)}
					</div>
				</div>

				{/* Footer - centered Close button */}
				<div className="flex-shrink-0 border-t border-gray-200 px-8 py-5 flex justify-center">
					<button
						onClick={onClose}
						className="px-8 py-2.5 bg-[#0b4d2b] text-white rounded-lg hover:bg-[#0a3d24] transition-colors font-medium"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}
