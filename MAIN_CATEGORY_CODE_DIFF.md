# Main Category Insert - Code Diff

## File 1: src/app/api/reports/categories/route.ts

### Change 1: Add SQL Import

```diff
  import { NextRequest, NextResponse } from "next/server";
  import { getDb } from "@/lib/db";
+ import sql from "mssql";
```

### Change 2: Add SQL Parameter Types & Enhanced Logging

```diff
  const pool = await getDb();
  const transaction = pool.transaction();
  
  try {
    await transaction.begin();
    
    // Check for duplicate (case-insensitive)
    const checkQuery = `
-     SELECT 1 AS exists
+     SELECT 1 AS [exists]
      FROM [_rifiiorg_db].[rifiiorg].[tblReportMainCategory]
      WHERE LOWER(LTRIM(RTRIM([Category]))) = LOWER(LTRIM(RTRIM(@category)))
    `;
    
    const checkResult = await transaction.request()
-     .input('category', trimmedCategory)
+     .input('category', sql.VarChar(100), trimmedCategory)
      .query(checkQuery);
    
    if (checkResult.recordset.length > 0) {
      await transaction.rollback();
      return NextResponse.json({
        success: false,
        message: "Category already exists"
-     }, { status: 400 });
+     }, { status: 409 });
    }
    
    // Insert with auto-generated ID (IDENTITY column handles this)
    const insertQuery = `
      INSERT INTO [_rifiiorg_db].[rifiiorg].[tblReportMainCategory] ([Category])
-     OUTPUT INSERTED.[MainCategoryID], INSERTED.[Category]
+     OUTPUT INSERTED.[MainCategoryID] AS mainCategoryId, INSERTED.[Category] AS category
      VALUES (@category);
    `;
    
    const result = await transaction.request()
-     .input('category', trimmedCategory)
+     .input('category', sql.VarChar(100), trimmedCategory)
      .query(insertQuery);
    
    await transaction.commit();
    
    const newCategory = result.recordset[0];
    
-   if (!newCategory || !newCategory.MainCategoryID) {
+   if (!newCategory || !newCategory.mainCategoryId) {
      throw new Error('Failed to create category - no ID returned');
    }
    
    return NextResponse.json({
      success: true,
      message: "Category created successfully",
-     category: {
-       MainCategoryID: newCategory.MainCategoryID,
-       Category: newCategory.Category
+     data: {
+       mainCategoryId: newCategory.mainCategoryId,
+       category: newCategory.category
      }
-   });
+   }, { status: 201 });
    
  } catch (txError) {
    await transaction.rollback();
+   
+   // Log detailed SQL error information
+   console.error('Transaction error creating main category:', {
+     error: txError,
+     message: txError instanceof Error ? txError.message : 'Unknown error',
+     code: (txError as any)?.code,
+     number: (txError as any)?.number,
+     state: (txError as any)?.state,
+     class: (txError as any)?.class,
+     lineNumber: (txError as any)?.lineNumber,
+     serverName: (txError as any)?.serverName,
+     procName: (txError as any)?.procName
+   });
+   
    throw txError;
  }
  
} catch (error) {
- console.error("Error creating report main category:", error);
+ console.error("Error creating report main category:", {
+   error,
+   message: error instanceof Error ? error.message : "Unknown error",
+   stack: error instanceof Error ? error.stack : undefined,
+   code: (error as any)?.code,
+   number: (error as any)?.number,
+   name: error instanceof Error ? error.name : undefined
+ });
+ 
+ // Provide more specific error message
+ let errorMessage = "Failed to create main category";
+ if (error instanceof Error) {
+   // Check for specific SQL errors
+   if (error.message.includes('IDENTITY_INSERT')) {
+     errorMessage = "Database configuration error: Cannot insert explicit ID";
+   } else if (error.message.includes('duplicate') || error.message.includes('unique')) {
+     errorMessage = "Category already exists";
+   } else if (error.message.includes('permission') || error.message.includes('denied')) {
+     errorMessage = "Database permission error";
+   } else if (error.message.includes('timeout')) {
+     errorMessage = "Database connection timeout";
+   } else {
+     errorMessage = `Failed to create main category: ${error.message}`;
+   }
+ }
+ 
  return NextResponse.json(
    {
      success: false,
-     message: "Failed to create main category",
+     message: errorMessage,
      error: error instanceof Error ? error.message : "Unknown error"
    },
    { status: 500 }
  );
}
```

## File 2: src/components/ReportMainCategoryModal.tsx

### Change: Enhanced Error Handling & Response Parsing

