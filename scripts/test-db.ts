import { 
  createArticle, 
  getArticleById, 
  createImpact, 
  voteOnImpact, 
  addEvidence, 
  getArticleWithImpacts,
  deleteArticle 
} from '../lib/database.ts'

async function testDatabase() {
  try {
    console.log('Testing database operations...')

    // Test article creation
    console.log('\n1. Creating article...')
    const article = await createArticle(
      'Test Article',
      'This is a test article content.',
      'Test Entity'
    )
    console.log('Created article:', article)

    // Test getting article
    console.log('\n2. Getting article...')
    const retrievedArticle = await getArticleById(article.id)
    console.log('Retrieved article:', retrievedArticle)

    // Test impact creation
    console.log('\n3. Creating impact...')
    const impact = await createImpact(
      article.id,
      'Test Impacted Entity',
      'This is a test impact description.',
      0.5,
      0.9,
      'test'
    )
    console.log('Created impact:', impact)

    // Test voting
    console.log('\n4. Testing voting...')
    await voteOnImpact(impact.id, 'up')
    await voteOnImpact(impact.id, 'up')
    await voteOnImpact(impact.id, 'down')
    console.log('Votes recorded')

    // Test evidence creation
    console.log('\n5. Adding evidence...')
    const evidence = await addEvidence(
      impact.id,
      'This is test evidence.',
      'https://example.com/test',
      'test'
    )
    console.log('Added evidence:', evidence)

    // Test getting article with impacts
    console.log('\n6. Getting article with impacts...')
    const articleWithImpacts = await getArticleWithImpacts(article.id)
    console.log('Article with impacts:', articleWithImpacts)

    // Test deletion
    console.log('\n7. Cleaning up...')
    await deleteArticle(article.id)
    console.log('Article and related data deleted')

    console.log('\nAll tests completed successfully!')
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Run the tests
testDatabase() 