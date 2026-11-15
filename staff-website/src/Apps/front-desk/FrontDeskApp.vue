<script setup>
import { ref, reactive, computed } from 'vue'
import {
  clinic, staff, day, ordered,
  book, update, queue, moveQueue
} from '../shared/demoStore.js'
import { t, formatDate, formatTime } from '../../language.js'

const tab = ref('appointments')
const search = ref('')
const showForm = ref(false)
const notice = ref(null)
const form = reactive({ patient: '', doctor: 'Dr. Smith', date: day(), time: '09:00', reason: 'Consultation', walkIn: false })
const matches = computed(() => ordered(clinic.appointments.filter(a =>
  `${a.patient} ${a.doctor} ${t(a.status)} ${a.status}`.toLowerCase().includes(search.value.toLowerCase()),
)))
const waiting = computed(() => queue())
const today = computed(() => clinic.appointments.filter(a => a.date === day() && a.status !== 'Cancelled'))
const cancellations = computed(() => clinic.appointments.filter(a => a.status === 'Cancelled'))
function submit() {
  if (!form.patient.trim() || !form.date || !form.time) return
  book({ patient: form.patient.trim(), doctor: form.doctor, date: form.date, time: form.time, reason: form.reason }, form.walkIn)
  notice.value = { text: form.walkIn ? 'Walk-in checked in for {patient}.' : 'Appointment booked for {patient}.', patient: form.patient.trim() }
  form.patient = ''
  form.walkIn = false
  showForm.value = false
  tab.value = 'appointments'
}
function act(id, status) {
  const person = clinic.appointments.find(a => a.id === id)
  update(id, status)
  notice.value = { text: '{patient} — {status}.', patient: person.patient, status }
}
</script>

