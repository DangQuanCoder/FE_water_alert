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

          <div style="max-height: 60vh; overflow: auto">
            <q-list bordered separator>
              <q-item
                v-for="r in filteredSortedLevels"
                :key="r.id"
                clickable
                v-ripple
                @click="focusOnMarker(r)"
              >
                <q-item-section avatar>
                  <q-avatar
                    size="36px"
                    :style="{ backgroundColor: statusColorFor(r.level), color: 'white' }"
                  >
                    {{ Math.round(Number(r.level || 0)) }}
                  </q-avatar>
                </q-item-section>

                <q-item-section>
                  <q-item-label>Level: {{ formatLevel(r.level) }} cm</q-item-label>
                  <q-item-label caption>
                    {{ formatTime(r.timestamp) }}
                    <span v-if="r.deviceId"> — {{ r.deviceId }}</span>
                  </q-item-label>
                </q-item-section>

                <q-item-section side>
                  <q-btn
                    dense
                    flat
                    icon="open_in_new"
                    @click.stop="openHistory(r)"
                    title="Xem lịch sử"
                  />
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
            <div id="map" style="height: 76vh; width: 100%"></div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Notify } from 'quasar'
import * as waterService from 'src/services/waterService'
import * as deviceService from 'src/services/deviceService' // <-- mới
import { useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const pendingFocusDeviceId = ref(null)

watch(() => route.query.deviceId, (val) => {
  if (val) {
    pendingFocusDeviceId.value = String(val)
    // loadLevels để đảm bảo markers được tạo
    loadLevels().catch(() => {})
  }
})


// thresholds (cm)
const THRESHOLD_WARNING = 10
const THRESHOLD_DANGER = 60

const map = ref(null)
const markers = ref([])
const markersMap = ref(new Map()) // id -> marker
const levels = ref([])
const loading = ref(false)
const autoRefresh = ref(true)
let refreshTimer = null

// device locations map: deviceId -> { lat, lng }
const deviceLocations = ref(new Map())

const filterStatus = ref(null)
const filterOptions = [
  { label: 'Tất cả', value: null },
  { label: 'Bình thường', value: 'normal' },
  { label: 'Cảnh báo', value: 'warning' },
  { label: 'Nguy hiểm', value: 'danger' },
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
  if (s === 'danger') return '#e53935'
  if (s === 'warning') return '#fb8c00'
  if (s === 'normal') return '#43a047'
  return '#9e9e9e'
}

function createMap() {
  if (map.value) return
  // fallback center (Hà Nội được dùng tự động nếu device có tọa độ)
  const center = [21.028511, 105.804817]
  map.value = L.map('map', { preferCanvas: true }).setView(center, 11)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map.value)
}

function clearMarkers() {
  markers.value.forEach((m) => {
    try { map.value.removeLayer(m) } catch (err) { void err }
  })
  markers.value = []
  markersMap.value.clear()
}

function formatLevel(v) {
  if (v === null || v === undefined) return '--'
  return Number(v).toFixed(0) // hiển thị cm nguyên
}
function formatTime(ts) {
  if (!ts) return '--'
  return new Date(ts).toLocaleString()
}

/**
 * main marker creation: use deviceLocations if present
 */
/**
 * Thay thế hàm addMarkersFromLevels cũ bằng phiên bản nhóm theo device
 * - Chỉ 1 marker / device (mức mới nhất)
 * - Dùng deviceLocations nếu có coords
 * - Nếu thiết bị không có coords nhưng record level có latitude/longitude, dùng coords đó
 * - Không dùng jitter (để tránh nhiều chấm rác)
 */
