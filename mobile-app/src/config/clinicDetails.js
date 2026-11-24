// ClinicFlow prototype contact details. Replace placeholders when real clinic details exist.
export const CLINIC_DAYS = 'Monday–Friday';
export const CLINIC_HOURS = '9:00 AM–5:00 PM';
export const CLINIC_OPEN_HOUR = 9;
export const CLINIC_CLOSE_HOUR = 17;
export const CLINIC_LAST_APPOINTMENT = '4:45 PM';
export const CLINIC_ADDRESS = import.meta.env.VITE_CLINIC_OFFICE_ADDRESS?.trim() || '[Clinic Address]';
export const CLINIC_PHONE = import.meta.env.VITE_CLINIC_PHONE?.trim() || '[Clinic Phone Number]';
export const CLINIC_EMAIL = import.meta.env.VITE_CLINIC_EMAIL?.trim() || '[Clinic Email Address]';
export const CLINIC_PHONE_LINK = /^\+?[\d\s().-]{7,}$/.test(CLINIC_PHONE) ? `tel:${CLINIC_PHONE.replace(/[^+\d]/g, '')}` : '';
export const CLINIC_EMAIL_LINK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(CLINIC_EMAIL) ? `mailto:${CLINIC_EMAIL}` : '';
export const isClinicWeekday = isoDate => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(isoDate))) return false;
  const [year, month, day] = isoDate.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday >= 1 && weekday <= 5;
};
export const isClinicSlot = (date, time) => {
  if (!isClinicWeekday(date) || !/^([01]\d|2[0-3]):(00|15|30|45)$/.test(String(time || ''))) return false;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m >= CLINIC_OPEN_HOUR * 60 && h * 60 + m + 15 <= CLINIC_CLOSE_HOUR * 60;
};
