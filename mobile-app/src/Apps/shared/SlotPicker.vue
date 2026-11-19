<script setup>
import { computed, ref, watch } from 'vue'
import { loadBusySlots } from '../../services/clinicSync.js'
import { isSlotTaken } from './bookingAvailability.js'
const props = defineProps({
  modelValue: { type: String, default: '' },
  appointments: { type: Array, default: () => [] },
  doctor: { type: String, default: '' },
  date: { type: String, default: '' },
  excludeId: { default: null },
})
const emit = defineEmits(['update:modelValue'])
const serverBusy = ref(new Set())
const loading = ref(false)
const remoteError = ref('')
let activeRequest = 0
watch([() => props.date, () => props.doctor], async ([date, doctor]) => {
  const request = ++activeRequest
  serverBusy.value = new Set()
  remoteError.value = ''
  if (!date || !doctor) return
  loading.value = true
  try {
    const busy = await loadBusySlots(date, doctor)
    if (request === activeRequest) serverBusy.value = new Set(busy)
  } catch (error) {
    if (request === activeRequest) remoteError.value = 'Could not check shared availability. The server will still block conflicts.'
  } finally {
    if (request === activeRequest) loading.value = false
  }
}, { immediate: true })
// 96 possibilities cover the entire day; do not assume an office opening time.
const slots = computed(() => Array.from({ length: 96 }, (_, index) => {
  const hour = Math.floor(index / 4)
  const minute = index % 4 * 15
  const value = String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0')
  const displayHour = hour % 12 || 12
  return {
    value,
    label: displayHour + ':' + String(minute).padStart(2, '0') + (hour >= 12 ? ' PM' : ' AM'),
    taken: serverBusy.value.has(value) || isSlotTaken(props.appointments, props.doctor, props.date, value, props.excludeId),
  }
}))
</script>

<template>
  <div class="cf-slot-picker">
    <select :value="modelValue" required aria-label="Appointment time" @change="emit('update:modelValue', $event.target.value)">
      <option value="" disabled>Select an available 15-minute slot</option>
      <option v-for="slot in slots" :key="slot.value" :value="slot.value" :disabled="slot.taken">
        {{ slot.label }}{{ slot.taken ? ' — Taken' : '' }}
      </option>
    </select>
    <small v-if="loading">Checking shared availability…</small>
    <small v-else-if="remoteError" role="alert">{{ remoteError }}</small>
    <small v-else>Greyed-out times are already booked for this clinician.</small>
  </div>
</template>

<style scoped>
.cf-slot-picker{display:block;min-width:0;width:100%}
.cf-slot-picker select{width:100%;min-height:41px;padding:9px;border-radius:8px;border:1px solid #cbd5e1;background:white;color:#25384a;font:inherit}
.cf-slot-picker option:disabled{color:#969da7;background:#ededed}
.cf-slot-picker small{display:block;color:#748193;margin-top:4px;font-size:12px}
</style>
