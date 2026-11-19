/**
 * ClinicFlow: add a responsive Patient experience to the EXISTING website.
 * Run from the repository root: node .\Add-ClinicFlow-Patient-Web.cjs
 * Requires Node.js, which ClinicFlow already uses.
 * This does NOT overwrite your existing staff App.vue with an older snapshot.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const root = process.cwd();
const mobilePatient = path.join(root, 'mobile-app/src/Apps/patient/PatientApp.vue');
const websiteRoot = path.join(root, 'staff-website');
const websiteApp = path.join(websiteRoot, 'src/App.vue');
const patientWebFile = path.join(websiteRoot, 'src/Apps/patient/PatientWebApp.vue');
const indexHtml = path.join(websiteRoot, 'index.html');
function assert(cond, explanation) { if (!cond) throw Error(explanation); }
const read = file => fs.readFileSync(file, 'utf8');
const originalApp = fs.existsSync(websiteApp) ? read(websiteApp) : '';

// Work from the freshest patient app in the teammate's local checkout.
assert(fs.existsSync(mobilePatient), `Missing ${path.relative(root, mobilePatient)}. Update your repository first.`);
assert(fs.existsSync(websiteApp), `Missing ${path.relative(root, websiteApp)}.`);
assert(originalApp.includes('<script setup>') && originalApp.includes('<template>'), 'Unexpected staff-website/src/App.vue format. No changes made.');

// The archived ClinicFlow login uses sampleAccounts or demoAccounts. Ensure we
// can add a login without accidentally disabling an unrelated login system.
const accountsRe = /\bconst\s+(sampleAccounts|demoAccounts|accounts|demoUsers|users)\s*=\s*\[/;
const accountMatch = originalApp.match(accountsRe);
const hasPatientAccount = /role\s*:\s*['"]patient['"]/.test(originalApp);
if (!hasPatientAccount) {
  assert(accountMatch, 'Cannot locate the existing demo-account array in staff-website/src/App.vue. No changes made; provide that file for an exact update.');
}

const routeRe = /^([ \t]*)<(FrontDeskApp|AdministratorApp)\b([^>]*?)\bv-if\s*=\s*"([^"]+)"([^>]*)\/>/m;
const routeMatch = originalApp.match(routeRe);
const existingPatientRoute = /<Patient(?:Web)?App\b[^>]*\bv-if\s*=/.test(originalApp);
if (!existingPatientRoute) {
  assert(routeMatch, 'Cannot find FrontDeskApp or AdministratorApp conditional route in staff-website/src/App.vue. No changes made; provide that file for an exact update.');
  assert(/\b([\w.]+)\.role\s*===\s*['"](?:frontdesk|admin)['"]/.test(routeMatch[4]), 'Existing role router uses an unrecognized expression. No changes made; provide App.vue.');
}

const requiredFunctions = ['openPage(', 'goHome(', 'currentPage', 'class="phone-app"', '<style scoped>'];
let patientWeb = read(mobilePatient);
for (const f of requiredFunctions) assert(patientWeb.includes(f), `PatientApp.vue format changed (missing ${f}); no changes made.`);
assert(patientWeb.includes('</style>') && patientWeb.includes('</header>'), 'PatientApp.vue missing expected template/style. No changes made.');

// On desktop, navigation is horizontal, the content uses the viewport, and the
// Upcoming / Quick Actions / Queue sections become a responsive dashboard.
const desktopNav = `\n      <nav class="patient-web-navigation" aria-label="Patient website navigation">\n        <button type="button" :class="{ active: currentPage === 'home' }" @click="goHome">Home</button>\n        <button type="button" :class="{ active: currentPage === 'appointments' }" @click="openPage('appointments')">Appointments</button>\n        <button type="button" :class="{ active: currentPage === 'booking' }" @click="openPage('booking')">Book appointment</button>\n        <button type="button" :class="{ active: currentPage === 'feedback' }" @click="openPage('feedback')">Feedback</button>\n        <button type="button" :class="{ active: currentPage === 'profile' }" @click="openPage('profile')">Profile</button>\n      </nav>\n`;
if (!patientWeb.includes('patient-web-navigation')) {
  patientWeb = patientWeb.replace('</header>', '</header>' + desktopNav);
}
const responsiveCss = `
/* Responsive website layout. The original phone layout remains on narrow screens. */
.patient-web-navigation { display: none; }
@media (min-width: 768px) {
  .viewport { display: block; min-height: calc(100dvh - 62px); padding: 0; background: #f5f8fb; }
  .phone-app { width: 100%; max-width: 1260px; height: auto; max-height: none; min-height: calc(100dvh - 62px); margin: 0 auto; overflow: visible; border: 0; border-radius: 0; box-shadow: none; background: transparent; }
  .top-bar { min-height: 76px; padding: 18px clamp(24px, 4vw, 56px); background: #fff; border-bottom: 1px solid #dce5ed; }
  .top-bar .brand { font-size: 18px; }
  .patient-web-navigation { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; padding: 12px clamp(24px, 4vw, 56px); background: #fff; border-bottom: 1px solid #dce5ed; }
  .patient-web-navigation button { border: 0; border-radius: 9px; padding: 11px 15px; background: transparent; color: #49647a; font-size: 14px; font-weight: 650; cursor: pointer; }
  .patient-web-navigation button.active, .patient-web-navigation button:hover { background: #e8f2fb; color: #216ca6; }
  .main-content { width: 100%; overflow: visible; padding: 0 clamp(24px, 4vw, 56px) 40px; }
  .home-content { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(290px, .8fr); grid-template-rows: auto auto; align-items: start; align-content: start; gap: 24px; min-height: 0; padding-top: 30px; }
  .home-content > section:first-child { grid-column: 1; grid-row: 1 / span 2; min-width: 0; }
  .home-content .quick-actions { grid-column: 2; grid-row: 1; margin: 0; gap: 12px; }
  .home-content .queue-section { grid-column: 2; grid-row: 2; margin: 0; border: 1px solid #d9e4ed; border-radius: 13px; background: #fff; padding: 22px; }
  .home-content > .status-message { grid-column: 1 / -1; grid-row: auto; }
  .home-content .flex-spacer, .home-content .bottom-spacer { display: none; }
  .section-heading { margin: 0 0 20px; font-size: 23px; }
  .appointment-card { min-height: 110px; padding: 20px 22px; border-radius: 12px; }
  .appointment-left, .appointment-right { font-size: 14px; }
  .appointment-card strong { font-size: 16px; }
  .appointments-list { gap: 15px; }
  .action-card { min-height: 104px; padding: 18px 12px; font-size: 16px; }
  .queue-position { justify-content: flex-start; font-size: 18px; }
  .detail-screen { max-width: 980px; min-height: 62vh; padding: 32px 0 50px; margin: 0 auto; }
  .detail-screen .section-heading { margin-bottom: 27px; }
  .form-stack { max-width: 650px; }
  .all-appointments-list { grid-template-columns: repeat(2, minmax(0, 1fr)); overflow: visible; align-content: start; }
  .bottom-nav { display: none; }
}
@media (min-width: 768px) and (max-width: 1000px) {
  .home-content { grid-template-columns: 1fr; }
  .home-content > section:first-child, .home-content .quick-actions, .home-content .queue-section { grid-column: 1; grid-row: auto; }
  .home-content .quick-actions { max-width: 600px; }
}
@media (max-width: 767px) {
  .viewport { min-height: calc(100dvh - 62px); }
  .phone-app { height: calc(100dvh - 62px); max-height: none; }
}
`;
if (!patientWeb.includes('/* Responsive website layout.')) {
  patientWeb = patientWeb.replace(/<\/style>\s*$/, responsiveCss + '\n</style>\n');
}

// Modify the existing App.vue in place so all other website functionality is retained.
let app = originalApp;
if (!/import\s+PatientWebApp\s+from\s+/.test(app)) {
  app = app.replace('<script setup>', '<script setup>\nimport PatientWebApp from \'./Apps/patient/PatientWebApp.vue\'');
}
const staffEntry = originalApp.match(/\{[^\n}]*role\s*:\s*['"](?:frontdesk|admin)['"][^\n}]*\}/);
const websitePlatform = staffEntry?.[0].match(/platform\s*:\s*['"]([^'"]+)['"]/)?.[1] || 'web';
if (!hasPatientAccount) {
  const accountObject = `\n  { email: 'patient@clinicflow.demo', password: 'Demo1234!', role: 'patient', name: 'Jordan Taylor', platform: '${websitePlatform}' },`;
  app = app.replace(accountsRe, (all) => all + accountObject);
} else {
  // Some older combined apps have a patient login but restrict it to "mobile".
  // A patient can now also enter through the website's existing platform.
  app = app.replace(/(\{[^\n}]*role\s*:\s*['"]patient['"][^\n}]*platform\s*:\s*['"])(mobile)(['"][^\n}]*\})/g, (_, before, oldValue, after) => before + websitePlatform + after);
}
if (!existingPatientRoute) {
  const routeCurrent = app.match(routeRe);
  const roleExp = routeCurrent[4].replace(/(["'])(?:frontdesk|admin)\1/, "'patient'");
  const patientTag = `${routeCurrent[1]}<PatientWebApp v-if="${roleExp}" />`;
  const staffTag = routeCurrent[0].replace(/\bv-if\s*=/, 'v-else-if=');
  app = app.replace(routeRe, () => patientTag + '\n' + staffTag);
} else {
  // When a previous patient route exists, switch its component to the desktop variant.
  app = app.replace(/<PatientApp\b/g, '<PatientWebApp');
}

function removeStaffWebsiteNames(source) {
  return source
    .replace(/ClinicFlow\s+Staff\s+(?:Website|Portal)/gi, 'ClinicFlow')
    .replace(/\bStaff\s+Website\b/gi, 'ClinicFlow Website')
    .replace(/\bStaff\s+Portal\b/gi, 'ClinicFlow Website')
    .replace(/\bCLINIC\s+STAFF\b/g, 'PATIENTS & CLINIC TEAM')
    .replace(/\bFront desk and administrators\b/gi, 'Patients, front desk, and administrators')
    .replace(/\bfor clinic staff only\b/gi, 'for patients and clinic staff');
}
app = removeStaffWebsiteNames(app);
// The landing text may mention only the original two roles.
app = app.replace(/\bfront desk and administrators\b/gi, 'patients, front desk, and administrators');

// Gather changes before writing anything. Backups go OUTSIDE the Git repo.
const changes = new Map([[websiteApp, app], [patientWebFile, patientWeb]]);
if (fs.existsSync(indexHtml)) {
  let html = removeStaffWebsiteNames(read(indexHtml));
  html = html.replace(/<title>[^<]*<\/title>/i, '<title>ClinicFlow</title>');
  if (html !== read(indexHtml)) changes.set(indexHtml, html);
}
const walk = d => {
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    const full = path.join(d, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (full.endsWith('.vue') && full !== websiteApp && full !== patientWebFile) {
      const data = read(full);
      const updated = removeStaffWebsiteNames(data);
      if (updated !== data) changes.set(full, updated);
    }
  }
};
walk(path.join(websiteRoot, 'src'));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupRoot = path.join(os.homedir(), 'ClinicFlowBackups', `patient-web-${stamp}`);
for (const [file, newContent] of changes) {
  if (fs.existsSync(file) && read(file) !== newContent) {
    const target = path.join(backupRoot, path.relative(root, file));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(file, target);
  }
}
for (const [file, newContent] of changes) {
  if (!fs.existsSync(file) || read(file) !== newContent) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated: ${path.relative(root, file)}`);
  }
}
console.log('\nPatient website update applied. Existing staff views are preserved.');
console.log(`Backups (original files): ${backupRoot}`);
console.log('Next: cd staff-website && npm.cmd run build');
console.log('This changes website code only. It does not publish to Vercel or synchronize mobile-app data.');
