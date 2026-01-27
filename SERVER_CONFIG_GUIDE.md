# Server Configuration Guide for File Upload Limits

## Issue: 413 Payload Too Large

When uploading files larger than the default server limits, you may encounter a **413 Payload Too Large** error. This guide provides configuration snippets for various web servers.

---

## Next.js Configuration

The application is already configured to handle files up to **20MB** per file in the API route. No additional Next.js configuration is needed.

**Current Settings:**
- Max file size: 20MB per file
- Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- API Route: `/api/reports/upload`

---

## NGINX Configuration

If you're using NGINX as a reverse proxy or web server, add these directives:

### Method 1: Global Configuration

Edit your `nginx.conf` file:

```nginx
http {
    # Set maximum allowed size of client request body
    client_max_body_size 50M;
    
    # Increase buffer sizes for large uploads
    client_body_buffer_size 128k;
    
    # Timeout settings for long uploads
    client_body_timeout 300s;
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    
    # ... rest of your config
}
```

### Method 2: Per-Server Block

Edit your site configuration file (e.g., `/etc/nginx/sites-available/your-site`):

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Set max upload size for this server only
    client_max_body_size 50M;
    client_body_buffer_size 128k;
    client_body_timeout 300s;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Upload timeouts
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

### Method 3: Specific Location (API Routes Only)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Normal limit for most routes
    client_max_body_size 2M;
    
    # Higher limit for upload API
    location /api/reports/upload {
        client_max_body_size 50M;
        client_body_buffer_size 128k;
        client_body_timeout 300s;
        
        proxy_pass http://localhost:3000;
        proxy_read_timeout 300s;
    }
    
    location / {
        proxy_pass http://localhost:3000;
    }
}
```

### Restart NGINX

After making changes:

```bash
# Test configuration
sudo nginx -t

# Reload NGINX
sudo systemctl reload nginx

# OR restart NGINX
sudo systemctl restart nginx
```

---

## IIS (Internet Information Services) Configuration

### Method 1: Web.config in Project Root

Create or edit `web.config` in your project root:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <security>
      <requestFiltering>
        <!-- Allow 50MB uploads (in bytes: 50 * 1024 * 1024 = 52428800) -->
        <requestLimits maxAllowedContentLength="52428800" />
      </requestFiltering>
    </security>
    
    <handlers>
      <add name="iisnode" path="server.js" verb="*" modules="iisnode" />
    </handlers>
    
    <rewrite>
      <rules>
        <rule name="NodeInspector" patternSyntax="ECMAScript" stopProcessing="true">
          <match url="^server.js\/debug[\/]?" />
        </rule>
        <rule name="StaticContent">
          <action type="Rewrite" url="public{REQUEST_URI}"/>
        </rule>
        <rule name="DynamicContent">
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True"/>
          </conditions>
          <action type="Rewrite" url="server.js"/>
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
  
  <system.web>
    <httpRuntime maxRequestLength="51200" executionTimeout="300" />
    <!-- maxRequestLength in KB: 50MB = 50 * 1024 = 51200 KB -->
  </system.web>
</configuration>
```

### Method 2: IIS Manager GUI

1. Open **IIS Manager**
2. Select your website
3. Double-click **Request Filtering**
4. In the Actions pane, click **Edit Feature Settings...**
5. Set **Maximum allowed content length (Bytes)**: `52428800` (50MB)
6. Click **OK**

### Method 3: ApplicationHost.config (Global)

Edit `C:\Windows\System32\inetsrv\config\applicationHost.config`:

```xml
<configuration>
  <system.webServer>
    <security>
      <requestFiltering>
        <requestLimits maxAllowedContentLength="52428800" />
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>
```

### Restart IIS

```powershell
# Restart IIS
iisreset

# OR restart specific app pool
Restart-WebAppPool -Name "YourAppPoolName"
```

---

## Apache Configuration

### Method 1: .htaccess

Create or edit `.htaccess` in your project root:

```apache
# Increase upload limit to 50MB
php_value upload_max_filesize 50M
php_value post_max_size 50M
php_value max_execution_time 300
php_value max_input_time 300

# If using mod_reqtimeout
RequestReadTimeout body=300
```

### Method 2: Apache Virtual Host Configuration

Edit your virtual host file:

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    
    # Proxy to Next.js
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Increase limits
    LimitRequestBody 52428800
    
    # Timeout settings
    ProxyTimeout 300
    Timeout 300
