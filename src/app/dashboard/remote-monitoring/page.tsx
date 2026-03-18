"use client";

import { Monitor, Construction, ArrowLeft, Globe, Map } from "lucide-react";
import Link from "next/link";

export default function RemoteMonitoringPage() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Link
					href="/dashboard"
					className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-green-50 rounded-lg transition-colors"
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back
				</Link>
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Remote Monitoring</h1>
					<p className="text-gray-600 mt-1">Monitor and track remote systems and operations</p>
				</div>
			</div>

			{/* Under Construction Message */}
			<div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
				<div className="flex flex-col items-center justify-center py-20 px-6">
					{/* Construction Icon */}
					<div className="relative mb-8">
						<div className="absolute inset-0 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full blur-2xl opacity-50"></div>
						<div className="relative bg-gradient-to-br from-yellow-400 to-orange-500 p-8 rounded-full">
							<Construction className="h-16 w-16 text-white" />
						</div>
					</div>

					{/* Monitor Icon */}
					<div className="mb-6">
						<Monitor className="h-12 w-12 text-gray-400" />
					</div>

					{/* Message */}
					<h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
						This Section is Under Construction
					</h2>
					<p className="text-lg text-gray-600 text-center max-w-md mb-6">
						We're working hard to bring you an amazing remote monitoring experience. 
						This feature will be available soon.
					</p>

					{/* Decorative Elements */}
					<div className="flex items-center space-x-2 text-sm text-gray-500 mt-8">
						<div className="h-2 w-2 bg-yellow-400 rounded-full animate-pulse"></div>
						<span>Coming Soon</span>
						<div className="h-2 w-2 bg-yellow-400 rounded-full animate-pulse"></div>
					</div>
				</div>
			</div>

			{/* Action Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Google Earth Pro Viewer */}
				<Link href="/dashboard/remote-monitoring/google-earth-pro">
					<div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-6 hover:shadow-lg transition-shadow cursor-pointer group">
						<div className="flex items-start space-x-4">
							<div className="p-3 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
								<Globe className="h-6 w-6 text-emerald-600" />
							</div>
							<div className="flex-1">
								<h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-emerald-700 transition-colors">
									Google Earth Pro Viewer
								</h3>
								<p className="text-sm text-gray-700 mb-3">
									View and analyze KMZ layers with professional GIS controls
								</p>
								<div className="flex items-center text-sm text-emerald-600 font-medium">
									<span>Open Viewer</span>
									<ArrowLeft className="h-4 w-4 ml-2 rotate-180 group-hover:translate-x-1 transition-transform" />
								</div>
							</div>
						</div>
					</div>
				</Link>

				{/* GIS Section */}
				<Link href="/dashboard/remote-monitoring/gis-section">
					<div className="bg-gradient-to-br from-cyan-50 to-sky-50 rounded-xl border border-cyan-200 p-6 hover:shadow-lg transition-shadow cursor-pointer group">
						<div className="flex items-start space-x-4">
							<div className="p-3 bg-cyan-100 rounded-lg group-hover:bg-cyan-200 transition-colors">
								<Map className="h-6 w-6 text-cyan-600" />
							</div>
							<div className="flex-1">
								<h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-cyan-700 transition-colors">
									GIS Section
								</h3>
								<p className="text-sm text-gray-700 mb-3">
									Open the GIS KMZ Maps workspace for future layer-based map content
								</p>
								<div className="flex items-center text-sm text-cyan-600 font-medium">
									<span>Open Section</span>
									<ArrowLeft className="h-4 w-4 ml-2 rotate-180 group-hover:translate-x-1 transition-transform" />
								</div>
							</div>
						</div>
					</div>
				</Link>

				{/* Paroa GIS Map */}
				<Link href="/paroa-gis-map">
					<div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200 p-6 hover:shadow-lg transition-shadow cursor-pointer group">
						<div className="flex items-start space-x-4">
							<div className="p-3 bg-violet-100 rounded-lg group-hover:bg-violet-200 transition-colors">
								<Map className="h-6 w-6 text-violet-600" />
							</div>
							<div className="flex-1">
								<h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-violet-700 transition-colors">
									Paroa GIS Map
								</h3>
								<p className="text-sm text-gray-700 mb-3">
									Open the standalone Paroa GIS map page without the dashboard layout
								</p>
								<div className="flex items-center text-sm text-violet-600 font-medium">
									<span>Open Map</span>
									<ArrowLeft className="h-4 w-4 ml-2 rotate-180 group-hover:translate-x-1 transition-transform" />
								</div>
							</div>
						</div>
					</div>
				</Link>

				{/* Additional Info Card */}
				<div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
					<div className="flex items-start space-x-4">
						<div className="p-3 bg-blue-100 rounded-lg">
							<Monitor className="h-6 w-6 text-blue-600" />
						</div>
						<div>
							<h3 className="text-lg font-semibold text-gray-900 mb-2">
								What to Expect
							</h3>
							<ul className="space-y-2 text-gray-700 text-sm">
								<li className="flex items-start">
									<span className="text-blue-600 mr-2">•</span>
									<span>Real-time system monitoring</span>
								</li>
								<li className="flex items-start">
									<span className="text-blue-600 mr-2">•</span>
									<span>Remote device tracking</span>
								</li>
								<li className="flex items-start">
									<span className="text-blue-600 mr-2">•</span>
									<span>Performance analytics</span>
								</li>
								<li className="flex items-start">
									<span className="text-blue-600 mr-2">•</span>
									<span>Automated reporting</span>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}


