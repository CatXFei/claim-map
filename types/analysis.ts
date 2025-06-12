export interface AnalysisData {
  article_title: string
  article_url: string
  article_id: number
  impacting_entity: string
  impacts: Impact[]
}

export interface Impact {
  impacted_entity: string
  impact: string
  supporting_evidence: Evidence[]
  score: number
  confidence: number | null
  user_feedback: {
    thumbs_up: number
    thumbs_down: number
  }
  source: string // Either 'user' or '/article/{id}' for article reference
}

export interface Evidence {
  description: string
  source_url: string
  source: string // Either 'user' or '/article/{id}' for article reference
}
