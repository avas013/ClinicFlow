<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { book, clinic, staff } from '../shared/demoStore.js'
import { cloudConfigured, syncState, clinicflowBookPatient } from '../../services/clinicSync.js'
import ClinicFifteenMinuteSlots from '../shared/ClinicFifteenMinuteSlots.vue'
import {
  SYMPTOM_CHOICES, SYMPTOM_REASON, needsDoctor, allowedProviders, assertValidSlot,
} from '../shared/clinicflowBookingRules.js'

const emit = defineEmits(['booked'])
const form = reactive({ symptom: '', doctor: '', date: '', time: '' })
const error = ref('')
const submitting = ref(false)
const availableProviders = computed(() => allowedProviders(staff, form.symptom))
const today = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
watch(() => form.symptom, () => {
  form.doctor = ''
  form.time = ''
  error.value = ''
})
watch(() => form.doctor, () => { form.time = ''; error.value = '' })
const urgencyMessage = computed(() => form.symptom === 'serious'
  ? 'If symptoms are severe, sudden, or you may be having an emergency, call 911 or seek emergency care. An online appointment is not an emergency service.'
  : 'This is a simple demo routing rule, not medical triage. Contact the clinic if you are unsure who to book with.')

async function submit() {
  error.value = ''
  if (!SYMPTOM_REASON[form.symptom]) {
    error.value = 'Choose the symptom that best describes the visit.'
    return
  }
  if (!availableProviders.value.some(person => person.name === form.doctor)) {
    error.value = 'Select a clinician shown for this symptom category.'
    return
  }
  try {
    assertValidSlot(form, clinic.appointments)
    submitting.value = true
    const details = {
      doctor: form.doctor, date: form.date, time: form.time,
      reason: SYMPTOM_REASON[form.symptom], symptom: form.symptom,
    }
    if (cloudConfigured) {
      await clinicflowBookPatient(details)
    } else {
      const patient = syncState.profile?.full_name || 'Jordan Taylor'
      book({ ...details, patient })
    }
    form.time = ''
    form.date = ''
    form.symptom = ''
    emit('booked')
  } catch (cause) {
    error.value = cause.message || 'The appointment could not be booked. Please try another time.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="cf-patient-booking" @submit.prevent="submit">
    <label for="cf-symptom">What symptoms or concerns are you having?</label>
    <select id="cf-symptom" v-model="form.symptom" required>
      <option value="" disabled>Select a symptom or concern</option>
      <option v-for="item in SYMPTOM_CHOICES" :key="item.value" :value="item.value">{{ item.label }}</option>
    </select>
    <div v-if="form.symptom" class="cf-route-message" role="status">
      <strong>{{ needsDoctor(form.symptom) ? 'Initial appointment with a doctor' : 'Initial appointment with a nurse' }}</strong>
      <p>{{ needsDoctor(form.symptom)
        ? 'Your concern is directed to a doctor for an initial appointment.'
        : 'Your initial appointment is directed to a nurse. The clinic may refer you to a doctor if needed.' }}</p>
    </div>
    <p class="cf-safety-message" role="note">{{ urgencyMessage }}</p>
    <label for="cf-clinician">Choose clinician</label>
    <select id="cf-clinician" v-model="form.doctor" :disabled="!availableProviders.length" required>
      <option value="" disabled>{{ availableProviders.length ? 'Choose a clinician' : 'Choose a symptom first' }}</option>
      <option v-for="person in availableProviders" :key="person.name" :value="person.name">{{ person.name }}</option>
    </select>
    <label for="cf-date">Appointment date</label>
    <input id="cf-date" v-model="form.date" type="date" :min="today" required />
    <label for="cf-time">Appointment time</label>
    <ClinicFifteenMinuteSlots v-model="form.time" :date="form.date" :doctor="form.doctor" :appointments="clinic.appointments" :patient-name="syncState.profile?.full_name || 'Jordan Taylor'" />
    <p v-if="error" class="cf-error" role="alert">{{ error }}</p>
    <button type="submit" :disabled="submitting || !form.symptom || !form.doctor || !form.date || !form.time">
      {{ submitting ? 'Booking…' : 'Book appointment' }}
    </button>
  </form>
</template>

<style scoped>
.cf-patient-booking{display:grid;gap:10px;margin:12px 0 24px}
.cf-patient-booking label{font-weight:700;color:#243c51;font-size:14px}
.cf-patient-booking select,.cf-patient-booking input{width:100%;min-height:42px;padding:9px 10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#243c51;font:inherit}
.cf-patient-booking button{border:0;border-radius:9px;background:#2376b4;color:white;padding:12px;font-weight:700;cursor:pointer}
.cf-patient-booking button:disabled{opacity:.55;cursor:not-allowed}
.cf-route-message{padding:11px 12px;background:#edf5fe;border:1px solid #c6e0f9;border-radius:9px;font-size:13px;color:#164c75}
.cf-route-message p{margin:4px 0 0}.cf-safety-message{background:#fff6e6;border-left:3px solid #d99024;border-radius:5px;padding:9px 10px;font-size:12px;color:#694516;margin:0}
.cf-error{color:#b42318;margin:5px 0;font-size:13px}
</style>
