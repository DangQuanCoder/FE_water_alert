// src/boot/axios.js
import { boot } from 'quasar/wrappers'
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Auto attach token and log it for debug
api.interceptors.request.use(
  (cfg) => {
    try {
      const token =
        localStorage.getItem('token') ||
        localStorage.getItem('accessToken') ||
        localStorage.getItem('jwt')
      if (token) {
        cfg.headers.Authorization = `Bearer ${token}`
      }
      console.log('[api.request] ', cfg.method?.toUpperCase(), cfg.url, ' Authorization:', !!token)
    } catch {
      // intentionally ignore
    }
    return cfg
  },
  (err) => Promise.reject(err),
)

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('[api.response.error]', err?.response?.status, err?.response?.data)
    return Promise.reject(err)
  },
)

export default boot(({ app }) => {
  app.config.globalProperties.$api = api
})

export { api }
