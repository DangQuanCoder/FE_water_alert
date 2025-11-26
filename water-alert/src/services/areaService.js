// src/services/areaService.js
import { api } from 'src/boot/axios'

export async function getAllAreas() {
  const res = await api.get('/api/admin/areas')
  return res.data
}

export async function getArea(id) {
  const res = await api.get(`/api/admin/areas/${id}`)
  return res.data
}

export async function createArea(payload) {
  const res = await api.post('/api/admin/areas', payload)
  return res.data
}

export async function updateArea(id, payload) {
  const res = await api.put(`/api/admin/areas/${id}`, payload)
  return res.data
}

export async function deleteArea(id) {
  const res = await api.delete(`/api/admin/areas/${id}`)
  return res.data
}
