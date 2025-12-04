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

            <div
              v-else-if="noChartData"
              class="row items-center justify-center"
              style="min-height: 300px"
            >
              <q-icon name="warning" color="warning" size="32px" class="q-mr-sm" />
              <div class="text-subtitle1">Không có dữ liệu trong khoảng thời gian đã chọn</div>
            </div>

            <canvas
              v-else
              ref="historyCanvas"
              width="900"
              height="320"
              style="max-width: 100%; display: block; width:100%; height:320px"
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
import { ref, onMounted, computed, nextTick } from 'vue'

/* state */
const levels = ref([])
const loading = ref(false)
const historyCanvas = ref(null)
let chartInstance = null
const noChartData = ref(false)

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

/* parse Y-M-D safely */
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
function parseDateSafeYMDEnd(s) {
  const d = parseDateSafeYMD(s)
  if (!d) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

/* filtered rows by date */
const filteredRows = computed(() => {
  let arr = Array.isArray(levels.value) ? levels.value.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) : []

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

/* load data */
async function loadAll() {
  loading.value = true
  try {
    const res = await waterService.getAllLevels()
    levels.value = Array.isArray(res) ? res : res || []
  } catch (err) {
    console.error('loadAll error', err)
    Notify.create({ type: 'negative', message: 'Không tải được dữ liệu lịch sử' })
    levels.value = []
  } finally {
    loading.value = false
    await nextTick()
    renderChart()
  }
}

/* ---------- AGGREGATION: group by hour on client ---------- */
/**
 * group an array of records { timestamp, level } into hours,
 * return array sorted ascending: [{ hourISO, avg, min, max, count }]
 */
function aggregateHourly(records) {
  // use a Map keyed by 'YYYY-MM-DDTHH' (hour)
  const m = new Map()
  for (const r of records) {
    if (!r || r.timestamp == null) continue
    const d = new Date(r.timestamp)
    if (isNaN(d.getTime())) continue
    // build key: e.g. '2025-11-27T13' (hour precision)
    const key = d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                String(d.getDate()).padStart(2, '0') + 'T' +
                String(d.getHours()).padStart(2, '0')
    if (!m.has(key)) m.set(key, [])
    const lv = Number(r.level)
    if (!Number.isFinite(lv)) continue
    m.get(key).push(lv)
  }

  const out = []
  for (const [k, arr] of m.entries()) {
    const sum = arr.reduce((s, x) => s + x, 0)
    const avg = sum / arr.length
    const min = Math.min(...arr)
    const max = Math.max(...arr)
    // convert 'k' to a full ISO-like string at hour start
    // e.g. '2025-11-27T13' -> '2025-11-27T13:00:00'
    const hourISO = k + ':00:00'
    out.push({ hourISO, avg, min, max, count: arr.length })
  }

  // sort ascending by hour
  out.sort((a, b) => new Date(a.hourISO) - new Date(b.hourISO))
  return out
}

/* ---------- RENDER CHART ---------- */
function renderChart() {
  // destroy previous chart safely
  if (chartInstance) {
    try { chartInstance.destroy() } catch { /*ignore*/ }
    chartInstance = null
  }

  const source = (Array.isArray(filteredRows.value) ? filteredRows.value : []).slice().sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp))

  if (!source || source.length === 0) {
    noChartData.value = true
    return
  } else {
    noChartData.value = false
  }

  // aggregate hourly
  const hourly = aggregateHourly(source)

  if (!hourly || hourly.length === 0) {
    noChartData.value = true
    return
  }

  // labels only hour label (e.g. '27/11 13:00' or use locale)
  const labels = hourly.map(h => {
    const d = new Date(h.hourISO)
    // show day + hour to avoid confusion across multiple days
    return d.toLocaleDateString() + ' ' + String(d.getHours()).padStart(2, '0') + ':00'
  })

  const dataAvg = hourly.map(h => Number(h.avg.toFixed(2)))
  const dataMin = hourly.map(h => Number(h.min))
  const dataMax = hourly.map(h => Number(h.max))

  const ctxEl = historyCanvas.value
  if (!ctxEl) return
  const ctx = ctxEl.getContext('2d')

  // Create chart with area between min and max and avg line
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        // max (invisible line, used as upper bound)
        {
          label: 'max',
          data: dataMax,
          borderWidth: 0,
          pointRadius: 0,
          tension: 0.3,
          fill: false,
        },
        // min (fill to previous -> area between min and max)
        {
          label: 'min',
          data: dataMin,
          borderWidth: 0,
          pointRadius: 0,
          tension: 0.3,
          // fill to previous dataset (max) -> area between min and max
          fill: '-1',
          backgroundColor: 'rgba(54,162,235,0.12)',
        },
        // avg line on top
        {
          label: 'Mực nước (avg) cm',
          data: dataAvg,
          fill: false,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
          borderColor: 'rgba(54,162,235,0.9)',
          backgroundColor: 'rgba(54,162,235,0.2)',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 12 }
        },
        y: {
          beginAtZero: true
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            // show min/max/avg in tooltip for index
            label: function(context) {
              const idx = context.dataIndex
              const dsLabel = context.dataset.label || ''
              if (dsLabel.includes('avg')) {
                return `avg: ${dataAvg[idx]} cm`
              } else if (dsLabel === 'min') {
                return `min: ${dataMin[idx]} cm`
              } else if (dsLabel === 'max') {
                return `max: ${dataMax[idx]} cm`
              }
              return `${dsLabel}: ${context.formattedValue}`
            }
          }
        }
      }
    }
  })
}

/* UI actions */
function applyDateFilter() {
  // computed filteredRows will change; re-render chart
  renderChart()
}
function clearDateFilter() {
  filterFrom.value = ''
  filterTo.value = ''
  renderChart()
}
const gotoId = ref('')
function gotoRecord() {
  const id = Number(gotoId.value)
  if (!id) return
  const found = levels.value.find((r) => r.id === id)
  if (!found) {
    Notify.create({ type: 'warning', message: 'Không tìm thấy bản ghi id=' + id })
    return
  }
  Notify.create({ type: 'positive', message: `Found id=${id} level=${formatLevel(found.level)} cm` })
}

/* lifecycle */
onMounted(() => {
  loadAll()
})
</script>

<style scoped>
/* nếu cần CSS bổ sung */
</style>
