# AI Features Integration Guide

## 🎯 Quick Start - Add AI to Your Schedule Screen

### Option 1: Add All-in-One AI Panel (Recommended)

```tsx
// In app/(tabs)/index.tsx
import { AIInsightsPanel } from '@/components/ai'

export default function ScheduleScreen() {
  const { schedule, employees } = useScheduleStore(
    useShallow((state) => ({
      schedule: state.schedule,
      employees: state.employees,
    }))
  )

  return (
    <ScrollView>
      {/* Your existing schedule content */}
      
      {/* Add AI Insights Panel */}
      {schedule && (
        <View className="px-4 py-3">
          <AIInsightsPanel 
            schedule={schedule} 
            employees={employees}
            defaultExpanded={false}
          />
        </View>
      )}
    </ScrollView>
  )
}
```

**This gives you:**
- ✅ Conflict detection (works without API key)
- ✅ Natural language queries (requires Gemini API)
- ✅ Schedule explanations (has fallback without API)
- ✅ Tabbed interface for easy navigation

---

### Option 2: Add Individual AI Components

#### A. Add Conflict Alerts Only

```tsx
import { ConflictAlerts } from '@/components/ai'

{schedule && (
  <ConflictAlerts 
    schedule={schedule} 
    employees={employees}
    onDismiss={(conflict) => {
      // Optional: Handle dismissing conflicts
      console.log('Dismissed:', conflict.title)
    }}
  />
)}
```

**Best for:** Quick wins, works 100% offline (no AI API needed)

---

#### B. Add Query Panel

```tsx
import { ScheduleQueryPanel } from '@/components/ai'

{schedule && (
  <ScheduleQueryPanel schedule={schedule} />
)}
```

**Best for:** Interactive AI questions

---

#### C. Add Schedule Summary

```tsx
import { ScheduleExplanationCard } from '@/components/ai'

{schedule && (
  <ScheduleExplanationCard 
    schedule={schedule} 
    employees={employees}
  />
)}
```

**Best for:** Auto-generated schedule descriptions

---

## 📍 Suggested Placement Locations

### 1. **On Schedule Screen (Recommended)**

```tsx
// app/(tabs)/index.tsx - After schedule generation
<ScrollView>
  <WeekSelector {...weekProps} />
  
  {/* Show conflicts right after week selector */}
  {schedule && (
    <View className="px-4 mt-3">
      <ConflictAlerts schedule={schedule} employees={employees} />
    </View>
  )}
  
  {/* Your daily schedule cards */}
  {schedule?.dailySchedules.map(...)}
  
  {/* AI Panel at bottom */}
  {schedule && (
    <View className="px-4 py-4">
      <AIInsightsPanel schedule={schedule} employees={employees} />
    </View>
  )}
</ScrollView>
```

---

### 2. **In Settings Screen**

```tsx
// app/(tabs)/settings.tsx - Add AI toggle
<View className="mt-4">
  <Text className="font-bold mb-2">AI Features</Text>
  <Switch 
    value={aiEnabled}
    onValueChange={setAiEnabled}
    label="Enable AI Insights"
  />
  <Text color="tertiary" className="text-xs mt-1">
    Get smart suggestions and conflict detection
  </Text>
</View>
```

---

### 3. **As a Modal**

```tsx
// Create new file: components/ai/AIInsightsModal.tsx
import { Modal, Pressable, View } from 'react-native'
import { AIInsightsPanel } from './AIInsightsPanel'

export function AIInsightsModal({ schedule, employees, visible, onClose }) {
  return (
    <Modal visible={visible} animationType="slide">
      <View className="flex-1 bg-background p-4">
        <Pressable onPress={onClose} className="self-end mb-4">
          <Text className="text-primary font-semibold">Close</Text>
        </Pressable>
        
        <AIInsightsPanel 
          schedule={schedule} 
          employees={employees}
          defaultExpanded={true}
        />
      </View>
    </Modal>
  )
}
```

```tsx
// Then in your schedule screen:
const [showAI, setShowAI] = useState(false)

<Pressable onPress={() => setShowAI(true)}>
  <Icon name="sparkle" size={20} />
  <Text>AI Insights</Text>
</Pressable>

<AIInsightsModal 
  visible={showAI}
  onClose={() => setShowAI(false)}
  schedule={schedule}
  employees={employees}
/>
```

---

## 🎨 Customization Examples

### Change Colors

```tsx
// Customize conflict alert colors
<ConflictAlerts 
  schedule={schedule} 
  employees={employees}
/>

// Then in ConflictAlerts.tsx, modify SEVERITY_CONFIG:
const SEVERITY_CONFIG = {
  high: {
    color: 'text-purple-600',  // Your custom color
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  // ...
}
```

### Add Analytics Tracking

```tsx
import { Analytics } from '@/lib/analytics'

<ConflictAlerts 
  schedule={schedule} 
  employees={employees}
  onDismiss={(conflict) => {
    Analytics.event('conflict_dismissed', {
      type: conflict.type,
      severity: conflict.severity
    })
  }}
/>
```

### Show Only High Priority Conflicts

