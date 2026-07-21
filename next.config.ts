import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Vercel handles its own output; standalone is only for self-hosted (e.g. Plesk).
	// Using standalone on Vercel widens NFT traces and triggers "unexpected file in NFT list".
	...(process.env.VERCEL ? {} : { output: "standalone" as const }),
	reactStrictMode: true,
	// Dev HMR WebSockets send Origin: http://127.0.0.1:3000; allowlist defaults only cover
	// "localhost", so opening the site via 127.0.0.1 blocks /_next/webpack-hmr otherwise.
	// https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
	allowedDevOrigins: ["127.0.0.1"],
	// Exclude large/static folders from serverless function file tracing.
	outputFileTracingExcludes: {
		"*": [
			"./public/uploads/**/*",
			"./public/maps/**/*",
			"./public/Content/**/*",
			"./gis-data/**/*",
			"./.git/**/*",
			"./scripts/**/*",
		],
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
