<template>
  <q-page class="q-pa-md flex flex-center">
    <q-card style="width: 100%; max-width: 400px">
      <q-card-section>
        <div class="text-h6 text-center">Đăng nhập</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="onLogin" class="q-gutter-md">
          <q-input
            v-model="phone"
            label="Số điện thoại"
            :rules="[val => !!val || 'Vui lòng nhập số điện thoại']"
            lazy-rules
          />

          <q-input
            v-model="password"
            type="password"
            label="Mật khẩu"
            :rules="[val => !!val || 'Vui lòng nhập mật khẩu']"
            lazy-rules
          />

          <div class="column q-gutter-sm q-mt-md">
            <q-btn type="submit" label="ĐĂNG NHẬP" color="primary" :loading="loading" />

            <div class="row justify-between items-center">
              <q-btn flat no-caps label="Đăng ký tài khoản" color="primary" to="/register" />

              <q-btn flat no-caps label="Quên mật khẩu?" color="grey-8" to="/forgot-password" />
            </div>
          </div>
        </q-form>
      </q-card-section>
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
const password = ref('')
const loading = ref(false)

async function onLogin() {
  loading.value = true
  try {
    const res = await authStore.login(phone.value, password.value)

    if (res.success) {
      Notify.create({ type: 'positive', message: 'Đăng nhập thành công' })
      router.push('/') // Chuyển về trang chủ sau khi đăng nhập
    } else {
      Notify.create({ type: 'negative', message: res.message || 'Sai thông tin đăng nhập' })
    }
  } catch {
    Notify.create({ type: 'negative', message: 'Lỗi kết nối' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Không cần CSS tailwind nữa vì đã dùng class của Quasar */
</style>
