# Training-Workshops Dashboard Implementation

## Overview
Comprehensive data analysis dashboard for training events and workshop activities with KPI cards, trend charts, breakdown analysis, filters, and drilldown capabilities.

## Files Created/Modified

### 1. API Routes

#### `/src/app/api/training-workshops/dashboard/route.ts`
**Purpose:** Main dashboard data aggregation endpoint
**Features:**
- Fetches KPI metrics (13 key indicators)
- Generates chart datasets for 10 different visualizations
- Supports comprehensive filtering (date range, district, tehsil, sector, event type, facilitator)
- Uses parameterized queries for security
- Executes parallel queries for optimal performance
- Joins TrainingEvents and workshop_participants tables using TrainingEventCode

**Key Metrics Provided:**
- Total Events
- Total Participants (Reported from TrainingEvents)
- Registered Participants (from workshop_participants)
- Total Male/Female
- Average Participants per Event
- Average Duration
- Pre/Post Evaluation Averages & Improvement
- Events with Completion Reports
- Events with Participant Lists
- Events with Pictures

**Chart Data Provided:**
1. Events Over Time (by month)
2. Participants Over Time (by month)
3. District-wise Participants (top 10 + Others)
4. Tehsil-wise Participants (top 10 + Others)
5. Sector-wise Events & Participants
6. Event Type Distribution
7. Gender Distribution (from participants table)
8. Organization Participation (top 10 + Others)
9. Training Unit Distribution
10. Pre vs Post Evaluation Comparison

#### `/src/app/api/training-workshops/events/route.ts`
**Purpose:** Events list for drilldown table
**Features:**
- Returns filtered list of training events
- Includes all key event details
- Supports same filter parameters as dashboard
- Sorted by StartDate DESC

#### `/src/app/api/training-workshops/filters/route.ts`
**Purpose:** Provides distinct filter options
**Features:**
- Returns unique values for all filter dropdowns
- Fetches from TrainingEvents table
- Filters out NULL/empty values
- Sorted alphabetically

**Filter Options:**
- Districts
- Tehsils
- Sectors
- Event Types
- Facilitators

#### `/src/app/api/training-workshops/event-participants/route.ts`
**Purpose:** Fetch participants for a specific event
**Features:**
- Takes TrainingEventCode as parameter
- Returns detailed participant information
- Uses parameterized query for security
- Sorted by participant name

### 2. Dashboard Page Component

#### `/src/app/dashboard/training-workshops/page.tsx`
**Purpose:** Main dashboard UI component
**Technology:**
- React with TypeScript
- Chart.js via react-chartjs-2
- Lucide React icons
- Tailwind CSS styling

**Features:**

##### A) Filter Bar (Top Section)
- Date Range: From Date & To Date
- District dropdown (dynamic)
- Tehsil dropdown (dynamic)
- Sector dropdown (dynamic)
- Event Type dropdown (dynamic)
- Facilitator dropdown (dynamic)
- Clear All button
- Show/Hide toggle

##### B) KPI Cards (13 Cards)
1. **Total Events** - Count of training events
2. **Reported Participants** - Sum from TrainingEvents.TotalParticipants
3. **Registered Participants** - Count from workshop_participants
4. **Male Participants** - Sum of TotalMale
5. **Female Participants** - Sum of TotalFemale
6. **Avg Participants/Event** - Average participants per event
7. **Avg Duration** - Average training days
8. **Avg Pre-Evaluation** - Average pre-training score
9. **Avg Post-Evaluation** - Average post-training score
10. **Evaluation Improvement** - Difference (Post - Pre)
11. **Events w/ Reports** - Count with completion reports
12. **Events w/ Lists** - Count with participant lists
13. **Events w/ Pictures** - Count with picture attachments

Each card includes:
- Icon with colored background
- Large number display
- Descriptive label
- Color-coded by category

##### C) Charts (10 Interactive Visualizations)

**IMPORTANT:** All charts now feature interactive type switching! Users can switch between different visualization types on-the-fly.

1. **Events Over Time**
   - Default: Line Chart
   - Available types: Bar, Line, Area
   - X-axis: Month, Y-axis: Event count
   - Shows trend of event frequency

2. **Participants Over Time**
   - Default: Area Chart
   - Available types: Bar, Line, Area
   - X-axis: Month, Y-axis: Participant count
   - Shows participant engagement trend with filled area

3. **District-wise Participants**
   - Default: Bar Chart
   - Available types: Bar, Horizontal Bar, Pie
   - Top 10 districts + Others
   - Green color scheme
   - Data labels on pie chart

4. **Tehsil-wise Participants**
   - Default: Bar Chart
   - Available types: Bar, Horizontal Bar, Pie
   - Top 10 tehsils + Others
   - Orange color scheme
   - Rotated labels for bar view

