# Dashboard UI Standardization Guide

## Overview
This document describes the shared dashboard UI components created based on `/dashboard/training` design system and provides guidance for standardizing all dashboard pages.

---

## ✅ Completed Work

### 1. **Shared Components Created** (`src/components/dashboard/`)

#### **DashboardStyles.ts**
- Centralized style constants for all dashboard pages
- Ensures consistent spacing, sizing, colors across the app
- Based on training page design patterns

**Key Constants:**
- `KPI_CARD_CONTAINER` - Standard card styling with hover effects
- `BUTTON_PRIMARY`, `BUTTON_SECONDARY`, `BUTTON_SUCCESS`, `BUTTON_ACCENT` - Consistent button styles
- `INPUT_FIELD`, `SELECT_FIELD` - Standard form field styling
- `FILTER_PANEL_CONTAINER` - Consistent filter panel design
- `PAGE_TITLE`, `PAGE_SUBTITLE` - Typography standards

#### **KpiCard.tsx**
- Reusable KPI card component
- Supports:
  - Icon with customizable colors (10 color schemes)
  - Loading skeleton state
  - Optional subtitle
  - Optional trend indicators
  - Automatic responsive layout

**Usage Example:**
```tsx
<KpiCard
  title="Total Events"
  value={formatNumber(totalEvents)}
  icon={GraduationCap}
  iconColor="blue"
  loading={isLoading}
/>
```

#### **KpiCardsGrid.tsx**
- Grid wrapper for KPI cards
- Configurable columns: 2, 3, 4 (default), 5, or 6
- Fully responsive (1 col mobile → 2 cols tablet → configurable cols desktop)

**Usage Example:**
```tsx
<KpiCardsGrid columns="4">
  <KpiCard ... />
  <KpiCard ... />
  <KpiCard ... />
</KpiCardsGrid>
```

#### **PageHeader.tsx**
- Standardized page header with title, subtitle, and action buttons
- Supports multiple action buttons with variants
- Automatic handling of Link vs button onClick

**Usage Example:**
```tsx
<PageHeader
  title="Training Events"
  subtitle="View and manage training events"
  actions={[
    {
      label: "Add Record",
      href: "/dashboard/training/add",
      icon: Plus,
      variant: "success",
      hidden: !canAdd // Conditional rendering
    },
    {
      label: "Refresh",
      onClick: fetchData,
      icon: RefreshCw,
      variant: "secondary"
    }
  ]}
/>
```

#### **FiltersPanel.tsx**
- Standardized filter panel container
- Includes helper components: `FilterLabel`, `FilterInput`, `FilterSelect`
- Consistent styling for all filter sections

**Usage Example:**
```tsx
<FiltersPanel
  title="Search & Filter Activities"
  subtitle="Find specific activities by name, sector, or location"
  headerActions={<ResetButton />}
>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    <div>
      <FilterLabel>District</FilterLabel>
      <FilterSelect
        value={district}
        onChange={(e) => setDistrict(e.target.value)}
      >
        <option value="">All Districts</option>
        {districts.map(d => <option key={d} value={d}>{d}</option>)}
      </FilterSelect>
    </div>
    {/* More filters */}
  </div>
</FiltersPanel>
```

---

### 2. **Pages Refactored**

#### ✅ **training-workshops** (`src/app/dashboard/training-workshops/page.tsx`)
- **Before:** 190 lines of repetitive KPI card code
- **After:** 80 lines using `<KpiCard>` and `<KpiCardsGrid>`
- **Result:** 
  - 57% code reduction for KPI section
  - Easier to maintain (add/remove cards)
  - Guaranteed visual consistency
  - All data/logic preserved exactly

**Code Comparison:**

**Before (10+ repetitive cards):**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-4 h-full">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
          <GraduationCap className="h-5 w-5 text-blue-600" />
        </div>
        <p className="text-sm font-medium text-gray-700 truncate">
          Total Events
        </p>
      </div>
      <p className="text-2xl font-semibold text-gray-900 tabular-nums flex-shrink-0">
        {formatNumber(kpis.totalEvents)}
      </p>
    </div>
  </div>
  {/* 9 more similar cards... */}
</div>
```

**After (clean and maintainable):**
```tsx
<KpiCardsGrid columns="4">
  <KpiCard title="Total Events" value={formatNumber(kpis.totalEvents)} icon={GraduationCap} iconColor="blue" />
  <KpiCard title="Reported Participants" value={formatNumber(kpis.totalParticipants)} icon={Users} iconColor="purple" />
  <KpiCard title="Unique Participants" value={formatNumber(kpis.registeredParticipants)} icon={UserCheck} iconColor="green" />
  {/* 7 more cards... */}
