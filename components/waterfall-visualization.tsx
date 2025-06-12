"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Plus, ExternalLink, User, FileText } from "lucide-react"
import type { Impact, Article, Evidence } from "@/lib/database"
import { AddImpactDialog } from "./add-impact-dialog"
import { AddEvidenceDialog } from "./add-evidence-dialog"

interface WaterfallVisualizationProps {
  article: Article
  impacts: Impact[]
  onRefresh: () => void
}

export default function WaterfallVisualization({ article, impacts: initialImpacts, onRefresh }: WaterfallVisualizationProps) {
  const [expandedImpacts, setExpandedImpacts] = useState<Set<string>>(new Set())
  const [showAddImpact, setShowAddImpact] = useState(false)
  const [showAddEvidence, setShowAddEvidence] = useState(false)
  const [selectedImpactId, setSelectedImpactId] = useState<string | null>(null)
  const [showArticleDialog, setShowArticleDialog] = useState(false)
  const [impacts, setImpacts] = useState<Impact[]>(initialImpacts)

  // Add useEffect to log article prop changes
  useEffect(() => {
    console.log('WaterfallVisualization - Article prop changed:', {
      article,
      articleId: article?.id,
      hasArticle: !!article,
      impactsCount: impacts.length
    })
  }, [article, impacts])

  // Update impacts when initialImpacts changes
  useEffect(() => {
    console.log('WaterfallVisualization - Initial impacts changed:', {
      initialImpactsCount: initialImpacts.length,
      currentImpactsCount: impacts.length
    })
    setImpacts(initialImpacts)
  }, [initialImpacts])

  // Separate impacts into negative and positive
  const negativeImpacts = impacts
    .filter((impact) => impact.score <= 0)
    .sort((a, b) => a.score - b.score) // Sort by score ascending (most negative first)

  const positiveImpacts = impacts
    .filter((impact) => impact.score > 0)
    .sort((a, b) => b.score - a.score) // Sort by score descending (most positive first)

  // Add logging to AddImpactDialog onOpenChange
  const handleAddImpactOpenChange = (open: boolean) => {
    console.log('WaterfallVisualization - AddImpactDialog onOpenChange:', {
      open,
      article,
      articleId: article?.id,
      hasArticle: !!article,
      showAddImpact
    })
    setShowAddImpact(open)
  }

  const toggleExpanded = (impactId: string) => {
    const newExpanded = new Set(expandedImpacts)
    if (newExpanded.has(impactId)) {
      newExpanded.delete(impactId)
    } else {
      newExpanded.add(impactId)
    }
    setExpandedImpacts(newExpanded)
  }

  const handleVote = async (impactId: string, voteType: "up" | "down") => {
    // Optimistically update the UI
    setImpacts(prevImpacts => 
      prevImpacts.map(impact => 
        impact.id === impactId
          ? {
              ...impact,
              user_votes_up: voteType === "up" ? impact.user_votes_up + 1 : impact.user_votes_up,
              user_votes_down: voteType === "down" ? impact.user_votes_down + 1 : impact.user_votes_down
            }
          : impact
      )
    )

    try {
      const response = await fetch(`/api/articles/${article.id}/impacts/${impactId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteType }),
      })

      if (!response.ok) {
        // If the vote fails, revert the optimistic update
        setImpacts(prevImpacts => 
          prevImpacts.map(impact => 
            impact.id === impactId
              ? {
                  ...impact,
                  user_votes_up: voteType === "up" ? impact.user_votes_up - 1 : impact.user_votes_up,
                  user_votes_down: voteType === "down" ? impact.user_votes_down - 1 : impact.user_votes_down
                }
              : impact
          )
        )
        const error = await response.json()
        console.error("Vote failed:", error)
        alert("Failed to record vote. Please try again.")
        return
      }

      const data = await response.json()
      if (data.impact) {
        // Update the specific impact with the server response
        setImpacts(prevImpacts => 
          prevImpacts.map(impact => 
            impact.id === impactId ? data.impact : impact
          )
        )
      }
    } catch (error) {
      // If the vote fails, revert the optimistic update
      setImpacts(prevImpacts => 
        prevImpacts.map(impact => 
          impact.id === impactId
            ? {
                ...impact,
                user_votes_up: voteType === "up" ? impact.user_votes_up - 1 : impact.user_votes_up,
                user_votes_down: voteType === "down" ? impact.user_votes_down - 1 : impact.user_votes_down
              }
            : impact
        )
      )
      console.error("Vote failed:", error)
      alert("Failed to record vote. Please try again.")
    }
  }

  const getCardStyles = (score: number, source: string) => {
    // For user-input impacts, use lighter colors
    if (source === "user") {
      if (score < 0) {
        return "bg-red-25 border-red-100 hover:bg-red-50" // Lighter red for negative
      }
      if (score > 0) {
        return "bg-green-25 border-green-100 hover:bg-green-50" // Lighter green for positive
      }
      return "bg-gray-25 border-gray-100 hover:bg-gray-50" // Lighter gray for neutral
    }
    
    // For source content impacts, use regular colors
    if (score < 0) {
      return "bg-red-50 border-red-200 hover:bg-red-100" // Regular red for negative
    }
    if (score > 0) {
      return "bg-green-50 border-green-200 hover:bg-green-100" // Regular green for positive
    }
    return "bg-gray-50 border-gray-200 hover:bg-gray-100" // Regular gray for neutral
  }

  const getButtonStyles = (score: number, source: string) => {
    // For user-input impacts, use lighter colors
    if (source === "user") {
      if (score < 0) {
        return "border-red-100 text-red-500 hover:bg-red-25" // Lighter red for negative
      }
      if (score > 0) {
        return "border-green-100 text-green-500 hover:bg-green-25" // Lighter green for positive
      }
      return "border-gray-100 text-gray-500 hover:bg-gray-25" // Lighter gray for neutral
    }
    
    // For source content impacts, use regular colors
    if (score < 0) {
      return "border-red-200 text-red-600 hover:bg-red-50" // Regular red for negative
    }
    if (score > 0) {
      return "border-green-200 text-green-600 hover:bg-green-50" // Regular green for positive
    }
    // Use gray for neutral impacts
    return "border-gray-200 text-gray-600 hover:bg-gray-50"
  }

  const getScoreColor = (score: number) => {
    if (score <= -0.5) return "bg-red-600"
    if (score < 0) return "bg-red-400"
    if (score === 0) return "bg-gray-400"
    if (score <= 0.5) return "bg-green-400"
    return "bg-green-600"
  }

  const getEvidenceStyles = (score: number, source: string) => {
    // Use red for negative impacts
    if (score < 0) {
      return "bg-red-100"
    }
    // Use green for positive impacts
    if (score > 0) {
      return "bg-green-100"
    }
    // Use gray for neutral impacts
    return "bg-gray-100"
  }

  const renderSourceBadge = (source: string) => {
    if (source === "user") {
      return (
        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-normal opacity-70">
          <User className="h-1.5 w-1.5 mr-0.5" />
          user
        </Badge>
      )
    } else {
      return (
        <Badge
          variant="outline"
          className="text-[10px] px-1 py-0 h-4 font-normal opacity-70 cursor-pointer hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            handleSourceClick(source)
          }}
        >
          <FileText className="h-1.5 w-1.5 mr-0.5" />
          Source Content
        </Badge>
      )
    }
  }

  const handleAddEvidence = (impactId: string) => {
    setSelectedImpactId(impactId)
    setShowAddEvidence(true)
  }

  const handleSourceClick = (source: string) => {
    if (source === "user") {
      return // Do nothing for user sources
    }

    // For article sources, show the article content
    if (source.startsWith("/article/")) {
      setShowArticleDialog(true)
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header with topic */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-6">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-bold text-center mb-1">{article.title}</h1>
          <p className="text-sm text-muted-foreground text-center mb-2">{article.impacting_entity}</p>
          <button
            onClick={() => {
              console.log('Opening article dialog for article:', {
                id: article.id,
                title: article.title,
                hasContent: !!article.content
              })
              setShowArticleDialog(true)
            }}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm hover:underline cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            View Source Content
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {/* Impact Spectrum Bar */}
        <div className="relative">
          <div className="h-2 bg-gradient-to-r from-red-500 via-gray-300 to-green-500 rounded-md"></div>
          <div className="flex justify-between mt-0.5 text-[9px] text-muted-foreground">
            <span>Most Negative</span>
            <span>Neutral</span>
            <span>Most Positive</span>
          </div>
        </div>

        {/* Two Column Layout - Negative and Positive */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Negative Impacts Column */}
          <div className="space-y-2">
            {negativeImpacts.map((impact) => (
              <ImpactCard
                key={impact.id}
                impact={impact}
                isExpanded={expandedImpacts.has(impact.id)}
                onToggleExpanded={() => toggleExpanded(impact.id)}
                onVote={handleVote}
                onAddEvidence={handleAddEvidence}
                onRefresh={onRefresh}
                getCardStyles={getCardStyles}
                getButtonStyles={getButtonStyles}
                getScoreColor={getScoreColor}
                getEvidenceStyles={getEvidenceStyles}
                onSourceClick={handleSourceClick}
              />
            ))}

            {negativeImpacts.length === 0 && (
              <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-muted-foreground text-xs">No negative impacts identified</p>
              </div>
            )}
          </div>

          {/* Positive Impacts Column */}
          <div className="space-y-2">
            {positiveImpacts.map((impact) => (
              <ImpactCard
                key={impact.id}
                impact={impact}
                isExpanded={expandedImpacts.has(impact.id)}
                onToggleExpanded={() => toggleExpanded(impact.id)}
                onVote={handleVote}
                onAddEvidence={handleAddEvidence}
                onRefresh={onRefresh}
                getCardStyles={getCardStyles}
                getButtonStyles={getButtonStyles}
                getScoreColor={getScoreColor}
                getEvidenceStyles={getEvidenceStyles}
                onSourceClick={handleSourceClick}
              />
            ))}

            {positiveImpacts.length === 0 && (
              <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-muted-foreground text-xs">No positive impacts identified</p>
              </div>
            )}
          </div>
        </div>

        {/* Add Argument Button */}
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            onClick={() => setShowAddImpact(true)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 h-8 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Argument
          </Button>
        </div>

        <AddImpactDialog
          open={showAddImpact}
          onOpenChange={handleAddImpactOpenChange}
          articleId={article?.id}
          onSuccess={() => {
            console.log('WaterfallVisualization - AddImpactDialog onSuccess')
            setShowAddImpact(false)
            onRefresh()
          }}
        />

        {/* Article Content Dialog */}
        <Dialog open={showArticleDialog} onOpenChange={setShowArticleDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Source Article Content
              </DialogTitle>
            </DialogHeader>
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {article.content.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Evidence Dialog */}
        {showAddEvidence && selectedImpactId && (
          <AddEvidenceDialog
            open={showAddEvidence}
            onOpenChange={setShowAddEvidence}
            impactId={selectedImpactId}
            onSuccess={() => {
              setShowAddEvidence(false)
              setSelectedImpactId(null)
              onRefresh()
            }}
          />
        )}
      </div>
    </div>
  )
}

interface ImpactCardProps {
  impact: Impact
  isExpanded: boolean
  onToggleExpanded: () => void
  onVote: (impactId: string, voteType: "up" | "down") => void
  onAddEvidence: (impactId: string) => void
  onRefresh: () => void
  getCardStyles: (score: number, source: string) => string
  getButtonStyles: (score: number, source: string) => string
  getScoreColor: (score: number) => string
  getEvidenceStyles: (score: number, source: string) => string
  onSourceClick: (source: string) => void
}

function ImpactCard({
  impact,
  isExpanded,
  onToggleExpanded,
  onVote,
  onAddEvidence,
  onRefresh,
  getCardStyles,
  getButtonStyles,
  getScoreColor,
  getEvidenceStyles,
  onSourceClick,
}: ImpactCardProps) {
  const [evidenceData, setEvidenceData] = useState<Evidence[]>([])
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false)

  useEffect(() => {
    async function fetchEvidence() {
      if (isExpanded && impact.supporting_evidence_ids.length > 0) {
        setIsLoadingEvidence(true)
        try {
          const evidencePromises = impact.supporting_evidence_ids.map(async (id) => {
            const response = await fetch(`/api/evidence/${id}`)
            if (!response.ok) {
              console.error(`Failed to fetch evidence ${id}:`, await response.text())
              return null
            }
            return response.json()
          })
          const evidence = await Promise.all(evidencePromises)
          setEvidenceData(evidence.filter((ev): ev is Evidence => ev !== null))
        } catch (error) {
          console.error('Error fetching evidence:', error)
        } finally {
          setIsLoadingEvidence(false)
        }
      }
    }

    fetchEvidence()
  }, [isExpanded, impact.supporting_evidence_ids])

  const cardStyles = getCardStyles(impact.score, impact.source)

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 ${cardStyles}`}
      onClick={onToggleExpanded}
    >
      <CardHeader className="p-1.5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-0.5">
              <CardTitle className="text-base font-bold text-black">{impact.impacted_entity}</CardTitle>
              {impact.source === "user" ? (
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-normal opacity-70">
                  <User className="h-1.5 w-1.5 mr-0.5" />
                  user
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1 py-0 h-4 font-normal opacity-70 cursor-pointer hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSourceClick(impact.source)
                  }}
                >
                  <FileText className="h-1.5 w-1.5 mr-0.5" />
                  Source Content
                </Badge>
              )}
            </div>
            <p className="text-sm text-black leading-tight">{impact.impact}</p>
            <div className="flex items-center gap-1 mt-2 text-[9px] text-muted-foreground">
              {impact.source !== "user" && impact.confidence !== null && (
                <span>Confidence: {Math.round(impact.confidence * 100)}%</span>
              )}
              <div className="flex items-center gap-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onVote(impact.id, "up")
                  }}
                  className="h-2.5 px-0.5 text-green-600 hover:text-green-700"
                >
                  <ThumbsUp className="h-1 w-1 mr-0.5" />
                  {impact.user_votes_up}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onVote(impact.id, "down")
                  }}
                  className="h-2.5 px-0.5 text-red-600 hover:text-red-700"
                >
                  <ThumbsDown className="h-1 w-1 mr-0.5" />
                  {impact.user_votes_down}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-0.5 ml-1.5">
            <Badge className={`${getScoreColor(impact.score)} text-white text-[9px] px-0.5 py-0`}>
              {impact.score.toFixed(1)}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-3.5 px-0.5 text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
            >
              {isExpanded ? (
                <>
                  <span>Supporting Evidence</span>
                  <ChevronUp className="h-2 w-2" />
                </>
              ) : (
                <>
                  <span>Supporting Evidence</span>
                  <ChevronDown className="h-2 w-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-1.5 pt-0">
          <div className="space-y-1.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-[10px]">Supporting Evidence</h4>
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-4 px-1 text-[9px] ${getButtonStyles(impact.score, impact.source)}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onRefresh()
                  }}
                >
                  <Plus className="h-2 w-2 mr-0.5" />
                  Add Evidence
                </Button>
              </div>

              {isLoadingEvidence ? (
                <p className="text-xs text-muted-foreground">Loading evidence...</p>
              ) : evidenceData.length > 0 ? (
                <ul className="space-y-1.5">
                  {evidenceData.map((evidence, evidenceIndex) => (
                    <li key={evidenceIndex} className={`text-[11px] p-1.5 rounded ${getEvidenceStyles(impact.score, evidence.source)}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <p className="leading-tight">{evidence.description}</p>
                          {evidence.source_url && (
                            <a
                              href={evidence.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-blue-600 hover:underline text-[9px] whitespace-nowrap"
                            >
                              <ExternalLink className="h-2 w-2 mr-0.5" />
                              Source
                            </a>
                          )}
                        </div>
                        <div className="flex items-center space-x-0.5 ml-1.5">
                          {evidence.source === "user" ? (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-normal opacity-70">
                              <User className="h-1.5 w-1.5 mr-0.5" />
                              user
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0 h-4 font-normal opacity-70 cursor-pointer hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                onSourceClick(evidence.source)
                              }}
                            >
                              <FileText className="h-1.5 w-1.5 mr-0.5" />
                              Source Content
                            </Badge>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-muted-foreground">No evidence provided yet.</p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
