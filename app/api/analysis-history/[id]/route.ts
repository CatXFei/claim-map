import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const historyId = params.id
    console.log("Deleting analysis history entry:", historyId)

    await db.collection("analysis_history").doc(historyId).delete()
    console.log("Analysis history entry deleted successfully")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete analysis history:", error)
    return NextResponse.json(
      { error: "Failed to delete analysis history" },
      { status: 500 }
    )
  }
} 