<script setup>
import { computed, ref } from 'vue'
import PatientApp from './Apps/patient/PatientApp.vue'
import DoctorNurseApp from './Apps/doctor-nurse/DoctorNurseApp.vue'
import FrontDeskApp from './Apps/front-desk/FrontDeskApp.vue'
import AdministratorApp from './Apps/administrator/AdministratorApp.vue'

// Local-only sample accounts; replace with Supabase Auth before deployment.
// Do not store real passwords or patient records in frontend source code.
const sampleAccounts = [
  { email: 'patient@clinicflow.demo', password: 'Demo1234!', role: 'patient', name: 'Jordan Taylor', platform: 'mobile' },
  { email: 'doctor@clinicflow.demo', password: 'Demo1234!', role: 'doctor', name: 'Dr. Smith', platform: 'mobile' },
  { email: 'nurse@clinicflow.demo', password: 'Demo1234!', role: 'doctor', name: 'Nurse Patel', platform: 'mobile' },
  { email: 'frontdesk@clinicflow.demo', password: 'Demo1234!', role: 'frontdesk', name: 'Front Desk Staff', platform: 'web' },
  { email: 'admin@clinicflow.demo', password: 'Demo1234!', role: 'admin', name: 'Administrator', platform: 'web' },
]

const platform = ref('') // '' = welcome, 'mobile' = phone app, 'web' = staff website
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const currentUser = ref(null)
const isMobile = computed(() => platform.value === 'mobile')
const title = computed(() => isMobile.value ? 'ClinicFlow Mobile' : 'ClinicFlow Staff Portal')

function pickPlatform(choice) {
  platform.value = choice
  email.value = ''
  password.value = ''
  error.value = ''
  currentUser.value = null
}

function signIn() {
  error.value = ''
  const account = sampleAccounts.find(a =>
    a.email === email.value.trim().toLowerCase() &&
    a.password === password.value &&
    a.platform === platform.value
  )
  if (!account) {
    error.value = 'Incorrect email or password for this portal.'
    return
  }
  currentUser.value = { name: account.name, email: account.email, role: account.role }
  password.value = ''
}

function signOut() {
  currentUser.value = null
  email.value = ''
  password.value = ''
  error.value = ''
}

function returnToWelcome() {
  signOut()
  platform.value = ''
}
</script>

<template>
  <div class="cf-shell" :class="{ 'cf-mobile-shell': isMobile && currentUser }">
    <main v-if="!platform" class="cf-landing">
      <div class="cf-symbol" aria-hidden="true">+</div>
      <p class="cf-eyebrow">CLINIC MANAGEMENT, SIMPLIFIED</p>
      <h1>Welcome to ClinicFlow</h1>
      <p class="cf-muted">Choose how you want to access ClinicFlow.</p>
      <div class="cf-choices">
        <button type="button" class="cf-choice" @click="pickPlatform('mobile')">
          <span class="cf-choice-icon" aria-hidden="true">▯</span>
          <strong>Mobile App</strong>
          <small>Patients and doctors / nurses</small>
        </button>
        <button type="button" class="cf-choice" @click="pickPlatform('web')">
          <span class="cf-choice-icon" aria-hidden="true">▤</span>
          <strong>Staff Website</strong>
          <small>Front desk and administrators</small>
        </button>
      </div>
      
    </main>

    <main v-else-if="!currentUser" class="cf-login-layout">
      <section class="cf-login-card" aria-labelledby="login-title">
        <button type="button" class="cf-back" @click="returnToWelcome">← Change platform</button>
        <div class="cf-symbol" aria-hidden="true">+</div>
        <p class="cf-eyebrow">{{ isMobile ? 'PATIENT & CARE TEAM' : 'CLINIC STAFF' }}</p>
        <h1 id="login-title">{{ title }}</h1>
        <p class="cf-muted">Sign in with your email and password.</p>

        <form class="cf-form" @submit.prevent="signIn">
          <label for="cf-email">Email address</label>
          <input id="cf-email" v-model="email" type="email" autocomplete="username" placeholder="name@example.com" required />
          <label for="cf-password">Password</label>
          <div class="cf-password-wrap">
            <input id="cf-password" v-model="password" :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password" placeholder="Enter password" required />
            <button type="button" @click="showPassword = !showPassword" :aria-label="showPassword ? 'Hide password' : 'Show password'">{{ showPassword ? 'Hide' : 'Show' }}</button>
          </div>
          <p v-if="error" class="cf-error" role="alert">{{ error }}</p>
          <button class="cf-submit" type="submit">Sign in</button>
        </form>


      </section>
    </main>

    <template v-else>
      <header class="cf-session-bar" :class="{ 'cf-session-mobile': isMobile }">
        <div class="cf-session-brand"><span class="cf-mini-symbol">+</span> ClinicFlow <span class="cf-session-kind">{{ isMobile ? 'Mobile' : 'Staff Portal' }}</span></div>
        <div class="cf-session-user"><span>{{ currentUser.name }}</span><button type="button" @click="signOut">Log out</button></div>
      </header>
      <div class="cf-app-host" :class="{ 'cf-phone-host': isMobile }">
        <PatientApp v-if="currentUser.role === 'patient'" />
        <DoctorNurseApp v-else-if="currentUser.role === 'doctor'" />
        <FrontDeskApp v-else-if="currentUser.role === 'frontdesk'" />
        <AdministratorApp v-else-if="currentUser.role === 'admin'" />
      </div>
    </template>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
