<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { book, clinic } from '../shared/demoStore.js'
import {
  cloudConfigured,
  syncState,
  clinicflowPatientAvailableTimes,
  clinicflowBookPatientAuto,
} from '../../services/clinicSync.js'
import {
  SYMPTOM_CHOICES,
  SYMPTOM_REASON,
  needsDoctor,
  slotOccupied,
  patientSlotOccupied,
} from '../shared/clinicflowBookingRules.js'
import { isClinicWeekday, CLINIC_DAYS, CLINIC_HOURS, CLINIC_PHONE, CLINIC_PHONE_LINK, CLINIC_OPEN_HOUR, CLINIC_CLOSE_HOUR } from '../../config/clinicDetails.js'

// Matches the active Supabase clinician roster. Names are not selectable by patients.
const PROVIDERS = [
  { name: 'Dr. Smith', kind: 'doctor', start: '09:00', end: '17:00' },
  { name: 'Nurse Patel', kind: 'nurse', start: '09:00', end: '17:00' },
  { name: 'Nurse Chen', kind: 'nurse', start: '09:00', end: '17:00' },
]

const props = defineProps({ initialDate: { type: String, default: '' } })
const emit = defineEmits(['booked'])
const form = reactive({ symptom: '', date: '', time: '' })
const error = ref('')
const availabilityError = ref('')
const availabilityLoading = ref(false)
const booking = ref(false)
const remoteChoices = ref([])
const dropdownOpen = ref(false)
const timeToggle = ref(null)
const viewingYear = ref(new Date().getFullYear())
const viewingMonth = ref(new Date().getMonth())
let requestId = 0

const dateString = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const today = computed(() => dateString(new Date()))
const patientName = computed(() => syncState.profile?.full_name || 'Jordan Taylor')
const appointmentType = computed(() => needsDoctor(form.symptom) ? 'doctor' : 'nurse')
const monthHeading = computed(() => new Date(viewingYear.value, viewingMonth.value, 1)
  .toLocaleDateString('en-CA', { month: 'long', year: 'numeric' }))
const canGoBackMonth = computed(() =>
  viewingYear.value * 12 + viewingMonth.value > new Date().getFullYear() * 12 + new Date().getMonth())
const calendarDays = computed(() => {
  const leadingDays = new Date(viewingYear.value, viewingMonth.value, 1).getDay()
  const daysInMonth = new Date(viewingYear.value, viewingMonth.value + 1, 0).getDate()
  const length = Math.ceil((leadingDays + daysInMonth) / 7) * 7
  return Array.from({ length }, (_, index) => {
    const dayNumber = index - leadingDays + 1
    if (dayNumber < 1 || dayNumber > daysInMonth) return null
    const date = dateString(new Date(viewingYear.value, viewingMonth.value, dayNumber))
    return { day: dayNumber, date, past: date < today.value, closed: !isClinicWeekday(date) }
  })
})
const timeMinutes = value => {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}
const hhmm = minute => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
const formatTime = time => {
  const [hour, minute] = time.split(':').map(Number)
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
}
const selectedDateLabel = computed(() => form.date
  ? new Date(`${form.date}T12:00:00`).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })
  : '')

function setDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today.value || !isClinicWeekday(date)) return
  form.date = date
  form.time = ''
  dropdownOpen.value = true
  error.value = ''
  const parsed = new Date(`${date}T12:00:00`)
  viewingYear.value = parsed.getFullYear()
  viewingMonth.value = parsed.getMonth()
}
async function selectDate(date) {
  setDate(date)
  await nextTick()
  if (form.date === date) timeToggle.value?.focus()
}
watch(() => props.initialDate, date => {
  if (date) setDate(date)
}, { immediate: true })
function changeMonth(delta) {
  const date = new Date(viewingYear.value, viewingMonth.value + delta, 1)
  viewingYear.value = date.getFullYear()
  viewingMonth.value = date.getMonth()
}

