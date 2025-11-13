// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from 'boot/axios' // axios boot file

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null)
  const role  = ref(localStorage.getItem('role') || null)
  const phone = ref(localStorage.getItem('phone') || null)

  function setAuth({ token: t, role: r, phone: p }) {
    token.value = t; role.value = r; phone.value = p
    if (t) localStorage.setItem('token', t); else localStorage.removeItem('token')
    if (r) localStorage.setItem('role', r); else localStorage.removeItem('role')
    if (p) localStorage.setItem('phone', p); else localStorage.removeItem('phone')
  }

  function clearAuth() {
    token.value = null; role.value = null; phone.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('phone')
  }

  // convenience: logout does any server-side logout then clear local
  async function logout() {
    try {
      // optional: notify backend for logout/invalidate token if endpoint exists
      // await api.post('/logout')
    } catch (err) {
      console.warn('Logout API failed:', err.message)
    } finally {
      clearAuth()
    }
  }

  // NOTE: mockMode etc. -- keep existing methods (register/verify/login) as before
  const mockMode = true

  async function register(payload) {
    if (mockMode) {
      return { success: true, message: 'OTP đã gửi (mock)' }
    }
    try {
      const res = await api.post('/register', payload)
      return res.data
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || 'Lỗi khi gọi register' }
    }
  }

  async function verifyOtp(phoneInput, otp, payload) {
    if (mockMode) {
      if (otp === '1234') {
        const fake = { token: 'mock-token-abc', role: phoneInput === 'admin' ? 'admin' : 'user' }
        setAuth({ token: fake.token, role: fake.role, phone: phoneInput })
        return { success: true, token: fake.token, role: fake.role }
      } else {
        return { success: false, message: 'OTP sai (mock).' }
      }
    }
    try {
      const url = `/verify-otp?phone=${encodeURIComponent(phoneInput)}&otp=${encodeURIComponent(otp)}`
      const res = await api.post(url, payload)
      if (res.data?.success) setAuth({ token: res.data.token, role: res.data.role, phone: phoneInput })
      return res.data
    } catch (err) {
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
        return { success: false, message: 'Sai mật khẩu (mock).' }
      }
    }
    try {
      const res = await api.post('/login', { phone: phoneInput, password })
      if (res.data?.success) {
        setAuth({ token: res.data.token, role: res.data.role, phone: phoneInput })
        return res.data
      } else if (typeof res.data === 'string' && res.data.length) {
        // legacy: backend returned token string only
        setAuth({ token: res.data, role: 'user', phone: phoneInput })
        return { success: true, token: res.data, role: 'user' }
      }
      return res.data
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || 'Lỗi khi đăng nhập' }
    }
  }

  return { token, role, phone, setAuth, clearAuth, logout, register, verifyOtp, login }
})
