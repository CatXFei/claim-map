"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Clock, Trash2, Check } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface AnalysisHistoryEntry {
  id: string
  article_id: string
  created_at: string
  impact_count: number
}

interface Article {
  id: string
  title: string
  content: string
  created_at: string
}

interface AnalysisSidebarProps {
  currentAnalysisId: string | null
  onSelectAnalysis: (analysisId: string) => void
  onNewAnalysis: () => void
  refreshTrigger?: number
}

export function AnalysisSidebar({
  currentAnalysisId,
  onSelectAnalysis,
  onNewAnalysis,
  refreshTrigger = 0,
}: AnalysisSidebarProps) {
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([])
  const [articles, setArticles] = useState<Record<string, Article>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(currentAnalysisId)

  // Update selectedId when currentAnalysisId changes from parent
  useEffect(() => {
    setSelectedId(currentAnalysisId)
  }, [currentAnalysisId])

  // Fetch history and articles only on initial load or when refreshTrigger changes
  const fetchData = useCallback(async () => {
    // Only fetch if we don't have data yet or if refreshTrigger is greater than 0
    if (history.length === 0 || refreshTrigger > 0) {
      setIsLoading(true)
      try {
        // Fetch history
        const historyResponse = await fetch("/api/analysis-history")
        if (!historyResponse.ok) throw new Error("Failed to fetch history")
        const historyData = await historyResponse.json()
        setHistory(historyData)

        // Fetch articles for each history entry
        const articlePromises = historyData.map(async (entry: AnalysisHistoryEntry) => {
          const response = await fetch(`/api/articles/${entry.article_id}`)
          if (!response.ok) throw new Error(`Failed to fetch article ${entry.article_id}`)
          const data = await response.json()
          return [entry.article_id, data.article]
        })
        
        const articleResults = await Promise.all(articlePromises)
        const articlesMap = Object.fromEntries(articleResults)
        setArticles(articlesMap)
      } catch (error) {
        console.error("Failed to fetch analysis history:", error)
        setError(error instanceof Error ? error.message : "Failed to fetch analysis history")
      } finally {
        setIsLoading(false)
      }
    }
  }, [history.length, refreshTrigger])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSelect = (articleId: string) => {
    setSelectedId(articleId)
    onSelectAnalysis(articleId)
  }

  const handleDelete = async (historyId: string, articleId: string) => {
    try {
      // Delete from history
      const response = await fetch(`/api/analysis-history/${historyId}`, {
        method: "DELETE"
      })
      
      if (!response.ok) {
        throw new Error("Failed to delete analysis history")
      }

      // Delete the article and its impacts
      const articleResponse = await fetch(`/api/articles/${articleId}`, {
        method: "DELETE"
      })
      
      if (!articleResponse.ok) {
        throw new Error("Failed to delete article")
      }

      // Update local state
      const updatedHistory = history.filter(entry => entry.id !== historyId)
      setHistory(updatedHistory)
      setArticles(prev => {
        const { [articleId]: _, ...rest } = prev
        return rest
      })

      // Handle selection of next analysis
      if (selectedId === articleId) {
        if (updatedHistory.length > 0) {
          const currentIndex = history.findIndex(entry => entry.id === historyId)
          const nextIndex = Math.min(currentIndex, updatedHistory.length - 1)
          const nextAnalysis = updatedHistory[nextIndex]
          handleSelect(nextAnalysis.article_id)
        } else {
          onNewAnalysis()
        }
      }
    } catch (error) {
      console.error("Error deleting analysis:", error)
      alert("Failed to delete analysis. Please try again.")
    }
  }

  return (
    <div className="w-80 border-r bg-muted/40">
      <div className="p-4">
        <Button onClick={onNewAnalysis} className="w-full">
          New Analysis
        </Button>
      </div>

      <div className="px-4">
        {isLoading && history.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-4">
            {error}
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No analysis history yet</p>
        ) : (
          <div className="space-y-2">
            {history.map((entry) => {
              const article = articles[entry.article_id]
              const isSelected = selectedId === entry.article_id
              return (
                <div
                  key={entry.id}
                  className={`group relative rounded-lg border p-3 cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? "bg-muted border-muted-foreground/20 shadow-sm hover:bg-muted/90" 
                      : "hover:bg-accent/50 border-border bg-background"
                  }`}
                  onClick={() => handleSelect(entry.article_id)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium text-sm line-clamp-2 ${
                        isSelected ? "text-foreground" : "text-muted-foreground"
                      }`}>
                        {article?.title || "Loading..."}
                      </h3>
                      <div className="flex items-center justify-between mt-2">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${isSelected ? "opacity-70" : ""}`}
                        >
                          {entry.impact_count} {entry.impact_count === 1 ? "argument" : "arguments"}
                        </Badge>
                        <p className={`text-xs ${
                          isSelected ? "text-foreground/70" : "text-muted-foreground"
                        }`}>
                          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 transition-opacity ${
                        isSelected ? "opacity-100 hover:bg-muted-foreground/10" : "opacity-0 group-hover:opacity-100"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(entry.id, entry.article_id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
