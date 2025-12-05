// src/services/waterService.js
import { api } from 'src/boot/axios'

/**
 * GET /api/water-levels
 * trả về mảng WaterLevel: [{ id, level, timestamp, deviceId, ... }, ...]
 */
export async function getAllLevels() {
  const res = await api.get('/api/water-levels')
  return res.data
}

/**
 * GET levels for a device (prefer server-side filtering)
 * Backend expected: GET /api/water-levels?deviceId=...&from=...&to=...
 * If your backend exposes another endpoint (e.g. /api/devices/{id}/history)
 * update the URL accordingly.
 *
 * from/to should be ISO strings if provided.
 */
export async function getLevelsByDevice(deviceId, from, to) {
  // try to call backend with query params
  const params = {}
  if (deviceId != null) params.deviceId = deviceId
  if (from) params.from = from
  if (to) params.to = to

  const res = await api.get('/api/water-levels', { params })
  return Array.isArray(res.data) ? res.data : res.data?.data ?? res.data ?? []
}
