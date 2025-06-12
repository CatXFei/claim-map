"use client"

import { initializeApp, getApps, FirebaseApp } from "firebase/app"
import { getAuth, Auth } from "firebase/auth"
import { getFirestore, Firestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyAe0dSI1ofJ4gRPYJMqmv8zpPQwaNTxKNQ",
  authDomain: "claim-map-24f2d.firebaseapp.com",
  projectId: "claim-map-24f2d",
  storageBucket: "claim-map-24f2d.firebasestorage.app",
  messagingSenderId: "623619362576",
  appId: "1:623619362576:web:02f95358e23287fef31f95"
}

// Initialize Firebase for client-side
let app: FirebaseApp
let auth: Auth
let db: Firestore

if (!getApps().length) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
} else {
  app = getApps()[0]
  auth = getAuth(app)
  db = getFirestore(app)
}

export { app, auth, db } 