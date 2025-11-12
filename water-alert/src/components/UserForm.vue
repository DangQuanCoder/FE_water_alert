<template>
  <q-card>
    <q-card-section>
      <div class="text-h6">{{ mode === 'edit' ? 'Chỉnh sửa người dùng' : 'Thêm người dùng' }}</div>
    </q-card-section>

    <q-card-section>
      <q-form @submit.prevent="onSubmit" class="q-gutter-md">
        <q-input v-model="local.username" label="Tên tài khoản" :rules="[v => !!v || 'Bắt buộc']" />
        <q-input v-model="local.email" label="Email" type="email" />
        <q-input v-model="local.phone" label="Số điện thoại" />
        <q-select v-model="local.role" :options="roles" label="Vai trò" />
      </q-form>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn flat label="Hủy" color="primary" v-close-popup @click="$emit('cancel')" />
      <q-btn label="Lưu" color="primary" @click="onSubmit" />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { Notify } from 'quasar'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  mode: { type: String, default: 'add' }
})
const emit = defineEmits(['save','cancel'])

const roles = ['user','admin']
const local = reactive({ username: '', email: '', phone: '', role: 'user' })

watch(() => props.modelValue, (v) => {
  if (v && Object.keys(v).length) {
    local.username = v.username || ''
    local.email = v.email || ''
    local.phone = v.phone || ''
    local.role = v.role || 'user'
  } else {
    local.username = ''
    local.email = ''
    local.phone = ''
    local.role = 'user'
  }
}, { immediate: true })

function onSubmit() {
  if (!local.username) {
    Notify.create({ type: 'negative', message: 'Vui lòng nhập tên tài khoản' })
    return
  }
  emit('save', { username: local.username, email: local.email, phone: local.phone, role: local.role })
}
</script>
