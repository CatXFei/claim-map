import { triggerEvidenceIdsMigration } from "@/lib/database"

export async function POST() {
  try {
    await triggerEvidenceIdsMigration()
    return Response.json({ 
      success: true, 
      message: "Successfully migrated impacts to use evidence IDs" 
    })
  } catch (error) {
    console.error("Migration failed:", error)
    return Response.json(
      { 
        error: "Failed to migrate impacts",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
} 