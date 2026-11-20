<script setup>
import ClinicAppointmentActions from '../shared/ClinicAppointmentActions.vue'
import PatientBookingFlow from './PatientBookingFlow.vue'
import { syncState, markRead } from '../../services/clinicSync.js'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { clinic, book, confirmAppointment, day, ordered, staff, queue } from '../shared/demoStore.js'
import { language, t, formatDate, formatTime, countLabel } from '../../language.js'
import PatientCalendar from './PatientCalendar.vue'

const patientName = computed(() => syncState.profile?.full_name || 'Jordan Taylor')
const queuePosition = computed(() => queue().findIndex(a => a.patient === patientName.value) + 1)
const now = ref(new Date())
const minDate = computed(() => now.value.toLocaleDateString('en-CA'))
const closedStatuses = ['Completed', 'Cancelled', 'No show']
const activeVisitStatuses = ['Checked in', 'In progress']
const patientAppointments = computed(() => ordered(clinic.appointments.filter(appointment =>
  appointment.patient.trim().toLowerCase() === patientName.value.toLowerCase()
)))
import { cancelPatientAppointment } from '../../services/clinicSync.js'

async function cancelVisit(appointment) {
  if (!window.confirm('Cancel this appointment?')) return

  try {
    await cancelPatientAppointment(appointment.id)
  } catch (error) {
    window.alert(error.message || 'Could not cancel appointment.')
  }
}

function isInHistory(appointment) {
  if (closedStatuses.includes(appointment.status)) return true
  const scheduledAt = new Date(`${appointment.date}T${appointment.time}`)
  const isStillInClinic = activeVisitStatuses.includes(appointment.status) && appointment.date === minDate.value
  return !isStillInClinic && scheduledAt <= now.value
}

const sortedAppointments = computed(() => patientAppointments.value.filter(appointment => !isInHistory(appointment)))
const pastAppointments = computed(() => patientAppointments.value.filter(isInHistory).reverse())

function refreshTime() {
  now.value = new Date()
}

let clockTimer
onMounted(() => {
  clockTimer = window.setInterval(refreshTime, 30000)
  window.addEventListener('focus', refreshTime)
})
onUnmounted(() => {
  window.clearInterval(clockTimer)
  window.removeEventListener('focus', refreshTime)
})
const hasMoreAppointments = computed(() => sortedAppointments.value.length > 3)
const homeAppointments = computed(() => hasMoreAppointments.value
  ? sortedAppointments.value.slice(0, 2) : sortedAppointments.value)
const currentPage = ref('home')
const pageHistory = ref([])
const statusMessage = ref('')
const feedbackSent = ref(false)
const booking = reactive({ doctor: 'Dr. Smith', date: day(), time: '' })
const feedback = reactive({ rating: '', message: '' })
const appointmentDay = ref(day())
const dailyAppointments = computed(() => sortedAppointments.value.filter(a => a.date === appointmentDay.value))
const availableTimes = computed(() => slotsFor(booking.date))

function minutes(value) {
  const [time, period] = value.trim().split(' ')
  const [hour, minute] = time.split(':').map(Number)
  return (hour % 12 + (period === 'PM' ? 12 : 0)) * 60 + minute
}

function slotsFor(date) {
  const provider = staff.find(person => person.name === booking.doctor)
  if (!provider || date < day()) return []
  const [start, end] = provider.shift.split('–').map(minutes)
  const now = Date.now()
  const active = clinic.appointments.filter(a =>
    a.date === date && (a.doctor === booking.doctor || a.patient.toLowerCase() === patientName.value.toLowerCase()) &&
    !['Cancelled', 'No show'].includes(a.status)
  )
  const slots = []
  for (let startMinute = start; startMinute + 30 <= end; startMinute += 30) {
    const time = `${String(Math.floor(startMinute / 60)).padStart(2, '0')}:${String(startMinute % 60).padStart(2, '0')}`
    const overlaps = active.some(a => {
      const [hour, minute] = a.time.split(':').map(Number)
      return Math.abs(startMinute - (hour * 60 + minute)) < 30
    })
    if (new Date(`${date}T${time}:00`).getTime() > now && !overlaps) slots.push(time)
  }
  return slots
}

