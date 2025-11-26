<template>
  <q-dialog v-model="openLocal" persistent>
    <q-card style="min-width: 420px; max-width: 720px">
      <q-card-section>
        <div class="text-h6">{{ isEdit ? 'Sửa khu vực' : 'Tạo khu vực' }}</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="submit" ref="formRef">
          <q-input v-model="model.code" label="Mã (code)" :rules="[v => !!v || 'Bắt buộc']" :readonly="isEdit" />
          <q-input v-model="model.name" label="Tên" :rules="[v => !!v || 'Bắt buộc']" />
          <q-input v-model="model.description" label="Mô tả" type="textarea" autogrow />
          <div class="row justify-end q-mt-md">
            <q-btn flat label="Hủy" v-close-popup @click="close" />
            <q-btn color="primary" label="Lưu" type="submit" :loading="saving" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Notify } from 'quasar'
import * as areaService from 'src/services/areaService'

const props = defineProps({
  modelOpen: { type: Boolean, default: false },
  editingArea: { type: Object, default: null }
})
const emit = defineEmits(['update:modelOpen', 'saved'])

const openLocal = ref(props.modelOpen)
watch(() => props.modelOpen, v => openLocal.value = v)
watch(openLocal, v => emit('update:modelOpen', v))

const isEdit = computed(() => !!props.editingArea)
const saving = ref(false)

const model = reactive({
  code: '',
  name: '',
  description: ''
})

watch(() => props.editingArea, (a) => {
  if (a) {
    model.code = a.code ?? ''
    model.name = a.name ?? ''
    model.description = a.description ?? ''
  } else {
    model.code = ''
    model.name = ''
    model.description = ''
  }
}, { immediate: true })

function close() {
  openLocal.value = false
}

async function submit() {
  saving.value = true
  try {
    if (isEdit.value) {
      await areaService.updateArea(props.editingArea.id, {
        code: model.code,
        name: model.name,
        description: model.description
      })
      Notify.create({ type: 'positive', message: 'Cập nhật khu vực thành công' })
    } else {
      await areaService.createArea({
        code: model.code,
        name: model.name,
        description: model.description
      })
      Notify.create({ type: 'positive', message: 'Tạo khu vực thành công' })
    }
    emit('saved')
    close()
  } catch (err) {
    console.error(err)
    const msg = err?.response?.data || err?.message || 'Lỗi khi lưu khu vực'
    Notify.create({ type: 'negative', message: String(msg) })
  } finally {
    saving.value = false
  }
}
</script>
