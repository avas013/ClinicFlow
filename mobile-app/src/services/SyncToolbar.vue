<script setup>
import { computed, ref } from 'vue'
import { syncState, cloudConfigured, refreshNow, enableDesktopAlerts, markRead } from './clinicSync.js'
const showNotifications = ref(false)
const message = ref('')
const unread = computed(() => syncState.notifications.filter(n => !n.read_at).length)
const connectionLabel = computed(() => !cloudConfigured
  ? 'Local demo; not shared'
  : syncState.ready ? 'Connected to ClinicFlow' : 'Connecting to ClinicFlow')

async function askForNotifications() {
  message.value = await enableDesktopAlerts()
}
async function read(note) {
  await markRead(note.id)
}
</script>

<template>
  <section class="cf-syncbar" aria-label="Appointment synchronization">
    <div class="cf-syncbar-left">
      <span class="cf-sync-indicator" :class="{ online: syncState.ready }" role="status" :aria-label="connectionLabel" :title="connectionLabel"></span>
    </div>
    <div class="cf-syncbar-actions">
      <button class="cf-sync-button" type="button" :disabled="syncState.refreshing || syncState.saving" @click="refreshNow">↻ Refresh</button>
      <button class="cf-sync-button" type="button" :aria-expanded="showNotifications" @click="showNotifications = !showNotifications">
        ♧ Notifications <span v-if="unread" class="cf-unread">{{ unread }}</span>
      </button>
    </div>
  </section>
  <p v-if="syncState.error" class="cf-sync-error" role="alert">{{ syncState.error }}</p>
  <p v-if="syncState.toast" class="cf-sync-toast" role="status">{{ syncState.toast }}</p>
  <section v-if="showNotifications" class="cf-sync-notes" aria-label="ClinicFlow notifications">
    <div class="cf-notes-heading">
      <strong>Notifications</strong>
      <button type="button" @click="askForNotifications">Enable desktop alerts</button>
    </div>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="!syncState.notifications.length">No new notifications.</p>
    <article v-for="note in syncState.notifications" :key="note.id" class="cf-sync-note">
      <div><p>{{ note.message }}</p><small>{{ new Date(note.created_at).toLocaleString() }}</small></div>
      <button v-if="!note.read_at" type="button" @click="read(note)">Mark read</button>
    </article>
    <small v-if="!cloudConfigured">Notifications require Supabase and a real signed-in account.</small>
  </section>
</template>

<style scoped>
.cf-syncbar{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;background:#f3f8fd;border-bottom:1px solid #d6e4ee;padding:10px clamp(14px,3vw,30px);font:13px Inter,Arial,sans-serif;color:#36576f}
.cf-syncbar-left,.cf-syncbar-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.cf-syncbar-left small{color:#8295a3}.cf-sync-indicator{display:inline-block;border-radius:50%;width:9px;height:9px;background:#a4aeb8}.cf-sync-indicator.online{background:#22a568}.cf-sync-button{border:1px solid #a5c8de;background:white;color:#256c99;border-radius:9px;padding:8px 12px;font-size:12px;font-weight:750;cursor:pointer}.cf-sync-button:disabled{opacity:.6;cursor:wait}.cf-unread{background:#256c99;color:white;border-radius:100px;padding:2px 6px}.cf-sync-toast,.cf-sync-error{padding:11px 24px;margin:0;font:13px Inter,Arial,sans-serif}.cf-sync-toast{background:#eaf8ef;color:#176039}.cf-sync-error{background:#fff1ef;color:#9b3737}.cf-sync-notes{padding:18px clamp(14px,3vw,30px);background:white;border-bottom:1px solid #e0e8ee;font:13px Inter,Arial,sans-serif}.cf-notes-heading{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}.cf-notes-heading button,.cf-sync-note button{padding:7px 11px;border-radius:8px;background:#eff7fc;color:#246e9f;border:1px solid #c9deef;cursor:pointer}.cf-sync-note{display:flex;align-items:center;justify-content:space-between;gap:14px;border-top:1px solid #e6edf3;padding:12px 0}.cf-sync-note p{margin:2px 0 4px}.cf-sync-note small{color:#8095a8}
</style>
