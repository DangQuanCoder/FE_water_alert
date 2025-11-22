<template>
  <q-page class="q-pa-md">
    <q-card class="max-w-md mx-auto">
      <q-card-section>
        <div class="text-h6">Đăng ký</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="onSubmit" class="q-gutter-md">
          <q-input
            v-model="form.username"
            label="Tên tài khoản"
            :rules="[v => !!v || 'Bắt buộc']"
            required
          />

          <q-input
            v-model="form.fullName"
            label="Họ và tên"
            :rules="[v => !!v || 'Bắt buộc']"
            required
          />

          <q-input
            v-model="form.password"
            type="password"
            label="Mật khẩu"
            :rules="[
              v => !!v || 'Bắt buộc',
              v => v.length >= 6 || 'Tối thiểu 6 ký tự'
            ]"
            required
          />

          <q-input
            v-model="form.email"
            type="email"
            label="Email"
            :rules="[
              v => !!v || 'Email bắt buộc',
              v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email không hợp lệ'
            ]"
            required
          />

          <q-input
            v-model="form.phone"
            label="Số điện thoại"
            :rules="[v => !!v || 'Bắt buộc']"
            required
          />

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
  fullName: '',
  password: '',
  email: '',
  phone: ''
})

async function onSubmit () {
  try {
    // Manual basic validation
    if (!form.username || !form.fullName || !form.password || !form.email || !form.phone) {
      Notify.create({ type: 'negative', message: 'Vui lòng điền đầy đủ thông tin' })
      return
    }

    console.log('Register payload=', { ...form })
    const res = await store.register({ ...form })
    console.log('register response:', res)

    if (res.success) {
      // Save pending register data for Verify OTP Page
      localStorage.setItem('pendingRegister', JSON.stringify({ ...form }))

      Notify.create({
        type: 'positive',
        message: res.message || 'OTP đã gửi'
      })

      router.push({
        path: '/verify-otp',
        query: { phone: form.phone }
      })
    } else {
      Notify.create({
        type: 'negative',
        message: res.message || 'Đăng ký thất bại'
      })
    }
  } catch (err) {
    console.error('Lỗi onSubmit:', err)
    Notify.create({
      type: 'negative',
      message: 'Lỗi hệ thống. Kiểm tra Console.'
    })
  }
}
</script>
