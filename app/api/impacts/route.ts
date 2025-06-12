import { createImpact } from "@/lib/database"

export async function POST(request: Request) {
  console.log('POST /api/impacts - Request received')
  console.log('POST /api/impacts - Request headers:', Object.fromEntries(request.headers.entries()))
  
  try {
    // Log the raw request body first
    const rawBody = await request.text()
    console.log('POST /api/impacts - Raw request body:', rawBody)
    
    // Parse the JSON
    let body
    try {
      body = JSON.parse(rawBody)
      console.log('POST /api/impacts - Successfully parsed JSON body:', body)
    } catch (e) {
      console.error('POST /api/impacts - Failed to parse JSON body:', e)
      return Response.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    
    // Debug logs for articleId
    console.log('POST /api/impacts - articleId type:', typeof body.articleId)
    console.log('POST /api/impacts - articleId value:', body.articleId)
    console.log('POST /api/impacts - Full parsed body:', body)

    // Check for required fields
    const { articleId, impactedEntity, impact, score } = body
    const missingFields = {
      hasArticleId: !!articleId,
      articleIdValue: articleId,
      articleIdType: typeof articleId,
      hasImpactedEntity: !!impactedEntity,
      hasImpact: !!impact,
      scoreType: typeof score,
      scoreValue: score
    }

    console.log('POST /api/impacts - Missing required fields:', missingFields)

    if (!articleId || !impactedEntity || !impact || typeof score !== 'number') {
      return Response.json(
        { 
          error: "Missing required fields",
          details: missingFields
        },
        { status: 400 }
      )
    }

    console.log('POST /api/impacts - Calling createImpact with:', {
      articleId,
      impactedEntity,
      impactLength: impact.length,
      score,
      confidence: body.confidence,
      source: body.source
    })

    const newImpact = await createImpact(
      articleId,
      impactedEntity,
      impact,
      score,
      body.confidence,
      body.source
    )

    console.log('POST /api/impacts - Impact created successfully:', {
      impactId: newImpact.id,
      articleId: newImpact.article_id,
      impactedEntity: newImpact.impacted_entity
    })

    return Response.json(newImpact)
  } catch (error) {
    console.error('POST /api/impacts - Error:', error)
    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }
    return Response.json(
      { error: "Failed to create impact", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
