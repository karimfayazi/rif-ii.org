# Deployment Summary for test.rif-ii.org

## ✅ Build Status
**Build Successful!** The application has been built and is ready for deployment.

## 📦 Files Created for Deployment

1. **next.config.js** - Next.js configuration for production
2. **server.js** - Node.js server file for Plesk
3. **web.config** - IIS configuration for Windows server
4. **.htaccess** - Apache configuration (backup)
5. **DEPLOYMENT.md** - Detailed deployment instructions
6. **deploy.ps1** - PowerShell script to prepare deployment package

## 🚀 Quick Deployment Steps

### 1. Upload Files to Server

**Via Plesk File Manager:**
1. Log into Plesk: https://test.rif-ii.org:8443
2. Go to **Files** → **File Manager**
3. Navigate to `httpdocs` directory
4. Upload the following:
   - `.next/` folder (entire folder)
   - `public/` folder (entire folder)
   - `package.json`
   - `package-lock.json`
   - `next.config.js`
   - `server.js`
   - `web.config`
   - `tsconfig.json`
   - `tailwind.config.js` (if exists)
   - `postcss.config.js` (if exists)

**OR use the deploy script:**
```powershell
.\deploy.ps1
```
Then upload contents of the `deploy` folder.

### 2. Configure Node.js in Plesk

1. In Plesk, go to **Domains** → **test.rif-ii.org**
2. Click **Node.js**
3. Enable Node.js
4. Configure:
   - **Node.js version: 18.x or higher**
   - **Application root:** `/httpdocs`
   - **Application startup file:** `server.js`
   - **Application URL:** `http://test.rif-ii.org`

### 3. Install Dependencies

**Via Plesk Terminal:**
1. Go to **Tools & Settings** → **SSH Terminal**
2. Navigate to: `cd httpdocs`
3. Run: `npm install --production`

### 4. Set Environment Variables (if needed)

In Plesk Node.js settings, add:
- `NODE_ENV=production`
- `PORT=3000` (or port assigned by Plesk)

### 5. Start Application

1. In Plesk Node.js settings, click **Restart App**
2. Check logs to ensure it's running
3. Visit: http://test.rif-ii.org

## 📋 Server Credentials

- **Domain:** test.rif-ii.org
- **Username:** rifiiorg
- **Password:** !l3GI!Or3Rm74w
- **Plesk URL:** https://test.rif-ii.org:8443

## 🔧 Database Configuration

The application is already configured to connect to:
- **Server:** 95.217.203.20
- **Database:** _rifiiorg_db
- **Credentials:** Already configured in `src/lib/db.ts`

## ⚠️ Important Notes

1. **Node.js Version:** Ensure Node.js 18+ is installed on the server
2. **Port:** Plesk will assign a port automatically - check Node.js settings
3. **Static Files:** The `public/` folder must be uploaded completely
4. **Build Output:** The `.next/` folder contains the production build

## 🐛 Troubleshooting

### Application won't start:
- Check Node.js version (must be 18+)
- Verify `server.js` exists in root
- Check application logs in Plesk
- Ensure all files are uploaded

### Database connection issues:
- Verify database server allows connections from hosting IP
- Check database credentials in `src/lib/db.ts`

### 404 errors:
- Ensure `.next/` folder is uploaded completely
- Check `web.config` is in root directory
- Verify rewrite rules in Plesk

## 📞 Support

If you encounter issues:
1. Check Plesk application logs
2. Verify all files are uploaded correctly
3. Ensure Node.js is properly configured
4. Check database connectivity

---

**Build completed successfully!** The application is ready for deployment.

