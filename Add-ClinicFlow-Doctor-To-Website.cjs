/**
 * Add the existing Doctor/Nurse Vue interface to the ClinicFlow website.
 * Run with `node .\Add-ClinicFlow-Doctor-To-Website.cjs` from repo root.
 * Copies the current doctor subtree from mobile-app, keeps staff shared store,
 * adds a website Doctor route, allows Supabase Doctor role, and supports demo login.
 * Idempotent and makes backups outside the repository.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const root = process.cwd();
const staff = path.join(root, 'staff-website');
const mobile = path.join(root, 'mobile-app');
const srcDoctor = path.join(mobile, 'src', 'Apps', 'doctor-nurse');
const destDoctor = path.join(staff, 'src', 'Apps', 'doctor-nurse');
const appFile = path.join(staff, 'src', 'App.vue');
const cssFile = path.join(staff, 'src', 'styles', 'doctor-web.css');
const plans = new Map();
const read = p => fs.readFileSync(p, 'utf8');
function assert(v, m) { if (!v) throw Error(m + ' (No changes made.)'); }
function put(p, v) { if (!fs.existsSync(p) || read(p) !== v) plans.set(p, v); }
function recurse(folder, out = []) {
  for (const ent of fs.readdirSync(folder, { withFileTypes: true })) {
    if (ent.name.startsWith('.') || ent.name === 'node_modules') continue;
    const p = path.join(folder, ent.name);
    if (ent.isDirectory()) recurse(p, out);
    else if (ent.isFile()) out.push(p);
  }
  return out;
}

assert(fs.existsSync(appFile), 'Expected staff-website/src/App.vue; run from ClinicFlow repository root');
assert(fs.existsSync(path.join(srcDoctor, 'DoctorNurseApp.vue')), 'Cannot find mobile-app/src/Apps/doctor-nurse/DoctorNurseApp.vue');
assert(fs.existsSync(path.join(staff, 'src', 'Apps', 'shared', 'demoStore.js')), 'Missing the staff shared appointment store');
let app = read(appFile);
assert(app.includes('<script setup>') && app.includes('<template>'), 'Unrecognized website App.vue layout');
assert(app.includes('currentUser'), 'Unrecognized website login layout');

// Copy all the latest Doctor/Nurse components, including Rehan's calendar.
for (const file of recurse(srcDoctor)) {
  const relative = path.relative(srcDoctor, file);
  put(path.join(destDoctor, relative), read(file));
}

// Verify relative imports in copied Vue and JS modules. We use the existing
// website's shared demoStore, services and language module, never overwrite them.
for (const [file, contents] of plans) {
  if (!file.startsWith(destDoctor + path.sep) || !/\.(vue|jsx?|tsx?)$/i.test(file)) continue;
  const imports = [...contents.matchAll(/\bfrom\s*['"](\.[^'"]+)['"]|\bimport\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g)];
  for (const m of imports) {
    const ref = m[1] || m[2];
    const p = path.resolve(path.dirname(file), ref);
    const candidates = [p, p + '.vue', p + '.js', p + '.ts', path.join(p, 'index.js')];
    assert(candidates.some(x => plans.has(x) || fs.existsSync(x)), `Missing Doctor dependency ${ref} imported by ${path.relative(root, file)}. Please send this error.`);
  }
}

// Import the website Doctor view; this does not affect mobile-app files.
if (!/import\s+DoctorNurseApp\s+from\s+['"][^'"]+['"]/.test(app)) {
  app = app.replace('<script setup>', '<script setup>\nimport DoctorNurseApp from \'./Apps/doctor-nurse/DoctorNurseApp.vue\'');
}
if (!app.includes("./styles/doctor-web.css")) {
  app = app.replace('<script setup>', "<script setup>\nimport './styles/doctor-web.css'");
}

// Supabase login checks: allow Doctor AND Nurse on website. The code already
// maps the nurse role to doctor in recent ClinicFlow builds.
const webGate = /((?:platform\.value|platform)\s*===\s*['"]web['"][^\n]{0,150}?)(\[[^\]\n]+\]\.includes\(role\))/g;
app = app.replace(webGate, (all, before, arr) => {
  if (/['"]doctor['"]/.test(arr)) return all;
  return before + arr.replace(']', ", 'doctor']");
});
// Support the exact ClinicFlow cloud gate even if formatting spans lines.
app = app.replace(/(if\s*\(\s*platform\.value\s*===\s*['"]web['"]\s*&&\s*!)(\[[\s\S]*?\]\.includes\(role\)\s*\))/g, (all, start, condition) => {
  if (/['"]doctor['"]/.test(condition)) return all;
  return start + condition.replace(']', ", 'doctor']");
});

// Make the existing Doctor demo identity eligible for Website login; if the
// staff website never had a doctor sample account, add one to its sample list.
const accountsMatch = app.match(/\bconst\s+(demoAccounts|sampleAccounts|accounts|demoUsers|users)\s*=\s*\[/);
if (accountsMatch) {
  const rowRegex = /\{[^{}\n]*\brole\s*:\s*['"](doctor|nurse)['"][^{}\n]*\}/g;
  let foundDoctor = false;
  app = app.replace(rowRegex, row => {
    if (/(?:email|role)\s*:/.test(row) && /['"]doctor['"]/.test(row)) foundDoctor = true;
    return row.replace(/(platform\s*:\s*['"])mobile(['"])/, '$1web$2');
  });
  if (!foundDoctor) {
    app = app.replace(accountsMatch[0], accountsMatch[0] + "\n  { email: 'doctor@clinicflow.demo', password: 'Demo1234!', role: 'doctor', name: 'Dr. Smith', platform: 'web' },");
  }
} else {
  // In cloud-only projects, a local demo-account array might not be present.
  console.warn('Note: no demo-account list found; Supabase Doctor login will still be supported.');
}

// Add Doctor view to the same v-if/v-else-if chain as Patient and Front Desk.
if (!/<DoctorNurseApp\b/.test(app)) {
  const pivot = /^([\t ]*)<(FrontDeskApp|AdministratorApp)\b([^\n]*?)\s*\/>/m;
  const m = app.match(pivot);
  assert(m, 'Cannot find website FrontDeskApp/AdministratorApp route. Please share staff-website/src/App.vue');
  const full = m[0];
  const conditional = full.match(/\bv-(if|else-if)\s*=\s*"([^"]+)"/);
  assert(conditional, 'Cannot determine website role-routing expression');
  const roleExpr = conditional[2];
  assert(/\bfrontdesk\b|\badmin\b/.test(roleExpr), 'Website role routing uses an unexpected condition');
  const doctorExpr = roleExpr.replace(/(['"])(frontdesk|admin)\1/, "'doctor'");
  const nextTag = conditional[1] === 'if' ? full.replace(/\bv-if\s*=/, 'v-else-if=') : full;
  const indent = m[1];
  const newDoctor = `${indent}<div v-${conditional[1]}="${doctorExpr}" class="clinicflow-doctor-host">\n${indent}  <DoctorNurseApp />\n${indent}</div>`;
  app = app.replace(pivot, newDoctor + '\n' + nextTag);
}

// Update explanatory website copy (safe narrow replacements only).
app = app.replace(/Patients, front desk, and administrators/gi, 'Patients, doctors, front desk, and administrators');
app = app.replace(/Front desk and administrators/gi, 'Patients, doctors, front desk, and administrators');
app = app.replace(/patients, front desk, and administrators/gi, 'patients, doctors, front desk, and administrators');
put(appFile, app);

const responsiveCSS = `/* ClinicFlow Doctor/Nurse view: responsive desktop-sized website host. */
.clinicflow-doctor-host { width:100%; min-height:calc(100dvh - 62px); margin:0 auto; background:#f3f7fb; }
.clinicflow-doctor-host > * { width:100%; }
@media (min-width: 800px) {
  .clinicflow-doctor-host .staff-wrap { max-width: 1320px; margin: 0 auto; padding: 34px clamp(24px, 4vw, 60px); }
  .clinicflow-doctor-host .viewport { display:block !important; width:100% !important; max-width:none !important; min-height:calc(100dvh - 62px); padding:0 !important; }
  .clinicflow-doctor-host .phone-app { width:100% !important; max-width:1320px !important; height:auto !important; max-height:none !important; margin:0 auto !important; border:0 !important; border-radius:0 !important; box-shadow:none !important; }
  .clinicflow-doctor-host .main-content { width:100%; max-width:none; overflow:visible; padding:24px clamp(24px,4vw,60px) 45px; }
}
@media (max-width: 799px) {
  .clinicflow-doctor-host .staff-wrap { padding:20px 14px; }
}
`;
put(cssFile, responsiveCSS);

// Only touch the repository after all checks have succeeded. Backups are kept
// OUTSIDE the repo, so they won't accidentally get committed to GitHub.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = path.join(os.homedir(), 'ClinicFlowBackups', `doctor-website-${stamp}`);
for (const [file, content] of plans) {
  if (fs.existsSync(file)) {
    const copy = path.join(backup, path.relative(root, file));
    fs.mkdirSync(path.dirname(copy), { recursive:true });
    fs.copyFileSync(file, copy);
  }
  fs.mkdirSync(path.dirname(file), { recursive:true });
  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated:', path.relative(root, file));
}
console.log(`\nDone. Doctor/Nurse is now a permitted website role. Files changed: ${plans.size}`);
console.log('Backups:', backup);
console.log('Next: cd staff-website; npm.cmd run build; test Doctor login before git commit.');
console.log('This does not commit, push, or deploy the changes.');
