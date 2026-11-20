/** ClinicFlow cloud sync (prototype). Requires Supabase Auth + RLS. */
import { reactive, watch } from 'vue'
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
export const cloudConfigured = Boolean(url && key)
const supabase = cloudConfigured ? createClient(url, key, {
  global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
}) : null

export const syncState = reactive({
  mode: cloudConfigured ? 'signed-out' : 'local',
  ready: false,
  refreshing: false,
  saving: false,
  error: '',
  toast: '',
  lastUpdated: null,
  notifications: [],
  profile: null,
})

let store = null
let serverSnapshot = new Map()
let applyingRemote = false
let timer = null
let debounce = null
let channel = null
let inFlight = false
let activeGeneration = 0
let knownNotifications = new Set()
let notificationsInitialized = false
let currentUserId = null
let refreshInFlight = null
let savePromise = null

const fields = a => ({
  doctor: String(a.doctor || ''), date: String(a.date || ''), time: String(a.time || ''),
  reason: String(a.reason || 'Consultation'), status: String(a.status || 'Scheduled'),
  confirmed: Boolean(a.confirmed), queue_position: Number.isInteger(a.queuePosition) ? a.queuePosition : null,
})
const compact = obj => JSON.stringify(obj)
const toLocal = a => ({
  id: a.id, patientId: a.patient_id, patient: a.patient, doctor: a.doctor,
  date: a.date, time: a.time, reason: a.reason, status: a.status,
  confirmed: a.confirmed, queuePosition: a.queue_position,
})

const LOCAL_KEY = 'clinicflow-appointments-v2'
function reloadLocalAppointments(showMessage = false) {
  if (!store) throw new Error('Appointment store is not ready.')
  const raw = localStorage.getItem(LOCAL_KEY)
  if (!raw) {
    if (showMessage) syncState.toast = 'Local demo only: there are no stored appointments to reload.'
    return
  }
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) throw new Error('Saved appointments are not a valid list.')
  const appointments = parsed.filter(a => a && Number.isInteger(a.id) && typeof a.patient === 'string')
  applyingRemote = true
  try {
    store.appointments.splice(0, store.appointments.length, ...appointments)
  } finally {
    applyingRemote = false
  }
  syncState.lastUpdated = Date.now()
  syncState.error = ''
  if (showMessage) syncState.toast = 'Refreshed from this browser only. Supabase is not connected.'
}
function onLocalStorage(event) {
  if (cloudConfigured || event.key !== LOCAL_KEY) return
  try { reloadLocalAppointments(false) } catch (e) { syncState.error = 'Local refresh failed: ' + e.message }
}
export function attachClinicStore(clinic) {
  if (store) return
  store = clinic
  if (!cloudConfigured && typeof window !== 'undefined') {
    window.addEventListener('storage', onLocalStorage)
  }
  watch(() => store.appointments, () => {
    if (applyingRemote || !syncState.ready || !cloudConfigured) return
    clearTimeout(debounce)
    debounce = setTimeout(saveChanges, 130)
  }, { deep: true, flush: 'sync' })
}

export async function cloudLogin(email, password) {
  if (!cloudConfigured) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
  const { data: profile, error: profileError } = await supabase.from('profiles')
    .select('id, full_name, role').eq('id', data.user.id).single()
  if (profileError || !profile) {
    await supabase.auth.signOut()
    throw new Error('No ClinicFlow profile was found for this account. Ask the administrator to configure it.')
  }
  syncState.profile = profile
  return { id: profile.id, name: profile.full_name, email: data.user.email, role: profile.role }
}

export async function cloudLogout() {
  stopClinicSync()
  if (supabase) await supabase.auth.signOut()
}

export function stopClinicSync() {
  activeGeneration++
  clearInterval(timer); clearTimeout(debounce); clearTimeout(refreshDelay)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('focus', onFocus)
  timer = null; debounce = null
  if (channel && supabase) supabase.removeChannel(channel)
  channel = null; currentUserId = null
  syncState.ready = false
  syncState.profile = null
  syncState.mode = cloudConfigured ? 'signed-out' : 'local'
  syncState.notifications = []
  syncState.toast = ''
  syncState.error = ''
  serverSnapshot.clear()
  knownNotifications = new Set()
  notificationsInitialized = false
  if (store && cloudConfigured) {
    applyingRemote = true
    store.appointments.splice(0, store.appointments.length)
    applyingRemote = false
  }
}