function addMarkersFromLevels(data) {
  clearMarkers()
  if (!map.value) return

  // Nhóm theo deviceId (nếu có), nếu không có deviceId thì group theo "__rec_<id>"
  const grouped = new Map()
  ;(data || []).forEach(item => {
    const key = item.deviceId ? String(item.deviceId) : `__rec_${item.id ?? Math.random()}`
    const prev = grouped.get(key)
    if (!prev) grouped.set(key, item)
    else {
      // keep newest (so we end up with latest level per device)
      if (new Date(item.timestamp) > new Date(prev.timestamp)) grouped.set(key, item)
    }
  })

  // If there is at least one device with coords, center to the first such device
  const firstWithCoordsKey = Array.from(grouped.keys()).find(k => {
    const it = grouped.get(k)
    const dloc = it.deviceId ? deviceLocations.value.get(it.deviceId) : null
    if (dloc && dloc.lat != null && dloc.lng != null) return true
    if (it.latitude != null || it.lat != null) return true
    return false
  })
  if (firstWithCoordsKey) {
    const it = grouped.get(firstWithCoordsKey)
    const dl = it.deviceId ? deviceLocations.value.get(it.deviceId) : null
    let lat = dl ? Number(dl.lat) : (it.latitude ?? it.lat)
    let lng = dl ? Number(dl.lng) : (it.longitude ?? it.lng)
    if (lat != null && lng != null) {
      try { map.value.setView([Number(lat), Number(lng)], Math.max(map.value.getZoom(), 11)) } catch(e){ void e }
    }
  }

  // Iterate grouped and create one marker per group
  Array.from(grouped.entries()).forEach(([key, item]) => {
    let lat = null, lng = null

    // Prefer deviceLocations if deviceId exists
    if (item.deviceId) {
      const d = deviceLocations.value.get(String(item.deviceId))
      if (d && d.lat != null && d.lng != null) {
        lat = Number(d.lat); lng = Number(d.lng)
      }
    }

    // Fallback to coordinates present in the level record
    if ((lat == null || lng == null) && (item.latitude != null || item.lat != null)) {
      lat = Number(item.latitude ?? item.lat)
      lng = Number(item.longitude ?? item.lng)
    }

    // If no coordinates available -> skip (do not jitter to avoid many stray dots)
    if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
      return
    }

    const color = statusColorFor(item.level)
    // use circleMarker (fixed pixel radius) to show device point clearly
    const marker = L.circle([lat, lng], {
      color,
      fillColor: color,
      fillOpacity: 0.35,
      radius: 500   // vùng ngập 500m quanh cảm biến
    }).addTo(map.value)

    const popupContent = `
      <div>
        <div><strong>Thiết bị:</strong> ${item.deviceId ?? ('id:' + (item.id ?? ''))}</div>
        <div><strong>Mức:</strong> ${formatLevel(item.level)} cm</div>
        <div><strong>Thời gian:</strong> ${formatTime(item.timestamp)}</div>
        <div style="margin-top:6px;"><a href="#" data-key="${key}" class="open-history-link">Xem lịch sử</a></div>
      </div>
    `
    marker.bindPopup(popupContent)

    // Attach click handler for popup link
    marker.on('popupopen', (ev) => {
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

    // store markers keyed by deviceKey (so focusOnMarker can use record.id or deviceId)
    markers.value.push(marker)
    // use deviceKey if deviceId exists, else use '__rec_<id>'
    const storageKey = item.deviceId ? String(item.deviceId) : `__rec_${item.id ?? key}`
    markersMap.value.set(storageKey, marker)
  })
}

/**
 * focusOnMarker: giờ chấp nhận record có deviceId hoặc chỉ id.
 * Thử tìm marker theo deviceId trước, nếu không có thì theo record.id (__rec_id).
 */
function focusOnMarker(record) {
  if (!map.value || !record) return
  // try deviceId key first
  const tryKeys = []
  if (record.deviceId) tryKeys.push(String(record.deviceId))
  if (record.id != null) tryKeys.push(`__rec_${record.id}`)
  // also try record.id raw (in case markersMap used id)
  if (record.id != null) tryKeys.push(String(record.id))

  for (const k of tryKeys) {
    const m = markersMap.value.get(k)
    if (m) {
      try {
        map.value.setView(m.getLatLng(), Math.max(map.value.getZoom(), 13), { animate: true })
        m.openPopup()
        return
      } catch (err) { void err }
    }
  }
}


function openHistory(record) {
  router.push({ path: '/history', query: { id: record.id, t: record.timestamp } })
}

const filteredSortedLevels = ref([])

function applyFilterAndRender() {
  const all = (levels.value || []).slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  const f = filterStatus.value
  filteredSortedLevels.value = all.filter((r) => {
    if (!f) return true
    const s = statusFor(r.level)
    if (f === 'normal') return s === 'normal'
    if (f === 'warning') return s === 'warning'
    if (f === 'danger') return s === 'danger'
    return true
  })
  addMarkersFromLevels(filteredSortedLevels.value)
}

/**
 * Load device locations map first (best-effort), then load levels.
 */
async function loadDeviceLocations() {
  try {
    const res = await deviceService.getAllDevices()
    // res expected: [{ deviceId, latitude, longitude, ... }, ...]
    if (Array.isArray(res)) {
      deviceLocations.value.clear()
      res.forEach(d => {
        const id = d.deviceId ?? d.id ?? null
        if (!id) return
        const lat = d.latitude ?? d.lat ?? null
        const lng = d.longitude ?? d.lng ?? null
        if (lat != null && lng != null) deviceLocations.value.set(String(id), { lat: Number(lat), lng: Number(lng) })
      })
    }
  } catch (err) {
    // nếu không có endpoint devices, bỏ qua (chỉ dùng jitter)
    void err
  }
}

async function loadLevels() {
  loading.value = true
  try {
    // try load device locations (best-effort)
    await loadDeviceLocations()
    const res = await waterService.getAllLevels()
    levels.value = Array.isArray(res) ? res : res || []
    applyFilterAndRender()
  } catch (err) {
    console.error('loadLevels error', err)
    Notify.create({ type: 'negative', message: 'Không tải được dữ liệu mực nước' })
  } finally {
    loading.value = false
  }
}

watch(autoRefresh, (v) => {
  if (v) {
    refreshTimer = setInterval(() => loadLevels(), 30_000)
  } else {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }
})

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
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  clearMarkers()
  if (map.value) {
    try { map.value.remove() } catch (err) { void err }
    map.value = null
  }
})
</script>

<style scoped>
.leaflet-container img { max-width: none !important; }
</style>
