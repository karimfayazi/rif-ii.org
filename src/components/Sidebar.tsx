"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    LayoutDashboard,
    Map,
    ClipboardList,
    GraduationCap,
    FileText,
    BarChart3,
    ImagePlus,
    Link2,
    Settings,
    LogOut,
    ChevronsLeft,
    ChevronsRight,
    ChevronDown,
    ChevronRight,
    FolderPlus,
    Menu,
    X,
} from "lucide-react";

type SidebarProps = {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
};

type NavSubItem = {
	label: string;
	href: string;
};

type NavItem = {
	label: string;
	href?: string;
	icon: React.ComponentType<{ className?: string }>;
	subItems?: NavSubItem[];
	subMenus?: {
		label: string;
		items: NavSubItem[];
	}[];
};

type NavGroup = {
	items: NavItem[];
	divider?: boolean;
};

const GROUPS: NavGroup[] = [
	{
		divider: true,
		items: [
			{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
			{ label: "Dashboard V1", href: "/dashboard/dashboard_v1", icon: LayoutDashboard },
			{ label: "Add Project", href: "/dashboard/projects/add", icon: FolderPlus },
			{ 
				label: "GIS Maps", 
				icon: Map,
				subMenus: [
					{
						label: "Online Maps",
						items: [
							{ label: "Maps Master", href: "/dashboard/maps" },
							{ label: "Shapefile Maps", href: "/dashboard/maps/shapefiles" },
							{ label: "KPK-DIK & Bannu Maps", href: "/dashboard/maps/kpk-dik-bannu" },
							{ label: "Bannu Maps", href: "/dashboard/maps/bannu" },
							{ label: "DIK Maps", href: "/dashboard/maps/dik" },
						]
					},
					{
						label: "Maps Images",
						items: [
							{ label: "View Maps Images", href: "/dashboard/maps/images" },
							{ label: "Manage GIS Maps", href: "/dashboard/maps/manage" },
							{ label: "GIS Maps Records", href: "/dashboard/maps/records" },
						]
					}
				]
			},
			{ label: "Tracking Sheet", href: "/dashboard/tracking-sheet", icon: ClipboardList },
			{ 
				label: "Training, Capacity Building & Awareness", 
				href: "/dashboard/training/dashboard",
				icon: GraduationCap,
				subItems: [
					{ label: "Events", href: "/dashboard/training" },
					{ label: "Participants", href: "/dashboard/training/participants" },
				]
			},
		],
	},
	{
		divider: true,
		items: [
			{ label: "Important Documents", href: "/dashboard/documents", icon: FileText },
			{ label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
			{ label: "Pictures", href: "/dashboard/pictures", icon: ImagePlus },
			{ label: "Links", href: "/dashboard/links", icon: Link2 },
		],
	},
	{
		divider: true,
		items: [
			{ label: "Setting", href: "/dashboard/settings", icon: Settings },
			{ label: "Logout", href: "/logout", icon: LogOut },
		],
	},
];

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
    const pathname = usePathname();
    const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});
    const [expandedSubMenus, setExpandedSubMenus] = useState<{ [key: string]: boolean }>({});
    
    const toggleMenu = (label: string) => {
        setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
    };
    
    const toggleSubMenu = (label: string) => {
        setExpandedSubMenus(prev => ({ ...prev, [label]: !prev[label] }));
    };
    
    return (
        <nav className={`rounded-lg border border-gray-200 bg-white p-3 text-[12px] shadow-sm transition-all w-full ${collapsed ? "w-12" : "w-full"}`}>
			{/* Toggle Button */}
			<div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2">
				{!collapsed && (
					<span className="text-xs font-semibold text-gray-700">Menu</span>
				)}
				<button
					title={collapsed ? "Expand Menu" : "Collapse Menu"}
					onClick={(e) => {
						e.stopPropagation();
						setCollapsed(!collapsed);
					}}
					className={`rounded-md p-2 hover:bg-gray-100 transition-colors z-10 ${collapsed ? "mx-auto" : ""}`}
					type="button"
				>
					{collapsed ? (
						<Menu className="h-5 w-5 text-gray-600" />
					) : (
						<X className="h-5 w-5 text-gray-600" />
					)}
				</button>
			</div>
			{GROUPS.map((group, groupIdx) => (
				<div key={groupIdx} className="mb-3 last:mb-0">
					<ul className="space-y-1">
						{group.items.map((item, itemIdx) => {
							const Icon = item.icon;
							const isLogout = item.label === "Logout";
							const hasSubMenus = item.subMenus && item.subMenus.length > 0;
							const hasSubItems = item.subItems && item.subItems.length > 0;
							const isExpanded = expandedMenus[item.label];
							const isActive = item.href ? pathname === item.href : false;
							const isSubItemActive = hasSubItems && item.subItems?.some(subItem => pathname === subItem.href);
							
							return (
								<li key={`${item.label}-${itemIdx}`}>
									{isLogout ? (
										<button
											onClick={async () => {
												await fetch("/api/logout", { method: "POST" });
												window.location.href = "/login";
											}}
                                            className={`flex w-full items-center ${collapsed ? "justify-center" : "gap-2"} rounded-md px-3 py-2 text-left transition-colors hover:bg-red-50 hover:text-red-700`}
											title={collapsed ? item.label : undefined}
										>
											<Icon className="h-4 w-4" />
											{!collapsed && <span>{item.label}</span>}
										</button>
									) : hasSubItems ? (
										<>
											<div
												className={`flex w-full items-center rounded-md px-3 py-2 text-left transition-colors ${
													isSubItemActive || isActive
														? "bg-[#0b4d2b] text-white font-medium"
														: "hover:bg-gray-100"
												}`}
											>
												{/* Parent link (icon + label) */}
												<Link
													href={item.href || "#"}
													onClick={(e) => {
														// Do not toggle expand when clicking the link; only navigate
														e.stopPropagation();
													}}
													className={`flex items-center ${
														collapsed ? "justify-center" : "gap-2"
													} flex-1`}
													title={collapsed ? item.label : undefined}
												>
													<Icon className="h-4 w-4" />
													{!collapsed && <span>{item.label}</span>}
												</Link>

												{/* Expand/collapse chevron */}
												{!collapsed && (
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															toggleMenu(item.label);
														}}
														className="ml-2 rounded p-1 hover:bg-gray-200"
													>
														{isExpanded ? (
															<ChevronDown className="h-3 w-3" />
														) : (
															<ChevronRight className="h-3 w-3" />
														)}
													</button>
												)}
											</div>
											{isExpanded && !collapsed && item.subItems && (
												<ul className="ml-6 mt-1 space-y-0.5 border-l-2 border-gray-200 pl-2">
													{item.subItems.map((subItem, subItemIdx) => {
														const isSubActive = pathname === subItem.href;
														return (
															<li key={subItemIdx}>
																<Link
																	href={subItem.href}
																	className={`block rounded-md px-3 py-1.5 text-[11px] transition-colors ${
																		isSubActive
																			? "bg-[#0b4d2b] text-white font-medium"
																			: "text-gray-600 hover:bg-gray-50"
																	}`}
																>
																	{subItem.label}
																</Link>
															</li>
														);
													})}
												</ul>
											)}
										</>
									) : hasSubMenus ? (
										<>
											<button
												onClick={(e) => {
													e.stopPropagation();
													if (collapsed) {
														// Expand sidebar when collapsed
														setCollapsed(false);
														// Also expand the menu after a short delay to allow sidebar to expand
														setTimeout(() => toggleMenu(item.label), 100);
													} else {
														toggleMenu(item.label);
													}
												}}
                                                className={`flex w-full items-center ${collapsed ? "justify-center" : "gap-2"} rounded-md px-3 py-2 text-left transition-colors hover:bg-gray-100`}
												title={collapsed ? item.label : undefined}
											>
												<Icon className="h-4 w-4" />
												{!collapsed && (
													<>
														<span className="flex-1">{item.label}</span>
														{isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
													</>
												)}
											</button>
											{isExpanded && !collapsed && item.subMenus && (
												<ul className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
													{item.subMenus.map((subMenu, subMenuIdx) => (
														<li key={subMenuIdx}>
															<button
																onClick={() => toggleSubMenu(subMenu.label)}
																className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-[11px] text-gray-700 transition-colors hover:bg-gray-50"
															>
																<span className="font-medium">{subMenu.label}</span>
																{expandedSubMenus[subMenu.label] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
															</button>
															{expandedSubMenus[subMenu.label] && (
																<ul className="ml-3 mt-1 space-y-0.5">
																	{subMenu.items.map((subItem, subItemIdx) => {
																		const isSubActive = pathname === subItem.href;
																		return (
																			<li key={subItemIdx}>
																				<Link
																					href={subItem.href}
																					className={`block rounded-md px-3 py-1.5 text-[11px] transition-colors ${
																						isSubActive
																							? "bg-[#0b4d2b] text-white font-medium"
																							: "text-gray-600 hover:bg-gray-50"
																					}`}
																				>
																					{subItem.label}
																				</Link>
																			</li>
																		);
																	})}
																</ul>
															)}
														</li>
													))}
												</ul>
											)}
										</>
									) : (
										<Link
											href={item.href!}
											onClick={(e) => {
												// Don't expand sidebar when clicking menu items - only toggle button should do that
												e.stopPropagation();
											}}
                                            className={`flex items-center ${collapsed ? "justify-center" : "gap-2"} rounded-md px-3 py-2 transition-colors ${
												isActive
													? "bg-[#0b4d2b] text-white font-medium"
													: "hover:bg-gray-100"
											}`}
											title={collapsed ? item.label : undefined}
										>
											<Icon className="h-4 w-4" />
											{!collapsed && <span>{item.label}</span>}
										</Link>
									)}
								</li>
							);
						})}
					</ul>
					{group.divider && groupIdx < GROUPS.length - 1 && !collapsed && (
						<div className="my-3 border-t border-gray-300"></div>
					)}
				</div>
			))}
        </nav>
	);
}


