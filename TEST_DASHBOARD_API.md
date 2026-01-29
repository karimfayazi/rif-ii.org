# Testing Training-Workshops Dashboard API

## Step-by-Step Debugging Guide

### 1. Test the API Directly

Open your browser and navigate to:
```
http://192.168.100.28:3000/api/training-workshops/dashboard
```

**Expected Response:**
```json
{
  "success": true,
  "kpis": {
    "totalEvents": 123,
    "totalParticipants": 4567,
    ...
  },
  "charts": {
    "eventsOverTime": [...],
    "participantsOverTime": [...],
    ...
  }
}
```

**If you get an error:**
- Check the error message
- Look at browser console (F12) for details
- Check server logs

### 2. Check Browser Console

1. Open the dashboard page: http://192.168.100.28:3000/dashboard/training-workshops
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Look for:
   - "Fetching dashboard data with params: ..."
   - "Dashboard API response: ..."
   - "Charts data set: ..."
   - Any error messages in red

### 3. Check Network Tab

1. Open Developer Tools (F12)
2. Go to Network tab
3. Refresh the page
4. Look for:
   - `/api/training-workshops/dashboard` request
   - Check Status Code (should be 200)
   - Click on it and view Response tab
   - Check if data is being returned

### 4. Common Issues & Solutions

#### Issue: "Failed to fetch dashboard data"
**Solution:**
- API route might not be created
- Database connection issue
- SQL query error

**Fix:**
- Check if file exists: `src/app/api/training-workshops/dashboard/route.ts`
- Check server logs for SQL errors
- Verify database connection string

#### Issue: Charts section shows "No Chart Data Available"
**Solution:**
- API returned success but empty data arrays
- Filters might be too restrictive
- Database tables might be empty

**Fix:**
- Click "Clear Filters" button
- Check if database has data:
  ```sql
  SELECT COUNT(*) FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
  SELECT COUNT(*) FROM [_rifiiorg_db].[dbo].[workshop_participants]
  ```

#### Issue: Charts show but are blank
**Solution:**
- Data format issue
- Chart.js not loading properly

**Fix:**
- Check console for Chart.js errors
- Verify data structure in API response

#### Issue: Some charts work, others don't
**Solution:**
- Specific chart data is empty
- Chart configuration issue

**Fix:**
- Check which charts work and which don't
- Look at console logs for specific chart errors

### 5. Quick Fixes

#### Fix 1: Restart Development Server
```bash
# Kill the current server (Ctrl+C)
# Then restart:
npm run dev
```

#### Fix 2: Clear Browser Cache
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or clear cache in browser settings

#### Fix 3: Check Database Connection
Test with a simple API:
```
http://192.168.100.28:3000/api/training/dashboard
```
If this works but training-workshops doesn't, the issue is with the new API.

### 6. Manual Test Queries

Run these directly in SQL Server Management Studio:

```sql
-- Test 1: Check if TrainingEvents table has data
SELECT TOP 10 * FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]

-- Test 2: Check if participants table has data  
SELECT TOP 10 * FROM [_rifiiorg_db].[dbo].[workshop_participants]

-- Test 3: Test the KPI query
SELECT 
    COUNT(*) AS totalEvents,
    ISNULL(SUM([TotalParticipants]), 0) AS totalParticipants,
    ISNULL(SUM([TotalMale]), 0) AS totalMale,
    ISNULL(SUM([TotalFemale]), 0) AS totalFemale
FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]

-- Test 4: Test events over time query
SELECT 
    FORMAT([StartDate], 'yyyy-MM') AS month,
    COUNT(*) AS eventCount
FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]
GROUP BY FORMAT([StartDate], 'yyyy-MM')
ORDER BY month
```

### 7. Verify File Structure

Check these files exist:
```
✅ src/app/api/training-workshops/dashboard/route.ts
✅ src/app/api/training-workshops/events/route.ts
✅ src/app/api/training-workshops/filters/route.ts
✅ src/app/api/training-workshops/event-participants/route.ts
✅ src/app/dashboard/training-workshops/page.tsx
```

### 8. Check for TypeScript Errors

Run in terminal:
```bash
npm run build
```

Look for any compilation errors.

### 9. Enable Debug Mode

The page now has console.log statements. Check console for:
```
Fetching dashboard data with params: ...
Dashboard API response: { success: true, kpis: {...}, charts: {...} }
Charts data set: { eventsOverTime: [...], ... }
```

### 10. Test with Minimal Filters

Try accessing the page with NO filters applied:
```
http://192.168.100.28:3000/dashboard/training-workshops
```

Then try adding filters one by one to see which causes issues.

---

## Quick Checklist

- [ ] API endpoint accessible directly in browser
- [ ] Returns `{"success": true}`
- [ ] Returns kpis object with numbers
- [ ] Returns charts object with arrays
- [ ] Browser console shows "Dashboard API response"
- [ ] Browser console shows "Charts data set"
- [ ] No red errors in console
- [ ] Network tab shows 200 status
- [ ] Database tables have data
- [ ] Development server is running
- [ ] No TypeScript compilation errors

---

## Contact for Help

If none of these solutions work:
1. Share the exact error message from console
2. Share the API response from direct URL access
3. Share any server log errors
4. Share database table row counts

---

**Most Common Fix:** 
Just refresh the page with Ctrl+Shift+R and clear all filters!
