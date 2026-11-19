/**
 * ClinicFlow: Adds shared Supabase sync, 45-second polling, manual Refresh,
 * and authenticated patient appointment notifications to BOTH Vue frontends.
 * Run from the Git repository root: node .\Add-ClinicFlow-Sync.cjs
 * Does not commit, push, run SQL, or publish any deployment.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = process.cwd();
const sourceDir = path.join(__dirname, 'files');
const plans = new Map();
const warnings = [];
function assert(ok, msg) { if (!ok) throw Error(msg); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function plan(p, value) { plans.set(p, value); }

for (const app of ['mobile-app', 'staff-website']) {
  const dir = path.join(root, app);
  const appVue = path.join(dir, 'src/App.vue');
  const storeFile = path.join(dir, 'src/Apps/shared/demoStore.js');
  assert(fs.existsSync(appVue), `Missing ${app}/src/App.vue. Run at the repository root.`);
  assert(fs.existsSync(storeFile), `Missing ${app}/src/Apps/shared/demoStore.js.`);
  assert(fs.existsSync(path.join(dir, 'package.json')), `Missing ${app}/package.json.`);

  // Safer than replacing the latest App.vue from an old snapshot.
  let vue = read(appVue);
  if (!vue.includes('import SyncToolbar')) {
    assert(/function\s+signIn\s*\(\s*\)\s*\{/.test(vue), `Unknown ${app} login structure. No changes made. Provide src/App.vue for an exact patch.`);
    assert(/function\s+signOut\s*\(\s*\)\s*\{/.test(vue), `Unknown ${app} logout structure. No changes made.`);
    assert(vue.includes('currentUser.value') && vue.includes('password.value') && vue.includes('email.value'), `Unrecognized ${app} authentication logic. No changes made.`);
    const hostTag = /(<template\s*>)/;
    assert(hostTag.test(vue), `Cannot locate app container in ${app}/src/App.vue. No changes made.`);

    vue = vue.replace('<script setup>', `<script setup>\nimport SyncToolbar from './services/SyncToolbar.vue'\nimport { cloudConfigured, cloudLogin, cloudLogout, startClinicSync, stopClinicSync } from './services/clinicSync.js'`);
    vue = vue.replace(/function\s+signIn\s*\(\s*\)\s*\{/, `async function signIn() {
  if (cloudConfigured) {
    error.value = ''
    try {
      const signedIn = await cloudLogin(email.value, password.value)
      const role = signedIn.role === 'nurse' ? 'doctor' : signedIn.role
      if (platform.value === 'mobile' && !['patient', 'doctor'].includes(role)) {
        throw new Error('This account is for the ClinicFlow website.')
      }
      if (platform.value === 'web' && !['patient', 'frontdesk', 'admin'].includes(role)) {
        throw new Error('This account is for the mobile application.')
      }
      currentUser.value = { ...signedIn, role }
      password.value = ''
      await startClinicSync()
    } catch (e) {
      stopClinicSync()
      currentUser.value = null
      error.value = e.message || String(e)
    }
    return
  }
`);
    vue = vue.replace(/function\s+signOut\s*\(\s*\)\s*\{/, `function signOut() {
  if (cloudConfigured) void cloudLogout()
`);
    vue = vue.replace(hostTag, `$1\n  <SyncToolbar v-if="currentUser" />`);
    plan(appVue, vue);
  }

  const serviceDir = path.join(dir, 'src/services');
  const service = path.join(serviceDir, 'clinicSync.js');
  const toolbar = path.join(serviceDir, 'SyncToolbar.vue');
  if (!fs.existsSync(service)) plan(service, read(path.join(sourceDir, 'clinicSync.js')));
  if (!fs.existsSync(toolbar)) plan(toolbar, read(path.join(sourceDir, 'SyncToolbar.vue')));

  let store = read(storeFile);
  if (!store.includes('attachClinicStore(')) {
    assert(store.includes('export const clinic') && /watch\s*\(/.test(store), `Unrecognized ${app} demoStore. No changes made.`);
    assert(/function\s+load\s*\(\s*\)\s*\{/.test(store), `Cannot find local data loader for ${app}. No changes made.`);
    store = `import { cloudConfigured, attachClinicStore } from '../../services/clinicSync.js'\n` + store;
    // In cloud mode never load or persist another patient's appointments in localStorage.
    store = store.replace(/function\s+load\s*\(\s*\)\s*\{/, `function load() {\n  if (cloudConfigured) return []`);
    store = store.replace(/(watch\s*\(\s*\(\s*\)\s*=>\s*clinic\.appointments\s*,\s*\(\s*\)\s*=>\s*\{)/,
      '$1\n  if (cloudConfigured) return');
    // Client-side temporary IDs must not conflict with existing server IDs.
    store = store.replace(/id:\s*nextId\+\+/, 'id: cloudConfigured ? Date.now() * 1000 + Math.floor(Math.random() * 1000) : nextId++');
    store = store.replace(/(export\s+function\s+resetDemo\s*\([^)]*\)\s*\{)/, '$1\n  if (cloudConfigured) return false');
    store += `\n// Bind the existing reactive appointment store to Supabase without changing the UI APIs.\nattachClinicStore(clinic)\n`;
    plan(storeFile, store);
  }

  const pFile = app === 'mobile-app' ?
    path.join(dir, 'src/Apps/patient/PatientApp.vue') :
    path.join(dir, 'src/Apps/patient/PatientWebApp.vue');
  if (fs.existsSync(pFile)) {
    let pat = read(pFile);
    // PatientCalendar was added to mobile-app after the first website updater.
    if (app === 'staff-website' && pat.includes("'./PatientCalendar.vue'")) {
      const calendarDest = path.join(dir, 'src/Apps/patient/PatientCalendar.vue');
      if (!fs.existsSync(calendarDest)) {
        const calendarSrc = path.join(root, 'mobile-app/src/Apps/patient/PatientCalendar.vue');
        assert(fs.existsSync(calendarSrc), 'PatientWebApp.vue needs PatientCalendar.vue. Update mobile-app before running. No changes made.');
        plan(calendarDest, read(calendarSrc));
      }
    }
    if (/const\s+patientName\s*=\s*['"]Jordan Taylor['"]/.test(pat) && !pat.includes('syncState.profile')) {
      pat = pat.replace(/(<script setup>)/, "$1\nimport { syncState, markRead } from '../../services/clinicSync.js'");
      pat = pat.replace(/const\s+patientName\s*=\s*['"]Jordan Taylor['"]/, "const patientName = computed(() => syncState.profile?.full_name || 'Jordan Taylor')");
      pat = pat.replace(/\.patient\s*===\s*patientName\b/g, '.patient === patientName.value');
      pat = pat.replace(/patientName\.toLowerCase\(\)/g, 'patientName.value.toLowerCase()');
      pat = pat.replace(/patient:\s*patientName\b(?!\.value)/g, 'patient: patientName.value');
      pat = pat.replace(/confirmAppointment\(([^,)]*),\s*patientName\)/g, 'confirmAppointment($1, patientName.value)');
      pat = pat.replace(/<strong>Jordan Taylor<\/strong>/g, '<strong>{{ patientName }}</strong>');
      // Replace the static sample notification page with real Supabase notifications.
      const notificationSection = /(<section\s+v-else-if="currentPage === 'notifications'"[^>]*>)[\s\S]*?(<\/section>)/;
      if (notificationSection.test(pat)) {
        pat = pat.replace(notificationSection, `$1
          <h1 id="notifications-heading" class="section-heading">Notifications</h1>
          <p v-if="!syncState.notifications.length" class="screen-description">No appointment notifications yet.</p>
          <article v-for="note in syncState.notifications" :key="note.id" class="detail-card">
            <strong>{{ note.read_at ? 'Appointment update' : 'New appointment update' }}</strong>
            <p>{{ note.message }}</p>
            <small>{{ new Date(note.created_at).toLocaleString() }}</small>
            <div><button v-if="!note.read_at" class="primary-button" type="button" @click="markRead(note.id)">Mark as read</button></div>
          </article>
          $2`);
      }
      pat = pat.replace(/(aria-label="View notifications"[^>]*>)/, `$1
          <span v-if="syncState.notifications.some(n => !n.read_at)" class="cf-bell-count" aria-label="Unread notifications">●</span>`);
      if (pat.includes('<style scoped>')) {
        pat = pat.replace('<style scoped>', '<style scoped>\n.cf-bell-count{color:#f47730;font-size:12px;position:relative;line-height:1;}');
      }
      plan(pFile, pat);
    } else {
      warnings.push(`${app}: Patient name is not in the expected demo format; review the patient's identity filtering manually.`);
    }
  }
  const pkg = JSON.parse(read(path.join(dir, 'package.json')));
  if (!(pkg.dependencies || {})['@supabase/supabase-js']) {
    warnings.push(`${app}: install Supabase client: cd ${app}; npm.cmd install @supabase/supabase-js`);
  }
}
// Validate both apps before writing a single file.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupRoot = path.join(os.homedir(), 'ClinicFlowBackups', `sync-${stamp}`);
for (const [file, updated] of plans) {
  if (fs.existsSync(file)) {
    const backup = path.join(backupRoot, path.relative(root, file));
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.copyFileSync(file, backup);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, updated, 'utf8');
  console.log(`Updated: ${path.relative(root, file)}`);
}
console.log(`\nDone. Backup: ${backupRoot}`);
console.log('Next: npm.cmd run build in each app; configure Supabase (schema.sql + env values).');
console.log('This does not deploy to Vercel or turn local demo users into real Supabase users.');
for (const warning of warnings) console.warn('Note:', warning);
