// Script to trigger database schema migration
async function migrate() {
  try {
    const response = await fetch('http://localhost:3000/api/migrate', {
      method: 'POST',
    })
    
    const data = await response.json()
    
    if (data.success) {
      console.log('Migration completed successfully:', data.message)
    } else {
      console.error('Migration failed:', data.error, data.details)
    }
  } catch (error) {
    console.error('Failed to trigger migration:', error)
  }
}

migrate() 