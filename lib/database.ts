import { db, docToObject, querySnapshotToArray } from './firebase-admin.ts'

// Article operations
export async function createArticle(title: string, content: string, impactingEntity: string): Promise<Article> {
  const articleRef = await db.collection('articles').add({
    title,
    content,
    impacting_entity: impactingEntity,
    created_at: new Date(),
    updated_at: new Date(),
  })

  const doc = await articleRef.get()
  return docToObject<Article>(doc)
}

export async function getArticleById(id: string): Promise<Article | null> {
  const doc = await db.collection('articles').doc(id).get()
  if (!doc.exists) return null
  return docToObject<Article>(doc)
}

// Debug function to check evidence collection
export async function debugEvidenceCollection(): Promise<void> {
  const evidenceSnapshot = await db.collection('evidence').get()
  const evidence = querySnapshotToArray<Evidence>(evidenceSnapshot)
  
  console.log("Evidence collection debug:", {
    totalEvidence: evidence.length,
    evidenceByImpact: evidence.reduce((acc, ev) => {
      acc[ev.impact_id] = (acc[ev.impact_id] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    sampleEvidence: evidence.slice(0, 3).map(ev => ({
      id: ev.id,
      impact_id: ev.impact_id,
      description: ev.description?.slice(0, 50) + '...'
    }))
  })
}

export async function getArticleWithImpacts(id: string): Promise<{ article: Article; impacts: Impact[] } | null> {
  const article = await getArticleById(id)
  if (!article) return null

  // Get all impacts for the article
  const impactsSnapshot = await db
    .collection('impacts')
    .where('article_id', '==', id)
    .get()

  console.log(`Found ${impactsSnapshot.size} impacts for article ${id}`)

  // Get all impacts with their evidence
  const impacts = await Promise.all(
    impactsSnapshot.docs.map(async (impactDoc) => {
      const impact = docToObject<Impact>(impactDoc)
      console.log(`Processing impact ${impact.id}:`, {
        impacted_entity: impact.impacted_entity,
        evidenceIds: impact.supporting_evidence_ids || []
      })

      // Fetch evidence data for each ID
      const evidencePromises = (impact.supporting_evidence_ids || []).map(id => getEvidenceById(id))
      const evidenceData = (await Promise.all(evidencePromises)).filter((ev): ev is Evidence => ev !== null)

      console.log(`Fetched ${evidenceData.length} evidence items for impact ${impact.id}`)

      // Return impact with full evidence data
      return {
        ...impact,
        supporting_evidence: evidenceData // Add the full evidence data for UI rendering
      }
    })
  )

  console.log("Final impacts data:", impacts.map(imp => ({
    id: imp.id,
    impacted_entity: imp.impacted_entity,
    evidenceCount: imp.supporting_evidence?.length || 0
  })))

  return { article, impacts }
}

export async function deleteArticle(id: string): Promise<void> {
  // Delete all impacts first
  const impactsSnapshot = await db
    .collection('impacts')
    .where('article_id', '==', id)
    .get()

  const batch = db.batch()
  impactsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref)
  })
  batch.delete(db.collection('articles').doc(id))
  await batch.commit()
}

