"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface AddEvidenceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  impactId: string
  onSuccess: () => void
}

export function AddEvidenceDialog({ open, onOpenChange, impactId, onSuccess }: AddEvidenceDialogProps) {
  const [description, setDescription] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          impactId,
          description,
          sourceUrl: sourceUrl || undefined,
          source: "user"
        }),
      })

      if (response.ok) {
        setDescription("")
        setSourceUrl("")
        onSuccess()
      } else {
        const error = await response.json()
        console.error("Failed to add evidence:", error)
        alert("Failed to add evidence. Please try again.")
      }
    } catch (error) {
      console.error("Failed to add evidence:", error)
      alert("Failed to add evidence. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Supporting Evidence</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="evidence-description">Evidence Description</Label>
            <Textarea
              id="evidence-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the factual evidence that supports this impact..."
              rows={4}
              required
            />
          </div>

          <div>
            <Label htmlFor="source-url">Source URL (optional)</Label>
            <Input
              id="source-url"
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://example.com/source"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Evidence"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
