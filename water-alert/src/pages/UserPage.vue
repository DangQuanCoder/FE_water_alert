<!-- src/pages/UserPage.vue -->
<template>
  <q-page class="q-pa-md">
    <div class="row items-start q-col-gutter-md">
      <!-- Left column: user card + quick stats -->
      <div class="col-12 col-md-4">
        <q-card class="q-pa-md">
          <div class="row items-center q-mb-md">
            <q-avatar size="56px" class="q-mr-md" rounded>
              <q-icon name="person" />
            </q-avatar>
            <div>
              <div class="text-h6">{{ displayName }}</div>
              <div class="text-caption text-grey-6">{{ auth.phone }} • {{ auth.role }}</div>
            </div>
          </div>

          <q-separator />

          <div class="row q-mt-sm">
            <q-btn dense color="primary" label="Chỉnh sửa hồ sơ" @click="openEditProfile" />
          </div>

          <div class="q-mt-md">
            <div class="text-subtitle2">Mực nước hiện tại</div>
            <div class="row items-center q-mt-sm">
              <div class="text-h4 q-mr-md">{{ latestLevelDisplay }}</div>
              <q-chip :text="statusText" :color="statusColor" text-color="white" square />
            </div>

            <div class="text-caption text-grey-6 q-mt-sm">Cập nhật: {{ latestTimeDisplay }}</div>
          </div>

          <q-separator class="q-mt-md" />

          <div class="q-gutter-md q-mt-md">
            <q-btn to="/map" label="Xem bản đồ" color="primary" unelevated class="full-width" />
            <q-btn
              to="/history"
              label="Lịch sử mực nước"
              color="secondary"
              outline
              class="full-width q-mt-sm"
            />
          </div>
        </q-card>

        <!-- Quick stats -->
        <q-card class="q-pa-md q-mt-md">
          <div class="row items-center justify-between">
            <div>
              <div class="text-caption">Bản ghi</div>
              <div class="text-h6">{{ levels.length }}</div>
            </div>
            <div>
              <div class="text-caption">Cảnh báo (> ngưỡng)</div>
              <div class="text-h6">{{ dangerCount }}</div>
            </div>
          </div>
        </q-card>
      </div>

      <!-- Right column: chart + latest table -->
      <div class="col-12 col-md-8">
        <q-card class="q-pa-md">
          <div class="row items-center justify-between">
            <div class="text-h6">Xu hướng mực nước</div>
            <div class="text-caption text-grey-6">Dữ liệu từ server</div>
          </div>

          <div class="q-mt-md" style="min-height: 240px">
            <div v-if="loading" class="row items-center justify-center" style="min-height: 240px">
              <q-spinner-dots color="primary" size="40px" />
            </div>

            <canvas
              v-show="!loading"
              ref="lineCanvas"
              width="800"
              height="280"
              style="max-width: 100%"
            ></canvas>
          </div>

          <q-separator class="q-mt-md" />

          <div class="q-mt-md">
            <div class="text-subtitle1 q-mb-sm">Bản ghi gần nhất</div>
            <q-table
              :rows="recentRows"
              :columns="recentColumns"
              row-key="id"
              flat
              dense
              :virtual-scroll="false"
            >
              <template v-slot:body-cell-level="props">
                <q-td :props="props">
                  {{ formatLevel(props.row.level) }}
                </q-td>
              </template>
              <template v-slot:body-cell-timestamp="props">
                <q-td :props="props">
                  {{ formatTime(props.row.timestamp) }}
                </q-td>
              </template>
            </q-table>
          </div>
        </q-card>
      </div>
    </div>

    <!-- Edit Profile Dialog -->
    <q-dialog v-model="profileDialog">
      <q-card style="min-width: 420px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">Chỉnh sửa hồ sơ</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit.prevent="saveProfile" class="q-gutter-md">
            <q-input
              v-model="profile.username"
              label="Tên đăng nhập (Username)"
              readonly
              filled
              hint="Không thể thay đổi tên đăng nhập"
            />
            <q-input v-model="profile.fullName" label="Họ và tên" />
            <q-input v-model="profile.email" type="email" label="Email" />
            <q-input v-model="profile.phone" label="Số điện thoại" />
            <div class="row justify-end q-mt-md">
              <q-btn flat label="Hủy" v-close-popup @click="cancelEditProfile" />
              <q-btn color="primary" label="Lưu" type="submit" :loading="profileSaving" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed, reactive } from 'vue'
import { useAuthStore } from 'stores/auth'
import { useUsersStore } from 'stores/users'
import { Notify } from 'quasar'
import { Chart, registerables } from 'chart.js'
import * as waterService from 'src/services/waterService'
import * as userService from 'src/services/userService' // NEW

Chart.register(...registerables)

const auth = useAuthStore()
const usersStore = useUsersStore()

const levels = ref([])
const loading = ref(false)
const lineCanvas = ref(null)
let chartInstance = null

// profile dialog state
const profileDialog = ref(false)
const profileSaving = ref(false)
const profile = reactive({
  id: null,
  username: '',
  fullName: '',
  email: '',
  phone: '',
})

// Thresholds
const THRESHOLD_WARNING = 40 // cm
const THRESHOLD_DANGER = 80 // cm

/* --- chart stuff (unchanged) --- */
const latest = computed(() => {
  if (!levels.value || levels.value.length === 0) return null
  return levels.value.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
})
const latestLevelDisplay = computed(() => (!latest.value ? '--' : `${formatLevel(latest.value.level)} cm`))
const latestTimeDisplay = computed(() => (!latest.value ? '--' : formatTime(latest.value.timestamp)))

