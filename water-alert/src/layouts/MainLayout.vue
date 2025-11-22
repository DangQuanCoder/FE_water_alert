<!-- src/layouts/MainLayout.vue -->
<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="leftDrawerOpen = !leftDrawerOpen" />
        <q-toolbar-title>Water Alert</q-toolbar-title>

        <div class="row items-center q-gutter-sm">
          <div v-if="auth.phone" class="text-subtitle2 q-mr-sm">
            {{ auth.phone }} <span class="text-caption text-grey-6">({{ auth.role }})</span>
          </div>

          <q-btn flat round dense icon="logout" label="Đăng xuất" @click="onLogout" />
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list padding>
        <q-item clickable v-ripple to="/">
          <q-item-section avatar><q-icon name="home" /></q-item-section>
          <q-item-section>Trang chủ</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/user">
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

const isAdmin = computed(() => (auth.role || '').toString().toLowerCase() === 'admin')

function onLogout() {
  auth.logout()
  Notify.create({ type: 'positive', message: 'Đăng xuất thành công' })
  router.push({ path: '/login' })
}
</script>

<style scoped>
/* custom styles if needed */
</style>
