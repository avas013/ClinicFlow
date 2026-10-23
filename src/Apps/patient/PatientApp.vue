<script setup>
import { computed, reactive, ref } from 'vue'

// Demo data: nothing here is connected to a clinic or database yet.
const appointments = ref([
  { id: 1, doctor: 'Dr. Smith', time: '8:30 AM', date: 'January 4, 2027', dateTime: '2027-01-04T08:30:00' },
])
const queuePosition = ref(1)

// Display all appointments when there are at most 3. With 4 or more,
// show only 2 on Home and provide a separate scrollable full list.
const sortedAppointments = computed(() =>
  [...appointments.value].sort((a, b) => a.dateTime.localeCompare(b.dateTime)),
)
const hasMoreAppointments = computed(() => sortedAppointments.value.length > 3)
const homeAppointments = computed(() =>
  hasMoreAppointments.value
    ? sortedAppointments.value.slice(0, 2)
    : sortedAppointments.value,
)

const currentPage = ref('home')
const pageHistory = ref([])
const statusMessage = ref('')
const feedbackSent = ref(false)

const booking = reactive({ doctor: 'Dr. Smith', date: '', time: '' })
const feedback = reactive({ rating: '', message: '' })

const minDate = (() => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})()

const queueLabel = computed(() => {
  const n = queuePosition.value
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' :
    n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'
  return `${n}${suffix} in line`
})

function openPage(page) {
  if (currentPage.value === page) return
  pageHistory.value.push(currentPage.value)
  currentPage.value = page
  statusMessage.value = ''
}

function goHome() {
  currentPage.value = 'home'
  pageHistory.value = []
}

function goBack() {
  if (pageHistory.value.length > 0) {
    currentPage.value = pageHistory.value.pop()
  } else {
    statusMessage.value = 'You are already on the home screen.'
  }
}

function saveBooking() {
  const dateTime = new Date(`${booking.date}T${booking.time}:00`)
  if (Number.isNaN(dateTime.getTime()) || dateTime <= new Date()) {
    statusMessage.value = 'Choose an appointment date and time in the future.'
    return
  }

  appointments.value.push({
    id: Date.now(),
    doctor: booking.doctor,
    dateTime: `${booking.date}T${booking.time}:00`,
    date: new Intl.DateTimeFormat('en-CA', {
      month: 'long', day: 'numeric', year: 'numeric',
    }).format(dateTime),
    time: new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(dateTime),
  })

  booking.date = ''
  booking.time = ''
  goHome()
  statusMessage.value = 'Demo appointment added. Changes will reset when you refresh.'
}

function submitFeedback() {
  feedbackSent.value = true
  feedback.rating = ''
  feedback.message = ''
}
</script>

