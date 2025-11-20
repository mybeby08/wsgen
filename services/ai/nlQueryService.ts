/**
 * Natural Language Query Service
 * Allows users to ask questions about schedules in plain English
 */

import type { Schedule } from '@/types'
import { ErrorLogger } from '@/lib/errors'
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

interface QueryResponse {
  answer: string
  confidence: number
  context?: string
}

/**
 * Ask a natural language question about a schedule
 */
export async function askScheduleQuestion(
  question: string,
  schedule: Schedule
): Promise<QueryResponse | null> {
  if (!hasGeminiApiKey()) {
    return null
  }

  try {
    const model = getGeminiModel()
    if (!model) return null

    const prompt = buildQueryPrompt(question, schedule)
    const response = await model.generateContent(prompt)
    const text = response.response?.text() ?? ''

    return parseQueryResponse(text)
  } catch (error) {
    ErrorLogger.log(
      error instanceof Error ? error : new Error('Failed to process query'),
      { question }
    )
    return null
  }
}

function buildQueryPrompt(question: string, schedule: Schedule): string {
  // Simplified schedule data for the AI
  const scheduleData = {
    week: schedule.weekStarting,
    fairnessScore: schedule.fairnessScore,
    employees: Array.from(
      new Set(
        schedule.dailySchedules.flatMap((day) =>
          day.assignments.map((a) => getFirstName(a.employeeName || a.employeeId))
        )
      )
    ),
    dailySchedules: schedule.dailySchedules.map((day) => ({
      date: day.date,
      day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
      assignments: day.assignments.map((a) => ({
        employee: getFirstName(a.employeeName || a.employeeId),
        shift: a.shift,
      })),
    })),
  }

  return `
You are a helpful assistant that answers questions about work schedules.

Schedule Data:
${JSON.stringify(scheduleData, null, 2)}

User Question: "${question}"

Provide a clear, concise answer based on the schedule data. If you need to count or calculate something, be precise.

Respond in JSON format:
{
  "answer": "Your answer here",
  "confidence": 0.0-1.0,
  "context": "Optional: Additional helpful context"
}
`
}

function parseQueryResponse(text: string): QueryResponse | null {
  try {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) return null

    const json = text.slice(start, end + 1)
    const data = JSON.parse(json) as QueryResponse
    return data
  } catch (error) {
    ErrorLogger.log(
      error instanceof Error ? error : new Error('Failed to parse query response')
    )
    return null
  }
}

/**
 * Get suggested questions for the current schedule
 */
export function getSuggestedQuestions(schedule: Schedule): string[] {
  const hasOvertimeShifts = schedule.dailySchedules.some((day) =>
    day.assignments.some((a) => a.shift.toLowerCase().includes('overtime'))
  )

  const questions = [
    'Who works the most days this week?',
    'What day has the most coverage?',
    'Who has the most varied shifts?',
  ]

  if (hasOvertimeShifts) {
    questions.push('Who has overtime shifts?')
  }

  if (schedule.fairnessScore < 70) {
    questions.push('Why is the fairness score low?')
  }

  return questions
}
