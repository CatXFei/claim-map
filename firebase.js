// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app"
import { getFirestore } from "firebase/firestore"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAe0dSI1ofJ4gRPYJMqmv8zpPQwaNTxKNQ",
  authDomain: "claim-map-24f2d.firebaseapp.com",
  projectId: "claim-map-24f2d",
  storageBucket: "claim-map-24f2d.firebasestorage.app",
  messagingSenderId: "623619362576",
  appId: "1:623619362576:web:02f95358e23287fef31f95"
}

// Initialize Firebase only on the server side
let app = null
let db = null

// Only initialize Firebase on the server side
if (typeof window === 'undefined') {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig)
      db = getFirestore(app)
    } else {
      app = getApps()[0]
      db = getFirestore(app)
    }
  } catch (error) {
    console.error('Firebase initialization error:', error)
  }
}

// Export null for client-side, actual instances for server-side
export { app, db }