const statusInfo = computed(() => {
  if (!latest.value) return { text: 'Không có dữ liệu', color: 'grey' }
  const lv = Number(latest.value.level)
  if (lv > THRESHOLD_DANGER) return { text: 'NGUY HIỂM', color: 'negative' }
  if (lv > THRESHOLD_WARNING) return { text: 'CẢNH BÁO', color: 'warning' }
  return { text: 'BÌNH THƯỜNG', color: 'positive' }
})
const statusText = computed(() => statusInfo.value.text)
const statusColor = computed(() => statusInfo.value.color)
const dangerCount = computed(() => levels.value.filter((l) => Number(l.level) > THRESHOLD_DANGER).length)
const recentRows = computed(() => levels.value.slice().sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0,10))
const recentColumns = [
  { name: 'id', label: 'ID', field: 'id' },
  { name: 'level', label: 'Mực nước (cm)', field: 'level' },
  { name: 'timestamp', label: 'Thời gian', field: 'timestamp' },
]
const displayName = computed(() => profile.fullName || profile.username || auth.phone || 'Người dùng')

function formatLevel(v) { if (v === null || v === undefined) return '--'; return Number(v).toFixed(0) }
function formatTime(ts) { if (!ts) return '--'; const d = new Date(ts); return d.toLocaleString() }

async function loadLevels() {
  loading.value = true
  try {
    const res = await waterService.getAllLevels()
    levels.value = Array.isArray(res) ? res : res || []
    renderChart()
  } catch (err) {
    console.error('loadLevels error', err)
    Notify.create({ type: 'negative', message: 'Không tải được dữ liệu mực nước' })
  } finally {
    loading.value = false
  }
}

function renderChart() {
  if (chartInstance) {
    try { chartInstance.destroy() } catch { /*ignore*/ }
    chartInstance = null
  }
  const ctx = lineCanvas.value
  if (!ctx) return
  const sorted = levels.value.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  const last7 = sorted.slice(Math.max(0, sorted.length - 7))
  const labels = last7.map((r) => new Date(r.timestamp).toLocaleString())
  const data = last7.map((r) => Number(r.level))
  chartInstance = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Mực nước (cm)', data, fill: true, tension: 0.3, borderWidth: 2, pointRadius: 3 }] },
    options: { responsive: true, maintainAspectRatio: true, resizeDelay: 200, scales: { x: { ticks: { maxRotation: 45, minRotation: 0 } } } }
  })
}

/* --- Profile editing logic --- */
async function openEditProfile() {
  profileSaving.value = false
  profile.id = null
  profile.username = ''
  profile.fullName = ''
  profile.email = ''
  profile.phone = auth.phone || ''

  const server = await userService.getMe()

  if (server) {
    profile.id = server.id
    profile.username = server.username || ''
    profile.fullName = server.fullName ?? server.name ?? ''
    profile.email = server.email ?? ''
    profile.phone = server.phone ?? auth.phone
  } else {
    const found = usersStore.users.find(u => String(u.phone) === String(auth.phone))
    if (found) {
      profile.id = found.id
      profile.username = found.username || ''
      profile.fullName = found.fullName ?? found.name ?? ''
      profile.email = found.email ?? ''
      profile.phone = found.phone ?? profile.phone
    }
  }

  profileDialog.value = true
}


function cancelEditProfile() {
  profileDialog.value = false
}

/**
 * Save profile:
 *  - call PUT /api/users/me via userService.updateMe
 *  - if success update auth store and (if using mock users store) update that as well
 */
async function saveProfile() {
  // Validate sơ bộ ở Frontend
  if (!profile.fullName || !profile.fullName.trim()) {
    Notify.create({ type: 'warning', message: 'Họ và tên không được để trống' })
    return
  }
  if (!profile.phone || !profile.phone.trim()) {
    Notify.create({ type: 'warning', message: 'Số điện thoại không được để trống' })
    return
  }
  // Nếu username bị rỗng (do lỗi data cũ), hãy báo lỗi hoặc tự sinh
  if (!profile.username) {
     // Trường hợp hiếm: User cũ chưa có username, ta có thể tạm lấy số điện thoại làm username
     profile.username = profile.phone
  }

  profileSaving.value = true
  try {
    // QUAN TRỌNG: Backend yêu cầu phải có đủ username, fullName, phone (không được null)
    const payload = {
      username: profile.username, // Gửi lại chính username cũ
      fullName: profile.fullName,
      phone: profile.phone,
      email: profile.email || null // Email có thể null
    }

    const updated = await userService.updateMe(payload)

    if (updated) {
      // Cập nhật lại Store Auth
      try {
        const newPhone = updated.phone ?? auth.phone
        const newRole = updated.role ?? auth.role
        const currentToken = auth.token
        auth.setAuth({ token: currentToken, role: newRole, phone: newPhone })
      } catch { /* ignore */ }

      // Cập nhật lại Store Users (nếu dùng)
      try {
        // Cập nhật lại cả biến profile để hiển thị ngay lập tức
        profile.fullName = updated.fullName
        profile.email = updated.email

        if (updated.id || profile.id) {
          usersStore.updateUser(updated.id || profile.id, {
            fullName: updated.fullName,
            email: updated.email,
            phone: updated.phone,
            username: updated.username
          })
        }
      } catch { /* ignore */ }


      Notify.create({ type: 'positive', message: 'Cập nhật hồ sơ thành công' })
      profileDialog.value = false
    }
  } catch (err) {
    console.error('saveProfile error', err)
    const msg = err?.response?.data?.message || err?.message || 'Lỗi khi cập nhật hồ sơ'
    Notify.create({ type: 'negative', message: msg })
  } finally {
    profileSaving.value = false
  }
}
onMounted(() => {
  loadLevels()
})
</script>

<style scoped>
.full-width { width: 100%; }
</style>