```tsx
// Create a filtered version
const highPriorityOnly = detectScheduleConflicts(schedule, employees)
  .filter(c => c.severity === 'high')

{highPriorityOnly.length > 0 && (
  <View className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
    <Text className="font-bold text-red-700">
      ⚠️ {highPriorityOnly.length} Critical Issues
    </Text>
  </View>
)}
```

---

## 💡 Usage Tips

### 1. **Conditional Rendering Based on API Key**

```tsx
import { hasGeminiApiKey } from '@/services/ai'

{hasGeminiApiKey() ? (
  <ScheduleQueryPanel schedule={schedule} />
) : (
  <View className="rounded-lg bg-muted p-4">
    <Text className="text-sm text-tertiary">
      Configure your Gemini API key in settings to use AI features
    </Text>
  </View>
)}
```

### 2. **Show Conflict Badge in Tab Bar**

```tsx
// In TabsLayout
const conflicts = detectScheduleConflicts(schedule, employees)
const highSeverityCount = conflicts.filter(c => c.severity === 'high').length

<Tabs.Screen
  name="index"
  options={{
    title: 'Schedule',
    tabBarBadge: highSeverityCount > 0 ? highSeverityCount : undefined,
  }}
/>
```

### 3. **Auto-Expand Panel if Conflicts Exist**

```tsx
const conflicts = detectScheduleConflicts(schedule, employees)
const hasHighPriority = conflicts.some(c => c.severity === 'high')

<AIInsightsPanel 
  schedule={schedule} 
  employees={employees}
  defaultExpanded={hasHighPriority}  // Auto-expand if issues
/>
```

---

## 🔧 Troubleshooting

### AI Features Not Working?

1. **Check API Key**
```bash
# Verify .env.local has:
GEMINI_API_KEY=your_key_here
```

2. **Restart Expo**
```bash
npm run start -- --clear
```

3. **Check Console**
```tsx
import { hasGeminiApiKey } from '@/services/ai'

console.log('AI Available:', hasGeminiApiKey())
```

### Conflicts Not Showing?

```tsx
// Debug conflicts
const conflicts = detectScheduleConflicts(schedule, employees)
console.log('Detected conflicts:', conflicts.length)
console.log('Details:', conflicts)
```

---

## 📊 Performance Considerations

### Lazy Load AI Panel

```tsx
const [showAI, setShowAI] = useState(false)

{showAI && (
  <AIInsightsPanel schedule={schedule} employees={employees} />
)}

<Pressable onPress={() => setShowAI(true)}>
  <Text>Load AI Insights</Text>
</Pressable>
```

### Memoize Conflict Detection

```tsx
const conflicts = useMemo(
  () => detectScheduleConflicts(schedule, employees),
  [schedule, employees]
)
```

### Debounce AI Queries

```tsx
import { useDebouncedValue } from '@/hooks'

const [query, setQuery] = useState('')
const debouncedQuery = useDebouncedValue(query, 500)

useEffect(() => {
  if (debouncedQuery) {
    askScheduleQuestion(debouncedQuery, schedule)
  }
}, [debouncedQuery])
```

---

## 🎁 Bonus: Notification System

Create a notification for conflicts:

```tsx
// hooks/useConflictNotifications.ts
import { useEffect } from 'react'
import { detectScheduleConflicts } from '@/services/ai'

export function useConflictNotifications(schedule, employees) {
  useEffect(() => {
    if (!schedule) return
    
    const conflicts = detectScheduleConflicts(schedule, employees)
    const criticalCount = conflicts.filter(c => c.severity === 'high').length
    
    if (criticalCount > 0) {
      // Show toast notification
      console.log(`⚠️ ${criticalCount} critical schedule issues detected!`)
      // Or use expo-notifications for real notifications
    }
  }, [schedule, employees])
}
```

Usage:
```tsx
export default function ScheduleScreen() {
  const { schedule, employees } = useScheduleStore()
  
  useConflictNotifications(schedule, employees)
  
  return <View>...</View>
}
```

---

## ✅ Complete Integration Example

```tsx
// app/(tabs)/index.tsx
import React from 'react'
import { ScrollView, View } from 'react-native'
import { useScheduleStore } from '@/store/scheduleStore'
import { AIInsightsPanel } from '@/components/ai'
import { hasGeminiApiKey } from '@/services/ai'

export default function ScheduleScreen() {
  const { schedule, employees, generateSchedule } = useScheduleStore()
  
  return (
    <ScrollView className="flex-1 bg-background">
      {/* Week Selector */}
      <View className="p-4">
        {/* Your existing week selector component */}
      </View>
      
      {/* Schedule Display */}
      {schedule && (
        <View className="px-4">
          {/* Your existing daily schedule cards */}
        </View>
      )}
      
      {/* AI Insights Panel */}
      {schedule && (
        <View className="p-4">
          <AIInsightsPanel 
            schedule={schedule} 
            employees={employees}
            defaultExpanded={false}
          />
        </View>
      )}
      
      {/* Generate Button */}
      <View className="p-4">
        {/* Your existing generate button */}
      </View>
    </ScrollView>
  )
}
```

---

**That's it! Your AI features are ready to use.** 🎉

Choose the integration method that best fits your UI and start using AI insights!
