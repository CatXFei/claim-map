import { db } from "@/lib/firebase-admin"
import type { DocumentData, DocumentSnapshot } from "firebase-admin/firestore"
import type { Article, Impact, Evidence } from './types'

// Debug logging for environment variables
console.log('Firebase Admin Environment Variables:', {
  hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
  projectId: process.env.FIREBASE_PROJECT_ID,
  hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
  privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length
})

// Helper function to convert Firestore document to plain object
function docToObject<T>(doc: DocumentSnapshot<DocumentData>): T {
  const data = doc.data()
  if (!data) {
    throw new Error(`Document ${doc.id} has no data`)
  }
  return {
    id: doc.id,
    ...data
  } as T
}

export interface ArticleData {
  id: string
  title: string
  content: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

interface AnalysisData {
  id: string
  userId: string
  articleId: string
  createdAt: Date
  updatedAt: Date
  title: string
  impactCount: number
}

export interface AnalysisHistoryEntry {
  id: string
  userId: string
  articleId: string
  createdAt: Date
  updatedAt: Date
  title: string
  impactCount: number
}

export interface AnalysisHistoryWithArticle extends AnalysisHistoryEntry {
  article: {
    id: string
    title: string
    content: string
    url: string
    impacting_entity: string
    created_at: Date
    updated_at: Date
    cnt_of_impacts: number
  }
}

export async function saveArticle(articleData: Omit<ArticleData, 'id' | 'createdAt' | 'updatedAt'>) {
  const docRef = db.collection('articles').doc()
  const now = new Date()
  
  const data: ArticleData = {
    ...articleData,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  }

  await docRef.set(data)
  return data
}

export async function saveAnalysis(analysisData: Omit<AnalysisData, 'createdAt' | 'updatedAt'>) {
  const docRef = db.collection('analyses').doc()
  const now = new Date()
  
  const data: AnalysisData = {
    ...analysisData,
    createdAt: now,
    updatedAt: now,
  }

  await docRef.set(data)
  return data
}

export async function getArticlesByUser(userId: string) {
  const snapshot = await db
    .collection('articles')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get()

  return snapshot.docs.map(doc => doc.data() as ArticleData)
}

export async function getAnalysesByUser(userId: string): Promise<AnalysisHistoryWithArticle[]> {
  try {
    // Get all analysis history entries for this user
    const snapshot = await db.collection('analysis_history')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()

    const analyses: AnalysisHistoryWithArticle[] = []

    // For each analysis history entry, get the associated article
    for (const doc of snapshot.docs) {
      const data = doc.data()
      if (!data) {
        console.warn(`Analysis history entry ${doc.id} has no data`)
        continue
      }

      // Convert Firestore timestamps to ISO strings for serialization
      const entry: AnalysisHistoryEntry = {
        id: doc.id,
        userId: data.userId,
        articleId: data.articleId,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        title: data.title,
        impactCount: data.impactCount
      }
      
      // Get the article document
      const articleDoc = await db.collection('articles').doc(entry.articleId).get()
      if (!articleDoc.exists) {
        console.warn(`Article ${entry.articleId} not found for analysis ${entry.id}`)
        continue
      }

      // Get the impacts count for this article
      const impactsSnapshot = await db.collection('impacts')
        .where('articleId', '==', entry.articleId)
        .count()
        .get()

      const articleData = articleDoc.data()
      if (!articleData) {
        console.warn(`Article ${entry.articleId} has no data`)
        continue
      }

      // Convert Firestore timestamps to Date objects
      const article = {
        id: articleDoc.id,
        title: articleData.title || '',
        content: articleData.content || '',
        url: articleData.url || '',
        impacting_entity: articleData.impacting_entity || '',
        created_at: articleData.created_at?.toDate?.() || new Date(),
        updated_at: articleData.updated_at?.toDate?.() || new Date(),
        cnt_of_impacts: impactsSnapshot.data().count || 0
      }

      analyses.push({
        ...entry,
        article
      })
    }

    return analyses
  } catch (error) {
    console.error('Error getting analyses by user:', error)
    throw error
  }
}

export async function getArticleById(id: string): Promise<Article | null> {
  try {
    const doc = await db.collection('articles').doc(id).get()
    if (!doc.exists) return null
    
    // Use docToObject to include the document ID
    const article = {
      ...doc.data(),
      id: doc.id
    } as Article
    
    console.log('getArticleById - Retrieved article:', {
      id: article.id,
      title: article.title,
      hasId: !!article.id
    })
    
    return article
  } catch (error) {
    console.error('Error getting article:', error)
    throw error
  }
}

export async function getArticleWithImpacts(id: string): Promise<{ article: Article; impacts: Impact[] } | null> {
  try {
    const article = await getArticleById(id)
    if (!article) return null

    // Get all impacts for the article
    const impactsSnapshot = await db.collection('impacts')
      .where('article_id', '==', id)
      .get()

    console.log(`Found ${impactsSnapshot.size} impacts for article ${id}`)

    // Get all impacts with their evidence
    const impacts = impactsSnapshot.docs.map(doc => docToObject<Impact>(doc))

    console.log("Final impacts data:", impacts.map(imp => ({
      id: imp.id,
      impacted_entity: imp.impacted_entity,
      evidenceCount: imp.supporting_evidence?.length || 0
    })))

    return { article, impacts }
  } catch (error) {
    console.error('Error getting article with impacts:', error)
    throw error
  }
}

export async function getEvidenceById(id: string): Promise<Evidence | null> {
  try {
    const doc = await db.collection('evidence').doc(id).get()
    return doc.exists ? (doc.data() as Evidence) : null
  } catch (error) {
    console.error('Error getting evidence:', error)
    throw error
  }
}

export async function deleteArticle(id: string): Promise<void> {
  try {
    // Delete the article
    await db.collection('articles').doc(id).delete()

    // Delete associated impacts
    const impactsSnapshot = await db.collection('impacts')
      .where('article_id', '==', id)
      .get()

    const batch = db.batch()
    impactsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })
    await batch.commit()
  } catch (error) {
    console.error('Error deleting article:', error)
    throw error
  }
}

