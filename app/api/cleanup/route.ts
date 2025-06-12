import { db } from "@/lib/firebase-admin"
import { WriteResult } from "firebase-admin/firestore"

async function deleteCollection(collectionPath: string) {
  console.log(`\nStarting deletion of ${collectionPath}...`)
  const collectionRef = db.collection(collectionPath)
  const snapshot = await collectionRef.get()
  
  if (snapshot.size === 0) {
    console.log(`No documents found in ${collectionPath}`)
    return
  }

  console.log(`Found ${snapshot.size} documents in ${collectionPath}`)
  
  // Delete in batches of 500 (Firestore batch limit)
  const batchSize = 500
  const batches: Promise<WriteResult[]>[] = []
  let currentBatch = db.batch()
  let operationCount = 0
  let totalDeleted = 0

  // First, recursively delete any subcollections
  const deletePromises = snapshot.docs.map(async (doc) => {
    const subCollections = await doc.ref.listCollections()
    for (const subCollection of subCollections) {
      await deleteCollection(`${collectionPath}/${doc.id}/${subCollection.id}`)
    }
  })
  await Promise.all(deletePromises)

  // Then delete the documents
  snapshot.docs.forEach((doc, index) => {
    currentBatch.delete(doc.ref)
    operationCount++
    totalDeleted++

    if (operationCount === batchSize || index === snapshot.size - 1) {
      batches.push(currentBatch.commit())
      currentBatch = db.batch()
      operationCount = 0
    }
  })

  // Wait for all batches to complete
  await Promise.all(batches)
  console.log(`Successfully deleted ${totalDeleted} documents from ${collectionPath}`)
}

export async function POST(request: Request) {
  try {
    console.log("Starting database cleanup...")
    
    // Delete collections in specific order to handle dependencies
    // First delete evidence (if it exists as a subcollection)
    await deleteCollection('evidence')
    
    // Then delete impacts
    await deleteCollection('impacts')
    
    // Then delete articles
    await deleteCollection('articles')
    
    // Finally delete analysis history
    await deleteCollection('analysis_history')

    console.log("\nCleanup completed successfully")
    return Response.json({ 
      success: true, 
      message: "Successfully cleaned up all collections" 
    })
  } catch (error) {
    console.error("Database cleanup failed:", error)
    return Response.json(
      { 
        error: "Failed to clean up database",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
} 