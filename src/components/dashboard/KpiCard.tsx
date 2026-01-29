import React from 'react';
import { LucideIcon } from 'lucide-react';
import {
	KPI_CARD_CONTAINER,
	KPI_CARD_LAYOUT,
	KPI_CARD_LEFT_SECTION,
	KPI_CARD_ICON_WRAPPER,
	KPI_CARD_ICON,
	KPI_CARD_LABEL,
	KPI_CARD_VALUE
} from './DashboardStyles';

interface KpiCardProps {
	title: string;
	value: string | number;
	icon?: LucideIcon;
	iconColor?: 'blue' | 'green' | 'pink' | 'purple' | 'orange' | 'indigo' | 'yellow' | 'emerald' | 'teal' | 'cyan' | 'red';
	loading?: boolean;
	subtitle?: string;
	trend?: {
		value: number;
		isPositive: boolean;
	};
}

const iconColorClasses = {
	blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
	green: { bg: 'bg-green-50', text: 'text-green-600' },
	pink: { bg: 'bg-pink-50', text: 'text-pink-600' },
	purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
	orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
	indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
	yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600' },
	emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
	teal: { bg: 'bg-teal-50', text: 'text-teal-600' },
	cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600' },
	red: { bg: 'bg-red-50', text: 'text-red-600' }
};

export const KpiCard: React.FC<KpiCardProps> = ({
	title,
	value,
	icon: Icon,
	iconColor = 'blue',
	loading = false,
	subtitle,
	trend
}) => {
	const colorClasses = iconColorClasses[iconColor];

	if (loading) {
		return (
			<div className={KPI_CARD_CONTAINER}>
				<div className="animate-pulse">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-3 flex-1">
							<div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
							<div className="h-4 bg-gray-200 rounded w-24"></div>
						</div>
						<div className="h-8 bg-gray-200 rounded w-16"></div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={KPI_CARD_CONTAINER}>
			<div className={KPI_CARD_LAYOUT}>
				<div className={KPI_CARD_LEFT_SECTION}>
					{Icon && (
						<div className={`${KPI_CARD_ICON_WRAPPER} ${colorClasses.bg}`}>
							<Icon className={`${KPI_CARD_ICON} ${colorClasses.text}`} />
						</div>
					)}
					<div className="flex flex-col min-w-0">
						<p className={KPI_CARD_LABEL}>
							{title}
						</p>
						{subtitle && (
							<p className="text-xs text-gray-500 truncate">
								{subtitle}
							</p>
						)}
					</div>
				</div>
				<div className="flex flex-col items-end">
					<p className={KPI_CARD_VALUE}>
						{value}
					</p>
					{trend && (
						<p className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
							{trend.isPositive ? '+' : ''}{trend.value}%
						</p>
					)}
				</div>
			</div>
		</div>
	);
};

export const KpiCardSkeleton: React.FC = () => (
	<div className={KPI_CARD_CONTAINER}>
		<div className="animate-pulse">
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-3 flex-1">
					<div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
					<div className="h-4 bg-gray-200 rounded w-24"></div>
				</div>
				<div className="h-8 bg-gray-200 rounded w-16"></div>
			</div>
		</div>
	</div>
);