export async function getAnalysisById(id: string) {
  const doc = await db.collection('analyses').doc(id).get()
  return doc.exists ? (doc.data() as AnalysisData) : null
}

export async function updateArticle(id: string, data: Partial<ArticleData>) {
  const docRef = db.collection('articles').doc(id)
  const updateData = {
    ...data,
    updatedAt: new Date(),
  }
  await docRef.update(updateData)
  return { id, ...updateData }
}

export async function updateAnalysis(id: string, data: Partial<AnalysisData>) {
  const docRef = db.collection('analyses').doc(id)
  const updateData = {
    ...data,
    updatedAt: new Date(),
  }
  await docRef.update(updateData)
  return { id, ...updateData }
}

export async function deleteAnalysis(id: string) {
  await db.collection('analyses').doc(id).delete()
}

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
      user_feedback: {
        thumbs_up: 0,
        thumbs_down: 0
      },
      supporting_evidence: [], // Initialize empty evidence array
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
    throw error
  }
}

export async function addEvidence(
  impactId: string,
  description: string,
  sourceUrl: string | null,
  source: string = 'user'
): Promise<Evidence> {
  // Create the evidence document
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

  // Update the parent impact to include this evidence
  const impactRef = db.collection('impacts').doc(impactId)
  await db.runTransaction(async (transaction) => {
    const impactDoc = await transaction.get(impactRef)
    if (!impactDoc.exists) {
      throw new Error('Impact not found')
    }

    const impact = docToObject<Impact>(impactDoc)
    const supporting_evidence = impact.supporting_evidence || []
    
    // Add the new evidence to the impact's supporting_evidence array
    transaction.update(impactRef, {
      supporting_evidence: [...supporting_evidence, evidence],
      updated_at: new Date()
    })
  })

  return evidence
}

// Update the analyze API to store evidence directly
export async function storeAnalysisData(articleId: string, analysisData: any): Promise<void> {
  const impactsRef = db.collection('impacts')
  
  for (const impact of analysisData.impacts) {
    console.log('Processing impact evidence before filtering:', 
      impact.supporting_evidence?.map((ev: Evidence) => ({
        description: ev.description,
        source_url: ev.source_url
      }))
    )

    // Process evidence to filter out example.com URLs
    const processedEvidence = (impact.supporting_evidence || []).map((evidence: Evidence) => {
      const originalUrl = evidence.source_url || ""
      const isExampleUrl = originalUrl.startsWith('https://example.com')
      const finalUrl = isExampleUrl ? "" : originalUrl
      
      console.log('Evidence URL processing:', {
        originalUrl,
        isExampleUrl,
        finalUrl
      })

      return {
        ...evidence,
        source_url: finalUrl
      }
    })

    console.log('Processed evidence after filtering:', 
      processedEvidence.map((ev: Evidence) => ({
        description: ev.description,
        source_url: ev.source_url
      }))
    )

    // Create impact with processed evidence
    const impactData = {
      article_id: articleId,
      impacted_entity: impact.impacted_entity,
      impact: impact.impact,
      score: impact.score,
      confidence: impact.confidence,
      source: impact.source || "system",
      user_feedback: {
        thumbs_up: 0,
        thumbs_down: 0
      },
      supporting_evidence: processedEvidence,
      created_at: new Date(),
      updated_at: new Date()
    }

    console.log('Storing impact data:', {
      article_id: impactData.article_id,
      impacted_entity: impactData.impacted_entity,
      evidenceCount: impactData.supporting_evidence.length,
      evidenceUrls: impactData.supporting_evidence.map((ev: Evidence) => ev.source_url)
    })

    await impactsRef.add(impactData)
  }
}

// Export other database functions as needed... 