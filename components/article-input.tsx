"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import type { AnalysisData } from "@/types/analysis"
import { useAuth } from "@/lib/auth-context"

interface ArticleInputProps {
  onAnalysisComplete: (articleId: string) => void
}

export default function ArticleInput({ onAnalysisComplete }: ArticleInputProps) {
  const [content, setContent] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!content.trim()) {
      setError("Please provide non-empty content")
      return
    }

    if (!user) {
      setError("Please sign in to analyze content")
      return
    }

    setIsAnalyzing(true)
    console.log("=== Starting article analysis ===")
    console.log("Content to analyze:", content.trim())

    try {
      // Get the current user's ID token
      const token = await user.getIdToken()
      
      // Always call the analyze API
      console.log("Preparing API request...")
      const requestBody = JSON.stringify({ 
        content: content.trim()
      })
      console.log("Request body:", requestBody)

      console.log("Sending request to /api/analyze...")
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: requestBody
      })

      console.log("Response status:", response.status)
      console.log("Response headers:", Object.fromEntries(response.headers.entries()))
      
      const result = await response.json()
      console.log("Response body:", result)

      if (!response.ok) {
        throw new Error(result.error || `Analysis failed: ${response.status}`)
      }

      if (result.articleId) {
        console.log("Analysis successful, article ID:", result.articleId)
        onAnalysisComplete(result.articleId.toString())
        setContent("")
      } else {
        throw new Error("No article ID returned from analysis")
      }
    } catch (error) {
      console.error("=== Analysis failed ===")
      console.error("Error details:", error)
      setError(error instanceof Error ? error.message : "Failed to analyze content. Please try again.")
    } finally {
      setIsAnalyzing(false)
      console.log("=== Analysis process completed ===")
    }
  }

  return (
    <Card className="w-full border-0 shadow-none">
      <CardContent className="px-3 sm:px-6 pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                setError(null)
              }}
              placeholder="Paste content here for semantic analysis..."
              rows={12}
              required
              className={error ? "border-red-500" : ""}
            />
            {error && (
              <p className="mt-2 text-sm text-red-500">{error}</p>
            )}
          </div>

          <Button type="submit" disabled={isAnalyzing || !user} className="w-full">
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : !user ? (
              "Please Sign In to Analyze"
            ) : (
              "Analyze Content"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