function selectBookingDate(date) {
  booking.date = date
  booking.time = ''
  statusMessage.value = ''
}
const queueLabel = computed(() => {
  const n = queuePosition.value
  if (n < 1) return t('Not currently in line')
  if (language.value === 'fr') return t('Position {position} in line', { position: n })
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'
  return `${n}${suffix} in line`
})
function openPage(page) {
  refreshTime()
  if (currentPage.value === page) return
  pageHistory.value.push(currentPage.value)
  currentPage.value = page
  statusMessage.value = ''
}
function goHome() {
  refreshTime()
  currentPage.value = 'home'
  pageHistory.value = []
}
function goBack() {
  if (pageHistory.value.length) currentPage.value = pageHistory.value.pop()
  else statusMessage.value = 'You are already on the home screen.'
}
function saveBooking() {
  if (!slotsFor(booking.date).includes(booking.time)) {
    booking.time = ''
    statusMessage.value = 'That time is no longer available. Choose another time.'
    return
  }
  try {
    book({ patient: patientName.value, doctor: booking.doctor, date: booking.date, time: booking.time, reason: 'Consultation' })
  } catch (error) {
    statusMessage.value = error.message || 'That appointment slot is not available.'
    return
  }
  booking.time = ''
  goHome()
  statusMessage.value = 'Appointment booked. Please confirm your attendance.'
}
function confirm(id) {
  if (confirmAppointment(id, patientName.value)) statusMessage.value = 'Appointment confirmed.'
}
function submitFeedback() { feedbackSent.value = true; feedback.rating = ''; feedback.message = '' }

