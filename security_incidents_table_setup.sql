-- SQL Script to create security_incidents table
-- Run this script in your SQL Server database to create the table for security incident management

USE [_rifiiorg_db];
GO

-- Create table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[rifiiorg].[security_incidents]') AND type in (N'U'))
BEGIN
    CREATE TABLE [rifiiorg].[security_incidents] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [incident_title] NVARCHAR(255) NOT NULL,
        [category] NVARCHAR(255) NOT NULL,
        [location_district] NVARCHAR(150) NOT NULL,
        [location_province] NVARCHAR(150) NOT NULL,
        [incident_date_from] DATE NOT NULL,
        [incident_date_to] DATE NULL,
        [incident_summary] NVARCHAR(MAX) NOT NULL,
        [operational_impact] NVARCHAR(MAX) NOT NULL,
        [recommended_actions] NVARCHAR(MAX) NOT NULL,
        [date_reported] DATETIME DEFAULT GETDATE(),
        [reported_by] NVARCHAR(100) NULL,
        [Comment] NVARCHAR(MAX) NULL,
        [Reference #] NVARCHAR(150) NULL,
        [incident_image_1] NVARCHAR(MAX) NULL,
        [incident_image_2] NVARCHAR(MAX) NULL,
        [incident_image_3] NVARCHAR(MAX) NULL,
        [incident_youtube_link] NVARCHAR(500) NULL
    );
    
    PRINT 'Table security_incidents created successfully.';
END
ELSE
BEGIN
    PRINT 'Table security_incidents already exists.';
END
GO

