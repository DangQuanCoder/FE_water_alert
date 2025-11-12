<template>
  <q-page class="q-pa-md">
    <div class="text-h6">Đồ thị mực nước (demo)</div>
    <div style="max-width:900px; height:400px; margin-top:12px;">
      <canvas id="lineChart"></canvas>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

onMounted(() => {
  const ctx = document.getElementById('lineChart')
  if (!ctx) return
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['2025-11-01','2025-11-02','2025-11-03','2025-11-04'],
      datasets: [{
        label: 'Mực nước (m)',
        data: [1.2,1.5,2.1,2.9],
        fill: true,
        tension: 0.3
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  })
})
</script>
