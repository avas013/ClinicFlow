<script setup>
import { computed, onMounted, ref } from 'vue'
import { t } from '../../language.js'
import { cloudConfigured, listClinicflowRoles, changeClinicflowRole } from '../../services/clinicSync.js'

const users = ref([])
const mainAdminId = ref(null)
const currentUserId = ref(null)
const desired = ref({})
const search = ref('')
const busyId = ref(null)
const loading = ref(false)
const error = ref('')
const success = ref('')

const isMainAdmin = computed(() => Boolean(currentUserId.value && currentUserId.value === mainAdminId.value))
const visibleUsers = computed(() => users.value
  .filter(user => `${user.full_name} ${user.role}`.toLowerCase().includes(search.value.trim().toLowerCase()))
  .sort((a,b) => (a.id === mainAdminId.value ? -1 : b.id === mainAdminId.value ? 1 :
    a.full_name.localeCompare(b.full_name))))
const roleLabels = {
  patient: 'Patient',
  doctor: 'Doctor',
  nurse: 'Nurse',
  frontdesk: 'Front Desk',
  admin: 'Administrator',
}
function eligible(user) {
  if (!cloudConfigured || !currentUserId.value ||
      user.id === currentUserId.value || user.id === mainAdminId.value) return false
  return isMainAdmin.value || ['patient','doctor','nurse'].includes(user.role)
}
function allowedRoles(user) {
  if (!eligible(user)) return []
  return isMainAdmin.value
    ? ['patient','doctor','nurse','frontdesk','admin']
    : ['patient','doctor','nurse']
}

async function reload() {
  loading.value = true
  error.value = ''
  try {
    const result = await listClinicflowRoles()
    users.value = result.users
    currentUserId.value = result.currentUserId
    mainAdminId.value = result.mainAdminId
    const next = {}
    for (const user of users.value) next[user.id] = user.role
    desired.value = next
  } catch (e) {
    error.value = e.message || String(e)
    users.value = []
    mainAdminId.value = null
    currentUserId.value = null
  } finally {
    loading.value = false
  }
}
onMounted(() => { if (cloudConfigured) void reload() })

async function save(user) {
  const role = desired.value[user.id]
  error.value = ''
  success.value = ''
  if (!eligible(user) || !allowedRoles(user).includes(role) || role === user.role) return
  const verb = role === 'admin' ? 'PROMOTE TO ADMIN' : user.role === 'admin' ? 'REMOVE ADMIN ACCESS' : 'CHANGE ROLE'
  if (!window.confirm(`${verb}: ${user.full_name}\n${user.role} → ${role}\n\nContinue?`)) return
  busyId.value = user.id
  try {
    await changeClinicflowRole(user.id, role)
    await reload()
    success.value = t('Role updated successfully.') + ' ' + t('You must sign out and sign back in to use your new permissions.')
  } catch (e) {
    desired.value = { ...desired.value, [user.id]: user.role }
    error.value = e.message || String(e)
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <section class="permission-panel" aria-labelledby="permission-title">
    <div class="permission-header">
      <div>
        <h2 id="permission-title">{{ t('Manage account permissions') }}</h2>
        <p>{{ t('Only the main administrator can promote or demote administrators.') }}</p>
        <p>{{ t('Other administrators can change patients to doctors or nurses, and demote clinicians to patients.') }}</p>
      </div>
      <button type="button" :disabled="loading || Boolean(busyId) || !cloudConfigured" @click="reload">{{ t('Refresh users') }}</button>
    </div>

    <p v-if="!cloudConfigured" class="notice">{{ t('Permission changes require a signed-in Supabase administrator account.') }}</p>
    <template v-else>
      <div class="permissions-controls">
        <strong>{{ isMainAdmin ? t('You are the main administrator.') : t('You are an administrator.') }}</strong>
        <label>
          <span class="sr-only">{{ t('Search accounts') }}</span>
          <input v-model="search" type="search" :placeholder="t('Search accounts')" />
        </label>
      </div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="success" class="success" role="status">{{ success }}</p>
      <p v-if="loading" class="notice" role="status">{{ t('Loading accounts…') }}</p>
      <div v-if="!loading" class="permissions-table-wrap">
        <table>
          <thead>
            <tr><th>{{ t('Staff member') }}</th><th>{{ t('Current role') }}</th><th>{{ t('New role') }}</th><th>{{ t('Actions') }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="user in visibleUsers" :key="user.id">
              <td>
                <strong>{{ user.full_name }}</strong>
                <small v-if="user.id === mainAdminId" class="main-label">{{ t('Main administrator') }}</small>
                <small v-else-if="user.id === currentUserId">{{ t('You') }}</small>
              </td>
              <td>{{ t(roleLabels[user.role] || user.role) }}</td>
              <td>
                <select v-if="eligible(user)" v-model="desired[user.id]"
                  :aria-label="t('New role') + ': ' + user.full_name"
                  :disabled="Boolean(busyId)">
                  <option v-for="role in allowedRoles(user)" :key="role" :value="role">{{ t(roleLabels[role]) }}</option>
                </select>
                <span v-else>{{ t('Protected') }}</span>
              </td>
              <td>
                <button type="button" class="role-button" :disabled="!eligible(user) || busyId !== null || desired[user.id] === user.role"
                  @click="save(user)">{{ t('Apply role') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!visibleUsers.length" class="notice">{{ t('No accounts found.') }}</p>
      </div>
      <p class="footnote">{{ t('You must sign out and sign back in to use your new permissions.') }}</p>
    </template>
  </section>
</template>

<style scoped>
.permission-panel{padding:24px;min-height:260px;background:#fff;border:1px solid #e1eaf2;border-radius:0 0 13px 13px;margin-bottom:20px}
.permission-header{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;flex-wrap:wrap;margin-bottom:20px}
.permission-header h2{font-size:19px;margin:0 0 9px}
.permission-header p{font-size:13px;color:#6b8094;margin:6px 0;line-height:1.55}
.permission-header button,.role-button{border-radius:8px;padding:10px 13px;background:#2874ac;color:#fff;border:1px solid #2874ac;font-weight:700;cursor:pointer}
.permission-header button:disabled,.role-button:disabled{opacity:.48;cursor:not-allowed}
.permissions-controls{display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:18px}
.permissions-controls strong{color:#275c86}
.permissions-controls input{min-width:230px;border:1px solid #cad9e6;border-radius:8px;padding:10px 12px}
.permissions-table-wrap{overflow-x:auto}
table{width:100%;min-width:700px;border-collapse:collapse;text-align:left}
th{background:#f5f8fb;color:#8291a0;font-size:11px;text-transform:uppercase;letter-spacing:.7px;padding:14px}
td{border-bottom:1px solid #ecf0f4;padding:14px;vertical-align:middle}
td strong,td small{display:block}
td small{font-size:11px;color:#617b8c;margin-top:4px}
td .main-label{font-weight:700;color:#176c9f}
td select{min-width:148px;max-width:100%;border:1px solid #cad9e6;border-radius:8px;padding:10px;background:white}
.notice,.footnote{color:#647c90;font-size:13px;line-height:1.5}
.error,.success{padding:12px;border-radius:9px;font-size:13px;margin:12px 0}
.error{background:#fff0ee;color:#923c35}.success{background:#e9f8ee;color:#17643e}
.sr-only{position:absolute;left:-10000px}
@media(max-width:750px){.permission-panel{padding:16px}.permissions-controls input{width:100%;min-width:0}}
</style>
