"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";
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
    PanelLeftOpen,
    PanelLeftClose,
    Layers,
    Shield,
    TrendingUp,
    MapPin,
    Monitor,
    MoreHorizontal,
    Youtube,
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
			{ label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
			{ label: "Progress Tracking", href: "/dashboard/tracking-sheet", icon: TrendingUp },
		{ 
			label: "Training-Workshops", 
			href: "/dashboard/training-workshops",
			icon: GraduationCap,
			subItems: [
				{ label: "Events", href: "/dashboard/training" },
				{ label: "Participants", href: "/dashboard/training/participants" },
			]
		},
			{ label: "Important Documents", href: "/dashboard/documents", icon: FileText },
			{ label: "Important links", href: "/dashboard/links", icon: Link2 },
			{ label: "Tehsil Wise Progress", href: "/dashboard/tehsil-wise-progress", icon: MapPin },
			{ label: "Photo Gallary", href: "/dashboard/pictures", icon: ImagePlus },
			{ label: "Maps", href: "/dashboard/maps", icon: Map },
			{ label: "Security Update", href: "/dashboard/security-updates", icon: Shield },
			{ label: "Remote Monitoring", href: "/dashboard/remote-monitoring", icon: Monitor },
			{ label: "More ...", href: "/dashboard/more", icon: MoreHorizontal },
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
    const { user, getUserId } = useAuth();
    const userId = user?.id || getUserId();
    const { trackingSection, trainingSection } = useAccess(userId);
    const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});
    const [expandedSubMenus, setExpandedSubMenus] = useState<{ [key: string]: boolean }>({});
    
    const toggleMenu = (label: string) => {
        setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
    };
    
    const toggleSubMenu = (label: string) => {
        setExpandedSubMenus(prev => ({ ...prev, [label]: !prev[label] }));
    };
    
    return (
        <nav className={`rounded-lg border border-gray-200 bg-white p-3 text-[12px] shadow-sm transition-all ${collapsed ? "w-12" : "w-full"}`}>
			{/* Toggle Button */}
			<div className="mb-3 flex items-center justify-end border-b border-gray-200 pb-2">
				<button
					title={collapsed ? "Expand Menu" : "Collapse Menu"}
					onClick={(e) => {
						e.stopPropagation();
						setCollapsed(!collapsed);
					}}
					className="rounded-md p-2 hover:bg-gray-100 transition-colors z-10"
					type="button"
				>
					{collapsed ? (
						<PanelLeftOpen className="h-5 w-5 text-gray-600" />
					) : (
						<PanelLeftClose className="h-5 w-5 text-gray-600" />
					)}
				</button>
			</div>
			{GROUPS.map((group, groupIdx) => {
				// Filter items based on permissions
				const filteredItems = group.items.filter((item) => {
					// Hide Progress Tracking if trackingSection is false
					if (item.label === "Progress Tracking" && !trackingSection) {
						return false;
					}
					// Hide Training-Workshops if trainingSection is false
					if (item.label === "Training-Workshops" && !trainingSection) {
						return false;
					}
					return true;
				});

				if (filteredItems.length === 0) return null;

				return (
				<div key={groupIdx} className="mb-3 last:mb-0">
					<ul className="space-y-1">
						{filteredItems.map((item, itemIdx) => {
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
                                            className={`flex w-full items-center ${collapsed ? "justify-center" : "gap-2"} rounded-md px-3 py-2 text-left transition-colors hover:bg-red-50 hover:text-red-700 relative group`}
											title={collapsed ? item.label : undefined}
											aria-label={collapsed ? item.label : undefined}
										>
											<Icon className={`h-4 w-4 ${collapsed ? "h-5 w-5" : ""} flex-shrink-0`} />
											<span className={collapsed ? "hidden" : ""}>{item.label}</span>
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
													aria-label={collapsed ? item.label : undefined}
												>
													<Icon className={`h-4 w-4 ${collapsed ? "h-5 w-5" : ""} flex-shrink-0`} />
													<span className={collapsed ? "hidden" : ""}>{item.label}</span>
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
												aria-label={collapsed ? item.label : undefined}
											>
												<Icon className={`h-4 w-4 ${collapsed ? "h-5 w-5" : ""} flex-shrink-0`} />
												<span className={`flex-1 ${collapsed ? "hidden" : ""}`}>{item.label}</span>
												{!collapsed && (
													<>
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
											aria-label={collapsed ? item.label : undefined}
										>
											<Icon className={`h-4 w-4 ${collapsed ? "h-5 w-5" : ""} flex-shrink-0`} />
											<span className={collapsed ? "hidden" : ""}>{item.label}</span>
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
				);
			})}
			
			{/* Social Media Icons */}
			<div className="mt-4 pt-4 border-t border-gray-300">
				<div className={`${collapsed ? "flex flex-col" : "grid grid-cols-2"} gap-2`}>
					<a
						href="https://www.youtube.com"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center justify-center p-2 rounded-md hover:bg-gray-100 transition-colors"
						title="YouTube"
						aria-label="YouTube"
					>
						<Youtube className="h-5 w-5 text-red-600" />
					</a>
					<a
						href="https://www.facebook.com"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center justify-center p-2 rounded-md hover:bg-gray-100 transition-colors"
						title="Facebook"
						aria-label="Facebook"
					>
						<svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
						</svg>
					</a>
				</div>
			</div>
        </nav>
	);
}


