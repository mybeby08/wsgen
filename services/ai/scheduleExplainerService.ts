/**
 * Schedule Explainer Service
 * Generates human-readable explanations for schedules
 */

import type { Schedule, Employee } from '@/types'
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

interface ScheduleExplanation {
  summary: string
  keyPoints: string[]
  employeeNotes: Record<string, string>
}

/**
 * Generate a plain English explanation of the schedule
 */
export async function explainSchedule(
  schedule: Schedule,
  employees: Employee[]
): Promise<ScheduleExplanation | null> {
  if (!hasGeminiApiKey()) {
    return generateBasicExplanation(schedule)
  }

  try {
    const model = getGeminiModel()
    if (!model) return generateBasicExplanation(schedule)

    const prompt = buildExplanationPrompt(schedule, employees)
    const response = await model.generateContent(prompt)
    const text = response.response?.text() ?? ''

    return parseExplanation(text)
  } catch (error) {
    ErrorLogger.log(
      error instanceof Error ? error : new Error('Failed to generate explanation')
    )
    return generateBasicExplanation(schedule)
  }
}

function buildExplanationPrompt(schedule: Schedule, employees: Employee[]): string {
  const scheduleData = {
    week: schedule.weekStarting,
    fairnessScore: schedule.fairnessScore,
    totalEmployees: employees.length,
    availableEmployees: employees.filter((e) => !e.isOnLeave).length,
    dailySchedules: schedule.dailySchedules.map((day) => ({
      date: day.date,
      assignmentCount: day.assignments.length,
      uniqueShifts: Array.from(new Set(day.assignments.map((a) => a.shift))),
    })),
  }

  return `
You are a schedule manager explaining this week's work schedule to your team.

Schedule Details:
${JSON.stringify(scheduleData, null, 2)}

Generate a friendly, clear explanation that includes:
1. Overall summary (2-3 sentences)
2. 3-5 key points about the schedule
3. Brief notes for each employee about their week

Be encouraging and positive while being factual.

Respond in JSON:
{
  "summary": "Overall summary here",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "employeeNotes": {
    "EmployeeName": "Brief note about their schedule"
  }
}
`
}

function parseExplanation(text: string): ScheduleExplanation | null {
  try {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) return null

    const json = text.slice(start, end + 1)
    return JSON.parse(json) as ScheduleExplanation
  } catch (error) {
    return null
  }
}

/**
 * Fallback: Generate basic explanation without AI
 */
function generateBasicExplanation(schedule: Schedule): ScheduleExplanation {
  const totalAssignments = schedule.dailySchedules.reduce(
    (sum, day) => sum + day.assignments.length,
    0
  )

  const uniqueEmployees = Array.from(
    new Set(
      schedule.dailySchedules.flatMap((day) =>
        day.assignments.map((a) => getFirstName(a.employeeName || a.employeeId))
      )
    )
  )

  const fairnessLevel =
    schedule.fairnessScore >= 80
      ? 'excellent'
      : schedule.fairnessScore >= 70
      ? 'good'
      : 'fair'

  return {
    summary: `This week's schedule covers ${schedule.dailySchedules.length} days with ${uniqueEmployees.length} team members. The fairness score is ${schedule.fairnessScore}/100, which is ${fairnessLevel}. Total shifts assigned: ${totalAssignments}.`,
    keyPoints: [
      `${uniqueEmployees.length} employees scheduled`,
      `Fairness score: ${schedule.fairnessScore}/100`,
      `Week starting: ${new Date(schedule.weekStarting).toLocaleDateString()}`,
    ],
    employeeNotes: {},
  }
}

/**
 * Explain why a specific employee got their shifts
 */
export async function explainEmployeeSchedule(
  employeeName: string,
  schedule: Schedule
): Promise<string> {
  const firstName = getFirstName(employeeName)
  const employeeShifts = schedule.dailySchedules.flatMap((day) =>
    day.assignments
      .filter((a) => a.employeeName === employeeName)
      .map((a) => ({
        date: day.date,
        shift: a.shift,
      }))
  )

  if (employeeShifts.length === 0) {
    return `${firstName} is not scheduled this week or may be on leave.`
  }

  const shiftTypes = Array.from(new Set(employeeShifts.map((s) => s.shift)))

  return `${firstName} works ${employeeShifts.length} shifts this week across ${shiftTypes.join(', ')} shifts. This assignment helps maintain schedule fairness and coverage balance.`
}
