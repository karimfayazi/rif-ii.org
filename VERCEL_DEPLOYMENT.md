# Vercel Deployment Guide

This guide will help you deploy your Next.js application to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Your project code in a Git repository (GitHub, GitLab, or Bitbucket)
3. Access to your SQL Server database

## Step 1: Prepare Your Repository

Make sure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket).

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com
   - Sign in or create an account

2. **Import Your Project**
   - Click "Add New..." → "Project"
   - Import your Git repository
   - Select your repository from the list

3. **Configure Project Settings**
   - **Framework Preset**: Next.js (should be auto-detected)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

4. **Set Environment Variables**
   Click "Environment Variables" and add:
   ```
   MSSQL_CONNECTION=Data Source=95.217.203.20;Initial Catalog=_rifiiorg_db;Integrated Security=False;User ID=rifiiorg;Password=!l3GI!Or3Rm74w;Connect Timeout=60;Max Pool Size=300;Encrypt=false
   NODE_ENV=production
   ```
   
   **Important**: For production, consider using Vercel's environment variable encryption and set different values for Production, Preview, and Development environments.

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at `https://your-project-name.vercel.app`

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project or create new
   - Confirm settings
   - Deploy to production? (y/n)

4. **Set Environment Variables**
   ```bash
   vercel env add MSSQL_CONNECTION
   vercel env add NODE_ENV
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Step 3: Configure Custom Domain (Optional)

1. Go to your project settings in Vercel Dashboard
2. Navigate to "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## Important Notes

### Database Connection
- Ensure your SQL Server database allows connections from Vercel's IP addresses
- You may need to whitelist Vercel's IP ranges in your database firewall
- Consider using a connection pooler for better performance

### File Uploads
- Vercel has limitations on file uploads in serverless functions
- For large files, consider using:
  - Vercel Blob Storage
  - AWS S3
  - Cloudinary
  - Or another cloud storage service

### Serverless Functions
- Vercel uses serverless functions for API routes
- Each API route in `src/app/api/` becomes a serverless function
- Function execution time limit: 10 seconds (Hobby), 60 seconds (Pro)
- Maximum payload size: 4.5 MB

### Environment Variables
- Never commit sensitive data to Git
- Use Vercel's environment variables for all secrets
- Different environments (Production, Preview, Development) can have different values

## Troubleshooting

### Build Errors
- Check build logs in Vercel Dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility (Vercel uses Node.js 18.x by default)

### Database Connection Issues
- Verify database server allows external connections
- Check firewall rules
- Test connection string format
- Ensure database credentials are correct in environment variables

### API Route Errors
- Check function logs in Vercel Dashboard
- Verify API routes are in `src/app/api/` directory
- Ensure proper error handling in API routes

### Static Files Not Loading
- Verify `public/` folder is in the repository
- Check file paths are correct
- Ensure files are committed to Git

## Updating Your Deployment

### Automatic Deployments
- Every push to your main branch triggers a production deployment
- Pull requests get preview deployments automatically

### Manual Deployment
```bash
vercel --prod
```

## Monitoring

- View deployment logs in Vercel Dashboard
- Monitor function performance in Analytics
- Set up error tracking (consider Sentry integration)

## Support

- Vercel Documentation: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Vercel Support: https://vercel.com/support

