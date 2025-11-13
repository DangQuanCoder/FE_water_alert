// src/boot/axios.js
// Minimal, safe axios boot module
import axios from 'axios'

// dùng biến môi trường Vite; fallback về localhost nếu chưa set
const baseURL = import.meta.env.VITE_API_BASE || 'http://localhost:9000'

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' }
})

// attach token nếu có
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) {
    cfg.headers = cfg.headers || {}
    cfg.headers.Authorization = `Bearer ${token}`
  }
  return cfg
}, err => Promise.reject(err))

// NOTE: NO `export default` here — only named export `api`.
