<!-- src/pages/HistoryPage.vue -->
<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-8">
        <q-card class="q-pa-md">
          <div class="row items-center justify-between">
            <div class="text-h6">Lịch sử mực nước</div>
            <div>
              <q-btn dense flat round icon="refresh" @click="loadAll" title="Làm mới" />
            </div>
          </div>

          <div class="row q-mt-md items-center">
            <q-input dense v-model="filterFrom" type="date" label="Từ ngày (YYYY-MM-DD)" />
            <q-input
              dense
              v-model="filterTo"
              type="date"
              label="Đến ngày (YYYY-MM-DD)"
              class="q-ml-sm"
            />
            <q-btn color="primary" class="q-ml-sm" label="Áp dụng" @click="applyDateFilter" />
            <q-btn flat class="q-ml-sm" label="Xóa filter" @click="clearDateFilter" />
          </div>

          <div class="q-mt-md" style="min-height: 300px">
            <div v-if="loading" class="row items-center justify-center" style="min-height: 300px">
              <q-spinner-dots color="primary" size="40px" />
            </div>

            <!-- nếu không có data sau filter -->
            <div
              v-else-if="noChartData"
              class="row items-center justify-center"
              style="min-height: 300px"
            >
              <q-icon name="warning" color="warning" size="32px" class="q-mr-sm" />
              <div class="text-subtitle1">Không có dữ liệu trong khoảng thời gian đã chọn</div>
            </div>

            <!-- canvas chart -->
            <canvas
              v-else
              ref="historyCanvas"
              width="900"
              height="320"
              style="max-width: 100%; display: block"
            ></canvas>
          </div>
        </q-card>

        <q-card class="q-pa-md q-mt-md">
          <div class="text-subtitle1">Danh sách bản ghi</div>
          <q-table
            :rows="filteredRows"
            :columns="columns"
            row-key="id"
            flat
            dense
            :pagination="pagination"
          >
            <template v-slot:body-cell-level="props">
              <q-td :props="props">{{ formatLevel(props.row.level) }} cm</q-td>
            </template>
            <template v-slot:body-cell-timestamp="props">
              <q-td :props="props">{{ formatTime(props.row.timestamp) }}</q-td>
            </template>
          </q-table>
        </q-card>
      </div>

      <div class="col-12 col-md-4">
        <q-card class="q-pa-md">
          <div class="text-h6">Bộ lọc & Thống kê</div>

          <q-separator class="q-mt-sm q-mb-sm" />

          <div class="row items-center justify-between">
            <div>
              <div class="text-caption">Tổng bản ghi</div>
              <div class="text-h6">{{ rowsCount }}</div>
            </div>
            <div>
              <div class="text-caption">Số bản ghi ở mức NGUY HIỂM (&gt; {{ TH_DANGER }} cm)</div>
              <div class="text-h6">{{ dangerCount }}</div>
            </div>
          </div>

          <q-separator class="q-mt-md q-mb-md" />

          <div class="q-mt-sm">
            <div class="text-caption">Đi đến bản ghi (id từ query)</div>
            <div class="row q-mt-sm">
              <q-input dense v-model="gotoId" label="ID" type="number" />
              <q-btn class="q-ml-sm" dense color="primary" label="Tìm" @click="gotoRecord" />
            </div>
          </div>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { Notify } from 'quasar'
import { Chart, registerables } from 'chart.js'
import * as waterService from 'src/services/waterService'

Chart.register(...registerables)
const levels = ref([])
const loading = ref(false)
const historyCanvas = ref(null)
let chartInstance = null
const noChartData = ref(false)

// thresholds must be same as other pages (adjust if needed)
const TH_DANGER = 80 // cm

const filterFrom = ref('')
const filterTo = ref('')
const pagination = ref({ page: 1, rowsPerPage: 10 })

const columns = [
  { name: 'id', label: 'ID', field: 'id', sortable: true },
  { name: 'level', label: 'Mực nước (cm)', field: 'level', sortable: true },
  { name: 'timestamp', label: 'Thời gian', field: 'timestamp', sortable: true },
]

