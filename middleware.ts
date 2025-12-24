import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
	const authValue = request.cookies.get("auth")?.value || "";
	const isAuth = authValue.startsWith("authenticated:");
	const { pathname } = request.nextUrl;

	// Allow public access to GIS maps page
	const isPublicGISMap = pathname === "/dashboard/kml-gis-maps";

	// Protect /dashboard (except public GIS maps page)
	if (pathname.startsWith("/dashboard") && !isAuth && !isPublicGISMap) {
		const loginUrl = new URL("/login", request.url);
		return NextResponse.redirect(loginUrl);
	}

	// Redirect logged-in users away from /login
	if (pathname === "/login" && isAuth) {
		const dashboardUrl = new URL("/dashboard", request.url);
		return NextResponse.redirect(dashboardUrl);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/dashboard/:path*", "/login"],
};


