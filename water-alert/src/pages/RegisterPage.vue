<template>
  <q-page class="q-pa-md">
    <q-card class="max-w-md mx-auto">
      <q-card-section>
        <div class="text-h6">Đăng ký</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="onSubmit" class="q-gutter-md">
          <q-input v-model="form.username" label="Tên tài khoản" required />
          <q-input v-model="form.password" type="password" label="Mật khẩu" required />
          <q-input v-model="form.email" type="email" label="Email" />
          <q-input v-model="form.phone" label="Số điện thoại" required />

          <div class="row items-center q-gutter-sm q-mt-md">
            <q-btn type="submit" label="ĐĂNG KÝ & GỬI OTP" color="primary" />
            <q-btn flat label="ĐĂNG NHẬP" to="/login" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'
import { Notify } from 'quasar'

const router = useRouter()
const store = useAuthStore()

const form = reactive({
  username: '',
  password: '',
  email: '',
  phone: ''
})

async function onSubmit () {
  try {
    console.log('onSubmit gọi, dữ liệu=', { ...form })
    const res = await store.register({ ...form })
    console.log('register response:', res)
    if (res.success) {
      Notify.create({ type: 'positive', message: res.message || 'OTP đã gửi' })
      router.push({ path: '/verify-otp', query: { phone: form.phone } })
    } else {
      Notify.create({ type: 'negative', message: res.message || 'Đăng ký thất bại' })
    }
  } catch (err) {
    console.error('Lỗi onSubmit:', err)
    Notify.create({ type: 'negative', message: 'Lỗi hệ thống. Kiểm tra Console.' })
  }
}
</script>