:root{font-family:Inter,Arial,sans-serif;color:#182a3b;background:#f5f8fb}
*{box-sizing:border-box}
body{margin:0}
button,input{font:inherit}
button{cursor:pointer}
button:focus-visible,input:focus-visible{outline:3px solid #89bef0;outline-offset:2px}
.cf-shell{min-height:100dvh}
.cf-landing,.cf-login-layout{min-height:100dvh;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:28px 18px;text-align:center}
.cf-landing{max-width:790px;margin:0 auto}
.cf-symbol{display:grid;place-items:center;font-size:37px;font-weight:700;background:#266fac;color:white;width:58px;height:58px;border-radius:16px;margin:0 auto 19px}
.cf-eyebrow{margin:0 0 9px;letter-spacing:1.8px;font-size:11px;font-weight:800;color:#4e83aa}
.cf-landing h1,.cf-login-card h1{font-size:clamp(27px,5vw,38px);letter-spacing:-1.1px;margin:0 0 10px}
.cf-muted{color:#6a7f91;line-height:1.55;margin:0 0 24px}
.cf-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;width:100%;margin-top:7px}
.cf-choice{background:white;border:1px solid #dce5ed;border-radius:18px;padding:30px 14px;min-height:192px;box-shadow:0 9px 30px #1739560a;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;color:#203b54;transition:transform .15s,border-color .15s}
.cf-choice:hover{transform:translateY(-3px);border-color:#6ea6d2}
.cf-choice-icon{font-size:39px;color:#2676b7}.cf-choice strong{font-size:17px}.cf-choice small{font-size:12px;color:#728394;text-align:center}
.cf-demo-note{font-size:12px;color:#8996a4;margin-top:27px}
.cf-login-card{text-align:left;width:min(100%,440px);border:1px solid #dce6ee;background:white;border-radius:20px;padding:28px;box-shadow:0 16px 60px #193c5712}
.cf-login-card>.cf-symbol{margin:5px 0 19px}
.cf-back{color:#477999;background:transparent;border:0;padding:0 0 21px;font-size:13px}
.cf-login-card h1{font-size:28px}.cf-login-card .cf-muted{font-size:14px}
.cf-form{display:flex;flex-direction:column;gap:9px}.cf-form label{font-size:13px;font-weight:650;margin-top:6px}
.cf-form input{width:100%;height:46px;border-radius:10px;border:1px solid #cbd8e3;padding:0 13px;background:#fff;color:#172b3c}
.cf-password-wrap{position:relative}.cf-password-wrap input{padding-right:68px}.cf-password-wrap button{position:absolute;right:8px;top:7px;height:32px;border:0;background:#eef4f9;border-radius:7px;padding:0 10px;font-size:12px;color:#38698e}
.cf-submit{background:#266fac;color:#fff;border:0;border-radius:10px;padding:13px 18px;font-weight:700;margin-top:13px}.cf-submit:hover{background:#1d5d93}
.cf-error{background:#fff0f0;border:1px solid #ffd4d4;border-radius:8px;color:#a43636;font-size:12px;padding:10px}
.cf-hints{border-top:1px solid #e7edf2;margin-top:23px;padding-top:19px}.cf-hints>strong{font-size:13px}.cf-hints p{font-size:12px;color:#687e8d;line-height:1.6}.cf-hint{display:flex;justify-content:space-between;gap:8px;width:100%;align-items:center;background:#f3f7fa;border:1px solid #e3ebf0;border-radius:8px;padding:10px;margin-top:7px;color:#2c4a60;text-align:left;font-size:12px}.cf-hint:hover{border-color:#73a8ce}.cf-hint small{color:#6383a0;font-size:11px;word-break:break-all}
.cf-session-bar{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 25px;background:white;border-bottom:1px solid #dce5ed;min-height:62px}
.cf-session-brand{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:800}.cf-mini-symbol{display:grid;place-items:center;background:#266fac;color:white;border-radius:8px;width:27px;height:27px;font-size:21px}.cf-session-kind{font-size:10px;letter-spacing:1px;color:#8a9aaa;text-transform:uppercase;margin-left:4px}
.cf-session-user{display:flex;align-items:center;gap:12px;font-size:12px;color:#526f86}.cf-session-user button{border:1px solid #cfdde9;background:#f6f9fc;color:#286b9d;border-radius:8px;padding:8px 11px;font-weight:700}
.cf-app-host{min-height:calc(100dvh - 62px)}.cf-phone-host{max-width:480px;margin:auto;background:white;min-height:calc(100dvh - 62px);box-shadow:0 10px 40px #193c5710}
.cf-session-mobile{max-width:480px;margin:0 auto}
@media(max-width:540px){.cf-choices{grid-template-columns:1fr}.cf-choice{min-height:140px;padding:20px}.cf-login-card{padding:22px 17px;border-radius:14px}.cf-session-bar{padding:10px 12px}.cf-session-kind,.cf-session-user span{display:none}.cf-hint{flex-direction:column;align-items:flex-start;gap:3px}}
</style>
