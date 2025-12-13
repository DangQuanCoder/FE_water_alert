<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-8">
        <q-card class="q-pa-md">
          <div class="row items-center justify-between">
            <div class="text-h6">Lịch sử mực nước</div>
            <div>
              <q-btn dense flat round icon="refresh" @click="reloadAll" title="Làm mới" />
            </div>
          </div>

          <div class="row q-mt-md items-center">
            <q-select
            dense
            outlined
            v-model="selectedDevice"
            :options="deviceOptions"
            option-label="displayLabel"
            option-value="id"
            emit-value
            map-options
            label="Chọn thiết bị (All = Tất cả)"
            clearable
            class="col-12 col-md-4"
            @update:model-value="onDeviceChange"
          />

            <q-input dense v-model="filterFrom" type="date" label="Từ ngày (YYYY-MM-DD)" class="q-ml-sm" />
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
              <div class="text-subtitle1">Không có dữ liệu (hoặc toàn bộ là 0) trong khoảng này</div>
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
          <div class="text-subtitle1">Danh sách bản ghi (Bao gồm cả giá trị 0)</div>
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
import zoomPlugin from 'chartjs-plugin-zoom'
import * as waterService from 'src/services/waterService'
import * as deviceService from 'src/services/deviceService'

Chart.register(...registerables, zoomPlugin)

import { ref, onMounted, computed, nextTick } from 'vue'

/* --- STATE --- */
const levels = ref([])
const loading = ref(false)
const historyCanvas = ref(null)
let chartInstance = null
const noChartData = ref(false)

const TH_DANGER = 80
const filterFrom = ref('')
const filterTo = ref('')

// Cache dữ liệu (chỉ cần 1 biến vì ta luôn dùng gộp 3 phút)
let cachedData = []

const columns = [
  { name: 'id', label: 'ID', field: 'id', sortable: true },
  { name: 'level', label: 'Mực nước (cm)', field: 'level', sortable: true },
  { name: 'timestamp', label: 'Thời gian', field: 'timestamp', sortable: true },
]

function formatLevel(v) { return v == null ? '--' : Number(v).toFixed(0) }
function formatTime(ts) { if (!ts) return '--'; return new Date(ts).toLocaleString() }

const rowsCount = computed(() => levels.value.length)
const dangerCount = computed(() => levels.value.filter((l) => Number(l.level) > TH_DANGER).length)

// --- Helper Filters ---
function parseDateSafeYMD(s) {
  if (!s) return null
  const parts = String(s).trim().split('-')
  if (parts.length < 3) return null
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
}
function parseDateSafeYMDEnd(s) {
  const d = parseDateSafeYMD(s)
  if (!d) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

/* --- LOAD DATA LOGIC --- */
const deviceOptions = ref([])
const selectedDevice = ref(null)

async function loadDevices() {
  try {
    const list = await deviceService.getAllDevices()
    const arr = Array.isArray(list) ? list : (list?.devices ?? list) ?? []
    if (arr.length > 0) {
       deviceOptions.value = arr.map(d => ({
        id: d.deviceId, displayLabel: `${d.name} (${d.deviceId})`
      }))
      return;
    }
  } catch {
    // ignore
  }
  // Fallback
  if (levels.value.length === 0) {
     try {
       const all = await waterService.getAllLevels()
       levels.value = Array.isArray(all) ? all : []
     } catch { return }
  }
  const uniqueDeviceIds = [...new Set(levels.value.map(r => r.deviceId).filter(Boolean))]
  deviceOptions.value = uniqueDeviceIds.map(deviceId => ({
    id: deviceId, displayLabel: `Thiết bị ${deviceId}`
  }))
}

const filteredRows = computed(() => {
  let arr = Array.isArray(levels.value) ? levels.value.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) : []
  const fFrom = parseDateSafeYMD(filterFrom.value)
  const fTo = parseDateSafeYMDEnd(filterTo.value)
  if (fFrom) arr = arr.filter((r) => new Date(r.timestamp) >= fFrom)
  if (fTo) arr = arr.filter((r) => new Date(r.timestamp) <= fTo)
  return arr
})

async function loadHistoryForDevice() {
  loading.value = true
  try {
    const fromISO = filterFrom.value ? new Date(filterFrom.value).toISOString() : undefined
    const toISO = filterTo.value ? new Date(parseDateSafeYMDEnd(filterTo.value)).toISOString() : undefined
    let arr = []
    if (selectedDevice.value) {
      try {
        const res = await waterService.getLevelsByDevice(selectedDevice.value, fromISO, toISO)
        arr = Array.isArray(res) ? res : res?.data ?? []
      } catch {
        const all = await waterService.getAllLevels()
        arr = Array.isArray(all) ? all : []
      }
    } else {
      const all = await waterService.getAllLevels()
      arr = Array.isArray(all) ? all : []
    }
    levels.value = arr
  } catch  {
    levels.value = []
  } finally {
    loading.value = false
    await nextTick()
    prepareDataAndRender()
  }
}

async function reloadAll() { await loadDevices(); await loadHistoryForDevice() }
function onDeviceChange() { loadHistoryForDevice() }

