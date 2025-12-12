// src/services/userService.js
import { api } from 'src/boot/axios'

/**
 * GET /api/users/me
 * return user object or null on failure
 */
export async function getMe() {
  try {
    const res = await api.get('/api/users/me')
    return res.data
  } catch {
    // no throw: caller can fallback to auth store
    return null
  }
}

/**
 * PUT /api/users/me
 * payload: { username, fullName, email, phone, password? }
 * return updated user object or throw on network error
 */
export async function updateMe(payload) {
  // prefer to return res.data or throw so caller sees error
  const res = await api.put('/api/user/me', payload)
  return res.data
}
