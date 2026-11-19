/** Time-slot validation shared by patient, doctor and front desk. */
const inactive = new Set(['cancelled', 'canceled', 'no show']);
const minutes = time => {
  const value = String(time || '');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
};
export const isQuarterHour = time => {
  const n = minutes(time);
  return n !== null && n % 15 === 0;
};
export function isSlotTaken(appointments, doctor, date, time, excludeId = null) {
  const t = minutes(time);
  if (t === null || !date || !doctor) return false;
  return (appointments || []).some(a =>
    String(a.id) !== String(excludeId) &&
    String(a.doctor || '').trim().toLowerCase() === String(doctor).trim().toLowerCase() &&
    a.date === date &&
    !inactive.has(String(a.status || '').trim().toLowerCase()) &&
    minutes(a.time) !== null && Math.abs(minutes(a.time) - t) < 15
  );
}
export function assertBookableSlot(data, appointments, excludeId = null) {
  if (!data.doctor || !data.date || !data.time) throw Error('Choose a doctor, date and time.');
  if (!isQuarterHour(data.time)) throw Error('Appointments must start at :00, :15, :30 or :45.');
  if (isSlotTaken(appointments, data.doctor, data.date, data.time, excludeId))
    throw Error('That time is already booked. Choose one of the available time slots.');
  return true;
}
