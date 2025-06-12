import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"
import * as admin from "firebase-admin"
import type { AnalysisData } from "@/types/analysis"
import aiHealthcareAnalysis from "@/data/ai-healthcare-analysis.json"
import tariffAnalysis from "@/data/tariff-analysis.json"
import OpenAI from "openai"
import { storeAnalysisData } from "@/lib/database-server"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Helper function to get hardcoded analysis data
function getHardcodedAnalysis(content: string): AnalysisData | null {
  const lowerContent = content.toLowerCase()
  if (lowerContent.includes("ai healthcare") || lowerContent.includes("ai in healthcare")) {
    return aiHealthcareAnalysis as unknown as AnalysisData
  }
  if (lowerContent.includes("tariff")) {
    return tariffAnalysis as unknown as AnalysisData
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

Important: For supporting evidence:
- Only include source_url if the article content explicitly provides a link
- If no link is provided in the article content, leave source_url empty
- Do not generate or make up source URLs
- Focus on factual evidence from the provided content

Provide the analysis in the following JSON format:
{
  "article_title": "string",
  "article_url": "string",
  "article_id": number,
  "impacting_entity": "string",
  "impacts": [
    {
      "impacted_entity": "string",
      "impact": "string",
      "score": number,
      "confidence": number,
      "source": "system",
      "supporting_evidence": [
        {
          "description": "string",
          "source_url": "string",
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

Article content:
${content}`

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert analyst that provides structured analysis of article impacts. Focus on factual, evidence-based analysis."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const responseContent = response.choices[0]?.message?.content
    if (!responseContent) {
      throw new Error("No content in OpenAI response")
    }

    console.log("OpenAI API response received:", responseContent)

    // Clean the response content by removing markdown code block formatting
    const cleanedContent = responseContent
      .replace(/```json\n?/g, '') // Remove opening ```json
      .replace(/```\n?/g, '')     // Remove closing ```
      .trim()                     // Remove any extra whitespace

    // Parse the cleaned JSON response
    const analysisData = JSON.parse(cleanedContent) as AnalysisData
    
    // Validate the response structure
    if (!analysisData.article_title || !analysisData.impacts || !Array.isArray(analysisData.impacts)) {
      throw new Error("Invalid analysis data structure")
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
  let articleRef: admin.firestore.DocumentReference | null = null
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the token and verify it
    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    // Parse the request body
    const { content } = await request.json()
    if (!content) {
      return Response.json({ error: "Content is required" }, { status: 400 })
    }

    console.log("\n=== Step 1: Parsing article to impacts ===")
    let analysisData: AnalysisData
    const hardcodedData = getHardcodedAnalysis(content)
    console.log("Hardcoded data check result:", hardcodedData ? "Found" : "Not found")
    
    if (hardcodedData) {
      console.log("Using hardcoded analysis data:", {
        title: hardcodedData.article_title,
        impactsCount: hardcodedData.impacts.length
      })
      analysisData = hardcodedData
    } else {
      console.log("Using OpenAI analysis")
      analysisData = await analyzeWithOpenAI(content)
    }

    console.log("\n=== Step 2: Storing in database ===")
    console.log("Storing article in Firestore...")
    try {
      // Store the article with user ID
      const docRef = await db.collection("articles").add({
        title: analysisData.article_title,
        content: content,
        url: analysisData.article_url,
        userId: userId,
        impacting_entity: analysisData.impacting_entity,
        created_at: new Date(),
        updated_at: new Date()
      })
      articleRef = docRef
      console.log("Article stored with ID:", articleRef.id)

      // Store impacts using storeAnalysisData which includes URL filtering
      await storeAnalysisData(articleRef.id, analysisData)
      console.log("Impacts stored successfully with URL filtering")

      // Store analysis history with user ID and article reference
      await db.collection("analysis_history").add({
        userId: userId,
        articleId: articleRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        title: analysisData.article_title,
        impactCount: analysisData.impacts.length
      })
      console.log("Analysis history stored successfully")

      return Response.json({ 
        success: true, 
        articleId: articleRef.id,
        analysis: {
          ...analysisData,
          id: articleRef.id
        }
      })
    } catch (error) {
      console.error("Failed to store article:", error)
      throw error
    }
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
    
    return Response.json(
      { 
        error: "Failed to analyze article", 
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
