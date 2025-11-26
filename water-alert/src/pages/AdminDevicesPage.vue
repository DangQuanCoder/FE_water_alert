<!-- src/pages/AdminDevicesPage.vue -->
<template>
  <q-page class="q-pa-md">

    <!-- Header -->
    <div class="row items-center q-mb-md">
      <div class="col"><h5>Quản lý thiết bị</h5></div>
      <div class="col-auto">
        <q-btn color="primary" label="Thêm thiết bị" @click="openCreate" />
      </div>
    </div>

    <!-- Device List -->
    <device-list
      :devices="devices"
      :loading="loading"
      @edit="openEdit"
      @delete="onDelete"
      @patch-location="openPatchLocation"
      @refresh="fetchDevices"
    />

    <!-- Create/Edit Form -->
    <device-form
      v-model:model-open="formOpen"
      :editing-device="editing"
      :areas="areas"
      @saved="onSaved"
    />

    <!-- Patch location dialog -->
    <q-dialog v-model="locDialog">
      <q-card style="min-width: 360px">
        <q-card-section>
          <div class="text-h6">Cập nhật vị trí thiết bị</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit.prevent="submitLocation">
            <q-input v-model.number="loc.latitude" type="number" label="Latitude" :rules="[v => v !== null || 'Bắt buộc']"/>
            <q-input v-model.number="loc.longitude" type="number" label="Longitude" :rules="[v => v !== null || 'Bắt buộc']"/>
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Hủy" v-close-popup />
          <q-btn color="primary" label="Lưu" @click="submitLocation" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Notify, Dialog } from 'quasar'
import DeviceList from 'src/components/DeviceList.vue'
import DeviceForm from 'src/components/DeviceForm.vue'
import * as deviceService from 'src/services/deviceService'
import { api } from 'src/boot/axios'

const devices = ref([])
const loading = ref(false)
const formOpen = ref(false)
const editing = ref(null)

const areas = ref([])

const locDialog = ref(false)
const loc = reactive({ id: null, latitude: null, longitude: null })

async function fetchAreas() {
  try {
    const r = await api.get('/api/admin/areas')
    areas.value = Array.isArray(r.data) ? r.data : []
  } catch (err) {
    console.error('fetchAreas error:', err)
  }
}

async function fetchDevices() {
  loading.value = true
  try {
    const res = await deviceService.getAllDevices()
    devices.value = Array.isArray(res) ? res : []
  } catch (err) {
    console.error('fetchDevices error:', err)
    Notify.create({ type: 'negative', message: 'Không lấy được danh sách thiết bị' })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(device) {
  editing.value = { ...device }
  formOpen.value = true
}

async function onDelete(device) {
  const ok = await Dialog.create({
    title: 'Xác nhận',
    message: `Xóa thiết bị "${device.name || device.deviceId}"?`,
    cancel: true,
    ok: { label: 'Xóa', color: 'negative' }
  })
  if (!ok) return

  try {
    await deviceService.deleteDevice(device.id)
    Notify.create({ type: 'positive', message: 'Xóa thành công' })
    fetchDevices()
  } catch (err) {
    console.error('onDelete error:', err)
    Notify.create({ type: 'negative', message: 'Xóa thất bại' })
  }
}

function openPatchLocation(device) {
  loc.id = device.id
  loc.latitude = device.latitude ?? null
  loc.longitude = device.longitude ?? null
  locDialog.value = true
}

async function submitLocation() {
  try {
    await deviceService.patchDeviceLocation(loc.id, {
      latitude: loc.latitude,
      longitude: loc.longitude
    })
    Notify.create({ type: 'positive', message: 'Đã cập nhật vị trí' })
    locDialog.value = false
    fetchDevices()
  } catch {
    Notify.create({ type: 'negative', message: 'Cập nhật vị trí thất bại' })
  }
}

function onSaved() {
  formOpen.value = false
  fetchDevices()
}

onMounted(() => {
  fetchAreas()
  fetchDevices()
})
</script>
