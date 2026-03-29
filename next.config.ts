import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "standalone",
	reactStrictMode: true,
	// Dev HMR WebSockets send Origin: http://127.0.0.1:3000; allowlist defaults only cover
	// "localhost", so opening the site via 127.0.0.1 blocks /_next/webpack-hmr otherwise.
	// https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
	allowedDevOrigins: ["127.0.0.1"],
	// Set Turbopack root to silence multiple lockfiles warning
	turbopack: {
		root: process.cwd(),
	},
	images: {
		unoptimized: true, // For Plesk hosting compatibility
		remotePatterns: [
			{
				protocol: "https",
				hostname: "rif-ii.org",
				port: "",
				pathname: "/**",
			},
		],
		dangerouslyAllowSVG: true,
		contentDispositionType: "attachment",
		contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
	},
	// Ensure static files are served correctly
	trailingSlash: false,
	typescript: {
		ignoreBuildErrors: false, // Keep this false to catch real errors
	},
};

export default nextConfig;
