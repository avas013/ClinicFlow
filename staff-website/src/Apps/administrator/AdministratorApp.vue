<script setup>
import { ref, computed } from 'vue'
import {
  clinic, staff, day,
  ordered, queue, moveQueue
} from '../shared/demoStore.js'
import { t, formatDate, formatTime, formatShift, countLabel } from '../../language.js'

const tab = ref('overview')
const period = ref('all')
const rows = computed(() => clinic.appointments.filter(a =>
  period.value === 'all' || a.date === day()
))
const total = computed(() => rows.value.length)
const cancelled = computed(() => rows.value.filter(a => a.status === 'Cancelled').length)
const checked = computed(() => rows.value.filter(a => a.status === 'Checked in').length)
const completed = computed(() => rows.value.filter(a => a.status === 'Completed').length)
const rate = computed(() => total.value ? Math.round(cancelled.value / total.value * 100) : 0)
const perDoctor = computed(() => staff.map(s => ({
  ...s,
  count: rows.value.filter(a => a.doctor === s.name).length
})))
const maxCount = computed(() => Math.max(1, ...perDoctor.value.map(s => s.count)))
const waiting = computed(() => queue())

function downloadReport() {
  const header = ['Patient', 'Clinician', 'Date', 'Time', 'Visit type', 'Status'].map(label => t(label))
  const cells = ordered(rows.value).map(a =>
    [a.patient, t(a.doctor), formatDate(a.date), formatTime(a.time), t(a.reason), t(a.status)]
  )
  const csv = [header, ...cells]
    .map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(','))
    .join('\r\n')
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'ClinicFlow_appointment_report.csv'
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="admin-screen">
    <div class="admin-wrap">
      <div class="admin-heading">
        <div>
          <p class="admin-overline">{{ t('Administrator Portal') }}</p>
          <h1>{{ t('Clinic overview') }}</h1>
          <p class="admin-muted">{{ t('Operational insights') }}</p>
        </div>
        <div class="admin-controls">
          <label>{{ t('Reporting period') }}
            <select v-model="period">
              <option value="all">{{ t('All dates') }}</option>
              <option value="today">{{ t('Today only') }}</option>
            </select>
          </label>
          <button class="admin-export" type="button" @click="downloadReport">{{ t('Export CSV') }} ↗</button>
        </div>
      </div>

      <div class="admin-stats">
        <article><span>{{ t('Total appointments') }}</span><strong>{{ total }}</strong><small>{{ t('Selected reporting period') }}</small></article>
        <article><span>{{ t('Checked in') }}</span><strong>{{ checked }}</strong><small>{{ t('Waiting to be seen') }}</small></article>
        <article><span>{{ t('Completed') }}</span><strong>{{ completed }}</strong><small>{{ t('Finished visits') }}</small></article>
        <article><span>{{ t('Cancellation rate') }}</span><strong>{{ rate }}%</strong><small>{{ countLabel(cancelled, 'cancellation', 'cancellations') }}</small></article>
      </div>

      <nav class="admin-tabs" :aria-label="t('Administrator dashboard views')">
        <button
          v-for="item in [
            ['overview', 'Overview'],
            ['staff', 'Staff schedule'],
            ['queue', 'Waiting list'],
            ['reports', 'Reports']
          ]"
          :key="item[0]"
          type="button"
          :class="{ active: tab === item[0] }"
          @click="tab = item[0]"
        >{{ t(item[1]) }}</button>
      </nav>

      <div v-if="tab === 'overview'" class="admin-grid">
        <section class="admin-panel">
          <div class="admin-panel-head">
            <div><h2>{{ t('Appointments by clinician') }}</h2><p>{{ t('Distribution across your staff') }}</p></div>
          </div>
          <div v-for="person in perDoctor" :key="person.name" class="admin-bar-row">
            <div><strong>{{ person.name }}</strong><span>{{ countLabel(person.count, 'visit', 'visits') }}</span></div>
            <div class="admin-track"><span :style="{ width: (person.count/maxCount*100) + '%' }"></span></div>
          </div>
        </section>
        <section class="admin-panel">
          <div class="admin-panel-head">
            <div><h2>{{ t('Appointment status') }}</h2><p>{{ t('Live appointment summary') }}</p></div>
          </div>
          <div
            v-for="status in ['Scheduled', 'Checked in', 'In progress', 'Completed', 'Cancelled', 'No show']"
            :key="status"
            class="admin-status-row"
          >
            <span>{{ t(status) }}</span><strong>{{ rows.filter(a => a.status === status).length }}</strong>
          </div>
        </section>
      </div>

      <section v-else-if="tab === 'staff'" class="admin-panel">
        <div class="admin-panel-head">
          <div><h2>{{ t('Staff schedule') }}</h2><p>{{ t('Assignments for {date}', { date: formatDate(day()) }) }}</p></div>
        </div>
        <div class="admin-table-wrap">
          <table>
            <thead><tr><th>{{ t('Staff member') }}</th><th>{{ t('Role') }}</th><th>{{ t('Hours') }}</th><th>{{ t('Room') }}</th><th>{{ t('Appointments') }}</th></tr></thead>
            <tbody>
              <tr v-for="person in perDoctor" :key="person.name">
                <td><strong>{{ person.name }}</strong></td>
                <td>{{ t(person.role) }}</td>
                <td>{{ formatShift(person.shift) }}</td>
                <td>{{ t('Room {number}', { number: person.room.split(' ').at(-1) }) }}</td>
                <td>{{ person.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else-if="tab === 'queue'" class="admin-panel">
        <div class="admin-panel-head">
          <div>
            <h2>{{ t('Patient waiting list') }}</h2>
            <p>{{ t('Change the order in which checked-in patients are called.') }}</p>
          </div>
          <span class="admin-queue-count">{{ t('{count} waiting', { count: waiting.length }) }}</span>
        </div>
        <div v-for="(a, index) in waiting" :key="a.id" class="admin-queue-row">
          <span class="admin-queue-position">{{ index + 1 }}</span>
          <div class="admin-queue-info">
            <strong>{{ a.patient }}</strong>
            <p>{{ a.doctor }} · {{ formatTime(a.time) }}</p>
          </div>
          <div class="admin-queue-actions">
            <button type="button" :disabled="index === 0" :aria-label="t('Move {patient} up', { patient: a.patient })" @click="moveQueue(a.id, -1)">↑</button>
            <button type="button" :disabled="index === waiting.length - 1" :aria-label="t('Move {patient} down', { patient: a.patient })" @click="moveQueue(a.id, 1)">↓</button>
          </div>
        </div>
        <p v-if="!waiting.length" class="admin-muted">{{ t('No patients currently waiting.') }}</p>
      </section>

      <section v-else class="admin-panel">
        <div class="admin-panel-head">
          <div>
            <h2>{{ t('Appointment report') }}</h2>
            <p>{{ t('Changes made in Front Desk and Doctor/Nurse appear here.') }}</p>
          </div>
          <button class="admin-export" type="button" @click="downloadReport">{{ t('Download CSV') }}</button>
        </div>
        <div class="admin-table-wrap">
          <table>
            <thead><tr><th>{{ t('Patient') }}</th><th>{{ t('Date') }}</th><th>{{ t('Clinician') }}</th><th>{{ t('Type') }}</th><th>{{ t('Status') }}</th><th>{{ t('Confirmed') }}</th></tr></thead>
            <tbody>
              <tr v-for="a in ordered(rows)" :key="a.id">
                <td>{{ a.patient }}</td>
                <td>{{ formatDate(a.date) }} · {{ formatTime(a.time) }}</td>
                <td>{{ a.doctor }}</td>
                <td>{{ t(a.reason) }}</td>
                <td><span class="admin-chip" :class="a.status.replaceAll(' ','-').toLowerCase()">{{ t(a.status) }}</span></td>
                <td>{{ t(a.confirmed ? 'Yes' : 'No') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="!rows.length" class="admin-muted">{{ t('No records in this period.') }}</p>
      </section>
      <p class="admin-footer"></p>
    </div>
  </div>
</template>

<style scoped>
.admin-screen{min-height:100dvh;background:#f3f6fa;color:#22384c;font:14px Inter,Arial,sans-serif}
.admin-wrap{max-width:1200px;margin:auto;padding:36px 22px 55px}
.admin-heading{display:flex;justify-content:space-between;align-items:end;gap:20px}
.admin-overline{letter-spacing:1.7px;font-size:11px;color:#2773a8;font-weight:800;margin:0 0 9px}
.admin-heading h1{font-size:clamp(27px,4vw,36px);letter-spacing:-1px;margin:0}
.admin-muted{color:#8092a3;margin:9px 0 0}
.admin-controls{display:flex;align-items:end;gap:11px}
.admin-controls label{display:grid;gap:7px;font-size:12px;font-weight:700;color:#60768b}
.admin-controls select{padding:10px 12px;border:1px solid #cad9e6;border-radius:8px;background:#fff;color:#31495d}
.admin-export{background:#2874ac;color:#fff;border:1px solid #2874ac;border-radius:8px;padding:11px 14px;white-space:nowrap;font-weight:700}
.admin-export:hover{background:#1e5f91}
.admin-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:28px 0}
.admin-stats article{background:#fff;border:1px solid #e0e9f1;border-radius:13px;padding:21px}
.admin-stats span,.admin-stats small{display:block;color:#71879b;font-size:12px}
.admin-stats strong{display:block;font-size:35px;color:#246ca4;margin:8px 0}
.admin-tabs{border-bottom:1px solid #d7e2eb;display:flex;gap:6px}
.admin-tabs button{padding:13px 18px;background:none;border:0;border-bottom:3px solid transparent;color:#698199;font-weight:700;cursor:pointer}
.admin-tabs button.active{border-bottom-color:#2474ae;color:#226398}
.admin-grid{display:grid;grid-template-columns:1.25fr 1fr;gap:18px}
.admin-panel{padding:24px;margin-bottom:20px;min-height:260px;background:#fff;border:1px solid #e1eaf2;border-radius:0 0 13px 13px}
.admin-grid .admin-panel{border-radius:0 0 13px 13px}
.admin-panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:25px}
.admin-panel-head h2{font-size:19px;margin:0}
.admin-panel-head p{color:#7e8da0;margin:7px 0 0;font-size:12px}
.admin-bar-row{margin-bottom:22px}
.admin-bar-row>div:first-child{display:flex;justify-content:space-between;gap:10px;font-size:12px;margin-bottom:9px}
.admin-bar-row span{color:#74889a}
.admin-track{height:11px;border-radius:20px;background:#e9f0f6;overflow:hidden}
.admin-track span{display:block;background:#3381b9;height:100%;border-radius:20px}
.admin-status-row{display:flex;justify-content:space-between;padding:12px 2px;border-bottom:1px solid #ecf2f5}
.admin-status-row strong{color:#2b6594}
.admin-table-wrap{overflow-x:auto}
table{border-collapse:collapse;text-align:left;width:100%;min-width:690px}
th{background:#f5f8fb;text-transform:uppercase;color:#8291a0;letter-spacing:.7px;font-size:11px;padding:14px}
td{padding:15px 14px;border-bottom:1px solid #ecf0f4}
.admin-chip{display:inline-block;border-radius:30px;padding:5px 9px;background:#edf2f6;color:#677b8c;font-size:11px;font-weight:700}
.admin-chip.checked-in{background:#e6f7ee;color:#177a4c}
.admin-chip.cancelled,.admin-chip.no-show{background:#ffefeb;color:#ae4f43}
.admin-chip.completed{background:#e5f8f0;color:#147344}
.admin-chip.in-progress{background:#e6f1ff;color:#246ca7}
.admin-footer{color:#8494a5;font-size:12px;text-align:center;margin-top:23px}
.admin-queue-row{display:flex;align-items:center;gap:16px;padding:16px 0;border-bottom:1px solid #e5ebf1}
.admin-queue-position{background:#eaf3fb;color:#2472a9;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-weight:700;flex-shrink:0}
.admin-queue-info{flex:1;min-width:0}
.admin-queue-info p{margin:5px 0 0;color:#8092a3}
.admin-queue-actions{display:flex;gap:8px}
.admin-queue-actions button{background:white;border:1px solid #cbd9e5;color:#2872a9;border-radius:8px;padding:9px 14px;font-size:17px;cursor:pointer}
.admin-queue-actions button:disabled{opacity:.35;cursor:not-allowed}
.admin-queue-count{white-space:nowrap;color:#4c708a;font-size:12px;background:#eff5fa;padding:7px 11px;border-radius:20px}
@media(max-width:750px){
  .admin-wrap{padding:25px 13px}
  .admin-heading{align-items:stretch;flex-direction:column}
  .admin-controls{justify-content:space-between}
  .admin-stats{grid-template-columns:repeat(2,1fr);gap:9px}
  .admin-stats article{padding:14px}
  .admin-stats strong{font-size:28px}
  .admin-grid{grid-template-columns:1fr;gap:0}
  .admin-panel{padding:18px 13px}
  .admin-tabs button{padding:12px 10px;font-size:12px}
}
</style>
