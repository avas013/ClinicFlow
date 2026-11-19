ClinicFlow — 15-minute appointment booking + unavailable time slots + expandable patient cards
=============================================================================================

WHAT HAS ALREADY BEEN CHANGED IN SUPABASE
- The live appointment validation trigger now enforces starts on :00/:15/:30/:45, and rejects
  overlapping active appointments for the same doctor with an advisory transaction lock.
- A new authenticated RPC, public.clinicflow_busy_slots(date,doctor), returns occupied times
  without revealing other patients' identities. This lets patient-facing apps grey out
  occupied times even though RLS hides other patients' appointments.
- Existing appointment records were deliberately not changed. Some older appointments on
  2026-11-19 are off-grid/overlapping (18:30 and 18:33; 19:27 and 19:30), so these will
  need correction separately. Until then, the affected 15-minute time slots are blocked.
- The accompanying SQL files document the live database changes; you do NOT need to run
  them again for this Supabase project.

HOW TO APPLY TO YOUR LOCAL VUE REPOSITORY (WINDOWS POWERSHELL)
1. Close running dev servers if needed.
2. Extract this ZIP directly into your ClinicFlow repository folder:
      Expand-Archive -Path "$HOME\Downloads\ClinicFlow_Booking_Update.zip" -DestinationPath "$HOME\ClinicFlow" -Force
3. Run from the repository root:
      cd "$HOME\ClinicFlow"
      node .\Apply-ClinicFlow-Booking-Update.cjs
4. Review changes, then build BOTH apps:
      git diff --stat
      cd .\staff-website
      npm.cmd run build
      cd ..\mobile-app
      npm.cmd run build
      cd ..
5. If builds succeed, commit your selected files and push your branch. Do not use
   'git add -A' if you have unrelated updater scripts or other work in progress.

WHAT THE INSTALLER DOES
- Adds shared bookingAvailability.js and SlotPicker.vue in both Vue apps.
- Adds validation to the shared demoStore book() function in both apps.
- Adds shared occupancy RPC lookup to both clinicSync.js services.
- Replaces recognized native doctor/front-desk/patient time inputs with a 15-minute
  dropdown whose booked options are grey/disabled.
- Wraps recognized booking calls so a taken time shows a friendly error.
- Adds a down/up chevron and expandable details to recognized patient appointment cards
  (Upcoming and All Appointments), listing what to bring and the office address.
- Makes a backup of modified originals in ~/ClinicFlowBackups/ outside the repo.

OFFICE ADDRESS
- The installer's address display deliberately uses a placeholder. Do not invent a real
  clinic location. In Vercel's Production environment variables, add:
      VITE_CLINIC_OFFICE_ADDRESS=The clinic's real address
  and redeploy the relevant Vercel app. Add it to both projects if you deploy both apps.

IMPORTANT LIMITATIONS
- GitHub live source was not accessible through this environment. The installer is
  based on the Vue components previously supplied for ClinicFlow; it checks for the known
  patterns and will report missing/unrecognized components rather than rewriting them.
- Frontend code is NOT yet pushed to GitHub or deployed to Vercel. Running the script and
  pushing a PR is necessary to make the greyed-out slots and expandable cards visible.
- The backend alone already prevents invalid/double bookings on the Supabase project.
- The UI assumes a fixed 15-minute appointment duration; no variable-length appointment
  handling is implemented. The picker presents all 96 quarter-hour slots in a 24-hour day
  because clinic opening hours have not been specified.
- When an occupied slot is chosen while the availability feed is stale, the server still
  rejects the booking, and the existing sync layer should refresh its state.
- If a teammate has substantially changed a component, send its current source to obtain
  a compatible patch rather than overwriting their work.
