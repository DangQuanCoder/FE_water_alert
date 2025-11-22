// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from 'src/boot/axios'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null)
  const role  = ref(localStorage.getItem('role') || null)
  const phone = ref(localStorage.getItem('phone') || null)

  function setAuth({ token: t, role: r, phone: p }) {
    token.value = t ?? null
    role.value = r ?? null
    phone.value = p ?? null

    if (t) localStorage.setItem('token', t); else localStorage.removeItem('token')
    if (r) localStorage.setItem('role', r); else localStorage.removeItem('role')
    if (p) localStorage.setItem('phone', p); else localStorage.removeItem('phone')
  }

  function clearAuth() {
    token.value = null
    role.value = null
    phone.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('phone')
  }

  async function logout() {
    try {
      // optional: await api.post('/api/auth/logout')
    } catch {
      // ignore
    } finally {
      clearAuth()
    }
  }

  async function login(phoneInput, password) {
    try {
      const res = await api.post('/api/auth/login', { phone: phoneInput, password })

      if (res.data?.success && res.data.token) {
        setAuth({ token: res.data.token, role: res.data.role, phone: phoneInput })
        return res.data
      }
      else if (typeof res.data === 'string') {
        setAuth({ token: res.data, role: 'USER', phone: phoneInput })
        return { success: true, token: res.data, role: 'USER' }
      }

      return { success: false, message: res.data?.message || 'Đăng nhập thất bại' }

    } catch (e) {
      return {
        success: false,
        message: e?.response?.data?.message || 'Lỗi khi đăng nhập'
      }
    }
  }

  async function register(payload) {
    try {
      const res = await api.post('/api/auth/register', payload)
      return res.data
    } catch (e) {
      return { success: false, message: e?.response?.data?.message || 'Lỗi khi đăng ký' }
    }
  }

  async function verifyOtp(payload) {
    try {
      const res = await api.post('/api/auth/verify-otp', payload)
      return res.data
    } catch (e) {
      return {
        success: false,
        message: e?.response?.data?.message || 'Xác thực OTP thất bại',
        errors: e?.response?.data?.errors || null
      }
    }
  }

  return {
    token, role, phone,
    setAuth,
    clearAuth,
    logout,
    login,
    register,
    verifyOtp
  }
})
