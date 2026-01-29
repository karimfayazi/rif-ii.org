import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import {
	PAGE_TITLE,
	PAGE_SUBTITLE,
	HEADER_CONTAINER,
	HEADER_ACTIONS,
	BUTTON_PRIMARY,
	BUTTON_SECONDARY,
	BUTTON_SUCCESS,
	BUTTON_ACCENT
} from './DashboardStyles';

export interface ActionButton {
	label: string;
	onClick?: () => void;
	href?: string;
	icon?: LucideIcon;
	variant?: 'primary' | 'secondary' | 'success' | 'accent';
	hidden?: boolean;
}

interface PageHeaderProps {
	title: string;
	subtitle?: string;
	actions?: ActionButton[];
}

const getButtonClass = (variant: ActionButton['variant'] = 'secondary') => {
	switch (variant) {
		case 'primary':
			return BUTTON_PRIMARY;
		case 'success':
			return BUTTON_SUCCESS;
		case 'accent':
			return BUTTON_ACCENT;
		case 'secondary':
		default:
			return BUTTON_SECONDARY;
	}
};

export const PageHeader: React.FC<PageHeaderProps> = ({
	title,
	subtitle,
	actions = []
}) => {
	const visibleActions = actions.filter(action => !action.hidden);

	return (
		<div className={HEADER_CONTAINER}>
			<div>
				<h1 className={PAGE_TITLE}>{title}</h1>
				{subtitle && <p className={PAGE_SUBTITLE}>{subtitle}</p>}
			</div>
			{visibleActions.length > 0 && (
				<div className={HEADER_ACTIONS}>
					{visibleActions.map((action, index) => {
						const Icon = action.icon;
						const buttonClass = getButtonClass(action.variant);
						const content = (
							<>
								{Icon && <Icon className="h-4 w-4 mr-2 flex-shrink-0" />}
								{action.label}
							</>
						);

						if (action.href) {
							return (
								<Link
									key={index}
									href={action.href}
									className={buttonClass}
								>
									{content}
								</Link>
							);
						}

						return (
							<button
								key={index}
								onClick={action.onClick}
								className={buttonClass}
							>
								{content}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
};
