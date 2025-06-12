"use client"

import { useAuth } from "@/lib/auth-context"
import ProtectedRoute from "@/components/auth/protected-route"
import { Button } from "@/components/ui/button"
import { useAnalysisHistory } from "@/hooks/use-analysis-history"

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const { analyses, loading, error } = useAnalysisHistory()

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <Button
                variant="outline"
                onClick={() => logout()}
                className="text-red-600 hover:text-red-700"
              >
                Sign Out
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-md">
                <h2 className="text-lg font-semibold mb-2">Welcome!</h2>
                <p className="text-gray-600">
                  You are signed in as: <span className="font-medium">{user?.email}</span>
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-md">
                <h2 className="text-lg font-semibold mb-2">Your Analyses</h2>
                {loading ? (
                  <p className="text-gray-600">Loading your analyses...</p>
                ) : error ? (
                  <p className="text-red-600">Error: {error}</p>
                ) : analyses.length === 0 ? (
                  <p className="text-gray-600">
                    You haven't analyzed any articles yet. Start by analyzing an article!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {analyses.map((analysis) => (
                      <div key={analysis.id} className="border rounded-lg p-4">
                        <h3 className="font-medium">{analysis.article_title}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(analysis.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                          {analysis.impactCount} impacts identified
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
} 