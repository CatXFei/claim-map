import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Debug logging for environment variables
console.log('Firebase Admin Environment Variables:')
console.log('FIREBASE_ADMIN_PROJECT_ID:', process.env.FIREBASE_ADMIN_PROJECT_ID ? 'Set' : 'Not set')
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Not set')
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Not set')

// Initialize Firebase Admin
const apps = getApps()

if (!apps.length) {
  // Check if we're in a production environment
  if (process.env.FIREBASE_ADMIN_PROJECT_ID) {
    // Production environment - use service account
    try {
      // Remove quotes and handle escaped newlines
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ?.replace(/^"|"$/g, '') // Remove surrounding quotes
        ?.replace(/\\n/g, '\n') // Replace escaped newlines with actual newlines

      console.log('Private key format check:', {
        hasValue: !!privateKey,
        length: privateKey?.length,
        startsWith: privateKey?.substring(0, 20),
        endsWith: privateKey?.substring(privateKey.length - 20)
      })

      if (!privateKey) {
        throw new Error('FIREBASE_PRIVATE_KEY is not set or empty')
      }

      const credential = cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
      })

      initializeApp({ credential })
      console.log('Firebase Admin initialized successfully')
    } catch (error) {
      console.error('Firebase Admin initialization error:', error)
      throw error
    }
  } else {
    // Development environment - use default credentials
    initializeApp()
  }
}

// Initialize Firestore
export const db = getFirestore()

// Helper function to convert Firestore document to plain object
export const docToObject = <T>(doc: FirebaseFirestore.DocumentSnapshot): T => {
  const data = doc.data()
  return {
    id: doc.id,
    ...data,
  } as T
}

// Helper function to convert Firestore query snapshot to array of objects
export const querySnapshotToArray = <T>(snapshot: FirebaseFirestore.QuerySnapshot): T[] => {
  return snapshot.docs.map(doc => docToObject<T>(doc))
} 