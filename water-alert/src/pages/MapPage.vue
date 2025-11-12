<template>
  <q-page class="q-pa-md">
    <div class="text-h6">Bản đồ ngập (demo)</div>
    <div id="map" style="height:600px; margin-top:12px"></div>
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

onMounted(() => {
  const map = L.map('map').setView([10.7769, 106.70098], 11)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map)

  L.marker([10.7769, 106.70098]).addTo(map).bindPopup('Vị trí mẫu').openPopup()
})
</script>

<style>
.leaflet-container img { max-width: none !important; }
</style>
