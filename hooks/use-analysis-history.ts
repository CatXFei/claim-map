"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import type { AnalysisDataWithUser } from '@/lib/database-server'

export function useAnalysisHistory() {
  const [analyses, setAnalyses] = useState<AnalysisDataWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    async function fetchAnalyses() {
      if (!user) {
        setAnalyses([])
        setLoading(false)
        return
      }

      try {
        // Get the current user's ID token
        const token = await user.getIdToken()
        
        const response = await fetch('/api/analysis-history', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch analysis history')
        }

        const data = await response.json()
        setAnalyses(data.analyses)
        setError(null)
      } catch (err) {
        console.error('Error fetching analysis history:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch analysis history')
        setAnalyses([])
      } finally {
        setLoading(false)
      }
    }

    fetchAnalyses()
  }, [user]) // Re-fetch when user changes

  return { analyses, loading, error }
} 