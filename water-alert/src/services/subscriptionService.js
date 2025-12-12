import { api } from 'src/boot/axios'

// USER — subscribe
export function subscribe(deviceId) {
  return api.post(`/api/devices/id/${deviceId}/subscribe`)
}

// USER — unsubscribe
export function unsubscribe(deviceId) {
  return api.delete(`/api/devices/id/${deviceId}/subscribe`)
}

// USER — list my subscriptions
export function getMySubscriptions() {
  return api.get('/api/devices/subscriptions/me')
}

// USER — list all devices
export function listDevicesForUser() {
  return api.get('/api/devices')
}

// ADMIN — list all device subscriptions
export function getAllSubscriptions() {
  return api.get('/api/devices/admin/subscriptions')
}

// ADMIN — delete subscription
export function deleteSubscription(id) {
  return api.delete(`/api/devices/admin/subscriptions/${id}`)
}

// ADMIN — get subscribers of a device (optional)
export function getSubscribersByDevice(deviceId) {
  return api.get(`/api/devices/admin/${deviceId}/subscribers`)
}