</KpiCardsGrid>
```

---

## 🎯 Design System Standards (from /dashboard/training)

### **Spacing & Sizing**
- Page spacing: `space-y-3` (12px between sections)
- Card grid gap: `gap-3` (12px)
- Card padding: `p-4` (16px)
- Input/Button height: `h-9` or `h-10` (36px or 40px)

### **Typography**
- Page title: `text-2xl font-bold text-gray-900`
- Page subtitle: `text-sm text-gray-600 mt-1`
- Card label: `text-sm font-medium text-gray-700`
- Card value: `text-2xl font-semibold text-gray-900 tabular-nums`
- Input label: `text-xs font-medium text-gray-700`

### **Colors**
- Brand primary: `#0b4d2b` (dark green)
- Primary hover: `#0a3d24`
- Icon colors: blue-50/600, green-50/600, pink-50/600, purple-50/600, orange-50/600, etc.

### **Borders & Shadows**
- Card border: `border border-gray-200`
- Card shadow: `shadow-sm hover:shadow-md`
- Card radius: `rounded-xl` (12px)
- Button radius: `rounded-lg` (8px)
- Input radius: `rounded-lg` (8px)

### **Responsive Grid**
- KPI Cards (4-col): `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Filter Fields: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Always single column on mobile for readability

---

## 📋 Rollout Checklist - Pages to Standardize

### **Priority 1: Dashboard List Pages** (High traffic, lots of KPIs)

- [ ] `/dashboard/reports` - Has action buttons ✅ (already aligned), add PageHeader
- [ ] `/dashboard/tracking-sheet` - Has action buttons ✅ (already aligned), add PageHeader  
- [ ] `/dashboard/training` - **SOURCE OF TRUTH** - Optionally refactor to use shared components
- [ ] `/dashboard/training-workshops` - ✅ **DONE** (KPI cards refactored)
- [ ] `/dashboard/documents` - Apply KpiCard if has stats
- [ ] `/dashboard/pictures` - Apply KpiCard if has stats
- [ ] `/dashboard/maps` - Apply KpiCard if has stats
- [ ] `/dashboard/tehsil-wise-progress` - Likely has KPIs
- [ ] `/dashboard/remote-monitoring` - Check for KPIs/stats

### **Priority 2: Detail/View Pages** (Consistent headers)

- [ ] `/dashboard/reports/view`
- [ ] `/dashboard/documents/view`
- [ ] `/dashboard/pictures/view`
- [ ] `/dashboard/maps/view`
- [ ] `/dashboard/security-updates/view`

### **Priority 3: Add/Edit Pages** (Form consistency)

- [ ] `/dashboard/training/add`
- [ ] `/dashboard/tracking-sheet/add`
- [ ] `/dashboard/reports/upload`
- [ ] `/dashboard/documents/upload`
- [ ] `/dashboard/pictures/upload`
- [ ] `/dashboard/security-updates/add`

---

## 🚀 How to Apply to Other Pages

### **Step 1: Identify What Needs Standardization**

Review each page and check:
- ✅ Does it have KPI cards? → Use `<KpiCard>` + `<KpiCardsGrid>`
- ✅ Does it have action buttons in header? → Use `<PageHeader>`
- ✅ Does it have filters/search section? → Wrap with `<FiltersPanel>`

### **Step 2: Refactor KPI Cards**

**Find existing card code like:**
```tsx
<div className="bg-white rounded-xl border ...">
  <div className="flex items-center justify-between ...">
    <div className="p-2 bg-blue-50 ...">
      <Icon className="h-5 w-5 ..." />
    </div>
    <p>Label</p>
    <p>{value}</p>
  </div>
</div>
```

**Replace with:**
```tsx
import { KpiCard, KpiCardsGrid } from "@/components/dashboard";

<KpiCardsGrid columns="4">
  <KpiCard
    title="Label"
    value={value}
    icon={Icon}
    iconColor="blue" // or green, purple, pink, etc.
  />
</KpiCardsGrid>
```

### **Step 3: Refactor Page Header**

**Find existing header like:**
```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold text-gray-900">Page Title</h1>
    <p className="text-sm text-gray-600 mt-1">Subtitle</p>
  </div>
  <div className="flex items-center space-x-3">
    <Link href="/add" className="inline-flex items-center px-4 py-2 ...">
      <Plus className="h-4 w-4 mr-2" />
      Add Record
    </Link>
    <button onClick={refresh} className="...">
      <RefreshCw className="h-4 w-4 mr-2" />
      Refresh
    </button>
  </div>
</div>
```

**Replace with:**
```tsx
import { PageHeader } from "@/components/dashboard";
import { Plus, RefreshCw } from "lucide-react";

