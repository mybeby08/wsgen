import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai'
import Constants from 'expo-constants'

let client: GoogleGenerativeAI | null = null

function getApiKey(): string | undefined {
  return Constants.expoConfig?.extra?.geminiApiKey as string | undefined
}

export function hasGeminiApiKey(): boolean {
  return Boolean(getApiKey())
}

function getClient(): GoogleGenerativeAI | null {
  if (!client) {
    const apiKey = getApiKey()
    if (!apiKey) {
      console.warn('[AI] Missing GEMINI_API_KEY in environment')
      return null
    }
    client = new GoogleGenerativeAI(apiKey)
  }
  return client
}

const DEFAULT_MODEL = 'gemini-flash-latest'

export function getGeminiModel(model = DEFAULT_MODEL): GenerativeModel | null {
  const sdk = getClient()
  if (!sdk) return null
  return sdk.getGenerativeModel({ model })
}


