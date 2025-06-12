import { NextResponse } from "next/server"
import { getEvidenceById } from "@/lib/database-server"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const evidenceId = params.id
    console.log("Fetching evidence with ID:", evidenceId)
    
    const evidence = await getEvidenceById(evidenceId)
    if (!evidence) {
      return NextResponse.json({ error: "Evidence not found" }, { status: 404 })
    }

    return NextResponse.json(evidence)
  } catch (error) {
    console.error("Get evidence error:", error)
    return NextResponse.json(
      {
        error: "Failed to get evidence",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
} 