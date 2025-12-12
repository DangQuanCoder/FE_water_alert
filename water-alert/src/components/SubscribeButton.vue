<!-- src/components/SubscribeButton.vue -->
<template>
  <div>
    <q-btn
      dense
      :label="subscribed ? 'Unsubscribe' : 'Subscribe'"
      :color="subscribed ? 'negative' : 'primary'"
      :flat="true"
      :loading="loading"
      @click="toggle"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Notify } from 'quasar'
import * as subscriptionService from 'src/services/subscriptionService'

const props = defineProps({
  deviceId: { type: [String, Number], required: true },
  initialSubscribed: { type: Boolean, default: false }
})
const emit = defineEmits(['changed']) // emits boolean newSubscribed

const subscribed = ref(!!props.initialSubscribed)
const loading = ref(false)

watch(() => props.initialSubscribed, v => subscribed.value = !!v)

async function toggle() {
  loading.value = true
  try {
    if (subscribed.value) {
      await subscriptionService.unsubscribeFromDevice(props.deviceId)
      subscribed.value = false
      Notify.create({ type: 'positive', message: 'Đã hủy theo dõi thiết bị' })
    } else {
      await subscriptionService.subscribeToDevice(props.deviceId)
      subscribed.value = true
      Notify.create({ type: 'positive', message: 'Đã theo dõi thiết bị' })
    }
    emit('changed', subscribed.value)
  } catch (err) {
    console.error('subscribe toggle error', err)
    const msg = err?.response?.data?.message || 'Lỗi khi thay đổi trạng thái theo dõi'
    Notify.create({ type: 'negative', message: String(msg) })
  } finally {
    loading.value = false
  }
}
</script>
