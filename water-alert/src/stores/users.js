// src/stores/users.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from 'boot/axios' // dùng khi chuyển sang backend

export const useUsersStore = defineStore('users', () => {
  const users = ref([
    { id: 1, username: 'admin', email: 'admin@example.com', phone: 'admin', role: 'admin', banned: false },
    { id: 2, username: 'user1', email: 'user1@example.com', phone: '0987654321', role: 'user', banned: false },
    { id: 3, username: 'user2', email: 'user2@example.com', phone: '0987000000', role: 'user', banned: true },
  ])

  let nextId = 4
  const mockMode = true // giữ true để chạy mock, đổi false khi dùng backend

  async function fetchUsers({ q = '', page = 1, perPage = 10 } = {}) {
    if (mockMode) {
      const all = users.value.filter(u => {
        if (!q) return true
        const s = q.toLowerCase()
        return (u.username || '').toLowerCase().includes(s)
            || (u.email || '').toLowerCase().includes(s)
            || (u.phone || '').toLowerCase().includes(s)
      })
      const start = (page - 1) * perPage
      return { data: all.slice(start, start + perPage), total: all.length }
    }
    const res = await api.get('/users', { params: { q, page, perPage } })
    return res.data
  }

  async function addUser(payload) {
    if (mockMode) {
      const newUser = {
        id: nextId++,
        username: payload.username,
        email: payload.email || '',
        phone: payload.phone || '',
        role: payload.role || 'user',
        banned: false
      }
      users.value.unshift(newUser)
      return { success: true, user: newUser }
    }
    const res = await api.post('/users', payload)
    return res.data
  }

  async function updateUser(id, payload) {
    if (mockMode) {
      const idx = users.value.findIndex(u => u.id === id)
      if (idx === -1) return { success: false, message: 'User not found' }
      users.value[idx] = { ...users.value[idx], ...payload }
      return { success: true, user: users.value[idx] }
    }
    const res = await api.put(`/users/${id}`, payload)
    return res.data
  }

  async function toggleBan(id) {
    if (mockMode) {
      const u = users.value.find(x => x.id === id)
      if (!u) return { success: false }
      u.banned = !u.banned
      return { success: true, banned: u.banned }
    }
    const res = await api.post(`/users/${id}/toggle-ban`)
    return res.data
  }

  async function getUser(id) {
    if (mockMode) {
      return users.value.find(u => u.id === id) || null
    }
    const res = await api.get(`/users/${id}`)
    return res.data
  }

  return { users, fetchUsers, addUser, updateUser, toggleBan, getUser }
})
