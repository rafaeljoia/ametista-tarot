'use client'

import axios, { AxiosInstance } from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
const TOKEN_KEY = 'admin-token'

let _client: AxiosInstance | null = null

export function adminClient(): AxiosInstance {
  if (_client) return _client
  _client = axios.create({ baseURL: API })
  _client.interceptors.request.use((cfg) => {
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem(TOKEN_KEY)
      if (t) cfg.headers.Authorization = `Bearer ${t}`
    }
    return cfg
  })
  _client.interceptors.response.use(
    (r) => r,
    (err) => {
      if (err?.response?.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY)
        if (!window.location.pathname.startsWith('/admin/login')) {
          window.location.href = '/admin/login'
        }
      }
      return Promise.reject(err)
    },
  )
  return _client
}

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function hasAdminToken() {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem(TOKEN_KEY)
}