```diff
  const handleAddCategory = async () => {
    const trimmedCategory = newCategory.trim();
    
    if (!trimmedCategory) {
      setError("Category name is required");
      return;
    }

    if (trimmedCategory.length > 100) {
      setError("Category name cannot exceed 100 characters");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/reports/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category: trimmedCategory }),
      });

-     const data = await response.json();
+     // Parse JSON response
+     let data;
+     try {
+       data = await response.json();
+     } catch (parseError) {
+       const responseText = await response.text();
+       console.error("Failed to parse API response:", {
+         status: response.status,
+         statusText: response.statusText,
+         responseText,
+         parseError
+       });
+       setError("Server returned invalid response. Please check console for details.");
+       return;
+     }
      
-     if (data.success && data.category) {
+     // Handle successful response
+     if (response.ok && data.success && data.data) {
        // Add new category to the list
        const newCategoryObj: Category = {
-         MainCategoryID: data.category.MainCategoryID,
-         Category: data.category.Category
+         MainCategoryID: data.data.mainCategoryId,
+         Category: data.data.category
        };
        
        setCategories(prev => [...prev, newCategoryObj].sort((a, b) => 
          a.Category.localeCompare(b.Category)
        ));
        
        setNewCategory("");
        setSuccess("Category added successfully");
        setTimeout(() => setSuccess(null), 3000);
        
        // Notify parent component to refresh
        if (onCategoryChange) {
          onCategoryChange();
        }
        
        // Auto-select the newly created category if callback provided
        if (onCategorySelect) {
-         onCategorySelect(data.category.Category);
+         onCategorySelect(data.data.category);
          // Close modal after a short delay to show success message
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      } else {
-       setError(data.message || "Failed to add category");
+       // Show specific error message from API
+       const errorMsg = data.message || data.error || "Failed to add category";
+       setError(errorMsg);
+       console.error("API error creating category:", {
+         status: response.status,
+         data,
+         category: trimmedCategory
+       });
      }
    } catch (err) {
-     setError("Error adding category. Please try again.");
-     console.error("Error adding category:", err);
+     console.error("Error adding category:", {
+       error: err,
+       message: err instanceof Error ? err.message : "Unknown error",
+       category: trimmedCategory
+     });
+     setError("Error adding category. Please check console for details.");
    } finally {
      setLoading(false);
    }
  };
```

## Summary of Changes

### API Route (`route.ts`)
| Change | Reason |
|--------|--------|
| Added `sql` import | Enable proper SQL type definitions |
| Used `sql.VarChar(100)` | Match database column type exactly |
| Changed status 400→409 | Proper REST convention for duplicates |
| Changed status 200→201 | Proper REST convention for created resources |
| Added detailed error logging | Debug SQL errors with error codes, states, line numbers |
| Added specific error messages | Users see actionable errors, not generic failures |
| Changed response format | Consistent camelCase naming (`mainCategoryId`) |

### Modal Component (`ReportMainCategoryModal.tsx`)
| Change | Reason |
|--------|--------|
| Added JSON parse error handling | Catch and log invalid server responses |
| Check `response.ok` | Verify HTTP status before processing |
| Updated response path | Use `data.data.mainCategoryId` instead of `data.category.MainCategoryID` |
| Show specific API errors | Display actual error message from server |
| Enhanced console logging | Include status, data, and context for debugging |

## Impact on Error Messages

### Before Fix
```
User sees: "Failed to create main category"
Console: Error object (minimal info)
Server logs: Generic error message
```

### After Fix
```
User sees:
  - "Category already exists" (duplicate)
  - "Category name is required" (validation)
  - "Database permission error" (SQL permission issue)
  - "Failed to create main category: [specific SQL error]" (other errors)

Console:
  {
    status: 409,
    data: { success: false, message: "Category already exists" },
    category: "Test Category"
  }

Server logs:
  {
    error: Error,
    message: "...",
    code: "EREQUEST",
    number: 2627,  // SQL error number
    state: 1,      // SQL error state
    class: 14,     // SQL error severity
    lineNumber: 5  // SQL line number
  }
```

## Testing Verification

Run these tests to verify the fix:

```bash
# 1. Start dev server
npm run dev

# 2. Navigate to
http://localhost:3000/dashboard/reports/upload

# 3. Open DevTools Console & Network tab

# 4. Test scenarios:
- Add valid category → Should succeed with 201 status
- Add duplicate → Should show "Category already exists" with 409 status
- Add empty string → Should show validation error
- Add 101 chars → Should show length validation error
```

All error messages should be specific and actionable!
