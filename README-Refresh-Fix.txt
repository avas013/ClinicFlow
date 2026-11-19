CLINICFLOW REFRESH FIX
======================

What this fixes
---------------
1) If ClinicFlow is in LOCAL DEMO MODE, clicking Refresh now rereads the actual
   browser localStorage (rather than only displaying a message). An existing
   patient tab on the SAME ORIGIN also updates when another tab changes data.
   NOTE: localStorage cannot synchronize mobile-app and staff-website hosted
   on different origins/ports or two different devices.
2) If ClinicFlow is connected to Supabase, Refresh now waits for pending saves,
   bypasses HTTP cache, explicitly requests the latest appointments and
   notifications, and shows an error instead of silently skipping a refresh.
3) The existing Supabase Realtime and 45-second fallback checks remain in place.

Setup
-----
1. Extract this ZIP into your main ClinicFlow repository folder (where
   mobile-app and staff-website are).
2. From PowerShell:

     cd "$HOME\ClinicFlow"
     node .\Fix-ClinicFlow-Refresh.cjs

3. Build both applications:

     cd "$HOME\ClinicFlow\mobile-app"
     npm.cmd run build
     cd "$HOME\ClinicFlow\staff-website"
     npm.cmd run build

4. Test the existing page and the Refresh button WITHOUT opening a new tab.
   For cross-device tests, both apps need the SAME Supabase database and real
   Supabase accounts. Confirm the toolbar says "Synced" / "Online", not
   "Local demo - not shared".
5. Push only if both builds succeed and the behavior is correct.

Deploying to Vercel
-------------------
Set BOTH variables for EACH deployed Vercel app, in Settings > Environment Variables:

     VITE_SUPABASE_URL
     VITE_SUPABASE_PUBLISHABLE_KEY

Use the same Supabase project. Redeploy after updating environment variables.
Do not put the Supabase service_role key in Vercel frontend settings.

Troubleshooting
---------------
- "Local demo - not shared": Supabase variables are missing, and Refresh
  only sees data from the current browser origin. Refresh cannot fetch remote
  appointments; configure Supabase first.
- "Refresh failed" or "Sync failed": Check the on-screen message and browser
  DevTools > Network for failed requests. Check Supabase RLS and that user
  accounts/roles are correctly configured.
- Successful refresh but no change: Look in Supabase Table Editor >
  appointments to confirm that the cancelled appointment has the latest
  status. If the database still says Scheduled, the problem is SAVING, not
  refresh; look for "Could not save appointment" in the staff page.
- A new tab shows changed data but old one does not: this was caused by the
  missing local re-read and/or a skipped cloud refresh; retest the hotfix.

Backups
-------
The installer saves original files under:
  %USERPROFILE%\ClinicFlowBackups\refresh-fix-<timestamp>

This update modifies only these four files:
  mobile-app/src/services/clinicSync.js
  mobile-app/src/services/SyncToolbar.vue
  staff-website/src/services/clinicSync.js
  staff-website/src/services/SyncToolbar.vue

It never writes database credentials, changes Supabase schema, or publishes
anything. It refuses to modify files if their structure differs from the
supported ClinicFlow sync update, to avoid overwriting new teammate changes.

This is a prototype and is NOT suitable for real patient information.
