<template>
  <q-page class="q-pa-md">

    <h4 class="q-mb-md">
      <q-icon name="notifications" size="32px" class="q-mr-sm" />
      Quản lý đăng ký thiết bị
    </h4>

    <!-- BẢNG 1: Thiết bị đang theo dõi -->
    <h5>Thiết bị đang theo dõi</h5>
    <q-table
      :rows="myDevices"
      :columns="userCols"
      row-key="deviceId"
      flat bordered
      class="q-mb-xl"
    >
      <template v-slot:body-cell-actions="props">
        <q-td>
          <q-btn
            color="negative"
            label="Hủy theo dõi"
            dense
            @click="unsubscribe(props.row.deviceId)"
          />
        </q-td>
      </template>
    </q-table>

    <!-- BẢNG 2: Tất cả thiết bị -->
    <h5>Tất cả thiết bị</h5>
    <q-table
      :rows="allDevices"
      :columns="allCols"
      row-key="deviceId"
      flat bordered
      class="q-mb-xl"
    >
      <template v-slot:body-cell-actions="props">
        <q-td>
          <q-btn
            v-if="!props.row.subscribed"
            color="primary"
            label="Theo dõi"
            dense
            @click="subscribe(props.row.deviceId)"
          />
          <q-btn
            v-else
            color="negative"
            label="Hủy"
            dense
            @click="unsubscribe(props.row.deviceId)"
          />
        </q-td>
      </template>
    </q-table>

    <!-- BẢNG 3: Admin xem toàn bộ subscriptions -->
    <div v-if="role === 'admin'">
      <h5>Tất cả đăng ký thiết bị (Admin)</h5>

      <q-table
        :rows="adminSubs"
        :columns="adminCols"
        row-key="id"
        flat bordered
      >
        <template v-slot:body-cell-actions="props">
          <q-td>
            <q-btn
              dense flat icon="delete" color="negative"
              @click="removeSub(props.row.id)"
            />
          </q-td>
        </template>
      </q-table>
    </div>

  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from 'stores/auth'
import { Notify } from 'quasar'
import * as service from 'src/services/subscriptionService'

const auth = useAuthStore()
const role = (auth.role || '').toLowerCase()

// DATA
const myDevices = ref([])
const allDevices = ref([])
const adminSubs = ref([])

// COLUMNS
const userCols = [
  { name: 'deviceId', label: 'Device ID', field: 'deviceId' },
  { name: 'name', label: 'Tên thiết bị', field: 'name' },
  { name: 'areaName', label: 'Khu vực', field: 'areaName' },
  { name: 'actions', label: 'Hành động' }
]

const allCols = [...userCols]

const adminCols = [
  { name: 'id', label: 'ID', field: 'id' },
  { name: 'deviceIdentifier', label: 'Device ID', field: 'deviceIdentifier' },
  { name: 'userPhone', label: 'User Phone', field: 'userPhone' },
  { name: 'actions', label: 'Hành động' }
]

// LOAD USER DATA
async function loadUserData() {
  try {
    const res1 = await service.getMySubscriptions()
    myDevices.value = res1.data || res1

    const res2 = await service.listDevicesForUser()
    allDevices.value = res2.data || res2
  } catch {
    Notify.create({ type: 'negative', message: 'Không tải được dữ liệu thiết bị' })
  }
}

// LOAD ADMIN DATA
async function loadAdminData() {
  try {
    const res = await service.getAllSubscriptions()
    adminSubs.value = res.data || res
  } catch {
  // ignore error
}

}

// ACTIONS
async function subscribe(id) {
  await service.subscribe(id)
  Notify.create({ type: 'positive', message: 'Theo dõi thành công' })
  loadUserData()
}

async function unsubscribe(id) {
  await service.unsubscribe(id)
  Notify.create({ type: 'positive', message: 'Hủy theo dõi thành công' })
  loadUserData()
}

async function removeSub(id) {
  await service.deleteSubscription(id)
  Notify.create({ type: 'positive', message: 'Đã xóa đăng ký' })
  loadAdminData()
}

// INIT
onMounted(() => {
  loadUserData()         // ✔ Admin & User đều load thiết bị
  if (role === 'admin') {
    loadAdminData()      // ✔ Chỉ admin load full subscription list
  }
})
</script>
