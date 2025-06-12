import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import aiHealthcareAnalysis from "@/data/ai-healthcare-analysis.json"
import tariffAnalysis from "@/data/tariff-analysis.json"
import OpenAI from "openai"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface AnalysisData {
  article_title: string
  article_content: string
  impacts: Array<{
    impacted_entity: string
    impact: string
    score: number
    confidence: number
    source?: string
    supporting_evidence: Array<{
      description: string
      source_url: string
      source: string
    }>
    user_feedback: {
      thumbs_up: number
      thumbs_down: number
    }
  }>
}

// Helper function to get hardcoded analysis data
function getHardcodedAnalysis(content: string): AnalysisData | null {
  const lowerContent = content.toLowerCase()
  if (lowerContent.includes("ai healthcare") || lowerContent.includes("ai in healthcare")) {
    return aiHealthcareAnalysis as AnalysisData
  }
  if (lowerContent.includes("tariff")) {
    return tariffAnalysis as AnalysisData
  }
  return null
}

// OpenAI API analysis function
async function analyzeWithOpenAI(content: string): Promise<AnalysisData> {
  console.log("Starting OpenAI analysis...")
  
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set")
  }

  const prompt = `Analyze the following article content and provide a structured analysis of its impacts. 
For each impact, identify:
1. The entity or group being impacted
2. The specific impact description
3. A score from -1 (very negative) to 1 (very positive)
4. A confidence score from 0 to 1
5. Supporting evidence from the text

Article content:
${content}

Provide the analysis in the following JSON format:
{
  "article_title": "A concise title summarizing the main topic",
  "article_content": "The original article content",
  "impacts": [
    {
      "impacted_entity": "The entity or group being impacted",
      "impact": "A clear description of how they are impacted",
      "score": -1 to 1,
      "confidence": 0 to 1,
      "source": "system",
      "supporting_evidence": [
        {
          "description": "A specific quote or evidence from the text",
          "source_url": "",
          "source": "system"
        }
      ],
      "user_feedback": {
        "thumbs_up": 0,
        "thumbs_down": 0
      }
    }
  ]
}

Ensure each impact has at least one piece of supporting evidence from the text.`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert analyst that identifies and structures impacts from text content. You provide balanced analysis with both positive and negative impacts when present."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000
    })

    console.log("OpenAI API response received")
    
    const responseContent = completion.choices[0]?.message?.content
    if (!responseContent) {
      throw new Error("No content in OpenAI response")
    }

    // Parse the JSON response
    const analysisData = JSON.parse(responseContent) as AnalysisData
    
    // Validate the response structure
    if (!analysisData.article_title || !analysisData.impacts || !Array.isArray(analysisData.impacts)) {
      throw new Error("Invalid response structure from OpenAI")
    }

    // Ensure each impact has the required fields
    analysisData.impacts = analysisData.impacts.map(impact => ({
      ...impact,
      source: impact.source || "system",
      confidence: impact.confidence || 0.8,
      supporting_evidence: impact.supporting_evidence || [],
      user_feedback: {
        thumbs_up: 0,
        thumbs_down: 0
      }
    }))

    console.log("Analysis completed successfully:", {
      title: analysisData.article_title,
      impactsCount: analysisData.impacts.length
    })

    return analysisData
  } catch (error) {
    console.error("OpenAI analysis failed:", error)
    throw error
  }
}

