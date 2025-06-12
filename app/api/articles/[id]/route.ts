import { getArticleWithImpacts, deleteArticle } from "@/lib/database-server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const articleId = (await params).id
    console.log("Fetching article with ID:", articleId)
    
    const data = await getArticleWithImpacts(articleId)
    console.log("Retrieved data:", {
      articleId,
      hasArticle: !!data?.article,
      impactsCount: data?.impacts.length,
      impactsWithEvidence: data?.impacts.map(imp => ({
        id: imp.id,
        impacted_entity: imp.impacted_entity,
        evidenceIds: imp.supporting_evidence_ids,
        evidenceCount: imp.supporting_evidence_ids?.length || 0
      }))
    })

    if (!data) {
      return Response.json({ error: "Article not found" }, { status: 404 })
    }

    // Create a summary from the article content
    const summary = data.article.content
      .split('\n')
      .slice(0, 2) // Take first two paragraphs
      .join(' ')
      .slice(0, 100) // Limit to 100 characters
      + '...'

    // Log the final response data
    const responseData = {
      ...data,
      article: {
        ...data.article,
        summary
      }
    }
    console.log("Sending response data:", {
      articleId: responseData.article.id,
      impactsCount: responseData.impacts.length,
      impactsWithEvidence: responseData.impacts.map(imp => ({
        id: imp.id,
        impacted_entity: imp.impacted_entity,
        evidenceCount: imp.supporting_evidence_ids?.length || 0,
        hasSupportingEvidence: imp.supporting_evidence_ids?.length > 0
      }))
    })

    return Response.json(responseData)
  } catch (error) {
    console.error("Get article error:", error)
    return Response.json(
      {
        error: "Failed to get article",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const articleId = (await params).id
    await deleteArticle(articleId)

    return Response.json({ success: true })
  } catch (error) {
    console.error("Delete article error:", error)
    return Response.json(
      { error: "Failed to delete article" },
      { status: 500 }
    )
  }
}
