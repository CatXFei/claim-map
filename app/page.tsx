"use client"

import { useState, useEffect } from "react"
import ArticleInput from "@/components/article-input"
import WaterfallVisualization from "@/components/waterfall-visualization"
import WaterfallVisualizationDemo from "@/components/waterfall-visualization-demo"
import { AnalysisSidebar } from "@/components/analysis-sidebar"
import { AppHeader } from "@/components/app-header"
import type { Article, Impact } from "@/lib/database"
import type { AnalysisData } from "@/types/analysis"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export default function HomePage() {
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null)
  const [article, setArticle] = useState<Article | null>(null)
  const [impacts, setImpacts] = useState<Impact[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showInput, setShowInput] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const searchParams = useSearchParams()
  const isDemoMode = searchParams.get("demo") === "true"
  const { user } = useAuth()

  // Clear analysis data when user signs out
  useEffect(() => {
    if (!user) {
      setCurrentAnalysisId(null)
      setArticle(null)
      setImpacts([])
      setShowInput(true)
    }
  }, [user])

  // Add useEffect to log article state changes
  useEffect(() => {
    console.log('HomePage - Article state changed:', {
      article,
      articleId: article?.id,
      hasArticle: !!article,
      currentAnalysisId
    })
  }, [article, currentAnalysisId])

  const loadArticleData = async (articleId: string) => {
    setIsLoading(true)
    try {
      console.log("HomePage - Loading article data for ID:", articleId)
      const response = await fetch(`/api/articles/${articleId}`)
      if (!response.ok) {
        throw new Error(`Failed to load article: ${response.status}`)
      }
      const data = await response.json()
      console.log("HomePage - Received article data:", {
        article: data.article,
        articleId: data.article?.id,
        impactsCount: data.impacts?.length
      })
      
      setArticle(data.article)
      setImpacts(data.impacts)
      setCurrentAnalysisId(articleId)
      setShowInput(false)
      if (articleId !== currentAnalysisId) {
        setRefreshTrigger(prev => prev + 1)
      }
    } catch (error) {
      console.error("HomePage - Failed to load article data:", error)
      alert("Failed to load analysis. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnalysisComplete = (articleId: string) => {
    loadArticleData(articleId)
  }

  const handleSelectAnalysis = (analysisId: string) => {
    console.log("Selected analysis:", analysisId)
    if (analysisId !== currentAnalysisId) {
      loadArticleData(analysisId)
    }
  }

  const handleNewAnalysis = () => {
    setShowInput(true)
    setCurrentAnalysisId(null)
    setArticle(null)
    setImpacts([])
  }

  const handleRefresh = () => {
    if (currentAnalysisId) {
      loadArticleData(currentAnalysisId)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Main Layout with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <AnalysisSidebar
          currentAnalysisId={currentAnalysisId}
          onSelectAnalysis={handleSelectAnalysis}
          onNewAnalysis={handleNewAnalysis}
          refreshTrigger={refreshTrigger}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6">
            {showInput ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
                {/* Left column - Input form */}
                <div className="lg:col-span-4">
                  <div className="sticky top-4">
                    <ArticleInput onAnalysisComplete={handleAnalysisComplete} />
                  </div>
                </div>

                {/* Right column - Placeholder */}
                <div className="lg:col-span-8">
                  <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg border-gray-200 p-8">
                    <div className="text-center text-muted-foreground">
                      <p className="mb-2">Enter content in the form to see analysis results here</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Loading analysis...</p>
                </div>
              </div>
            ) : currentAnalysisId && article ? (
              isDemoMode ? (
                <WaterfallVisualizationDemo 
                  data={{
                    article_title: article.title,
                    article_url: article.url || "",
                    article_id: parseInt(article.id) || 0,
                    impacting_entity: article.impacting_entity,
                    impacts: impacts.map(impact => ({
                      ...impact,
                      supporting_evidence: impact.supporting_evidence || []
                    }))
                  }}
                  onRefresh={handleRefresh}
                />
              ) : (
                <WaterfallVisualization 
                  article={article} 
                  impacts={impacts} 
                  onRefresh={handleRefresh} 
                />
              )
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center text-muted-foreground">
                  <p>No analysis data found</p>
                  <button onClick={handleNewAnalysis} className="mt-2 text-blue-600 hover:underline">
                    Start a new analysis
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
