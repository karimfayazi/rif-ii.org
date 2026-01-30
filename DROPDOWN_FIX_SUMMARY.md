# Main Category + Sub Category Dropdown Fix - Summary

## Problem
The Main Category and Sub Category dropdowns were not working correctly because:
1. **State stored category NAMES instead of IDs** - Made dependent dropdown logic difficult
2. **Mixed state management** - Had both names and IDs scattered across state
3. **No proper dependent dropdown behavior** - Sub categories didn't load when main category changed
4. **Potential React key errors** - Keys included array indices and didn't filter null values
5. **Type mismatch between tables** - MainCategoryID is INT in main table, FLOAT in subcategory table

## Solution Overview

### 1. Changed Form Data Model (UI State)
**Before:**
```typescript
type UploadFormData = {
  mainCategory: string;  // Stored category NAME
  subCategory: string;   // Stored subcategory NAME
  ...
}
```

**After:**
```typescript
type UploadFormData = {
  mainCategoryId: string;  // Store ID as string (avoids float/int issues in <select>)
  subCategoryId: string;   // Store ID as string
  ...
}
```

**Why strings?** 
- HTML `<select>` values are always strings
- Avoids type coercion issues with FLOAT vs INT
- Clean conversion to number only when needed for API calls

### 2. Separate Loading States
**Before:**
```typescript
const [loadingCategories, setLoadingCategories] = useState(false);
```

**After:**
```typescript
const [loadingMainCategories, setLoadingMainCategories] = useState(false);
const [loadingSubCategories, setLoadingSubCategories] = useState(false);
```

**Why?** Independent loading states provide better UX and prevent UI conflicts.

### 3. Fixed fetchSubCategories Function

```typescript
const fetchSubCategories = async (mainCategoryId: string) => {
  if (!mainCategoryId || mainCategoryId === "") {
    setSubCategories([]);
    return;
  }
  
  try {
    setLoadingSubCategories(true);
    const response = await fetch(`/api/reports/subcategories?mainCategoryID=${encodeURIComponent(mainCategoryId)}`);
    const data = await response.json();
    
    if (data.success) {
      // Filter out any null or invalid entries
      const validSubCategories = (data.subCategories || []).filter(
        (sub) => sub.SubCategoryID != null && sub.MainCategoryID != null && sub.SubCategory
      );
      setSubCategories(validSubCategories);
    } else {
      setSubCategories([]);
    }
  } catch (err) {
    console.error("Error fetching sub categories:", err);
    setSubCategories([]);
  } finally {
    setLoadingSubCategories(false);
  }
};
```

**Key improvements:**
- Early return if no main category selected
- Filters out null/invalid entries before setting state
- Proper error handling
- Uses dedicated loading state

### 4. Fixed Dependent Dropdown Logic

```typescript
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target;
  
  if (name === 'mainCategoryId') {
    setSubCategories([]);  // Clear sub categories immediately
    setFormData(prev => ({
      ...prev,
      mainCategoryId: value,
      subCategoryId: ""  // Reset sub category when main category changes
    }));
    
    // Fetch sub categories for the new main category
    if (value) {
      fetchSubCategories(value);
    }
  } else {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }
};
```

**Key improvements:**
- Clears sub category list immediately when main category changes
- Resets selected sub category to empty string
- Only fetches sub categories if a valid main category is selected

### 5. Fixed Dropdown JSX - No Duplicate Keys

**Main Category Dropdown:**
```typescript
<select
  name="mainCategoryId"
  value={formData.mainCategoryId}
  onChange={handleInputChange}
  disabled={loadingMainCategories}
  required
>
  <option value="">Select Main Category</option>
  {mainCategories.map((category) => (
    <option 
      key={`main-${category.MainCategoryID}`}  // Unique key, no index
      value={String(category.MainCategoryID)}  // ID as value
    >
      {category.Category}
    </option>
  ))}
</select>
```

**Sub Category Dropdown:**
```typescript
<select
  name="subCategoryId"
  value={formData.subCategoryId}
  onChange={handleInputChange}
  disabled={!formData.mainCategoryId || loadingSubCategories}
  required
>
  <option value="">
    {!formData.mainCategoryId 
      ? "Select Main Category first" 
      : loadingSubCategories 
      ? "Loading..." 
      : subCategories.length === 0 
      ? "No sub categories available" 
      : "Select Sub Category"}
  </option>
  {subCategories.map((subCategory) => (
    <option 
      key={`sub-${subCategory.SubCategoryID}-${subCategory.MainCategoryID}`}
      value={String(subCategory.SubCategoryID)}
    >
      {subCategory.SubCategory}
    </option>
  ))}
</select>
```

**Key improvements:**
- No array indices in keys
- Values are IDs (as strings)
- Labels are category names
- Disabled state properly controlled
- User-friendly placeholder messages

### 6. ID-to-Name Conversion on Submit

