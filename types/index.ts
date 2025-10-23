export interface User {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  usageTier: 'free' | 'pro' | 'enterprise'
}

export interface Document {
  id: string
  name: string
  type: 'pdf' | 'docx' | 'xlsx' | 'image'
  storageUrl: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Workspace {
  id: string
  name: string
  role: 'admin' | 'editor' | 'viewer'
}

export interface AIQueryResponse {
  id: string
  query: string
  response: string
  model: string
  createdAt: Date
}

