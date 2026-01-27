'use client';

import { MoreHorizontal, Settings, HelpCircle, FileText, Database } from 'lucide-react';
import Link from 'next/link';

export default function MorePage() {
	const sections = [
		{
			title: 'System Settings',
			description: 'Configure system preferences and settings',
			icon: Settings,
			href: '/dashboard/settings',
			color: 'bg-blue-500'
		},
		{
			title: 'Help & Documentation',
			description: 'Access user guides and documentation',
			icon: HelpCircle,
			href: '/dashboard/help',
			color: 'bg-green-500'
		},
		{
			title: 'Data Management',
			description: 'Manage data imports and exports',
			icon: Database,
			href: '/dashboard/data',
			color: 'bg-purple-500'
		},
		{
			title: 'System Logs',
			description: 'View system activity and logs',
			icon: FileText,
			href: '/dashboard/logs',
			color: 'bg-orange-500'
		}
	];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<div className="flex items-center space-x-3">
						<div className="p-3 bg-gray-100 rounded-lg">
							<MoreHorizontal className="h-6 w-6 text-gray-600" />
						</div>
						<h1 className="text-3xl font-bold text-gray-900">More Options</h1>
					</div>
					<p className="text-gray-600 mt-2">Additional features and system utilities</p>
				</div>
			</div>

			{/* Grid of Options */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{sections.map((section) => {
					const Icon = section.icon;
					return (
						<Link
							key={section.href}
							href={section.href}
							className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-6"
						>
							<div className="flex items-start space-x-4">
								<div className={`p-3 ${section.color} rounded-lg text-white flex-shrink-0`}>
									<Icon className="h-6 w-6" />
								</div>
								<div className="flex-1">
									<h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#0b4d2b] transition-colors">
										{section.title}
									</h3>
									<p className="text-sm text-gray-600 mt-1">
										{section.description}
									</p>
								</div>
							</div>
						</Link>
					);
				})}
			</div>

			{/* Info Box */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
				<h3 className="text-sm font-semibold text-blue-900 mb-2">Coming Soon</h3>
				<p className="text-sm text-blue-800">
					Additional features and utilities are being developed. Check back soon for updates.
				</p>
			</div>
		</div>
	);
}