<template>
  <div class="viewport">
    <div class="phone-app">
      <header class="top-bar">
        <button class="icon-button" type="button" aria-label="Open patient profile" @click="openPage('profile')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7.5" r="3.5" /><path d="M4.5 20v-2a7.5 7.5 0 0 1 15 0v2" /></svg>
        </button>
        <span class="brand">ClinicFlow</span>
        <button class="icon-button" type="button" aria-label="View notifications" @click="openPage('notifications')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" /><path d="M10 21h4" /></svg>
        </button>
      </header>

      <main class="main-content" id="main-content">
        <!-- HOME: follows the layout of the supplied drawing -->
        <div v-if="currentPage === 'home'" class="home-content">
          <section aria-labelledby="upcoming-heading">
            <h1 id="upcoming-heading" class="section-heading">Upcoming</h1>
            <div class="appointments-list">
              <article v-for="appointment in homeAppointments" :key="appointment.id" class="appointment-card">
                <div class="appointment-left">
                  <span class="card-label">Appointment</span>
                  <strong>{{ appointment.doctor }}</strong>
                </div>
                <div class="appointment-right">
                  <strong>{{ appointment.time }}</strong>
                  <span>{{ appointment.date }}</span>
                </div>
              </article>
            </div>
            <p v-if="appointments.length === 0" class="empty-state">No upcoming appointments.</p>
            <button
              v-if="hasMoreAppointments"
              type="button"
              class="view-more-button"
              @click="openPage('appointments')"
            >
              View More <span aria-hidden="true">→</span>
            </button>
          </section>

          <p v-if="statusMessage" class="status-message" role="status">{{ statusMessage }}</p>
          <div class="flex-spacer"></div>

          <section class="quick-actions" aria-label="Patient actions">
            <button type="button" class="action-card" @click="openPage('booking')">Booking</button>
            <button type="button" class="action-card" @click="openPage('feedback')">Surveys /<br />Feedback</button>
          </section>

          <section class="queue-section" aria-labelledby="queue-heading">
            <h2 id="queue-heading" class="section-heading">Queue</h2>
            <p class="queue-position"><span class="queue-dot" aria-hidden="true"></span>{{ queueLabel }}</p>
          </section>
          <div class="bottom-spacer"></div>
        </div>

        <!-- FULL UPCOMING APPOINTMENTS: separate scrollable list -->
        <section v-else-if="currentPage === 'appointments'" class="detail-screen appointments-page" aria-labelledby="all-appointments-heading">
          <h1 id="all-appointments-heading" class="section-heading">All Appointments</h1>
          <p class="screen-description">{{ sortedAppointments.length }} upcoming {{ sortedAppointments.length === 1 ? 'appointment' : 'appointments' }}</p>
          <div class="all-appointments-list" role="list" aria-label="All upcoming appointments">
            <article v-for="appointment in sortedAppointments" :key="appointment.id" class="appointment-card" role="listitem">
              <div class="appointment-left">
                <span class="card-label">Appointment</span>
                <strong>{{ appointment.doctor }}</strong>
              </div>
              <div class="appointment-right">
                <strong>{{ appointment.time }}</strong>
                <span>{{ appointment.date }}</span>
              </div>
            </article>
          </div>
          <button type="button" class="all-appointments-back" @click="goBack">← Back to Home</button>
        </section>

        <!-- DEMO BOOKING SCREEN -->
        <section v-else-if="currentPage === 'booking'" class="detail-screen" aria-labelledby="booking-heading">
          <h1 id="booking-heading" class="section-heading">Booking</h1>
          <p class="screen-description">Create an example appointment. This prototype does not contact a clinic.</p>
          <form class="form-stack" @submit.prevent="saveBooking">
            <label for="doctor">Doctor</label>
            <select id="doctor" v-model="booking.doctor" required>
              <option>Dr. Smith</option>
              <option>Dr. Lee</option>
              <option>Dr. Patel</option>
            </select>
            <label for="date">Date</label>
            <input id="date" v-model="booking.date" type="date" :min="minDate" required />
            <label for="time">Time</label>
            <input id="time" v-model="booking.time" type="time" required />
            <p v-if="statusMessage" class="status-message" role="alert">{{ statusMessage }}</p>
            <button class="primary-button" type="submit">Add demo appointment</button>
          </form>
        </section>

        <!-- DEMO FEEDBACK SCREEN -->
        <section v-else-if="currentPage === 'feedback'" class="detail-screen" aria-labelledby="feedback-heading">
          <h1 id="feedback-heading" class="section-heading">Surveys / Feedback</h1>
          <p class="screen-description">Tell us about your experience with the demonstration app.</p>
          <p v-if="feedbackSent" class="status-message" role="status">Thank you! Your demo feedback was recorded on this screen only, not sent to a clinic.</p>
          <form class="form-stack" @submit.prevent="submitFeedback">
            <label for="rating">Rating</label>
            <select id="rating" v-model="feedback.rating" required>
              <option disabled value="">Select a rating</option>
              <option value="5">5 — Excellent</option>
              <option value="4">4 — Good</option>
              <option value="3">3 — Average</option>
              <option value="2">2 — Poor</option>
              <option value="1">1 — Very poor</option>
            </select>
            <label for="comments">Comments (optional)</label>
            <textarea id="comments" v-model="feedback.message" rows="5" placeholder="Share your feedback..."></textarea>
            <button class="primary-button" type="submit">Submit demo feedback</button>
          </form>
        </section>

        <!-- PROFILE AND NOTIFICATIONS -->
        <section v-else-if="currentPage === 'profile'" class="detail-screen" aria-labelledby="profile-heading">
          <h1 id="profile-heading" class="section-heading">Profile</h1>
          <div class="detail-card"><strong>Demo Patient</strong><p>Patient account</p><p>Profile settings will be connected later.</p></div>
        </section>

        <section v-else-if="currentPage === 'notifications'" class="detail-screen" aria-labelledby="notifications-heading">
          <h1 id="notifications-heading" class="section-heading">Notifications</h1>
          <div class="detail-card"><strong>Upcoming appointment</strong><p v-if="sortedAppointments.length">{{ sortedAppointments[0].doctor }} · {{ sortedAppointments[0].date }} at {{ sortedAppointments[0].time }}</p><p>Reminder notifications are placeholders in this prototype.</p></div>
        </section>

        <!-- MENU -->
        <section v-else-if="currentPage === 'menu'" class="detail-screen" aria-labelledby="menu-heading">
          <h1 id="menu-heading" class="section-heading">Menu</h1>
          <div class="menu-actions">
            <button type="button" @click="goHome">Home <span aria-hidden="true">›</span></button>
            <button type="button" @click="openPage('appointments')">All Appointments <span aria-hidden="true">›</span></button>
            <button type="button" @click="openPage('booking')">Booking <span aria-hidden="true">›</span></button>
            <button type="button" @click="openPage('feedback')">Surveys / Feedback <span aria-hidden="true">›</span></button>
            <button type="button" @click="openPage('profile')">Profile <span aria-hidden="true">›</span></button>
            <button type="button" @click="openPage('notifications')">Notifications <span aria-hidden="true">›</span></button>
          </div>
        </section>
      </main>

      <nav class="bottom-nav" aria-label="Bottom navigation">
        <button class="nav-button" type="button" aria-label="Back" @click="goBack">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7" /></svg>
        </button>
        <button class="nav-button" :class="{ 'nav-active': currentPage === 'home' }" type="button" aria-label="Home" :aria-current="currentPage === 'home' ? 'page' : undefined" @click="goHome">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v11H3V10Z" /><path d="M9 21v-7h6v7" /></svg>
        </button>
        <button class="nav-button" :class="{ 'nav-active': currentPage === 'menu' }" type="button" aria-label="Menu" :aria-current="currentPage === 'menu' ? 'page' : undefined" @click="openPage('menu')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </nav>
    </div>
  </div>
</template>

<style scoped>
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
</style>
