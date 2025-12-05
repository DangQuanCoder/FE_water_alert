<!-- src/layouts/MainLayout.vue -->
<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="leftDrawerOpen = !leftDrawerOpen" />
        <q-toolbar-title>Water Alert</q-toolbar-title>

        <div class="row items-center q-gutter-sm">
          <!-- If logged in show phone + role and logout -->
          <div v-if="isLoggedIn" class="text-subtitle2 q-mr-sm">
            {{ auth.phone }} <span class="text-caption text-grey-6">({{ auth.role }})</span>
          </div>

          <q-btn
            v-if="!isLoggedIn"
            flat
            dense
            round
            icon="login"
            label="Đăng nhập"
            @click="goLogin"
          />

          <q-btn
            v-else
            flat
            dense
            round
            icon="logout"
            label="Đăng xuất"
            @click="onLogout"
          />
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list padding>
        <q-item clickable v-ripple to="/">
          <q-item-section avatar><q-icon name="home" /></q-item-section>
          <q-item-section>Trang chủ</q-item-section>
        </q-item>

        <!-- show User menu only when logged in -->
        <q-item clickable v-ripple to="/user" v-if="isLoggedIn">
          <q-item-section avatar><q-icon name="person" /></q-item-section>
          <q-item-section>User</q-item-section>
        </q-item>

        <!-- Admin menu: only visible to admin (case-insensitive) -->
        <q-item clickable v-ripple to="/admin" v-if="isAdmin">
          <q-item-section avatar><q-icon name="admin_panel_settings" /></q-item-section>
          <q-item-section>Admin</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/admin/users" v-if="isAdmin">
          <q-item-section avatar><q-icon name="supervisor_account" /></q-item-section>
          <q-item-section>Quản lý người dùng</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/admin/areas" v-if="isAdmin">
          <q-item-section avatar><q-icon name="map" /></q-item-section>
          <q-item-section>Quản lý khu vực</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/admin/devices" v-if="isAdmin">
          <q-item-section avatar><q-icon name="devices" /></q-item-section>
          <q-item-section>Quản lý thiết bị</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'
import { Notify } from 'quasar'

const leftDrawerOpen = ref(false)
const router = useRouter()
const auth = useAuthStore()

// consider logged in when token exists (safer than phone)
const isLoggedIn = computed(() => !!(auth.token))

// admin if role equals 'admin' (case-insensitive) and user is logged in
const isAdmin = computed(() => isLoggedIn.value && (String(auth.role || '').toLowerCase() === 'admin'))

function onLogout() {
  auth.logout()
  Notify.create({ type: 'positive', message: 'Đăng xuất thành công' })
  router.push({ path: '/login' })
}

function goLogin() {
  router.push({ path: '/login' })
}
</script>

<style scoped>
/* custom styles if needed */
</style>
