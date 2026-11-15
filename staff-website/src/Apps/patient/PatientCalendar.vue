<script setup>
import { computed, ref } from 'vue'
import { day, niceDate } from '../shared/demoStore.js'

const props = defineProps({
  selected: String,
  appointments: { type: Array, required: true },
  available: Function,
})
const emit = defineEmits(['select'])
const today = day()
const now = props.selected ? new Date(`${props.selected}T12:00:00`) : new Date()
const month = ref(new Date(now.getFullYear(), now.getMonth(), 1))
const monthLabel = computed(() => month.value.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' }))
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const days = computed(() => {
  const year = month.value.getFullYear()
  const monthIndex = month.value.getMonth()
  const count = new Date(year, monthIndex + 1, 0).getDate()
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1
    const date = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(number).padStart(2, '0')}`
    const hasAppointment = props.appointments.some(appointment => appointment.date === date)
    return { number, date, hasAppointment, hasSlots: date >= today && (props.available?.(date).length ?? 0) > 0 }
  })
})

function moveMonth(offset) {
  month.value = new Date(month.value.getFullYear(), month.value.getMonth() + offset, 1)
}
</script>

<template>
  <section class="calendar" aria-label="Appointment calendar">
    <div class="month">
      <button type="button" aria-label="Previous month" @click="moveMonth(-1)">‹</button>
      <strong aria-live="polite">{{ monthLabel }}</strong>
      <button type="button" aria-label="Next month" @click="moveMonth(1)">›</button>
    </div>
    <div class="days">
      <span v-for="weekday in weekdays" :key="weekday" class="weekday">{{ weekday }}</span>
      <span v-for="blank in month.getDay()" :key="'blank' + blank" aria-hidden="true"></span>
      <button
        v-for="entry in days" :key="entry.date" type="button"
        :aria-pressed="selected === entry.date"
        :aria-label="niceDate(entry.date) + (entry.hasAppointment ? ', appointment booked' : '') + (available ? (entry.hasSlots ? ', times available' : ', no times available') : '')"
        @click="emit('select', entry.date)"
      >
        {{ entry.number }}
        <span class="markers" aria-hidden="true">
          <i v-if="entry.hasAppointment" class="booked"></i><i v-if="entry.hasSlots" class="available"></i>
        </span>
      </button>
    </div>
    <div class="legend"><span><i class="booked"></i> Your appointment</span><span v-if="available"><i class="available"></i> Times available</span></div>
  </section>
</template>

<style scoped>
.calendar { padding: 10px; border: 1px solid #cbd5e1; border-radius: 12px; background: white; }
.month, .legend { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px; margin: 8px 0; text-align: center; }
.weekday { font-size: .72rem; color: #475569; }
button { min-height: 38px; border: 1px solid transparent; border-radius: 6px; background: #f4f7fb; color: #20384e; cursor: pointer; }
.month button { min-width: 38px; font-size: 1.25rem; }
button[aria-pressed="true"] { border-color: #195e96; background: #e2effb; }
button:focus-visible { outline: 2px solid #195e96; outline-offset: 1px; }
.markers { display: flex; justify-content: center; gap: 3px; min-height: 7px; }
i { display: inline-block; width: 7px; height: 7px; border-radius: 50%; }
.booked { background: #195e96; }
.available { background: #14764b; }
.legend { justify-content: start; flex-wrap: wrap; font-size: .75rem; color: #475569; }
</style>
