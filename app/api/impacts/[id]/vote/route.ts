import { voteOnImpact } from "@/lib/database"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const impactId = (await params).id
    const { voteType } = await request.json()

    if (!voteType || (voteType !== "up" && voteType !== "down")) {
      return Response.json(
        { error: "Invalid vote type. Must be 'up' or 'down'" },
        { status: 400 }
      )
    }

    await voteOnImpact(impactId, voteType)

    return Response.json({ success: true })
  } catch (error) {
    console.error("Vote error:", error)
    return Response.json(
      { error: "Failed to record vote" },
      { status: 500 }
    )
  }
}
