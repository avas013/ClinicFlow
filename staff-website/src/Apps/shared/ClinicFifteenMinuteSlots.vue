<script setup>
import { t, language, formatTime as localizedTime } from '../../language.js'
import { ref, computed, watch } from 'vue'
import { cloudConfigured, loadBusySlots } from '../../services/clinicSync.js'
import { slotOccupied, patientSlotOccupied } from './clinicflowBookingRules.js'
import { staff } from './demoStore.js'
import {
  isClinicWeekday,
  CLINIC_OPEN_HOUR,
  CLINIC_CLOSE_HOUR,
} from '../../config/clinicDetails.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  date: { type: String, default: '' },
  doctor: { type: String, default: '' },
  patientName: { type: String, default: '' },
  appointments: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])
const busy = ref(new Set())
const loading = ref(false)
const errorMessage = ref('')
let seq = 0

watch(
  [() => props.date, () => props.doctor],
  async ([date, doctor]) => {
    const requestId = ++seq

    busy.value = new Set()
    errorMessage.value = ''
    loading.value = false
    emit('update:modelValue', '')

    if (
      !date ||
      !doctor ||
      !isClinicWeekday(date) ||
      !cloudConfigured
    ) return

    loading.value = true

    try {
      const result = await loadBusySlots(date, doctor)

      if (seq === requestId) {
        busy.value = new Set(result)
      }
    } catch {
      if (seq === requestId) {
        errorMessage.value =
          'Availability could not be loaded. Try again shortly.'
      }
    } finally {
      if (seq === requestId) {
        loading.value = false
      }
    }
  },
  { immediate: true },
)

function timeAsMinutes(text) {
  const found = String(text || '')
    .trim()
    .match(/^(\d{1,2}):(\d\d)\s*(AM|PM)$/i)

  if (!found) return null

  return (
    Number(found[1]) % 12 +
    (found[3].toUpperCase() === 'PM' ? 12 : 0)
  ) * 60 + Number(found[2])
}

const shift = computed(() => {
  const person = staff.find(s => s.name === props.doctor)
  const bounds = String(person?.shift || '').split(/\s*[–—-]\s*/)
  const start = timeAsMinutes(bounds[0])
  const end = timeAsMinutes(bounds[1])

  return start !== null && end !== null && end > start
    ? [start, end]
    : [CLINIC_OPEN_HOUR * 60, CLINIC_CLOSE_HOUR * 60]
})

const choices = computed(() => {
  const [start, end] = shift.value
  const next = []

  if (!isClinicWeekday(props.date)) return next

  for (
    let minuteOfDay = Math.ceil(start / 15) * 15;
    minuteOfDay + 15 <= end;
    minuteOfDay += 15
  ) {
    const hour = Math.floor(minuteOfDay / 60)
    const minute = minuteOfDay % 60

    const value =
      String(hour).padStart(2, '0') +
      ':' +
      String(minute).padStart(2, '0')

    const dateTime = new Date(`${props.date}T${value}:00`)

    const unavailable =
      dateTime <= new Date() ||
      busy.value.has(value) ||
      slotOccupied(
        props.appointments,
        props.doctor,
        props.date,
        value,
      ) ||
      patientSlotOccupied(
        props.appointments,
        props.patientName,
        props.date,
        value,
      )

    next.push({
      value,
      label: localizedTime(value),
      unavailable,
    })
  }

  return next
})

const selectable = computed(() =>
  Boolean(
    props.date &&
    props.doctor &&
    isClinicWeekday(props.date),
  ) &&
  !loading.value &&
  !errorMessage.value,
)
</script>

<template>
  <div class="cf15-wrapper">
    <select
      :value="modelValue"
      :disabled="!selectable"
      required
      :aria-label="t('Appointment time')"
      @change="emit('update:modelValue', $event.target.value)"
    >
      <option value="" disabled>
        {{
          loading
            ? t('Checking availability…')
            : t('Choose a 15-minute appointment time')
        }}
      </option>

      <option
        v-for="choice in choices"
        :key="choice.value"
        :value="choice.value"
        :disabled="choice.unavailable"
      >
        {{ choice.label }}
        {{ choice.unavailable ? t(' — Taken / unavailable') : '' }}
      </option>
    </select>

    <small
      v-if="date && !isClinicWeekday(date)"
      class="cf15-error"
    >
      {{
        language === 'fr'
          ? `Fermé les fins de semaine. Choisissez du lundi au vendredi, de ${CLINIC_OPEN_HOUR} h à ${CLINIC_CLOSE_HOUR} h.`
          : `Closed weekends. Choose Monday–Friday, ${localizedTime(String(CLINIC_OPEN_HOUR).padStart(2, '0') + ':00')}–${localizedTime(String(CLINIC_CLOSE_HOUR).padStart(2, '0') + ':00')}.`
      }}
    </small>

    <small
      v-else-if="errorMessage"
      class="cf15-error"
      role="alert"
    >
      {{ t(errorMessage) }}
    </small>

    <small v-else class="cf15-hint">
      {{
        t(
          'Greyed-out times are unavailable. Final availability is checked by the server.'
        )
      }}
    </small>
  </div>
</template>

<style scoped>
.cf15-wrapper {
  width: 100%;
  min-width: 0;
  display: block;
}

.cf15-wrapper select {
  width: 100%;
  min-width: 0;
  min-height: 42px;
  background: white;
  color: #26394c;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 9px;
  font: inherit;
}

.cf15-wrapper select:disabled {
  opacity: 0.7;
}

.cf15-wrapper option:disabled {
  color: #8d939d;
  background: #e5e7eb;
}

.cf15-wrapper small {
  font-size: 12px;
  display: block;
  margin-top: 5px;
}

.cf15-hint {
  color: #60748a;
}

.cf15-error {
  color: #b42318;
}
</style>