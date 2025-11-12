const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },

      // Auth pages
      { path: 'register', component: () => import('pages/RegisterPage.vue') },
      { path: 'verify-otp', component: () => import('pages/VerifyOTPPage.vue') },
      { path: 'login', component: () => import('pages/LoginPage.vue') },

      // App pages
      { path: 'map', component: () => import('pages/MapPage.vue') },
      { path: 'history', component: () => import('pages/HistoryPage.vue') },

      // Role-protected pages (meta.role)
      { path: 'admin', component: () => import('pages/AdminPage.vue'), meta: { role: ['admin'] } },
      { path: 'user', component: () => import('pages/UserPage.vue'), meta: { role: ['user','admin'] } }
    ]
  },

  // Always leave this as last one
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
