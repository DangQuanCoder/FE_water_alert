<template>
  <q-page class="q-pa-md">
    <q-card class="max-w-md mx-auto">
      <q-card-section>
        <div class="text-h6">Đăng nhập</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="onLogin" class="q-gutter-md">
          <q-input v-model="phone" label="Số điện thoại" required />
          <q-input v-model="password" type="password" label="Mật khẩu" required />

          <div class="row items-center q-gutter-sm q-mt-md">
            <q-btn type="submit" label="ĐĂNG NHẬP" color="primary" />
            <q-btn flat label="ĐĂNG KÝ" to="/register" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'
import { Notify } from 'quasar'

const router = useRouter()
const store = useAuthStore()

const phone = ref('')
const password = ref('')

async function onLogin () {
  try {
    console.log('Đăng nhập với:', phone.value, password.value)
    const res = await store.login(phone.value, password.value)
    console.log('login response:', res)

    if (res.success) {
      Notify.create({ type: 'positive', message: 'Đăng nhập thành công!' })
      if (res.role === 'admin') router.push('/admin')
      else router.push('/user')
    } else {
      Notify.create({ type: 'negative', message: res.message || 'Đăng nhập thất bại' })
    }
  } catch (err) {
    console.error('Lỗi đăng nhập:', err)
    Notify.create({ type: 'negative', message: 'Lỗi hệ thống. Kiểm tra Console.' })
  }
}
</script>
