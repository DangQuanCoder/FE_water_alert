// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from 'src/boot/axios'

export const useAuthStore = defineStore('auth', () => {
  // persisted in localStorage for simple session
  const token = ref(localStorage.getItem('token') || null)
  const role  = ref(localStorage.getItem('role') || null)
  const phone = ref(localStorage.getItem('phone') || null)
  // optional extra fields
  const userId = ref(localStorage.getItem('userId') || null)
  const fullName = ref(localStorage.getItem('fullName') || null)

  function setAuth({ token: t, role: r, phone: p, userId: id, fullName: name }) {
    token.value = t ?? null
    role.value = r ?? null
    phone.value = p ?? null
    userId.value = id ?? null
    fullName.value = name ?? null

    if (t) localStorage.setItem('token', t); else localStorage.removeItem('token')
    if (r) localStorage.setItem('role', r); else localStorage.removeItem('role')
    if (p) localStorage.setItem('phone', p); else localStorage.removeItem('phone')
    if (id) localStorage.setItem('userId', id); else localStorage.removeItem('userId')
    if (name) localStorage.setItem('fullName', name); else localStorage.removeItem('fullName')
  }

  function clearAuth() {
    token.value = null
    role.value = null
    phone.value = null
    userId.value = null
    fullName.value = null

    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('phone')
    localStorage.removeItem('userId')
    localStorage.removeItem('fullName')
  }

  async function logout() {
    try {
      // optional server logout - ignore errors
      await api.post('/api/auth/logout').catch(() => {})
    } catch {
      // ignore
    } finally {
      clearAuth()
    }
  }

  async function login(phoneInput, password) {
    try {
      const res = await api.post('/api/auth/login', { phone: phoneInput, password })

      // support both shapes: { success:true, token, role, user } or token string
      if (res.data?.success && res.data.token) {
        // if backend returns user info, pick id/fullname/phone
        const user = res.data.user || {}
        setAuth({
          token: res.data.token,
          role: res.data.role ?? role.value,
          phone: user.phone ?? phoneInput,
          userId: user.id ?? null,
          fullName: user.fullname ?? user.fullName ?? null
        })
        return res.data
      } else if (typeof res.data === 'string') {
        // older/backwards compat: token string
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

  async function requestPasswordReset(payload) {
    try {
      const res = await api.post('/api/auth/request-password-reset', payload)
      return res.data ?? { success: true }
    } catch (e) {
      return {
        success: false,
        message: e?.response?.data?.message || 'Gửi yêu cầu đặt lại mật khẩu thất bại'
      }
    }
  }
  
  async function resetPasswordByToken(tokenStr, newPassword) {
    try {
      const res = await api.post('/api/auth/reset-password', { token: tokenStr, newPassword })
      return res.data ?? { success: true }
    } catch (e) {
      return {
        success: false,
        message: e?.response?.data?.message || 'Đặt lại mật khẩu thất bại'
      }
    }
  }

  async function resetPasswordByOtp(phoneNumber, otp, newPassword) {
    try {
      const res = await api.post('/api/auth/reset-password-otp', { phone: phoneNumber, otp, newPassword })
      return res.data ?? { success: true }
    } catch (e) {
      return {
        success: false,
        message: e?.response?.data?.message || 'Đặt lại mật khẩu thất bại (OTP)'
      }
    }
  }

  async function fetchProfile() {
    try {
      // try common endpoint
      const res = await api.get('/api/users/me').catch(() => api.get('/api/auth/me'))
      if (res?.data) {
        // try to update auth info if server returns user
        const u = res.data
        setAuth({
          token: token.value,
          role: u.role ?? role.value,
          phone: u.phone ?? phone.value,
          userId: u.id ?? userId.value,
          fullName: u.fullName ?? u.fullname ?? fullName.value
        })
        return { success: true, user: u }
      }
      return { success: false }
    } catch {
      return { success: false }
    }
  }

  return {
    // state
    token, role, phone, userId, fullName,

    // basic auth actions
    setAuth, clearAuth, logout, login, register, verifyOtp,

    // forgot/reset
    requestPasswordReset, resetPasswordByToken, resetPasswordByOtp,

    // misc
    fetchProfile
  }
})
