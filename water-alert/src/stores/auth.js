// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from 'boot/axios' // đảm bảo src/boot/axios.js export { api }

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null)
  const role  = ref(localStorage.getItem('role') || null)
  const phone = ref(localStorage.getItem('phone') || null)

  function setAuth({ token: t, role: r, phone: p }) {
    token.value = t; role.value = r; phone.value = p
    localStorage.setItem('token', t)
    localStorage.setItem('role', r)
    localStorage.setItem('phone', p)
  }

  function clearAuth() {
    token.value = null; role.value = null; phone.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('phone')
  }

  // Đây là cờ test: bật true nếu muốn chạy flow mock (không cần backend)
  const mockMode = true

  async function register(payload) {
    // payload = { username, password, email, phone }
    if (mockMode) {
      // trả về cấu trúc giống backend: success + message
      return { success: true, message: 'OTP đã gửi (mock)' }
    }
    try {
      const res = await api.post('/auth/register', payload)
      return res.data
    } catch (err) {
      console.error('register error', err)
      return { success: false, message: err?.response?.data?.message || 'Lỗi khi gọi register' }
    }
  }

  async function verifyOtp(phoneInput, otp) {
    if (mockMode) {
      if (otp === '1234') {
        const fake = { token: 'mock-token-abc', role: phoneInput === 'admin' ? 'admin' : 'user' }
        setAuth({ token: fake.token, role: fake.role, phone: phoneInput })
        return { success: true, token: fake.token, role: fake.role }
      } else {
        return { success: false, message: 'OTP sai (mock). Dùng 1234 để thử.' }
      }
    }
    try {
      const res = await api.post('/auth/verify-otp', { phone: phoneInput, otp })
      if (res.data?.success) setAuth({ token: res.data.token, role: res.data.role, phone: phoneInput })
      return res.data
    } catch (err) {
      console.error('verifyOtp error', err)
      return { success: false, message: err?.response?.data?.message || 'Lỗi khi xác thực OTP' }
    }
  }

  async function login(phoneInput, password) {
    if (mockMode) {
      if (password === 'password') {
        const fake = { token: 'mock-token-abc', role: phoneInput === 'admin' ? 'admin' : 'user' }
        setAuth({ token: fake.token, role: fake.role, phone: phoneInput })
        return { success: true, token: fake.token, role: fake.role }
      } else {
        return { success: false, message: 'Sai mật khẩu (mock). Dùng password để thử.' }
      }
    }
    try {
      const res = await api.post('/auth/login', { phone: phoneInput, password })
      if (res.data?.success) setAuth({ token: res.data.token, role: res.data.role, phone: phoneInput })
      return res.data
    } catch (err) {
      console.error('login error', err)
      return { success: false, message: err?.response?.data?.message || 'Lỗi khi đăng nhập' }
    }
  }

  return { token, role, phone, setAuth, clearAuth, register, verifyOtp, login }
})
