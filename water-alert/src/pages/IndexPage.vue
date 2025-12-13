<template>
  <q-page class="flex flex-center">
    <transition name="water-wave">
      <img
        v-if="showLogo"
        alt="Water Alert Logo"
        src="/Logo_Water_Alert.png"
        class="water-logo"
      />
    </transition>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'

defineOptions({
  name: 'IndexPage'
})

const showLogo = ref(false)

onMounted(() => {
  setTimeout(() => {
    showLogo.value = true
  }, 200)
})
</script>

<style scoped>
/* ===== LOGO ===== */
.water-logo {
  width: 700px;
  height: auto;

  /* NHÁY 1 LẦN DUY NHẤT */
  animation: water-pulse 1.1s ease-in-out 0.8s 1;
}

/* ===== XUẤT HIỆN ===== */
.water-wave-enter-from {
  opacity: 0;
  transform: scale(0.65);
}

.water-wave-enter-active {
  transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.water-wave-enter-to {
  opacity: 1;
  transform: scale(1);
}
</style>
