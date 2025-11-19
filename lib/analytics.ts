/**
 * Analytics and telemetry utilities
 * In production, this would integrate with services like Firebase Analytics
 */

export const Analytics = {
  /**
   * Track a screen view
   */
  screenView(screenName: string): void {
    if (__DEV__) {
      console.log('[Analytics] Screen View:', screenName)
    }
    // In production: Send to analytics service
  },

  /**
   * Track a user action
   */
  event(eventName: string, params?: Record<string, unknown>): void {
    if (__DEV__) {
      console.log('[Analytics] Event:', eventName, params)
    }
    // In production: Send to analytics service
  },

  /**
   * Track schedule generation
   */
  scheduleGenerated(weekStarting: string, employeeCount: number): void {
    this.event('schedule_generated', {
      week_starting: weekStarting,
      employee_count: employeeCount,
    })
  },

  /**
   * Track AI insights usage
   */
  aiInsightsViewed(suggestionsCount: number): void {
    this.event('ai_insights_viewed', {
      suggestions_count: suggestionsCount,
    })
  },

  /**
   * Track schedule edits
   */
  scheduleEdited(editCount: number): void {
    this.event('schedule_edited', {
      edit_count: editCount,
    })
  },
}