// Impact operations
export async function createImpact(
  articleId: string,
  impactedEntity: string,
  impact: string,
  score: number,
  confidence: number | null,
  source: string = 'ai'
): Promise<Impact> {
  console.log('createImpact - Starting impact creation:', {
    articleId,
    impactedEntity,
    impactLength: impact.length,
    score,
    confidence,
    source
  })

  try {
    // Verify the article exists first
    const articleRef = db.collection('articles').doc(articleId)
    const articleDoc = await articleRef.get()
    
    if (!articleDoc.exists) {
      console.error('createImpact - Article not found:', articleId)
      throw new Error(`Article with ID ${articleId} not found`)
    }

    console.log('createImpact - Article found, creating impact document')
    
    const impactRef = await db.collection('impacts').add({
      article_id: articleId,
      impacted_entity: impactedEntity,
      impact,
      score,
      confidence,
      source,
      user_votes_up: 0,
      user_votes_down: 0,
      supporting_evidence_ids: [], // Initialize empty evidence IDs array
      created_at: new Date(),
      updated_at: new Date(),
    })

    console.log('createImpact - Impact document created with ID:', impactRef.id)

    const doc = await impactRef.get()
    const impactData = docToObject<Impact>(doc)
    
    console.log('createImpact - Impact created successfully:', {
      id: impactData.id,
      article_id: impactData.article_id,
      impacted_entity: impactData.impacted_entity,
      created_at: impactData.created_at
    })

    return impactData
  } catch (error) {
    console.error('createImpact - Error creating impact:', error)
    if (error instanceof Error) {
      console.error('createImpact - Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }
    throw error // Re-throw to be handled by the API route
  }
}

export async function voteOnImpact(impactId: string, voteType: 'up' | 'down'): Promise<void> {
  const impactRef = db.collection('impacts').doc(impactId)
  const voteField = voteType === 'up' ? 'user_votes_up' : 'user_votes_down'

  await db.runTransaction(async (transaction) => {
    const impactDoc = await transaction.get(impactRef)
    if (!impactDoc.exists) {
      throw new Error('Impact not found')
    }

    const currentVotes = impactDoc.data()?.[voteField] || 0
    transaction.update(impactRef, {
      [voteField]: currentVotes + 1,
      updated_at: new Date(),
    })
  })
}

// Evidence operations
export async function addEvidence(
  impactId: string,
  description: string,
  sourceUrl: string | null,
  source: string = 'user'
): Promise<Evidence> {
  // First, create the evidence document
  const evidenceRef = await db.collection('evidence').add({
    impact_id: impactId,
    description,
    source_url: sourceUrl,
    source,
    created_at: new Date(),
    updated_at: new Date(),
  })

  // Get the created evidence document
  const evidenceDoc = await evidenceRef.get()
  const evidence = docToObject<Evidence>(evidenceDoc)

  // Update the parent impact to include this evidence ID
  const impactRef = db.collection('impacts').doc(impactId)
  await db.runTransaction(async (transaction) => {
    const impactDoc = await transaction.get(impactRef)
    if (!impactDoc.exists) {
      throw new Error('Impact not found')
    }

    const impact = docToObject<Impact>(impactDoc)
    const supporting_evidence_ids = impact.supporting_evidence_ids || []
    
    // Add the new evidence ID to the impact's supporting_evidence_ids array
    transaction.update(impactRef, {
      supporting_evidence_ids: [...supporting_evidence_ids, evidence.id],
      updated_at: new Date()
    })
  })

  return evidence
}

export async function getEvidenceForImpact(impactId: string): Promise<Evidence[]> {
  const snapshot = await db
    .collection('evidence')
    .where('impact_id', '==', impactId)
    .get()

  return querySnapshotToArray<Evidence>(snapshot)
}

// Analysis history operations
export async function getAnalysisHistory() {
  const articlesSnapshot = await db
    .collection('articles')
    .orderBy('created_at', 'desc')
    .limit(50)
    .get()

  const articles = querySnapshotToArray<Article>(articlesSnapshot)

  // Get impact counts for each article
  const articlesWithCounts = await Promise.all(
    articles.map(async (article) => {
      const impactsSnapshot = await db
        .collection('impacts')
        .where('article_id', '==', article.id)
        .count()
        .get()

      return {
        id: article.id,
        title: article.title,
        impacting_entity: article.impacting_entity,
        created_at: article.created_at,
        impacts_count: impactsSnapshot.data().count,
      }
    })
  )

  return articlesWithCounts
}

// Update the migration function to handle field name change
export async function migrateToNewSchema(): Promise<void> {
  console.log("Starting schema migration...")
  
  // Get all impacts
  const impactsSnapshot = await db.collection('impacts').get()
  const batch = db.batch()
  let batchCount = 0
  const BATCH_LIMIT = 500

  for (const impactDoc of impactsSnapshot.docs) {
    const impact = docToObject<Impact>(impactDoc)
    console.log(`Processing impact ${impact.id}:`, {
      hasEvidence: 'evidence' in impact,
      hasSupportingEvidence: 'supporting_evidence' in impact,
      currentFields: Object.keys(impact)
    })
    
    // Get evidence for this impact
    const evidenceSnapshot = await db
      .collection('evidence')
      .where('impact_id', '==', impact.id)
      .get()
    
    const supporting_evidence = querySnapshotToArray<Evidence>(evidenceSnapshot)
    
    // Create update object
    const updateData: any = {
      updated_at: new Date()
    }

    // If the impact has 'evidence' field, we'll remove it
    if ('evidence' in impact) {
      updateData.evidence = null // This will remove the field
    }

    // Add the new supporting_evidence field
    updateData.supporting_evidence = supporting_evidence

    // Update the impact document
    batch.update(impactDoc.ref, updateData)
    
    batchCount++
    
    // Firestore has a limit of 500 operations per batch
    if (batchCount >= BATCH_LIMIT) {
      await batch.commit()
      batchCount = 0
      console.log(`Migrated ${BATCH_LIMIT} impacts`)
    }
  }

  // Commit any remaining updates
  if (batchCount > 0) {
    await batch.commit()
    console.log(`Migrated final ${batchCount} impacts`)
  }

  console.log("Schema migration completed")
}

// Add a function to verify the migration
export async function verifyMigration(): Promise<void> {
  console.log("Verifying migration...")
  
  const impactsSnapshot = await db.collection('impacts').get()
  let totalImpacts = 0
  let impactsWithSupportingEvidence = 0
  let impactsWithOldEvidence = 0

  for (const impactDoc of impactsSnapshot.docs) {
    const impact = docToObject<Impact>(impactDoc)
    totalImpacts++
    
    if ('supporting_evidence' in impact) {
      impactsWithSupportingEvidence++
    }
    if ('evidence' in impact) {
      impactsWithOldEvidence++
    }
  }

  console.log("Migration verification results:", {
    totalImpacts,
    impactsWithSupportingEvidence,
    impactsWithOldEvidence,
    percentageMigrated: (impactsWithSupportingEvidence / totalImpacts * 100).toFixed(2) + '%'
  })
}

// Update the trigger function to include verification
export async function triggerSchemaMigration(): Promise<void> {
  try {
    console.log("Starting migration process...")
    await migrateToNewSchema()
    console.log("Migration completed, verifying results...")
    await verifyMigration()
    console.log("Migration process completed successfully")
  } catch (error) {
    console.error("Migration failed:", error)
    throw error
  }
}

// Add a migration function to convert existing impacts to use evidence IDs
export async function migrateToEvidenceIds(): Promise<void> {
  console.log("Starting migration to evidence IDs...")
  
  // Get all impacts
  const impactsSnapshot = await db.collection('impacts').get()
  console.log(`Found ${impactsSnapshot.size} impacts to migrate`)

  // Process each impact
  for (const impactDoc of impactsSnapshot.docs) {
    const impact = docToObject<Impact>(impactDoc)
    console.log(`Processing impact ${impact.id}:`, {
      impacted_entity: impact.impacted_entity,
      hasSupportingEvidence: 'supporting_evidence' in impact,
      evidenceCount: impact.supporting_evidence?.length || 0
    })

    // Skip if already migrated
    if (impact.supporting_evidence_ids) {
      console.log(`Impact ${impact.id} already has evidence IDs, skipping`)
      continue
    }

    // If impact has supporting_evidence array, migrate it
    if (impact.supporting_evidence && impact.supporting_evidence.length > 0) {
      const evidenceIds = []
      
      // Create evidence documents for each evidence
      for (const evidence of impact.supporting_evidence) {
        const evidenceRef = await db.collection('evidence').add({
          description: evidence.description,
          source_url: evidence.source_url || "",
          source: evidence.source || "system",
          created_at: new Date(),
          updated_at: new Date()
        })
        evidenceIds.push(evidenceRef.id)
        console.log(`Created evidence document with ID: ${evidenceRef.id}`)
      }

      // Update impact with evidence IDs
      await impactDoc.ref.update({
        supporting_evidence_ids: evidenceIds,
        updated_at: new Date()
      })
      console.log(`Updated impact ${impact.id} with ${evidenceIds.length} evidence IDs`)
    } else {
      // Initialize empty evidence IDs array
      await impactDoc.ref.update({
        supporting_evidence_ids: [],
        updated_at: new Date()
      })
      console.log(`Initialized empty evidence IDs array for impact ${impact.id}`)
    }
  }

  console.log("Migration to evidence IDs completed")
}

// Add a function to trigger the migration
export async function triggerEvidenceIdsMigration(): Promise<void> {
  try {
    await migrateToEvidenceIds()
    console.log("Evidence IDs migration completed successfully")
  } catch (error) {
    console.error("Evidence IDs migration failed:", error)
    throw error
  }
}

export interface Article {
  id: string
  title: string
  content: string
  url?: string
  impacting_entity: string
  created_at: Date
  updated_at: Date
}

export interface Impact {
  id: string
  article_id: string
  impacted_entity: string
  impact: string
  score: number
  confidence: number | null
  source: string
  user_votes_up: number
  user_votes_down: number
  supporting_evidence_ids: string[] // Store evidence IDs instead of full evidence objects
  created_at: Date
  updated_at: Date
}

export interface Evidence {
  id: string
  impact_id: string
  description: string
  source_url?: string
  source: string
  created_at: Date
  updated_at: Date
}

// Add a function to get evidence by ID
export async function getEvidenceById(id: string): Promise<Evidence | null> {
  const doc = await db.collection('evidence').doc(id).get()
  if (!doc.exists) return null
  return docToObject<Evidence>(doc)
}

// Update the analyze API to store evidence IDs
export async function storeAnalysisData(articleId: string, analysisData: any): Promise<void> {
  const impactsRef = db.collection('impacts')
  
  for (const impact of analysisData.impacts) {
    // Create evidence documents first
    const evidenceIds = []
    if (impact.supporting_evidence && impact.supporting_evidence.length > 0) {
      for (const evidence of impact.supporting_evidence) {
        const evidenceRef = await db.collection('evidence').add({
          description: evidence.description,
          source_url: evidence.source_url || "",
          source: evidence.source || "system",
          created_at: new Date(),
          updated_at: new Date()
        })
        evidenceIds.push(evidenceRef.id)
      }
    }

    // Create impact with evidence IDs
    await impactsRef.add({
      article_id: articleId,
      impacted_entity: impact.impacted_entity,
      impact: impact.impact,
      score: impact.score,
      confidence: impact.confidence,
      source: impact.source || "system",
      user_votes_up: 0,
      user_votes_down: 0,
      supporting_evidence_ids: evidenceIds,
      created_at: new Date(),
      updated_at: new Date()
    })
  }
}
