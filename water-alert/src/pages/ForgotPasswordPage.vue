<template>
  <q-page class="q-pa-md flex flex-center">
    <q-card style="width: 100%; max-width: 500px; padding: 20px;">

      <div class="text-h5 q-mb-md text-center text-weight-bold">Quên mật khẩu</div>

      <q-form @submit.prevent="onSubmit" class="q-gutter-md">
        <q-input
          v-model="phone"
          label="Nhập số điện thoại của bạn"
          :rules="[v => !!v || 'Vui lòng nhập số điện thoại']"
          lazy-rules
          type="tel"
        />

        <div class="row items-center q-pt-md">
          <q-btn label="Gửi mã OTP" color="primary" :loading="loading" type="submit" />
          <q-btn flat label="Hủy" class="q-ml-sm" @click="goLogin" />
        </div>
      </q-form>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Notify } from 'quasar'
import { useAuthStore } from 'src/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const phone = ref('')
const loading = ref(false)

function goLogin() { router.push('/login') }

async function onSubmit() {
  const val = phone.value.trim()
  if (!val) return

  loading.value = true
  try {
    // Gọi API Backend
    const res = await authStore.requestPasswordReset({ phone: val })

    if (res.success) {
      Notify.create({ type: 'positive', message: 'OTP đã được gửi! Hãy kiểm tra điện thoại.' })
      // Chuyển sang trang nhập OTP, kèm theo số điện thoại
      router.push({ path: '/reset-password', query: { phone: val } })
    } else {
      Notify.create({ type: 'negative', message: res.message || 'Lỗi gửi OTP' })
    }
  } catch {
    Notify.create({ type: 'negative', message: 'Lỗi kết nối server' })
  } finally {
    loading.value = false
  }
}
</script>
<style scoped>
.q-page { display:flex; justify-content:center; align-items:flex-start; }
</style>