<PageHeader
  title="Page Title"
  subtitle="Subtitle"
  actions={[
    { label: "Add Record", href: "/add", icon: Plus, variant: "success" },
    { label: "Refresh", onClick: refresh, icon: RefreshCw, variant: "secondary" }
  ]}
/>
```

### **Step 4: Refactor Filters Panel**

**Find existing filter section:**
```tsx
<div className="bg-gradient-to-r from-white to-gray-50 rounded-xl border ...">
  <div className="flex items-center justify-between mb-4">
    <h3>Search & Filter</h3>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    {/* Filter inputs */}
  </div>
</div>
```

**Wrap with FiltersPanel:**
```tsx
import { FiltersPanel, FilterLabel, FilterSelect } from "@/components/dashboard";

<FiltersPanel
  title="Search & Filter"
  subtitle="Find specific records"
>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    <div>
      <FilterLabel>District</FilterLabel>
      <FilterSelect value={district} onChange={handleChange}>
        <option value="">All</option>
        {/* options */}
      </FilterSelect>
    </div>
    {/* More filters */}
  </div>
</FiltersPanel>
```

---

## 📊 Benefits of Standardization

### **For Developers:**
- ✅ **58% less code** for KPI sections (190 lines → 80 lines)
- ✅ **Single source of truth** for styling
- ✅ **Faster development** - just pass props instead of writing JSX
- ✅ **Easier maintenance** - change once, apply everywhere
- ✅ **TypeScript safety** - proper types for all components

### **For Users:**
- ✅ **Consistent experience** across all dashboard pages
- ✅ **Familiar patterns** - same layout, spacing, interactions
- ✅ **Professional appearance** - no visual inconsistencies
- ✅ **Better mobile experience** - standardized responsive behavior

### **For Product:**
- ✅ **Brand consistency** - unified design language
- ✅ **Scalable system** - easy to add new pages
- ✅ **Quality assurance** - pre-tested components
- ✅ **Accessibility** - improvements propagate to all pages

---

## 🔧 Testing Checklist

After refactoring each page, verify:

- [ ] **Visual:** Page looks identical to before (spacing, colors, fonts)
- [ ] **Data:** All values display correctly (no missing data)
- [ ] **Interactions:** All buttons/links work (onClick, href)
- [ ] **Responsive:** Check mobile (320px), tablet (768px), desktop (1024px+)
- [ ] **Loading:** Skeleton states work for async data
- [ ] **TypeScript:** No type errors (`npm run build`)
- [ ] **Accessibility:** Tab navigation works, labels present

---

## 📝 Example: Complete Page Refactor

**Before:**
```tsx
export default function MyPage() {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Page</h1>
          <p className="text-sm text-gray-600 mt-1">Subtitle here</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/add" className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md p-4">
          {/* Long repetitive card code */}
        </div>
        {/* 3 more cards */}
      </div>
    </div>
  );
}
```

**After:**
```tsx
import { PageHeader, KpiCard, KpiCardsGrid } from "@/components/dashboard";
import { Plus, Users, Calendar } from "lucide-react";

export default function MyPage() {
  return (
    <div className="space-y-3">
      <PageHeader
        title="My Page"
        subtitle="Subtitle here"
        actions={[
          { label: "Add", href: "/add", icon: Plus, variant: "success" }
        ]}
      />

      <KpiCardsGrid columns="4">
        <KpiCard title="Total Users" value={totalUsers} icon={Users} iconColor="blue" />
        <KpiCard title="Active Events" value={activeEvents} icon={Calendar} iconColor="green" />
        {/* 2 more cards */}
      </KpiCardsGrid>
    </div>
  );
}
```

---

## 📚 Reference

### **Component Files:**
- `src/components/dashboard/KpiCard.tsx`
- `src/components/dashboard/KpiCardsGrid.tsx`
- `src/components/dashboard/PageHeader.tsx`
- `src/components/dashboard/FiltersPanel.tsx`
- `src/components/dashboard/DashboardStyles.ts`
- `src/components/dashboard/index.ts` (barrel export)

### **Example Implementation:**
- `src/app/dashboard/training-workshops/page.tsx` (✅ Refactored)

### **Design Source:**
- `src/app/dashboard/training/page.tsx` (Original design system)

---

## 🎯 Next Steps

1. **Review this guide** with the team
2. **Pick 2-3 high-traffic pages** to refactor next (reports, tracking-sheet, documents)
3. **Test thoroughly** after each refactor
4. **Iterate on shared components** based on feedback
5. **Continue rollout** to remaining pages systematically

---

**Last Updated:** 2026-01-29  
**Status:** ✅ Phase 1 Complete (Shared components created, 1 page refactored)  
**Next Phase:** Apply to reports, tracking-sheet, and training pages
