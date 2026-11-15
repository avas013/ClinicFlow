
<script setup>
import SyncToolbar from './services/SyncToolbar.vue'
import { cloudConfigured, cloudLogin, cloudLogout, startClinicSync, stopClinicSync } from './services/clinicSync.js'
import PatientWebApp from './Apps/patient/PatientWebApp.vue'
import { ref } from 'vue'
import { language, t } from './language.js'
import FrontDeskApp from './Apps/front-desk/FrontDeskApp.vue'
import AdministratorApp from './Apps/administrator/AdministratorApp.vue'

// Temporary development accounts.
// Replace with Supabase Auth before real deployment.
const accounts = [
  { email: 'patient@clinicflow.demo', password: 'Demo1234!', role: 'patient', name: 'Jordan Taylor', platform: 'web' },
  {
    email: 'frontdesk@clinicflow.demo',
    password: 'Demo1234!',
    role: 'frontdesk'
  },
  {
    email: 'admin@clinicflow.demo',
    password: 'Demo1234!',
    role: 'admin'
  }
]

const email = ref('')
const password = ref('')
const error = ref('')
const currentUser = ref(null)

async function signIn() {
  if (cloudConfigured) {
    error.value = ''
    try {
      const signedIn = await cloudLogin(email.value, password.value)
      const role = signedIn.role === 'nurse' ? 'doctor' : signedIn.role
      if (platform.value === 'mobile' && !['patient', 'doctor'].includes(role)) {
        throw new Error('This account is for the ClinicFlow website.')
      }
      if (platform.value === 'web' && !['patient', 'frontdesk', 'admin'].includes(role)) {
        throw new Error('This account is for the mobile application.')
      }
      currentUser.value = { ...signedIn, role }
      password.value = ''
      await startClinicSync()
    } catch (e) {
      stopClinicSync()
      currentUser.value = null
      error.value = e.message || String(e)
    }
    return
  }

  const account = accounts.find(a =>
    a.email === email.value.trim().toLowerCase() &&
    a.password === password.value
  )

  if (!account) {
    error.value = 'Incorrect email or password.'
    return
  }

  currentUser.value = account
  error.value = ''
  password.value = ''
}

function signOut() {
  if (cloudConfigured) void cloudLogout()

  currentUser.value = null
  email.value = ''
  password.value = ''
  error.value = ''
}
</script>

<template>
  <SyncToolbar v-if="currentUser" />
  <div class="staff-shell">
    <main v-if="!currentUser" class="login-layout">
      <section class="login-card">
        <div class="logo">+</div>
        <h1>ClinicFlow</h1>
        <p>{{ t('ClinicFlow Website') }}</p>
        <label class="language-picker">
          <span>{{ t('Language') }}</span>
          <select v-model="language">
            <option value="en" lang="en">English</option>
            <option value="fr" lang="fr">Français</option>
          </select>
        </label>

        <form @submit.prevent="signIn">
          <label for="email">{{ t('Email address') }}</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="username"
            required
          />

          <label for="password">{{ t('Password') }}</label>
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

          <button class="login-button" type="submit">
            {{ t('Sign in') }}
          </button>
        </form>
      </section>
    </main>

    <template v-else>
      <header class="staff-header">
        <strong>+ ClinicFlow · {{ t('ClinicFlow Website') }}</strong>
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

      <PatientWebApp v-if="currentUser.role === 'patient'" />
      <FrontDeskApp v-else-if="currentUser.role === 'frontdesk'" />
      <AdministratorApp v-else-if="currentUser.role === 'admin'" />
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

button, input {
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
  gap: 12px;
}

.staff-header button {
  background: #266fac;
  color: white;
  border: 0;
  border-radius: 8px;
  padding: 9px 14px;
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

.staff-header {
  flex-wrap: wrap;
  gap: 10px;
}
</style>
