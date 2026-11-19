/**
 * ClinicFlow 15-minute appointments and expandable patient cards.
 * Run from the repository root: node .\Apply-ClinicFlow-Booking-Update.cjs
 * Uses the existing Vue components; writes only recognized source structures.
 * Backups are stored outside the repository, at ~/ClinicFlowBackups/.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = process.cwd();
const plan = new Map();
const details = [];
const unchanged = [];
const missing = [];
const read = file => fs.readFileSync(file, 'utf8');
const exists = file => fs.existsSync(file);
const full = rel => path.join(root, rel);
function put(rel, body) {
  const file = full(rel);
  if (!exists(file) || read(file) !== body) plan.set(file, body);
}
function importOnce(code, statement, componentName) {
  if (code.includes(componentName)) return code;
  if (!code.includes('<script setup>')) throw Error('Unrecognized Vue script layout');
  return code.replace('<script setup>', '<script setup>\n' + statement);
}
const availability = String.raw`/** Time-slot validation shared by patient, doctor and front desk. */
const inactive = new Set(['cancelled', 'canceled', 'no show']);
const minutes = time => {
  const value = String(time || '');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
};
export const isQuarterHour = time => {
  const n = minutes(time);
  return n !== null && n % 15 === 0;
};
export function isSlotTaken(appointments, doctor, date, time, excludeId = null) {
  const t = minutes(time);
  if (t === null || !date || !doctor) return false;
  return (appointments || []).some(a =>
    String(a.id) !== String(excludeId) &&
    String(a.doctor || '').trim().toLowerCase() === String(doctor).trim().toLowerCase() &&
    a.date === date &&
    !inactive.has(String(a.status || '').trim().toLowerCase()) &&
    minutes(a.time) !== null && Math.abs(minutes(a.time) - t) < 15
  );
}
export function assertBookableSlot(data, appointments, excludeId = null) {
  if (!data.doctor || !data.date || !data.time) throw Error('Choose a doctor, date and time.');
  if (!isQuarterHour(data.time)) throw Error('Appointments must start at :00, :15, :30 or :45.');
  if (isSlotTaken(appointments, data.doctor, data.date, data.time, excludeId))
    throw Error('That time is already booked. Choose one of the available time slots.');
  return true;
}
`;
const slotPicker = String.raw`<script setup>
import { computed, ref, watch } from 'vue'
import { loadBusySlots } from '../../services/clinicSync.js'
import { isSlotTaken } from './bookingAvailability.js'
const props = defineProps({
  modelValue: { type: String, default: '' },
  appointments: { type: Array, default: () => [] },
  doctor: { type: String, default: '' },
  date: { type: String, default: '' },
  excludeId: { default: null },
})
const emit = defineEmits(['update:modelValue'])
const serverBusy = ref(new Set())
const loading = ref(false)
const remoteError = ref('')
let activeRequest = 0
watch([() => props.date, () => props.doctor], async ([date, doctor]) => {
  const request = ++activeRequest
  serverBusy.value = new Set()
  remoteError.value = ''
  if (!date || !doctor) return
  loading.value = true
  try {
    const busy = await loadBusySlots(date, doctor)
    if (request === activeRequest) serverBusy.value = new Set(busy)
  } catch (error) {
    if (request === activeRequest) remoteError.value = 'Could not check shared availability. The server will still block conflicts.'
  } finally {
    if (request === activeRequest) loading.value = false
  }
}, { immediate: true })
// 96 possibilities cover the entire day; do not assume an office opening time.
const slots = computed(() => Array.from({ length: 96 }, (_, index) => {
  const hour = Math.floor(index / 4)
  const minute = index % 4 * 15
  const value = String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0')
  const displayHour = hour % 12 || 12
  return {
    value,
    label: displayHour + ':' + String(minute).padStart(2, '0') + (hour >= 12 ? ' PM' : ' AM'),
    taken: serverBusy.value.has(value) || isSlotTaken(props.appointments, props.doctor, props.date, value, props.excludeId),
  }
}))
</script>

