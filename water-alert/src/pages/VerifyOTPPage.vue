<template>
  <q-page class="q-pa-md">
    <q-card class="max-w-md mx-auto">
      <q-card-section>
        <div class="text-h6">Xác thực OTP</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="onVerify" class="q-gutter-md">
          <q-input v-model="phone" label="Số điện thoại" readonly />
          <q-input v-model="otp" label="OTP" maxlength="6" :rules="[v => !!v || 'OTP bắt buộc']" />
          <div class="row q-mt-md">
            <q-btn type="submit" label="Xác nhận OTP" color="primary" />
            <q-btn flat label="Quay lại đăng ký" @click="goRegister" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from 'stores/auth'
import { Notify } from 'quasar'

const router = useRouter()
const route = useRoute()
const store = useAuthStore()

const otp = ref('')
const phone = ref('')

// pendingRegister contains username, fullName, email, phone, password
let pendingRegister = null

onMounted(() => {
  phone.value = route.query.phone || ''

  const raw = localStorage.getItem('pendingRegister')
  if (raw) {
    try {
      pendingRegister = JSON.parse(raw)
    } catch {
      // invalid JSON or corrupt -> ignore
      pendingRegister = null
    }

    if (!phone.value && pendingRegister?.phone) {
      phone.value = pendingRegister.phone
    }
  }
})

function goRegister () {
  router.push('/register')
}

async function onVerify () {
  if (!otp.value) {
    Notify.create({ type: 'negative', message: 'Vui lòng nhập OTP' })
    return
  }

  if (!pendingRegister) {
    Notify.create({ type: 'negative', message: 'Không có dữ liệu đăng ký. Vui lòng đăng ký lại.' })
    router.push('/register')
    return
  }

  const payload = {
    phone: phone.value,
    otp: otp.value,
    username: pendingRegister.username,
    fullName: pendingRegister.fullName,
    email: pendingRegister.email,
    password: pendingRegister.password
  }

  try {
    const res = await store.verifyOtp(payload)
    console.log('verify res', res)

    if (res?.success) {
      localStorage.removeItem('pendingRegister')
      Notify.create({ type: 'positive', message: res.message || 'Đã xác thực thành công' })
      router.push('/login')
    } else {
      // backend may return errors array from validation or message
      const message = res?.message || (Array.isArray(res?.errors) ? res.errors.map(e => e.message).join(', ') : 'Xác thực thất bại')
      Notify.create({ type: 'negative', message })
    }
  } catch (err) {
    console.error('verify error', err)
    const msg = err?.response?.data?.message || err?.message || 'Lỗi khi gọi API xác thực'
    Notify.create({ type: 'negative', message: msg })
  }
}
</script>
