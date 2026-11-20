<script setup>
import ClinicFifteenMinuteSlots from '../shared/ClinicFifteenMinuteSlots.vue'
import SlotPicker from '../shared/SlotPicker.vue'
import { ref, computed, reactive } from 'vue'
import { clinic, staff, day, ordered, update, book } from '../shared/demoStore.js'
import { t, formatDate, formatTime, countLabel } from '../../language.js'

const doctor = ref('Dr. Smith')
const tab = ref('schedule')
const message = ref(null)
const showBooking = ref(false)
const newVisit = reactive({ patient: 'Jordan Taylor', date: day(1), time: '', reason: 'Follow-up' })
function createVisit() {
  if (!newVisit.patient.trim() || !newVisit.date || !newVisit.time) return
  try {
    book({ patient: newVisit.patient, doctor: doctor.value, date: newVisit.date, time: newVisit.time, reason: newVisit.reason })
  } catch (error) {
    message.value = {
  text: error.message || 'The chosen slot is no longer available.'
}
    return
  }
  message.value = { text: 'Appointment booked for {patient}. The patient can now confirm it.', patient: newVisit.patient }
  showBooking.value = false
}
const mine = computed(() => ordered(clinic.appointments.filter(a => a.doctor === doctor.value)))
const today = computed(() => mine.value.filter(a => a.date === day() && a.status !== 'Cancelled'))
const history = computed(() => mine.value.filter(a => a.date < day() || ['Completed', 'Cancelled', 'No show'].includes(a.status)))
const patients = computed(() => [...new Set(mine.value.map(a => a.patient))].sort())
function changeStatus(a, status) {
  update(a.id, status)
  message.value = { text: '{patient} — {status}.', patient: a.patient, status }
}
function rebook(a) {
  newVisit.patient = a.patient
  newVisit.date = day(7)
  newVisit.time = ''
  newVisit.reason = 'Follow-up'
  message.value = null
  showBooking.value = true
}
</script>

<template>
  <div class="staff-screen">
    <div class="staff-wrap">
      <div class="staff-heading">
        <div><p class="staff-overline">{{ t('Clinical workspace') }}</p><h1>{{ t('Good morning, care team') }}</h1><p class="staff-muted">{{ formatDate(day()) }}</p></div>
        <label class="staff-picker">{{ t('View schedule for') }}
          <select v-model="doctor"><option v-for="s in staff" :key="s.name">{{ s.name }}</option></select>
        </label>
      </div>
      <button class="staff-primary" type="button" style="margin-top:18px;padding:12px 16px;border-radius:8px" @click="showBooking=!showBooking">{{ showBooking ? t('Close booking') : '+ ' + t('Book patient appointment') }}</button>
      <form v-if="showBooking" class="staff-card clinic-booking" @submit.prevent="createVisit">
        <h2>{{ t('Book appointment for patient') }}</h2>
        <label>{{ t('Patient name') }} <input v-model="newVisit.patient" required /></label>
        <label>{{ t('Date') }} <input v-model="newVisit.date" type="date" required /></label>
        <label>{{ t('Time') }} <ClinicFifteenMinuteSlots v-model="newVisit.time" :date="newVisit.date" :doctor="doctor" :patient-name="newVisit.patient" :appointments="clinic.appointments" /></label>
        <label>{{ t('Visit type') }} <select v-model="newVisit.reason"><option value="Consultation">{{ t('Consultation') }}</option><option value="Follow-up">{{ t('Follow-up') }}</option><option value="Check-up">{{ t('Check-up') }}</option></select></label>
        <button class="staff-primary" type="submit" :disabled="!newVisit.time">
  {{ t('Save appointment') }}
