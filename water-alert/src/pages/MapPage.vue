<!-- src/pages/MapPage.vue -->
<template>
  <q-page class="q-pa-md">
    <div class="row">
      <!-- Left panel: list + controls -->
      <div class="col-12 col-md-3">
        <q-card class="q-pa-sm">
          <div class="row items-center justify-between">
            <div class="text-h6">Bản đồ ngập</div>
            <q-btn dense flat round size="sm" icon="refresh" @click="loadLevels" title="Làm mới" />
          </div>

          <div class="q-mt-sm">
            <q-select
              v-model="filterStatus"
              :options="filterOptions"
              label="Lọc trạng thái"
              dense
              clearable
            />
          </div>

          <div class="q-mt-sm">
            <q-toggle v-model="autoRefresh" label="Tự động làm mới (30s)" dense />
          </div>

          <q-separator class="q-my-sm" />

          <div style="max-height:60vh; overflow:auto;">
            <q-list bordered separator>
              <q-item v-for="r in filteredSortedLevels" :key="r.id" clickable v-ripple @click="focusOnMarker(r)">
                <q-item-section avatar>
                  <q-avatar size="36px" :style="{ backgroundColor: statusColorFor(r.level), color: 'white' }">
                    {{ Math.round(Number(r.level)) }}
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label>Level: {{ formatLevel(r.level) }} m</q-item-label>
                  <q-item-label caption>{{ formatTime(r.timestamp) }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn dense flat icon="open_in_new" @click.stop="openHistory(r)" title="Xem lịch sử" />
                </q-item-section>
              </q-item>
              <q-item v-if="filteredSortedLevels.length === 0">
                <q-item-section>
                  <div class="text-caption text-grey-6">Không tìm thấy bản ghi</div>
                </q-item-section>
              </q-item>
            </q-list>
          </div>

          <q-separator class="q-my-sm" />
          <div class="text-caption">Legend</div>
          <div class="row items-center q-gutter-sm q-mt-sm">
            <q-chip square text-color="white" color="positive">Bình thường</q-chip>
            <q-chip square text-color="white" color="warning">Cảnh báo</q-chip>
            <q-chip square text-color="white" color="negative">Nguy hiểm</q-chip>
          </div>
        </q-card>
      </div>

      <!-- Map column -->
      <div class="col-12 col-md-9">
        <q-card flat>
          <q-card-section>
            <div class="row items-center justify-between">
              <div class="text-h6">Bản đồ cảm biến mực nước</div>
              <div class="text-caption text-grey-6">Markers color theo mức</div>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section class="q-pa-none">
            <div id="map" style="height: 76vh; width: 100%;"></div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Notify } from 'quasar'
import * as waterService from 'src/services/waterService'
import { useRouter } from 'vue-router'

const router = useRouter()

// config thresholds (same as UserPage)
const THRESHOLD_WARNING = 1.0
const THRESHOLD_DANGER = 2.0

const map = ref(null)
const markers = ref([]) // array of L.Circle or marker
const levels = ref([])
const loading = ref(false)
const autoRefresh = ref(true)
let refreshTimer = null

const filterStatus = ref(null)
const filterOptions = [
  { label: 'Tất cả', value: null },
  { label: 'Bình thường', value: 'normal' },
  { label: 'Cảnh báo', value: 'warning' },
  { label: 'Nguy hiểm', value: 'danger' }
]

function statusFor(level) {
  if (level === null || level === undefined) return 'unknown'
  const v = Number(level)
  if (v > THRESHOLD_DANGER) return 'danger'
  if (v > THRESHOLD_WARNING) return 'warning'
  return 'normal'
}

function statusColorFor(level) {
  const s = statusFor(level)
  if (s === 'danger') return '#e53935' // red
  if (s === 'warning') return '#fb8c00' // orange
  if (s === 'normal') return '#43a047' // green
  return '#9e9e9e'
}

function createMap() {
  if (map.value) return
  // center to some coordinates (fallback)
  const center = [10.7769, 106.70098] // HCM sample
  map.value = L.map('map', { preferCanvas: true }).setView(center, 11)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map.value)
}

function clearMarkers() {
  markers.value.forEach(m => {
    try { map.value.removeLayer(m) } catch (err) { void err }
  })
  markers.value = []
}

