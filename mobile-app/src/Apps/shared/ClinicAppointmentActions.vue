<script setup>
import { ref } from 'vue'
import { update } from './demoStore.js'
import { cloudConfigured, clinicflowCancelPatient } from '../../services/clinicSync.js'

const props = defineProps({
  appointment: { type: Object, required: true },
  showDetails: { type: Boolean, default: true },
})
const expanded = ref(false)
const cancelling = ref(false)
const error = ref('')
const officeAddress = import.meta.env.VITE_CLINIC_OFFICE_ADDRESS || 'Please contact the clinic for the office address.'

async function cancel() {
  if (!window.confirm('Cancel this appointment?')) return
  error.value = ''
  cancelling.value = true
  try {
    if (cloudConfigured) await clinicflowCancelPatient(props.appointment.id)
    else update(props.appointment.id, 'Cancelled')
  } catch (cause) {
    error.value = cause.message || 'Cancellation failed. Please try again.'
  } finally { cancelling.value = false }
}
</script>

<template>
  <div class="cf-actions" @click.stop>
    <button v-if="showDetails" class="cf-expand" type="button" :aria-expanded="expanded" @click="expanded = !expanded">
      <span>Appointment details</span>
      <span class="cf-chevron" aria-hidden="true">{{ expanded ? '▴' : '▾' }}</span>
    </button>
    <div v-if="expanded && showDetails" class="cf-extra">
      <p><strong>Office address:</strong> {{ officeAddress }}</p>
      <p><strong>Bring:</strong> Your health card, a list of current medications, and any relevant medical documents.</p>
      <p><strong>Visit:</strong> {{ appointment.reason || 'Appointment' }} with {{ appointment.doctor }}</p>
    </div>
    <button v-if="appointment.status === 'Scheduled'" class="cf-cancel" type="button" :disabled="cancelling" @click="cancel">
      {{ cancelling ? 'Cancelling…' : 'Cancel appointment' }}
    </button>
    <p v-if="error" class="cf-error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.cf-actions{width:100%;flex-basis:100%;grid-column:1/-1;margin-top:10px;padding-top:9px;border-top:1px solid #e2e8f0}
.cf-expand{display:flex;justify-content:space-between;align-items:center;width:100%;border:0;background:transparent;color:#1c6398;text-align:left;font:inherit;font-weight:700;cursor:pointer;padding:4px 0}
.cf-chevron{font-size:22px;line-height:1}.cf-extra{padding:8px 0;color:#35495d;font-size:13px;line-height:1.55}.cf-extra p{margin:5px 0}
.cf-cancel{display:block;border:1px solid #db7474;color:#a82929;background:#fff;border-radius:7px;padding:8px 11px;font-size:12px;font-weight:700;cursor:pointer;margin-top:10px}.cf-cancel:disabled{opacity:.6}
.cf-error{color:#b42318;font-size:12px;margin:5px 0}
</style>
