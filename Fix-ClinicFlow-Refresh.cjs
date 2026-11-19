/**
 * ClinicFlow refresh hotfix. Run from repository root:
 *   node .\Fix-ClinicFlow-Refresh.cjs
 * Updates both apps' cloud-sync service + toolbar; other files are untouched.
 * Checks both files and backs up originals before writing anything.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = process.cwd();
const edits = new Map();
const ensure = (condition, msg) => { if (!condition) throw new Error(msg); };
function replaceOne(s, from, to, file) {
  const at = s.indexOf(from);
  ensure(at !== -1, `Expected source not found in ${file}: ${from.slice(0, 65)}... No changes made.`);
  ensure(s.indexOf(from, at + from.length) === -1, `Ambiguous duplicate source in ${file}. No changes made.`);
  return s.replace(from, to);
}
function patchedService(source, file) {
  if (source.includes('export async function refreshNow()') && source.includes('reloadLocalAppointments')) return null;
  ensure(source.includes('export async function refreshAll(force = false)'), `Unrecognized sync service in ${file}. No changes made.`);
  ensure(source.includes('async function saveChanges()'), `Unrecognized saving logic in ${file}. No changes made.`);
  let s = source;

  // Requests should bypass browser HTTP caches. Supabase still enforces Auth/RLS.
  s = replaceOne(s,
    'const supabase = cloudConfigured ? createClient(url, key) : null',
    `const supabase = cloudConfigured ? createClient(url, key, {
  global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
}) : null`, file);

  // Tabs on the same origin get localStorage updates; separate domains/devices REQUIRE Supabase.
  s = replaceOne(s,
    `export function attachClinicStore(clinic) {
  if (store) return
  store = clinic
  watch(() => store.appointments, () => {`,
    `const LOCAL_KEY = 'clinicflow-appointments-v2'
function reloadLocalAppointments(showMessage = false) {
  if (!store) throw new Error('Appointment store is not ready.')
  const raw = localStorage.getItem(LOCAL_KEY)
  if (!raw) {
    if (showMessage) syncState.toast = 'Local demo only: there are no stored appointments to reload.'
    return
  }
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) throw new Error('Saved appointments are not a valid list.')
  const appointments = parsed.filter(a => a && Number.isInteger(a.id) && typeof a.patient === 'string')
  applyingRemote = true
  try {
    store.appointments.splice(0, store.appointments.length, ...appointments)
  } finally {
    applyingRemote = false
  }
  syncState.lastUpdated = Date.now()
  syncState.error = ''
  if (showMessage) syncState.toast = 'Refreshed from this browser only. Supabase is not connected.'
}
function onLocalStorage(event) {
  if (cloudConfigured || event.key !== LOCAL_KEY) return
  try { reloadLocalAppointments(false) } catch (e) { syncState.error = 'Local refresh failed: ' + e.message }
}
export function attachClinicStore(clinic) {
  if (store) return
  store = clinic
  if (!cloudConfigured && typeof window !== 'undefined') {
    window.addEventListener('storage', onLocalStorage)
  }
  watch(() => store.appointments, () => {`, file);

  // Track the pending DB write, so a refresh never silently skips a query during saving.
  s = replaceOne(s,
    'let refreshInFlight = null',
    'let refreshInFlight = null\nlet savePromise = null', file);
  s = replaceOne(s,
    'export async function refreshAll(force = false) {',
    'export async function refreshAll(force = false, manual = false) {', file);
  s = replaceOne(s,
    `  if (inFlight && !force) return
  if (refreshInFlight) return refreshInFlight`,
    `  // Realtime/poll/manual requests must not be dropped during an appointment save.
  if (!force && savePromise) await savePromise
  if (refreshInFlight) {
    await refreshInFlight
    if (!manual) return
    // A manual click must make a NEW request, not reuse an older in-flight response.
  }`, file);

  // Keep the existing saving algorithm, but expose its promise to the refresh path.
  s = replaceOne(s,
    'async function saveChanges() {',
    `function saveChanges() {
  if (savePromise) return savePromise
  savePromise = performSaveChanges().finally(() => { savePromise = null })
  return savePromise
}
async function performSaveChanges() {`, file);

  // The button action must report success/failure, not silently do nothing.
  s += `
/** Explicit button action; always fetches from Supabase after pending saves. */
export async function refreshNow() {
  syncState.toast = ''
  try {
    if (!cloudConfigured) {
      reloadLocalAppointments(true)
      return
    }
    if (!currentUserId) throw new Error('Not connected to Supabase. Sign in again to connect.')
    await refreshAll(false, true)
    if (syncState.error) throw new Error(syncState.error)
    syncState.toast = 'Appointments and notifications refreshed from Supabase.'
  } catch (e) {
    syncState.error = 'Refresh failed: ' + (e.message || e)
  }
}
`;
  return s;
}
function patchedToolbar(source, file) {
  if (source.includes('refreshNow') && source.includes('@click="refreshNow"')) return null;
  let s = replaceOne(source,
    'syncState, cloudConfigured, refreshAll, enableDesktopAlerts, markRead',
    'syncState, cloudConfigured, refreshNow, enableDesktopAlerts, markRead', file);
  s = replaceOne(s,
    '@click="refreshAll()"', '@click="refreshNow"', file);
  return s;
}

for (const app of ['mobile-app', 'staff-website']) {
  const service = path.join(root, app, 'src', 'services', 'clinicSync.js');
  const toolbar = path.join(root, app, 'src', 'services', 'SyncToolbar.vue');
  ensure(fs.existsSync(service), `Cannot find ${service}. Run the Supabase sync installer first.`);
  ensure(fs.existsSync(toolbar), `Cannot find ${toolbar}. Run the Supabase sync installer first.`);
  const updatedService = patchedService(fs.readFileSync(service, 'utf8'), service);
  const updatedToolbar = patchedToolbar(fs.readFileSync(toolbar, 'utf8'), toolbar);
  ensure((updatedService === null) === (updatedToolbar === null), `${app}: inconsistent hotfix state; stopping without changes.`);
  if (updatedService !== null) {
    edits.set(service, updatedService);
    edits.set(toolbar, updatedToolbar);
  }
}
if (!edits.size) {
  console.log('Refresh hotfix already applied to both ClinicFlow applications.');
  process.exit(0);
}
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = path.join(os.homedir(), 'ClinicFlowBackups', `refresh-fix-${stamp}`);
for (const [file, contents] of edits) {
  const relative = path.relative(root, file);
  const backed = path.join(backup, relative);
  fs.mkdirSync(path.dirname(backed), { recursive: true });
  fs.copyFileSync(file, backed);
  fs.writeFileSync(file, contents, 'utf8');
  console.log('Updated:', relative);
}
console.log('\nSaved originals to:', backup);
console.log('Next: npm.cmd run build in EACH application.');
console.log('Cloud sync requires Supabase env vars in each local app and Vercel project.');
