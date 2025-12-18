"use client";

/**
 * Client-side utility to get user ID from cookie
 * This is a client-only function and doesn't import any server-side code
 */
export function getUserIdFromCookie(): string | null {
	if (typeof window === 'undefined') return null;
	
	const authCookie = document.cookie
		.split("; ")
		.find((row) => row.startsWith("auth="))
		?.split("=")[1];

	if (authCookie && authCookie.startsWith("authenticated:")) {
		return authCookie.split(":")[1];
	}
	return null;
}
