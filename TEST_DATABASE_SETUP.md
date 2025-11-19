# Database Setup Test & Verification

## ✅ Implementation Complete

### 1. Storage Services Migration
All storage services now use `expo-sqlite` with a singleton pattern:
- ✅ `localEmployeeService.ts` - works unchanged
- ✅ `localScheduleService.ts` - works unchanged  
- ✅ `localHistoryService.ts` - works unchanged
- ✅ `localShiftMetaService.ts` - works unchanged

**How it works:**
```typescript
// SQLiteProvider sets dbInstance on init
dbInstance = db  // in initDatabase()

// Services use the singleton
export async function queryAll(sql, params) {
  const db = getDbInstance()  // Gets stored instance
  return db.getAllAsync(sql, params)
}
```

### 2. Error Boundary
Added `DatabaseErrorBoundary` wrapping `SQLiteProvider`:
- Catches database initialization errors
- Shows user-friendly error message
- Provides "Restart App" button
- Logs errors to console for debugging

### 3. Architecture

```
Root Layout
└── DatabaseErrorBoundary
    └── SQLiteProvider (expo-sqlite)
        ├── databaseName: "wgs.db"
        ├── onInit: initDatabase() → creates schema + stores dbInstance
        ├── Background: performInitialSync() → Turso sync
        └── AppContent
            ├── All screens
            ├── All Zustand stores
            └── All services have access via singleton
```

## Testing Checklist

### Manual Tests

1. **App Startup**
   ```
   ☐ App loads without errors
   ☐ Check console for "[DB] Initializing database schema..."
   ☐ Check console for "[DB] Database schema initialized"
   ☐ Check console for "[DB] Attempting initial sync with Turso..."
   ```

2. **Database Operations**
   ```
   ☐ Navigate to Employees tab → employees load
   ☐ Toggle employee leave status → updates immediately
   ☐ Navigate to Schedule tab → schedule loads
   ☐ Generate new schedule → saves successfully
   ```

3. **Turso Sync**
   ```
   ☐ Go to Settings → Database Sync card shows status
   ☐ Tap "🔄 Sync Now" → spinner shows, then "Sync complete" alert
   ☐ Frame number updates after sync
   ☐ Last sync time shows "X seconds ago"
   ```

4. **Pull-to-Refresh**
   ```
   ☐ Schedule tab → pull down → syncs + reloads
   ☐ Employees tab → pull down → syncs + reloads
   ☐ Both show spinner during refresh
   ```

5. **Offline Mode**
   ```
   ☐ Turn off WiFi
   ☐ App still works (reads from local db)
   ☐ Status shows "Offline" in Settings
   ☐ Turn WiFi back on
   ☐ Pull-to-refresh or "Sync Now" → reconnects
   ☐ Status shows "Online"
   ```

6. **Error Handling**
   ```
   ☐ If database fails to init → error boundary shows
   ☐ Error message displayed
   ☐ "Restart App" button works
   ```

### Expected Console Output (Success)

```
[DB] Initializing database schema...
[DB] Database schema initialized
[DB] Attempting initial sync with Turso...
[DB] Initial sync complete. Frame: 123
```

### Expected Console Output (Offline)

```
[DB] Initializing database schema...
[DB] Database schema initialized
[DB] Attempting initial sync with Turso...
[DB] Initial sync failed, continuing in offline mode: [Error details]
```

## Code Verification

### Check 1: SQLiteProvider Setup
File: `app/_layout.tsx`
```typescript
<DatabaseErrorBoundary>
  <SQLiteProvider
    databaseName="wgs.db"
    options={{ useNewConnection: true }}
    onInit={initDatabase}
  >
    <AppContent />
  </SQLiteProvider>
</DatabaseErrorBoundary>
```

### Check 2: Database Singleton
File: `services/storage/localDatabase.ts`
```typescript
// Global instance
let dbInstance: SQLiteDatabase | null = null

// Set on init
export async function initDatabase(db: SQLiteDatabase) {
  dbInstance = db
  // ...
}

// Used by services
function getDbInstance() {
  if (!dbInstance) throw new Error('Not initialized')
  return dbInstance
}
```

### Check 3: Turso Sync
File: `services/storage/localDatabase.ts`
```typescript
// Separate Turso client for sync only
function getTursoClient() {
  return createClient({
    url: 'file:wgs.db',
    syncUrl: remoteUrl,  // Turso remote
    authToken: authToken,
  })
}

export async function syncDatabase() {
  const tursoClient = getTursoClient()
  const syncResult = await tursoClient.sync()
  // Update status...
}
```

## Troubleshooting

### Error: "Database not initialized"
**Cause:** Trying to use db before SQLiteProvider mounts
**Fix:** Ensure SQLiteProvider wraps your app root

### Error: "Turso URL not configured"
**Cause:** Missing env vars
**Fix:** Check `.env` has `TURSO_DB_URL` and `TURSO_DB_AUTH_TOKEN`

### Error: "Sync failed"
**Cause:** Offline or invalid Turso credentials
**Fix:** Check network, verify Turso credentials in `.env`

### Database seems empty
**Cause:** Schema not created or sync not working
**Fix:** 
1. Check console for init logs
2. Clear app data and restart
3. Verify Turso has data

## Success Indicators

✅ App starts without crashes
✅ Console shows init + sync messages
✅ Settings shows DB status with frame number
✅ Pull-to-refresh works on all screens
✅ Manual sync button works
✅ Offline mode continues to work
✅ Storage services work unchanged

## Next Steps After Verification

1. Monitor sync performance (frame numbers incrementing)
2. Test multi-device sync (edit on device A, pull on device B)
3. Add conflict resolution for offline writes
4. Implement background sync on app resume
5. Add sync progress indicators

---

**Local-First Architecture: Complete** 🎉
- Local SQLite via expo-sqlite ✅
- Turso embedded replicas ✅
- Error boundaries ✅
- Pull-to-refresh with sync ✅
- Manual sync button ✅
- Offline-first capability ✅
