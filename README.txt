CLINICFLOW — SUPABASE REAL-TIME SYNC + REFRESH + NOTIFICATIONS
=============================================================

This update was prepared against ClinicFlow's known Vue file structure.
It modifies your LOCAL checkout, not GitHub or Vercel. It uses the versions of
App.vue and demoStore.js in your local repository, preserving your teammates'
current code whenever the expected structure matches. The installer refuses
unknown structures before writing files. Backups are saved outside Git.

WHAT IT ADDS
------------
* Shared Supabase appointments in mobile-app and staff-website.
* Realtime refresh on database changes, with 45-second fallback polling.
* A manual "Refresh" button and sync status visible to all logged-in roles.
* Server-side patient notifications for staff-booked appointments and changes.
* Notifications list, unread indicator, and browser notification permission.
* SQL row-level security: patients see only their own appointments; staff
  accounts have access according to their role.
* Existing local demo stays available when Supabase env vars are not set,
  but it is visibly marked "Local demo — not shared".

STEP 1. APPLY TO THE LOCAL REPOSITORY
-------------------------------------
If the patient-website feature branch is not merged, stay on that branch.
If it has already been merged, pull main before creating your new branch.
Do not overwrite uncommitted work.

  cd "$HOME\ClinicFlow"
  git status
  git switch -c feature/live-sync-notifications

Download and extract this ZIP directly into "$HOME\ClinicFlow"; then run:

  node .\Add-ClinicFlow-Sync.cjs

The script changes both apps and creates backups under
"$HOME\ClinicFlowBackups". It prints changed file paths.

STEP 2. INSTALL/VERIFY THE SUPABASE CLIENT AND BUILD
----------------------------------------------------
  cd "$HOME\ClinicFlow\staff-website"
  npm.cmd install @supabase/supabase-js
  npm.cmd run build

  cd "$HOME\ClinicFlow\mobile-app"
  npm.cmd install @supabase/supabase-js
  npm.cmd run build

Builds must both succeed before you push.

STEP 3. CREATE SECURE SUPABASE TABLES
------------------------------------
Open https://supabase.com/dashboard and select ONE shared Supabase project.
Open SQL Editor; paste and run files\schema.sql from this ZIP.

The SQL sets up profiles, appointments, appointment_notifications, secure
Row Level Security, booking notification triggers, and Realtime publication.
DO NOT change the policies to allow anonymous read/write.

STEP 4. CREATE REAL TEST AUTH ACCOUNTS
-------------------------------------
In Supabase Dashboard > Authentication > Users, create test users with email
and password, including a patient and a front desk user. For a patient:
  email: patient@example.com
  full_name in profile: Jordan Taylor

The signup trigger creates the initial profile with role 'patient'.
In Supabase SQL Editor, set each test user's accurate name and (for staff)
role; replace these sample emails with the emails you actually created:

  update public.profiles set full_name='Jordan Taylor',role='patient'
  where id=(select id from auth.users where email='patient@example.com');

  update public.profiles set full_name='Front Desk Staff',role='frontdesk'
  where id=(select id from auth.users where email='frontdesk@example.com');

  update public.profiles set full_name='Administrator',role='admin'
  where id=(select id from auth.users where email='admin@example.com');

  update public.profiles set full_name='Dr. Smith',role='doctor'
  where id=(select id from auth.users where email='doctor@example.com');

All patient accounts must exist before staff can book for them. The staff
booking form currently uses FULL NAME, so enter a registered patient's
name EXACTLY (e.g. Jordan Taylor). If no patient account matches or multiple
accounts have the same name, the cloud write is rejected with a visible error.
This name-only lookup is a prototype limitation; a real clinic needs a stable
patient ID/search selector and much stricter privacy controls.

STEP 5. ADD THE SAME SUPABASE CONNECTION TO BOTH APPS
-----------------------------------------------------
Create a file named .env.local in each directory:
  ClinicFlow\mobile-app\.env.local
  ClinicFlow\staff-website\.env.local

Use the same project values in BOTH files:
  VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
  VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY

If your older project uses an anon key, use:
  VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
instead of VITE_SUPABASE_PUBLISHABLE_KEY.

The publishable/anon key is intended for browser use with RLS; NEVER put a
Supabase service_role/secret key in these environment variables.

Restart Vite after creating the env files. When env vars are configured,
the hard-coded demo login is NOT used: both apps require real Supabase Auth
credentials and profiles created above.

STEP 6. TEST THE FLOW
---------------------
1. Run staff-website on port 5174 and mobile-app on 5173 (in separate windows).
2. Sign in to website as real front desk Supabase test account.
3. Sign in to mobile app or patient website as real patient Supabase account.
4. Staff books Jordan Taylor an appointment in an unoccupied time slot.
5. The patient sees the appointment appear automatically; in-app notification
   and unread badge appear when the server notification is received.
6. Confirm from Patient App. Staff screen updates.
7. Disable network briefly and check error message; reconnect and Refresh.
8. Use "Enable desktop alerts" from Notifications, grant browser permission,
   and repeat the booking (use a different doctor/time).

Realtime updates normally arrive in seconds. Fallback checks every 45 seconds
while the page is running, plus on tab focus. Browser background throttling,
offline devices, and failed requests can delay this beyond 60 seconds.
The Refresh button requests the latest database state immediately.

NOTIFICATION LIMITATIONS
------------------------
This update provides in-app notifications and optional browser desktop alerts
WHILE THE WEB APP IS OPEN. It does not send emails, texts, or guaranteed
phone push alerts when the browser/app is fully closed. That requires a
separate push/service worker or email/SMS integration.

STEP 7. PUBLISH AFTER ALL TESTS PASS
------------------------------------
  cd "$HOME\ClinicFlow"
  git status
  git add mobile-app staff-website
  git commit -m "Add Supabase sync, refresh and patient notifications"
  git push -u origin feature/live-sync-notifications

Open pull request:
https://github.com/avas013/ClinicFlow/pull/new/feature/live-sync-notifications

For Vercel: add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to the
Environment Variables for BOTH Vercel projects, then redeploy. These are
build-time Vite env vars, not runtime server-side settings.

IMPORTANT: This remains a class prototype. Do not upload real patient data.
Real clinical use needs verified authorization, unique patient identification,
security/privacy compliance, audit logs, and production review.
