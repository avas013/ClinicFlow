/** ClinicFlow cloud sync (prototype). Requires Supabase Auth + RLS. */
import { reactive, watch } from 'vue'
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
export const cloudConfigured = Boolean(url && key)
const supabase = cloudConfigured ? createClient(url, key) : null

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

export function attachClinicStore(clinic) {
  if (store) return
  store = clinic
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
  timer = setInterval(() => { refreshAll().catch(() => {}) }, 45000)
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

export async function refreshAll(force = false) {
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
  if (inFlight && !force) return
  if (refreshInFlight) return refreshInFlight
  const generation = activeGeneration
  refreshInFlight = (async () => {
    syncState.refreshing = true
    try {
      const [{ data: rows, error }, { data: notes, error: notesError }] = await Promise.all([
        supabase.from('appointments').select('id,patient_id,patient,doctor,date,time,reason,status,confirmed,queue_position').order('date', { ascending: true }).order('time', { ascending: true }),
        supabase.from('appointment_notifications').select('id,appointment_id,message,created_at,read_at').order('created_at', { ascending: false }).limit(40),
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

async function saveChanges() {
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
        const before = JSON.parse(serverSnapshot.get(appointment.id))
        const isConfirmation = !before.confirmed && payload.confirmed &&
          Object.keys(before).every(k => k === 'confirmed' || before[k] === payload[k])
        if (!isConfirmation) throw new Error('Patients may only confirm their scheduled appointments.')
        const { error } = await supabase.rpc('confirm_my_appointment', { target_appointment_id: appointment.id })
        if (error) throw error
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
