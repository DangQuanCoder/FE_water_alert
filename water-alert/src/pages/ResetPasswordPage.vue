<template>
  <q-page class="q-pa-md">
    <q-card class="q-pa-md q-mx-auto" style="max-width:520px">
      <div class="text-h6 q-mb-md">Đặt mật khẩu mới</div>

      <q-form @submit.prevent="onSubmit" class="q-gutter-md">
        <!-- token flow (default) -->
        <q-input v-model="token" label="Mã/Token (từ email/link)" />

        <q-input
          v-model="newPassword"
          label="Mật khẩu mới"
          type="password"
          :rules="[v => (!!v && v.length >= 6) || 'Mật khẩu ít nhất 6 ký tự']"
          lazy-rules
        />

        <q-input
          v-model="confirmPassword"
          label="Nhập lại mật khẩu"
          type="password"
          :rules="[v => v === newPassword || 'Mật khẩu không trùng']"
          lazy-rules
        />

        <div class="row items-center q-pt-md">
          <q-btn label="Lưu mật khẩu mới" color="primary" :loading="loading" type="submit" />
          <q-btn flat label="Hủy" class="q-ml-sm" @click="goLogin" />
        </div>
      </q-form>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Notify } from 'quasar'
import * as authService from 'src/services/authService'

const router = useRouter()
const route = useRoute()
const token = ref(route.query.token || '')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)

function goLogin() { router.push('/login') }

async function onSubmit() {
  if (newPassword.value.length < 6) {
    Notify.create({ type: 'negative', message: 'Mật khẩu cần ít nhất 6 ký tự' })
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    Notify.create({ type: 'negative', message: 'Mật khẩu không trùng' })
    return
  }

  loading.value = true
  try {
    if (!token.value) {
      Notify.create({ type: 'negative', message: 'Token không hợp lệ' })
      loading.value = false
      return
    }
    await authService.resetPasswordByToken(token.value, newPassword.value)

    Notify.create({ type: 'positive', message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' })
    router.push('/login')
  } catch (err) {
    console.error('resetPassword error', err)
    const msg = err?.response?.data?.message || err?.message || 'Đổi mật khẩu thất bại'
    Notify.create({ type: 'negative', message: msg })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.q-page { display:flex; justify-content:center; align-items:flex-start; }
</style>
