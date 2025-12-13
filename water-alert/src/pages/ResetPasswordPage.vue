<template>
  <q-page class="q-pa-md">
    <q-card class="q-pa-md q-mx-auto" style="max-width:520px">
      <div class="text-h6 q-mb-md">Đặt lại mật khẩu</div>

      <div v-if="phone" class="text-subtitle2 text-grey-7 q-mb-md">
        Mã xác thực gửi tới: <strong>{{ phone }}</strong>
      </div>

      <q-form @submit.prevent="onSubmit" class="q-gutter-md">

        <q-input
          v-model="otpCode"
          label="Nhập mã OTP (6 số)"
          mask="######"
          :rules="[v => !!v || 'Vui lòng nhập OTP']"
        />

        <q-input
          v-model="newPassword"
          label="Mật khẩu mới"
          type="password"
          :rules="[v => (!!v && v.length >= 6) || 'Mật khẩu phải từ 6 ký tự']"
        />

        <q-input
          v-model="confirmPassword"
          label="Nhập lại mật khẩu"
          type="password"
          :rules="[v => v === newPassword || 'Mật khẩu xác nhận không khớp']"
        />

        <div class="row items-center q-pt-md">
          <q-btn label="Đổi mật khẩu" color="primary" :loading="loading" type="submit" />
          <q-btn flat label="Quay lại" class="q-ml-sm" @click="goLogin" />
        </div>
      </q-form>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Notify } from 'quasar'
import { useAuthStore } from 'src/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Lấy SĐT từ URL (do trang trước truyền sang)
const phone = ref(route.query.phone || '')
const otpCode = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)

function goLogin() { router.push('/login') }

async function onSubmit() {
  if (!phone.value) {
    Notify.create({ type: 'negative', message: 'Thiếu thông tin số điện thoại' })
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    Notify.create({ type: 'negative', message: 'Mật khẩu không trùng khớp' })
    return
  }

  loading.value = true
  try {
    // Gọi API Verify OTP & Đổi pass
    const res = await authStore.resetPasswordByOtp(phone.value, otpCode.value, newPassword.value)

    if (res.success) {
      Notify.create({ type: 'positive', message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.' })
      router.push('/login')
    } else {
      Notify.create({ type: 'negative', message: res.message || 'OTP sai hoặc hết hạn' })
    }
  } catch {
    Notify.create({ type: 'negative', message: 'Lỗi hệ thống' })
  } finally {
    loading.value = false
  }
}
</script>
<style scoped>
.q-page { display:flex; justify-content:center; align-items:flex-start; }
</style>
