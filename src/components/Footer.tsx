"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
	const pathname = usePathname();
	
	// Hide footer on login page since it has its own footer
	if (pathname === "/login") {
		return null;
	}

	return (
		<footer className="bg-[#0b4d2b]">
			<div className="mx-auto w-full max-w-none px-6 py-4 text-center text-white text-sm">
				<div className="flex justify-between items-center">
					<span>&copy; 2025 RIF-II, All rights reserved.</span>
					<div className="flex gap-4">
						<Link
							href="/"
							className="text-white hover:text-gray-300 transition-colors"
						>
							Home
						</Link>
						<span className="text-gray-400">|</span>
						<Link
							href="/contact-us"
							className="text-white hover:text-gray-300 transition-colors"
						>
							Contact Us
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
}

