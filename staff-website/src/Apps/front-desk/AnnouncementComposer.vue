<script setup>
import { computed, onMounted, ref } from 'vue'
import { clinic, day } from '../shared/demoStore.js'
import { cloudConfigured, listAnnouncementRecipients, sendFrontDeskAnnouncement } from '../../services/clinicSync.js'
import { t, formatTime } from '../../language.js'

const audience = ref('selected_patients')
const preset = ref('custom')
const category = ref('general')
const recipients = ref([])
const selectedIds = ref([])
const roomAppointmentId = ref('')
const message = ref('')
const loading = ref(false)
const sending = ref(false)
const error = ref('')
const result = ref('')
const patients = computed(() => recipients.value.filter(person => person.role === 'patient'))
const clinicians = computed(() => recipients.value.filter(person => ['doctor', 'nurse'].includes(person.role)))
const choices = computed(() => audience.value === 'clinicians' ? clinicians.value : patients.value)
const checkedInVisits = computed(() => clinic.appointments
  .filter(a => a.date === day() && ['Checked in', 'In progress'].includes(a.status))
  .sort((a, b) => a.time.localeCompare(b.time)))
const valid = computed(() => message.value.trim().length > 0 && message.value.trim().length <= 500 &&
  (audience.value === 'all_patients' ? patients.value.length > 0 : selectedIds.value.length > 0) &&
  (preset.value !== 'patient_in_room' || Boolean(roomAppointmentId.value)))

async function load() {
  error.value = ''
  loading.value = true
  try {
    recipients.value = await listAnnouncementRecipients()
  } catch (err) {
    error.value = err.message || String(err)
  } finally {
    loading.value = false
  }
}
onMounted(() => { if (cloudConfigured) void load() })

function pickAudience(value) {
  audience.value = value
  selectedIds.value = []
  roomAppointmentId.value = ''
  preset.value = 'custom'
  category.value = 'general'
  message.value = ''
  result.value = ''
}

function choosePreset(value) {
  preset.value = value
  result.value = ''
  roomAppointmentId.value = ''
  if (value === 'call_patient') {
    audience.value = 'selected_patients'
    category.value = 'call_patient'
    message.value = 'Please come to the front desk. Your doctor or nurse is ready to see you.'
  } else if (value === 'patient_in_room') {
    audience.value = 'clinicians'
    category.value = 'patient_in_room'
    message.value = ''
  } else if (value === 'checkin') {
    audience.value = 'selected_patients'
    category.value = 'general'
    message.value = 'Please check in with the front desk when you arrive.'
  } else {
    category.value = 'general'
    message.value = ''
  }
  selectedIds.value = []
}

function selectRoomAppointment(id) {
  roomAppointmentId.value = id
  const appointment = checkedInVisits.value.find(a => String(a.id) === id)
  message.value = appointment ? `${appointment.patient} is in the examination room and ready to be seen.` : ''
  const clinician = clinicians.value.find(person => person.full_name.trim().toLowerCase() === appointment?.doctor?.trim().toLowerCase())
  if (clinician) selectedIds.value = [clinician.id]
}