function providersAt(time) {
  if (!form.symptom || !form.date) return []
  return PROVIDERS.filter(provider => provider.kind === appointmentType.value
    && timeMinutes(time) >= timeMinutes(provider.start)
    && timeMinutes(time) + 15 <= timeMinutes(provider.end)
    && !slotOccupied(clinic.appointments, provider.name, form.date, time))
}
function localAvailableTimes() {
  if (!form.symptom || !form.date || !isClinicWeekday(form.date)) return []
  const times = []
  for (let minute = CLINIC_OPEN_HOUR * 60; minute < CLINIC_CLOSE_HOUR * 60; minute += 15) {
    const time = hhmm(minute)
    if (new Date(`${form.date}T${time}:00`) <= new Date()) continue
    if (patientSlotOccupied(clinic.appointments, patientName.value, form.date, time)) continue
    if (providersAt(time).length) times.push(time)
  }
  return times
}
const availableTimes = computed(() => cloudConfigured ? remoteChoices.value : localAvailableTimes())
const displayedTimes = computed(() => {
  if (!form.symptom || !form.date || !isClinicWeekday(form.date)) return []
  const pool = PROVIDERS.filter(provider => provider.kind === appointmentType.value)
  const start = Math.min(...pool.map(provider => timeMinutes(provider.start)))
  const end = Math.max(...pool.map(provider => timeMinutes(provider.end)))
  const times = []
  for (let minute = start; minute + 15 <= end; minute += 15) times.push(hhmm(minute))
  return times
})

watch([() => form.symptom, () => form.date], async ([symptom, date]) => {
  const currentRequest = ++requestId
  form.time = ''
  remoteChoices.value = []
  error.value = ''
  availabilityError.value = ''
  availabilityLoading.value = false
  dropdownOpen.value = Boolean(date)
  if (!symptom || !date || !cloudConfigured) return
  availabilityLoading.value = true
  try {
    const times = await clinicflowPatientAvailableTimes(date, symptom)
    if (currentRequest === requestId) remoteChoices.value = times
  } catch (cause) {
    if (currentRequest === requestId) availabilityError.value = cause.message || 'Could not check availability.'
  } finally {
    if (currentRequest === requestId) availabilityLoading.value = false
  }
})

function chooseTime(time) {
  if (availabilityLoading.value || !availableTimes.value.includes(time)) return
  form.time = time
  dropdownOpen.value = false
}
function assignLocalClinician(time) {
  const available = providersAt(time)
  const active = appointment => !['cancelled', 'canceled', 'no show'].includes(String(appointment.status || '').toLowerCase())
  available.sort((a, b) => {
    const count = clinician => clinic.appointments.filter(appointment =>
      appointment.date === form.date && appointment.doctor === clinician && active(appointment)).length
    return count(a.name) - count(b.name) || a.name.localeCompare(b.name)
  })
  return available[0]?.name
}
async function submit() {
  error.value = ''
  if (!SYMPTOM_REASON[form.symptom] || !form.date || !form.time) {
    error.value = 'Choose a concern, date and available time.'
    return
  }
  if (!availableTimes.value.includes(form.time)) {
    error.value = 'That time is no longer available. Choose another time or date.'
    dropdownOpen.value = true
    return
  }
  booking.value = true
  try {
    if (cloudConfigured) {
      // The database chooses the clinician and prevents concurrent double bookings.
      await clinicflowBookPatientAuto({ date: form.date, time: form.time, symptom: form.symptom })
    } else {
      const clinician = assignLocalClinician(form.time)
      if (!clinician) throw new Error('That time is no longer available.')
      book({ patient: patientName.value, doctor: clinician, date: form.date,
        time: form.time, reason: SYMPTOM_REASON[form.symptom] })
    }
    form.time = ''
    emit('booked')
  } catch (cause) {
    error.value = cause.message || 'Booking failed. Choose another time or date.'
    dropdownOpen.value = true
    if (cloudConfigured) {
      try { remoteChoices.value = await clinicflowPatientAvailableTimes(form.date, form.symptom) }
      catch { /* Keep the original booking error visible. */ }
    }
  } finally {
    booking.value = false
  }
}

