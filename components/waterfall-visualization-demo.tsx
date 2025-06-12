"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Plus, ExternalLink, User, FileText } from "lucide-react"
import type { AnalysisData } from "@/types/analysis"
import { AddImpactDialogDemo } from "./add-impact-dialog-demo"
import { AddEvidenceDialogDemo } from "./add-evidence-dialog-demo"

interface WaterfallVisualizationDemoProps {
  data: AnalysisData
  onRefresh: () => void
}

export default function WaterfallVisualizationDemo({ data: initialData }: WaterfallVisualizationDemoProps) {
  const [data, setData] = useState(initialData)
  const [expandedImpacts, setExpandedImpacts] = useState<Set<string>>(new Set())
  const [showAddImpact, setShowAddImpact] = useState(false)
  const [showAddEvidence, setShowAddEvidence] = useState(false)
  const [selectedImpactId, setSelectedImpactId] = useState<string | null>(null)
  const [showArticleDialog, setShowArticleDialog] = useState(false)
  const [articleContent, setArticleContent] = useState("")

  // Separate impacts into negative and positive
  const negativeImpacts = data.impacts.filter((impact) => impact.score < 0).sort((a, b) => a.score - b.score)

  const positiveImpacts = data.impacts.filter((impact) => impact.score > 0).sort((a, b) => b.score - a.score)

  const neutralImpacts = data.impacts
    .filter((impact) => impact.score === 0)
    .sort((a, b) => a.impacted_entity.localeCompare(b.impacted_entity))

  const toggleExpanded = (impactId: string) => {
    const newExpanded = new Set(expandedImpacts)
    if (newExpanded.has(impactId)) {
      newExpanded.delete(impactId)
    } else {
      newExpanded.add(impactId)
    }
    setExpandedImpacts(newExpanded)
  }

  const handleAddImpact = (newImpact: AnalysisData["impacts"][0]) => {
    setData((prevData) => ({
      ...prevData,
      impacts: [...prevData.impacts, newImpact],
    }))
  }

  const handleAddEvidence = (impactId: string) => {
    setSelectedImpactId(impactId)
    setShowAddEvidence(true)
  }

  const handleEvidenceAdded = (impactId: string, newEvidence: AnalysisData["impacts"][0]["supporting_evidence"][0]) => {
    setData((prevData) => ({
      ...prevData,
      impacts: prevData.impacts.map((impact) =>
        impact.impacted_entity === impactId
          ? {
              ...impact,
              supporting_evidence: [...impact.supporting_evidence, newEvidence],
            }
          : impact
      ),
    }))
    setShowAddEvidence(false)
    setSelectedImpactId(null)
  }

  const handleVote = (impactId: string, voteType: "up" | "down") => {
    setData((prevData) => ({
      ...prevData,
      impacts: prevData.impacts.map((impact, index) =>
        index === parseInt(impactId)
          ? {
              ...impact,
              user_feedback: {
                ...impact.user_feedback,
                [voteType === "up" ? "thumbs_up" : "thumbs_down"]:
                  impact.user_feedback[voteType === "up" ? "thumbs_up" : "thumbs_down"] + 1,
              },
            }
          : impact,
      ),
    }))
  }

  const showArticleContent = async () => {
    // Mock article content for demo
    const mockArticle = `
The European Union's Artificial Intelligence Act represents a landmark piece of legislation that aims to regulate AI systems across the 27-member bloc. This comprehensive framework establishes a risk-based approach to AI governance, categorizing AI applications based on their potential impact on fundamental rights and safety.

Key provisions of the regulation include:

1. Prohibited AI Practices: The act bans certain AI applications deemed to pose unacceptable risks, such as social scoring systems and real-time biometric identification in public spaces.

2. High-Risk AI Systems: Applications in critical areas like healthcare, transportation, and law enforcement face strict requirements including risk assessment, data governance, and human oversight.

3. Transparency Requirements: AI systems that interact with humans must clearly disclose their artificial nature, while AI-generated content must be appropriately labeled.

4. Innovation Support: The regulation includes provisions for regulatory sandboxes to foster innovation while ensuring compliance.

The legislation has significant implications for both European and global AI development, as companies worldwide must comply with these standards to operate in the EU market. Implementation will be phased over several years, with the most restrictive provisions taking effect first.

Industry stakeholders have expressed mixed reactions, with some praising the clarity and others concerned about compliance costs and potential innovation barriers. The regulation is expected to influence AI governance frameworks globally, potentially setting a new standard for responsible AI development.
    `
    setArticleContent(mockArticle.trim())
    setShowArticleDialog(true)
  }

  const handleSourceClick = async (source: string) => {
    if (source === "user") {
      return // Do nothing for user sources
    }

    // For article sources, show the same article content
    if (source.startsWith("/article/")) {
      showArticleContent()
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header with topic */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">{data.article_title}</h1>
        {data.article_url && (
          <button
            onClick={showArticleContent}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm hover:underline cursor-pointer"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            View Source
          </button>
        )}
      </div>

      {/* Impact Spectrum Bar */}
      <div className="relative">
        <div className="h-8 bg-gradient-to-r from-red-500 via-gray-300 to-green-500 rounded-lg"></div>
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          <span>Most Negative</span>
          <span>Neutral</span>
          <span>Most Positive</span>
        </div>
      </div>

      {/* Two Column Layout - Negative and Positive */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Negative Impacts Column */}
        <div className="space-y-4">
          {negativeImpacts.map((impact) => (
            <ImpactCard
              key={impact.impacted_entity}
              impact={impact}
              impactId={impact.impacted_entity}
              isExpanded={expandedImpacts.has(impact.impacted_entity)}
              onToggleExpanded={() => toggleExpanded(impact.impacted_entity)}
              onVote={handleVote}
              onAddEvidence={handleAddEvidence}
              onSourceClick={handleSourceClick}
            />
          ))}

          {negativeImpacts.length === 0 && (
            <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-muted-foreground">No negative impacts identified</p>
            </div>
          )}
        </div>

        {/* Positive Impacts Column */}
        <div className="space-y-4">
          {positiveImpacts.map((impact) => (
            <ImpactCard
              key={impact.impacted_entity}
              impact={impact}
              impactId={impact.impacted_entity}
              isExpanded={expandedImpacts.has(impact.impacted_entity)}
              onToggleExpanded={() => toggleExpanded(impact.impacted_entity)}
              onVote={handleVote}
              onAddEvidence={handleAddEvidence}
              onSourceClick={handleSourceClick}
            />
          ))}

          {positiveImpacts.length === 0 && (
            <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-muted-foreground">No positive impacts identified</p>
            </div>
          )}
        </div>
      </div>

      {/* Neutral Impacts (if any) */}
      {neutralImpacts.length > 0 && (
        <div className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {neutralImpacts.map((impact) => (
              <ImpactCard
                key={impact.impacted_entity}
                impact={impact}
                impactId={impact.impacted_entity}
                isExpanded={expandedImpacts.has(impact.impacted_entity)}
                onToggleExpanded={() => toggleExpanded(impact.impacted_entity)}
                onVote={handleVote}
                onAddEvidence={handleAddEvidence}
                onSourceClick={handleSourceClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add Argument Button */}
      <div className="flex justify-center mt-8">
        <Button
          variant="outline"
          onClick={() => setShowAddImpact(true)}
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Argument
        </Button>
      </div>

      {/* Dialogs */}
      <AddImpactDialogDemo
        open={showAddImpact}
        onOpenChange={setShowAddImpact}
        onSuccess={handleAddImpact}
      />

      {showAddEvidence && selectedImpactId && (
        <AddEvidenceDialogDemo
          open={showAddEvidence}
          onOpenChange={setShowAddEvidence}
          impactId={selectedImpactId}
          onSuccess={handleEvidenceAdded}
        />
      )}

      {/* Article Content Dialog */}
      <Dialog open={showArticleDialog} onOpenChange={setShowArticleDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Source Article
            </DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed">{articleContent}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface ImpactCardProps {
  impact: AnalysisData["impacts"][0]
  impactId: string
  isExpanded: boolean
  onToggleExpanded: () => void
  onVote: (impactId: string, voteType: "up" | "down") => void
  onAddEvidence: (impactId: string) => void
  onSourceClick: (source: string) => void
}

function ImpactCard({
  impact,
  impactId,
  isExpanded,
  onToggleExpanded,
  onVote,
  onAddEvidence,
  onSourceClick,
}: ImpactCardProps) {
  const getScoreColor = (score: number) => {
    if (score <= -0.5) return "bg-red-600"
    if (score < 0) return "bg-red-400"
    if (score === 0) return "bg-gray-400"
    if (score <= 0.5) return "bg-green-400"
    return "bg-green-600"
  }

  const getCardStyles = (score: number) => {
    if (score <= -0.5) return "bg-red-50 border-red-200 hover:bg-red-100"
    if (score < 0) return "bg-red-25 border-red-100 hover:bg-red-50"
    if (score === 0) return "bg-gray-50 border-gray-200 hover:bg-gray-100"
    if (score <= 0.5) return "bg-green-25 border-green-100 hover:bg-green-50"
    return "bg-green-50 border-green-200 hover:bg-green-100"
  }

  const getButtonStyles = (score: number) => {
    if (score <= -0.5) return "border-red-300 text-red-700 hover:bg-red-100"
    if (score < 0) return "border-red-200 text-red-600 hover:bg-red-50"
    if (score === 0) return "border-gray-200 text-gray-600 hover:bg-gray-100"
    if (score <= 0.5) return "border-green-200 text-green-600 hover:bg-green-50"
    return "border-green-300 text-green-700 hover:bg-green-100"
  }

  const getEvidenceStyles = (score: number) => {
    if (score <= -0.5) return "bg-red-100"
    if (score < 0) return "bg-red-75"
    if (score === 0) return "bg-gray-100"
    if (score <= 0.5) return "bg-green-75"
    return "bg-green-100"
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
          onClick={() => onSourceClick(source)}
        >
          <FileText className="h-1.5 w-1.5 mr-0.5" />
          source
        </Badge>
      )
    }
  }

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 ${getCardStyles(impact.score)}`}
      onClick={onToggleExpanded}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base font-medium">{impact.impacted_entity}</CardTitle>
              {renderSourceBadge(impact.source)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{impact.impact}</p>
          </div>
          <div className="flex flex-col items-end space-y-2 ml-4">
            <Badge className={`${getScoreColor(impact.score)} text-white text-sm px-2 py-0.5`}>
              {impact.score.toFixed(1)}
            </Badge>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Confidence and Voting - Always Visible */}
        <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center">
            {impact.confidence !== null && (
              <span className="text-muted-foreground">Confidence: {Math.round(impact.confidence * 100)}%</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              className="text-green-600 hover:text-green-700 h-7 px-2"
              onClick={(e) => {
                e.stopPropagation()
                onVote(impactId, "up")
              }}
            >
              <ThumbsUp className="h-3 w-3 mr-1" />
              {impact.user_feedback.thumbs_up}
            </Button>
            <Button
              size="sm"
              className="text-red-600 hover:text-red-700 h-7 px-2"
              onClick={(e) => {
                e.stopPropagation()
                onVote(impactId, "down")
              }}
            >
              <ThumbsDown className="h-3 w-3 mr-1" />
              {impact.user_feedback.thumbs_down}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">Supporting Evidence</h4>
                <Button
                  size="sm"
                  className={`h-7 px-2 ${getButtonStyles(impact.score)}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddEvidence(impactId)
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Evidence
                </Button>
              </div>

              {impact.supporting_evidence && impact.supporting_evidence.length > 0 ? (
                <ul className="space-y-3">
                  {impact.supporting_evidence.map((evidence, evidenceIndex) => (
                    <li key={evidenceIndex} className={`text-sm p-2 rounded ${getEvidenceStyles(impact.score)}`}>
                      <div className="flex items-start justify-between mb-2">
                        <p className="flex-1">{evidence.description}</p>
                        <div className="flex items-center space-x-1 ml-3">{renderSourceBadge(evidence.source)}</div>
                      </div>
                      {evidence.source_url && (
                        <a
                          href={evidence.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:underline text-sm"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Source
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No evidence provided yet.</p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
