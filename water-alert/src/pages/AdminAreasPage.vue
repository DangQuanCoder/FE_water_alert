<!-- src/pages/AdminAreasPage.vue -->
<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col"><h5>Quản lý khu vực</h5></div>
      <div class="col-auto">
        <q-btn color="primary" label="Thêm khu vực" @click="openCreate" />
      </div>
    </div>

    <area-list
      :areas="areas"
      :loading="loading"
      @edit="openEdit"
      @delete="onDelete"
      @refresh="fetchAreas"
    />

    <area-form
      v-model:model-open="formOpen"
      :editing-area="editing"
      @saved="onSaved"
    />
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Notify, Dialog } from 'quasar'
import AreaList from 'src/components/AreaList.vue'
import AreaForm from 'src/components/AreaForm.vue'
import * as areaService from 'src/services/areaService'

// state
const areas = ref([])
const loading = ref(false)
const formOpen = ref(false)
const editing = ref(null)

async function fetchAreas() {
  loading.value = true
  try {
    const res = await areaService.getAllAreas()
    areas.value = Array.isArray(res) ? res : []
  } catch (err) {
    console.error(err)
    Notify.create({ type: 'negative', message: 'Lấy danh sách khu vực thất bại' })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  formOpen.value = true
}
function openEdit(area) {
  editing.value = { ...area }
  formOpen.value = true
}
async function onDelete(area) {
  const confirmed = await Dialog.create({ title: 'Xác nhận', message: `Bạn có chắc muốn xóa "${area.name || area.code}"?`, cancel: true })
  if (!confirmed) return
  try {
    await areaService.deleteArea(area.id)
    Notify.create({ type: 'positive', message: 'Xóa thành công' })
    fetchAreas()
  } catch (err) {
    console.error(err)
    Notify.create({ type: 'negative', message: err?.response?.data || 'Xóa thất bại' })
  }
}

function onSaved() {
  formOpen.value = false
  fetchAreas()
}

onMounted(() => fetchAreas())
</script>
