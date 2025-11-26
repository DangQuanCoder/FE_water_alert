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
    >
      <template v-slot:top-right>
        <q-input dense debounce="300" v-model="filter" placeholder="Tìm theo code hoặc tên" />
      </template>

      <template v-slot:body-cell-description="props">
        <q-td :props="props">
          <div style="max-width:360px; white-space:normal">{{ props.row.description || '-' }}</div>
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" align="center">
          <q-btn dense flat round icon="edit" @click="$emit('edit', props.row)" />
          <q-btn dense flat round icon="delete" color="negative" @click="$emit('delete', props.row)" />
        </q-td>
      </template>
    </q-table>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  areas: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})
// no script emit needed since template uses $emit
const filter = ref('')

const cols = [
  { name: 'id', label: 'ID', field: 'id', sortable: true, style: 'width:80px' },
  { name: 'code', label: 'Mã', field: 'code', sortable: true },
  { name: 'name', label: 'Tên', field: 'name', sortable: true },
  { name: 'description', label: 'Mô tả', field: 'description' },
  { name: 'actions', label: 'Hành động', field: 'actions', align: 'center' }
]

const filteredRows = computed(() => {
  if (!filter.value) return props.areas
  const f = filter.value.toLowerCase()
  return props.areas.filter(a => (a.code || '').toLowerCase().includes(f) || (a.name || '').toLowerCase().includes(f))
})
</script>
