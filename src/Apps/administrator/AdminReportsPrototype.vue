<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { clinic, staff, day, niceDate, niceTime, ordered, book, update, queue, editAppointment, updateStaff, isWithinShift, WEEKDAYS } from './adminPrototypeStore.js'

const tab = ref('overview')
const period = ref('all')
const notice = ref('')
const ALERT_RATE = 15 // cancellation / no-show rate (%) that gets flagged
const MIN_FOR_ALERT = 5 // ignore rates based on very few appointments
const visitTypes = ['Consultation', 'Follow-up', 'Check-up', 'Walk-in']

const pad = n => String(n).padStart(2, '0')
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hhmm = mins => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`

// Test datasets (fictional): known numbers so the rates can be checked by hand
const testSets = {
  d1: { label: 'Test dataset 1', counts: { Completed: 14, Cancelled: 3, 'No show': 2, Scheduled: 1 } },
  d2: { label: 'Test dataset 2', counts: { Completed: 22, Cancelled: 0, 'No show': 0, Scheduled: 3 } },
  d3: { label: 'Test dataset 3', counts: { Completed: 7, Cancelled: 4, 'No show': 1, Scheduled: 0 } },
  d4: { label: 'Test dataset 4', counts: { Completed: 20, Cancelled: 6, 'No show': 3, Scheduled: 1 } },
  d5: { label: 'Test dataset 5', counts: { Completed: 3, Cancelled: 2, 'No show': 3, Scheduled: 0 } },
}
function makeRows(key, counts) {
  const list = []
  for (const [status, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i++) {
      list.push({
        id: key + '-' + list.length,
        patient: 'Test patient ' + (list.length + 1),
        doctor: staff[list.length % staff.length].name,
        date: day(),
        time: hhmm(8 * 60 + list.length * 15),
        reason: ['Check-up', 'Follow-up', 'Consultation'][list.length % 3],
        status,
        confirmed: true,
      })
    }
  }
  return list
}
for (const key in testSets) testSets[key].rows = makeRows(key, testSets[key].counts)

// Test dataset 6: six months of history so the monthly report has something to compare.
// Three months ago has a deliberate cancellation spike to show the alert.
function makeHistory() {
  const list = []
  const pattern = ['Completed', 'Completed', 'Cancelled', 'Completed', 'Completed', 'No show', 'Completed', 'Completed', 'Completed', 'Completed']
  const now = new Date()
  for (let m = 5; m >= 0; m--) {
    for (let i = 0; i < 16 + (5 - m) * 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1 + (i * 3) % 28, 12)
      if (d > now) continue
      list.push({
        id: 'h-' + list.length,
        patient: 'Test patient ' + (list.length + 1),
        doctor: staff[i % staff.length].name,
        date: ymd(d),
        time: hhmm(8 * 60 + (i % 16) * 30),
        reason: visitTypes[i % 3],
        status: m === 3 && i % 4 === 0 ? 'Cancelled' : pattern[(i + m) % pattern.length],
        confirmed: true,
      })
    }
  }
  return list
}
testSets.d6 = { label: 'Test dataset 6 (6 months)', rows: makeHistory() }

// ---------- Reporting data ----------
const dataset = ref('live')
const isLive = computed(() => dataset.value === 'live')
const source = computed(() => isLive.value ? clinic.appointments : testSets[dataset.value].rows)
const monthKey = date => date.slice(0, 7)
const monthLabel = key => new Date(`${key}-01T12:00:00`).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
const months = computed(() => [...new Set(source.value.map(a => monthKey(a.date)))].sort().reverse())
const periodLabel = computed(() => period.value === 'all' ? 'all dates' : period.value === 'today' ? 'today' : monthLabel(period.value))
watch(dataset, () => {
  if (!['all', 'today'].includes(period.value) && !months.value.includes(period.value)) period.value = 'all'
})
const rows = computed(() => source.value.filter(a =>
  period.value === 'all' || (period.value === 'today' ? a.date === day() : monthKey(a.date) === period.value)))

const pct = (n, d) => d ? Math.round(n / d * 100) : 0
function summarize(list) {
  const count = s => list.filter(a => a.status === s).length
  const total = list.length
  const cancelled = count('Cancelled')
  const noShows = count('No show')
  return { total, checked: count('Checked in'), completed: count('Completed'), cancelled, noShows, rate: pct(cancelled, total), noShowRate: pct(noShows, total) }
}
const stats = computed(() => summarize(rows.value))
const monthly = computed(() => months.value.map(key => ({ key, label: monthLabel(key), ...summarize(source.value.filter(a => monthKey(a.date) === key)) })))
const flagged = m => m.total >= MIN_FOR_ALERT && (m.rate >= ALERT_RATE || m.noShowRate >= ALERT_RATE)

const perDoctor = computed(() => staff.map(s => {
  const mine = rows.value.filter(a => a.doctor === s.name)
  const cancelled = mine.filter(a => a.status === 'Cancelled').length
  return { ...s, count: mine.length, cancelled, rate: pct(cancelled, mine.length) }
}))
const maxCount = computed(() => Math.max(1, ...perDoctor.value.map(s => s.count)))
const services = computed(() => [...new Set(rows.value.map(a => a.reason))])
const perService = computed(() => services.value.map(name => ({ name, count: rows.value.filter(a => a.reason === name).length })))
const maxService = computed(() => Math.max(1, ...perService.value.map(s => s.count)))

// ---------- Problems worth flagging ----------
const isActive = a => ['Scheduled', 'Checked in'].includes(a.status)
const outsideHours = computed(() => ordered(clinic.appointments.filter(a => a.date >= day() && isActive(a) && !isWithinShift(a))))
const outsideFor = name => outsideHours.value.filter(a => a.doctor === name).length
const alerts = computed(() => {
  const list = []
  for (const m of monthly.value) {
    if (m.total < MIN_FOR_ALERT) continue
    if (m.rate >= ALERT_RATE) list.push(`${m.label}: cancellation rate ${m.rate}% (${m.cancelled} of ${m.total})`)
    if (m.noShowRate >= ALERT_RATE) list.push(`${m.label}: no-show rate ${m.noShowRate}% (${m.noShows} of ${m.total})`)
  }
  for (const p of perDoctor.value) {
    if (p.count >= MIN_FOR_ALERT && p.rate >= ALERT_RATE) list.push(`${p.name}: ${p.rate}% of visits cancelled (${periodLabel.value})`)
  }
  if (isLive.value && outsideHours.value.length) list.push(`${outsideHours.value.length} upcoming appointment(s) fall outside the clinician's working hours`)
  return list
})