</button>
      </form>
      <div class="staff-stats">
        <div><span>{{ t("Today's visits") }}</span><strong>{{ today.length }}</strong><small>{{ t('Assigned appointments') }}</small></div>
        <div><span>{{ t('Checked in') }}</span><strong>{{ today.filter(a => a.status === 'Checked in').length }}</strong><small>{{ t('Ready for appointment') }}</small></div>
        <div><span>{{ t('In progress') }}</span><strong>{{ today.filter(a => a.status === 'In progress').length }}</strong><small>{{ t('Currently being seen') }}</small></div>
      </div>
      <div class="staff-tabs" role="group" :aria-label="t('Doctor app views')">
        <button v-for="item in [['schedule','Schedule'],['patients','Patients'],['history','History']]" :key="item[0]" :class="{ active: tab === item[0] }" @click="tab=item[0]; message=null">{{ t(item[1]) }}</button>
      </div>
      <p v-if="message" class="staff-message" role="status">{{ t(message.text, { patient: message.patient, date: message.date && formatDate(message.date), status: message.status && t(message.status) }) }}</p>
      <section v-if="tab === 'schedule'" class="staff-card">
        <div class="staff-card-head"><h2>{{ t("Today's schedule") }}</h2><span>{{ countLabel(today.length, 'appointment', 'appointments') }}</span></div>
        <article v-for="a in today" :key="a.id" class="staff-visit">
          <strong class="staff-time">{{ formatTime(a.time) }}</strong>
          <div class="staff-detail"><div class="staff-visit-title"><strong>{{ a.patient }}</strong><span class="staff-status" :class="a.status.replaceAll(' ','-').toLowerCase()">{{ t(a.status) }}</span></div>
            <p>{{ t(a.reason) }} · {{ a.doctor }}</p>
            <div class="staff-actions">
              <button v-if="a.status === 'Checked in'" class="staff-primary" @click="changeStatus(a,'In progress')">{{ t('Start visit') }}</button>
              <button v-if="a.status === 'In progress'" class="staff-primary" @click="changeStatus(a,'Completed')">{{ t('Complete visit') }}</button>
              <button v-if="a.status === 'Scheduled'" @click="changeStatus(a,'No show')">{{ t('Mark no-show') }}</button>
              <button @click="rebook(a)">{{ t('Book follow-up') }}</button>
            </div>
          </div>
        </article>
        <p v-if="today.length === 0" class="staff-empty">{{ t('No appointments for this staff member today.') }}</p>
      </section>
      <section v-else-if="tab === 'patients'" class="staff-card">
        <div class="staff-card-head"><h2>{{ t('My patients') }}</h2><span>{{ countLabel(patients.length, 'patient', 'patients') }}</span></div>
        <div v-for="name in patients" :key="name" class="staff-patient"><span class="staff-avatar">{{ name.split(' ').map(s => s[0]).join('') }}</span><strong>{{ name }}</strong><small>{{ countLabel(mine.filter(a => a.patient === name).length, 'visit', 'visits') }}</small></div>
        <p v-if="!patients.length" class="staff-empty">{{ t('No patients assigned.') }}</p>
      </section>
      <section v-else class="staff-card">
        <div class="staff-card-head"><h2>{{ t('Visit history') }}</h2><span>{{ countLabel(history.length, 'record', 'records') }}</span></div>
        <div v-for="a in history" :key="a.id" class="staff-history"><div><strong>{{ a.patient }}</strong><p>{{ t('{date} at {time}', { date: formatDate(a.date), time: formatTime(a.time) }) }}</p></div><span class="staff-status" :class="a.status.replaceAll(' ','-').toLowerCase()">{{ t(a.status) }}</span><button @click="rebook(a)">{{ t('Rebook') }}</button></div>
        <p v-if="!history.length" class="staff-empty">{{ t('No visit history yet.') }}</p>
      </section>
      
    </div>
  </div>
</template>

