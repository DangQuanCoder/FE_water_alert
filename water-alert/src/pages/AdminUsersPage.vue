<!-- src/pages/AdminUsersPage.vue -->
<template>
  <q-page class="q-pa-md">
    <q-card flat>
      <q-card-section class="row items-center">
        <div class="text-h6">Quản lý người dùng</div>
        <q-space />
      </q-card-section>

      <q-separator />

      <!-- Search bar -->
      <q-card-section>
        <div class="row items-center q-col-gutter-sm">
          <q-input
            dense
            debounce="300"
            v-model="searchQuery"
            placeholder="Tìm theo id, username, email, phone..."
            clearable
            outlined
            class="col-12 col-md-6"
            @input="onSearchInput"
          >
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>

          <q-select
            dense
            v-model="filterRole"
            :options="roleFilterOptions"
            outlined
            class="col-12 col-md-3"
            emit-value
            map-options
            clearable
            placeholder="Lọc theo role"
            @input="onSearchInput"
          />

          <q-btn dense flat icon="refresh" @click="loadUsers" title="Làm mới" />
        </div>
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="filteredUsers"
          :columns="columns"
          row-key="id"
          flat
          bordered
          :loading="loading"
        >
          <template v-slot:body-cell-actions="props">
            <q-td align="center">
              <q-btn dense flat icon="edit" color="primary" @click="openEdit(props.row)" />
              <q-btn
                dense
                flat
                icon="delete"
                color="negative"
                :disable="isDeleteDisabled(props.row)"
                :loading="deletingIds.has(String(props.row.id))"
                @click="confirmDelete(props.row)"
              />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <!-- Edit dialog -->
    <q-dialog v-model="dialog">
      <q-card style="min-width: 420px">
        <q-card-section>
          <div class="text-h6">{{ editMode ? 'Sửa người dùng' : 'Tạo người dùng' }}</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit.prevent="save">
            <q-input v-model="form.username" label="Username" required />
            <q-input v-model="form.fullName" label="Họ và tên" required />
            <q-input v-model="form.email" type="email" label="Email" />
            <q-input v-model="form.phone" label="Số điện thoại" />
            <q-select v-model="form.role" :options="roleOptions" label="Role" required />
            <div class="row justify-end q-mt-md">
              <q-btn flat label="Hủy" v-close-popup @click="cancelEdit" />
              <q-btn color="primary" label="Lưu" type="submit" :loading="saving" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { Notify, Dialog } from 'quasar'
import * as userService from 'src/services/userAdminService'
import { useAuthStore } from 'stores/auth'
import { useRouter } from 'vue-router'

const router = useRouter()
const store = useAuthStore()

// guard UI: if not admin, redirect
if (!store.role || String(store.role).toLowerCase() !== 'admin') {
  Notify.create({ type: 'negative', message: 'Bạn không có quyền truy cập trang này' })
  router.push('/')
}

/* state */
const users = ref([])
const loading = ref(false)
const dialog = ref(false)
const editMode = ref(false)
const saving = ref(false)
const deletingIds = ref(new Set())

const form = reactive({
  id: null,
  username: '',
  fullName: '',
  email: '',
  phone: '',
  role: 'USER',
})

const columns = [
  { name: 'id', label: 'ID', field: 'id', sortable: true },
  { name: 'username', label: 'Username', field: 'username' },
  { name: 'fullName', label: 'Họ và tên', field: 'fullName' },
  { name: 'email', label: 'Email', field: 'email' },
  { name: 'phone', label: 'Phone', field: 'phone' },
  { name: 'role', label: 'Role', field: 'role' },
  { name: 'actions', label: 'Actions', field: 'actions' },
]

const roleOptions = [
  { label: 'USER', value: 'USER' },
  { label: 'ADMIN', value: 'ADMIN' },
]

/* search/filter state */
const searchQuery = ref('')
const filterRole = ref(null)
const roleFilterOptions = [
  { label: 'Tất cả', value: null },
  { label: 'USER', value: 'USER' },
  { label: 'ADMIN', value: 'ADMIN' },
]