function addMarkersFromLevels(data) {
  clearMarkers()
  if (!map.value) return

  // We don't have sensor location in BE. We'll scatter markers around center for demo,
  // but if your BE provides coordinates, use them instead.
  // For now, if data includes id-based pseudo-locations we compute jitter.
  const center = map.value.getCenter()
  const baseLat = center.lat
  const baseLng = center.lng

  // sort descending by timestamp so newest first
  const sorted = (data || []).slice().sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))

  sorted.forEach((item, idx) => {
    // pseudo location: jitter around center
    const jitter = 0.02 // ~2km depending on zoom
    const lat = baseLat + ((idx % 5) - 2) * jitter + ((item.id % 7) - 3) * 0.002
    const lng = baseLng + (Math.floor(idx / 5) - 2) * jitter + ((item.id % 5) - 2) * 0.002

    const color = statusColorFor(item.level)
    const radius = 200 + Math.min(Math.max(Number(item.level || 0) * 80, 0), 200) // radius in meters

    const circle = L.circle([lat, lng], {
      color,
      fillColor: color,
      fillOpacity: 0.6,
      radius
    }).addTo(map.value)

    const popupContent = `
      <div>
        <div><strong>Mức:</strong> ${formatLevel(item.level)} m</div>
        <div><strong>Thời gian:</strong> ${formatTime(item.timestamp)}</div>
        <div style="margin-top:6px;"><a href="#" data-id="${item.id}" class="open-history-link">Xem lịch sử</a></div>
      </div>
    `
    circle.bindPopup(popupContent)

    // capture clicks on popup link
    circle.on('popupopen', (ev) => {
      const popupEl = ev.popup.getElement()
      if (!popupEl) return
      const link = popupEl.querySelector('.open-history-link')
      if (link) {
        link.addEventListener('click', (e) => {
          e.preventDefault()
          openHistory(item)
        })
      }
    })

    markers.value.push(circle)
  })
}

// focus map on marker corresponding to a level record
function focusOnMarker(record) {
  if (!map.value || markers.value.length === 0) return
  // naive find by index of sorted list (same order as added)
  const sorted = levels.value.slice().sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
  const idx = sorted.findIndex(r => r.id === record.id)
  if (idx === -1) return
  const m = markers.value[idx]
  if (m) {
    map.value.setView(m.getLatLng(), Math.max(map.value.getZoom(), 13), { animate: true })
    m.openPopup()
  }
}

function openHistory(record) {
  // navigate to history page with optional query param id/time
  router.push({ path: '/history', query: { id: record.id, t: record.timestamp } })
}

function formatLevel(v) {
  if (v === null || v === undefined) return '--'
  return Number(v).toFixed(2)
}
function formatTime(ts) {
  if (!ts) return '--'
  return new Date(ts).toLocaleString()
}

const filteredSortedLevels = ref([])

function applyFilterAndRender() {
  const all = (levels.value || []).slice().sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
  const f = filterStatus.value
  filteredSortedLevels.value = all.filter(r => {
    if (!f) return true
    const s = statusFor(r.level)
    if (f === 'normal') return s === 'normal'
    if (f === 'warning') return s === 'warning'
    if (f === 'danger') return s === 'danger'
    return true
  })
  addMarkersFromLevels(filteredSortedLevels.value)
}

async function loadLevels() {
  loading.value = true
  try {
    const res = await waterService.getAllLevels()
    levels.value = Array.isArray(res) ? res : (res || [])
    applyFilterAndRender()
  } catch (err) {
    console.error('loadLevels error', err)
    Notify.create({ type: 'negative', message: 'Không tải được dữ liệu mực nước' })
  } finally {
    loading.value = false
  }
}

// watch autoRefresh toggle
watch(autoRefresh, (v) => {
  if (v) {
    refreshTimer = setInterval(() => loadLevels(), 30_000)
  } else {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
  }
})

// watch filter change
watch(filterStatus, () => {
  applyFilterAndRender()
})

onMounted(() => {
  createMap()
  loadLevels()
  if (autoRefresh.value) {
    refreshTimer = setInterval(() => loadLevels(), 30_000)
  }
})

onBeforeUnmount(() => {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
  clearMarkers()
  if (map.value) {
    try { map.value.remove() } catch (err) { void err }
    map.value = null
  }
})
</script>

<style scoped>
/* ensure leaflet images load from node_modules path if needed */
.leaflet-container img { max-width: none !important; }
</style>