<style scoped>
.staff-screen{background:#f3f7fb;color:#223549;min-height:100dvh;font-family:Inter,Arial,sans-serif}.staff-wrap{max-width:1060px;margin:auto;padding:35px 22px}.staff-heading{display:flex;justify-content:space-between;align-items:end;gap:20px}.staff-overline{font-size:11px;letter-spacing:1.8px;color:#286ea5;font-weight:800;margin:0 0 8px}.staff-heading h1{font-size:clamp(25px,3.7vw,35px);margin:0;letter-spacing:-1px}.staff-muted{color:#79899a;margin:9px 0 0}.staff-picker{display:grid;gap:8px;font-size:12px;font-weight:700;color:#607488}.staff-picker select{padding:11px 15px;border:1px solid #cfdde9;border-radius:9px;background:white;color:#27455d;min-width:190px}.staff-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin:28px 0}.staff-stats>div{border:1px solid #dfebf3;border-radius:13px;background:white;padding:22px}.staff-stats span,.staff-stats small{display:block;color:#74889c;font-size:12px}.staff-stats strong{display:block;color:#256caa;font-size:35px;margin:8px 0}.staff-tabs{display:flex;gap:8px;border-bottom:1px solid #d9e5ef}.staff-tabs button{border:0;border-bottom:3px solid transparent;padding:13px 20px;background:transparent;color:#6a8198;font-weight:700}.staff-tabs button.active{border-color:#2878b8;color:#256399}.staff-card{background:white;border:1px solid #e1eaf2;border-radius:0 0 14px 14px;padding:24px;min-height:250px}.staff-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}.staff-card-head h2{font-size:19px;margin:0}.staff-card-head span{background:#f0f5fa;color:#5a738c;border-radius:40px;padding:7px 12px;font-size:12px}.staff-visit{display:flex;gap:20px;padding:20px;border:1px solid #e5edf4;border-radius:12px;margin-bottom:12px}.staff-time{min-width:100px;color:#246aa5}.staff-detail{flex:1}.staff-visit-title{display:flex;align-items:center;gap:13px;flex-wrap:wrap}.staff-detail p,.staff-history p{color:#7c8b9d;font-size:13px;margin:7px 0 0}.staff-status{display:inline-block;background:#edf2f7;color:#657b8d;padding:5px 11px;font-size:11px;font-weight:700;border-radius:30px}.staff-status.checked-in{background:#e7f8f0;color:#167953}.staff-status.in-progress{background:#e7f1fd;color:#286bac}.staff-status.completed{background:#e4f6ed;color:#147142}.staff-status.cancelled,.staff-status.no-show{background:#fff0ee;color:#a44440}.staff-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.staff-actions button,.staff-history button{border:1px solid #bfd2e3;background:white;color:#24639a;border-radius:8px;padding:9px 13px;font-size:12px;font-weight:700}.staff-actions .staff-primary{background:#2874ad;border-color:#2874ad;color:white}.staff-actions button:hover,.staff-history button:hover{filter:brightness(.95)}.staff-patient,.staff-history{display:flex;align-items:center;gap:14px;padding:15px 0;border-bottom:1px solid #edf1f5}.staff-avatar{width:40px;height:40px;display:grid;place-items:center;flex-shrink:0;background:#e6f2fb;color:#3277ac;border-radius:50%;font-weight:700;font-size:12px}.staff-patient strong,.staff-history>div{flex:1}.staff-patient small{margin-left:auto;color:#73889c}.staff-history{flex-wrap:wrap}.staff-message{background:#e9f4fd;padding:13px;border-radius:9px;color:#1e6799}.staff-empty{padding:36px;text-align:center;color:#788a9d}.staff-footnote{text-align:center;color:#8495a5;font-size:12px;margin:26px 0}@media(max-width:620px){.staff-wrap{padding:24px 13px}.staff-heading{align-items:stretch;flex-direction:column}.staff-picker select{width:100%}.staff-stats{gap:7px}.staff-stats>div{padding:13px 9px}.staff-stats span{font-size:11px}.staff-stats strong{font-size:25px}.staff-stats small{font-size:10px}.staff-card{padding:16px 12px}.staff-visit{gap:10px;padding:13px}.staff-time{min-width:75px;font-size:12px}.staff-card-head h2{font-size:17px}}
.clinic-booking{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px;min-height:0;border-radius:12px}.clinic-booking h2{grid-column:1/-1}.clinic-booking label{display:grid;gap:5px;font-weight:600}.clinic-booking input,.clinic-booking select{padding:10px;border:1px solid #cbd5e1;border-radius:7px;width:100%;min-width:0}.clinic-booking button{justify-self:start}@media(max-width:550px){.clinic-booking{grid-template-columns:1fr}}
</style>