/* --- 1. HÀM KÉO DÀI 2 ĐẦU (GIỮ BIỂU ĐỒ FULL 24H) --- */
function addBoundaryPoints(data) {
  if (!data || data.length === 0) return data;
  const startDate = parseDateSafeYMD(filterFrom.value);
  const endDate = parseDateSafeYMDEnd(filterTo.value);
  if (!startDate || !endDate) return data;

  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  const newData = [...data];

  // Nếu điểm đầu tiên lớn hơn 00:00 -> Chèn thêm điểm 00:00
  if (newData[0].x > startTime) {
    newData.unshift({ x: startTime, y: newData[0].y });
  }
  // Nếu điểm cuối cùng nhỏ hơn 23:59 -> Chèn thêm điểm 23:59
  if (newData[newData.length - 1].x < endTime) {
    newData.push({ x: endTime, y: newData[newData.length - 1].y });
  }
  return newData;
}

/* --- 2. HÀM GỘP 3 PHÚT (CORE LOGIC) --- */
function groupData(records, minutesFrame) {
  const m = new Map()
  const sorted = records.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  for (const r of sorted) {
    if (!r || r.timestamp == null) continue
    const d = new Date(r.timestamp)
    if (isNaN(d.getTime())) continue

    // Logic làm tròn về bội số của 3 phút (0, 3, 6, 9...)
    const msPerFrame = minutesFrame * 60 * 1000
    const roundedTime = Math.floor(d.getTime() / msPerFrame) * msPerFrame

    if (!m.has(roundedTime)) m.set(roundedTime, [])
    const lv = Number(r.level)
    if (Number.isFinite(lv)) m.get(roundedTime).push(lv)
  }

  const out = []
  for (const [timestamp, arr] of m.entries()) {
    // Tính trung bình cộng của các điểm trong 3 phút đó
    const avg = arr.reduce((s, x) => s + x, 0) / arr.length
    out.push({ x: timestamp, y: Number(avg.toFixed(1)) })
  }
  return out.sort((a,b) => a.x - b.x)
}

function prepareDataAndRender() {
  const source = (Array.isArray(filteredRows.value) ? filteredRows.value : [])
      .filter(r => Number(r.level) > 0) // Lọc số 0

  if (!source || source.length === 0) {
    noChartData.value = true
    if (chartInstance) { try { chartInstance.destroy() } catch {
      // ignore
    } chartInstance = null }
    return
  } else {
    noChartData.value = false
  }

  // GỘP LUÔN 3 PHÚT (Không cần Raw nữa)
  let grouped = groupData(source, 3);

  // Kéo dài dữ liệu ra 2 đầu 00:00 - 23:59
  cachedData = addBoundaryPoints(grouped);

  // Vẽ
  renderChart(cachedData);
}

/* --- RENDER CHART (ĐÃ TỐI ƯU ZOOM) --- */
function renderChart(dataToRender) {
  if (chartInstance) { try { chartInstance.destroy() } catch {
    // ignore
  } chartInstance = null }

  const ctxEl = historyCanvas.value
  if (!ctxEl) return
  const ctx = ctxEl.getContext('2d')

  // Cố định trục X theo ngày đã chọn (0h -> 23h59)
  const minX = parseDateSafeYMD(filterFrom.value).getTime();
  const maxX = parseDateSafeYMDEnd(filterTo.value).getTime();

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Mực nước (cm)',
          data: dataToRender,
          fill: true,
          tension: 0.3, // Độ cong vừa phải
          borderWidth: 2,
          pointRadius: 2, // Điểm nhỏ gọn (vì gộp 3p vẫn khá nhiều điểm)
          pointHoverRadius: 5,
          borderColor: 'rgba(54,162,235,1)',
          backgroundColor: 'rgba(54,162,235,0.2)'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false, axis: 'x' },
      scales: {
        x: {
          type: 'linear', // Trục tuyến tính giúp zoom mượt
          position: 'bottom',
          min: minX,
          max: maxX,
          ticks: {
            maxRotation: 0, autoSkip: true, maxTicksLimit: 10,
            callback: function(value) {
              const d = new Date(value);
              return d.toLocaleTimeString('vi-VN', { hour12: false, hour:'2-digit', minute:'2-digit' })
            }
          }
        },
        y: { beginAtZero: true }
      },
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            title: (items) => {
              const v = items[0].parsed.x;
              return new Date(v).toLocaleString('vi-VN');
            }
          }
        },
        // CẤU HÌNH ZOOM ĐƠN GIẢN (Zoom trực tiếp vào data 3 phút)
        zoom: {
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x',
          },
          pan: { enabled: true, mode: 'x' },
          limits: { x: { min: 'original', max: 'original' } }
        }
      }
    }
  })
}

/* UI actions */
function applyDateFilter() { loadHistoryForDevice() }
function clearDateFilter() { filterFrom.value = ''; filterTo.value = ''; loadHistoryForDevice() }
const gotoId = ref('')
function gotoRecord() {
  const id = Number(gotoId.value)
  if (!id) return
  const found = levels.value.find((r) => r.id === id)
  if (!found) return
  Notify.create({ type: 'positive', message: `Found id=${id} level=${formatLevel(found.level)} cm` })
}

onMounted(async () => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  filterTo.value = today.toISOString().split('T')[0];
  filterFrom.value = yesterday.toISOString().split('T')[0];

  await loadDevices()
  await loadHistoryForDevice()
})
</script>

<style scoped>
/* nếu cần CSS bổ sung */
</style>
