// src/router/index.js
import { defineRouter } from '#q-app/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes'
import { useAuthStore } from 'stores/auth'

export default defineRouter(function () {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  Router.beforeEach((to, from, next) => {
    try {
      const auth = useAuthStore()

      // --- SỬA DÒNG NÀY ---
      // Thêm '/forgot-password' và '/reset-password' vào danh sách
      const publicPages = [
        '/',
        '/login',
        '/register',
        '/verify-otp',
        '/forgot-password',
        '/reset-password'
      ]

      if (publicPages.includes(to.path)) return next()

      // ... (phần dưới giữ nguyên)
      if (!auth?.token) {
        return next({ path: '/login', query: { redirect: to.fullPath } })
      }

      if (to.meta?.role) {
        const userRole = (auth.role || '').toString().toLowerCase()
        const allowed = Array.isArray(to.meta.role)
          ? to.meta.role.map(r => r.toString().toLowerCase())
          : [to.meta.role.toString().toLowerCase()]

        if (!allowed.includes(userRole)) {
          return next({ path: '/' })
        }
      }

      return next()
    } catch (err) {
      console.error('Router guard error:', err)
      return next({ path: '/login', query: { redirect: to.fullPath } })
    }
  })

  return Router
})
