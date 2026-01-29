# 🔍 Debugging Steps - Dashboard API Error

## Current Status

The API is still returning an error. I've added comprehensive logging to identify the exact issue.

---

## ⚡ IMMEDIATE STEPS TO FOLLOW

### Step 1: Check Your Terminal (Where Dev Server Runs)

Look at the terminal window where you ran `npm run dev`. You should see detailed error messages now.

**Look for these messages:**

```
=== Dashboard API Called ===
✅ Database pool obtained
Query params: { ... }
WHERE clause: ...
Preparing KPI query...
Executing all queries...
```

**If you see an ❌ error, it will tell you EXACTLY which query failed:**

```
❌ KPI query failed: [error message]
❌ Events over time query failed: [error message]
❌ Org participation query failed: [error message]
... etc
```

### Step 2: Test the Simple Test Endpoint First

Open in your browser:
```
http://192.168.100.28:3000/api/training-workshops/test
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Database connection successful",
  "data": {
    "totalEvents": 123,
    "totalParticipants": 456
  }
}
```

**If this fails:** Database connection issue
**If this works:** The issue is with the complex queries in the dashboard API

---

## 🎯 WHAT TO DO BASED ON ERROR

### Scenario A: Test endpoint works, dashboard endpoint fails

**This means:** Database connection is fine, but SQL queries have issues

**Action:**
1. Look at terminal for which specific query is failing
2. Copy the error message
3. Share it with me

### Scenario B: Test endpoint also fails

**This means:** Database connection or table access issue

**Possible causes:**
- Database is not running
- Connection string is wrong
- Tables don't exist
- Permission issues

**Action:**
1. Check if SQL Server is running
2. Verify connection string in `.env` file
3. Test connection with SQL Server Management Studio

### Scenario C: "Invalid object name" error

**This means:** Table names are wrong or database schema is different

**Common errors:**
```
Invalid object name '_rifiiorg_db.rifiiorg.TrainingEvents'
Invalid object name '_rifiiorg_db.dbo.workshop_participants'
```

**Action:**
Open SQL Server Management Studio and run:
```sql
-- Check if TrainingEvents table exists
SELECT TOP 1 * FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]

-- Check if workshop_participants table exists
SELECT TOP 1 * FROM [_rifiiorg_db].[dbo].[workshop_participants]
```

If these fail, the table names or schema names are wrong.

### Scenario D: "Column name is ambiguous" error

**This means:** The WHERE clause fix didn't work properly

**Error looks like:**
```
Column name 'District' is ambiguous
Column name 'StartDate' is ambiguous
```

**Action:** Share the exact query that's failing from the terminal logs

### Scenario E: Empty result / No error but success: false

**This means:** Query succeeded but returned unexpected format

**Action:** Check terminal logs for what the response looks like

---

## 📋 INFORMATION I NEED FROM YOU

Please check your terminal and provide:

### 1. Terminal Output
Copy all the messages from the terminal that appear when you open the dashboard page, including:
```
=== Dashboard API Called ===
... (all messages)
❌ (any error messages)
```

### 2. Test Endpoint Result
What do you see when you open:
```
http://192.168.100.28:3000/api/training-workshops/test
```

### 3. Browser Console Error
Press F12, go to Console tab, and copy the error messages

### 4. Network Tab Response
Press F12, go to Network tab, refresh the page, click on the `dashboard` request, go to Response tab, and copy what you see

---

## 🔧 QUICK FIXES TO TRY

### Fix 1: Restart Dev Server (IMPORTANT!)
```bash
# In terminal where dev server runs:
Ctrl+C  (to stop)
npm run dev  (to restart)
```

**WHY:** The new logging code won't run until you restart

### Fix 2: Clear Next.js Cache
```bash
# Stop the server first (Ctrl+C)
rm -rf .next
# or on Windows:
rmdir /s .next

# Then restart:
npm run dev
```

