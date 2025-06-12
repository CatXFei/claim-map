import { NextRequest } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { getAnalysesByUser } from '@/lib/database-server'

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      // Return empty array if no auth token
      return Response.json({ analyses: [] })
    }

    // Get the token
    const token = authHeader.split('Bearer ')[1]
    
    // Verify the token and get the user
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    // Get analyses for this user
    const analyses = await getAnalysesByUser(userId)
    
    return Response.json({ analyses })
  } catch (error) {
    console.error('Error fetching analysis history:', error)
    // Return empty array on error
    return Response.json({ analyses: [] })
  }
}