// ---------- Appointment management (same tools as the front desk) ----------
const show = ref('upcoming')
const search = ref('')
const managed = computed(() => ordered(clinic.appointments.filter(a =>
  (show.value === 'all' || a.date >= day()) &&
  `${a.patient} ${a.doctor} ${a.status} ${a.reason}`.toLowerCase().includes(search.value.trim().toLowerCase()))))
const waiting = computed(() => queue())
function act(a, status) {
  update(a.id, status)
  notice.value = `${a.patient}: ${status}.`
}

const blankForm = () => ({ patient: '', doctor: staff[0].name, date: day(), time: '09:00', reason: 'Consultation', walkIn: false })
const editingId = ref(null) // null = form closed, 'new' = booking, number = editing that appointment
const form = reactive(blankForm())
function openForm(a) {
  editingId.value = a ? a.id : 'new'
  Object.assign(form, blankForm(), a ? { patient: a.patient, doctor: a.doctor, date: a.date, time: a.time, reason: a.reason } : {})
}
function toggleForm() {
  if (editingId.value === null) openForm()
  else editingId.value = null
}
const formWarning = computed(() => editingId.value !== null && form.date && form.time && !isWithinShift(form)
  ? `${form.doctor} isn't scheduled to work at this time. You can still save, but check the staff schedule.` : '')
