"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		if (!email || !password) {
			setError("Email and password are required");
			return;
		}
		setLoading(true);
		try {
			const res = await fetch("/api/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			
			const data = await res.json().catch(() => ({}));
			
			if (!res.ok) {
				throw new Error(data?.message || "Login failed");
			}
			
			// Store user data in localStorage for fallback
			if (data.user) {
				localStorage.setItem('userData', JSON.stringify(data.user));
			}
			
			// Redirect to dashboard immediately after successful login
			window.location.href = "/dashboard";
			
		} catch (e: unknown) {
			console.error("Login error:", e); // Debug log
			const errorMessage = e instanceof Error ? e.message : "Login failed";
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen bg-gray-50 flex flex-col">
			{/* Compact Header */}
			<header className="bg-[#0b4d2b] flex-shrink-0 py-3">
				<div className="mx-auto w-full max-w-none px-4 flex items-center justify-between">
					<Link
						href="/"
						className="inline-flex items-center gap-2 text-white text-xs font-medium hover:text-blue-200 transition-colors"
					>
						<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
						</svg>
						Home
					</Link>
					<div className="text-white text-sm font-semibold text-center flex-1">
						Regional Infrastructure Fund – II in Khyber Pakhtunkhwa for &ldquo;RESILIENT RESOURCE MANAGEMENT IN CITIES (RRMIC)&rdquo;
					</div>
					<div className="w-16"></div> {/* Spacer for balance */}
				</div>
			</header>
			
			{/* Main Content - Takes remaining space */}
			<div className="flex-1 flex items-center justify-center p-8">
				<div className="w-full max-w-5xl flex rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
					{/* Left Side - Image */}
					<div className="hidden md:flex md:w-1/2 relative bg-white">
						<div className="relative w-full h-full p-8 flex items-center justify-center">
							<Image
								src="/main.jpg"
								alt="RIF-II MIS"
								width={500}
								height={600}
								className="rounded-lg object-cover shadow-xl"
								priority
							/>
						</div>
					</div>
					
					{/* Right Side - Login Form */}
					<div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
					<h1 className="mb-6 text-2xl font-bold text-center text-gray-800">Sign in to RIF-II MIS</h1>
					<form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
						<div>
							<label className="mb-2 block text-sm font-medium text-gray-700">Email</label>
							<input
								type="text"
								className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none transition"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="user@example.com"
								autoComplete="off"
								required
							/>
						</div>
						<div>
							<label className="mb-2 block text-sm font-medium text-gray-700">Password</label>
							<input
								type="password"
								className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-[#0b4d2b] focus:ring-2 focus:ring-[#0b4d2b] focus:ring-opacity-20 focus:outline-none transition"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="********"
								autoComplete="new-password"
								required
							/>
						</div>
							{error && (
								<p className="text-sm text-red-600 text-center bg-red-50 py-2 rounded-md">{error}</p>
							)}
							<button
								type="submit"
								disabled={loading}
								className="w-full rounded-md bg-[#0b4d2b] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0a3d22] disabled:opacity-60 transition-colors shadow-md"
							>
								{loading ? "Signing in..." : "Sign in"}
							</button>
						</form>
					</div>
				</div>
			</div>

			{/* Footer - Fixed at bottom */}
			<footer className="bg-[#0b4d2b] flex-shrink-0 mt-auto">
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
		</div>
	);
}


