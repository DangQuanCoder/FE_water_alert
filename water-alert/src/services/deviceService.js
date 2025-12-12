// src/services/deviceService.js
import { api } from 'src/boot/axios'

export async function getAllDevices() {
  const res = await api.get('/api/admin/devices')
  return res.data
}

export async function getDevice(id) {
  const res = await api.get(`/api/admin/devices/${id}`)
  return res.data
}

export async function createDevice(payload) {
  // payload example: { name, deviceId, description, latitude, longitude }
  const res = await api.post('/api/admin/devices', payload)
  return res.data
}

export async function updateDevice(id, payload) {
  const res = await api.put(`/api/admin/devices/${id}`, payload)
  return res.data
}

export async function deleteDevice(id) {
  const res = await api.delete(`/api/admin/devices/${id}`)
  return res.data
}

// patch location: body { latitude, longitude }
export async function patchDeviceLocation(id, payload) {
  const res = await api.patch(`/api/admin/devices/${id}/location`, payload)
  return res.data
}

// src/services/deviceService.js
export async function getAllDevicesForUser() {
  const res = await api.get('/api/devices') // user-facing endpoint
  return res.data
}

