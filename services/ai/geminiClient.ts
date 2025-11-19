import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai'

import { APP_CONFIG, ENV } from '@/constants/config'

let client: GoogleGenerativeAI | null = null

export function hasGeminiApiKey(): boolean {
  return Boolean(ENV.GEMINI_API_KEY)
}

function getClient(): GoogleGenerativeAI | null {
  if (!client) {
    const apiKey = ENV.GEMINI_API_KEY
    if (!apiKey) {
      console.warn('[AI] Missing GEMINI_API_KEY in environment')
      return null
    }
    client = new GoogleGenerativeAI(apiKey)
  }
  return client
}

export function getGeminiModel(model = APP_CONFIG.AI.DEFAULT_MODEL): GenerativeModel | null {
  const sdk = getClient()
  if (!sdk) return null
  return sdk.getGenerativeModel({ model })
}


