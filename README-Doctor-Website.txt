CLINICFLOW — ADD DOCTOR/NURSE TO WEBSITE
========================================

WHAT CHANGES
- Uses your LOCAL mobile-app/src/Apps/doctor-nurse/ directory as source of truth.
- Copies the current Doctor/Nurse Vue components (including any calendar files) into
  staff-website/src/Apps/doctor-nurse/.
- Adds Doctor/Nurse to the website's role-based component switcher.
- Allows Supabase 'doctor' user login on the website.
- Enables existing doctor@clinicflow.demo demo credentials in website demo mode.
- Adds responsive desktop layout CSS to the website.
- Keeps the existing Patient, Front Desk and Admin components.
- Does NOT modify mobile-app, Supabase, Vercel, or GitHub automatically.

INSTALL
1. Download ClinicFlow_Doctor_Website_Update.zip to your Downloads folder.
2. Open PowerShell:
     cd "$HOME\ClinicFlow"
     git status
     git switch main
     git pull origin main
     git switch -c feature/doctor-website
     Expand-Archive -Path "$HOME\Downloads\ClinicFlow_Doctor_Website_Update.zip" -DestinationPath "$HOME\ClinicFlow" -Force
     node .\Add-ClinicFlow-Doctor-To-Website.cjs

3. Build:
     cd "$HOME\ClinicFlow\staff-website"
     npm.cmd run build

4. Test:
     npm.cmd run dev -- --port 5174
     Open http://localhost:5174/
     Select Website and sign in as doctor@clinicflow.demo using the password
     set for that user in Supabase. (When in local demo mode: Demo1234!)
     If the website uses Supabase, the doctor's public.profiles.role must be 'doctor'.

5. Once built and tested, open another terminal and push:
     cd "$HOME\ClinicFlow"
     git add staff-website
     git commit -m "Add Doctor and Nurse access to ClinicFlow website"
     git push -u origin feature/doctor-website

PR: https://github.com/avas013/ClinicFlow/pull/new/feature/doctor-website
Merge to main; Vercel can deploy the main branch after checks pass.

TROUBLESHOOTING
- If the updater reports an unknown App.vue route, do not force the patch.
  Share the error and your current staff-website/src/App.vue for a precise fix.
- If the build fails because a Doctor component imports a missing module,
  share the first error. The updater copies the whole doctor-nurse component
  directory, but intentionally does not overwrite the website's shared store.
- The script creates backups OUTSIDE your Git repo under:
  C:\Users\<username>\ClinicFlowBackups\doctor-website-<timestamp>\
- Account passwords are not copied into Supabase. No database schema change is
  needed if doctor@clinicflow.demo is already registered with role doctor.
- Do not commit .env.local or secret keys.

VERIFICATION
- Tested Node.js script syntax and idempotence on older and mocked newer
  ClinicFlow App.vue arrangements.
- Could not compile/test against your live GitHub checkout, which was not
  accessible from this environment. The npm.cmd run build check is required.
