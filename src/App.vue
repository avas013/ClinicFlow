<script setup>
import { ref } from 'vue'
import PatientApp from './Apps/patient/PatientApp.vue'
import DoctorNurseApp from './Apps/doctor-nurse/DoctorNurseApp.vue'
import FrontDeskApp from './Apps/front-desk/FrontDeskApp.vue'
import AdministratorApp from './Apps/administrator/AdministratorApp.vue'
import { resetDemo } from './Apps/shared/demoStore.js'

const selected = ref('patient')
const sections = [
  { id: 'patient', label: 'Patient App' },
  { id: 'doctor', label: 'Doctor / Nurse' },
  { id: 'frontdesk', label: 'Front Desk' },
  { id: 'admin', label: 'Administrator' },
]
</script>

<template>
  <div class="clinicflow-demo">
    <header class="demo-bar">
      <div class="demo-brand"><span class="demo-logo">+</span><span>ClinicFlow <small>PROTOTYPE</small></span></div>
      <nav class="demo-nav" aria-label="Choose ClinicFlow subsystem">
        <button v-for="section in sections" :key="section.id" type="button"
          :class="{ selected: selected === section.id }" :aria-pressed="selected === section.id"
          @click="selected = section.id">{{ section.label }}</button>
      </nav>
      <button class="demo-reset" type="button" @click="resetDemo" title="Restore original fictional appointments">Reset data</button>
    </header>
    <main class="demo-preview" :class="{ 'patient-preview': selected === 'patient' }">
      <PatientApp v-if="selected === 'patient'" />
      <DoctorNurseApp v-else-if="selected === 'doctor'" />
      <FrontDeskApp v-else-if="selected === 'frontdesk'" />
      <AdministratorApp v-else />
    </main>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
:root { font-family: Inter, Arial, sans-serif; color: #203047; background: #f3f6fa; }
* { box-sizing: border-box; }
body { margin: 0; }
button, input, select { font: inherit; }
button { cursor: pointer; }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid #6bb7ff; outline-offset: 2px; }
.clinicflow-demo { min-height: 100dvh; }
.demo-bar { position: relative; z-index: 10; display: flex; gap: 18px; align-items: center; justify-content: space-between; flex-wrap: wrap; background: white; border-bottom: 1px solid #dae4ee; padding: 11px clamp(12px, 3vw, 35px); }
.demo-brand { display: flex; gap: 9px; align-items: center; font-size: 16px; font-weight: 800; white-space: nowrap; }
.demo-brand small { display: block; font-size: 9px; letter-spacing: 2px; color: #8292a4; }
.demo-logo { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; background: #286fae; color: white; font-size: 25px; }
.demo-nav { display: flex; flex-wrap: wrap; gap: 5px; padding: 4px; border-radius: 11px; background: #f0f4f8; }
.demo-nav button, .demo-reset { padding: 10px 12px; border: 0; border-radius: 8px; background: transparent; color: #547089; font-size: 12px; font-weight: 700; }
.demo-nav button.selected { background: white; color: #1d629e; box-shadow: 0 1px 5px #163c6020; }
.demo-reset { border: 1px solid #d7e3ee; background: white; color: #345877; }
.demo-preview { min-height: calc(100dvh - 65px); }
.patient-preview { display: flex; justify-content: center; }
.patient-preview > * { width: 100%; }
@media(max-width:750px) { .demo-bar { justify-content: center; gap: 8px; } .demo-brand { margin-right: auto; } .demo-reset { margin-left: auto; } .demo-nav { order: 2; width: 100%; justify-content: center; overflow-x: auto; flex-wrap: nowrap; } .demo-nav button { flex: 1; white-space: nowrap; padding: 9px 5px; font-size: 10px; } }
</style>
