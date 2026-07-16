"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
	AlertCircle,
	CheckCircle2,
	KeyRound,
	Loader2,
	Lock,
	Mail,
	User,
	X
} from "lucide-react";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
	const [changePasswordData, setChangePasswordData] = useState({
		email: "",
		fullName: "",
		oldPassword: "",
		newPassword: "",
		confirmPassword: "",
	});
	const [lookupLoading, setLookupLoading] = useState(false);
	const [changePasswordLoading, setChangePasswordLoading] = useState(false);
	const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
	const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);

	useEffect(() => {
		if (!showChangePasswordModal) {
			return;
		}

		const trimmedEmail = changePasswordData.email.trim();
		if (!trimmedEmail) {
			setChangePasswordData((prev) => ({ ...prev, fullName: "" }));
			return;
		}

		const timer = window.setTimeout(async () => {
			try {
				setLookupLoading(true);
				setChangePasswordError(null);
				setChangePasswordSuccess(null);

				const response = await fetch(
					`/api/change-password?email=${encodeURIComponent(trimmedEmail)}`
				);
				const data = await response.json().catch(() => ({}));

				if (!response.ok) {
					setChangePasswordData((prev) => ({ ...prev, fullName: "" }));
					if (data?.message) {
						setChangePasswordError(data.message);
					}
					return;
				}

				setChangePasswordData((prev) => ({
					...prev,
					fullName: data?.user?.full_name || ""
				}));
			} catch (lookupError) {
				console.error("Change password lookup error:", lookupError);
				setChangePasswordData((prev) => ({ ...prev, fullName: "" }));
				setChangePasswordError("Unable to fetch user details right now");
			} finally {
				setLookupLoading(false);
			}
		}, 500);

		return () => {
			window.clearTimeout(timer);
		};
	}, [changePasswordData.email, showChangePasswordModal]);

	const resetChangePasswordModal = () => {
		setChangePasswordData({
			email: "",
			fullName: "",
			oldPassword: "",
			newPassword: "",
			confirmPassword: "",
		});
		setLookupLoading(false);
		setChangePasswordLoading(false);
		setChangePasswordError(null);
		setChangePasswordSuccess(null);
	};

	const openChangePasswordModal = () => {
		resetChangePasswordModal();
		setShowChangePasswordModal(true);
	};

	const closeChangePasswordModal = () => {
		setShowChangePasswordModal(false);
		resetChangePasswordModal();
	};

	const countSpecialCharacters = (value: string) => {
		return (value.match(/[^A-Za-z0-9]/g) || []).length;
	};

	const handleChangePasswordInput = (
		field: "email" | "oldPassword" | "newPassword" | "confirmPassword",
		value: string
	) => {
		setChangePasswordData((prev) => {
			if (field === "email") {
				return {
					...prev,
					email: value,
					fullName: "",
				};
			}

			return {
				...prev,
				[field]: value,
			};
		});
		setChangePasswordError(null);
		setChangePasswordSuccess(null);
	};

	const validateChangePasswordForm = () => {
		const trimmedEmail = changePasswordData.email.trim();

		if (!trimmedEmail) {
			setChangePasswordError("Email address is required");
			return false;
		}

		if (!changePasswordData.fullName.trim()) {
			setChangePasswordError("Email address does not exist");
			return false;
		}

		if (!changePasswordData.oldPassword) {
			setChangePasswordError("Old password is required");
			return false;
		}

		if (!changePasswordData.newPassword) {
			setChangePasswordError("New password is required");
			return false;
		}

		if (countSpecialCharacters(changePasswordData.newPassword) < 1) {
			setChangePasswordError("New password must contain at least 1 special character");
			return false;
		}

		if (!changePasswordData.confirmPassword) {
			setChangePasswordError("Confirm new password is required");
			return false;
		}

		if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
			setChangePasswordError("New password and confirm password do not match");
			return false;
		}

		return true;
	};

	async function handleChangePasswordSubmit(event: React.FormEvent) {
		event.preventDefault();
		setChangePasswordError(null);
		setChangePasswordSuccess(null);

		if (!validateChangePasswordForm()) {
			return;
		}

		setChangePasswordLoading(true);

		try {
			const response = await fetch("/api/change-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: changePasswordData.email.trim(),
					oldPassword: changePasswordData.oldPassword,
					newPassword: changePasswordData.newPassword,
					confirmPassword: changePasswordData.confirmPassword,
				}),
			});

			const data = await response.json().catch(() => ({}));

			if (!response.ok) {
				setChangePasswordError(data?.message || "Failed to update password");
				return;
			}

			setChangePasswordSuccess(data?.message || "Password updated successfully");
			setChangePasswordData((prev) => ({
				...prev,
				oldPassword: "",
				newPassword: "",
				confirmPassword: "",
			}));
		} catch (changeError) {
			console.error("Change password submission error:", changeError);
			setChangePasswordError("Unable to update password right now");
		} finally {
			setChangePasswordLoading(false);
		}
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		if (!email || !password) {
			setError("Email and password are required");
			return;
		}
		setLoading(true);
		try {
			// Safari requires explicit credentials: "include" for cookies
			const res = await fetch("/api/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include", // CRITICAL for Safari cookie handling
				body: JSON.stringify({ email, password }),
			});
			
			const data = await res.json().catch(() => ({}));

			if (!res.ok) {
				setError(data?.message || "Login failed");
				return;
			}

			// Store user data in localStorage for fallback
			if (data.user) {
				localStorage.setItem('userData', JSON.stringify(data.user));
			}
			
			// Log success for Safari debugging (dev only)
			if (process.env.NODE_ENV === "development") {
				console.log("✅ Login successful, redirecting to dashboard");
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
					<div className="flex items-center gap-4">
						<Link
							href="/"
							className="inline-flex items-center gap-2 text-white text-xs font-medium hover:text-blue-200 transition-colors"
						>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
							</svg>
							Home
						</Link>
					</div>
					<div className="text-white text-sm font-semibold text-center flex-1">
						Regional Infrastructure Fund – II in Khyber Pakhtunkhwa for &ldquo;RESILIENT RESOURCE MANAGEMENT IN CITIES (RRMIC)&rdquo;
					</div>
					<div className="w-16"></div> {/* Spacer for balance */}
				</div>
			</header>
			
			{/* Main Content - Takes remaining space */}
			<div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
				<div className="w-full max-w-5xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg md:grid md:grid-cols-[3fr_2fr] md:min-h-[470px]">
					{/* Left Side - Visual Panel (desktop+) — 60% width; height +5% from 448px */}
					<div className="relative hidden h-[470px] bg-white md:block">
						<Image
							src="/logo/login_image.JPG"
							alt="RIF-II MIS"
							fill
							priority
							sizes="(max-width: 768px) 0px, 60vw"
							className="object-contain object-center p-4"
						/>
					</div>

					{/* Right Side - Login Form */}
					<div className="flex flex-col justify-center p-8 sm:p-10">
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
							<button
								type="button"
								onClick={openChangePasswordModal}
								className="w-full rounded-md border border-[#0b4d2b] bg-white px-4 py-3 text-sm font-semibold text-[#0b4d2b] hover:bg-green-50 transition-colors"
							>
								Change Password
							</button>
						</form>
					</div>
				</div>
			</div>

			{showChangePasswordModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
						<div className="bg-gradient-to-r from-[#0b4d2b] to-[#14633a] px-6 py-5 text-white">
							<div className="flex items-start justify-between gap-4">
								<div className="flex items-center gap-3">
									<div className="rounded-xl bg-white/15 p-3">
										<KeyRound className="h-6 w-6" />
									</div>
									<div>
										<h2 className="text-xl font-semibold">Change Password</h2>
										<p className="mt-1 text-sm text-green-50">
											Update your account password securely
										</p>
									</div>
								</div>
								<button
									type="button"
									onClick={closeChangePasswordModal}
									className="rounded-lg p-2 text-white/90 hover:bg-white/10 hover:text-white transition-colors"
									aria-label="Close change password modal"
								>
									<X className="h-5 w-5" />
								</button>
							</div>
						</div>

						<form onSubmit={handleChangePasswordSubmit} className="space-y-5 p-6">
							<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
								<div className="md:col-span-2">
									<label className="mb-2 block text-sm font-medium text-gray-700">
										Email Address
									</label>
									<input
										type="email"
										value={changePasswordData.email}
										onChange={(e) =>
											handleChangePasswordInput("email", e.target.value)
										}
										placeholder="user@example.com"
										className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#0b4d2b] focus:outline-none focus:ring-4 focus:ring-[#0b4d2b]/10"
									/>
								</div>

								<div className="md:col-span-2">
									<label className="mb-2 block text-sm font-medium text-gray-700">
										Full Name
									</label>
									<input
										type="text"
										value={
											lookupLoading
												? "Fetching user..."
												: changePasswordData.fullName
										}
										placeholder="Full name will appear automatically"
										readOnly
										className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 focus:outline-none"
									/>
								</div>

								<div className="md:col-span-2">
									<label className="mb-2 block text-sm font-medium text-gray-700">
										Old Password
									</label>
									<input
										type="password"
										value={changePasswordData.oldPassword}
										onChange={(e) =>
											handleChangePasswordInput("oldPassword", e.target.value)
										}
										placeholder="Enter old password"
										className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#0b4d2b] focus:outline-none focus:ring-4 focus:ring-[#0b4d2b]/10"
									/>
								</div>

								<div>
									<label className="mb-2 block text-sm font-medium text-gray-700">
										New Password
									</label>
									<input
										type="password"
										value={changePasswordData.newPassword}
										onChange={(e) =>
											handleChangePasswordInput("newPassword", e.target.value)
										}
										placeholder="Enter new password"
										className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#0b4d2b] focus:outline-none focus:ring-4 focus:ring-[#0b4d2b]/10"
									/>
									<p className="mt-2 text-xs text-gray-500">
										Must contain at least 1 special character.
									</p>
								</div>

								<div>
									<label className="mb-2 block text-sm font-medium text-gray-700">
										Confirm New Password
									</label>
									<input
										type="password"
										value={changePasswordData.confirmPassword}
										onChange={(e) =>
											handleChangePasswordInput("confirmPassword", e.target.value)
										}
										placeholder="Confirm new password"
										className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#0b4d2b] focus:outline-none focus:ring-4 focus:ring-[#0b4d2b]/10"
									/>
								</div>
							</div>

							{changePasswordError && (
								<div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
									<AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
									<span>{changePasswordError}</span>
								</div>
							)}

							{changePasswordSuccess && (
								<div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
									<CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
									<span>{changePasswordSuccess}</span>
								</div>
							)}

							<div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
								<button
									type="button"
									onClick={closeChangePasswordModal}
									className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={changePasswordLoading || lookupLoading}
									className="inline-flex items-center justify-center rounded-xl bg-[#0b4d2b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0a3d22] disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
								>
									{changePasswordLoading ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Updating...
										</>
									) : (
										"Update Password"
									)}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Footer - Fixed at bottom */}
			<footer className="bg-[#0b4d2b] flex-shrink-0 mt-auto">
				<div className="mx-auto w-full max-w-none px-6 py-4 text-center text-white text-sm">
					<div className="flex justify-between items-center">
						<span>&copy; 2026 RIF-II, All rights reserved.</span>
						<div className="flex gap-4">
							<Link
								href="/"
								className="text-white hover:text-gray-300 transition-colors"
							>
								Home
							</Link>
							<Link
								href="/paroa-gis-map"
								className="text-white hover:text-gray-300 transition-colors"
							>
								paroa-gis-map
							</Link>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}


