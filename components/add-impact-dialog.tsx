"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

interface AddImpactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  articleId: string
  onSuccess: () => void
}

export function AddImpactDialog({ open, onOpenChange, articleId, onSuccess }: AddImpactDialogProps) {
  const [impactedEntity, setImpactedEntity] = useState("")
  const [impact, setImpact] = useState("")
  const [score, setScore] = useState([0])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Add useEffect to log props when component mounts or props change
  useEffect(() => {
    console.log('AddImpactDialog - Component mounted/updated with props:', {
      open,
      articleId,
      articleIdType: typeof articleId,
      articleIdValue: articleId,
      hasArticleId: !!articleId
    })
  }, [open, articleId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!impactedEntity.trim() || !impact.trim()) return

    setIsSubmitting(true)
    try {
      // Debug log to check articleId
      console.log('AddImpactDialog - Submitting with props:', {
        articleId,
        articleIdType: typeof articleId,
        articleIdValue: articleId,
        hasArticleId: !!articleId,
        open,
        isSubmitting
      })
      
      debugger; // Breakpoint 1: Check component props and state
      
      const payload = {
        articleId,
        impactedEntity,
        impact,
        score: score[0],
        confidence: 0.8, // User-added impacts have high confidence
        source: "user"
      }
      
      // Debug log to check full payload
      console.log('AddImpactDialog - Request payload:', {
        payload,
        stringified: JSON.stringify(payload),
        keys: Object.keys(payload),
        values: Object.values(payload),
        hasArticleId: 'articleId' in payload,
        articleIdInPayload: payload.articleId
      })

      debugger; // Breakpoint 2: Check payload before making request

      const response = await fetch("/api/impacts", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
      })

      debugger; // Breakpoint 3: Check response after request

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Failed to add impact. Status:", response.status)
        console.error("Error response:", errorText)
        try {
          const errorJson = JSON.parse(errorText)
          console.error("Parsed error response:", errorJson)
        } catch (e) {
          console.error("Could not parse error response as JSON")
        }
        alert("Failed to add impact. Please try again.")
        return
      }

      const responseData = await response.json()
      console.log('AddImpactDialog - Success response:', responseData)

      debugger; // Breakpoint 4: Check response data after successful request

      setImpactedEntity("")
      setImpact("")
      setScore([0])
      onSuccess()
    } catch (error) {
      console.error("Failed to add impact:", error)
      alert("Failed to add impact. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getScoreLabel = (value: number) => {
    if (value < -0.5) return "Very Negative"
    if (value < -0.2) return "Negative"
    if (value < 0.2) return "Neutral"
    if (value < 0.5) return "Positive"
    return "Very Positive"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Impact</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="impacted-entity">Who/What is Impacted?</Label>
            <Input
              id="impacted-entity"
              value={impactedEntity}
              onChange={(e) => setImpactedEntity(e.target.value)}
              placeholder="e.g., Local businesses, Environment, Consumers"
              required
            />
          </div>

          <div>
            <Label htmlFor="impact-description">Impact Description</Label>
            <Textarea
              id="impact-description"
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              placeholder="Describe the specific impact..."
              rows={3}
              required
            />
          </div>

          <div>
            <Label>Impact Score: {getScoreLabel(score[0])}</Label>
            <div className="mt-2">
              <Slider value={score} onValueChange={setScore} min={-1} max={1} step={0.1} className="w-full" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Very Negative</span>
                <span>Neutral</span>
                <span>Very Positive</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Impact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
