# RIF-II MIS - Setup and Configuration Guide

## Project Overview
Regional Infrastructure Fund – II Management Information System for Khyber Pakhtunkhwa (RRMIC)

## Prerequisites
- Node.js 18+ 
- npm or yarn
- SQL Server database access
- Express.js for custom server

## Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env.local` file with the following variables:
   ```env
   MSSQL_CONNECTION="Data Source=95.217.203.20;Initial Catalog=_rifiiorg_db;Integrated Security=False;User ID=rifiiorg;Password=!l3GI!Or3Rm74w;Connect Timeout=60;Max Pool Size=300;Encrypt=false"
   NODE_ENV="development"
   PORT=3000
   ```

3. **Database Setup**
   Ensure the SQL Server database is accessible with the provided connection string.

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Custom Server (Express)
```bash
node server.js
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── dashboard/         # Dashboard Pages
│   ├── login/            # Authentication Pages
│   └── layout.tsx        # Root Layout
├── components/            # React Components
├── hooks/                # Custom React Hooks
└── lib/                  # Utility Libraries
    ├── auth.ts           # Authentication Helpers
    └── db.ts             # Database Connection
```

## Key Features

### Authentication System
- User login/logout
- Session management with cookies
- Role-based access control
- Middleware protection for dashboard routes

### Dashboard Modules
- **GIS Maps**: Interactive maps for Bannu and DI Khan districts
- **Tracking Sheet**: Activity tracking and progress monitoring
- **Pictures**: Image gallery with categorization
- **Documents**: Document management and upload
- **Reports**: Report generation and analytics
- **Links**: External link management

### API Endpoints
- `/api/auth/*` - Authentication endpoints
- `/api/pictures/*` - Picture management
- `/api/documents/*` - Document management
- `/api/tracking-sheet/*` - Activity tracking
- `/api/reports/*` - Report management
- `/api/user-*` - User management

## Database Schema

### Key Tables
- `tbl_user_access` - User authentication and permissions
- `tblPictures` - Picture metadata and categorization
- `tblReports` - Report information and file paths
- `Tracking_Sheet_Outputs` - Output definitions
- `View_Tracking_Sheet` - Tracking sheet data view

## Security Considerations

1. **Database Credentials**: Store sensitive database credentials in environment variables
2. **File Uploads**: Implement proper file validation and size limits
3. **Authentication**: Use secure cookie settings for production
4. **SQL Injection**: All queries use parameterized statements
5. **CORS**: Configure appropriate CORS settings for production

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify database server accessibility
   - Check connection string format
   - Ensure SQL Server authentication is enabled

2. **File Upload Issues**
   - Check file size limits
   - Verify upload directory permissions
   - Ensure proper file type validation

3. **Authentication Problems**
   - Clear browser cookies
   - Check middleware configuration
   - Verify user permissions in database

### Development Tips

1. **Hot Reload**: Use `npm run dev` for development with hot reload
2. **Database Queries**: Use SQL Server Management Studio for query testing
3. **API Testing**: Use browser dev tools or Postman for API testing
4. **Error Logging**: Check browser console and server logs for errors

## Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure secure database connection
- [ ] Set up proper file upload directories
- [ ] Configure reverse proxy (nginx/Apache)
- [ ] Set up SSL certificates
- [ ] Configure proper CORS settings
- [ ] Set up monitoring and logging

### Server Requirements
- Node.js 18+
- SQL Server 2016+
- Minimum 2GB RAM
- SSD storage for file uploads

## Support

For technical support or questions about the RIF-II MIS system, please contact the development team.

## License

This project is proprietary software developed for the Regional Infrastructure Fund – II project.
