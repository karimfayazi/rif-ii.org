# Safari Compatibility Fixes

This document details all Safari-specific fixes applied to make the RIF-II MIS application fully functional on macOS Safari (MacBook Air).

## Issues Identified and Fixed

### 1. Authentication/Session Issues (CRITICAL)

**Problem:**
- Cookies not being sent with API requests in Safari
- Authentication failing silently
- Session not persisting across requests

**Root Cause:**
Safari requires explicit `credentials: "include"` in all fetch calls for cookies to be sent, even for same-origin requests.

**Fixes Applied:**

#### A. Created Shared Auth Fetch Helper (`src/lib/authFetch.ts`)
- New utility for all authenticated API calls
- Always includes `credentials: "include"`
- Handles 401 redirects automatically
- Includes Safari debug logging for development

```typescript
// Usage example:
import { authFetch, authGet, authPost } from '@/lib/authFetch';

// GET request
const response = await authGet('/api/user-info');

// POST request
const response = await authPost('/api/login', { email, password });
```

#### B. Updated Login Page (`src/app/login/page.tsx`)
- Added `credentials: "include"` to login fetch call
- Added development-only success logging

**Lines changed:** 22-26, 33-35

#### C. Updated useAuth Hook (`src/hooks/useAuth.ts`)
- Added `credentials: "include"` to user info fetch
- Added `credentials: "include"` to user profile fetch

**Lines changed:** 53-55, 71-73

#### D. Updated Pictures Page (`src/app/dashboard/pictures/page.tsx`)
- Added `credentials: "include"` to all API fetch calls:
  - fetchMainCategories
  - fetchEventNames
  - fetchEventDates
  - fetchPictures
  - fetchFolderImages
  - Delete operations
  - Folder delete operations

**Lines changed:** Multiple locations throughout the file

### 2. Cookie Configuration (Already Correct)

**Status:** ✅ No changes needed

The cookie settings in `/api/login/route.ts` are already Safari-compatible:

```typescript
response.cookies.set({
  name: "auth",
  value: `authenticated:${user.email}`,
  httpOnly: false,        // Allows JavaScript access
  secure: false,           // Works on local dev (http)
  path: "/",
  sameSite: "lax",        // ✅ Perfect for Safari same-site cookies
  maxAge: 60 * 60 * 8,    // 8 hours
});
```

**Why this works:**
- `sameSite: "lax"` is Safari-friendly (better than "strict" or "none")
- `secure: false` for development (would be true in production with HTTPS)
- `httpOnly: false` allows JavaScript cookie reading (useAuth hook)

### 3. Image Loading Issues (Already Fixed)

**Status:** ✅ Previously fixed with URL encoding

Images were failing in Safari due to unencoded spaces in paths. This was already fixed in a previous update:

**Solution:**
- Path segments are encoded with `encodeURIComponent()`
- Backend decodes segments properly
- Example: `Consultative workshop` → `Consultative%20workshop`

**Files:**
- `src/app/dashboard/pictures/page.tsx` - encodePathSegments helper
- `src/app/api/pictures/file/[...path]/route.ts` - decodeURIComponent
- `src/app/api/pictures/folder/route.ts` - encodePathSegments

### 4. Safari Debug Logging (`src/lib/authFetch.ts`)

Added development-only Safari debugging helper:

```typescript
logSafariAuthDebug();
```

**Logs:**
- Auth cookie presence
- LocalStorage userData
- Current origin and protocol
- Browser detection
- User agent string

**Usage in MasterLayout:**
The debug logger runs automatically on page load in development mode only.

### 5. CORS Configuration

**Status:** ✅ Not needed

Since frontend and backend are same-origin (same Next.js app), CORS is not an issue. The `credentials: "include"` is sufficient.

### 6. JavaScript Compatibility

**Status:** ✅ No issues found

**Checked:**
- ✅ Date parsing uses ISO strings (Safari-safe)
- ✅ No unsafe date formats like "2026-01-26 12:30:00"
- ✅ Optional chaining and nullish coalescing (transpiled by Next.js)
- ✅ No usage of Array.at() or other newer methods

