# Dropdown Testing Guide

## Page URL
https://rif-ii-org.vercel.app/dashboard/reports/upload

## Test Scenarios

### Scenario 1: Fresh Form Load
**Steps:**
1. Navigate to upload page
2. Observe dropdowns

**Expected:**
- Main Category dropdown is enabled
- Sub Category dropdown is disabled
- Sub Category shows "Select Main Category first"
- No console errors

### Scenario 2: Select Main Category
**Steps:**
1. Click Main Category dropdown
2. Select any category (e.g., "Training")
3. Observe Sub Category dropdown

**Expected:**
- Sub Category dropdown shows "Loading..." briefly
- Sub Category dropdown becomes enabled
- Sub Category shows relevant items for selected main category
- Placeholder changes to "Select Sub Category"
- No console errors

### Scenario 3: Change Main Category
**Steps:**
1. Select Main Category "Training"
2. Select a Sub Category
3. Change Main Category to "Reports"
4. Observe Sub Category dropdown

**Expected:**
- Sub Category selection is cleared (shows placeholder)
- Sub Category shows "Loading..." briefly
- Sub Category loads new items for "Reports"
- Previously selected sub category from "Training" is NOT in the list
- No console errors

### Scenario 4: Inspect React Keys (Developer Console)
**Steps:**
1. Open browser DevTools → Console
2. Select a Main Category
3. Observe Sub Category options load
4. Check for warnings

**Expected:**
- No warnings about "duplicate keys"
- No warnings about "null keys"
- No warnings about "controlled/uncontrolled" components

### Scenario 5: Form Submission
**Steps:**
1. Fill all required fields
2. Select Main Category
3. Select Sub Category
4. Upload a file
5. Submit form

**Expected:**
- Form submits successfully
- Report is created with correct category names
- No console errors

### Scenario 6: Edit Mode
**Steps:**
1. Navigate to existing report edit page
2. Observe dropdowns

**Expected:**
- Main Category dropdown shows correct selected value
- Sub Category dropdown is enabled
- Sub Category shows correct selected value
- Correct sub categories loaded for the main category
- No console errors

### Scenario 7: Edit Mode - Change Category
**Steps:**
1. In edit mode with existing report
2. Change Main Category
3. Observe Sub Category

**Expected:**
- Sub Category resets and loads new options
- Can select new sub category
- Form saves with updated categories
- No console errors

### Scenario 8: Modal Add Category
**Steps:**
1. Click "+" button next to Main Category
2. Add a new category
3. Close modal

**Expected:**
- New category appears in dropdown
- Dropdown still works correctly
- No console errors

### Scenario 9: Modal Add Sub Category
**Steps:**
1. Select a Main Category
2. Click "+" button next to Sub Category
3. Add a new sub category
4. Close modal

**Expected:**
- New sub category appears in dropdown
- Dropdown still works correctly
- No console errors

### Scenario 10: No Sub Categories Available
**Steps:**
1. Select a Main Category that has NO sub categories

**Expected:**
- Sub Category dropdown is disabled
- Shows "No sub categories available"
- No console errors

## Console Error Checks

Open DevTools Console and watch for these specific errors (should NOT appear):

❌ **Should NOT see:**
- "Warning: Each child in a list should have a unique 'key' prop"
- "Warning: Encountered two children with the same key"
- "Warning: A component is changing an uncontrolled input to be controlled"
- "Warning: A component is changing a controlled input to be uncontrolled"
- "TypeError: Cannot read property 'X' of null"
- "TypeError: Cannot read property 'X' of undefined"

✅ **Should see:**
- Clean console (or only expected debug logs)

## Network Tab Checks

Open DevTools Network tab:

1. **When selecting Main Category:**
   - Should see: `GET /api/reports/subcategories?mainCategoryID=X`
   - Should respond with: `{ success: true, subCategories: [...] }`
   - No 500 errors

2. **When submitting form:**
   - Should see: `POST /api/reports/save-metadata` (create) or `PUT /api/reports/X` (edit)
   - Should send category NAMES (not IDs) in request body
   - Should respond with success

## Database Verification

After submitting a report, verify in the database:

```sql
SELECT TOP 10 
  ReportTitle,
  MainCategory,
  SubCategory
FROM [_rifiiorg_db].[rifiiorg].[tblReports]
ORDER BY CreatedDate DESC;
```

**Expected:**
- MainCategory column contains category NAME (e.g., "Training")
- SubCategory column contains sub category NAME (e.g., "Workshop")
- NOT IDs

## Browser Compatibility

Test in:
- Chrome/Edge (Chromium)
- Firefox
- Safari (if available)

All should work identically.

## Performance Notes

- Sub category fetch should be fast (<500ms)
- No visible UI lag when changing main category
- Dropdown should show "Loading..." state briefly, then options

## Accessibility Notes

- Keyboard navigation should work (Tab, Arrow keys)
- Screen readers should announce options correctly
- Disabled state should be visually clear