export async function startClinicSync() {
  if (!cloudConfigured) return
  if (!store) throw new Error('ClinicFlow appointment store not attached.')
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Please sign in through Supabase before syncing.')
  const generation = ++activeGeneration
  currentUserId = user.id
  syncState.mode = 'connecting'
  syncState.error = ''
  await refreshAll(true)
  if (generation !== activeGeneration) return
  syncState.ready = true
  syncState.mode = 'cloud'
  // Realtime is best-effort; the 45-second poll and manual refresh are independent.
  channel = supabase.channel(`clinicflow-${user.id}-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => scheduleRefresh())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointment_notifications' }, () => scheduleRefresh())
    .subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') syncState.mode = 'polling'
      if (status === 'SUBSCRIBED') syncState.mode = 'cloud'
    })
  timer = setInterval(() => { refreshAll().catch(() => {}) }, 5000)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('focus', onFocus)
}
function onVisibility() { if (!document.hidden) refreshAll().catch(() => {}) }
function onFocus() { refreshAll().catch(() => {}) }
let refreshDelay = null
function scheduleRefresh() {
  clearTimeout(refreshDelay)
  refreshDelay = setTimeout(() => { refreshAll().catch(() => {}) }, 250)
}

export async function refreshAll(force = false, manual = false) {
  if (!cloudConfigured) {
    // This is a local demo, not shared storage.
    syncState.toast = 'Local demo only. Set up Supabase to synchronize devices.'
    return
  }
  if (!currentUserId) {
    syncState.error = 'Sign in to synchronize appointments.'
    return
  }
  // Do not overwrite an unsaved local booking if Refresh is clicked immediately.
  if (!force && debounce && syncState.ready) {
    clearTimeout(debounce)
    debounce = null
    await saveChanges()
  }
  // Realtime/poll/manual requests must not be dropped during an appointment save.
  if (!force && savePromise) await savePromise
  if (refreshInFlight) {
    await refreshInFlight
    if (!manual) return
    // A manual click must make a NEW request, not reuse an older in-flight response.
  }
  const generation = activeGeneration
  refreshInFlight = (async () => {
    syncState.refreshing = true
    try {
      const [{ data: rows, error }, { data: notes, error: notesError }] = await Promise.all([
        supabase.from('appointments').select('id,patient_id,patient,doctor,date,time,reason,status,confirmed,queue_position').order('date', { ascending: true }).order('time', { ascending: true }),
        supabase.from('appointment_notifications').select('id,appointment_id,message,event_type,created_at,read_at').order('created_at', { ascending: false }).limit(40),
      ])
      if (error) throw error
      if (notesError) throw notesError
      if (generation !== activeGeneration || !store) return
      applyingRemote = true
      try {
        store.appointments.splice(0, store.appointments.length, ...(rows || []).map(toLocal))
        serverSnapshot = new Map((rows || []).map(a => [a.id, compact(fields(toLocal(a)))]))
      } finally { applyingRemote = false }
      const latestNotes = notes || []
      if (notificationsInitialized) {
        const newNotes = latestNotes.filter(n => !knownNotifications.has(n.id))
        for (const note of newNotes.reverse()) notifyLocally(note)
      }
      knownNotifications = new Set(latestNotes.map(n => n.id))
      notificationsInitialized = true
      syncState.notifications = latestNotes
      syncState.lastUpdated = Date.now()
      syncState.error = ''
    } catch (e) {
      syncState.error = `Sync failed: ${e.message || e}`
      if (force) throw e
    } finally { syncState.refreshing = false }
  })()
  try { return await refreshInFlight } finally { refreshInFlight = null }
}


// Patient cancellation was deliberately removed. Only clinic staff may cancel.
export async function cancelPatientAppointment() {
  throw new Error('To cancel or reschedule an appointment, please call the clinic.')
}

function notifyLocally(note) {
  syncState.toast = note.message
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('ClinicFlow appointment update', { body: note.message }) } catch { /* permission or OS limitation */ }
  }
}
export async function enableDesktopAlerts() {
  if (!('Notification' in window)) return 'Notifications are not available in this browser.'
  if (Notification.permission === 'denied') return 'Browser notifications are blocked. Change browser settings to allow them.'
  const permission = await Notification.requestPermission()
  return permission === 'granted' ? 'Desktop alerts enabled while this website is open.' : 'Desktop alerts not enabled.'
}
export async function markRead(id) {
  if (!cloudConfigured || !currentUserId) return
  const { error } = await supabase.from('appointment_notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
  if (error) syncState.error = error.message
  else await refreshAll()
}

async function findPatientId(patientName) {
  if (syncState.profile?.role === 'patient') return currentUserId
  const { data, error } = await supabase.from('profiles')
    .select('id,full_name').eq('full_name', patientName.trim()).limit(2)
  if (error) throw error
  if (!data?.length) throw new Error(`No registered patient account named "${patientName}". Create the account before booking.`)
  if (data.length > 1) throw new Error(`Multiple patient accounts are named "${patientName}". Use a unique patient identifier.`)
  return data[0].id
}

function saveChanges() {
  if (savePromise) return savePromise
  savePromise = performSaveChanges().finally(() => { savePromise = null })
  return savePromise
}
async function performSaveChanges() {
  debounce = null
  if (inFlight || !syncState.ready || !store || !currentUserId) return
  const current = [...store.appointments]
  const changed = current.filter(a => !serverSnapshot.has(a.id) || serverSnapshot.get(a.id) !== compact(fields(a)))
  if (!changed.length) return
  inFlight = true
  syncState.saving = true
  let savedError = ''
  try {
    for (const appointment of changed) {
      const payload = fields(appointment)
      if (!serverSnapshot.has(appointment.id)) {
        const patient_id = await findPatientId(appointment.patient)
        const { error } = await supabase.from('appointments').insert({
          ...payload, patient: appointment.patient.trim(), patient_id, created_by: currentUserId,
        })
        if (error) throw error
      } else if (syncState.profile?.role === 'patient') {
        throw new Error('Patients cannot change appointment status. Please contact the clinic.')
      } else {
        const { error } = await supabase.from('appointments').update(payload).eq('id', appointment.id)
        if (error) throw error
      }
    }
    syncState.toast = 'Changes saved and synchronized.'
  } catch (e) {
    savedError = `Could not save appointment: ${e.message || e}`
    syncState.error = savedError
    syncState.toast = 'Appointment was not saved to the shared database.'
  } finally {
    inFlight = false
    syncState.saving = false
    // Server data wins; rejected edits are removed from the local screen.
    await refreshAll(true).catch(() => {})
    if (savedError) syncState.error = savedError
    if (store.appointments.some(a => !serverSnapshot.has(a.id) || serverSnapshot.get(a.id) !== compact(fields(a)))) {
      clearTimeout(debounce)
      debounce = setTimeout(saveChanges, 200)
    }
  }
}

/** Explicit button action; always fetches from Supabase after pending saves. */
export async function refreshNow() {
  syncState.toast = ''
  try {
    if (!cloudConfigured) {
      reloadLocalAppointments(true)
      return
    }
    if (!currentUserId) throw new Error('Not connected to Supabase. Sign in again to connect.')
    await refreshAll(false, true)
    if (syncState.error) throw new Error(syncState.error)
    syncState.toast = 'Appointments and notifications refreshed from Supabase.'
  } catch (e) {
    syncState.error = 'Refresh failed: ' + (e.message || e)
  }
}

export async function loadBusySlots(date, doctor) {
  if (!cloudConfigured || !supabase) return [];
  const { data, error } = await supabase.rpc('clinicflow_busy_slots', {
    p_date: date,
    p_doctor: doctor,
  });
  if (error) throw error;
  return (data || []).map(row => row.slot_time);
}

/** Save directly, so the UI shows success only after Supabase accepts the slot. */
/** Backwards-compatible entry point: ignore any clinician passed by older UI. */
export async function clinicflowBookPatient(payload) {
  return clinicflowBookPatientAuto({ date: payload.date, time: payload.time, symptom: payload.symptom })
}

/** Patient cancellation is disabled by ClinicFlow policy and Supabase permissions. */
export async function clinicflowCancelPatient() {
  throw new Error('To cancel or reschedule an appointment, please call the clinic.')
}

/** Available times for a symptom category; clinician identities remain hidden. */
export async function clinicflowPatientAvailableTimes(date, symptom) {
  if (!cloudConfigured || !supabase) return []
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth?.user) throw new Error('Please sign in before checking available times.')
  const { data, error } = await supabase.rpc('clinicflow_patient_available_times', {
    p_date: date, p_symptom: symptom,
  })
  if (error) throw new Error(error.message || 'Could not load appointment availability.')
  return (data || []).map(row => String(row.slot_time).slice(0, 5))
}

/** The database automatically selects the nurse/doctor and enforces unique slots. */
export async function clinicflowBookPatientAuto({ date, time, symptom }) {
  if (!cloudConfigured || !supabase) throw new Error('Cloud booking is not configured.')
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth?.user) throw new Error('Please sign in before booking.')
  const { data, error } = await supabase.rpc('clinicflow_book_my_appointment_auto', {
    p_date: date, p_time: time, p_symptom: symptom,
  })
  if (error) {
    if (error.code === '23505') throw new Error('That appointment was just taken. Choose another time or date.')
    throw new Error(error.message || 'Booking failed. Please try another time.')
  }
  await refreshAll(true)
  return data
}


/** The patient can review each completed appointment once. The server enforces ownership. */
export async function listMyVisitSurveys() {
  if (!cloudConfigured || !supabase) throw new Error('ClinicFlow cloud connection is required for visit surveys.')
  if (syncState.profile?.role !== 'patient') throw new Error('Only patients may submit visit surveys.')
  const { data, error } = await supabase.from('clinicflow_visit_surveys')
    .select('appointment_id,submitted_at').order('submitted_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function submitMyVisitSurvey(payload) {
  if (!cloudConfigured || !supabase) throw new Error('ClinicFlow cloud connection is required for visit surveys.')
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth?.user || syncState.profile?.role !== 'patient') throw new Error('Sign in as a patient to review a visit.')
  const ratings = ['overall','wait_time','concerns','comfort_safety','staff_care']
  if (!ratings.every(k => Number.isInteger(payload[k]) && payload[k] >= 1 && payload[k] <= 5)) {
    throw new Error('Please provide all five ratings from 1 to 5 stars.')
  }
  const { error } = await supabase.from('clinicflow_visit_surveys').insert({
    appointment_id: payload.appointment_id,
    patient_id: auth.user.id,
    overall: payload.overall,
    wait_time: payload.wait_time,
    concerns: payload.concerns,
    comfort_safety: payload.comfort_safety,
    staff_care: payload.staff_care,
    additional_feedback: String(payload.additional_feedback || '').trim().slice(0, 3000),
  })
  if (error) throw error
}
