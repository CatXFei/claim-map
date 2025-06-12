export interface Article {
  id: string
  title: string
  content: string
  url?: string
  impacting_entity: string
  created_at: Date
  updated_at: Date
}

export interface Impact {
  id: string
  article_id: string
  impacted_entity: string
  impact: string
  score: number
  confidence: number | null
  user_votes_up: number
  user_votes_down: number
  source: string
  supporting_evidence_ids: string[]
  supporting_evidence?: Evidence[]
  legacy_supporting_evidence?: Evidence[]
  created_at: Date
  updated_at: Date
}

export interface Evidence {
  id: string
  impact_id: string
  description: string
  source_url?: string
  source: string
  created_at: Date
  updated_at: Date
} 