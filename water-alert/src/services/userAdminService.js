// src/services/userAdminService.js
import { api } from 'src/boot/axios'

// GET /api/admin/users
export async function getAllUsers() {
  const res = await api.get('/api/admin/users')
  return Array.isArray(res.data) ? res.data : res.data?.users || res.data || []
}

// GET /api/admin/users/{id}
export async function getUser(id) {
  const res = await api.get(`/api/admin/users/${id}`)
  return res.data
}

// PUT /api/admin/users/{id}
export async function updateUser(id, payload) {
  const res = await api.put(`/api/admin/users/${id}`, payload)
  return res.data
}

// DELETE /api/admin/users/{id}
export async function deleteUser(id) {
  // return the whole axios response so FE can check status & headers
  const res = await api.delete(`/api/admin/users/${id}`)
  return res
}
