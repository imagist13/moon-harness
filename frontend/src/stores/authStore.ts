import { create } from 'zustand'
import { User } from '@/types'

const TOKEN_KEY = 'her-claw-token'
const USER_KEY = 'her-claw-user'

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  logout: () => void
  checkAuth: () => void
}

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: getStoredToken(),
  user: getStoredUser(),
  isAuthenticated: !!getStoredToken(),

  setAuth: (token: string, user: User) => {
    const prevToken = getStoredToken()
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
    // Switching account: reload to clear all cached session state
    if (prevToken && prevToken !== token) {
      window.location.reload()
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    set({ token: null, user: null, isAuthenticated: false })
    window.location.reload()
  },

  checkAuth: () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      set({ token: null, user: null, isAuthenticated: false })
    } else {
      set({ token, user: getStoredUser(), isAuthenticated: true })
    }
  },
}))