5. **Sector-wise Analysis**
   - Default: Bar Chart (Stacked)
   - Available types: Bar, Horizontal Bar, Line
   - Two series: Events & Participants
   - Compares sector performance
   - Blue & Purple color scheme

6. **Event Type Distribution**
   - Default: Pie Chart
   - Available types: Pie, Bar, Horizontal Bar
   - Percentage breakdown in pie mode
   - Legend positioning adapts to chart type
   - Multi-color palette
   - Data labels in pie mode

7. **Gender Distribution**
   - Default: Pie Chart
   - Available types: Pie, Bar, Horizontal Bar
   - Male/Female/Other split
   - Data from participants table
   - Blue/Pink/Gray color scheme
   - Data labels in pie mode

8. **Organization Participation**
   - Default: Horizontal Bar Chart
   - Available types: Horizontal Bar, Bar, Pie
   - Top 10 organizations + Others
   - From workshop_participants.organization_department
   - Indigo color scheme

9. **Training Unit Distribution**
   - Default: Bar Chart
   - Available types: Bar, Horizontal Bar, Pie
   - From workshop_participants.Training_Unit
   - Teal color scheme
   - Adapts to data size

10. **Pre vs Post Evaluation**
    - Default: Bar Chart
    - Available types: Bar, Line, Horizontal Bar
    - Side-by-side comparison
    - Shows evaluation improvement
    - Yellow (Pre) & Green (Post)
    - Data labels enabled

**Chart Type Switcher Features:**
- Small, compact buttons above each chart
- 5 chart types available: V-Bar, H-Bar, Line, Area, Pie
- Each chart has custom available types based on data
- State persists during session
- Smooth transitions between types
- Responsive design

##### D) Events Drilldown Table (Collapsible)
**Features:**
- Show/Hide toggle button
- Comprehensive event details
- Action buttons for each row:
  - View Details (eye icon) - Opens modal
  - Open Report (file icon) - If available
  - Open Participant List (list icon) - If available
  - Open Pictures (image icon) - If available

**Columns:**
- Event Code
- Title
- District
- Tehsil
- Sector
- Type
- Dates (Start to End)
- Days
- Participants
- Male
- Female
- Actions

##### E) Event Details Modal
**Features:**
- Full event information display
- Grid layout for event details
- Registered participants sub-table
- Shows actual workshop_participants linked by TrainingEventCode
- Participant details:
  - Name
  - Gender
  - Organization
  - Designation
  - CNIC
  - Contact
  - District

**UI Elements:**
- Colored header (green gradient)
- Close button (X icon)
- Responsive layout
- Loading state for participants
- Empty state handling

##### F) Loading & Empty States
- Initial loading spinner
- "No data for selected filters" messages
- Skeleton states where appropriate

## Database Schema Used

### TrainingEvents Table
```sql
[_rifiiorg_db].[rifiiorg].[TrainingEvents]
- SN (Primary Key)
- TrainingEventCode (Join Key)
- TrainingTitle
- Output
- SubNo
- SubActivityName
- EventType
- Venue
- LocationTehsil
- District
- StartDate
- EndDate
- TotalDays
- TrainingFacilitatorName
- TMAMale, TMAFemale
- PHEDMale, PHEDFemale
- LGRDMale, LGRDFemale
- PDDMale, PDDFemale
- CommunityMale, CommunityFemale
- AnyOtherMale, AnyOtherFemale
- TotalMale
- TotalFemale
- TotalParticipants
- PreTrainingEvaluation
- PostTrainingEvaluation
- ActivityCompletionReportLink
- ParticipantListAttachment
- PictureAttachment
- Sector
- Remarks
```

### workshop_participants Table
```sql
[_rifiiorg_db].[dbo].[workshop_participants]
- sn (Primary Key)
- TrainingEventCode (Join Key)
- participant_name
- so_do_wo_ho
- gender
- organization_department
- designation
- profession
- cnic_number
- contact_number
- tehsil
- district
- NC_VC
- workshop_training_name
- workshop_session_conference
- start_date
- end_date
- Training_Unit
- Venue
- Duration_Days
```

### Join Relationship
```sql
TrainingEvents.TrainingEventCode = workshop_participants.TrainingEventCode
```

## Performance Optimizations

### SQL Query Optimizations
1. **Parallel Query Execution**
   - All dashboard queries run in parallel using `Promise.all()`
   - Reduces total fetch time significantly

2. **Efficient Grouping**
   - Uses SQL GROUP BY for aggregations
   - Top N + Others pattern for large datasets
   - `WITH` clauses (CTEs) for complex aggregations

3. **Parameterized Queries**
   - Prevents SQL injection
   - Example: `pool.request().input('trainingEventCode', trainingEventCode)`

