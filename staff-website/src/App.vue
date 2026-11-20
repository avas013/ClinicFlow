<script setup>
import ClinicLanding from './ClinicLanding.vue'
import './styles/doctor-web.css'
import DoctorNurseApp from './Apps/doctor-nurse/DoctorNurseApp.vue'
import SyncToolbar from './services/SyncToolbar.vue'
import {
  cloudConfigured,
  cloudLogin,
  cloudLogout,
  startClinicSync,
  stopClinicSync
} from './services/clinicSync.js'
import PatientWebApp from './Apps/patient/PatientWebApp.vue'
import { ref } from 'vue'
import { language, t } from './language.js'
import FrontDeskApp from './Apps/front-desk/FrontDeskApp.vue'
import AdministratorApp from './Apps/administrator/AdministratorApp.vue'

// Temporary development accounts.
// Only used when Supabase is not configured.
const accounts = [
  {
    email: 'doctor@clinicflow.demo',
    password: 'Demo1234!',
    role: 'doctor',
    name: 'Dr. Smith'
  },
  {
    email: 'patient@clinicflow.demo',
    password: 'Demo1234!',
    role: 'patient',
    name: 'Jordan Taylor'
  },
  {
    email: 'frontdesk@clinicflow.demo',
    password: 'Demo1234!',
    role: 'frontdesk',
    name: 'Front Desk Staff'
  },
  {
    email: 'admin@clinicflow.demo',
    password: 'Demo1234!',
    role: 'admin',
    name: 'Administrator'
  }
]

const email = ref('')
const password = ref('')
const error = ref('')
const currentUser = ref(null)
const loading = ref(false)

// Login
async function performSignIn() {
  error.value = ''

  // Supabase authentication
  if (cloudConfigured) {
    try {
      const signedIn = await cloudLogin(email.value, password.value)

      // Nurses use the Doctor/Nurse interface.
      const role = signedIn.role === 'nurse'
        ? 'doctor'
        : signedIn.role

      // Allow all four roles on the website.
      if (!['patient', 'doctor', 'frontdesk', 'admin'].includes(role)) {
        throw new Error('This account does not have access to ClinicFlow.')
      }

      currentUser.value = {
        ...signedIn,
        role
      }

      password.value = ''

      // Start shared appointment synchronization.
      await startClinicSync()

    } catch (e) {
      stopClinicSync()
      currentUser.value = null
      error.value = e.message || String(e)
    }

    return
  }

  // Local demo authentication
  const account = accounts.find(a =>
    a.email === email.value.trim().toLowerCase() &&
    a.password === password.value
  )

  if (!account) {
    error.value = 'Incorrect email or password.'
    return
  }

  currentUser.value = {
    name: account.name,
    email: account.email,
    role: account.role
  }

  password.value = ''
  error.value = ''
}

// Logout
function signOut() {
  stopClinicSync()

  if (cloudConfigured) {
    void cloudLogout()
  }


  currentUser.value = null
  email.value = ''
  password.value = ''
  error.value = ''
}

