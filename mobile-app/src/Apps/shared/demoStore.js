import { assertBookableSlot } from './bookingAvailability.js'
import { cloudConfigured, attachClinicStore } from '../../services/clinicSync.js'
import { reactive, watch } from 'vue'

// Shared appointment data for the local ClinicFlow frontend.
// Replace this store with authenticated Supabase queries before using real patient data.
export const day = (offset = 0) => {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const staff = [
  { name: 'Dr. Smith', role: 'Family Physician', shift: '9:00 AM – 5:00 PM', room: 'Room 1' },
  { name: 'Nurse Patel', role: 'Registered Nurse', shift: '9:00 AM – 5:00 PM', room: 'Room 2' },
  { name: 'Nurse Chen', role: 'Registered Nurse', shift: '9:00 AM – 5:00 PM', room: 'Room 3' },
]

// Jordan Taylor is the patient account available on the login screen.
const initialAppointments = [
  { id: 1, patient: 'Jordan Taylor', doctor: 'Dr. Smith', date: day(1), time: '09:00', reason: 'Consultation', status: 'Scheduled', confirmed: false },
  { id: 2, patient: 'Alex Morgan', doctor: 'Nurse Chen', date: day(), time: '09:00', reason: 'Follow-up', status: 'Scheduled', confirmed: false },
  { id: 3, patient: 'Casey Nguyen', doctor: 'Dr. Smith', date: day(), time: '09:30', reason: 'Consultation', status: 'Scheduled', confirmed: false },
  { id: 4, patient: 'Sam Rivera', doctor: 'Nurse Patel', date: day(), time: '10:00', reason: 'Check-up', status: 'Checked in', confirmed: true },
  { id: 5, patient: 'Jamie Clarke', doctor: 'Nurse Chen', date: day(), time: '10:30', reason: 'Follow-up', status: 'Scheduled', confirmed: false },
  { id: 6, patient: 'Avery Singh', doctor: 'Dr. Smith', date: day(1), time: '11:00', reason: 'Consultation', status: 'Scheduled', confirmed: false },
  { id: 7, patient: 'Robin Ellis', doctor: 'Dr. Smith', date: day(-1), time: '09:15', reason: 'Consultation', status: 'Completed', confirmed: true },
  { id: 8, patient: 'Taylor Park', doctor: 'Nurse Patel', date: day(-1), time: '13:15', reason: 'Follow-up', status: 'Cancelled', confirmed: false },
]
const STORAGE_KEY = 'clinicflow-appointments-v2'
function load() {
  if (cloudConfigured) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialAppointments.map(a => ({ ...a }))
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data.filter(a => a && Number.isInteger(a.id) && typeof a.patient === 'string').map(a => ({ ...a, confirmed: a.confirmed === true })) : initialAppointments.map(a => ({ ...a }))
  } catch {
    return initialAppointments.map(a => ({ ...a }))
  }
}
export const clinic = reactive({ appointments: load() })
watch(() => clinic.appointments, () => {
  if (cloudConfigured) return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(clinic.appointments)) } catch { /* browser storage may be unavailable */ }
}, { deep: true })

let nextId = Math.max(0, ...clinic.appointments.map(a => a.id)) + 1
export const ordered = (items) => [...items].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
export const niceDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
export const niceTime = (value) => {
  const [hour, minute] = value.split(':').map(Number)
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
}
export function book(data, checkedIn = false) {
  assertBookableSlot(data, clinic.appointments);
  const entry = {
    id: cloudConfigured ? Date.now() * 1000 + Math.floor(Math.random() * 1000) : nextId++, patient: data.patient.trim(), doctor: data.doctor,
    date: data.date, time: data.time, reason: data.reason || 'Consultation',
    status: checkedIn ? 'Checked in' : 'Scheduled',
    confirmed: Boolean(checkedIn),
  }
  clinic.appointments.push(entry)
  return entry
}
export function update(id, status) {
  const entry = clinic.appointments.find(a => a.id === id)
  if (entry) entry.status = status
}
export function confirmAppointment(id, patient) {
  const a = clinic.appointments.find(a => a.id === id)
  if (!a || a.patient.trim().toLowerCase() !== patient.trim().toLowerCase() || a.status !== 'Scheduled') return false
  a.confirmed = true
  return true
}
export const queue = () => ordered(clinic.appointments.filter(a => a.status === 'Checked in'))
export function resetDemo() {
  if (cloudConfigured) return false
  clinic.appointments.splice(0, clinic.appointments.length, ...initialAppointments.map(a => ({ ...a })))
  nextId = 9
}

// Bind the existing reactive appointment store to Supabase without changing the UI APIs.
attachClinicStore(clinic)
