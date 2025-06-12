import { getArticleById, deleteArticle } from "@/lib/database"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const articleId = (await params).id
    const article = await getArticleById(articleId)

    if (!article) {
      return Response.json({ error: "Article not found" }, { status: 404 })
    }

    return Response.json(article)
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