<template>
  <div class="front-screen">
    <div class="front-wrap">
      <div class="front-heading"><div><span>{{ t('Front Desk Portal') }}</span><h1>{{ t('Clinic operations') }}</h1><p>{{ formatDate(day()) }} · {{ t('Manage patient arrivals and appointments') }}</p></div><button class="front-primary" @click="showForm = !showForm">{{ showForm ? t('Close form') : '+ ' + t('New appointment') }}</button></div>
      <div class="front-stats">
        <div><span>{{ t("Today's appointments") }}</span><strong>{{ today.length }}</strong></div>
        <div><span>{{ t('Waiting to be seen') }}</span><strong>{{ waiting.length }}</strong></div>
        <div><span>{{ t('Cancellations') }}</span><strong>{{ cancellations.length }}</strong></div>
      </div>
      <form v-if="showForm" class="front-form" @submit.prevent="submit">
        <div class="front-card-title"><h2>{{ t('Book an appointment / add walk-in') }}</h2><span></span></div>
        <div class="front-form-grid">
          <label>{{ t('Patient name') }}<input v-model="form.patient" required maxlength="80" :placeholder="t('e.g. Morgan Chen')" /></label>
          <label>{{ t('Clinician') }}<select v-model="form.doctor"><option v-for="s in staff" :key="s.name">{{ s.name }}</option></select></label>
          <label>{{ t('Date') }}<input v-model="form.date" type="date" required /></label>
          <label>{{ t('Time') }}<input v-model="form.time" type="time" required /></label>
          <label>{{ t('Visit type') }}<select v-model="form.reason"><option value="Consultation">{{ t('Consultation') }}</option><option value="Follow-up">{{ t('Follow-up') }}</option><option value="Check-up">{{ t('Check-up') }}</option><option value="Walk-in">{{ t('Walk-in') }}</option></select></label>
        </div>
        <label class="front-check"><input v-model="form.walkIn" type="checkbox" /> {{ t('Check in immediately (walk-in)') }}</label>
        <button type="submit" class="front-primary">{{ t('Save appointment') }}</button>
      </form>
      <div class="front-tabs" role="group" :aria-label="t('Front desk sections')">
        <button :class="{ active: tab === 'appointments' }" @click="tab='appointments'">{{ t('Appointments') }}</button>
        <button :class="{ active: tab === 'queue' }" @click="tab='queue'">{{ t('Waiting list') }} <span>{{ waiting.length }}</span></button>
      </div>
      <p v-if="notice" class="front-notice" role="status">{{ t(notice.text, { patient: notice.patient, status: notice.status && t(notice.status) }) }}</p>
      <section v-if="tab === 'appointments'" class="front-card">
        <div class="front-card-title"><h2>{{ t('Appointment management') }}</h2><label class="front-search"><span class="sr-only">{{ t('Search appointments') }}</span><input v-model="search" :placeholder="t('Search patient, clinician or status')" /></label></div>
        <div class="front-table-scroll"><table><thead><tr><th>{{ t('Patient') }}</th><th>{{ t('Date & time') }}</th><th>{{ t('Clinician') }}</th><th>{{ t('Status') }}</th><th>{{ t('Confirmation') }}</th><th>{{ t('Actions') }}</th></tr></thead><tbody>
          <tr v-for="a in matches" :key="a.id"><td><strong>{{ a.patient }}</strong><small>{{ t(a.reason) }}</small></td><td>{{ formatDate(a.date) }}<small>{{ formatTime(a.time) }}</small></td><td>{{ a.doctor }}</td><td><span class="front-status" :class="a.status.replaceAll(' ','-').toLowerCase()">{{ t(a.status) }}</span></td><td><strong>{{ t(a.confirmed ? 'Confirmed' : a.status === 'Scheduled' ? 'Pending' : '—') }}</strong></td><td class="front-actions"><button v-if="a.status === 'Scheduled'" @click="act(a.id,'Checked in')">{{ t('Check in') }}</button><button v-if="['Scheduled','Checked in'].includes(a.status)" class="front-danger" @click="act(a.id,'Cancelled')">{{ t('Cancel') }}</button><button v-if="a.status === 'Scheduled'" @click="act(a.id,'No show')">{{ t('No-show') }}</button><button v-if="a.status === 'Cancelled'" @click="act(a.id,'Scheduled')">{{ t('Restore') }}</button><span v-if="['Completed','In progress','No show'].includes(a.status)">—</span></td></tr>
        </tbody></table></div>
        <p v-if="!matches.length" class="front-empty">{{ t('No matching appointments.') }}</p>
      </section>
      <section v-else class="front-card">
        <div class="front-card-title"><div><h2>{{ t('Live waiting list') }}</h2><p>{{ t('Patients appear here after being checked in.') }}</p></div><span class="front-count">{{ t('{count} waiting', { count: waiting.length }) }}</span></div>
        <div v-for="(a, index) in waiting" :key="a.id" class="front-queue-row">
          <span class="front-position">{{ index + 1 }}</span>
          <div><strong>{{ a.patient }}</strong><p>{{ a.doctor }} · {{ formatTime(a.time) }}</p></div>
          <div class="front-queue-controls">
            <button type="button" :disabled="index === 0" :aria-label="t('Move {patient} up', { patient: a.patient })" @click="moveQueue(a.id, -1)">↑</button>
            <button type="button" :disabled="index === waiting.length - 1" :aria-label="t('Move {patient} down', { patient: a.patient })" @click="moveQueue(a.id, 1)">↓</button>
            <button type="button" class="front-primary" @click="act(a.id, 'In progress')">{{ t('Call patient') }}</button>
          </div>
        </div>
        <p v-if="!waiting.length" class="front-empty">{{ t('No patients in the waiting list.') }}</p>
      </section>
      <p class="front-footer">{{ t('Manage appointments and waiting order from the ClinicFlow Website.') }}</p>
    </div>
  </div>
</template>

