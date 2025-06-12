import { getArticleWithImpacts, voteOnImpact } from "@/lib/database"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; impactId: string }> }
) {
  try {
    const { id: articleId, impactId } = await params
    const { voteType } = await request.json()

    if (!voteType || (voteType !== "up" && voteType !== "down")) {
      return Response.json(
        { error: "Invalid vote type. Must be 'up' or 'down'" },
        { status: 400 }
      )
    }

    // First verify that the impact belongs to the article
    const data = await getArticleWithImpacts(articleId)
    if (!data) {
      return Response.json({ error: "Article not found" }, { status: 404 })
    }

    const impact = data.impacts.find(imp => imp.id === impactId)
    if (!impact) {
      return Response.json({ error: "Impact not found in this article" }, { status: 404 })
    }

    // Record the vote
    await voteOnImpact(impactId, voteType)

    // Get updated article data
    const updatedData = await getArticleWithImpacts(articleId)
    if (!updatedData) {
      return Response.json({ error: "Failed to get updated article data" }, { status: 500 })
    }

    // Return the updated impact
    const updatedImpact = updatedData.impacts.find(imp => imp.id === impactId)
    return Response.json({ 
      success: true,
      impact: updatedImpact
    })
  } catch (error) {
    console.error("Vote error:", error)
    return Response.json(
      { error: "Failed to record vote" },
      { status: 500 }
    )
  }
} 