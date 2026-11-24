<script setup>
import { t } from '../../language.js'
import { ref } from 'vue'

const props = defineProps({
  appointment: { type: Object, required: true },
  showDetails: { type: Boolean, default: true },
})
const expanded = ref(false)
const officeAddress = import.meta.env.VITE_CLINIC_OFFICE_ADDRESS || 'Contact the clinic for its address.'
const clinicPhone = import.meta.env.VITE_CLINIC_PHONE || ''
const phoneLink = clinicPhone.replace(/[^+\d]/g, '')
</script>

<template>
  <div class="cf-actions" @click.stop>
    <button v-if="showDetails" class="cf-expand" type="button" :aria-expanded="expanded" @click="expanded = !expanded">
      <span>{{ t("Appointment details") }}</span>
      <span class="cf-arrow" :class="{ expanded }" aria-hidden="true">›</span>
    </button>
    <div v-if="showDetails && expanded" class="cf-extra">
      <p><strong>{{ t("Office address:") }}</strong> {{ t(officeAddress) }}</p>
      <p><strong>{{ t("Bring:") }}</strong> {{ t("Your health card, medication list, and relevant medical documents.") }}</p>
      <p><strong>{{ t("Appointment:") }}</strong> {{ t(appointment.reason || 'Visit') }} {{ t('with') }} {{ t(appointment.doctor) }}</p>
    </div>
    <p class="cf-call-note">{{ t("To cancel or reschedule, please") }}
      <a v-if="phoneLink" :href="`tel:${phoneLink}`">{{ t('call the clinic at {phone}', { phone: clinicPhone }) }}</a>
      <span v-else>{{ t("call the clinic") }}</span>.
    </p>
  </div>
</template>

<style scoped>
.cf-actions{width:100%;flex-basis:100%;grid-column:1/-1;margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0}
.cf-expand{display:flex;justify-content:space-between;align-items:center;width:100%;border:0;background:transparent;color:#1c6398;text-align:left;font:inherit;font-weight:700;cursor:pointer;padding:4px 0}
.cf-arrow{font-size:23px;transform:rotate(90deg);transition:transform .16s ease;display:inline-block;line-height:1}
.cf-arrow.expanded{transform:rotate(-90deg)}
.cf-extra{padding:8px 0;color:#35495d;font-size:13px;line-height:1.55}
.cf-extra p{margin:5px 0}
.cf-call-note{margin:7px 0 0;font-size:12px;color:#667b8e}
.cf-call-note a{color:#1c6398;text-decoration:underline}
</style>
