<template>
  <q-page class="q-pa-md">
    <q-card class="max-w-md mx-auto">
      <q-card-section>
        <div class="text-h6">Xác thực OTP</div>
        <div class="text-caption text-grey">Nhập mã OTP gửi đến số {{ phone }}</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="onVerify" class="q-gutter-md">
          <q-input v-model="otp" label="Mã OTP" maxlength="6" required />
          <div class="row q-gutter-sm q-mt-md">
            <q-btn type="submit" label="Xác thực" color="primary" />
            <q-btn flat label="Quay lại Đăng ký" to="/register" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'
import { Notify } from 'quasar'

const route = useRoute()
const router = useRouter()
const store = useAuthStore()

const phone = route.query.phone || ''
const otp = ref('')

async function onVerify () {
  try {
    console.log('Xác thực OTP:', otp.value)
    const res = await store.verifyOtp(phone, otp.value)
    console.log('verify response:', res)

    if (res.success) {
      Notify.create({ type: 'positive', message: 'Xác thực thành công!' })
      if (res.role === 'admin') router.push('/admin')
      else router.push('/user')
    } else {
      Notify.create({ type: 'negative', message: res.message || 'OTP không đúng' })
    }
  } catch (err) {
    console.error('Lỗi xác thực OTP:', err)
    Notify.create({ type: 'negative', message: 'Lỗi hệ thống khi xác thực OTP.' })
  }
}
</script>
