<template>
  <div>
    <q-table
      :rows="filteredRows"
      :columns="cols"
      row-key="id"
      :loading="loading"
      flat
      dense
      wrap-cells
      :rows-per-page-options="[5, 10, 20, 50]"
      v-model:pagination="pagination"
    >
      <template v-slot:top-right>
        <q-input dense debounce="300" v-model="filter" placeholder="Tìm theo tên hoặc ID thiết bị" />
      </template>

      <!-- STT: hiển thị theo thứ tự hiện tại (không phụ thuộc DB id) -->
      <template v-slot:body-cell-stt="props">
        <q-td :props="props">
          <!-- STT = index trong trang hiện tại (pagination.page bắt đầu từ 1) -->
          {{ rowIndexOnPage(props) }}
        </q-td>
      </template>

      <template v-slot:body-cell-areaName="props">
        <q-td :props="props">
          {{ props.row.areaName ?? (props.row.areaId ? 'ID:' + props.row.areaId : '-') }}
        </q-td>
      </template>

      <template v-slot:body-cell-createdAt="props">
        <q-td :props="props">
          {{ formatDate(props.row.createdAt) }}
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
  <q-td :props="props" align="center" class="q-pa-none">

    <!-- Edit -->
    <q-btn dense flat round icon="edit" @click="$emit('edit', props.row)">
      <q-tooltip
        anchor="top middle"
        self="bottom middle"
        transition-show="none"
        transition-hide="none"
        transition-show-delay="0"
        class="bg-grey-9 text-white text-body2"
      >
        Sửa thiết bị
      </q-tooltip>
    </q-btn>

    <!-- Patch location -->
    <q-btn dense flat round icon="my_location" @click="$emit('patch-location', props.row)">
      <q-tooltip
        anchor="top middle"
        self="bottom middle"
        transition-show="none"
        transition-hide="none"
        transition-show-delay="0"
        class="bg-grey-9 text-white text-body2"
      >
        Cập nhật vị trí thiết bị
      </q-tooltip>
    </q-btn>

    <!-- Delete -->
    <q-btn dense flat round icon="delete" color="negative" @click="$emit('delete', props.row)">
      <q-tooltip
        anchor="top middle"
        self="bottom middle"
        transition-show="none"
        transition-hide="none"
        transition-show-delay="0"
        class="bg-red-8 text-white text-body2"
      >
        Xoá thiết bị
      </q-tooltip>
    </q-btn>

  </q-td>
</template>

    </q-table>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  devices: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})
// Using $emit in template -> no defineEmits in script to avoid eslint unused warnings

const filter = ref('')
const pagination = ref({ page: 1, rowsPerPage: 5, sortBy: 'id', descending: false })

// Columns: first column is STT (not sortable), other columns sortable as requested
const cols = [
  { name: 'stt', label: 'STT', field: 'stt', sortable: false, style: 'width:80px' },
  { name: 'deviceId', label: 'ID Thiết bị', field: 'deviceId', sortable: true },
  { name: 'name', label: 'Tên thiết bị', field: 'name', sortable: true },
  { name: 'areaName', label: 'Khu vực', field: 'areaName', sortable: true },
  { name: 'lastWaterLevel', label: 'Mực nước (gần nhất)', field: 'lastWaterLevel', sortable: true },
  { name: 'latitude', label: 'Vĩ độ', field: 'latitude', sortable: true, align: 'right' },
  { name: 'longitude', label: 'Kinh độ', field: 'longitude', sortable: true, align: 'right' },
  { name: 'createdAt', label: 'Ngày tạo', field: 'createdAt', sortable: true },
  { name: 'actions', label: 'Hành động', field: 'actions', align: 'center' }
]

// filtered + sorted rows for q-table (q-table will also sort internally, but we expose filteredRows so STT can be computed)
const filteredRows = computed(() => {
  const f = filter.value && filter.value.toString().toLowerCase()
  let list = props.devices ?? []

  if (f) {
    list = list.filter(d =>
      (d.name || '').toString().toLowerCase().includes(f) ||
      (d.deviceId || '').toString().toLowerCase().includes(f) ||
      (d.areaName || '').toString().toLowerCase().includes(f)
    )
  }
  return list
})

// helper: format date nicely
function formatDate(v) {
  if (!v) return '-'
  try {
    const d = new Date(v)
    if (isNaN(d)) return v
    return d.toLocaleString()
  } catch {
    return v
  }
}

// helper: compute STT (index on current page)
function rowIndexOnPage(props) {
  const page = pagination.value.page || 1
  const per = pagination.value.rowsPerPage || 5
  // find index of the row in filteredRows
  const idx = filteredRows.value.findIndex(r => String(r.id) === String(props.row.id))
  if (idx === -1) return '-'
  return (page - 1) * per + idx + 1
}
</script>
