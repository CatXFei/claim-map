"use client"

import type React from "react"
import type { AnalysisData } from "@/types/analysis"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

interface AddImpactDialogDemoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (newImpact: AnalysisData["impacts"][0]) => void
}

export function AddImpactDialogDemo({ open, onOpenChange, onSuccess }: AddImpactDialogDemoProps) {
  const [impactedEntity, setImpactedEntity] = useState("")
  const [impact, setImpact] = useState("")
  const [score, setScore] = useState([0])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!impactedEntity.trim() || !impact.trim()) return

    setIsSubmitting(true)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Create new impact object
    const newImpact = {
      impacted_entity: impactedEntity,
      impact: impact,
      supporting_evidence: [],
      score: score[0],
      confidence: null, // No confidence score for user-added impacts
      user_feedback: {
        thumbs_up: 0,
        thumbs_down: 0,
      },
      source: "user", // Mark as user-generated
    }

    // Reset form
    setImpactedEntity("")
    setImpact("")
    setScore([0])
    setIsSubmitting(false)

    // Call success callback
    onSuccess(newImpact)
    onOpenChange(false)
  }

  const getScoreLabel = (value: number) => {
    if (value <= -0.5) return "Very Negative"
    if (value < 0) return "Mildly Negative"
    if (value === 0) return "Neutral"
    if (value <= 0.5) return "Mildly Positive"
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
            <Label>
              Impact Score: {score[0].toFixed(1)} - {getScoreLabel(score[0])}
            </Label>
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