<template>
  <div class="cf-slot-picker">
    <select :value="modelValue" required aria-label="Appointment time" @change="emit('update:modelValue', $event.target.value)">
      <option value="" disabled>Select an available 15-minute slot</option>
      <option v-for="slot in slots" :key="slot.value" :value="slot.value" :disabled="slot.taken">
        {{ slot.label }}{{ slot.taken ? ' — Taken' : '' }}
      </option>
    </select>
    <small v-if="loading">Checking shared availability…</small>
    <small v-else-if="remoteError" role="alert">{{ remoteError }}</small>
    <small v-else>Greyed-out times are already booked for this clinician.</small>
  </div>
</template>

<style scoped>
.cf-slot-picker{display:block;min-width:0;width:100%}
.cf-slot-picker select{width:100%;min-height:41px;padding:9px;border-radius:8px;border:1px solid #cbd5e1;background:white;color:#25384a;font:inherit}
.cf-slot-picker option:disabled{color:#969da7;background:#ededed}
.cf-slot-picker small{display:block;color:#748193;margin-top:4px;font-size:12px}
</style>
`;
for (const app of ['mobile-app', 'staff-website']) {
  const shared = `${app}/src/Apps/shared`;
  if (!exists(full(`${shared}/demoStore.js`))) { missing.push(`${shared}/demoStore.js`); continue; }
  for (const [relative, marker] of [['bookingAvailability.js', 'Time-slot validation shared'], ['SlotPicker.vue', 'const serverBusy = ref(new Set())']]) {
    const output = full(`${shared}/${relative}`);
    if (exists(output) && !read(output).includes(marker))
      throw Error(`${shared}/${relative} already exists with unrelated code. No files were written.`);
  }
  put(`${shared}/bookingAvailability.js`, availability);
  put(`${shared}/SlotPicker.vue`, slotPicker);
  let store = read(full(`${shared}/demoStore.js`));
  if (!store.includes("import { assertBookableSlot } from './bookingAvailability.js'"))
    store = "import { assertBookableSlot } from './bookingAvailability.js'\n" + store;
  if (!/export function book\s*\(\s*data\s*,?/.test(store)) throw Error(`${shared}/demoStore.js: cannot find book(data). No files written.`);
  if (!store.includes('assertBookableSlot(data, clinic.appointments)'))
    store = store.replace(/(export function book\s*\(\s*data[^)]*\)\s*\{)/,
      '$1\n  assertBookableSlot(data, clinic.appointments);');
  put(`${shared}/demoStore.js`, store);
  details.push(`${shared}: shared 15-minute validation + occupied slot picker`);
}
function fixTimeInput(code, model, date, doctor) {
  const escaped = model.replaceAll('.', '\\.');
  const tag = new RegExp(`<input\\b(?=[^>]*\\bv-model=["']${escaped}["'])(?=[^>]*\\btype=["']time["'])[^>]*\\/?>`, 'g');
  let count = 0;
  code = code.replace(tag, () => {
    count++;
    return `<SlotPicker v-model="${model}" :date="${date}" :doctor="${doctor}" :appointments="clinic.appointments" />`;
  });
  return { code, count };
}
function handleBooking(rel, model, date, doctor, feedbackKey) {
  const file = full(rel);
  if (!exists(file)) { missing.push(rel); return; }
  let code = read(file);
  if (!code.includes('<script setup>')) { unchanged.push(rel + ' (different component structure)'); return; }
  const replaced = fixTimeInput(code, model, date, doctor);
  code = replaced.code;
  if (replaced.count) code = importOnce(code, "import SlotPicker from '../shared/SlotPicker.vue'", "import SlotPicker from '../shared/SlotPicker.vue'");
  const lines = code.split('\n');
  let catches = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*book\(\{/.test(lines[i]) || lines[i].includes('catch (error)') || (i > 0 && lines[i-1].trim() === 'try {')) continue;
    const indentation = lines[i].match(/^\s*/)[0];
    const call = lines[i].trim();
    if (!/\);?$/.test(call)) continue;
    lines[i] = `${indentation}try {\n${indentation}  ${call}\n${indentation}} catch (error) {\n${indentation}  ${feedbackKey}.value = error.message || 'The chosen slot is no longer available.'\n${indentation}  return\n${indentation}}`;
    catches++;
  }
  code = lines.join('\n');
  if (!replaced.count && !code.includes('SlotPicker') && !catches) { unchanged.push(rel + ' (no recognized booking code)'); return; }
  put(rel, code);
  details.push(`${rel}: ${replaced.count} time selector(s), ${catches} booking guard(s)`);
}
for (const app of ['mobile-app','staff-website']) {
  handleBooking(`${app}/src/Apps/front-desk/FrontDeskApp.vue`, 'form.time', 'form.date', 'form.doctor', 'notice');
  handleBooking(`${app}/src/Apps/doctor-nurse/DoctorNurseApp.vue`, 'newVisit.time', 'newVisit.date', 'doctor', 'message');
}
// The patient RLS policy exposes only their own appointments. The authenticated
// RPC returns occupied times (no patient identities) for all roles.
for (const app of ['mobile-app', 'staff-website']) {
  const rel = `${app}/src/services/clinicSync.js`;
  if (!exists(full(rel))) { missing.push(rel); continue; }
  let code = read(full(rel));
  if (!code.includes('export async function loadBusySlots(')) {
    if (!code.includes('const supabase =')) throw Error(`${rel}: unexpected cloud service structure`);
    code += String.raw`
export async function loadBusySlots(date, doctor) {
  if (!cloudConfigured || !supabase) return [];
  const { data, error } = await supabase.rpc('clinicflow_busy_slots', {
    p_date: date,
    p_doctor: doctor,
  });
  if (error) throw error;
  return (data || []).map(row => row.slot_time);
}
`;
    put(rel, code);
    details.push(`${rel}: secure occupied-time lookup`);
  }
}
const expansion = String.raw`
                <div class="cf-appointment-expansion">
                  <button type="button" class="cf-appointment-expand-toggle"
                    :aria-expanded="expandedAppointmentIds.has(appointment.id)"
                    @click="toggleAppointmentDetails(appointment.id)">
                    <span>Appointment details</span>
                    <span class="cf-appointment-chevron" :class="{ expanded: expandedAppointmentIds.has(appointment.id) }" aria-hidden="true">›</span>
                  </button>
                  <div v-if="expandedAppointmentIds.has(appointment.id)" class="cf-appointment-extra">
                    <p><strong>Office address:</strong> {{ clinicOfficeAddress }}</p>
                    <p><strong>Bring:</strong> Your health card, a current medication list, and any relevant documents.</p>
                  </div>
                </div>
`;
const expansionStyle = String.raw`
/* Expandable patient appointment details */
.cf-appointment-expansion{flex-basis:100%;width:100%;grid-column:1 / -1;margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0}
.cf-appointment-expand-toggle{display:flex;justify-content:space-between;align-items:center;width:100%;border:0;background:transparent;color:#1e5f96;padding:5px 0;font:inherit;font-weight:700;text-align:left;cursor:pointer}
.cf-appointment-chevron{display:inline-block;font-size:24px;line-height:1;transform:rotate(90deg);transition:transform .2s ease}
.cf-appointment-chevron.expanded{transform:rotate(-90deg)}
.cf-appointment-extra{padding:5px 0 2px;color:#39495b;font-size:13px;line-height:1.55}
.cf-appointment-extra p{margin:5px 0}
`;
function patchPatient(rel) {
  if (!exists(full(rel))) { missing.push(rel); return; }
  let code = read(full(rel));
  if (!code.includes('<script setup>')) { unchanged.push(rel + ' (different component structure)'); return; }
  let added = 0;
  // Install a picker only if the original page still has a native time input.
  const time = fixTimeInput(code, 'booking.time', 'booking.date', 'booking.doctor');
  code = time.code;
  if (time.count) code = importOnce(code, "import SlotPicker from '../shared/SlotPicker.vue'", "import SlotPicker from '../shared/SlotPicker.vue'");
  // Expand both Upcoming and All Appointments lists; don't replace the existing card content.
  code = code.replace(/<article\b[^>]*\bv-for=["']appointment in [^"']+["'][^>]*>[\s\S]*?<\/article>/g, article => {
    if (article.includes('cf-appointment-expansion')) return article;
    added++;
    return article.replace(/<\/article>$/, expansion + '              </article>');
  });
  if (added && !code.includes('function toggleAppointmentDetails(')) {
    const state = String.raw`
const expandedAppointmentIds = ref(new Set())
// Set VITE_CLINIC_OFFICE_ADDRESS in Vercel when you have a real address.
const clinicOfficeAddress = import.meta.env.VITE_CLINIC_OFFICE_ADDRESS || 'Address will be provided by the clinic.'
function toggleAppointmentDetails(id) {
  const next = new Set(expandedAppointmentIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedAppointmentIds.value = next
}
`;
    code = code.replace('</script>', state + '\n</script>');
    if (!/import\s*\{[^}]*\bref\b[^}]*\}\s*from\s*['"]vue['"]/.test(code.slice(0,code.indexOf('</script>'))))
      code = code.replace('<script setup>', "<script setup>\nimport { ref } from 'vue'");
  }
  if (added && code.includes('</style>') && !code.includes('/* Expandable patient appointment details */'))
    code = code.replace(/<\/style>\s*$/, expansionStyle + '\n</style>\n');
  const lines=code.split('\n');
  let guards=0;
  for (let i=0;i<lines.length;i++) {
    if (!/^\s*book\(\{/.test(lines[i]) || !/\);?$/.test(lines[i].trim()) || (i > 0 && lines[i-1].trim() === 'try {')) continue;
    const indent = lines[i].match(/^\s*/)[0];
    const call = lines[i].trim();
    lines[i] = `${indent}try {\n${indent}  ${call}\n${indent}} catch (error) {\n${indent}  statusMessage.value = error.message || 'That appointment slot is not available.'\n${indent}  return\n${indent}}`;
    guards++;
  }
  code=lines.join('\n');
  if (!time.count && !added && !guards) { unchanged.push(rel + ' (no recognized patient booking/cards)'); return; }
  put(rel, code);
  details.push(`${rel}: ${time.count} time selector(s), ${added} expandable list(s), ${guards} booking guard(s)`);
}
for (const app of ['mobile-app','staff-website']) {
  patchPatient(`${app}/src/Apps/patient/PatientApp.vue`);
  patchPatient(`${app}/src/Apps/patient/PatientWebApp.vue`);
}
if (!plan.size) { console.log('ClinicFlow booking updater: no changes needed (already applied or no matching components).'); process.exit(0); }
const backup = path.join(os.homedir(), 'ClinicFlowBackups', `booking-update-${new Date().toISOString().replace(/[:.]/g, '-')}`);
for (const [file] of plan) if (exists(file)) {
  const destination = path.join(backup, path.relative(root,file));
  fs.mkdirSync(path.dirname(destination), { recursive:true });
  fs.copyFileSync(file, destination);
}
for (const [file,body] of plan) {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  fs.writeFileSync(file, body);
}
console.log('ClinicFlow booking updater complete.');
console.log('Changed files:',plan.size);
console.log(details.join('\n'));
if(missing.length) console.log('\nMissing (not changed):\n'+missing.join('\n'));
if(unchanged.length) console.log('\nUnrecognized (not changed):\n'+unchanged.join('\n'));
console.log('Originals backed up in:',backup);
console.log('NEXT: npm.cmd run build in mobile-app and staff-website, then git diff and commit your intended files.');
