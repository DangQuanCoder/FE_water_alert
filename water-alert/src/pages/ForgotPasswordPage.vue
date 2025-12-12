<template>
  <q-page class="q-pa-md">
    <q-card class="q-pa-md q-mx-auto" style="max-width:520px">
      <div class="text-h6 q-mb-md">Quên mật khẩu</div>

      <q-form @submit.prevent="onSubmit" class="q-gutter-md">
        <q-input
          v-model="identifier"
          label="Email hoặc Số điện thoại"
          :rules="[v => !!v || 'Vui lòng nhập email hoặc số điện thoại']"
          lazy-rules
        />

        <div class="row items-center q-pt-md">
          <q-btn label="Gửi yêu cầu" color="primary" :loading="loading" type="submit" />
          <q-btn flat label="Hủy" class="q-ml-sm" @click="goLogin" />
        </div>
      </q-form>

      <q-separator class="q-mt-md q-mb-md" />
      <div class="text-caption">
        Nếu thông tin tồn tại, bạn sẽ nhận được hướng dẫn (email/SMS). Vui lòng kiểm tra hộp thư đến hoặc tin nhắn.
      </div>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Notify } from 'quasar'
import * as authService from 'src/services/authService'

const router = useRouter()
const identifier = ref('')
const loading = ref(false)

function goLogin() {
  router.push('/login')
}

async function onSubmit() {
  const val = (identifier.value || '').toString().trim()
  if (!val) {
    Notify.create({ type: 'negative', message: 'Vui lòng nhập email hoặc số điện thoại' })
    return
  }

  loading.value = true
  try {
    const isEmail = val.includes('@')
    const payload = isEmail ? { email: val } : { phone: val }

    await authService.requestPasswordReset(payload)

    Notify.create({
      type: 'positive',
      message:
        'Nếu thông tin hợp lệ, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra email/SMS.'
    })

    router.push('/login')
  } catch (err) {
    console.error('requestPasswordReset error', err)
    const msg = err?.response?.data?.message || err?.message || 'Gửi yêu cầu thất bại'
    Notify.create({ type: 'negative', message: msg })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.q-page { display:flex; justify-content:center; align-items:flex-start; }
</style>