function saveForm() {
  if (!form.patient.trim() || !form.date || !form.time) return
  if (editingId.value === 'new') {
    book(form, form.walkIn)
    notice.value = `${form.walkIn ? 'Walk-in checked in' : 'Appointment booked'} for ${form.patient.trim()}.`
  } else {
    editAppointment(editingId.value, form)
    notice.value = `Appointment updated for ${form.patient.trim()}.`
  }
  editingId.value = null
}

// ---------- Staff schedule editing (administrators only) ----------
const editingStaff = ref('')
const staffForm = reactive({ start: '', end: '', room: '', days: [] })
const staffError = ref('')
function editStaff(p) {
  editingStaff.value = p.name
  Object.assign(staffForm, { start: p.start, end: p.end, room: p.room, days: [...p.days] })
  staffError.value = ''
}
function saveStaff() {
  if (!staffForm.start || !staffForm.end || staffForm.start >= staffForm.end) {
    staffError.value = 'End time must be after start time.'
    return
  }
  if (!staffForm.days.length) {
    staffError.value = 'Pick at least one working day.'
    return
  }
  const name = editingStaff.value
  updateStaff(name, staffForm)
  const affected = outsideFor(name)
  notice.value = `${name}'s schedule updated.` + (affected ? ` ${affected} upcoming appointment(s) now fall outside these hours; reschedule them in Appointments.` : '')
  editingStaff.value = ''
}

