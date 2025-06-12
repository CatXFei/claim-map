"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  Auth
} from 'firebase/auth'
import { auth } from './firebase-client'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

function getAuthInstance(): Auth {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized')
  }
  return auth
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const authInstance = getAuthInstance()
    const unsubscribe = onAuthStateChanged(authInstance, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const authInstance = getAuthInstance()
      await signInWithEmailAndPassword(authInstance, email, password)
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      const authInstance = getAuthInstance()
      await createUserWithEmailAndPassword(authInstance, email, password)
    } catch (error) {
      console.error('Error signing up:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      const authInstance = getAuthInstance()
      await signOut(authInstance)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
} 