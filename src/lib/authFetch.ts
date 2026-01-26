/**
 * Safari-compatible fetch wrapper for authenticated API calls
 * Ensures credentials (cookies) are sent with every request
 */

export interface AuthFetchOptions extends RequestInit {
	requireAuth?: boolean; // Default true
	skipRedirect?: boolean; // Skip redirect on 401
}

/**
 * Authenticated fetch wrapper with Safari-compatible settings
 * Always includes credentials and handles 401 redirects
 */
export async function authFetch(
	url: string,
	options: AuthFetchOptions = {}
): Promise<Response> {
	const {
		requireAuth = true,
		skipRedirect = false,
		...fetchOptions
	} = options;

	// Safari requires explicit credentials: "include" for cookies to be sent
	const config: RequestInit = {
		...fetchOptions,
		credentials: "include", // CRITICAL for Safari cookie handling
		headers: {
			"Content-Type": "application/json",
			...fetchOptions.headers,
		},
	};

	try {
		const response = await fetch(url, config);

		// Handle 401 Unauthorized - redirect to login
		if (response.status === 401 && requireAuth && !skipRedirect) {
			if (typeof window !== "undefined") {
				console.warn("[authFetch] 401 Unauthorized - redirecting to login");
				window.location.href = "/login";
			}
			throw new Error("Unauthorized");
		}

		return response;
	} catch (error) {
		console.error(`[authFetch] Error fetching ${url}:`, error);
		throw error;
	}
}

/**
 * Convenience method for GET requests
 */
export async function authGet(
	url: string,
	options: AuthFetchOptions = {}
): Promise<Response> {
	return authFetch(url, { ...options, method: "GET" });
}

/**
 * Convenience method for POST requests
 */
export async function authPost(
	url: string,
	data?: unknown,
	options: AuthFetchOptions = {}
): Promise<Response> {
	return authFetch(url, {
		...options,
		method: "POST",
		body: data ? JSON.stringify(data) : undefined,
	});
}

/**
 * Convenience method for DELETE requests
 */
export async function authDelete(
	url: string,
	options: AuthFetchOptions = {}
): Promise<Response> {
	return authFetch(url, { ...options, method: "DELETE" });
}

/**
 * Safari debug helper - logs auth state in development
 */
export function logSafariAuthDebug() {
	if (process.env.NODE_ENV !== "development" || typeof window === "undefined") {
		return;
	}

	console.group("🍎 Safari Auth Debug");
	
	// Check for auth cookie
	const authCookie = document.cookie
		.split("; ")
		.find((row) => row.startsWith("auth="));
	
	console.log("Auth Cookie:", authCookie || "❌ Not found");
	
	// Check localStorage
	const userData = localStorage.getItem("userData");
	console.log("LocalStorage userData:", userData ? "✅ Present" : "❌ Missing");
	
	// Check origin
	console.log("Origin:", window.location.origin);
	console.log("Protocol:", window.location.protocol);
	
	// Browser info
	const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
	console.log("Is Safari:", isSafari ? "✅ Yes" : "❌ No");
	console.log("User Agent:", navigator.userAgent);
	
	console.groupEnd();
}