let _searchTimer = null

function onSearchInput() {
  // debounce to avoid heavy computation if needed
  if (_searchTimer) clearTimeout(_searchTimer)
  _searchTimer = setTimeout(() => {
    // computed filteredUsers will react automatically
    // no other action needed for client-side filtering
    _searchTimer = null
  }, 200)
}

/* current user id (to disable self-delete) */
const currentUserId = store.id || store.user?.id || store.userId || null

/* load users from service */
async function loadUsers() {
  loading.value = true
  try {
    const res = await userService.getAllUsers()
    // ensure users.value is an array
    users.value = Array.isArray(res) ? res : res.users || res.data || []
  } catch (err) {
    console.error('loadUsers error', err)
    Notify.create({ type: 'negative', message: 'Không tải được danh sách người dùng' })
    users.value = []
  } finally {
    loading.value = false
  }
}

/* computed: client-side filter */
const filteredUsers = computed(() => {
  const q = String(searchQuery.value || '').trim().toLowerCase()
  const role = filterRole.value
  let arr = Array.isArray(users.value) ? users.value.slice() : []

  if (q) {
    arr = arr.filter(u => {
      if (!u) return false
      const sId = String(u.id || '').toLowerCase()
      const sUsername = String(u.username || u.name || '').toLowerCase()
      const sEmail = String(u.email || '').toLowerCase()
      const sPhone = String(u.phone || '').toLowerCase()
      return sId.includes(q) || sUsername.includes(q) || sEmail.includes(q) || sPhone.includes(q)
    })
  }

  if (role) {
    arr = arr.filter(u => String(u.role || '').toUpperCase() === String(role).toUpperCase())
  }

  return arr
})

/* edit / save / delete helpers */
function openEdit(row) {
  editMode.value = true
  Object.assign(form, {
    id: row.id,
    username: row.username,
    fullName: row.fullName ?? row.name ?? '',
    email: row.email,
    phone: row.phone,
    role: row.role,
  })
  dialog.value = true
}

function cancelEdit() {
  dialog.value = false
  editMode.value = false
  Object.assign(form, {
    id: null,
    username: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'USER',
  })
}

async function save() {
  saving.value = true
  try {
    const payload = {
      username: form.username,
      fullName: form.fullName,
      phone: form.phone,
      email: form.email,
      role: form.role,
    }
    await userService.updateUser(form.id, payload)
    Notify.create({ type: 'positive', message: 'Cập nhật thành công' })
    dialog.value = false
    const idx = users.value.findIndex((u) => String(u.id) === String(form.id))
    if (idx !== -1) {
      users.value[idx] = { ...users.value[idx], ...payload }
    } else {
      await loadUsers()
    }
  } catch (err) {
    console.error('save error', err)
    Notify.create({
      type: 'negative',
      message: err?.response?.data?.message || 'Lỗi khi lưu người dùng',
    })
  } finally {
    saving.value = false
  }
}

function isDeleteDisabled(row) {
  if (!currentUserId) return false
  return String(row.id) === String(currentUserId)
}

function confirmDelete(row) {
  if (isDeleteDisabled(row)) {
    Notify.create({ type: 'negative', message: 'Bạn không thể xóa chính mình' })
    return
  }

  Dialog.create({
    title: 'Xác nhận',
    message: `Bạn có chắc muốn xóa user "${row.username}"?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    doDelete(row.id)
  })
}

async function doDelete(id) {
  deletingIds.value.add(String(id))
  try {
    await userService.deleteUser(id)
    Notify.create({ type: 'positive', message: 'Xóa thành công' })
    users.value = users.value.filter((u) => String(u.id) !== String(id))
  } catch (err) {
    console.error('[doDelete] error:', err)
    const msg = err?.response?.data?.message || err?.message || 'Xóa thất bại'
    Notify.create({ type: 'negative', message: msg })
  } finally {
    deletingIds.value.delete(String(id))
  }
}


/* lifecycle */
onMounted(() => {
  loadUsers()
})
</script>
