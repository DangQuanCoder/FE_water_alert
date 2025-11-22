// src/services/waterService.js
import { api } from 'src/boot/axios'

/**
 * GET /api/water-levels
 * trả về mảng WaterLevel: [{ id, level, timestamp }, ...]
 */
export async function getAllLevels() {
  const res = await api.get('/api/water-levels')
  // res.data là mảng WaterLevel theo BE của bạn
  return res.data
}