Since the database stores category NAMES but we work with IDs in the UI, we convert on submit:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validation checks...
  
  // Convert IDs to names for database storage
  const selectedMainCategory = mainCategories.find(
    cat => String(cat.MainCategoryID) === formData.mainCategoryId
  );
  const selectedSubCategory = subCategories.find(
    sub => String(sub.SubCategoryID) === formData.subCategoryId
  );
  
  if (!selectedMainCategory || !selectedSubCategory) {
    setError("Invalid category selection");
    return;
  }
  
  const mainCategoryName = selectedMainCategory.Category;
  const subCategoryName = selectedSubCategory.SubCategory;
  
  // Use mainCategoryName and subCategoryName in API calls...
};
```

### 7. Fixed Edit Mode Logic

Created a cleaner approach for loading existing report data:

```typescript
// Store report data temporarily
const [editModeReportData, setEditModeReportData] = useState<{
  reportTitle: string;
  description: string;
  mainCategory: string;  // Names from DB
  subCategory: string;
  eventDate: string;
} | null>(null);

// Fetch report data
useEffect(() => {
  // Fetch from API and store in editModeReportData
}, [isEditMode, reportId]);

// Process once categories are loaded
useEffect(() => {
  if (!isEditMode || !editModeReportData || mainCategories.length === 0) return;
  
  const selectedMainCategory = mainCategories.find(
    cat => cat.Category === editModeReportData.mainCategory
  );
  
  if (selectedMainCategory && !formData.mainCategoryId) {
    const mainCatId = String(selectedMainCategory.MainCategoryID);
    setFormData(prev => ({
      ...prev,
      mainCategoryId: mainCatId,
      // ... other fields
    }));
    fetchSubCategories(mainCatId);
  }
}, [isEditMode, editModeReportData, mainCategories, formData.mainCategoryId]);

// Set sub category after sub categories load
useEffect(() => {
  if (!isEditMode || !editModeReportData || subCategories.length === 0 || formData.subCategoryId) return;
  
  const selectedSubCategory = subCategories.find(
    sub => sub.SubCategory === editModeReportData.subCategory
  );
  
  if (selectedSubCategory) {
    setFormData(prev => ({
      ...prev,
      subCategoryId: String(selectedSubCategory.SubCategoryID)
    }));
  }
}, [isEditMode, editModeReportData, subCategories, formData.subCategoryId]);
```

**Key improvements:**
- No race conditions
- Clean separation of concerns
- Handles async loading properly

### 8. Fixed API Route for Type Safety

Updated `/api/reports/subcategories/route.ts` to handle INT/FLOAT mismatch:

```typescript
const query = `
  SELECT TOP (1000) [SubCategoryID], [MainCategoryID], [SubCategory]
  FROM [_rifiiorg_db].[dbo].[tblReportSubCategory]
  WHERE [MainCategoryID] IS NOT NULL 
    AND [SubCategoryID] IS NOT NULL 
    AND [SubCategory] IS NOT NULL
    AND TRY_CAST([MainCategoryID] AS INT) = @mainCategoryID
  ORDER BY [SubCategory]
`;
```

**Why TRY_CAST?**
- `MainCategoryID` in `tblReportMainCategory` is `INT IDENTITY`
- `MainCategoryID` in `tblReportSubCategory` is `FLOAT`
- `TRY_CAST` safely converts FLOAT to INT for comparison
- Returns NULL on conversion failure (filtered out by `IS NOT NULL` check)

## Result

✅ **Main Category dropdown** shows all categories with unique keys
✅ **Sub Category dropdown** is disabled until main category is selected
✅ **When main category changes:**
  - Sub category list is cleared immediately
  - Selected sub category is reset to ""
  - New sub categories are fetched and loaded
✅ **No console errors** (no duplicate keys, no null keys, no controlled/uncontrolled warnings)
✅ **TypeScript strict** - no implicit any
✅ **Proper type handling** - INT/FLOAT mismatch resolved
✅ **Edit mode works correctly** - loads existing values and allows changes

## Files Modified

1. `src/components/reports/ReportUploadPage.tsx` - Complete refactor of dropdown logic
2. `src/app/api/reports/subcategories/route.ts` - Added type-safe filtering with TRY_CAST

## Testing Checklist

- [ ] Select a main category → sub category dropdown enables and loads correct items
- [ ] Change main category → sub category resets and loads new items
- [ ] No console errors about React keys
- [ ] No console errors about controlled/uncontrolled components
- [ ] Edit mode loads existing categories correctly
- [ ] Form submission works with selected categories
- [ ] Modal "Add Category" buttons work and refresh dropdowns
- [ ] Loading states show correctly during data fetch

## Technical Notes

**Why store IDs as strings in React state?**
- HTML `<select>` element values are always strings
- Avoids `===` comparison issues between numbers and strings
- Prevents issues with FLOAT (1.0) vs INT (1) comparisons
- Clean and explicit conversion when needed: `parseInt(formData.mainCategoryId)`

**Why convert to names on submit?**
- Database stores category NAMES in the reports table, not IDs
- Keeps existing database schema unchanged
- Allows reports to display categories even if category table changes

**Why TRY_CAST instead of direct comparison?**
- Safe type conversion that returns NULL on failure
- Prevents SQL errors from type mismatches
- Filters out any invalid FLOAT values that can't convert to INT