export async function POST(request: Request) {
  console.log("=== Analyze API called ===")
  let articleRef: FirebaseFirestore.DocumentReference | undefined

  try {
    // Log the raw request
    const rawBody = await request.text()
    console.log("Raw request body:", rawBody)
    
    // Parse the JSON
    const body = JSON.parse(rawBody)
    const { article } = body
    console.log("Parsed article content:", article)

    if (!article) {
      console.error("No article content provided")
      return NextResponse.json({ error: "Article content is required" }, { status: 400 })
    }

    // Step 1: Parse article to impacts object
    console.log("\n=== Step 1: Parsing article to impacts ===")
    let analysisData: AnalysisData
    const hardcodedData = getHardcodedAnalysis(article)
    console.log("Hardcoded data check result:", hardcodedData ? "Found" : "Not found")
    
    if (hardcodedData) {
      console.log("Using hardcoded analysis data:", {
        title: hardcodedData.article_title,
        impactsCount: hardcodedData.impacts.length
      })
      analysisData = hardcodedData
    } else {
      console.log("Using OpenAI analysis")
      analysisData = await analyzeWithOpenAI(article)
    }

    // Step 2: Store article and impacts in database
    console.log("\n=== Step 2: Storing in database ===")
    
    // Store article
    console.log("Storing article in Firestore...")
    try {
      articleRef = await db.collection("articles").add({
        title: analysisData.article_title,
        content: article,
        created_at: new Date(),
        updated_at: new Date()
      })
      console.log("Article stored successfully with ID:", articleRef.id)
    } catch (error) {
      console.error("Failed to store article:", error)
      throw error
    }

    // Store impacts
    console.log("\nStoring impacts in Firestore...")
    const impactsRef = db.collection("impacts")
    console.log("Number of impacts to store:", analysisData.impacts.length)

    try {
      const impactPromises = analysisData.impacts.map(async (impact, index) => {
        console.log(`\nStoring impact ${index + 1}/${analysisData.impacts.length}:`, {
          entity: impact.impacted_entity,
          score: impact.score,
          evidenceCount: impact.supporting_evidence?.length || 0
        })

        // Create evidence documents first and collect their IDs
        const evidenceIds = []
        if (impact.supporting_evidence && impact.supporting_evidence.length > 0) {
          console.log(`Creating ${impact.supporting_evidence.length} evidence documents for impact ${index + 1}`)
          for (const evidence of impact.supporting_evidence) {
            const evidenceRef = await db.collection("evidence").add({
              description: evidence.description,
              source_url: evidence.source_url || "",
              source: evidence.source || "system",
              created_at: new Date(),
              updated_at: new Date()
            })
            evidenceIds.push(evidenceRef.id)
            console.log(`Created evidence document with ID:`, evidenceRef.id)
          }
        }

        // Create impact with evidence IDs array
        const impactRef = await impactsRef.add({
          article_id: articleRef!.id,
          impacted_entity: impact.impacted_entity,
          impact: impact.impact,
          score: impact.score,
          confidence: impact.confidence,
          source: impact.source || "system",
          user_votes_up: 0,
          user_votes_down: 0,
          supporting_evidence_ids: evidenceIds, // Store evidence IDs instead of full evidence objects
          created_at: new Date(),
          updated_at: new Date()
        })
        console.log(`Impact ${index + 1} stored with ID:`, impactRef.id)

        return impactRef.id
      })

      const impactIds = await Promise.all(impactPromises)
      console.log("\nAll impacts stored successfully. Impact IDs:", impactIds)
    } catch (error) {
      console.error("Failed to store impacts:", error)
      throw error
    }

    // Step 3: Store analysis in history
    console.log("\n=== Step 3: Storing analysis in history ===")
    try {
      // Just store the article ID in the history
      const historyRef = await db.collection("analysis_history").add({
        article_id: articleRef.id,
        created_at: new Date()
      })
      console.log("Analysis history stored with ID:", historyRef.id)
    } catch (error) {
      console.error("Failed to store analysis history:", error)
      throw error
    }

    console.log("\n=== Analysis completed successfully ===")
    return NextResponse.json({ 
      article_id: articleRef.id,
      message: "Analysis completed successfully"
    })

  } catch (error) {
    console.error("\n=== Analysis failed ===")
    console.error("Error details:", error)
    
    // If we created an article but failed later, delete it
    if (articleRef) {
      try {
        console.log("Attempting to delete partial article:", articleRef.id)
        await articleRef.delete()
        console.log("Partial article deleted successfully")
      } catch (deleteError) {
        console.error("Failed to delete partial article:", deleteError)
      }
    }
    
    return NextResponse.json(
      { 
        error: "Failed to analyze article", 
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
