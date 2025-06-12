import { addEvidence } from "@/lib/database"

export async function POST(request: Request) {
  try {
    const { impactId, description, sourceUrl } = await request.json()

    if (!impactId || !description) {
      return Response.json(
        { error: "Impact ID and description are required" },
        { status: 400 }
      )
    }

    const evidence = await addEvidence(
      impactId,
      description,
      sourceUrl || null,
      "user"
    )

    return Response.json(evidence)
  } catch (error) {
    console.error("Add evidence error:", error)
    return Response.json(
      { error: "Failed to add evidence" },
      { status: 500 }
    )
  }
}
