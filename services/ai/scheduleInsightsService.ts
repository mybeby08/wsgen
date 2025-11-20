import type { AISuggestion, Schedule } from '@/types'

import { APP_CONFIG } from '@/constants/config'
import { getGeminiModel, hasGeminiApiKey } from './geminiClient'

/**
 * Extract first name from "LastName, FirstName" format
 */
function getFirstName(fullName: string): string {
  if (fullName.includes(',')) {
    const parts = fullName.split(',')
    return parts[1]?.trim() || fullName
  }
  return fullName
}

interface GeminiSuggestion {
  title: string
  description: string
  impact: 'LOW' | 'MEDIUM' | 'HIGH'
}

export async function getScheduleInsights(schedule: Schedule): Promise<AISuggestion[]> {
  if (!hasGeminiApiKey()) {
    return []
  }

  try {
    const model = getGeminiModel()
    if (!model) return []

    const prompt = buildPrompt(schedule)
    const response = await model.generateContent(prompt)
    const text = response.response?.text() ?? ''

    const parsed = parseSuggestions(text)
    return parsed.slice(0, APP_CONFIG.AI.MAX_SUGGESTIONS)
  } catch (error) {
    console.warn('[AI] Failed to fetch schedule insights', error)
    return []
  }
}

function buildPrompt(schedule: Schedule): string {
  const summary = {
    weekStarting: schedule.weekStarting,
    fairnessScore: schedule.fairnessScore,
    dailySchedules: schedule.dailySchedules.map((day) => ({
      date: day.date,
      assignments: day.assignments.map((assignment) => ({
        employee: getFirstName(assignment.employeeName || assignment.employeeId),
        shift: assignment.shift,
      })),
    })),
  }

  return `
You are an assistant that reviews employee work schedules for fairness and balance.

Given the following schedule JSON, provide up to 5 actionable suggestions that could improve fairness, coverage, or employee well-being.

JSON:
${JSON.stringify(summary, null, 2)}

Respond strictly in valid JSON with the following shape:
{
  "suggestions": [
    { "title": string, "description": string, "impact": "LOW" | "MEDIUM" | "HIGH" }
  ]
}
`
}

function parseSuggestions(text: string): AISuggestion[] {
  try {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) {
      return []
    }
    const json = text.slice(start, end + 1)
    const data = JSON.parse(json) as { suggestions?: GeminiSuggestion[] }
    return (
      data.suggestions?.map((suggestion) => ({
        title: suggestion.title,
        description: suggestion.description,
        impact: normalizeImpact(suggestion.impact),
      })) ?? []
    )
  } catch (error) {
    console.warn('[AI] Unable to parse Gemini response', error)
    return []
  }
}

function normalizeImpact(value: string): 'LOW' | 'MEDIUM' | 'HIGH' {
  const upper = value?.toUpperCase()
  if (upper === 'LOW' || upper === 'MEDIUM' || upper === 'HIGH') {
    return upper
  }
  return 'MEDIUM'
}


