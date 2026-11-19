CLINICFLOW — ADD PATIENT TO THE WEBSITE

This updater changes the staff-website application without renaming the
staff-website folder (which might be configured as Vercel's root directory).

It does the following:
  1. Copies your CURRENT mobile-app PatientApp.vue as a separate
     staff-website/src/Apps/patient/PatientWebApp.vue.
  2. Adds a patient login (patient@clinicflow.demo, password Demo1234!) if one
     is not already present, with the web platform when applicable.
  3. Adds the new patient view to the existing website's role-based router,
     leaving Front Desk and Administrator views in place.
  4. Renames visible references to "Staff Website" / "Staff Portal" to
     "ClinicFlow Website" / "ClinicFlow" in the website source.
  5. Provides responsive desktop patient layout: wider appointment cards,
     two-column dashboard, top navigation, roomy booking/feedback forms.
     Narrow screens retain the original mobile-style layout.
  6. Backs up the original files outside the Git repository in
     ~/ClinicFlowBackups/patient-web-<timestamp>.

HOW TO APPLY (PowerShell, once script is saved in the ClinicFlow folder)
  cd "$HOME\ClinicFlow"
  git switch main
  git pull origin main
  git switch -c feature/patient-website
  node .\Add-ClinicFlow-Patient-Web.cjs
  cd .\staff-website
  npm.cmd run build
  npm.cmd run dev -- --port 5174

If build succeeds, commit and push in a separate PowerShell terminal:
  cd "$HOME\ClinicFlow"
  git add staff-website
  git commit -m "Add responsive patient portal to ClinicFlow website"
  git push -u origin feature/patient-website

CREATE PULL REQUEST
  https://github.com/avas013/ClinicFlow/pull/new/feature/patient-website

After merging to main, Vercel normally builds your deployed website
(https://cliniccrew.vercel.app/) automatically if it is configured to
follow the main branch.

LIMITATIONS AND WARNINGS
- Script only works with the known ClinicFlow Vue component/login patterns.
  If it says it cannot locate the account array or role router, no changes
  were written; send your current staff-website/src/App.vue for adaptation.
- The added patient demo account is NOT secure authentication; do not use
  actual patient data with these sample credentials.
- Browser localStorage does not share appointments across different devices.
  Connect Supabase for shared multi-user data.
- This script was smoke-tested using earlier ClinicFlow source versions;
  it was not tested against your private repository's latest files.