async function signIn() {
  if (loading.value) return
  loading.value = true
  try {
    await performSignIn()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <SyncToolbar v-if="currentUser" />

  <div class="staff-shell">
    <ClinicLanding v-if="!currentUser">
      <template #signin>
        <div class="login-layout">
      <section class="login-card">

        <div class="logo">+</div>

        <h1>ClinicFlow</h1>
        <p>{{ t('ClinicFlow Website') }}</p>
        <p>Patients, doctors, nurses, front desk staff, and administrators can sign in here.</p>

        <label class="language-picker">
          <span>{{ t('Language') }}</span>

          <select v-model="language">
            <option value="en" lang="en">English</option>
            <option value="fr" lang="fr">Français</option>
          </select>
        </label>

        <form @submit.prevent="signIn">

          <label for="email">
            {{ t('Email address') }}
          </label>

          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="username"
            required
          />

          <label for="password">
            {{ t('Password') }}
          </label>

          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
          />

          <p v-if="error" class="error" role="alert">
            {{ t(error) }}
          </p>

          <button class="login-button" type="submit" :disabled="loading">
            {{ loading ? 'Signing in…' : t('Sign in') }}
          </button>

        </form>
      </section>
    
        </div>
      </template>
    </ClinicLanding>

    <!-- LOGGED-IN WEBSITE -->
    <template v-else>

      <header class="staff-header">

        <strong>
          + ClinicFlow · {{ t('ClinicFlow Website') }}
        </strong>

        <label class="language-picker">
          <span>{{ t('Language') }}</span>

          <select v-model="language">
            <option value="en" lang="en">English</option>
            <option value="fr" lang="fr">Français</option>
          </select>
        </label>

        <button type="button" @click="signOut">
          {{ t('Log out') }}
        </button>

      </header>

      <!-- PATIENT -->
      <PatientWebApp
        v-if="currentUser.role === 'patient'"
      />

      <!-- DOCTOR / NURSE -->
      <div
        v-else-if="currentUser.role === 'doctor'"
        class="clinicflow-doctor-host"
      >
        <DoctorNurseApp />
      </div>

      <!-- FRONT DESK -->
      <FrontDeskApp
        v-else-if="currentUser.role === 'frontdesk'"
      />

      <!-- ADMINISTRATOR -->
      <AdministratorApp
        v-else-if="currentUser.role === 'admin'"
      />

    </template>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:global(body) {
  margin: 0;
  font-family: Inter, Arial, sans-serif;
  background: #f4f7fa;
  color: #1c2e40;
}

* {
  box-sizing: border-box;
}

button,
input {
  font: inherit;
}

.staff-shell {
  min-height: 100dvh;
}

.login-layout {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.login-card {
  background: white;
  border: 1px solid #dce5ed;
  border-radius: 18px;
  width: 100%;
  max-width: 440px;
  padding: 32px;
  box-shadow: 0 12px 35px #193c5710;
}

.logo {
  width: 52px;
  height: 52px;
  background: #266fac;
  color: white;
  border-radius: 13px;
  display: grid;
  place-items: center;
  font-size: 30px;
  font-weight: 700;
}

h1 {
  margin-bottom: 5px;
}

p {
  color: #6b7f90;
}

form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 25px;
}

label {
  font-size: 13px;
  font-weight: 600;
}

input {
  border: 1px solid #cbd7e2;
  padding: 13px;
  border-radius: 9px;
}

.login-button {
  background: #266fac;
  color: white;
  border: 0;
  padding: 13px;
  border-radius: 9px;
  margin-top: 10px;
  font-weight: 600;
  cursor: pointer;
}

.login-button:hover {
  background: #19598f;
}

.error {
  color: #b42318;
}

.staff-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: white;
  border-bottom: 1px solid #dce5ed;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.staff-header button {
  background: #266fac;
  color: white;
  border: 0;
  border-radius: 8px;
  padding: 9px 14px;
  cursor: pointer;
}

.language-picker {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.language-picker select {
  font: inherit;
  color: inherit;
  background: white;
  border: 1px solid #cbd7e2;
  border-radius: 8px;
  padding: 6px;
}

@media (max-width: 600px) {
  .login-card {
    padding: 24px;
  }

  .staff-header {
    padding: 12px 16px;
  }
}
</style>

<style scoped>
/* Give the public landing page the full viewport while keeping the app layout. */
.mobile-shell:has(.clinic-landing) { max-width: none; }
.clinic-landing :deep(.login-layout),
.clinic-landing :deep(.login-screen) { min-height: 0; padding: 0; display: block; }
.clinic-landing :deep(.login-card) { max-width: none; padding: 0; border: 0; background: transparent; box-shadow: none; }
.clinic-landing :deep(.login-card .logo) { display: none; }
.clinic-landing :deep(.login-card h1) { font-size: 1.4rem; margin: 0 0 8px; }
.clinic-landing :deep(.login-card label) { font-size: .95rem; }
.clinic-landing :deep(.login-card input),
.clinic-landing :deep(.login-card select),
.clinic-landing :deep(.login-card button) { font-size: 1rem; min-height: 48px; }
.clinic-landing :deep(.login-card p) { color: #526779; }
.clinic-landing :deep(.login-card .error) { color: #a51e16; }
.clinic-landing :deep(.login-card :focus-visible) { outline: 3px solid #174e7c; outline-offset: 3px; }
</style>