4. **Index Suggestions** (commented in code)
   ```sql
   -- Recommended indexes for optimal performance:
   CREATE INDEX IX_TrainingEvents_StartDate ON TrainingEvents(StartDate)
   CREATE INDEX IX_TrainingEvents_District ON TrainingEvents(District)
   CREATE INDEX IX_TrainingEvents_EventCode ON TrainingEvents(TrainingEventCode)
   CREATE INDEX IX_Participants_EventCode ON workshop_participants(TrainingEventCode)
   ```

### Frontend Optimizations
1. **useCallback Hooks**
   - Memoizes fetch functions
   - Prevents unnecessary re-renders

2. **Conditional Fetching**
   - Events table only fetches when expanded
   - Participants only fetch when modal opens

3. **Chart.js Configuration**
   - Responsive: true
   - maintainAspectRatio: false
   - Optimized for performance

## Filter Logic

### How Filters Work
1. User selects filter options
2. Filters are stored in component state
3. useEffect triggers data refetch when filters change
4. API receives filters as query parameters
5. SQL WHERE clause is dynamically built
6. All charts and KPIs update based on filtered data

### Filter Combinations
- Filters work together (AND logic)
- Empty filters are ignored
- Date range: `StartDate >= fromDate AND EndDate <= toDate`
- Other filters: Exact match

### Example Filter Query
```typescript
// User selects: District = "DIK", Sector = "Health"
// Generated WHERE clause:
WHERE [District] = 'DIK' AND [Sector] = 'Health'
```

## UI/UX Design Patterns

### Consistent Design System
- Matches existing dashboard style
- Uses same color palette (`#0b4d2b` primary green)
- Consistent spacing and typography
- Tailwind CSS utility classes

### Responsive Layout
- Mobile: 1-column grid
- Tablet: 2-column grid
- Desktop: 3-5 column grid
- Charts scale automatically

### Color Coding
- **Blue**: General metrics, trends
- **Purple**: Participants
- **Green**: Success, positive metrics
- **Orange**: Location-based metrics
- **Red**: Reports, documents
- **Pink**: Gender-related, pictures
- **Yellow**: Evaluations (Pre)
- **Teal**: Units, organizations

### Icons (Lucide React)
- GraduationCap: Events
- Users: Total participants
- User: Male participants
- UserCheck: Female participants
- Calendar: Duration
- Award: Evaluations
- TrendingUp: Improvement
- FileText: Reports
- List: Participant lists
- ImageIcon: Pictures
- Filter: Filters
- RefreshCw: Refresh
- Eye: View details
- ChevronDown/Up: Expand/collapse

## Data Flow

### 1. Initial Load
```
Component Mount
  → fetchFilterOptions()
  → fetchDashboardData()
  → Display KPIs & Charts
```

### 2. Filter Change
```
User Changes Filter
  → Update state
  → fetchDashboardData() triggered
  → API call with new filters
  → Charts & KPIs update
```

### 3. View Event Details
```
User Clicks Eye Icon
  → setSelectedEvent(event)
  → fetchEventParticipants(eventCode)
  → Modal opens with participants
```

### 4. Expand Events Table
```
User Clicks "Show Table"
  → fetchEvents() called
  → Table populated with filtered events
```

## Testing Recommendations

### 1. Filter Testing
- Test each filter individually
- Test filter combinations
- Test date range edge cases
- Test with no filters (show all)
- Test Clear All functionality

### 2. Data Validation
- Verify KPI calculations
- Check chart data accuracy
- Validate participant counts match
- Test with empty datasets
- Test with large datasets

### 3. Performance Testing
- Measure initial load time
- Test with slow network
- Monitor SQL query performance
- Check browser memory usage

### 4. UI/UX Testing
- Test on mobile devices
- Test on different screen sizes
- Verify all modals close properly
- Check button interactions
- Test keyboard navigation

### 5. Edge Cases
- No events in database
- Events without participants
- Missing TrainingEventCode
- NULL values in filters
- Very long event titles
- Special characters in data

## Deployment Checklist

- [x] API routes created
- [x] Dashboard page component created
- [x] TypeScript compilation passes
- [x] No linter errors
- [x] Filters implemented
- [x] KPI cards implemented
- [x] Charts implemented
- [x] Drilldown table implemented
- [x] Event details modal implemented
- [x] Loading states implemented
- [x] Empty states implemented
- [x] Error handling implemented
- [x] Responsive design implemented
- [ ] Database indexes created (optional, commented)
- [ ] Load testing performed
- [ ] User acceptance testing
- [ ] Production deployment

## Security Considerations

### 1. SQL Injection Prevention
- Parameterized queries used where possible
- Input sanitization via SQL Server library
- Dynamic WHERE clauses built safely

