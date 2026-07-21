"use client";

import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type ReactNode,
	type UIEvent,
} from "react";
import { createPortal } from "react-dom";

type TableHorizontalScrollProps = {
	children: ReactNode;
	className?: string;
	/**
	 * When true, shows a fixed horizontal scrollbar pinned to the bottom of the
	 * viewport (synced with the table) while the table is in view.
	 * Opt-in so other pages using this component keep their existing behavior.
	 */
	stickyBottomScrollbar?: boolean;
	/** Optional id referenced by the sticky scrollbar aria-controls attribute. */
	tableId?: string;
};

type StickyBarBox = {
	left: number;
	width: number;
};

/**
 * Scoped horizontal scroll wrapper for security grid tables.
 * Provides a thicker, always-visible scrollbar at top and bottom (synced)
 * when table content overflows horizontally.
 */
export default function TableHorizontalScroll({
	children,
	className = "",
	stickyBottomScrollbar = false,
	tableId,
}: TableHorizontalScrollProps) {
	const topRef = useRef<HTMLDivElement>(null);
	const bottomRef = useRef<HTMLDivElement>(null);
	const stickyBarRef = useRef<HTMLDivElement>(null);
	const spacerRef = useRef<HTMLDivElement>(null);
	const stickySpacerRef = useRef<HTMLDivElement>(null);
	const syncingRef = useRef(false);
	const [canScroll, setCanScroll] = useState(false);
	const [stickyVisible, setStickyVisible] = useState(false);
	const [stickyBox, setStickyBox] = useState<StickyBarBox>({ left: 0, width: 0 });
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const measure = useCallback(() => {
		const content = bottomRef.current;
		const spacer = spacerRef.current;
		if (!content || !spacer) return;

		const scrollWidth = content.scrollWidth;
		spacer.style.width = `${scrollWidth}px`;
		if (stickySpacerRef.current) {
			stickySpacerRef.current.style.width = `${scrollWidth}px`;
		}
		setCanScroll(scrollWidth > content.clientWidth + 1);
	}, []);

	const updateStickyBox = useCallback(() => {
		const content = bottomRef.current;
		if (!content || !stickyBottomScrollbar) return;

		const rect = content.getBoundingClientRect();
		const inView = rect.bottom > 48 && rect.top < window.innerHeight - 8;
		setStickyVisible(inView && rect.width > 0);
		setStickyBox({
			left: Math.max(0, rect.left),
			width: Math.max(0, rect.width),
		});
	}, [stickyBottomScrollbar]);

	useEffect(() => {
		const content = bottomRef.current;
		if (!content) return;

		measure();
		updateStickyBox();

		const resizeObserver = new ResizeObserver(() => {
			measure();
			updateStickyBox();
		});
		resizeObserver.observe(content);

		const table = content.querySelector("table");
		if (table) resizeObserver.observe(table);

		window.addEventListener("resize", measure);
		window.addEventListener("resize", updateStickyBox);
		window.addEventListener("scroll", updateStickyBox, true);

		return () => {
			resizeObserver.disconnect();
			window.removeEventListener("resize", measure);
			window.removeEventListener("resize", updateStickyBox);
			window.removeEventListener("scroll", updateStickyBox, true);
		};
	}, [measure, updateStickyBox, children]);

	useEffect(() => {
		measure();
		updateStickyBox();
	}, [canScroll, measure, updateStickyBox]);

	const showFixedBottom =
		stickyBottomScrollbar && canScroll && stickyVisible && stickyBox.width > 0;

	// Keep sticky spacer width + scrollLeft in sync when the fixed bar mounts
	useEffect(() => {
		if (!showFixedBottom) return;
		const content = bottomRef.current;
		const sticky = stickyBarRef.current;
		if (!content) return;

		measure();
		if (sticky) {
			sticky.scrollLeft = content.scrollLeft;
		}
	}, [showFixedBottom, measure, stickyBox.width]);

	useEffect(() => {
		const attachWheel = (el: HTMLDivElement | null) => {
			if (!el) return () => {};

			const onWheel = (event: WheelEvent) => {
				const canScrollX = el.scrollWidth > el.clientWidth + 1;
				if (!canScrollX) return;

				if (event.shiftKey && event.deltaY !== 0 && event.deltaX === 0) {
					el.scrollLeft += event.deltaY;
					event.preventDefault();
				}
			};

			el.addEventListener("wheel", onWheel, { passive: false });
			return () => el.removeEventListener("wheel", onWheel);
		};

		const detachTop = attachWheel(topRef.current);
		const detachBottom = attachWheel(bottomRef.current);
		const detachSticky = attachWheel(stickyBarRef.current);
		return () => {
			detachTop();
			detachBottom();
			detachSticky();
		};
	}, [canScroll, showFixedBottom]);

	const applyScrollLeft = (scrollLeft: number, except?: HTMLDivElement | null) => {
		const targets = [topRef.current, bottomRef.current, stickyBarRef.current];
		for (const target of targets) {
			if (!target || target === except) continue;
			if (target.scrollLeft !== scrollLeft) {
				target.scrollLeft = scrollLeft;
			}
		}
	};

	const syncFrom =
		(source: "top" | "bottom" | "sticky") =>
		(event: UIEvent<HTMLDivElement>) => {
			if (syncingRef.current) return;
			syncingRef.current = true;
			applyScrollLeft(event.currentTarget.scrollLeft, event.currentTarget);
			requestAnimationFrame(() => {
				syncingRef.current = false;
			});
		};

	const fixedBar =
		showFixedBottom && mounted
			? createPortal(
					<div
						ref={stickyBarRef}
						className="sec-grid-hscroll__bar sec-grid-hscroll__bar--active sec-grid-hscroll__bar--fixed-bottom"
						style={{ left: stickyBox.left, width: stickyBox.width }}
						onScroll={syncFrom("sticky")}
						role="scrollbar"
						aria-orientation="horizontal"
						aria-controls={tableId || undefined}
						aria-label="Table horizontal scroll"
					>
						<div ref={stickySpacerRef} className="sec-grid-hscroll__spacer" />
					</div>,
					document.body
				)
			: null;

	return (
		<div className={`sec-grid-hscroll grid grid-cols-1 min-w-0 max-w-full ${className}`}>
			<div
				ref={topRef}
				className={`sec-grid-hscroll__bar sec-grid-hscroll__bar--top ${
					canScroll ? "sec-grid-hscroll__bar--active" : "sec-grid-hscroll__bar--inactive"
				}`}
				onScroll={syncFrom("top")}
				aria-hidden={!canScroll}
			>
				<div ref={spacerRef} className="sec-grid-hscroll__spacer" />
			</div>

			<div
				ref={bottomRef}
				className={`sec-grid-hscroll__bar sec-grid-hscroll__bar--bottom max-w-full ${
					canScroll ? "sec-grid-hscroll__bar--active" : "sec-grid-hscroll__bar--idle"
				} ${stickyBottomScrollbar ? "sec-grid-hscroll__bar--hide-native" : ""}`}
				onScroll={syncFrom("bottom")}
			>
				{children}
			</div>

			{stickyBottomScrollbar && canScroll && (
				<div className="sec-grid-hscroll__sticky-spacer" aria-hidden />
			)}

			{fixedBar}
		</div>
	);
}
