<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { cloudConfigured, listMyVisitSurveys, submitMyVisitSurvey, syncState } from '../../services/clinicSync.js'

const props = defineProps({
  appointments: { type: Array, default: () => [] },
  initialAppointmentId: { type: [Number, String], default: null },
})

const fields = [
  { key: 'overall', label: 'Your overall visit' },
  { key: 'wait_time', label: 'Time taken to be seen' },
  { key: 'concerns', label: 'How well your concerns were addressed' },
  { key: 'comfort_safety', label: 'How comfortable and safe you felt' },
  { key: 'staff_care', label: 'How staff treated you' },
]
const ratings = reactive({ overall: 0, wait_time: 0, concerns: 0, comfort_safety: 0, staff_care: 0 })
const additionalFeedback = ref('')
const selectedId = ref(null)
const submittedIds = ref(new Set())
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const completed = computed(() => [...props.appointments]
  .filter(a => a.status === 'Completed')
  .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)))
const pending = computed(() => completed.value.filter(a => !submittedIds.value.has(Number(a.id))))
const pastSubmitted = computed(() => completed.value.filter(a => submittedIds.value.has(Number(a.id))))
const allRated = computed(() => fields.every(f => Number.isInteger(ratings[f.key]) && ratings[f.key] >= 1 && ratings[f.key] <= 5))
const readyToSubmit = computed(() => Number.isInteger(Number(selectedId.value)) && selectedId.value !== null && allRated.value && !saving.value)

function chooseRequestedAppointment() {
  const id = Number(props.initialAppointmentId)
  if (props.initialAppointmentId !== null && pending.value.some(a => Number(a.id) === id)) selectedId.value = id
  else if (selectedId.value === null && pending.value.length === 1) selectedId.value = Number(pending.value[0].id)
}

async function refreshResponses() {
  if (!cloudConfigured || syncState.profile?.role !== 'patient') return
  loading.value = true
  error.value = ''
  try {
    const rows = await listMyVisitSurveys()
    submittedIds.value = new Set(rows.map(r => Number(r.appointment_id)))
    if (selectedId.value !== null && !pending.value.some(a => Number(a.id) === Number(selectedId.value))) selectedId.value = null
    chooseRequestedAppointment()
  } catch (e) {
    error.value = e.message || String(e)
  } finally { loading.value = false }
}
watch(() => props.initialAppointmentId, chooseRequestedAppointment)
watch(() => completed.value.map(a => `${a.id}:${a.status}`).join(','), () => { refreshResponses() })
watch(() => syncState.profile?.id, () => {
  submittedIds.value = new Set()
  selectedId.value = null
  refreshResponses()
})
onMounted(refreshResponses)

async function submit() {
  if (!readyToSubmit.value) return
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    await submitMyVisitSurvey({
      appointment_id: Number(selectedId.value),
      overall: ratings.overall,
      wait_time: ratings.wait_time,
      concerns: ratings.concerns,
      comfort_safety: ratings.comfort_safety,
      staff_care: ratings.staff_care,
      additional_feedback: additionalFeedback.value.trim(),
    })
    submittedIds.value = new Set([...submittedIds.value, Number(selectedId.value)])
    selectedId.value = null
    additionalFeedback.value = ''
    for (const f of fields) ratings[f.key] = 0
    success.value = 'Thank you! Your feedback about this visit was submitted.'
  } catch (e) {
    error.value = e?.code === '23505' ? 'You have already submitted a survey for this visit.' : (e.message || String(e))
  } finally { saving.value = false }
}
</script>

