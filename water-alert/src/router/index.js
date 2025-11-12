import { defineRouter } from '#q-app/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes'

// Import auth store (Pinia)
import { useAuthStore } from 'stores/auth'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  // ---------------------------
  // Global route guard (before each navigation)
  // ---------------------------
  Router.beforeEach((to, from, next) => {
    try {
      const auth = useAuthStore()

      // pages công khai (không cần login)
      const publicPages = ['/', '/login', '/register', '/verify-otp']

      // nếu là trang công khai -> cho qua
      if (publicPages.includes(to.path)) {
        return next()
      }

      // nếu chưa login -> redirect về login
      if (!auth.token) {
        return next({ path: '/login', query: { redirect: to.fullPath } })
      }

      // nếu route yêu cầu role (meta.role), kiểm tra role
      if (to.meta?.role && !to.meta.role.includes(auth.role)) {
        // không có quyền -> quay về trang chủ hoặc hiển thị thông báo
        return next({ path: '/' })
      }

      // cho phép truy cập
      return next()
    } catch (err) {
      console.error('Router guard error:', err)
      return next({ path: '/login', query: { redirect: to.fullPath } })
    }
  })

  return Router
})