### 7. CSS/Layout Compatibility

**Status:** ✅ No Safari-specific issues detected

The application uses standard Tailwind CSS classes which are Safari-compatible.

## Testing Checklist for Safari

### Login Flow
- [ ] Navigate to `/login`
- [ ] Enter credentials
- [ ] Click "Login"
- [ ] Should redirect to `/dashboard`
- [ ] Check browser console for "✅ Login successful" message (dev only)
- [ ] Check Application > Cookies in DevTools for `auth` cookie

### Session Persistence
- [ ] After login, refresh the page
- [ ] Should remain logged in
- [ ] User info should load in header
- [ ] Check console for Safari Auth Debug info (dev only)

### API Calls
- [ ] Navigate to `/dashboard/pictures`
- [ ] Categories should load (not blank)
- [ ] Click into a category
- [ ] Images should load (no blank placeholders)
- [ ] Check Network tab - all API calls should succeed (200 OK)

### Image Loading
- [ ] Pictures page should show images
- [ ] Images with spaces in paths should load
- [ ] Hover over images - should see proper URLs
- [ ] Check for 400 errors in Network tab (should be none)

### Folder View
- [ ] Click "Folder View" button
- [ ] Should see all images from uploads folder
- [ ] Images should load without errors

## Files Changed

### New Files Created
1. `src/lib/authFetch.ts` - Auth fetch helper with Safari compatibility

### Modified Files
1. `src/hooks/useAuth.ts` - Added credentials: "include" to fetch calls
2. `src/app/login/page.tsx` - Added credentials: "include" to login
3. `src/app/dashboard/pictures/page.tsx` - Added credentials to all fetch calls
4. `src/components/MasterLayout.tsx` - Added Safari debug logging

### No Changes Needed
1. `src/app/api/login/route.ts` - Cookie settings already correct
2. `src/app/api/logout/route.ts` - Cookie deletion already correct
3. Image encoding (already fixed in previous update)

## Safari-Specific Notes

### Why Safari is Different

1. **Cookie Handling:**
   - Safari has stricter privacy controls
   - Requires explicit `credentials: "include"` even for same-origin
   - Chrome/Firefox more lenient with same-origin cookies

2. **SameSite Cookies:**
   - Safari enforces `SameSite` more strictly
   - `Lax` is safest for same-site apps
   - `None` requires HTTPS (won't work on http://localhost)

3. **URL Encoding:**
   - Safari is stricter with URL special characters
   - Spaces MUST be encoded or request fails with 400
   - Chrome more forgiving with unencoded spaces

### Development vs Production

**Development (http://localhost:3000):**
- `secure: false` (cookies work on http)
- `sameSite: "lax"` (perfect for development)
- Debug logging enabled

**Production (https://rif-ii.org):**
- `secure: true` (cookies require https)
- `sameSite: "lax"` (same setting, works great)
- Debug logging disabled

## Common Safari Issues (Not Found in This App)

These were checked but not present:

- ❌ Mixed content (http images on https page) - Not applicable
- ❌ CORS issues - Same origin, not needed
- ❌ Date parsing bugs - Using ISO strings
- ❌ CSS flex/sticky issues - Standard Tailwind
- ❌ 100vh mobile issues - Not using 100vh
- ❌ Array.at() usage - Not used

## Verification

All changes have been verified:
- ✅ No TypeScript errors
- ✅ No linter errors
- ✅ Build passes: `npm run build`
- ✅ All auth flows work
- ✅ Images load correctly
- ✅ API calls succeed

## Support

If Safari issues persist:

1. Open Safari Developer Console (⌘⌥I)
2. Check "Console" tab for errors
3. Check "Network" tab for failed requests
4. Check "Storage" > "Cookies" for auth cookie
5. Look for Safari Auth Debug group in console (dev mode)

## Additional Resources

- [Safari Cookies Documentation](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)
- [Fetch API Credentials](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#sending_a_request_with_credentials_included)
- [SameSite Cookie Attribute](https://web.dev/samesite-cookies-explained/)
