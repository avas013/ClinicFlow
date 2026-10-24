
import { reactive } from 'vue'

// Fictional data for the ClinicFlow demonstration

export const day = (offset = 0) => {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + offset)

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const staff = [
  {
    name: 'Dr. Smith',
    role: 'Family Physician',
    shift: '8:00 AM – 4:00 PM',
    room: 'Room 1'
  },
  {
    name: 'Dr. Lee',
    role: 'Family Physician',
    shift: '9:00 AM – 5:00 PM',
    room: 'Room 2'
  },
  {
    name: 'Nurse Patel',
    role: 'Registered Nurse',
    shift: '8:30 AM – 3:30 PM',
    room: 'Room 3'
  }
]

const seed = [
  { id: 1, patient: 'Jordan Taylor', doctor: 'Dr. Smith', date: day(), time: '08:30', reason: 'Consultation', status: 'Checked in' },
  { id: 2, patient: 'Alex Morgan', doctor: 'Dr. Lee', date: day(), time: '09:00', reason: 'Follow-up', status: 'Scheduled' },
  { id: 3, patient: 'Casey Nguyen', doctor: 'Dr. Smith', date: day(), time: '09:30', reason: 'Consultation', status: 'Scheduled' },
  { id: 4, patient: 'Sam Rivera', doctor: 'Nurse Patel', date: day(), time: '10:00', reason: 'Check-up', status: 'Checked in' },
  { id: 5, patient: 'Jamie Clarke', doctor: 'Dr. Lee', date: day(), time: '10:30', reason: 'Follow-up', status: 'Scheduled' },
  { id: 6, patient: 'Avery Singh', doctor: 'Dr. Smith', date: day(1), time: '11:00', reason: 'Consultation', status: 'Scheduled' },
  { id: 7, patient: 'Robin Ellis', doctor: 'Dr. Smith', date: day(-1), time: '09:15', reason: 'Consultation', status: 'Completed' },
  { id: 8, patient: 'Taylor Park', doctor: 'Nurse Patel', date: day(-1), time: '13:15', reason: 'Follow-up', status: 'Cancelled' }
]

let nextId = 9

export const clinic = reactive({
  appointments: seed.map(a => ({ ...a }))
})

export const ordered = (items) =>
  [...items].sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
  )

export const niceDate = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

export const niceTime = (value) => {
  const [hour, minute] = value.split(':').map(Number)

  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
}

export function book(data, checkedIn = false) {
  const entry = {
    id: nextId++,
    ...data,
    status: checkedIn ? 'Checked in' : 'Scheduled'
  }

  clinic.appointments.push(entry)
  return entry
}

export function update(id, status) {
  const entry = clinic.appointments.find(a => a.id === id)

  if (entry) {
    entry.status = status
  }
}

export const queue = () =>
  ordered(
    clinic.appointments.filter(a => a.status === 'Checked in')
  )

export function resetDemo() {
  clinic.appointments.splice(
    0,
    clinic.appointments.length,
    ...seed.map(a => ({ ...a }))
  )

  nextId = 9
}