function formatLevel(v) {
  return v == null ? '--' : Number(v).toFixed(0)
}

function formatTime(ts) {
  if (!ts) return '--'
  return new Date(ts).toLocaleString()
}

const rowsCount = computed(() => levels.value.length)
const dangerCount = computed(() => levels.value.filter((l) => Number(l.level) > TH_DANGER).length)

// chuyển "2025-11-4" hoặc "2025-11-04" thành Date(2025, 10, 4)
function parseDateSafeYMD(s) {
  if (!s) return null
  const parts = String(s).trim().split('-')
  if (parts.length < 3) return null

  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  const d = parseInt(parts[2], 10)

  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null

  return new Date(y, m - 1, d, 0, 0, 0)
}

// dùng để lọc đến cuối ngày
function parseDateSafeYMDEnd(s) {
  const d = parseDateSafeYMD(s)
  if (!d) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

// filtered rows by date
const filteredRows = computed(() => {
  let arr = levels.value.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  const fFrom = parseDateSafeYMD(filterFrom.value)
  const fTo = parseDateSafeYMDEnd(filterTo.value)

  if (fFrom) {
    arr = arr.filter((r) => {
      const t = new Date(r.timestamp)
      return t >= fFrom
    })
  }

  if (fTo) {
    arr = arr.filter((r) => {
      const t = new Date(r.timestamp)
      return t <= fTo
    })
  }

  return arr
})

import { ref, onMounted, computed, nextTick } from 'vue' // thêm nextTick vào import

// ... phần khác của file ...

async function loadAll() {
  loading.value = true
  try {
    const res = await waterService.getAllLevels()
    levels.value = Array.isArray(res) ? res : res || []
  } catch (err) {
    console.error('loadAll error', err)
    Notify.create({ type: 'negative', message: 'Không tải được dữ liệu lịch sử' })
    levels.value = [] // đảm bảo có giá trị an toàn
  } finally {
    // đảm bảo loading chuyển về false trước khi vẽ chart
    loading.value = false

    // chờ DOM cập nhật (canvas hiện) rồi vẽ chart
    await nextTick()
    renderChart()
  }
}

function renderChart() {
  // destroy previous chart safely
  if (chartInstance) {
    try {
      chartInstance.destroy()
    } catch (err) {
      void err
    }
    chartInstance = null
  }

  // source = filteredRows (so default is full dataset when no filter)
  const source = (Array.isArray(filteredRows.value) ? filteredRows.value : [])
    .slice()
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  if (!source || source.length === 0) {
    noChartData.value = true
    return
  } else {
    noChartData.value = false
  }

  // ensure canvas element exists
  const ctxEl = historyCanvas.value
  if (!ctxEl) return

  const labels = source.map((r) => new Date(r.timestamp).toLocaleString())
  const data = source.map((r) => Number(r.level))

  // small debounce for resize
  if (typeof Chart !== 'undefined' && Chart.defaults) Chart.defaults.resizeDelay = 200

  const ctx = ctxEl.getContext('2d')
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Mực nước (cm)',
          data,
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 200,
      scales: { x: { ticks: { maxRotation: 45 } } },
      plugins: { legend: { display: false } },
    },
  })
}

function applyDateFilter() {
  // filteredRows là computed, nhưng ta cần vẽ lại biểu đồ theo filter mới
  renderChart()
}

function clearDateFilter() {
  filterFrom.value = ''
  filterTo.value = ''
  // vẽ lại biểu đồ cho toàn bộ dữ liệu
  renderChart()
}

function gotoRecord() {
  const id = Number(gotoId.value)
  if (!id) return
  const found = levels.value.find((r) => r.id === id)
  if (!found) {
    Notify.create({ type: 'warning', message: 'Không tìm thấy bản ghi id=' + id })
    return
  }
  // scroll or highlight — here we just show popup notify
  Notify.create({ type: 'positive', message: `Found id=${id} level=${formatLevel(found.level)} m` })
}

const gotoId = ref('')

onMounted(() => {
  loadAll()
})
</script>

<style scoped>
/* nếu cần CSS bổ sung */
</style>