<template>
  <div class="cf-visit-survey">
    <p class="cf-intro">Share your experience after a doctor or nurse marks your appointment as completed. Each survey is linked to one visit.</p>
    <p v-if="success" class="cf-message cf-success" role="status">{{ success }}</p>
    <p v-if="error" class="cf-message cf-error" role="alert">{{ error }}</p>
    <p v-if="!cloudConfigured" class="cf-message">Connect ClinicFlow to Supabase to submit a survey.</p>
    <p v-else-if="syncState.profile?.role !== 'patient'" class="cf-message">Sign in as a patient to see your visit surveys.</p>
    <p v-else-if="loading">Loading your completed visits…</p>
    <template v-else>
      <p v-if="!pending.length" class="cf-message">No surveys awaiting your response. When your clinician completes a visit, the survey will appear here.</p>
      <form v-if="pending.length" class="cf-survey-form" @submit.prevent="submit">
        <label class="cf-label" for="cf-survey-appointment">Which recent visit are you rating?</label>
        <select id="cf-survey-appointment" v-model.number="selectedId" required>
          <option :value="null" disabled>Select a completed visit</option>
          <option v-for="visit in pending" :key="visit.id" :value="Number(visit.id)">{{ visit.date }} at {{ visit.time }} · {{ visit.doctor }}</option>
        </select>
        <template v-if="selectedId !== null">
          <fieldset v-for="field in fields" :key="field.key" class="cf-rating-field">
            <legend>{{ field.label }} <span aria-hidden="true">*</span></legend>
            <div class="cf-stars" role="group" :aria-label="field.label">
              <button v-for="star in 5" :key="star" type="button" class="cf-star"
                :class="{ selected: star <= ratings[field.key] }"
                :aria-label="`${star} out of 5 stars for ${field.label}`"
                :aria-pressed="ratings[field.key] === star"
                @click="ratings[field.key] = star">★</button>
              <span class="cf-rating-value">{{ ratings[field.key] ? `${ratings[field.key]}/5` : 'Not rated' }}</span>
            </div>
          </fieldset>
          <label class="cf-label" for="cf-survey-feedback">Additional feedback (optional)</label>
          <textarea id="cf-survey-feedback" v-model="additionalFeedback" rows="5" maxlength="3000" placeholder="Tell us anything else about your visit. Please avoid including sensitive medical details."></textarea>
          <p class="cf-hint">Your answers are stored with this appointment. All five ratings are required; written feedback is optional.</p>
          <button class="cf-submit" type="submit" :disabled="!readyToSubmit">{{ saving ? 'Submitting…' : 'Submit visit survey' }}</button>
        </template>
      </form>
      <section v-if="pastSubmitted.length" class="cf-previous-surveys">
        <h2>Surveys you completed</h2>
        <p v-for="visit in pastSubmitted" :key="visit.id">{{ visit.date }} · {{ visit.doctor }} — Survey submitted ✓</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.cf-visit-survey{color:#26384b;font-family:inherit}.cf-intro,.cf-hint{line-height:1.55;color:#5d7080;font-size:13px}.cf-survey-form{display:grid;gap:16px}.cf-label{display:block;font-size:14px;font-weight:650}.cf-survey-form select,.cf-survey-form textarea{width:100%;max-width:100%;box-sizing:border-box;border:1px solid #cbd7e2;border-radius:9px;padding:11px 12px;color:#26384b;background:#fff;font:inherit}.cf-rating-field{border:1px solid #e0e9f1;border-radius:12px;padding:12px 14px;margin:0;min-width:0}.cf-rating-field legend{padding:0 6px;font-size:13px;font-weight:650}.cf-stars{display:flex;gap:1px;align-items:center;flex-wrap:wrap}.cf-star{font-size:31px;color:#b3bbc7;background:transparent;border:0;cursor:pointer;line-height:1.25;padding:2px 4px}.cf-star.selected{color:#e2a02b}.cf-star:hover,.cf-star:focus-visible{color:#c98d1f;outline-offset:2px}.cf-rating-value{font-size:12px;color:#607487;margin-left:7px}.cf-submit{border:0;border-radius:8px;background:#286fa8;color:#fff;font-weight:750;padding:12px 16px;cursor:pointer}.cf-submit:disabled{opacity:.55;cursor:not-allowed}.cf-message{font-size:13px;line-height:1.5;margin:12px 0;padding:11px 12px;background:#eff5fa;border-radius:8px}.cf-success{background:#e6f7ed;color:#1d6d42}.cf-error{background:#fceceb;color:#9c2929}.cf-previous-surveys{margin-top:20px;border-top:1px solid #dce5ee;padding-top:10px}.cf-previous-surveys h2{font-size:16px}.cf-previous-surveys p{font-size:13px;color:#697e90}
</style>