<style scoped>
.front-screen{min-height:100dvh;background:#f4f7fa;font:14px Inter,Arial,sans-serif;color:#25384a}.front-wrap{max-width:1180px;margin:0 auto;padding:35px 22px 55px}.front-heading{display:flex;justify-content:space-between;align-items:center;gap:15px}.front-heading span{color:#2671a9;font-weight:800;font-size:11px;letter-spacing:1.5px}.front-heading h1{font-size:clamp(27px,4vw,35px);margin:9px 0}.front-heading p,.front-card-title p{color:#7e8fa0;margin:0}.front-primary{background:#2872a9;color:white;border:1px solid #2872a9;border-radius:8px;padding:11px 15px;font-weight:700}.front-primary:hover{background:#1d5b8b}.front-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin:28px 0}.front-stats>div{border:1px solid #e2eaf0;background:white;padding:22px;border-radius:12px}.front-stats span{display:block;color:#72859a;font-size:12px}.front-stats strong{display:block;font-size:34px;margin-top:8px;color:#286aa0}.front-tabs{display:flex;gap:6px;border-bottom:1px solid #d7e4ec}.front-tabs button{background:none;border:0;border-bottom:3px solid transparent;padding:13px 17px;color:#6c8196;font-weight:700}.front-tabs button.active{border-color:#2671ac;color:#215e91}.front-tabs span{background:#e6eff7;border-radius:25px;padding:3px 8px}.front-card,.front-form{background:white;border:1px solid #e0e8f0;border-radius:0 0 13px 13px;padding:23px;margin-bottom:22px}.front-form{border-radius:13px}.front-card-title{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:20px}.front-card-title h2{margin:0;font-size:19px}.front-card-title>span{font-size:12px;color:#7c8da0}.front-search input{min-width:290px;padding:11px 13px;border:1px solid #cfdae5;border-radius:9px}.front-table-scroll{overflow-x:auto}.front-table-scroll table{border-collapse:collapse;width:100%;min-width:760px;text-align:left}.front-table-scroll th{font-size:11px;text-transform:uppercase;letter-spacing:.7px;color:#7c8c9d;background:#f6f9fc;padding:13px}.front-table-scroll td{padding:15px 13px;border-bottom:1px solid #edf1f5;vertical-align:middle}.front-table-scroll td small{display:block;color:#8495a4;margin-top:5px}.front-status{border-radius:18px;display:inline-block;background:#eef2f7;color:#5a7185;padding:6px 10px;font-size:11px;font-weight:700;white-space:nowrap}.front-status.checked-in{background:#e4f7ed;color:#19774c}.front-status.cancelled,.front-status.no-show{background:#ffeded;color:#a54946}.front-status.in-progress{background:#e8f3ff;color:#2367a6}.front-status.completed{background:#e5f6ec;color:#1a7649}.front-actions{white-space:nowrap}.front-actions button{background:#fff;color:#236da6;border:1px solid #ccdae7;border-radius:7px;padding:7px 9px;font-weight:700;font-size:11px;margin-right:5px}.front-actions .front-danger{color:#a84a47;border-color:#f0d8d5}.front-card-title .front-count{background:#eff5fa;padding:7px 11px;border-radius:20px;color:#4c708a;font-size:12px}.front-queue-row{display:flex;align-items:center;gap:15px;padding:17px 0;border-bottom:1px solid #eef2f6}.front-queue-row>div{flex:1}.front-queue-row p{color:#8191a1;margin:5px 0 0}.front-position{display:grid;place-items:center;width:38px;height:38px;background:#eaf3fb;color:#2472a9;border-radius:50%;font-weight:800}.front-notice{background:#e9f6ff;color:#266996;border-radius:9px;padding:13px}.front-form-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:16px}.front-form-grid label{display:grid;gap:7px;font-size:12px;font-weight:700;color:#61798d}.front-form-grid input,.front-form-grid select{min-width:0;padding:11px;border-radius:8px;border:1px solid #cbd9e5;background:white;color:#304b62}.front-check{display:flex;align-items:center;gap:8px;margin:13px 0 19px}.front-footer,.front-empty{color:#8092a3;text-align:center;font-size:12px;padding:20px}.sr-only{position:absolute;left:-10000px}@media(max-width:730px){.front-wrap{padding:20px 12px}.front-heading{align-items:stretch;flex-direction:column}.front-stats{gap:7px}.front-stats>div{padding:12px 9px}.front-stats strong{font-size:26px}.front-stats span{font-size:10px}.front-card{padding:15px 10px}.front-card-title{align-items:stretch;flex-direction:column}.front-search input{min-width:0;width:100%}.front-form-grid{grid-template-columns:repeat(2,1fr)}.front-queue-row{gap:9px}.front-queue-row .front-primary{padding:9px 8px;font-size:11px}}

.front-queue-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.front-queue-controls button:not(.front-primary){background:white;color:#2872a9;border:1px solid #cbd9e5;border-radius:8px;padding:9px 12px;font-size:17px;font-weight:700;cursor:pointer}
.front-queue-controls button:disabled{opacity:.35;cursor:not-allowed}
.front-queue-row>.front-queue-controls{flex:0 0 auto}
@media(max-width:620px){.front-queue-row{flex-wrap:wrap}.front-queue-controls{width:100%;justify-content:flex-end}}
</style>