// ---------- CSV exports ----------
function downloadCsv(header, cells, filename) {
  const csv = [header, ...cells].map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
function downloadReport() {
  downloadCsv(['Patient', 'Clinician', 'Date', 'Time', 'Visit type', 'Status'],
    ordered(rows.value).map(a => [a.patient, a.doctor, a.date, a.time, a.reason, a.status]),
    'ClinicFlow_appointment_report.csv')
}
function downloadMonthly() {
  downloadCsv(['Month', 'Appointments', 'Completed', 'Cancelled', 'No-shows', 'Cancellation rate (%)', 'No-show rate (%)'],
    monthly.value.map(m => [m.label, m.total, m.completed, m.cancelled, m.noShows, m.rate, m.noShowRate]),
    'ClinicFlow_monthly_report.csv')
}
</script>

<template>
  <div class="admin-screen">
    <div class="admin-wrap">
      <div class="admin-heading"><div><p class="admin-overline">ADMINISTRATOR PORTAL</p><h1>Clinic overview</h1><p class="admin-muted">Admin Reports Prototype - Celeste (fictional data) </p></div><div class="admin-controls"><label>Data source<select v-model="dataset"><option value="live">Live demo data</option><option v-for="(set, key) in testSets" :key="key" :value="key">{{ set.label }}</option></select></label><label>Reporting period<select v-model="period"><option value="all">All dates</option><option value="today">Today only</option><optgroup label="Month"><option v-for="m in months" :key="m" :value="m">{{ monthLabel(m) }}</option></optgroup></select></label><button class="admin-export" @click="downloadReport">Export CSV ↗</button></div></div>
      <div class="admin-stats">
        <article><span>Total appointments</span><strong>{{ stats.total }}</strong><small>Selected reporting period</small></article>
        <article><span>Checked in</span><strong>{{ stats.checked }}</strong><small>Waiting to be seen</small></article>
        <article><span>Completed</span><strong>{{ stats.completed }}</strong><small>Finished visits</small></article>
        <article><span>Cancellation rate</span><strong>{{ stats.rate }}%</strong><small>{{ stats.cancelled }} cancellations</small></article>
        <article><span>No-show rate</span><strong>{{ stats.noShowRate }}%</strong><small>{{ stats.noShows }} no-shows</small></article>
      </div>
      <nav class="admin-tabs" aria-label="Administrator dashboard views">
        <button v-for="t in [['overview','Overview'],['appointments','Appointments'],['queue','Waiting list'],['staff','Staff schedule'],['reports','Reports']]" :key="t[0]" :class="{ active: tab===t[0] }" @click="tab=t[0]">{{ t[1] }}<span v-if="t[0]==='queue'" class="admin-badge">{{ waiting.length }}</span></button>
      </nav>
      <p v-if="notice" class="admin-notice" role="status">{{ notice }}</p>

      <!-- OVERVIEW -->
      <div v-if="tab === 'overview'" class="admin-grid">
        <section class="admin-panel"><div class="admin-panel-head"><div><h2>Appointments by clinician</h2><p>Distribution across your staff</p></div></div><div v-for="person in perDoctor" :key="person.name" class="admin-bar-row"><div><strong>{{ person.name }}</strong><span>{{ person.count }} visits</span></div><div class="admin-track"><span :style="{ width: (person.count/maxCount*100) + '%' }"></span></div></div></section>
        <section class="admin-panel"><div class="admin-panel-head"><div><h2>Appointments by service</h2><p>Which visit types are booked most</p></div></div><div v-for="person in perService" :key="person.name" class="admin-bar-row"><div><strong>{{ person.name }}</strong><span>{{ person.count }} visits</span></div><div class="admin-track"><span :style="{ width: (person.count/maxService*100) + '%' }"></span></div></div></section>
        <section class="admin-panel"><div class="admin-panel-head"><div><h2>Appointment status</h2><p>Live appointment summary</p></div></div><div v-for="status in ['Scheduled','Checked in','In progress','Completed','Cancelled','No show']" :key="status" class="admin-status-row"><span>{{ status }}</span><strong>{{ rows.filter(a => a.status === status).length }}</strong></div></section>
        <section class="admin-panel">
          <div class="admin-panel-head"><div><h2>Needs attention</h2><p>Rates at or above {{ ALERT_RATE }}% and scheduling conflicts</p></div></div>
          <ul v-if="alerts.length" class="admin-alerts"><li v-for="msg in alerts" :key="msg">{{ msg }}</li></ul>
          <p v-else class="admin-muted">Nothing flagged for this data.</p>
        </section>
      </div>

      <!-- APPOINTMENT MANAGEMENT / WAITING LIST: live data only -->
      <section v-else-if="(tab === 'appointments' || tab === 'queue') && !isLive" class="admin-panel">
        <div class="admin-panel-head"><div><h2>Live data only</h2><p>Test datasets are read-only. Switch to live demo data to manage appointments.</p></div><button class="admin-export" @click="dataset = 'live'">Use live demo data</button></div>
      </section>

      <section v-else-if="tab === 'appointments'" class="admin-panel">
        <div class="admin-panel-head">
          <div><h2>Appointment management</h2><p>Same tools as the front desk: book, edit, check in, cancel.</p></div>
          <button class="admin-export" @click="toggleForm">{{ editingId === null ? '+ New appointment' : 'Close form' }}</button>
        </div>
        <form v-if="editingId !== null" class="admin-form" @submit.prevent="saveForm">
          <h3>{{ editingId === 'new' ? 'Book an appointment / add walk-in' : 'Edit appointment' }}</h3>
          <label>Patient name<input v-model="form.patient" required maxlength="80" placeholder="e.g. Morgan Chen" /></label>
          <label>Clinician<select v-model="form.doctor"><option v-for="s in staff" :key="s.name">{{ s.name }}</option></select></label>
          <label>Date<input v-model="form.date" type="date" required /></label>
          <label>Time<input v-model="form.time" type="time" required /></label>
          <label>Visit type<select v-model="form.reason"><option v-for="r in visitTypes" :key="r">{{ r }}</option></select></label>
          <label v-if="editingId === 'new'" class="admin-check"><input v-model="form.walkIn" type="checkbox" /> Check in now (walk-in)</label>
          <p v-if="formWarning" class="admin-warn">{{ formWarning }}</p>
          <div class="admin-form-actions"><button type="submit" class="admin-export">{{ editingId === 'new' ? 'Save appointment' : 'Save changes' }}</button><button type="button" class="admin-btn" @click="editingId = null">Cancel</button></div>
        </form>
        <div class="admin-filters">
          <input v-model="search" placeholder="Search patient, clinician or status" aria-label="Search appointments" />
          <select v-model="show" aria-label="Which appointments to show"><option value="upcoming">Upcoming</option><option value="all">All dates</option></select>
        </div>
        <div class="admin-table-wrap"><table><thead><tr><th>Patient</th><th>Date &amp; time</th><th>Clinician</th><th>Status</th><th>Confirmed</th><th>Actions</th></tr></thead><tbody>
          <tr v-for="a in managed" :key="a.id" :class="{ 'admin-over': isActive(a) && !isWithinShift(a) }">
            <td><strong>{{ a.patient }}</strong><small class="admin-sub">{{ a.reason }}</small></td>
            <td>{{ niceDate(a.date) }}<small class="admin-sub">{{ niceTime(a.time) }}<span v-if="isActive(a) && !isWithinShift(a)" class="admin-flag"> · outside clinician hours</span></small></td>
            <td>{{ a.doctor }}</td>
            <td><span class="admin-chip" :class="a.status.replaceAll(' ','-').toLowerCase()">{{ a.status }}</span></td>
            <td>{{ a.confirmed ? 'Confirmed' : a.status === 'Scheduled' ? 'Pending' : '—' }}</td>
            <td><div class="admin-actions">
              <button v-if="isActive(a)" class="admin-btn" @click="openForm(a)">Edit</button>
              <button v-if="a.status === 'Scheduled'" class="admin-btn" @click="act(a, 'Checked in')">Check in</button>
              <button v-if="a.status === 'Scheduled'" class="admin-btn" @click="act(a, 'No show')">No-show</button>
              <button v-if="isActive(a)" class="admin-btn danger" @click="act(a, 'Cancelled')">Cancel</button>
              <button v-if="a.status === 'Cancelled'" class="admin-btn" @click="act(a, 'Scheduled')">Restore</button>
              <span v-if="['Completed','In progress','No show'].includes(a.status)">—</span>
            </div></td>
          </tr>
        </tbody></table></div>
        <p v-if="!managed.length" class="admin-muted">No matching appointments.</p>
      </section>

      <section v-else-if="tab === 'queue'" class="admin-panel">
        <div class="admin-panel-head"><div><h2>Live waiting list</h2><p>Patients appear here after being checked in.</p></div><span class="admin-chip">{{ waiting.length }} waiting</span></div>
        <div v-for="(a, index) in waiting" :key="a.id" class="admin-queue-row">
          <span class="admin-position">{{ index + 1 }}</span>
          <div><strong>{{ a.patient }}</strong><p class="admin-muted">{{ a.doctor }} · {{ niceTime(a.time) }} · {{ a.reason }}</p></div>
          <div class="admin-actions"><button class="admin-export" @click="act(a, 'In progress')">Call patient</button><button class="admin-btn danger" @click="act(a, 'Cancelled')">Remove</button></div>
        </div>
        <p v-if="!waiting.length" class="admin-muted">No patients in the waiting list.</p>
      </section>

      <!-- STAFF SCHEDULE: editable by administrators only -->
      <section v-else-if="tab === 'staff'" class="admin-panel">
        <div class="admin-panel-head"><div><h2>Staff schedule</h2><p>Working days, hours and rooms. Only administrators can change these.</p></div></div>
        <div class="admin-table-wrap"><table><thead><tr><th>Staff member</th><th>Working days</th><th>Hours</th><th>Room</th><th>Appointments</th><th></th></tr></thead><tbody>
          <tr v-for="person in perDoctor" :key="person.name">
            <td><strong>{{ person.name }}</strong><small class="admin-sub">{{ person.role }}</small></td>
            <template v-if="editingStaff === person.name">
              <td><div class="admin-days"><label v-for="d in WEEKDAYS" :key="d"><input v-model="staffForm.days" type="checkbox" :value="d" />{{ d }}</label></div></td>
              <td><div class="admin-time-pair"><input v-model="staffForm.start" type="time" class="admin-cell-input" aria-label="Start time" /> – <input v-model="staffForm.end" type="time" class="admin-cell-input" aria-label="End time" /></div><p v-if="staffError" class="admin-warn">{{ staffError }}</p></td>
              <td><input v-model="staffForm.room" class="admin-cell-input" maxlength="30" aria-label="Room" /></td>
              <td>{{ person.count }}</td>
              <td><div class="admin-actions"><button class="admin-export" @click="saveStaff">Save</button><button class="admin-btn" @click="editingStaff = ''">Cancel</button></div></td>
            </template>
            <template v-else>
              <td>{{ person.days.join(', ') }}</td>
              <td>{{ person.shift }}</td>
              <td>{{ person.room }}</td>
              <td>{{ person.count }}<small v-if="outsideFor(person.name)" class="admin-sub admin-flag">{{ outsideFor(person.name) }} outside hours</small></td>
              <td><button class="admin-btn" @click="editStaff(person)">Edit schedule</button></td>
            </template>
          </tr>
        </tbody></table></div>
      </section>

      <!-- REPORTS -->
      <div v-else-if="tab === 'reports'">
        <section class="admin-panel">
          <div class="admin-panel-head"><div><h2>Monthly report</h2><p>Clinic operations and cancellation rates by month. Rates at or above {{ ALERT_RATE }}% are flagged.</p></div><button class="admin-export" @click="downloadMonthly">Download monthly CSV</button></div>
          <div class="admin-table-wrap"><table><thead><tr><th>Month</th><th>Appointments</th><th>Completed</th><th>Cancelled</th><th>No-shows</th><th>Cancellation rate</th><th>No-show rate</th></tr></thead><tbody>
            <tr v-for="m in monthly" :key="m.key" :class="{ 'admin-over': flagged(m) }">
              <td><strong>{{ m.label }}</strong></td><td>{{ m.total }}</td><td>{{ m.completed }}</td><td>{{ m.cancelled }}</td><td>{{ m.noShows }}</td>
              <td><div class="admin-rate"><span :class="{ 'admin-flag': m.total >= MIN_FOR_ALERT && m.rate >= ALERT_RATE }">{{ m.rate }}%</span><div class="admin-track admin-mini"><span :style="{ width: m.rate + '%' }"></span></div></div></td>
              <td><span :class="{ 'admin-flag': m.total >= MIN_FOR_ALERT && m.noShowRate >= ALERT_RATE }">{{ m.noShowRate }}%</span></td>
            </tr>
          </tbody></table></div>
          <p v-if="!monthly.length" class="admin-muted">No appointments to report on.</p>
        </section>
        <section class="admin-panel">
          <div class="admin-panel-head"><div><h2>Cancellations by clinician</h2><p>For {{ periodLabel }}</p></div></div>
          <div v-for="person in perDoctor" :key="person.name" class="admin-bar-row"><div><strong>{{ person.name }}</strong><span :class="{ 'admin-flag': person.count >= MIN_FOR_ALERT && person.rate >= ALERT_RATE }">{{ person.rate }}% · {{ person.cancelled }} of {{ person.count }}</span></div><div class="admin-track"><span :style="{ width: person.rate + '%' }"></span></div></div>
        </section>
        <section class="admin-panel"><div class="admin-panel-head"><div><h2>Appointment report</h2><p>Changes made in Front Desk and Doctor/Nurse appear here.</p></div><button class="admin-export" @click="downloadReport">Download CSV</button></div><div class="admin-table-wrap"><table><thead><tr><th>Patient</th><th>Date</th><th>Clinician</th><th>Type</th><th>Status</th><th>Confirmed</th></tr></thead><tbody><tr v-for="a in ordered(rows)" :key="a.id"><td>{{ a.patient }}</td><td>{{ niceDate(a.date) }} · {{ niceTime(a.time) }}</td><td>{{ a.doctor }}</td><td>{{ a.reason }}</td><td><span class="admin-chip" :class="a.status.replaceAll(' ','-').toLowerCase()">{{ a.status }}</span></td><td>{{ a.confirmed ? 'Yes' : 'No' }}</td></tr></tbody></table></div><p v-if="!rows.length" class="admin-muted">No records in this period.</p></section>
      </div>
      <p class="admin-footer"></p>
    </div>
  </div>
</template>

<style scoped>
.admin-screen{min-height:100dvh;background:#f3f6fa;color:#22384c;font:14px Inter,Arial,sans-serif}.admin-wrap{max-width:1200px;margin:auto;padding:36px 22px 55px}.admin-heading{display:flex;justify-content:space-between;align-items:end;gap:20px}.admin-overline{letter-spacing:1.7px;font-size:11px;color:#2773a8;font-weight:800;margin:0 0 9px}.admin-heading h1{font-size:clamp(27px,4vw,36px);letter-spacing:-1px;margin:0}.admin-muted{color:#8092a3;margin:9px 0 0}.admin-controls{display:flex;align-items:end;gap:11px}.admin-controls label{display:grid;gap:7px;font-size:12px;font-weight:700;color:#60768b}.admin-controls select{padding:10px 12px;border:1px solid #cad9e6;border-radius:8px;background:#fff;color:#31495d}.admin-export{background:#2874ac;color:#fff;border:1px solid #2874ac;border-radius:8px;padding:11px 14px;white-space:nowrap;font-weight:700}.admin-export:hover{background:#1e5f91}.admin-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin:28px 0}.admin-stats article{background:#fff;border:1px solid #e0e9f1;border-radius:13px;padding:21px}.admin-stats span,.admin-stats small{display:block;color:#71879b;font-size:12px}.admin-stats strong{display:block;font-size:35px;color:#246ca4;margin:8px 0}.admin-tabs{border-bottom:1px solid #d7e2eb;display:flex;gap:6px;overflow-x:auto}.admin-tabs button{padding:13px 18px;background:none;border:0;border-bottom:3px solid transparent;color:#698199;font-weight:700;white-space:nowrap}.admin-tabs button.active{border-bottom-color:#2474ae;color:#226398}.admin-grid{display:grid;grid-template-columns:1.25fr 1fr;gap:18px}.admin-panel{padding:24px;margin-bottom:20px;min-height:260px;background:#fff;border:1px solid #e1eaf2;border-radius:0 0 13px 13px}.admin-grid .admin-panel{border-radius:0 0 13px 13px}.admin-panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:25px}.admin-panel-head h2{font-size:19px;margin:0}.admin-panel-head p{color:#7e8da0;margin:7px 0 0;font-size:12px}.admin-bar-row{margin-bottom:22px}.admin-bar-row>div:first-child{display:flex;justify-content:space-between;gap:10px;font-size:12px;margin-bottom:9px}.admin-bar-row span{color:#74889a}.admin-track{height:11px;border-radius:20px;background:#e9f0f6;overflow:hidden}.admin-track span{display:block;background:#3381b9;height:100%;border-radius:20px}.admin-status-row{display:flex;justify-content:space-between;padding:12px 2px;border-bottom:1px solid #ecf2f5}.admin-status-row strong{color:#2b6594}.admin-table-wrap{overflow-x:auto}table{border-collapse:collapse;text-align:left;width:100%;min-width:690px}th{background:#f5f8fb;text-transform:uppercase;color:#8291a0;letter-spacing:.7px;font-size:11px;padding:14px}td{padding:15px 14px;border-bottom:1px solid #ecf0f4}.admin-chip{display:inline-block;border-radius:30px;padding:5px 9px;background:#edf2f6;color:#677b8c;font-size:11px;font-weight:700}.admin-chip.checked-in{background:#e6f7ee;color:#177a4c}.admin-chip.cancelled,.admin-chip.no-show{background:#ffefeb;color:#ae4f43}.admin-chip.completed{background:#e5f8f0;color:#147344}.admin-chip.in-progress{background:#e6f1ff;color:#246ca7}.admin-footer{color:#8494a5;font-size:12px;text-align:center;margin-top:23px}
/* additions: management, schedule editing, monthly report */
.admin-badge{display:inline-block;margin-left:6px;min-width:18px;padding:1px 6px;border-radius:20px;background:#e6f1ff;color:#246ca7;font-size:11px}
.admin-notice{background:#e8f3fb;border:1px solid #c6def0;color:#1f5f8f;border-radius:9px;padding:11px 14px;margin:16px 0 0}
.admin-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:20px;padding:18px;border:1px solid #e0e9f1;border-radius:10px;background:#f8fbfd}
.admin-form h3{grid-column:1/-1;margin:0;font-size:15px}
.admin-form label{display:grid;gap:6px;font-size:12px;font-weight:700;color:#60768b}
.admin-form label.admin-check{display:flex;align-items:center;gap:8px;align-self:end;padding-bottom:10px}
.admin-form input:not([type=checkbox]),.admin-form select,.admin-filters input,.admin-filters select,.admin-cell-input{padding:9px 10px;border:1px solid #cad9e6;border-radius:8px;background:#fff;color:#31495d;font:inherit}
.admin-form-actions{grid-column:1/-1;display:flex;gap:8px}
.admin-warn{grid-column:1/-1;color:#ae4f43;font-size:12px;margin:6px 0 0}
.admin-filters{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px}
.admin-filters input{flex:1;min-width:200px}
.admin-actions{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.admin-btn{background:#fff;border:1px solid #cad9e6;color:#2b5f8a;border-radius:7px;padding:7px 10px;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap}
.admin-btn:hover{background:#f1f6fa}
.admin-btn.danger{color:#ae4f43;border-color:#efc9c2}
.admin-sub{display:block;color:#8092a3;font-size:12px;margin-top:3px}
.admin-flag{color:#ae4f43;font-weight:700}
tr.admin-over td{background:#fff8f6}
.admin-queue-row{display:flex;align-items:center;gap:14px;padding:14px 4px;border-bottom:1px solid #ecf2f5}
.admin-queue-row>div:nth-child(2){flex:1}
.admin-queue-row p{margin:4px 0 0;font-size:12px}
.admin-position{width:30px;height:30px;flex:none;border-radius:50%;background:#e6f1ff;color:#246ca7;display:grid;place-items:center;font-weight:800}
.admin-days{display:flex;flex-wrap:wrap;gap:4px 10px;max-width:220px}
.admin-days label{display:flex;align-items:center;gap:4px;font-size:12px}
.admin-time-pair{display:flex;align-items:center;gap:6px}
.admin-cell-input{width:100%;min-width:90px;box-sizing:border-box}
.admin-alerts{margin:0;padding-left:18px;color:#8a3d33}
.admin-alerts li{margin-bottom:10px}
.admin-rate{display:flex;align-items:center;gap:10px}
.admin-rate>span{min-width:36px}
.admin-track.admin-mini{height:8px;width:110px}
@media(max-width:750px){.admin-wrap{padding:25px 13px}.admin-heading{align-items:stretch;flex-direction:column}.admin-controls{justify-content:space-between;flex-wrap:wrap}.admin-stats{grid-template-columns:repeat(2,1fr);gap:9px}.admin-stats article{padding:14px}.admin-stats strong{font-size:28px}.admin-grid{grid-template-columns:1fr;gap:0}.admin-panel{padding:18px 13px}.admin-tabs button{padding:12px 10px;font-size:12px}.admin-queue-row{flex-wrap:wrap}}
</style>

