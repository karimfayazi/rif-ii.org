/**
 * Shared Dashboard UI Style Constants
 * Based on /dashboard/training design system
 */

// KPI Card Styles
export const KPI_CARD_CONTAINER = "bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-4 h-full";
export const KPI_CARD_LAYOUT = "flex items-center justify-between gap-3";
export const KPI_CARD_LEFT_SECTION = "flex items-center gap-3 min-w-0 flex-1";
export const KPI_CARD_ICON_WRAPPER = "p-2 rounded-lg flex-shrink-0"; // Add bg-{color}-50 dynamically
export const KPI_CARD_ICON = "h-5 w-5"; // Add text-{color}-600 dynamically
export const KPI_CARD_LABEL = "text-sm font-medium text-gray-700 truncate";
export const KPI_CARD_VALUE = "text-2xl font-semibold text-gray-900 tabular-nums flex-shrink-0";

// KPI Grid
export const KPI_GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3";

// Page Header Styles
export const PAGE_TITLE = "text-2xl font-bold text-gray-900";
export const PAGE_SUBTITLE = "text-sm text-gray-600 mt-1";
export const HEADER_CONTAINER = "flex items-center justify-between";
export const HEADER_ACTIONS = "flex items-center gap-3";

// Button Styles
export const BUTTON_BASE = "inline-flex items-center justify-center px-4 py-2 h-10 text-sm font-medium rounded-lg transition-colors whitespace-nowrap";
export const BUTTON_PRIMARY = `${BUTTON_BASE} bg-[#0b4d2b] text-white hover:bg-[#0a3d24]`;
export const BUTTON_SECONDARY = `${BUTTON_BASE} bg-gray-100 text-gray-700 hover:bg-gray-200`;
export const BUTTON_SUCCESS = `${BUTTON_BASE} bg-green-600 text-white hover:bg-green-700`;
export const BUTTON_ACCENT = `${BUTTON_BASE} text-[#0b4d2b] bg-[#0b4d2b]/10 hover:bg-[#0b4d2b]/20`;

// Filter Panel Styles
export const FILTER_PANEL_CONTAINER = "bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 shadow-lg p-6";
export const FILTER_PANEL_HEADER = "flex items-center justify-between mb-4";
export const FILTER_PANEL_TITLE = "text-lg font-semibold text-gray-900";
export const FILTER_PANEL_SUBTITLE = "text-sm text-gray-600";
export const FILTER_GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3";

// Input Styles
export const INPUT_LABEL = "block text-xs font-medium text-gray-700 mb-1";
export const INPUT_FIELD = "w-full h-9 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent";
export const SELECT_FIELD = "w-full h-9 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent";

// Alert/Message Styles
export const ALERT_SUCCESS = "bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between animate-in slide-in-from-top";
export const ALERT_ERROR = "bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between";
export const ALERT_WARNING = "bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between";

// Icon Sizes
export const ICON_SM = "h-4 w-4";
export const ICON_MD = "h-5 w-5";
export const ICON_LG = "h-6 w-6";
