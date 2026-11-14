import { reactive, watch } from 'vue'
import { clinic, staff as sharedStaff, day, niceDate, niceTime, ordered, book, update, queue } from '../shared/demoStore.js'

// Admin prototype only. Reuses the shared demo data without changing demoStore.js,
// and adds the extra admin features (editable staff schedules, editing appointments).
export { clinic, day, niceDate, niceTime, ordered, book, update, queue }

// ---------- Staff schedules (editable by administrators only) ----------
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Turn the shared "8:00 AM – 4:00 PM" text into 24-hour times like "08:00" and "16:00"
function to24(text) {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(text || '')
  if (!m) return ''
  const hour = (Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)
  return `${String(hour).padStart(2, '0')}:${m[2]}`
}
export const shiftLabel = (s) => `${niceTime(s.start)} – ${niceTime(s.end)}`
function fromShared(s) {
  const [startText, endText] = (s.shift || '').split(/–|-/)
  const person = { ...s, start: to24(startText) || '09:00', end: to24(endText) || '17:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }
  return { ...person, shift: shiftLabel(person) }
}

// Saved under its own key so schedule edits here never show up in the main demo
const STAFF_KEY = 'clinicflow-admin-prototype-staff-v1'
function loadStaff() {
  const defaults = sharedStaff.map(fromShared)
  try {
    const saved = JSON.parse(localStorage.getItem(STAFF_KEY))
    if (Array.isArray(saved)) {
      return defaults.map(d => {
        const s = saved.find(x => x && x.name === d.name && x.start && x.end && Array.isArray(x.days))
        return s ? { ...d, start: s.start, end: s.end, days: [...s.days], room: s.room || d.room, shift: shiftLabel(s) } : d
      })
    }
  } catch { /* fall back to defaults */ }
  return defaults
}
export const staff = reactive(loadStaff())
watch(staff, () => {
  try { localStorage.setItem(STAFF_KEY, JSON.stringify(staff)) } catch { /* browser storage may be unavailable */ }
}, { deep: true })

export function updateStaff(name, changes) {
  const s = staff.find(p => p.name === name)
  if (!s || !changes.start || !changes.end || changes.start >= changes.end || !changes.days?.length) return false
  s.start = changes.start
  s.end = changes.end
  s.days = WEEKDAYS.filter(d => changes.days.includes(d))
  s.room = changes.room?.trim() || s.room
  s.shift = shiftLabel(s)
  return true
}
export function resetStaff() {
  staff.splice(0, staff.length, ...sharedStaff.map(fromShared))
}

export const weekday = (date) => WEEKDAYS[(new Date(`${date}T12:00:00`).getDay() + 6) % 7]
// True when the appointment's clinician is scheduled to work on that day and time
export function isWithinShift(appt) {
  const s = staff.find(p => p.name === appt.doctor)
  if (!s || !appt.date || !appt.time) return true
  return s.days.includes(weekday(appt.date)) && appt.time >= s.start && appt.time < s.end
}

// ---------- Editing appointments ----------
export function editAppointment(id, changes) {
  const a = clinic.appointments.find(x => x.id === id)
  if (!a) return false
  const moved = (changes.date && changes.date !== a.date) || (changes.time && changes.time !== a.time)
  for (const key of ['patient', 'doctor', 'date', 'time', 'reason']) {
    if (changes[key]) a[key] = String(changes[key]).trim()
  }
  if (moved && a.status === 'Scheduled') a.confirmed = false // a rescheduled visit needs the patient to confirm again
  return true
}
