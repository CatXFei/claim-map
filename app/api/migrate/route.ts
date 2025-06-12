import { triggerSchemaMigration } from "@/lib/database"

export async function POST() {
  try {
    await triggerSchemaMigration()
    return Response.json({ success: true, message: "Schema migration completed successfully" })
  } catch (error) {
    console.error("Migration failed:", error)
    return Response.json(
      { 
        success: false, 
        error: "Migration failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    )
  }
} 