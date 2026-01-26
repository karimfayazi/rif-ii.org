-- ============================================
-- SQL Server Schema Verification & Cleanup
-- For tblPictureMainCategory and tblPictureSubCategory
-- ============================================

USE [_rifiiorg_db];
GO

PRINT '========================================';
PRINT 'STEP 1: Schema Verification';
PRINT '========================================';

-- Check Main Category Table Schema
PRINT '';
PRINT '--- tblPictureMainCategory Schema ---';
EXEC sp_help 'dbo.tblPictureMainCategory';

PRINT '';
PRINT '--- tblPictureSubCategory Schema ---';
EXEC sp_help 'dbo.tblPictureSubCategory';

PRINT '';
PRINT '========================================';
PRINT 'STEP 2: Check Identity Columns';
PRINT '========================================';

-- Check if MainCategoryID is IDENTITY
SELECT 
    TABLE_NAME = 'tblPictureMainCategory',
    COLUMN_NAME = c.name,
    DATA_TYPE = t.name,
    IS_NULLABLE = c.is_nullable,
    IS_IDENTITY = c.is_identity,
    IDENTITY_SEED = ISNULL(CAST(ic.seed_value AS VARCHAR), 'N/A'),
    IDENTITY_INCREMENT = ISNULL(CAST(ic.increment_value AS VARCHAR), 'N/A')
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
LEFT JOIN sys.identity_columns ic ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE c.object_id = OBJECT_ID('dbo.tblPictureMainCategory')
AND c.name = 'MainCategoryID';

-- Check if SubCategoryID is IDENTITY
SELECT 
    TABLE_NAME = 'tblPictureSubCategory',
    COLUMN_NAME = c.name,
    DATA_TYPE = t.name,
    IS_NULLABLE = c.is_nullable,
    IS_IDENTITY = c.is_identity,
    IDENTITY_SEED = ISNULL(CAST(ic.seed_value AS VARCHAR), 'N/A'),
    IDENTITY_INCREMENT = ISNULL(CAST(ic.increment_value AS VARCHAR), 'N/A')
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
LEFT JOIN sys.identity_columns ic ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE c.object_id = OBJECT_ID('dbo.tblPictureSubCategory')
AND c.name = 'SubCategoryID';

PRINT '';
PRINT '========================================';
PRINT 'STEP 3: Check for NULL ID Records';
PRINT '========================================';

-- Count NULL records in Main Category
DECLARE @MainNullCount INT;
SELECT @MainNullCount = COUNT(*) 
FROM [dbo].[tblPictureMainCategory] 
WHERE [MainCategoryID] IS NULL;

PRINT 'Main Category NULL records: ' + CAST(@MainNullCount AS VARCHAR);

-- Show NULL records in Main Category
IF @MainNullCount > 0
BEGIN
    PRINT '';
    PRINT '--- Main Category NULL Records ---';
    SELECT * FROM [dbo].[tblPictureMainCategory] WHERE [MainCategoryID] IS NULL;
END

-- Count NULL records in Sub Category
DECLARE @SubNullCount INT;
SELECT @SubNullCount = COUNT(*) 
FROM [dbo].[tblPictureSubCategory] 
WHERE [SubCategoryID] IS NULL;

PRINT '';
PRINT 'Sub Category NULL records: ' + CAST(@SubNullCount AS VARCHAR);

-- Show NULL records in Sub Category
IF @SubNullCount > 0
BEGIN
    PRINT '';
    PRINT '--- Sub Category NULL Records ---';
    SELECT * FROM [dbo].[tblPictureSubCategory] WHERE [SubCategoryID] IS NULL;
END

PRINT '';
PRINT '========================================';
PRINT 'STEP 4: Data Cleanup (Review First!)';
PRINT '========================================';
PRINT 'IMPORTANT: Review the NULL records above before running cleanup!';
PRINT '';
PRINT '-- To delete NULL records, uncomment and run:';
PRINT '/*';
PRINT 'DELETE FROM [dbo].[tblPictureSubCategory] WHERE [SubCategoryID] IS NULL;';
PRINT 'DELETE FROM [dbo].[tblPictureMainCategory] WHERE [MainCategoryID] IS NULL;';
PRINT 'PRINT ''Cleanup completed'';';
PRINT '*/';

PRINT '';
PRINT '========================================';
PRINT 'STEP 5: Schema Fix (If Needed)';
PRINT '========================================';
PRINT 'If IS_IDENTITY = 0 above, the columns are NOT identity columns!';
PRINT 'You need to recreate the tables with proper IDENTITY columns.';
PRINT '';
PRINT '-- ONLY run this if identity is missing:';
PRINT '/*';
PRINT 'ALTER TABLE [dbo].[tblPictureMainCategory]';
PRINT 'DROP CONSTRAINT IF EXISTS PK_tblPictureMainCategory;';
PRINT '';
PRINT 'ALTER TABLE [dbo].[tblPictureMainCategory]';
PRINT 'ADD CONSTRAINT PK_tblPictureMainCategory PRIMARY KEY (MainCategoryID);';
PRINT '';
PRINT '-- If MainCategoryID is not IDENTITY, you need to:';
PRINT '-- 1. Create a new table with IDENTITY';
PRINT '-- 2. Copy data (filtering out NULLs)';
PRINT '-- 3. Drop old table';
PRINT '-- 4. Rename new table';
PRINT '*/';

GO