### Fix 3: Check Database Connection
Open SQL Server Management Studio and try to connect with the same credentials from your `.env` file

### Fix 4: Verify Table Names
Run these in SSMS:
```sql
-- List all tables in the database
SELECT TABLE_SCHEMA, TABLE_NAME 
FROM [_rifiiorg_db].INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_SCHEMA, TABLE_NAME
```

---

## 🎯 MOST LIKELY ISSUES

Based on common problems:

### Issue 1: Database Not Running
**Symptom:** "Failed to connect to SQL Server"
**Fix:** Start SQL Server service

### Issue 2: Wrong Table Names
**Symptom:** "Invalid object name"
**Fix:** Check exact table names in database

### Issue 3: No Data in Tables
**Symptom:** API works but returns empty arrays
**Fix:** Add data to tables

### Issue 4: SQL Syntax Error
**Symptom:** Specific query fails with SQL error
**Fix:** Check the query that's failing in terminal

### Issue 5: Permission Denied
**Symptom:** "SELECT permission denied on object"
**Fix:** Grant permissions to database user

---

## 📊 EXPECTED TERMINAL OUTPUT (Good Case)

When everything works, you should see:

```
=== Dashboard API Called ===
✅ Database pool obtained
Query params: {}
WHERE clause: 
Preparing KPI query...
Executing all queries...
✅ All main queries completed successfully
✅ Registered participants query completed
✅ Building response with KPIs: { totalEvents: 123, ... }
✅ Chart data counts: { eventsOverTime: 12, participantsOverTime: 12, ... }
```

---

## 📊 EXPECTED TERMINAL OUTPUT (Error Case)

When something fails, you'll see:

```
=== Dashboard API Called ===
✅ Database pool obtained
Query params: {}
WHERE clause: 
Preparing KPI query...
Executing all queries...
❌ Org participation query failed: Invalid object name '_rifiiorg_db.dbo.workshop_participants'
=== DASHBOARD API ERROR ===
Error fetching training-workshops dashboard data: [Error details]
Error name: RequestError
Error message: Invalid object name '_rifiiorg_db.dbo.workshop_participants'
Error stack: [stack trace]
```

---

## 🚨 ACTION REQUIRED

**PLEASE DO THIS NOW:**

1. **Restart your development server** (Ctrl+C then `npm run dev`)
2. **Open the dashboard page** (http://192.168.100.28:3000/dashboard/training-workshops)
3. **Look at your terminal** where the dev server is running
4. **Copy ALL the output** from the terminal (especially lines starting with ===, ✅, or ❌)
5. **Share that output with me**

This will tell us EXACTLY which query is failing and why.

---

## 🔍 Alternative: Check if Tables Exist

Run this in SQL Server Management Studio:

```sql
-- Test 1: Check TrainingEvents table
SELECT COUNT(*) AS EventCount 
FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]

-- Test 2: Check workshop_participants table
SELECT COUNT(*) AS ParticipantCount
FROM [_rifiiorg_db].[dbo].[workshop_participants]

-- Test 3: Check if specific columns exist
SELECT TOP 1
    [TrainingEventCode],
    [TrainingTitle],
    [District],
    [StartDate],
    [EndDate]
FROM [_rifiiorg_db].[rifiiorg].[TrainingEvents]

-- Test 4: Check participants columns
SELECT TOP 1
    [TrainingEventCode],
    [participant_name],
    [gender],
    [organization_department],
    [Training_Unit]
FROM [_rifiiorg_db].[dbo].[workshop_participants]
```

If any of these fail, the table structure is different than expected.

---

## 💡 REMEMBER

The detailed logging I added will show:
- ✅ What succeeded
- ❌ What failed and why
- 📊 How much data was returned

**Check your terminal output and share it with me!**

---

**Status:** Waiting for terminal output
**Next Step:** Restart dev server and check terminal for detailed error messages
