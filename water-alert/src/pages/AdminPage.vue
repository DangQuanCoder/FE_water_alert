<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h6">Quản lý người dùng</div>
        <div class="text-subtitle2 text-grey">
          Thêm / Sửa / Khóa tài khoản
        </div>
      </div>

      <div class="row items-center">
        <q-input
          dense
          debounce="300"
          v-model="q"
          placeholder="Tìm tên, email, sđt"
          class="q-mr-sm"
          clearable
          @clear="onSearchClear"
        >
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>

        <q-btn
          color="primary"
          label="Thêm người dùng"
          icon="person_add"
          @click="openAdd"
        />
      </div>
    </div>

    <!-- Bảng danh sách -->
    <q-table
      :rows="rows"
      :columns="columns"
      row-key="id"
      :pagination="pagination"
      @update:pagination="val => Object.assign(pagination, val)"
      :loading="loading"
      flat
      bordered
    >
      <template v-slot:body-cell-role="props">
        <q-td :props="props">
          <q-badge :color="props.row.role === 'admin' ? 'primary' : 'grey-6'">
            {{ props.row.role }}
          </q-badge>
        </q-td>
      </template>

      <template v-slot:body-cell-banned="props">
        <q-td :props="props">
          <q-chip dense :color="props.row.banned ? 'negative' : 'positive'">
            {{ props.row.banned ? 'Bị khóa' : 'Hoạt động' }}
          </q-chip>
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="row items-center q-gutter-sm">
          <q-btn
            dense
            flat
            icon="edit"
            label="Sửa"
            color="primary"
            @click="openEdit(props.row)"
          />
          <q-btn
            dense
            flat
            :color="props.row.banned ? 'positive' : 'negative'"
            :label="props.row.banned ? 'Mở khóa' : 'Khóa'"
            @click="confirmToggleBan(props.row)"
          />
        </q-td>
      </template>
    </q-table>

    <!-- Phân trang -->
    <div class="row justify-end q-mt-md">
      <q-pagination v-model="pagination.page" :max="pages" max-pages="7" />
    </div>

    <!-- Hộp thoại thêm / sửa -->
    <q-dialog v-model="dialogOpen" persistent>
      <user-form
        :model-value="editingModel"
        :mode="editingMode"
        @save="onSave"
        @cancel="closeDialog"
      />
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useUsersStore } from 'stores/users'
import UserForm from 'components/UserForm.vue'
import { Notify, Dialog } from 'quasar'

const store = useUsersStore()

const q = ref('')
const rows = ref([])
const loading = ref(false)

// pagination reactive object
const pagination = reactive({ page: 1, rowsPerPage: 10 })
const total = ref(0)

const columns = [
  { name: 'id', label: 'ID', field: 'id', sortable: true },
  { name: 'username', label: 'Tên', field: 'username', sortable: true },
  { name: 'phone', label: 'SĐT', field: 'phone' },
  { name: 'email', label: 'Email', field: 'email' },
  { name: 'role', label: 'Role', field: 'role' },
  { name: 'banned', label: 'Trạng thái', field: 'banned' },
  { name: 'actions', label: 'Hành động', field: 'actions' }
]

const dialogOpen = ref(false)
const editingModel = ref({})
const editingMode = ref('add')

const pages = computed(() =>
  Math.max(1, Math.ceil(total.value / pagination.rowsPerPage))
)

async function load() {
  loading.value = true
  try {
    const res = await store.fetchUsers({
      q: q.value,
      page: pagination.page,
      perPage: pagination.rowsPerPage
    })
    rows.value = res.data
    total.value = res.total ?? res.data.length
  } catch (err) {
    console.error(err)
    Notify.create({ type: 'negative', message: 'Lấy danh sách người dùng lỗi' })
  } finally {
    loading.value = false
  }
}

function onSearchClear() {
  q.value = ''
  pagination.page = 1
  load()
}

function openAdd() {
  editingMode.value = 'add'
  editingModel.value = {}
  dialogOpen.value = true
}

function openEdit(row) {
  editingMode.value = 'edit'
  editingModel.value = { ...row }
  dialogOpen.value = true
}

async function onSave(payload) {
  if (editingMode.value === 'add') {
    const res = await store.addUser(payload)
    if (res.success) {
      Notify.create({ type: 'positive', message: 'Thêm user thành công' })
      dialogOpen.value = false
      await load()
    } else {
      Notify.create({ type: 'negative', message: res.message || 'Thêm thất bại' })
    }
  } else {
    const id = editingModel.value.id
    const res = await store.updateUser(id, payload)
    if (res.success) {
      Notify.create({ type: 'positive', message: 'Cập nhật thành công' })
      dialogOpen.value = false
      await load()
    } else {
      Notify.create({ type: 'negative', message: res.message || 'Cập nhật thất bại' })
    }
  }
}

async function confirmToggleBan(row) {
  const action = row.banned ? 'Mở khóa' : 'Khóa'
  const ok = await Dialog.create({
    title: `${action} người dùng`,
    message: `Bạn có muốn ${action.toLowerCase()} tài khoản "${row.username}"?`,
    cancel: true,
    persistent: true
  }).onOk(() => true).onCancel(() => false)

  if (!ok) return

  const r = await store.toggleBan(row.id)
  if (r.success) {
    Notify.create({
      type: 'positive',
      message: row.banned ? 'Mở khóa thành công' : 'Khóa thành công'
    })
    await load()
  } else {
    Notify.create({ type: 'negative', message: 'Thao tác thất bại' })
  }
}

watch(
  [() => q.value, () => pagination.page, () => pagination.rowsPerPage],
  () => load()
)

onMounted(() => load())
</script>

<style scoped>
.q-page {
  max-width: 1200px;
  margin: auto;
}
</style>
