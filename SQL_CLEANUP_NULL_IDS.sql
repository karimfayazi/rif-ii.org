-- ============================================
-- Data Cleanup Script
-- Remove NULL ID records from Picture Categories
-- ============================================

USE [_rifiiorg_db];
GO

PRINT '========================================';
PRINT 'Picture Category Data Cleanup';
PRINT '========================================';
PRINT 'This script will delete records with NULL IDs';
PRINT '';

-- Show what will be deleted
PRINT '--- Records to be DELETED from tblPictureMainCategory ---';
SELECT * FROM [dbo].[tblPictureMainCategory] WHERE [MainCategoryID] IS NULL;

PRINT '';
PRINT '--- Records to be DELETED from tblPictureSubCategory ---';
SELECT * FROM [dbo].[tblPictureSubCategory] WHERE [SubCategoryID] IS NULL;

PRINT '';
PRINT '========================================';
PRINT 'STARTING CLEANUP...';
PRINT '========================================';

BEGIN TRANSACTION;

BEGIN TRY
    -- Count before
    DECLARE @MainNullCountBefore INT, @SubNullCountBefore INT;
    SELECT @MainNullCountBefore = COUNT(*) FROM [dbo].[tblPictureMainCategory] WHERE [MainCategoryID] IS NULL;
    SELECT @SubNullCountBefore = COUNT(*) FROM [dbo].[tblPictureSubCategory] WHERE [SubCategoryID] IS NULL;
    
    PRINT 'Before: Main Category NULL records = ' + CAST(@MainNullCountBefore AS VARCHAR);
    PRINT 'Before: Sub Category NULL records = ' + CAST(@SubNullCountBefore AS VARCHAR);
    PRINT '';
    
    -- Delete NULL subcategories first (to avoid FK issues)
    DELETE FROM [dbo].[tblPictureSubCategory] 
    WHERE [SubCategoryID] IS NULL;
    
    DECLARE @SubDeleted INT = @@ROWCOUNT;
    PRINT 'Deleted ' + CAST(@SubDeleted AS VARCHAR) + ' records from tblPictureSubCategory';
    
    -- Delete NULL main categories
    DELETE FROM [dbo].[tblPictureMainCategory] 
    WHERE [MainCategoryID] IS NULL;
    
    DECLARE @MainDeleted INT = @@ROWCOUNT;
    PRINT 'Deleted ' + CAST(@MainDeleted AS VARCHAR) + ' records from tblPictureMainCategory';
    
    -- Verify cleanup
    DECLARE @MainNullCountAfter INT, @SubNullCountAfter INT;
    SELECT @MainNullCountAfter = COUNT(*) FROM [dbo].[tblPictureMainCategory] WHERE [MainCategoryID] IS NULL;
    SELECT @SubNullCountAfter = COUNT(*) FROM [dbo].[tblPictureSubCategory] WHERE [SubCategoryID] IS NULL;
    
    PRINT '';
    PRINT 'After: Main Category NULL records = ' + CAST(@MainNullCountAfter AS VARCHAR);
    PRINT 'After: Sub Category NULL records = ' + CAST(@SubNullCountAfter AS VARCHAR);
    
    IF @MainNullCountAfter = 0 AND @SubNullCountAfter = 0
    BEGIN
        PRINT '';
        PRINT '✓ Cleanup successful! Committing transaction...';
        COMMIT TRANSACTION;
        PRINT '✓ Transaction committed';
    END
    ELSE
    BEGIN
        PRINT '';
        PRINT '✗ WARNING: Still have NULL records! Rolling back...';
        ROLLBACK TRANSACTION;
        PRINT '✗ Transaction rolled back';
    END
END TRY
BEGIN CATCH
    PRINT '';
    PRINT '✗ ERROR occurred during cleanup:';
    PRINT ERROR_MESSAGE();
    PRINT 'Rolling back transaction...';
    ROLLBACK TRANSACTION;
    PRINT '✗ Transaction rolled back';
END CATCH;

PRINT '';
PRINT '========================================';
PRINT 'Cleanup script completed';
PRINT '========================================';

-- Show final state
PRINT '';
PRINT '--- Final: tblPictureMainCategory (valid records) ---';
SELECT * FROM [dbo].[tblPictureMainCategory] ORDER BY [MainCategoryID];

PRINT '';
PRINT '--- Final: tblPictureSubCategory (valid records) ---';
SELECT * FROM [dbo].[tblPictureSubCategory] ORDER BY [MainCategoryID], [SubCategoryID];

GO
