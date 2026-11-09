
<script setup>
import { ref } from 'vue'
import PatientApp from './Apps/patient/PatientApp.vue'
import DoctorNurseApp from './Apps/doctor-nurse/DoctorNurseApp.vue'

// Temporary development accounts.
// Replace with Supabase Auth before real deployment.
const accounts = [
  {
    email: 'patient@clinicflow.demo',
    password: 'Demo1234!',
    name: 'Jordan Taylor',
    role: 'patient'
  },
  {
    email: 'doctor@clinicflow.demo',
    password: 'Demo1234!',
    name: 'Dr. Smith',
    role: 'doctor'
  },
  {
    email: 'nurse@clinicflow.demo',
    password: 'Demo1234!',
    name: 'Nurse Patel',
    role: 'doctor'
  }
]

const email = ref('')
const password = ref('')
const error = ref('')
const currentUser = ref(null)

function signIn() {
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
  currentUser.value = null
  email.value = ''
  password.value = ''
  error.value = ''
}
</script>

<template>
  <div class="mobile-shell">
    <main v-if="!currentUser" class="login-screen">
      <div class="login-card">
        <div class="logo">+</div>
        <h1>ClinicFlow</h1>
        <p>Patient and Care Team</p>

        <form @submit.prevent="signIn">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="username"
            required
          />

          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
          />

          <p v-if="error" class="error" role="alert">
            {{ error }}
          </p>

          <button class="login-button" type="submit">
            Sign in
          </button>
        </form>
      </div>
    </main>

    <template v-else>
      <header class="app-header">
        <strong>ClinicFlow</strong>
        <button type="button" @click="signOut">
          Log out
        </button>
      </header>

      <PatientApp v-if="currentUser.role === 'patient'" />
      <DoctorNurseApp v-else-if="currentUser.role === 'doctor'" />
    </template>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:global(body) {
  margin: 0;
  background: #f4f7fa;
  font-family: Inter, Arial, sans-serif;
}

* {
  box-sizing: border-box;
}

button, input {
  font: inherit;
}

.mobile-shell {
  max-width: 480px;
  min-height: 100dvh;
  margin: 0 auto;
  background: white;
  color: #1c2e40;
}

.login-screen {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.login-card {
  width: 100%;
}

.logo {
  background: #266fac;
  color: white;
  font-size: 32px;
  font-weight: 700;
  border-radius: 14px;
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  margin-bottom: 24px;
}

h1 {
  margin: 0 0 8px;
  font-size: 30px;
}

p {
  color: #687b8e;
}

form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 28px;
}

label {
  font-size: 13px;
  font-weight: 600;
}

input {
  width: 100%;
  padding: 13px;
  border: 1px solid #cbd7e2;
  border-radius: 9px;
}

.login-button {
  background: #266fac;
  border: 0;
  color: white;
  border-radius: 9px;
  padding: 13px;
  font-weight: 600;
  margin-top: 12px;
}

.error {
  color: #b42318;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: white;
  border-bottom: 1px solid #e1e6ec;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-header button {
  background: #266fac;
  color: white;
  border: 0;
  border-radius: 8px;
  padding: 9px 13px;
}
</style>