const expandedAppointmentIds = ref(new Set())
// Set VITE_CLINIC_OFFICE_ADDRESS in Vercel when you have a real address.
const clinicOfficeAddress = import.meta.env.VITE_CLINIC_OFFICE_ADDRESS || 'Address will be provided by the clinic.'
function toggleAppointmentDetails(id) {
  const next = new Set(expandedAppointmentIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedAppointmentIds.value = next
}

</script>

<template>
  <div class="viewport">
    <div class="phone-app">
      <header class="top-bar">
        <button class="icon-button" type="button" :aria-label="t('Open patient profile')" @click="openPage('profile')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7.5" r="3.5" /><path d="M4.5 20v-2a7.5 7.5 0 0 1 15 0v2" /></svg>
        </button>
        <span class="brand">ClinicFlow</span>
        <button class="icon-button" type="button" :aria-label="t('View notifications')" @click="openPage('notifications')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" /><path d="M10 21h4" /></svg>
        </button>
      </header>
      <nav class="patient-web-navigation" aria-label="Patient website navigation">
        <button type="button" :class="{ active: currentPage === 'home' }" @click="goHome">Home</button>
        <button type="button" :class="{ active: currentPage === 'appointments' }" @click="openPage('appointments')">Appointments</button>
        <button type="button" :class="{ active: currentPage === 'booking' }" @click="openPage('booking')">Book appointment</button>
        <button type="button" :class="{ active: currentPage === 'feedback' }" @click="openPage('feedback')">Feedback</button>
        <button type="button" :class="{ active: currentPage === 'profile' }" @click="openPage('profile')">Profile</button>
      </nav>


      <main class="main-content" id="main-content">
        <!-- HOME: follows the layout of the supplied drawing -->
        <div v-if="currentPage === 'home'" class="home-content">
          <section aria-labelledby="upcoming-heading">
            <h1 id="upcoming-heading" class="section-heading">{{ t('Upcoming') }}</h1>
            <div class="appointments-list">
              <article v-for="appointment in homeAppointments" :key="appointment.id" class="appointment-card">
                <div class="appointment-left">
                  <span class="card-label">{{ t('Appointment') }}</span>
                  <strong>{{ appointment.doctor }}</strong>
                </div>
                <div class="appointment-right">
                  <strong>{{ formatTime(appointment.time) }}</strong>
                  <span>{{ formatDate(appointment.date) }}</span>
                </div>
                <div class="appointment-confirmation">
                  <span class="confirmation-badge" :class="{ confirmed: appointment.confirmed }">{{ t(appointment.confirmed ? 'Confirmed' : appointment.status === 'Scheduled' ? 'Awaiting confirmation' : appointment.status) }}</span>
                  <button v-if="appointment.status === 'Scheduled' && !appointment.confirmed" class="confirm-button" type="button" @click="confirm(appointment.id)">{{ t('Confirm appointment') }}</button>
                </div>
              
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
              
                <ClinicAppointmentActions :appointment="appointment" :show-details="false" />
              </article>
            </div>
            <p v-if="sortedAppointments.length === 0" class="empty-state">{{ t('No upcoming appointments.') }}</p>
            <button type="button" class="view-more-button" @click="openPage('calendar')">Appointment calendar</button>
            <button
              v-if="hasMoreAppointments"
              type="button"
              class="view-more-button"
              @click="openPage('appointments')"
            >
              {{ t('View More') }} <span aria-hidden="true">→</span>
            </button>
          </section>

          <p v-if="statusMessage" class="status-message" role="status">{{ t(statusMessage) }}</p>
          <div class="flex-spacer"></div>

          <section class="quick-actions" :aria-label="t('Patient actions')">
            <button type="button" class="action-card" @click="openPage('booking')">{{ t('Booking') }}</button>
            <button type="button" class="action-card" @click="openPage('feedback')">{{ t('Surveys / Feedback') }}</button>
          </section>

          <section class="queue-section" aria-labelledby="queue-heading">
            <h2 id="queue-heading" class="section-heading">{{ t('Queue') }}</h2>
            <p class="queue-position"><span class="queue-dot" aria-hidden="true"></span>{{ queueLabel }}</p>
          </section>
          <div class="bottom-spacer"></div>
        </div>

        <!-- FULL UPCOMING APPOINTMENTS: separate scrollable list -->
        <section v-else-if="currentPage === 'appointments'" class="detail-screen appointments-page" aria-labelledby="all-appointments-heading">
          <h1 id="all-appointments-heading" class="section-heading">{{ t('All Appointments') }}</h1>
          <p v-if="statusMessage" class="status-message" role="status">{{ t(statusMessage) }}</p>
          <p class="screen-description">{{ countLabel(sortedAppointments.length, 'upcoming appointment', 'upcoming appointments') }}</p>
          <div class="all-appointments-list" role="list" :aria-label="t('All upcoming appointments')">
            <article v-for="appointment in sortedAppointments" :key="appointment.id" class="appointment-card" role="listitem">
              <div class="appointment-left">
                <span class="card-label">{{ t('Appointment') }}</span>
                <strong>{{ appointment.doctor }}</strong>
              </div>
              <div class="appointment-right">
                <strong>{{ formatTime(appointment.time) }}</strong>
                <span>{{ formatDate(appointment.date) }}</span>
              </div>
              <div class="appointment-confirmation">
                <span class="confirmation-badge" :class="{ confirmed: appointment.confirmed }">{{ t(appointment.confirmed ? 'Confirmed' : appointment.status === 'Scheduled' ? 'Awaiting confirmation' : appointment.status) }}</span>
                <button v-if="appointment.status === 'Scheduled' && !appointment.confirmed" class="confirm-button" type="button" @click="confirm(appointment.id)">{{ t('Confirm appointment') }}</button>
              </div>
            
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
              
                <ClinicAppointmentActions :appointment="appointment" :show-details="false" />
              </article>
          </div>
          <button type="button" class="all-appointments-back" @click="goBack">← {{ t('Back to Home') }}</button>
        </section>

        <section v-else-if="currentPage === 'calendar'" class="detail-screen" aria-labelledby="calendar-heading">
          <h1 id="calendar-heading" class="section-heading">Appointment calendar</h1>
          <PatientCalendar :selected="appointmentDay" :appointments="sortedAppointments" @select="appointmentDay = $event" />
          <h2 class="section-heading">{{ formatDate(appointmentDay) }}</h2>
          <p v-if="!dailyAppointments.length" class="empty-state">No upcoming appointments on this date.</p>
          <div v-for="appointment in dailyAppointments" :key="appointment.id" class="detail-card">
            <strong>{{ formatTime(appointment.time) }} · {{ appointment.doctor }}</strong>
            <p>{{ appointment.reason }} · {{ appointment.confirmed ? 'Confirmed' : appointment.status }}</p>
          </div>
          <button type="button" class="primary-button" @click="selectBookingDate(appointmentDay); openPage('booking')">View booking availability</button>
        </section>

        <!-- BOOKING SCREEN -->
        <section v-else-if="currentPage === 'booking'" class="detail-screen" aria-labelledby="booking-heading">
          <h1 class="section-heading">Book an appointment</h1>
          <PatientBookingFlow @booked="goHome" />
        </section>

        <!-- FEEDBACK SCREEN -->
        <section v-else-if="currentPage === 'feedback'" class="detail-screen" aria-labelledby="feedback-heading">
          <h1 id="feedback-heading" class="section-heading">{{ t('Surveys / Feedback') }}</h1>
          <p class="screen-description">{{ t('Tell us about your experience.') }}</p>
          <p v-if="feedbackSent" class="status-message" role="status">{{ t('Thank you for your feedback!') }}</p>
          <form class="form-stack" @submit.prevent="submitFeedback">
            <label for="rating">{{ t('Rating') }}</label>
            <select id="rating" v-model="feedback.rating" required>
              <option disabled value="">{{ t('Select a rating') }}</option>
              <option value="5">5 — {{ t('Excellent') }}</option>
              <option value="4">4 — {{ t('Good') }}</option>
              <option value="3">3 — {{ t('Average') }}</option>
              <option value="2">2 — {{ t('Poor') }}</option>
              <option value="1">1 — {{ t('Very poor') }}</option>
            </select>
            <label for="comments">{{ t('Comments (optional)') }}</label>
            <textarea id="comments" v-model="feedback.message" rows="5" :placeholder="t('Share your feedback...')"></textarea>
            <button class="primary-button" type="submit">{{ t('Submit feedback') }}</button>
          </form>
        </section>

        <!-- PROFILE AND NOTIFICATIONS -->
        <section v-else-if="currentPage === 'profile'" class="detail-screen" aria-labelledby="profile-heading">
          <h1 id="profile-heading" class="section-heading">{{ t('Profile') }}</h1>
          <div class="detail-card"><strong>{{ patientName }}</strong><p>{{ t('Patient account') }}</p><p>{{ t('Manage your appointments and account from ClinicFlow.') }}</p></div>
        </section>

        <section v-else-if="currentPage === 'notifications'" class="detail-screen" aria-labelledby="notifications-heading">
          <h1 id="notifications-heading" class="section-heading">Notifications</h1>
          <p v-if="!syncState.notifications.length" class="screen-description">No appointment notifications yet.</p>
          <article v-for="note in syncState.notifications" :key="note.id" class="detail-card">
            <strong>{{ note.read_at ? 'Appointment update' : 'New appointment update' }}</strong>
            <p>{{ note.message }}</p>
            <small>{{ new Date(note.created_at).toLocaleString() }}</small>
            <div><button v-if="!note.read_at" class="primary-button" type="button" @click="markRead(note.id)">Mark as read</button></div>
          </article>
          </section>

        <section v-else-if="currentPage === 'settings'" class="detail-screen" aria-labelledby="settings-heading">
          <h1 id="settings-heading" class="section-heading">{{ t('Settings') }}</h1>
          <div class="form-stack">
            <label for="settings-language">{{ t('Language') }}</label>
            <select id="settings-language" v-model="language">
              <option value="en" lang="en">English</option>
              <option value="fr" lang="fr">Français</option>
            </select>
          </div>
          <div class="menu-actions history-action">
            <button type="button" @click="openPage('history')">{{ t('Past appointments') }} <span aria-hidden="true">›</span></button>
          </div>
        </section>

        <section v-else-if="currentPage === 'history'" class="detail-screen" aria-labelledby="history-heading">
          <h1 id="history-heading" class="section-heading">{{ t('Past appointments') }}</h1>
          <div v-if="pastAppointments.length" class="all-appointments-list">
            <article v-for="appointment in pastAppointments" :key="appointment.id" class="appointment-card">
              <div class="appointment-left">
                <strong>{{ t(appointment.status === 'Completed' ? 'Seen by {clinician}' : 'Assigned to {clinician}', { clinician: appointment.doctor }) }}</strong>
                <span>{{ t(appointment.status) }}</span>
              </div>
              <div class="appointment-right">
                <span>{{ formatDate(appointment.date) }}</span>
                <span>{{ formatTime(appointment.time) }}</span>
              </div>
            
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
              
                <ClinicAppointmentActions :appointment="appointment" :show-details="false" />
              </article>
          </div>
          <p v-else class="empty-state">{{ t('No past appointments.') }}</p>
          <button type="button" class="all-appointments-back" @click="goBack">← {{ t('Back to Settings') }}</button>
        </section>

        <!-- MENU -->
        <section v-else-if="currentPage === 'menu'" class="detail-screen" aria-labelledby="menu-heading">
          <h1 id="menu-heading" class="section-heading">{{ t('Menu') }}</h1>
          <div class="menu-actions">
            <button type="button" @click="goHome">{{ t('Home') }} <span aria-hidden="true">›</span></button>
            <button type="button" @click="openPage('appointments')">{{ t('All Appointments') }} <span aria-hidden="true">›</span></button>
            <button type="button" @click="openPage('booking')">{{ t('Booking') }} <span aria-hidden="true">›</span></button>
            <button type="button" @click="openPage('feedback')">{{ t('Surveys / Feedback') }} <span aria-hidden="true">›</span></button>
            <button type="button" @click="openPage('profile')">{{ t('Profile') }} <span aria-hidden="true">›</span></button>
            <button type="button" @click="openPage('settings')">{{ t('Settings') }} <span aria-hidden="true">›</span></button>
            <button type="button" @click="openPage('notifications')">{{ t('Notifications') }} <span aria-hidden="true">›</span></button>
          </div>
        </section>
      </main>

      <nav class="bottom-nav" :aria-label="t('Bottom navigation')">
        <button class="nav-button" type="button" :aria-label="t('Back')" @click="goBack">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7" /></svg>
        </button>
        <button class="nav-button" :class="{ 'nav-active': currentPage === 'home' }" type="button" :aria-label="t('Home')" :aria-current="currentPage === 'home' ? 'page' : undefined" @click="goHome">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v11H3V10Z" /><path d="M9 21v-7h6v7" /></svg>
        </button>
        <button class="nav-button" :class="{ 'nav-active': currentPage === 'menu' }" type="button" :aria-label="t('Menu')" :aria-current="currentPage === 'menu' ? 'page' : undefined" @click="openPage('menu')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.cf-bell-count{color:#f47730;font-size:12px;position:relative;line-height:1;}
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:global(*) { box-sizing: border-box; }
:global(body) { margin: 0; }
:global(button), :global(input), :global(select), :global(textarea) { font: inherit; }

.viewport {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef2f7;
  color: #1e293b;
  font-family: 'Inter', Arial, sans-serif;
}
.phone-app {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 430px;
  height: 100dvh;
  max-height: 860px;
  background: #fff;
  overflow: hidden;
}
.top-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 77px;
  padding: calc(10px + env(safe-area-inset-top)) 21px 10px;
}
.brand { font-size: 13px; font-weight: 700; letter-spacing: .04em; color: #496888; }
.icon-button, .nav-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  border-radius: 9px;
  color: #263849;
  cursor: pointer;
}
.icon-button { width: 44px; height: 44px; }
.icon-button svg, .nav-button svg {
  width: 25px;
  height: 25px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.icon-button:hover, .nav-button:hover { background: #eef5fb; }
.main-content { flex: 1; min-height: 0; overflow-y: auto; padding: 0 21px; }
.home-content { min-height: 100%; display: flex; flex-direction: column; }
.section-heading {
  width: fit-content;
  position: relative;
  margin: 18px auto 22px;
  font-size: 20px;
  line-height: 1.4;
  font-weight: 600;
  letter-spacing: -.025em;
  text-align: center;
}
.section-heading::after {
  content: '';
  position: absolute;
  bottom: -7px;
  left: 0;
  right: 0;
  height: 2px;
  background: #3376b2;
  border-radius: 2px;
}
.appointments-list { display: grid; gap: 10px; }
.appointment-card {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  min-height: 88px;
  padding: 15px 13px;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
}
.appointment-left, .appointment-right { display: flex; flex-direction: column; gap: 7px; font-size: 13px; }
.appointment-left { align-items: flex-start; }
.appointment-right { align-items: flex-end; text-align: right; }
.appointment-card strong { font-size: 14px; font-weight: 600; }
.card-label { color: #526477; }
.appointment-right span { color: #526477; }
/* Only shown when there are 4 or more appointments. */
.view-more-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  min-height: 44px;
  margin-top: 10px;
  padding: 9px 12px;
  border: 1px solid #b9d1e6;
  border-radius: 8px;
  background: #f5f9fd;
  color: #276ea9;
  font-weight: 600;
  cursor: pointer;
}
.view-more-button:hover, .all-appointments-back:hover { background: #e8f3fc; }
.view-more-button:active { background: #d8eafd; }
.empty-state { color: #526477; font-size: 14px; text-align: center; }
.appointments-page { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.appointments-page .screen-description { flex-shrink: 0; text-align: center; margin-bottom: 14px; }
.all-appointments-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 2px 3px 12px;
  scrollbar-width: thin;
  scrollbar-color: #b9cbdc transparent;
}
.all-appointments-list .appointment-card { flex-shrink: 0; }
.all-appointments-back {
  flex-shrink: 0;
  width: 100%;
  min-height: 44px;
  margin-top: 11px;
  padding: 10px 12px;
  color: #276ea9;
  background: #f5f9fd;
  border: 1px solid #b9d1e6;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
.flex-spacer { flex: 1 1 85px; min-height: 48px; }
.quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 17px; margin: 0 23px; }
.action-card {
  min-height: 78px;
  padding: 10px 5px;
  background: #fff;
  border: 1px solid #9baec1;
  border-radius: 8px;
  color: #20384e;
  font-weight: 600;
  font-size: 15px;
  line-height: 1.35;
  cursor: pointer;
  transition: background .15s, border-color .15s, transform .15s;
}
.action-card:hover { background: #eef5fb; border-color: #3376b2; }
.action-card:active { transform: scale(.98); }
.queue-section { margin-top: clamp(38px, 8vh, 74px); }
.queue-section .section-heading { margin-top: 0; margin-bottom: 23px; }
.queue-position { display: flex; justify-content: center; align-items: center; gap: 9px; margin: 0; font-size: 17px; font-weight: 500; }
.queue-dot { width: 6px; height: 6px; border-radius: 50%; background: #3376b2; }
.bottom-spacer { flex: .55 1 50px; min-height: 28px; }
.status-message { border: 1px solid #bbd7ed; background: #f0f7fe; border-radius: 8px; padding: 11px 13px; color: #234e75; font-size: 13px; line-height: 1.5; }
.bottom-nav {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-items: center;
  flex-shrink: 0;
  min-height: calc(64px + env(safe-area-inset-bottom));
  padding: 6px 16px calc(6px + env(safe-area-inset-bottom));
  border-top: 1px solid #cbd5e1;
  background: #fff;
}
.nav-button { height: 48px; width: 100%; }
.nav-active { color: #276ea9; }
.detail-screen { padding: 5px 3px 32px; }
.detail-screen .section-heading { margin-bottom: 29px; }
.screen-description { margin: 0 0 25px; line-height: 1.6; font-size: 14px; color: #526477; }
.form-stack { display: flex; flex-direction: column; gap: 10px; }
.form-stack label { font-weight: 600; font-size: 13px; margin-top: 7px; }
.form-stack input, .form-stack select, .form-stack textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #c1cfdb;
  border-radius: 8px;
  background: white;
  color: #1e293b;
}
.form-stack textarea { resize: vertical; }
.primary-button {
  margin-top: 14px;
  padding: 13px;
  border: 1px solid #276ea9;
  border-radius: 8px;
  background: #276ea9;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.primary-button:hover { background: #1d5583; }
.detail-card { border: 1px solid #cbd5e1; padding: 17px; border-radius: 9px; line-height: 1.5; }
.detail-card p { font-size: 14px; color: #526477; }
.detail-card p:last-child { margin-bottom: 0; }
.menu-actions { display: grid; gap: 11px; }
.menu-actions button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 54px;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 12px 15px;
  color: #20384e;
  cursor: pointer;
  text-align: left;
}
.menu-actions button:hover { background: #eef5fb; }
.menu-actions span { font-size: 23px; color: #276ea9; }
button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 3px solid #83b8ed; outline-offset: 2px; }
@media (min-width: 600px) {
  .viewport { padding: 22px; }
  .phone-app { height: min(860px, calc(100dvh - 44px)); border: 1px solid #d6e0e9; border-radius: 24px; box-shadow: 0 16px 48px #23435d1c; }
}
@media (max-height: 600px) {
  .flex-spacer { min-height: 18px; }
  .queue-section { margin-top: 27px; }
  .bottom-spacer { min-height: 18px; }
}
@media (prefers-reduced-motion: reduce) { .action-card { transition: none; } }
.appointment-card{flex-wrap:wrap}
.appointment-confirmation{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding-top:9px;border-top:1px solid #e3e8ee;flex-wrap:wrap}
.confirmation-badge{font-size:11px;color:#8a5b0d;font-weight:700}
.confirmation-badge.confirmed{color:#14764b}
.confirm-button{background:#2777b5;color:#fff;border:0;border-radius:7px;padding:8px 11px;font-size:12px;font-weight:700;cursor:pointer}
.confirm-button:hover{background:#195e96}
.history-action { margin-top: 18px; }

/* Responsive website layout. The original phone layout remains on narrow screens. */
.patient-web-navigation { display: none; }
@media (min-width: 768px) {
  .viewport { display: block; min-height: calc(100dvh - 62px); padding: 0; background: #f5f8fb; }
  .phone-app { width: 100%; max-width: 1260px; height: auto; max-height: none; min-height: calc(100dvh - 62px); margin: 0 auto; overflow: visible; border: 0; border-radius: 0; box-shadow: none; background: transparent; }
  .top-bar { min-height: 76px; padding: 18px clamp(24px, 4vw, 56px); background: #fff; border-bottom: 1px solid #dce5ed; }
  .top-bar .brand { font-size: 18px; }
  .patient-web-navigation { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; padding: 12px clamp(24px, 4vw, 56px); background: #fff; border-bottom: 1px solid #dce5ed; }
  .patient-web-navigation button { border: 0; border-radius: 9px; padding: 11px 15px; background: transparent; color: #49647a; font-size: 14px; font-weight: 650; cursor: pointer; }
  .patient-web-navigation button.active, .patient-web-navigation button:hover { background: #e8f2fb; color: #216ca6; }
  .main-content { width: 100%; overflow: visible; padding: 0 clamp(24px, 4vw, 56px) 40px; }
  .home-content { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(290px, .8fr); grid-template-rows: auto auto; align-items: start; align-content: start; gap: 24px; min-height: 0; padding-top: 30px; }
  .home-content > section:first-child { grid-column: 1; grid-row: 1 / span 2; min-width: 0; }
  .home-content .quick-actions { grid-column: 2; grid-row: 1; margin: 0; gap: 12px; }
  .home-content .queue-section { grid-column: 2; grid-row: 2; margin: 0; border: 1px solid #d9e4ed; border-radius: 13px; background: #fff; padding: 22px; }
  .home-content > .status-message { grid-column: 1 / -1; grid-row: auto; }
  .home-content .flex-spacer, .home-content .bottom-spacer { display: none; }
  .section-heading { margin: 0 0 20px; font-size: 23px; }
  .appointment-card { min-height: 110px; padding: 20px 22px; border-radius: 12px; }
  .appointment-left, .appointment-right { font-size: 14px; }
  .appointment-card strong { font-size: 16px; }
  .appointments-list { gap: 15px; }
  .action-card { min-height: 104px; padding: 18px 12px; font-size: 16px; }
  .queue-position { justify-content: flex-start; font-size: 18px; }
  .detail-screen { max-width: 980px; min-height: 62vh; padding: 32px 0 50px; margin: 0 auto; }
  .detail-screen .section-heading { margin-bottom: 27px; }
  .form-stack { max-width: 650px; }
  .all-appointments-list { grid-template-columns: repeat(2, minmax(0, 1fr)); overflow: visible; align-content: start; }
  .bottom-nav { display: none; }
}
@media (min-width: 768px) and (max-width: 1000px) {
  .home-content { grid-template-columns: 1fr; }
  .home-content > section:first-child, .home-content .quick-actions, .home-content .queue-section { grid-column: 1; grid-row: auto; }
  .home-content .quick-actions { max-width: 600px; }
}
@media (max-width: 767px) {
  .viewport { min-height: calc(100dvh - 62px); }
  .phone-app { height: calc(100dvh - 62px); max-height: none; }
}


/* Expandable patient appointment details */
.cf-appointment-expansion{flex-basis:100%;width:100%;grid-column:1 / -1;margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0}
.cf-appointment-expand-toggle{display:flex;justify-content:space-between;align-items:center;width:100%;border:0;background:transparent;color:#1e5f96;padding:5px 0;font:inherit;font-weight:700;text-align:left;cursor:pointer}
.cf-appointment-chevron{display:inline-block;font-size:24px;line-height:1;transform:rotate(90deg);transition:transform .2s ease}
.cf-appointment-chevron.expanded{transform:rotate(-90deg)}
.cf-appointment-extra{padding:5px 0 2px;color:#39495b;font-size:13px;line-height:1.55}
.cf-appointment-extra p{margin:5px 0}

</style>
