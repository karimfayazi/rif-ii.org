import React from 'react';
import { KPI_GRID } from './DashboardStyles';

interface KpiCardsGridProps {
	children: React.ReactNode;
	columns?: '2' | '3' | '4' | '5' | '6';
}

const gridColumnsClasses = {
	'2': 'grid grid-cols-1 sm:grid-cols-2 gap-3',
	'3': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3',
	'4': KPI_GRID, // Default: grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3
	'5': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3',
	'6': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3'
};

export const KpiCardsGrid: React.FC<KpiCardsGridProps> = ({
	children,
	columns = '4'
}) => {
	const gridClass = gridColumnsClasses[columns];
	
	return (
		<div className={gridClass}>
			{children}
		</div>
	);
};
