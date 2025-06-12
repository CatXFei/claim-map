#!/usr/bin/env node

import fetch from 'node-fetch'

async function cleanupDatabase() {
  try {
    console.log('Triggering database cleanup...')
    
    // Get the server URL from environment or use default
    const serverUrl = process.env.SERVER_URL || 'http://localhost:3000'
    const response = await fetch(`${serverUrl}/api/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log('Cleanup successful:', data.message)
    } else {
      console.error('Cleanup failed:', data.error)
      process.exit(1)
    }
  } catch (error) {
    console.error('Failed to trigger cleanup:', error)
    process.exit(1)
  }
}

// Run cleanup
cleanupDatabase() 