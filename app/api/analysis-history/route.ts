import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET() {
  try {
    console.log("Fetching analysis history...")
    const historySnapshot = await db.collection("analysis_history").orderBy("created_at", "desc").get()
    
    // Get all article IDs from history
    const articleIds = historySnapshot.docs.map(doc => doc.data().article_id)
    console.log("Found article IDs:", articleIds)

    // Fetch impact counts for each article
    const impactCounts = await Promise.all(
      articleIds.map(async (articleId) => {
        const impactsSnapshot = await db.collection("impacts").where("article_id", "==", articleId).count().get()
        return { articleId, count: impactsSnapshot.data().count }
      })
    )

    // Create a map of article ID to impact count
    const impactCountMap = Object.fromEntries(
      impactCounts.map(({ articleId, count }) => [articleId, count])
    )

    // Combine history entries with impact counts
    const history = historySnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        article_id: data.article_id,
        created_at: data.created_at.toDate().toISOString(),
        impact_count: impactCountMap[data.article_id] || 0
      }
    })

    console.log("Returning history with impact counts:", history)
    return NextResponse.json(history)
  } catch (error) {
    console.error("Failed to fetch analysis history:", error)
    return NextResponse.json(
      { error: "Failed to fetch analysis history" },
      { status: 500 }
    )
  }
}
