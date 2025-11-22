// src/services/userAdminService.js
import { api } from 'src/boot/axios'

/**
 * Lấy tất cả người dùng (dành cho trang Admin)
 * GET /api/admin/users
 */
export async function getAllUsers() {
  const res = await api.get('/api/admin/users')
  // Chuẩn hoá dữ liệu trả về thành array
  return Array.isArray(res.data) ? res.data : res.data?.users || res.data || []
}

/**
 * Lấy chi tiết một user theo ID
 * GET /api/admin/users/{id}
 */
export async function getUser(id) {
  const res = await api.get(`/api/admin/users/${id}`)
  return res.data
}

/**
 * Cập nhật user
 * PUT /api/admin/users/{id}
 */
export async function updateUser(id, payload) {
  const res = await api.put(`/api/admin/users/${id}`, payload)
  return res.data
}

/**
 * Xóa user theo ID
 * DELETE /api/admin/users/{id}
 */
export async function deleteUser(id) {
  const res = await api.delete(`/api/admin/users/${id}`)
  return res.data
}
