<template>
  <q-dialog v-model="openLocal" persistent>
    <q-card style="min-width: 420px; max-width: 720px">
      <q-card-section>
        <div class="text-h6">{{ isEdit ? 'Sửa thiết bị' : 'Thêm thiết bị' }}</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="submit" ref="formRef">
          <!-- Device ID -->
          <q-input
            v-model="model.deviceId"
            label="ID Thiết bị"
            :readonly="isEdit"
            :rules="[v => !!v || 'Bắt buộc']"
          />

          <!-- Name -->
          <q-input
            v-model="model.name"
            label="Tên thiết bị"
          />

          <!-- Area -->
          <q-select
            v-if="areas && areas.length"
            v-model="model.areaId"
            :options="areaOptions"
            label="Khu vực (Area)"
            emit-value
            map-options
          />

          <!-- NOTE: theo yêu cầu của bạn, mình đổi nhãn như sau:
               - Trường 'latitude' hiện hiển thị nhãn "Kinh độ"
               - Trường 'longitude' hiện hiển thị nhãn "Vĩ độ"
               Lưu ý: internal keys (latitude/longitude) KHÔNG đổi. -->
          <q-input
            v-model.number="model.latitude"
            label="Kinh độ"
            type="number"
            :hint="'Nhập giá trị theo nhãn (Kinh độ) — sẽ được gửi dưới key latitude'"
            hide-bottom-space
          />

          <q-input
            v-model.number="model.longitude"
            label="Vĩ độ"
            type="number"
            :hint="'Nhập giá trị theo nhãn (Vĩ độ) — sẽ được gửi dưới key longitude'"
            hide-bottom-space
          />

          <div class="row q-pt-sm q-gutter-sm">
            <q-btn label="Hủy" flat v-close-popup @click="close" />
            <q-btn label="Lưu" color="primary" type="submit" :loading="saving" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch, reactive, computed } from 'vue'
import { Notify } from 'quasar'
import * as deviceService from 'src/services/deviceService'

const props = defineProps({
  modelOpen: { type: Boolean, default: false },
  editingDevice: { type: Object, default: null },
  areas: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelOpen', 'saved'])

const openLocal = ref(props.modelOpen)
watch(() => props.modelOpen, v => openLocal.value = v)
watch(openLocal, v => emit('update:modelOpen', v))

const isEdit = computed(() => !!props.editingDevice)
const saving = ref(false)

const model = reactive({
  deviceId: '',
  name: '',
  areaId: null,
  // giữ tên property như backend
  latitude: null,
  longitude: null
})

watch(() => props.editingDevice, (d) => {
  if (d) {
    model.deviceId = d.deviceId ?? ''
    model.name = d.name ?? ''
    model.areaId = d.areaId ?? null
    model.latitude = d.latitude ?? null
    model.longitude = d.longitude ?? null
  } else {
    model.deviceId = ''
    model.name = ''
    model.areaId = null
    model.latitude = null
    model.longitude = null
  }
}, { immediate: true })

const areaOptions = computed(() => props.areas.map(a => ({ label: a.name || `ID:${a.id}`, value: a.id })))

function close() {
  openLocal.value = false
}

async function submit() {
  saving.value = true
  try {
    if (isEdit.value) {
      // cập nhật: gửi payload tương ứng (lưu ý: internal keys giữ nguyên)
      await deviceService.updateDevice(props.editingDevice.id, {
        name: model.name,
        areaId: model.areaId,
        latitude: model.latitude,
        longitude: model.longitude
      })
      Notify.create({ type: 'positive', message: 'Cập nhật thiết bị thành công' })
    } else {
      await deviceService.createDevice({
        deviceId: model.deviceId,
        name: model.name,
        areaId: model.areaId,
        latitude: model.latitude,
        longitude: model.longitude
      })
      Notify.create({ type: 'positive', message: 'Tạo thiết bị thành công' })
    }
    emit('saved')
    close()
  } catch (err) {
    console.error(err)
    const msg = err?.response?.data || 'Lỗi khi lưu thiết bị'
    Notify.create({ type: 'negative', message: String(msg) })
  } finally {
    saving.value = false
  }
}
</script>
