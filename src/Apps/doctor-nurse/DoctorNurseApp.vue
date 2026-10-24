<script setup>
import { ref, computed } from 'vue'
import { clinic, staff, day, ordered, niceDate, niceTime, update, book } from '../shared/demoStore.js'

const doctor = ref('Dr. Smith')
const tab = ref('schedule')
const message = ref('')
const mine = computed(() => ordered(clinic.appointments.filter(a => a.doctor === doctor.value)))
const today = computed(() => mine.value.filter(a => a.date === day() && a.status !== 'Cancelled'))
const history = computed(() => mine.value.filter(a => a.date < day() || ['Completed', 'Cancelled', 'No show'].includes(a.status)))
const patients = computed(() => [...new Set(mine.value.map(a => a.patient))].sort())
function changeStatus(a, status) {
  update(a.id, status)
  message.value = `${a.patient} — ${status}.`
}
function rebook(a) {
  book({ patient: a.patient, doctor: a.doctor, date: day(7), time: a.time, reason: a.reason })
  message.value = `Follow-up for ${a.patient} booked for ${niceDate(day(7))}. See it in Front Desk.`
}
</script>

<template>
  <div class="staff-screen">
    <div class="staff-wrap">
      <div class="staff-heading">
        <div><p class="staff-overline">CLINICAL WORKSPACE</p><h1>Good morning, care team</h1><p class="staff-muted">{{ niceDate(day()) }} · Fictional demonstration data</p></div>
        <label class="staff-picker">View schedule for
          <select v-model="doctor"><option v-for="s in staff" :key="s.name">{{ s.name }}</option></select>
        </label>
      </div>
      <div class="staff-stats">
        <div><span>Today's visits</span><strong>{{ today.length }}</strong><small>Assigned appointments</small></div>
        <div><span>Checked in</span><strong>{{ today.filter(a => a.status === 'Checked in').length }}</strong><small>Ready for appointment</small></div>
        <div><span>In progress</span><strong>{{ today.filter(a => a.status === 'In progress').length }}</strong><small>Currently being seen</small></div>
      </div>
      <div class="staff-tabs" role="group" aria-label="Doctor app views">
        <button v-for="t in [['schedule','Schedule'],['patients','Patients'],['history','History']]" :key="t[0]" :class="{ active: tab === t[0] }" @click="tab=t[0]; message=''">{{ t[1] }}</button>
      </div>
      <p v-if="message" class="staff-message" role="status">{{ message }}</p>
      <section v-if="tab === 'schedule'" class="staff-card">
        <div class="staff-card-head"><h2>Today's schedule</h2><span>{{ today.length }} appointments</span></div>
        <article v-for="a in today" :key="a.id" class="staff-visit">
          <strong class="staff-time">{{ niceTime(a.time) }}</strong>
          <div class="staff-detail"><div class="staff-visit-title"><strong>{{ a.patient }}</strong><span class="staff-status" :class="a.status.replaceAll(' ','-').toLowerCase()">{{ a.status }}</span></div>
            <p>{{ a.reason }} · {{ a.doctor }}</p>
            <div class="staff-actions">
              <button v-if="a.status === 'Checked in'" class="staff-primary" @click="changeStatus(a,'In progress')">Start visit</button>
              <button v-if="a.status === 'In progress'" class="staff-primary" @click="changeStatus(a,'Completed')">Complete visit</button>
              <button v-if="a.status === 'Scheduled'" @click="changeStatus(a,'No show')">Mark no-show</button>
              <button @click="rebook(a)">Book follow-up</button>
            </div>
          </div>
        </article>
        <p v-if="today.length === 0" class="staff-empty">No appointments for this staff member today.</p>
      </section>
      <section v-else-if="tab === 'patients'" class="staff-card">
        <div class="staff-card-head"><h2>My patients</h2><span>{{ patients.length }} patients</span></div>
        <div v-for="name in patients" :key="name" class="staff-patient"><span class="staff-avatar">{{ name.split(' ').map(s => s[0]).join('') }}</span><strong>{{ name }}</strong><small>{{ mine.filter(a => a.patient === name).length }} visit(s)</small></div>
        <p v-if="!patients.length" class="staff-empty">No patients assigned.</p>
      </section>
      <section v-else class="staff-card">
        <div class="staff-card-head"><h2>Visit history</h2><span>{{ history.length }} records</span></div>
        <div v-for="a in history" :key="a.id" class="staff-history"><div><strong>{{ a.patient }}</strong><p>{{ niceDate(a.date) }} at {{ niceTime(a.time) }}</p></div><span class="staff-status" :class="a.status.replaceAll(' ','-').toLowerCase()">{{ a.status }}</span><button @click="rebook(a)">Rebook</button></div>
        <p v-if="!history.length" class="staff-empty">No visit history yet.</p>
      </section>
      <p class="staff-footnote">Prototype only · No real patient records or clinical notes</p>
    </div>
  </div>
