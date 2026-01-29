import React from 'react';
import {
	FILTER_PANEL_CONTAINER,
	FILTER_PANEL_HEADER,
	FILTER_PANEL_TITLE,
	FILTER_PANEL_SUBTITLE,
	INPUT_LABEL,
	INPUT_FIELD,
	SELECT_FIELD
} from './DashboardStyles';

interface FiltersPanelProps {
	title?: string;
	subtitle?: string;
	children: React.ReactNode;
	headerActions?: React.ReactNode;
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({
	title = "Search & Filter",
	subtitle,
	children,
	headerActions
}) => {
	return (
		<div className={FILTER_PANEL_CONTAINER}>
			{(title || subtitle || headerActions) && (
				<div className={FILTER_PANEL_HEADER}>
					<div>
						{title && <h3 className={FILTER_PANEL_TITLE}>{title}</h3>}
						{subtitle && <p className={FILTER_PANEL_SUBTITLE}>{subtitle}</p>}
					</div>
					{headerActions && <div>{headerActions}</div>}
				</div>
			)}
			{children}
		</div>
	);
};

// Helper components for consistent field styling
export const FilterLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<label className={INPUT_LABEL}>{children}</label>
);

export const FilterInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
	<input {...props} className={`${INPUT_FIELD} ${props.className || ''}`} />
);

export const FilterSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
	<select {...props} className={`${SELECT_FIELD} ${props.className || ''}`} />
);
