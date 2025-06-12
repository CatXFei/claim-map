import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
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

// Initialize Firebase Admin only on the server side
if (!getApps().length) {
  try {
    // Check each variable individually with logging
    console.log('Checking FIREBASE_PROJECT_ID:', !!process.env.FIREBASE_PROJECT_ID)
    console.log('Checking FIREBASE_CLIENT_EMAIL:', !!process.env.FIREBASE_CLIENT_EMAIL)
    console.log('Checking FIREBASE_PRIVATE_KEY:', !!process.env.FIREBASE_PRIVATE_KEY)

    if (!process.env.FIREBASE_PROJECT_ID) {
      throw new Error('Missing FIREBASE_PROJECT_ID environment variable')
    }
    if (!process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('Missing FIREBASE_CLIENT_EMAIL environment variable')
    }
    if (!process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('Missing FIREBASE_PRIVATE_KEY environment variable')
    }

    const app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    })
    console.log('Firebase Admin initialized successfully')
  } catch (error) {
    console.error('Firebase Admin initialization error:', error)
    throw error // Re-throw to prevent silent failures
  }
}

const db = getFirestore()

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

    const impactsSnapshot = await db.collection('impacts')
      .where('article_id', '==', id)
      .get()

    const impacts = impactsSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    })) as Impact[]

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

// Export other database functions as needed... 