async function send() {
  error.value = ''
  result.value = ''
  if (!valid.value || sending.value) {
    error.value = t('Enter a message and choose recipients.')
    return
  }
  if (audience.value === 'all_patients' && !window.confirm(`Send this announcement to all ${patients.value.length} patient accounts?`)) return
  sending.value = true
  try {
    const count = await sendFrontDeskAnnouncement({
      audience: audience.value,
      recipientIds: audience.value === 'all_patients' ? [] : selectedIds.value,
      message: message.value.trim(),
      category: category.value,
    })
    result.value = `Announcement sent to ${count} recipient${count === 1 ? '' : 's'}.`
    selectedIds.value = []
    message.value = ''
    preset.value = 'custom'
    roomAppointmentId.value = ''
    category.value = 'general'
  } catch (err) {
    error.value = err.message || String(err)
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <section class="announcement-card" aria-labelledby="announcements-heading">
    <div class="announcement-head">
      <div><h2 id="announcements-heading">{{ t('Send an announcement') }}</h2><p>{{ t('Do not include sensitive medical details in announcements.') }}</p></div>
      <button v-if="cloudConfigured" type="button" :disabled="loading || sending" @click="load">{{ t('Reload recipients') }}</button>
    </div>
    <p v-if="!cloudConfigured" class="announcement-warning">{{ t('This requires a signed-in front-desk Supabase account.') }}</p>
    <form v-else @submit.prevent="send" class="announcement-form">
      <fieldset :disabled="loading || sending">
        <legend>{{ t('Recipients') }}</legend>
        <div class="audiences">
          <label><input type="radio" name="announce-audience" value="all_patients" :checked="audience === 'all_patients'" @change="pickAudience('all_patients')" /> {{ t('All patients') }}</label>
          <label><input type="radio" name="announce-audience" value="selected_patients" :checked="audience === 'selected_patients'" @change="pickAudience('selected_patients')" /> {{ t('Selected patients') }}</label>
          <label><input type="radio" name="announce-audience" value="clinicians" :checked="audience === 'clinicians'" @change="pickAudience('clinicians')" /> {{ t('Doctors and nurses') }}</label>
        </div>
        <p v-if="audience === 'all_patients'" class="helper">{{ patients.length }} {{ t('patient accounts') }}</p>
        <div v-else class="recipient-picker">
          <strong>{{ t('Choose recipients') }}</strong>
          <div class="recipient-list" role="group" :aria-label="t('Choose recipients')">
            <label v-for="person in choices" :key="person.id">
              <input v-model="selectedIds" type="checkbox" :value="person.id" />
              <span>{{ person.full_name }}</span>
              <small>{{ t(person.role) }}</small>
            </label>
          </div>
          <p v-if="!choices.length" class="helper">{{ t('No matching recipient accounts.') }}</p>
        </div>
        <label class="field">{{ t('Message template') }}
          <select :value="preset" @change="choosePreset($event.target.value)">
            <option value="custom">{{ t('Custom message') }}</option>
            <option value="call_patient">{{ t('Call patient to front desk') }}</option>
            <option value="patient_in_room">{{ t('Patient ready in room') }}</option>
            <option value="checkin">{{ t('Check-in reminder') }}</option>
          </select>
        </label>
        <label v-if="preset === 'patient_in_room'" class="field">{{ t('Patient in room') }}
          <select :value="roomAppointmentId" @change="selectRoomAppointment($event.target.value)" required>
            <option value="" disabled>{{ t('Select a patient in the room.') }}</option>
            <option v-for="a in checkedInVisits" :key="a.id" :value="String(a.id)">{{ a.patient }} · {{ a.doctor }} · {{ formatTime(a.time) }}</option>
          </select>
        </label>
        <label class="field">{{ t('Write your announcement') }}
          <textarea v-model="message" rows="4" maxlength="500" required></textarea>
          <small>{{ message.length }}/500</small>
        </label>
      </fieldset>
      <p v-if="error" class="announcement-error" role="alert">{{ error }}</p>
      <p v-if="result" class="announcement-success" role="status">{{ result }}</p>
      <button type="submit" class="send-button" :disabled="!valid || loading || sending">{{ t('Send announcement') }}</button>
    </form>
  </section>
</template>

<style scoped>
.announcement-card{background:#fff;border:1px solid #e0e8f0;border-radius:0 0 13px 13px;padding:24px;margin-bottom:22px;color:#25384a}
.announcement-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.announcement-head h2{font-size:19px;margin:0 0 6px}.announcement-head p,.helper{color:#657d90;font-size:13px;margin:4px 0 12px}
.announcement-head button{padding:9px;border:1px solid #cbd9e5;background:white;color:#2872a9;border-radius:8px;cursor:pointer}
.announcement-form{display:grid;gap:16px}.announcement-form fieldset{border:0;padding:0;min-width:0;margin:0}
.announcement-form legend,.recipient-picker strong{font-size:14px;font-weight:750;margin:0 0 12px}
.audiences{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:15px}.audiences label,.recipient-list label{display:flex;gap:7px;align-items:center;font-size:14px;cursor:pointer}
.recipient-picker{margin-bottom:17px}.recipient-list{max-height:190px;overflow-y:auto;border:1px solid #d9e3ec;border-radius:9px;padding:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
.recipient-list small{color:#7890a2;font-size:11px}.field{display:grid;gap:7px;font-weight:650;margin-bottom:16px;font-size:13px}
.field select,.field textarea{width:100%;min-width:0;padding:11px;border:1px solid #cbd9e5;border-radius:9px;color:#25384a;font:inherit;background:white}
.field textarea{resize:vertical;min-height:90px}.field small{justify-self:end;font-weight:400;color:#718296}
.send-button{background:#2872a9;color:#fff;border:0;border-radius:8px;padding:12px 20px;font-weight:750;justify-self:start;cursor:pointer}
.send-button:disabled{opacity:.55;cursor:not-allowed}.announcement-error,.announcement-warning{background:#fff1ef;color:#943d37;padding:12px;border-radius:8px}
.announcement-success{background:#eaf8ef;color:#176039;padding:12px;border-radius:8px}
@media(max-width:600px){.announcement-card{padding:16px}.recipient-list{grid-template-columns:1fr}}
</style>