### 2. Authentication
- Uses existing auth system via `/api/` routes
- No public endpoints exposed

### 3. Data Validation
- Type checking with TypeScript
- NULL checks before display
- Try-catch blocks for error handling

## Maintenance Notes

### Adding New Filters
1. Add to filter state in page component
2. Add UI element in filter bar
3. Add to fetchDashboardData query params
4. Update API route WHERE clause builder
5. Add to filters API if dropdown needed

### Adding New KPIs
1. Add SQL query to dashboard API
2. Add to KPIData type
3. Add card to UI grid
4. Choose appropriate icon and color

### Adding New Charts
1. Add SQL query to dashboard API (with GROUP BY)
2. Add to ChartData type
3. Add chart component to grid
4. Configure Chart.js options

### Modifying SQL Queries
- Always use parameterized queries
- Test with SQL Server Management Studio first
- Consider adding indexes for new WHERE clauses
- Profile query performance

## Browser Compatibility
- Chrome: ✓
- Firefox: ✓
- Safari: ✓
- Edge: ✓
- Mobile browsers: ✓

## Dependencies Used
- next: ^16.0.8
- react: 19.2.0
- react-chartjs-2: ^5.3.0
- chart.js: ^4.5.1
- chartjs-plugin-datalabels: ^2.2.0
- lucide-react: ^0.546.0
- mssql: ^12.0.0
- tailwindcss: ^4

## New Components Added

### ChartTypeSwitcher
A reusable component that renders chart type selection buttons.

**Props:**
- `currentType`: Currently selected chart type
- `onTypeChange`: Callback when chart type changes
- `availableTypes`: Optional array of chart types to show (defaults to all 5)

**Features:**
- Compact button group with rounded design
- Active state highlighting
- Hover effects
- Responsive sizing

### DynamicChartRenderer
A smart component that renders the appropriate chart based on type selection.

**Props:**
- `chartType`: The type of chart to render
- `data`: Chart.js data object
- `options`: Chart.js options object
- `height`: Chart container height (default: '280px')
- `showDataLabels`: Whether to show data labels (default: false)

**Features:**
- Handles 5 chart types: bar, horizontal-bar, line, area, pie
- Automatically adjusts options based on chart type
- Configures legend position dynamically
- Adds data labels plugin when needed
- Maintains aspect ratio control
- Responsive design

**Chart Type Behaviors:**
- **Bar**: Vertical bars with standard options
- **Horizontal Bar**: Horizontal bars with flipped axes
- **Line**: Line chart without fill
- **Area**: Line chart with gradient fill
- **Pie**: Circular chart with legend on right

## Known Limitations
1. No pagination on events table (shows all filtered events)
2. Date filters work on event dates only (not participant dates)
3. Charts show top 10 + Others (not configurable)
4. Chart type selection does not persist across page refreshes (session only)
5. No user-specific filtering (shows all events user can access)

## Future Enhancements (Suggestions)
1. ✅ **COMPLETED:** Interactive chart type switching
2. Add chart export (PNG/PDF)
3. Add table export (Excel/CSV)
4. Add pagination to events table
5. Add sorting to table columns
6. Add search within table
7. Add comparison mode (compare periods)
8. Add favorite filters (save/load)
9. Add scheduled reports
10. Add data refresh interval
11. Add drill-up capability (from chart click)
12. Persist chart type preferences in localStorage
13. Add "Reset to Default Charts" button
14. Add fullscreen mode for individual charts
15. Add chart annotations and markers

## Support & Documentation
- See existing API patterns in `/src/app/api/training/`
- See dashboard patterns in `/src/app/dashboard/page.tsx`
- Chart.js documentation: https://www.chartjs.org/
- React Chart.js 2 documentation: https://react-chartjs-2.js.org/

---

## Recent Updates

### January 29, 2026 - Enhanced with Interactive Charts
**Added Features:**
- ✅ ChartTypeSwitcher component for each chart
- ✅ DynamicChartRenderer for smart chart rendering
- ✅ 5 chart types available: Bar, Horizontal Bar, Line, Area, Pie
- ✅ Chart-specific available types (not all charts support all types)
- ✅ Data labels plugin integration for pie charts
- ✅ Smooth transitions between chart types
- ✅ Filler plugin for area charts
- ✅ State management for chart type preferences

**Benefits:**
- Users can visualize data in the format that makes most sense to them
- Better data exploration capabilities
- More interactive and engaging dashboard
- Professional-grade data visualization
- Similar to BI tools like Power BI, Tableau

---

**Implementation Date:** January 29, 2026
**Status:** Complete with Interactive Charts - Ready for Testing
**Local Changes Only:** Not pushed to GitHub
