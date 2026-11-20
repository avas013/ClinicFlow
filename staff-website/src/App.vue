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
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
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
const accountMenuOpen = ref(false)
const accountHeader = ref(null)
const accountMenuButton = ref(null)
const headerText = (english, french) => language.value === 'fr' ? french : english
const roleLabel = computed(() => ({
  patient: headerText('Patient', 'Patient'),
  doctor: headerText('Doctor / Nurse', 'Médecin / Personnel infirmier'),
  frontdesk: headerText('Front Desk', 'Réception'),
  admin: headerText('Administrator', 'Administration'),
}[currentUser.value?.role] || 'ClinicFlow'))

function closeAccountMenu() {
  accountMenuOpen.value = false
}
async function escapeAccountMenu() {
  if (!accountMenuOpen.value) return
  closeAccountMenu()
  await nextTick()
  accountMenuButton.value?.focus()
}
function closeMenuOutside(event) {
  if (accountHeader.value && !accountHeader.value.contains(event.target)) closeAccountMenu()
}
function focusWorkspace(event) {
  event.preventDefault()
  closeAccountMenu()
  document.getElementById('website-workspace')?.focus()
  window.scrollTo({ top: 0, behavior: 'instant' })
}
onMounted(() => document.addEventListener('pointerdown', closeMenuOutside))
onUnmounted(() => document.removeEventListener('pointerdown', closeMenuOutside))


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
  closeAccountMenu()
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

  <div class="staff-shell">
    <ClinicLanding v-if="!currentUser">
      <template #signin>
        <div class="login-layout">
      <section class="login-card">

        <div class="logo">+</div>

        <h1>ClinicFlow</h1>
        <p>{{ t('ClinicFlow Website') }}</p>
        <p>{{ language === 'fr' ? 'Les patients, les médecins, le personnel infirmier, la réception et les administrateurs peuvent se connecter ici.' : 'Patients, doctors, nurses, front desk staff, and administrators can sign in here.' }}</p>

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
            {{ loading ? (language === 'fr' ? 'Connexion…' : 'Signing in…') : t('Sign in') }}
          </button>

        </form>
      </section>
    
        </div>
      </template>
    </ClinicLanding>

    <!-- LOGGED-IN WEBSITE -->
    <template v-else>

      <header ref="accountHeader" class="workspace-header" @keydown.esc.stop.prevent="escapeAccountMenu">
        <div class="workspace-header-inner">
          <strong class="workspace-brand">ClinicFlow</strong>
          <div class="workspace-header-right">
            <label class="header-language">
              <span>{{ t('Language') }}</span>
              <select v-model="language">
                <option value="en" lang="en">English</option>
                <option value="fr" lang="fr">Français</option>
              </select>
            </label>
            <span class="role-label">{{ roleLabel }}</span>
            <button ref="accountMenuButton" class="header-icon menu-toggle" type="button"
              :aria-label="headerText('Account menu', 'Menu du compte')"
              :aria-expanded="accountMenuOpen" aria-controls="account-navigation"
              @click="accountMenuOpen = !accountMenuOpen">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
          </div>
          <nav v-if="accountMenuOpen" id="account-navigation" class="account-menu"
            :aria-label="headerText('Account navigation', 'Navigation du compte')">
            <div class="menu-identity"><strong>{{ currentUser.name }}</strong><span>{{ currentUser.email }}</span></div>
            <a href="#website-workspace" @click="focusWorkspace">{{ headerText('Your workspace', 'Votre espace de travail') }}</a>
            <button type="button" @click="signOut">{{ t('Log out') }}</button>
          </nav>
        </div>
      </header>
      <SyncToolbar />
      <div id="website-workspace" tabindex="-1" class="website-workspace" :class="{ 'patient-workspace': currentUser.role === 'patient' }">

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
      </div>

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

<style scoped>
.workspace-header { position:sticky; top:0; z-index:1200; background:#fff; border-bottom:1px solid #d6e2ec; color:#20374e; }
.workspace-header-inner { position:relative; display:flex; align-items:center; gap:20px; min-height:80px; max-width:1440px; padding:12px 28px; margin:auto; }
.workspace-header-right { display:flex; align-items:center; gap:12px; }
.workspace-header-right { margin-left:auto; }
.workspace-brand { margin-left:0; text-align:left; font-size:1.25rem; letter-spacing:-.04em; }
.header-icon { display:grid; place-items:center; flex-shrink:0; width:44px; height:44px; padding:10px; border:1px solid #d6e2ec; border-radius:9px; background:#fff; color:#315b7d; cursor:pointer; }
.header-icon svg { width:22px; height:22px; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }
.placeholder-icon { color:#677c8f; background:#f6f9fc; cursor:default; }
.menu-toggle:hover,.account-menu a:hover,.account-menu button:hover { background:#eef5fb; }
.header-language { display:flex; align-items:center; gap:8px; font-size:.875rem; }
.header-language select { min-height:44px; padding:8px 12px; background:#fff; color:#20374e; border:1px solid #8ba6bc; border-radius:8px; font:inherit; }
.role-label { font-size:.95rem; font-weight:650; max-width:220px; line-height:1.35; }
.account-menu { position:absolute; top:calc(100% - 1px); right:28px; width:290px; max-width:calc(100vw - 28px); padding:8px; background:#fff; border:1px solid #c5d6e5; border-radius:12px; box-shadow:0 12px 32px #20374e20; }
.menu-identity { padding:12px; border-bottom:1px solid #e1eaf2; margin-bottom:6px; overflow-wrap:anywhere; }
.menu-identity strong,.menu-identity span { display:block; }
.menu-identity span { margin-top:5px; font-size:.875rem; color:#526779; }
.account-menu a,.account-menu button { display:flex; align-items:center; min-height:46px; width:100%; text-align:left; background:white; border:0; border-radius:6px; padding:10px 12px; font:inherit; color:#205e94; text-decoration:none; cursor:pointer; }
.workspace-header :focus-visible { outline:3px solid #174e7c; outline-offset:3px; }
.website-workspace:focus { outline:none; }
.patient-workspace :deep(.top-bar) { display:none; }
@media(max-width:750px) {
  .workspace-header-inner { gap:10px; padding:10px 14px; flex-wrap:wrap; }
  .workspace-brand { font-size:1.1rem; }

  .workspace-header-right { gap:10px; }
  .header-language>span { position:absolute; width:1px; height:1px; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; }
  .header-language select { max-width:112px; padding-inline:7px; }
  .role-label { max-width:130px; font-size:.875rem; }
  .account-menu { right:14px; }
}
@media(max-width:430px) {
  .workspace-header-inner { gap:8px; }
  .workspace-header-right { display:contents; }
  .header-language { margin-left:auto; }
  .role-label { order:5; flex-basis:100%; max-width:none; text-align:right; padding-right:3px; }
}
</style>



<style scoped>
.workspace-header-inner { max-width:none; width:100%; margin-inline:0; padding-left:16px; }
</style>
