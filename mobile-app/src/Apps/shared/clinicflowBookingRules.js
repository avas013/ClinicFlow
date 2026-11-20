/* ClinicFlow prototype: symptom categories are routing preferences, not a clinical assessment. */
export const SYMPTOM_CHOICES = [
  { value: 'headache', label: 'Headache' },
  { value: 'soreness', label: 'Soreness' },
  { value: 'cold', label: 'Cold / sickness' },
  { value: 'other', label: 'Other concern' },
  { value: 'serious', label: 'Serious or worsening concern (non-emergency)' },
]
export const SYMPTOM_REASON = {
  headache: 'Headache', soreness: 'Soreness', cold: 'Cold / sickness',
  other: 'Other concern', serious: 'Serious or worsening concern',
}
export const needsDoctor = symptom => symptom === 'other' || symptom === 'serious'
export const isNurse = person => /nurse|\brn\b/i.test(`${person?.role || ''} ${person?.name || ''}`)
export const isDoctor = person => /doctor|physician|\bdr\.?\b/i.test(`${person?.role || ''} ${person?.name || ''}`) && !isNurse(person)
export const allowedProviders = (staff, symptom) => {
  if (!SYMPTOM_REASON[symptom]) return []
  return (staff || []).filter(person => needsDoctor(symptom) ? isDoctor(person) : isNurse(person))
}
export const isAvailableCategory = symptom => Boolean(SYMPTOM_REASON[symptom])
const minutes = time => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time || ''))) return null
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
export const quarterHour = time => minutes(time) !== null && minutes(time) % 15 === 0
export const slotOccupied = (appointments, doctor, date, time, excludeId) => {
  const slot = minutes(time)
  if (slot === null) return true
  return (appointments || []).some(a =>
    String(a.id) !== String(excludeId) &&
    String(a.doctor || '').trim().toLowerCase() === String(doctor || '').trim().toLowerCase() &&
    String(a.date || '') === String(date || '') &&
    !['cancelled','canceled','no show'].includes(String(a.status || '').trim().toLowerCase()) &&
    minutes(a.time) !== null && Math.abs(minutes(a.time) - slot) < 15
  )
}
export const patientSlotOccupied = (appointments, patient, date, time) => {
  const slot = minutes(time)
  if (slot === null || !patient) return false
  return (appointments || []).some(a =>
    String(a.patient || '').trim().toLowerCase() === String(patient).trim().toLowerCase() &&
    a.date === date &&
    !['cancelled', 'canceled', 'no show'].includes(String(a.status || '').trim().toLowerCase()) &&
    minutes(a.time) !== null && Math.abs(minutes(a.time) - slot) < 15
  )
}
export function assertValidSlot(form, appointments) {
  if (!form.doctor || !form.date || !form.time) throw Error('Select a clinician, date and time.')
  if (!quarterHour(form.time)) throw Error('Use 15-minute appointment times (:00, :15, :30 or :45).')
  const dateTime = new Date(`${form.date}T${form.time}:00`)
  if (Number.isNaN(dateTime.getTime()) || dateTime <= new Date()) throw Error('Choose a future appointment.')
  if (slotOccupied(appointments, form.doctor, form.date, form.time)) throw Error('That slot is already booked. Choose another time.')
  if (patientSlotOccupied(appointments, form.patient, form.date, form.time))
    throw Error('This patient already has an appointment at that time.')
}
