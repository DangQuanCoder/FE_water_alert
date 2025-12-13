<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="header-gradient">
      <q-toolbar>

        <q-btn
          flat
          dense
          round
          icon="menu"
          class="text-primary"
          @click="leftDrawerOpen = !leftDrawerOpen"
        />

        <q-toolbar-title class="row items-center">
          <img src="/Logo.png" style="height: 32px; margin-right: 10px;" />

          <span class="text-weight-bold logo-text">Water Alert</span>
        </q-toolbar-title>

          <div class="row items-center q-gutter-sm">

          <q-btn v-if="isLoggedIn" flat round dense icon="notifications">
            <q-badge
              v-if="unreadCount > 0"
              color="red"
              floating
              class="animate-ping"
            >
              {{ unreadCount }}
            </q-badge>

            <q-menu
              v-model="notiMenu"
              anchor="bottom right"
              self="top right"
              @before-show="onMenuOpen"
            >
              <q-card style="min-width:330px; max-height:400px;" class="scroll">

                <q-card-section class="text-h6 row items-center justify-between">
                  <span>Thông báo</span>
                  <q-spinner v-if="isLoading" color="primary" size="20px" />
                </q-card-section>
                <q-separator />

                <q-card-section v-if="isLoading" class="text-center text-grey q-pa-md">
                  Đang tải dữ liệu...
                </q-card-section>

                <q-card-section
                  v-else-if="notifications.length === 0"
                  class="text-center text-grey q-pa-lg"
                >
                  <q-icon name="notifications_off" size="40px" color="grey-4" class="q-mb-sm" />
                  <div>Không có thông báo!</div>
                </q-card-section>

                <q-list v-else separator>
                  <q-item v-for="n in notifications" :key="n.id" clickable class="q-pa-sm">
                    <q-item-section>
                      <div>{{ n.message }}</div>
                      <div class="text-caption text-grey">
                        {{ formatDate(n.createdAt) }}
                      </div>
                    </q-item-section>

                    <q-item-section side>
                      <q-icon
                        v-if="!n.isRead"
                        name="fiber_manual_record"
                        color="red"
                        size="12px"
                      />
                    </q-item-section>
                  </q-item>
                </q-list>

              </q-card>
            </q-menu>
          </q-btn>


          <div v-if="isLoggedIn" class="text-subtitle2 q-mr-sm">
            {{ auth.phone }}
            <span class="text-caption text-white">({{ auth.role }})</span>
          </div>

          <q-btn
            v-if="!isLoggedIn"
            flat dense round icon="login" label="Đăng nhập"
            @click="goLogin"
          />
          <q-btn
            v-else
            flat dense round icon="logout" label="Đăng xuất"
            @click="onLogout"
          />

        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen"
              show-if-above
              bordered>
      <q-list padding>
        <q-item clickable v-ripple to="/">
          <q-item-section avatar>
            <q-icon name="home" />
          </q-item-section>

          <q-item-section>
            <span class="menu-home">Trang chủ</span>
          </q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/user" v-if="isLoggedIn">
          <q-item-section avatar><q-icon name="person" /></q-item-section>
          <q-item-section>User</q-item-section>
        </q-item>
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
        <q-item v-if="isLoggedIn" clickable to="/subscriptions">
          <q-item-section avatar><q-icon name="business_center" /></q-item-section>
          <q-item-section>Quản lý đăng ký thiết bị</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "stores/auth";
import axios from "src/boot/axios";
import { Notify } from "quasar";

const leftDrawerOpen = ref(false);
const router = useRouter();
const auth = useAuthStore();

// ---------- STATE ----------
const unreadCount = ref(0);
const notifications = ref([]);
const notiMenu = ref(false);
const isLoading = ref(false); // Thêm biến loading

// ---------- LOGIN / ROLE ----------
const isLoggedIn = computed(() => !!auth.token);
const isAdmin = computed(
  () => isLoggedIn.value && auth.role?.toLowerCase() === "admin"
);

// ---------- API ----------
async function loadUnread() {
  try {
    const res = await axios.get("/api/notifications/unread-count");
    unreadCount.value = res.data;
  } catch {
    //ignore
  }
}

// Hàm này chạy khi MENU bắt đầu mở
async function onMenuOpen() {
  // Reset số chưa đọc về 0 ngay lập tức (UI)
  unreadCount.value = 0;

  // Bật trạng thái loading
  isLoading.value = true;

  try {
    const res = await axios.get("/api/notifications");
    notifications.value = res.data; // Dù mảng rỗng [] thì Vue vẫn nhận diện đúng
  } catch (error) {
    console.error("Lỗi tải thông báo:", error);
    // Nếu lỗi, gán về rỗng để hiển thị "Không có thông báo" thay vì treo
    notifications.value = [];
  } finally {
    // Tắt loading dù thành công hay thất bại
    isLoading.value = false;
  }
}

// ---------- POLLING 5s ----------
onMounted(() => {
  if (isLoggedIn.value) {
    loadUnread();
    setInterval(loadUnread, 5000);
  }
});

function formatDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleString("vi-VN");
}

// ---------- LOGIN / LOGOUT ----------
function goLogin() {
  router.push("/login");
}

function onLogout() {
  auth.logout();
  Notify.create({ type: "positive", message: "Đăng xuất thành công" });
  router.push("/login");
}
</script>

<style>
/* 1. Nhúng Font Patua One từ Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');

/* 2. Hiệu ứng Gradient nền Header (Giữ nguyên) */
.header-gradient {
  background: linear-gradient(to right, #ffffff 0%, #449af0 100%);
}

/* 3. Class cho chữ Water Alert */
.logo-text {
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 28px;
  letter-spacing: 0.5px;

  /* Căn chỉnh vị trí */
  position: relative;
  top: 4px;
  line-height: 1;

  /* --- CẬP NHẬT MÀU MỚI --- */
  color: #5e97cf;

  /* Hiệu ứng bóng đổ (Giữ nguyên) */
  filter: drop-shadow(0px 2px 2px rgb(255, 255, 255));
}

.q-layout {
  /* 1. Đường dẫn đến ảnh nền. / trỏ đến thư mục public/ */
  background-image: url('/Background.jpg');

  /* 2. Đảm bảo ảnh bao phủ toàn bộ khung nhìn */
  background-size: cover;

  /* 3. Cố định ảnh nền khi người dùng cuộn trang */
  background-attachment: fixed;

  /* 4. (Tùy chọn) Chỉnh độ mờ để các thẻ nội dung nổi bật hơn */
  /* opacity: 0.85; */
}

.q-drawer .q-drawer__content {
  /* Ép màu Gradient từ dưới lên */
  background: linear-gradient(to top, #a1e3fd 0%, #ffffff 100%) !important;
}

/* Đảm bảo các mục Q-item bên trong không có màu nền ghi đè */
.q-drawer .q-item {
    background-color: transparent !important;
}

.menu-home {
  text-transform: uppercase; /* IN HOA */
  font-size: 17px;           /* To hơn */
  font-weight: 700;          /* Đậm */
  color: #449af0;            /* Xanh đậm */
  letter-spacing: 0.8px;
}


/* Các class phụ trợ giữ nguyên */
.scroll { overflow-y: auto; }
.animate-ping { animation: ping 1.3s infinite; }
@keyframes ping {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
