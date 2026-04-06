# Deployment Instructions for test.rif-ii.org

## Prerequisites
- Node.js 18+ installed on the Plesk server
- FTP/SFTP access to the server
- Plesk control panel access

## Step 1: Build the Application Locally

1. Open terminal in the project directory
2. Run: `npm install`
3. Run: `npm run build`
4. This will create a `.next` folder with the production build

## Step 2: Prepare Files for Upload

### Files/Folders to Upload:
- `.next/` (entire folder)
- `public/` (entire folder)
- `node_modules/` (entire folder) OR install on server
- `package.json`
- `package-lock.json` (if exists)
- `next.config.js`
- `server.js`
- `web.config`
- `tsconfig.json` (if exists)
- `tailwind.config.js` (if exists)
- `postcss.config.js` (if exists)

### Files/Folders to EXCLUDE:
- `.git/`
- `src/` (source files - not needed for production)
- `node_modules/` (can be installed on server instead)
- `.env.local` (if exists - use Plesk environment variables instead)
- `scripts/` (if exists)

## Step 3: Upload to Server

### Option A: Using Plesk File Manager
1. Log into Plesk: https://test.rif-ii.org:8443
2. Navigate to Files → File Manager
3. Go to `httpdocs` or your domain's root directory
4. Upload all prepared files

### Option B: Using FTP/SFTP
1. Use FileZilla or similar FTP client
2. Connect to: test.rif-ii.org
3. Username: rifiiorg
4. Password: !l3GI!Or3Rm74w
5. Upload files to the `httpdocs` directory

## Step 4: Configure Node.js in Plesk

1. Log into Plesk
2. Go to **Domains** → **test.rif-ii.org**
3. Click **Node.js**
4. Enable Node.js
5. Set:
   - **Node.js version**: 18.x or higher
   - **Application root**: `/httpdocs` or your domain root
   - **Application startup file**: `server.js`
   - **Application URL**: `http://test.rif-ii.org`
6. Set Environment Variables (if needed):
   - `NODE_ENV=production`
   - `PORT=3000` (or port assigned by Plesk)
   - `MSSQL_CONNECTION` (if different from default)

## Step 5: Install Dependencies on Server

### Option A: Via Plesk Terminal
1. In Plesk, go to **Tools & Settings** → **SSH Terminal**
2. Navigate to your domain directory: `cd httpdocs`
3. Run: `npm install --production`

### Option B: Via SSH (if enabled)
```bash
ssh rifiiorg@test.rif-ii.org
cd httpdocs
npm install --production
```

## Step 6: Start the Application

1. In Plesk Node.js settings, click **Restart App**
2. Check the logs to ensure it's running
3. Visit: http://test.rif-ii.org

## Troubleshooting

### Application won't start:
- Check Node.js version (must be 18+)
- Verify `server.js` exists
- Check application logs in Plesk
- Ensure port is correctly configured

### Database connection issues:
- Verify database credentials in `src/lib/db.ts`
- Check if database server allows connections from hosting IP
- Test connection string

### Static files not loading:
- Ensure `public/` folder is uploaded
- Check file permissions (should be 755 for folders, 644 for files)
- Verify `next.config.js` has `images: { unoptimized: true }`

### 404 errors:
- Ensure `.next/` folder is uploaded completely
- Check `web.config` is in root directory
- Verify rewrite rules in Plesk

## Alternative: Standalone Build (Recommended for Plesk)

If the above doesn't work, use standalone build:

1. Update `next.config.js`:
```js
output: 'standalone'
```

2. Build: `npm run build`
3. Upload `.next/standalone/` folder contents
4. Upload `.next/static/` folder
5. Upload `public/` folder
6. Create `server.js` in root pointing to standalone build

## Environment Variables in Plesk

1. Go to **Node.js** settings
2. Add environment variables:
   - `NODE_ENV=production`
   - `PORT=3000` (or assigned port)
   - Any other required variables

## Notes

- The application uses SQL Server database at `95.217.203.20`
- Database credentials are in `src/lib/db.ts`
- For production, consider using environment variables for sensitive data
- Ensure Node.js module `iisnode` is installed if using IIS (Windows)