</script>

<template>
  <form class="cf-auto-booking" @submit.prevent="submit">
    <label for="cf-symptom">What symptoms or concerns are you experiencing?</label>
    <select id="cf-symptom" v-model="form.symptom" required>
      <option value="" disabled>Choose a reason for visiting</option>
      <option v-for="item in SYMPTOM_CHOICES" :key="item.value" :value="item.value">{{ item.label }}</option>
    </select>
    <div v-if="form.symptom" class="cf-route" role="status">
      Your appointment will be assigned to {{ needsDoctor(form.symptom) ? 'the doctor' : 'an available nurse' }}.
      You do not need to choose a clinician.
    </div>
    <p class="cf-warning" role="note">This is a prototype booking rule, not clinical triage.
      If symptoms are severe, sudden, or an emergency, call 911 or seek emergency care instead.</p>

    <p class="cf-field-label">Choose an appointment date</p>
    <p class="cf-note">Clinic hours: {{ CLINIC_DAYS }}, {{ CLINIC_HOURS }}. Closed Saturday and Sunday. Last appointment begins at 4:45 PM.</p>
    <div class="cf-calendar" aria-label="Appointment date calendar">
      <div class="cf-month">
        <button type="button" aria-label="Previous month" :disabled="!canGoBackMonth" @click="changeMonth(-1)">‹</button>
        <strong>{{ monthHeading }}</strong>
        <button type="button" aria-label="Next month" @click="changeMonth(1)">›</button>
      </div>
      <div class="cf-grid" role="group" aria-label="Calendar dates">
        <span v-for="weekday in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']" :key="weekday" class="cf-weekday">{{ weekday }}</span>
        <template v-for="(cell, index) in calendarDays" :key="index">
          <span v-if="!cell" class="cf-blank" aria-hidden="true"></span>
          <button v-else type="button" :disabled="cell.past || cell.closed" :aria-pressed="form.date === cell.date"
            :class="{ selected: form.date === cell.date, today: cell.date === today, closed: cell.closed }"
            :aria-label="cell.date + (cell.closed ? ', clinic closed' : '')" @click="selectDate(cell.date)">{{ cell.day }}</button>
        </template>
      </div>
    </div>

    <div v-if="form.date" class="cf-time-field">
      <label class="cf-field-label" for="cf-time-toggle">Available times for {{ selectedDateLabel }}</label>
      <button id="cf-time-toggle" ref="timeToggle" type="button" class="cf-time-toggle"
        :aria-expanded="dropdownOpen" aria-controls="cf-time-options" @click="dropdownOpen = !dropdownOpen">
        <span>{{ form.time ? formatTime(form.time) : availabilityLoading ? 'Checking availability…' : 'Choose an available time' }}</span>
        <span aria-hidden="true" class="cf-down-arrow" :class="{ open: dropdownOpen }">⌄</span>
      </button>
      <div v-if="dropdownOpen" id="cf-time-options" class="cf-time-dropdown" role="group" aria-label="15-minute appointment time options">
        <p v-if="!form.symptom" class="cf-note">Choose your symptom category above to see available times.</p>
        <p v-else-if="availabilityLoading" class="cf-note">Checking available clinicians…</p>
        <p v-else-if="availabilityError" class="cf-error" role="alert">{{ availabilityError }}</p>
        <template v-else>
          <div class="cf-time-grid">
            <button v-for="time in displayedTimes" :key="time" type="button"
              :disabled="!availableTimes.includes(time) || booking"
              :aria-pressed="form.time === time" :class="{ chosen: form.time === time }"
              :title="availableTimes.includes(time) ? 'Available' : 'Already booked or unavailable'"
              @click="chooseTime(time)">{{ formatTime(time) }}</button>
          </div>
          <p v-if="form.symptom && !availableTimes.length" class="cf-note">
            No available appointments on this date. The calendar stays open—choose another date above.
          </p>
        </template>
      </div>
    </div>
    <p v-if="error" class="cf-error" role="alert">{{ error }}</p>
    <p class="cf-call-note">To cancel or reschedule an appointment, please
      <a v-if="CLINIC_PHONE_LINK" :href="CLINIC_PHONE_LINK">call the clinic at {{ CLINIC_PHONE }}</a>
      <span v-else>call the clinic at {{ CLINIC_PHONE }}</span>.
    </p>
    <button class="cf-book-button" type="submit"
      :disabled="booking || availabilityLoading || !form.symptom || !form.date || !form.time">
      {{ booking ? 'Booking…' : 'Book appointment' }}
    </button>
  </form>
