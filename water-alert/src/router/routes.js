// src/router/routes.js
const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      // Public pages
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: 'register', component: () => import('pages/RegisterPage.vue') },
      { path: 'verify-otp', component: () => import('pages/VerifyOTPPage.vue') },
      { path: 'login', component: () => import('pages/LoginPage.vue') },

      // App pages
      { path: 'map', component: () => import('pages/MapPage.vue') },
      { path: 'history', component: () => import('pages/HistoryPage.vue') },

      // Admin pages
      { path: 'admin', component: () => import('pages/AdminPage.vue'), meta: { role: ['admin'] } },
      { path: 'admin/users', component: () => import('pages/AdminUsersPage.vue'), meta: { role: ['admin'] } },

      // ✅ Devices admin page
      { path: 'admin/devices', component: () => import('pages/AdminDevicesPage.vue'), meta: { role: ['admin'] } },

      // ✅ Areas admin page
      { path: 'admin/areas', component: () => import('pages/AdminAreasPage.vue'), meta: { role: ['admin'] } },

      // User pages
      { path: 'user', component: () => import('pages/UserPage.vue'), meta: { role: ['user', 'admin'] } }
    ]
  },

  // Catch all
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