</template>

<style scoped>
.staff-screen{background:#f3f7fb;color:#223549;min-height:100dvh;font-family:Inter,Arial,sans-serif}.staff-wrap{max-width:1060px;margin:auto;padding:35px 22px}.staff-heading{display:flex;justify-content:space-between;align-items:end;gap:20px}.staff-overline{font-size:11px;letter-spacing:1.8px;color:#286ea5;font-weight:800;margin:0 0 8px}.staff-heading h1{font-size:clamp(25px,3.7vw,35px);margin:0;letter-spacing:-1px}.staff-muted{color:#79899a;margin:9px 0 0}.staff-picker{display:grid;gap:8px;font-size:12px;font-weight:700;color:#607488}.staff-picker select{padding:11px 15px;border:1px solid #cfdde9;border-radius:9px;background:white;color:#27455d;min-width:190px}.staff-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin:28px 0}.staff-stats>div{border:1px solid #dfebf3;border-radius:13px;background:white;padding:22px}.staff-stats span,.staff-stats small{display:block;color:#74889c;font-size:12px}.staff-stats strong{display:block;color:#256caa;font-size:35px;margin:8px 0}.staff-tabs{display:flex;gap:8px;border-bottom:1px solid #d9e5ef}.staff-tabs button{border:0;border-bottom:3px solid transparent;padding:13px 20px;background:transparent;color:#6a8198;font-weight:700}.staff-tabs button.active{border-color:#2878b8;color:#256399}.staff-card{background:white;border:1px solid #e1eaf2;border-radius:0 0 14px 14px;padding:24px;min-height:250px}.staff-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}.staff-card-head h2{font-size:19px;margin:0}.staff-card-head span{background:#f0f5fa;color:#5a738c;border-radius:40px;padding:7px 12px;font-size:12px}.staff-visit{display:flex;gap:20px;padding:20px;border:1px solid #e5edf4;border-radius:12px;margin-bottom:12px}.staff-time{min-width:100px;color:#246aa5}.staff-detail{flex:1}.staff-visit-title{display:flex;align-items:center;gap:13px;flex-wrap:wrap}.staff-detail p,.staff-history p{color:#7c8b9d;font-size:13px;margin:7px 0 0}.staff-status{display:inline-block;background:#edf2f7;color:#657b8d;padding:5px 11px;font-size:11px;font-weight:700;border-radius:30px}.staff-status.checked-in{background:#e7f8f0;color:#167953}.staff-status.in-progress{background:#e7f1fd;color:#286bac}.staff-status.completed{background:#e4f6ed;color:#147142}.staff-status.cancelled,.staff-status.no-show{background:#fff0ee;color:#a44440}.staff-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.staff-actions button,.staff-history button{border:1px solid #bfd2e3;background:white;color:#24639a;border-radius:8px;padding:9px 13px;font-size:12px;font-weight:700}.staff-actions .staff-primary{background:#2874ad;border-color:#2874ad;color:white}.staff-actions button:hover,.staff-history button:hover{filter:brightness(.95)}.staff-patient,.staff-history{display:flex;align-items:center;gap:14px;padding:15px 0;border-bottom:1px solid #edf1f5}.staff-avatar{width:40px;height:40px;display:grid;place-items:center;flex-shrink:0;background:#e6f2fb;color:#3277ac;border-radius:50%;font-weight:700;font-size:12px}.staff-patient strong,.staff-history>div{flex:1}.staff-patient small{margin-left:auto;color:#73889c}.staff-history{flex-wrap:wrap}.staff-message{background:#e9f4fd;padding:13px;border-radius:9px;color:#1e6799}.staff-empty{padding:36px;text-align:center;color:#788a9d}.staff-footnote{text-align:center;color:#8495a5;font-size:12px;margin:26px 0}@media(max-width:620px){.staff-wrap{padding:24px 13px}.staff-heading{align-items:stretch;flex-direction:column}.staff-picker select{width:100%}.staff-stats{gap:7px}.staff-stats>div{padding:13px 9px}.staff-stats span{font-size:11px}.staff-stats strong{font-size:25px}.staff-stats small{font-size:10px}.staff-card{padding:16px 12px}.staff-visit{gap:10px;padding:13px}.staff-time{min-width:75px;font-size:12px}.staff-card-head h2{font-size:17px}}
</style>