</template>

<style scoped>
.cf-auto-booking{display:grid;gap:12px;margin:12px 0 25px;font-family:inherit}
.cf-auto-booking>label,.cf-field-label{font-size:14px;font-weight:700;color:#294058}
.cf-auto-booking>select{width:100%;min-height:43px;border:1px solid #c9d7e5;border-radius:9px;background:white;padding:10px;color:#294058;font:inherit}
.cf-calendar{border:1px solid #d6e3ef;border-radius:13px;background:white;padding:10px}
.cf-month{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-bottom:12px}
.cf-month button{border:1px solid #d9e5ef;border-radius:8px;background:#f4f8fc;color:#30597a;min-width:40px;min-height:36px;font-size:24px;cursor:pointer}
.cf-month button:disabled{opacity:.35;cursor:default}
.cf-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;text-align:center}
.cf-weekday{font-weight:700;color:#648099;font-size:11px;padding:7px 1px}
.cf-grid button{min-width:0;aspect-ratio:1;border:0;border-radius:8px;background:#f6f9fc;color:#315271;font:inherit;font-size:13px;cursor:pointer}
.cf-grid button:hover:not(:disabled){background:#dbeaf9}.cf-grid button:disabled{opacity:.26;cursor:default}
.cf-grid button.closed{background:#e7ebef;color:#7c8793}
.cf-grid button.selected{background:#2676b6;color:white;font-weight:800}
.cf-grid button.today:not(.selected){outline:1px solid #2676b6}
.cf-route{padding:12px;background:#eaf4fc;color:#155680;border-radius:9px;font-size:13px}
.cf-warning{font-size:12px;color:#64470d;background:#fff6e5;border-left:3px solid #ce8d30;padding:10px;margin:0}
.cf-time-field{display:grid;gap:7px}
.cf-time-toggle{width:100%;min-height:45px;border:1px solid #b9cee0;border-radius:9px;background:white;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;color:#294058;text-align:left;font:inherit;cursor:pointer}
.cf-down-arrow{font-size:21px;display:inline-block;transition:transform .15s ease}.cf-down-arrow.open{transform:rotate(180deg)}
.cf-time-dropdown{border:1px solid #b9cee0;border-radius:9px;background:white;padding:9px;max-height:240px;overflow-y:auto;box-shadow:0 5px 16px #1736531c}
.cf-time-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.cf-time-grid button{font:inherit;font-size:12px;border:1px solid #c5d9e9;border-radius:7px;background:#f3f9ff;color:#245680;padding:10px 3px;cursor:pointer}
.cf-time-grid button:disabled{color:#9a9a9a;background:#f0f0f0;opacity:.58;text-decoration:line-through;cursor:not-allowed}
.cf-time-grid button.chosen{background:#2676b6;color:white;border-color:#2676b6}
.cf-note{font-size:13px;background:#f2f7fc;color:#375875;padding:10px;border-radius:7px;margin:0}
.cf-error{font-size:13px;color:#b42318;margin:0}
.cf-call-note{color:#60778b;font-size:12px;margin:0}.cf-call-note a{color:#1c6398;text-decoration:underline}
.cf-book-button{border:0;border-radius:9px;background:#2676b6;color:#fff;font-weight:700;font:inherit;padding:13px;cursor:pointer}
.cf-book-button:disabled{opacity:.55;cursor:default}
@media(max-width:380px){.cf-time-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
