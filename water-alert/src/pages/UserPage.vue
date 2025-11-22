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

          <div class="q-mt-md">
            <div class="text-subtitle2">Mực nước hiện tại</div>
            <div class="row items-center q-mt-sm">
              <div class="text-h4 q-mr-md">{{ latestLevelDisplay }}</div>
              <q-chip
                :text="statusText"
                :color="statusColor"
                text-color="white"
                square
              />
            </div>

            <div class="text-caption text-grey-6 q-mt-sm">Cập nhật: {{ latestTimeDisplay }}</div>
          </div>

          <q-separator class="q-mt-md" />

          <div class="q-gutter-md q-mt-md">
            <q-btn to="/map" label="Xem bản đồ" color="primary" unelevated class="full-width" />
            <q-btn to="/history" label="Lịch sử mực nước" color="secondary" outline class="full-width q-mt-sm" />
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

          <div class="q-mt-md" style="min-height: 240px;">
            <div v-if="loading" class="row items-center justify-center" style="min-height:240px">
              <q-spinner-dots color="primary" size="40px" />
            </div>

            <canvas v-show="!loading" ref="lineCanvas" width="800" height="280" style="max-width:100%;"></canvas>
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
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from 'stores/auth'
import { Notify } from 'quasar'
import { Chart, registerables } from 'chart.js'
import * as waterService from 'src/services/waterService'

Chart.register(...registerables)

const auth = useAuthStore()

const levels = ref([])
const loading = ref(false)
const lineCanvas = ref(null)
let chartInstance = null

// Thresholds - bạn có thể chỉnh ở đây nếu muốn
const THRESHOLD_WARNING = 1.0
const THRESHOLD_DANGER = 2.0

const latest = computed(() => {
  if (!levels.value || levels.value.length === 0) return null
  // find max timestamp
  return levels.value.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
})

const latestLevelDisplay = computed(() => {
  if (!latest.value) return '--'
  return formatLevel(latest.value.level) + ' m'
})

const latestTimeDisplay = computed(() => {
  if (!latest.value) return '--'
  return formatTime(latest.value.timestamp)
})

const statusInfo = computed(() => {
  if (!latest.value) return { text: 'Không có dữ liệu', color: 'grey' }
  const lv = Number(latest.value.level)
  if (lv > THRESHOLD_DANGER) return { text: 'NGUY HIỂM', color: 'negative' }
  if (lv > THRESHOLD_WARNING) return { text: 'CẢNH BÁO', color: 'warning' }
  return { text: 'BÌNH THƯỜNG', color: 'positive' }
})
const statusText = computed(() => statusInfo.value.text)
const statusColor = computed(() => statusInfo.value.color)

const dangerCount = computed(() => levels.value.filter(l => Number(l.level) > THRESHOLD_DANGER).length)

// recent table data
const recentRows = computed(() => {
  // sort desc by timestamp
  return levels.value.slice().sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10)
})
const recentColumns = [
  { name: 'id', label: 'ID', field: 'id' },
  { name: 'level', label: 'Mực nước (m)', field: 'level' },
  { name: 'timestamp', label: 'Thời gian', field: 'timestamp' }
]

const displayName = computed(() => auth.phone || 'Người dùng')

function formatLevel(v) {
  if (v === null || v === undefined) return '--'
  return Number(v).toFixed(2)
}

function formatTime(ts) {
  if (!ts) return '--'
  const d = new Date(ts)
  return d.toLocaleString()
}

async function loadLevels() {
  loading.value = true
  try {
    const res = await waterService.getAllLevels()
    // ensure array
    levels.value = Array.isArray(res) ? res : (res || [])
    renderChart()
  } catch (err) {
    console.error('loadLevels error', err)
    Notify.create({ type: 'negative', message: 'Không tải được dữ liệu mực nước' })
  } finally {
    loading.value = false
  }
}

function renderChart() {
  // destroy previous
  if (chartInstance) {
  try { chartInstance.destroy() } catch (err) { void err; }
  chartInstance = null
}

  const ctx = lineCanvas.value
  if (!ctx) return
  // prepare last 7 points sorted ascending
  const sorted = levels.value.slice().sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp))
  const last7 = sorted.slice(Math.max(0, sorted.length - 7))
  const labels = last7.map(r => new Date(r.timestamp).toLocaleString())
  const data = last7.map(r => Number(r.level))
  chartInstance = new Chart(ctx.getContext('2d'), {
  type: 'line',
  data: {
    labels,
    datasets: [{
      label: 'Mực nước (m)',
      data,
      fill: true,
      tension: 0.3,
      borderWidth: 2,
      pointRadius: 3,
    }]
  },
  options: {
    responsive: true,
    // dùng true để Chart tôn trọng thuộc tính height của canvas
    maintainAspectRatio: true,
    // tránh resize quá nhanh (Chart.js v3+ hỗ trợ resizeDelay)
    resizeDelay: 200,
    scales: {
      x: { ticks: { maxRotation: 45, minRotation: 0 } },
    }
  }
})

}

onMounted(() => {
  loadLevels()
})
</script>

<style scoped>
/* small tweaks */
.full-width { width: 100%; }
</style>