</VirtualHost>
```

### Restart Apache

```bash
# Test configuration
sudo apachectl configtest

# Restart Apache
sudo systemctl restart apache2  # Debian/Ubuntu
# OR
sudo systemctl restart httpd    # CentOS/RHEL
```

---

## Plesk Configuration

### Via Plesk Panel

1. Go to **Websites & Domains**
2. Select your domain
3. Click **Apache & nginx Settings**
4. Add to **Additional nginx directives**:

```nginx
client_max_body_size 50M;
client_body_buffer_size 128k;
client_body_timeout 300s;
```

5. Add to **Additional Apache directives**:

```apache
LimitRequestBody 52428800
```

6. Click **OK** and **Apply**

### Via Plesk CLI

```bash
# Set upload limit for specific domain
plesk bin domain -u example.com -nginx_directives "client_max_body_size 50M;"

# Restart services
plesk bin service --restart web
```

---

## Node.js Standalone (No Proxy)

If running Next.js directly without a reverse proxy, the application handles file size limits internally. The current limit is **20MB per file**.

To increase beyond 20MB, edit `src/app/api/reports/upload/route.ts`:

```typescript
const maxSize = 50 * 1024 * 1024; // 50MB (change from 20MB)
```

---

## Testing Upload Limits

### Test with cURL

```bash
# Test with a 25MB file
curl -X POST http://your-domain.com/api/reports/upload \
  -F "files=@large-file.pdf" \
  -F "reportTitle=Test Report" \
  -F "mainCategory=Test" \
  -F "subCategory=Test" \
  -F "eventDate=2026-01-26" \
  -F "uploadedBy=Admin"
```

### Expected Responses

**Success (Status 200):**
```json
{
  "success": true,
  "message": "Successfully uploaded 1 report(s)",
  "uploadedFiles": [...]
}
```

**File Too Large (Status 413):**
```json
{
  "success": false,
  "ok": false,
  "message": "File example.pdf is too large. Maximum file size is 20MB.",
  "fileSize": "25.50MB",
  "maxSize": "20MB"
}
```

**Server Limit Exceeded:**
```
HTTP 413 Payload Too Large
(HTML error page from NGINX/IIS/Apache)
```

---

## Troubleshooting

### Still Getting 413 Errors?

1. **Check all layers:**
   - Application limit: 20MB (in `route.ts`)
   - NGINX limit: `client_max_body_size`
   - IIS limit: `maxAllowedContentLength`
   - Apache limit: `LimitRequestBody`

2. **Verify changes applied:**
   ```bash
   # NGINX
   sudo nginx -t && sudo systemctl reload nginx
   
   # IIS
   iisreset
   
   # Apache
   sudo apachectl configtest && sudo systemctl restart apache2
   ```

3. **Check server logs:**
   - NGINX: `/var/log/nginx/error.log`
   - IIS: Event Viewer → Windows Logs → Application
   - Apache: `/var/log/apache2/error.log`

4. **Browser Developer Tools:**
   - Open Network tab
   - Attempt upload
   - Check response headers and status

### Common Issues

**Issue:** Still getting 413 after increasing NGINX limit  
**Solution:** Check if there's an upstream proxy (CloudFlare, Load Balancer) with its own limits

**Issue:** IIS returns 404 instead of 413  
**Solution:** Install URL Rewrite and iisnode modules

**Issue:** Changes not taking effect  
**Solution:** Restart the entire server (not just the web service)

---

## Security Considerations

1. **Don't set unlimited sizes:**
   - Disk space can fill up quickly
   - Can be used for DoS attacks

2. **Validate file types:**
   - Already implemented in the API
   - Only allow necessary formats

3. **Scan uploaded files:**
   - Consider adding antivirus scanning
   - Especially for user-uploaded content

4. **Rate limiting:**
   - Limit uploads per user/IP
   - Prevent abuse

---

## Summary

**Current Configuration:**
- ✅ Application: 20MB per file limit
- ✅ API returns proper JSON errors
- ✅ Client handles 413 errors gracefully

**Recommended Server Limits:**
- **NGINX:** `client_max_body_size 50M;`
- **IIS:** `maxAllowedContentLength="52428800"`
- **Apache:** `LimitRequestBody 52428800`

**Next Steps:**
1. Choose your web server configuration above
2. Apply the changes
3. Restart the web server
4. Test with a file < 20MB (should work)
5. Test with a file > 20MB (should get friendly error message)

---

**Last Updated:** January 26, 2026  
**Application Version:** Next.js 16.0.8
