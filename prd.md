# Work Schedule Generator App - Implementation Guide

## 📋 Project Overview

**What we're building:** A mobile app that automatically creates fair work schedules for 14 employees, works offline, and uses AI to optimize assignments.

**Key Features:**
- ✅ Works completely offline (offline-first)
- ✅ Syncs to cloud when online (Appwrite backend)
- ✅ Fair scheduling algorithm (balances shifts & weekends)
- ✅ AI suggestions for improvements (Gemini AI)
- ✅ PDF export for schedules
- ✅ 6-week history tracking per employee

---

## 🏗️ Architecture Overview

```
USER INTERFACE (React Native/Expo)
         ↓
LOCAL DATABASE (SQLite) ← Primary data source
         ↓
SYNC ENGINE (Automatic background sync)
         ↓
CLOUD DATABASE (Appwrite) ← Backup & multi-device
```

**Why offline-first?**
- Instant app performance (no waiting for network)
- Works in areas with poor connectivity
- All changes saved locally immediately
- Syncs automatically when online

---

## 📦 PHASE 1: Project Foundation

### Step 1.1: Create Project
```bash
npx create-expo-app@latest work-schedule-app --template
cd work-schedule-app
```

### Step 1.2: Install Dependencies

**Navigation & UI:**
- `expo-router` - File-based routing
- `react-native-screens` - Screen management
- `react-native-safe-area-context` - Safe area handling

**Data Management:**
- `zustand` - Simple state management
- `expo-sqlite` - Local database (offline storage)
- `@react-native-community/netinfo` - Detect online/offline

**Backend & AI:**
- `appwrite` - Backend as a service (v14+)
- `@google/generative-ai` - Gemini AI integration

**Utilities:**
- `date-fns` - Date manipulation
- `@react-pdf/renderer` - PDF generation
- `expo-file-system` - File operations
- `expo-sharing` - Share PDFs
- `expo-constants` - Environment variables

### Step 1.3: Project Structure

```
work-schedule-app/
├── app/
│   └── (tabs)/              # Main tab screens
│       ├── index.tsx        # Schedule view
│       ├── employees.tsx    # Employee management
│       ├── history.tsx      # History view
│       └── settings.tsx     # Settings
├── components/
│   ├── schedule/            # Schedule UI components
│   ├── employee/            # Employee cards, lists
│   ├── shared/              # Buttons, inputs, cards
│   └── pdf/                 # PDF template components
├── services/
│   ├── storage/             # SQLite local database
│   ├── appwrite/            # Cloud backend services
│   ├── sync/                # Offline sync engine
│   ├── algorithm/           # Scheduling logic
│   ├── ai/                  # Gemini AI integration
│   └── pdf/                 # PDF generation
├── store/                   # Zustand state stores
├── types/                   # TypeScript definitions
├── utils/                   # Helper functions
└── data/                    # Initial employee data
```

---

## 🔐 PHASE 2: Backend Setup (Appwrite)

### Step 2.1: Environment Configuration

Create `.env` file:
```
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
GEMINI_API_KEY=your-gemini-key
```

### Step 2.2: Appwrite Project Setup

**In Appwrite Console:**
1. Create new project: "Work Schedules"
2. Enable **Anonymous Authentication** (no login required)
3. Create database: "work-schedules"
4. Create 4 collections (see schemas below)

### Step 2.3: Database Collections

#### Collection 1: `employees`
Stores employee information and leave status.

| Field | Type | Attributes |
|-------|------|------------|
| `employee_id` | String | Required, Unique |
| `name` | String | Required |
| `is_on_leave` | Boolean | Default: false |
| `updated_at` | DateTime | Auto-update |

#### Collection 2: `schedules`
Stores weekly schedule data.

| Field | Type | Description |
|-------|------|-------------|
| `schedule_id` | String | Unique identifier |
| `week_starting` | DateTime | Monday of the week |
| `week_ending` | DateTime | Sunday of the week |
| `daily_schedules` | JSON | Full week of assignments |
| `fairness_score` | Integer | 0-100 score |
| `validated` | Boolean | Passed all checks |
| `created_at` | DateTime | Auto-create |
| `updated_at` | DateTime | Auto-update |

#### Collection 3: `history`
Tracks past 6 weeks per employee for fairness calculations.

| Field | Type | Description |
|-------|------|-------------|
| `employee_id` | String | Indexed for fast lookup |
| `week_ending` | DateTime | End of work week |
| `shifts` | JSON Array | All shifts worked |
| `off_days` | JSON Array | Days off |
| `weekend_offs` | Integer | Count of weekend days off |
| `updated_at` | DateTime | Auto-update |

#### Collection 4: `sync_queue`
Tracks changes waiting to sync to cloud.

| Field | Type | Description |
|-------|------|-------------|
| `item_id` | String | Unique sync item |
| `type` | String | employee/schedule/history |
| `operation` | String | create/update/delete |
| `data` | JSON | The actual data |
| `timestamp` | DateTime | When created |
| `retries` | Integer | Failed sync attempts |

### Step 2.4: Appwrite Service Setup

**`services/appwrite/client.ts`**
```typescript
import { Client, Account, Databases } from 'appwrite'
import Constants from 'expo-constants'

const client = new Client()
  .setEndpoint(Constants.expoConfig.extra.appwriteEndpoint)
  .setProject(Constants.expoConfig.extra.appwriteProjectId)

export const account = new Account(client)
export const databases = new Databases(client)
```

**`services/appwrite/authService.ts`**
- Auto-creates anonymous session on first app launch
- Persists session for future use
- No user login required

---

## 💾 PHASE 3: Local Storage & Offline-First

### Step 3.1: SQLite Database Setup

**`services/storage/localDatabase.ts`**

Creates 4 tables matching Appwrite collections:
- `employees` - Local copy of all employees
- `schedules` - Local copy of schedules
- `history` - Local copy of history
- `sync_queue` - Pending changes to upload

**Why mirror structure?**
- Easy to sync (same data shape)
- Can work completely offline
- Simple to reason about

### Step 3.2: Local Service Layer

Each service provides same interface as cloud version:

**`localEmployeeService.ts`**
- `getAll()` - Get all employees from SQLite
- `getById(id)` - Get single employee
- `update(id, data)` - Update employee locally
- `toggleLeave(id)` - Mark on/off leave

**`localScheduleService.ts`**
- `getByWeek(weekStart)` - Get schedule
- `save(schedule)` - Save locally
- `getRecent(count)` - Get last N schedules

**`localHistoryService.ts`**
- `getForEmployee(id, weeks)` - Get history
- `save(employeeId, data)` - Save week data
- `prune()` - Delete data older than 6 weeks

### Step 3.3: Sync Engine

**How it works:**

1. **Write Path (User makes change):**
   ```
   User edits data
     → Save to local SQLite immediately ✅
     → Add to sync_queue
     → UI updates instantly
     → Sync runs in background when online
   ```

2. **Read Path (User views data):**
   ```
   Always read from local SQLite
     → Instant response
     → Works offline
   ```

3. **Sync Process:**
   ```
   Every 5 minutes when online:
     → Check sync_queue for pending items
     → Upload to Appwrite one by one
     → On success: remove from queue
     → On failure: retry later (max 3 times)
   ```

**`services/sync/syncEngine.ts`** - Core Functions:

- `syncToCloud()` - Push local changes up
- `syncFromCloud()` - Pull latest data down
- `scheduleSyncJob()` - Auto-sync every 5 min
- `handleConflicts()` - Last write wins strategy

**Triggers for sync:**
- App comes to foreground
- Network changes from offline → online
- Every 5 minutes when online
- Manual sync button (optional)

---

## 📝 PHASE 4: Type Definitions

### Employee Types
```typescript
interface Employee {
  id: string
  name: string
  isOnLeave: boolean
  history: EmployeeHistory[]
}

interface EmployeeHistory {
  weekEnding: Date
  shifts: ShiftAssignment[]
  offDays: Date[]
  weekendOffs: number  // How many Sat/Sun were off
}
```

### Schedule Types
```typescript
type ShiftType = 
  | 'EARLY_MORNING'  // 06:30
  | 'MORNING'        // 07:00
  | 'MID_DAY'        // 09:00
  | 'LATE'           // 10:00

interface ShiftAssignment {
  employeeId: string
  shift: ShiftType | 'OFF'
  scannerId?: number  // Scanner 1-4
}

interface DailySchedule {
  date: Date
  assignments: ShiftAssignment[]
}

interface Schedule {
  id: string
  weekStarting: Date
  weekEnding: Date
  dailySchedules: DailySchedule[]  // 7 days
  fairnessScore: number            // 0-100
  validated: boolean               // Passed checks
  aiSuggestions?: AISuggestion[]
}
```

### Sync Types
```typescript
interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSyncTime: Date | null
  pendingCount: number
}
```

---

## 👥 PHASE 5: Employee Data

### Initial 14 Employees

**`data/initialEmployees.ts`**
```typescript
export const INITIAL_EMPLOYEES = [
  { id: '1', name: 'Bantam, Elchenay', isOnLeave: false },
  { id: '2', name: 'Farley, Kevin', isOnLeave: false },
  { id: '3', name: 'Fritz, Norman', isOnLeave: false },
  { id: '4', name: 'Gwebani, Nande', isOnLeave: false },
  { id: '5', name: 'Lamani, Portia', isOnLeave: false },
  { id: '6', name: 'Mbaye, Luyanda', isOnLeave: false },
  { id: '7', name: 'Murphy, Joe', isOnLeave: false },
  { id: '8', name: 'Ndata, Sihle', isOnLeave: false },
  { id: '9', name: 'Rolomane, Nosipho', isOnLeave: false },
  { id: '10', name: 'Rude, Sivenathi', isOnLeave: false },
  { id: '11', name: 'Mabi, Lisa', isOnLeave: false },
  { id: '12', name: 'China, Per', isOnLeave: false },
  { id: '13', name: 'Wayren, Scan', isOnLeave: false },
  { id: '14', name: 'Stand-In', isOnLeave: false },
]
```

### Seeding Process

**`services/storage/seedData.ts`**
- Runs on first app launch
- Checks if employees already exist
- If empty: inserts all 14 employees
- Also seeds Appwrite (run once during setup)

---

## 🧮 PHASE 6: Scheduling Algorithm

### Overview

The algorithm creates fair schedules by:
1. Analyzing 6 weeks of history
2. Assigning off days equitably
3. Balancing early vs late shifts
4. Rotating weekend offs fairly
5. Avoiding repetitive patterns

### Step 6.1: Off Day Assignment

**`services/algorithm/offDayAssigner.ts`**

**Goal:** Give each employee 2 off days per week, rotating weekends fairly.

**Process:**
1. Load 6-week history for all employees
2. Calculate priority scores:
   - **Weekend priority:** Fewer weekend offs = higher priority
   - **Pattern penalty:** Discourage same off days every week
   - **Consecutive check:** Avoid 3+ weekends off in a row
3. Sort employees by priority
4. Assign off days:
   - High priority gets weekend days first
   - Try to make off days consecutive (better for employee)
   - Ensure each day has enough workers (7-8 minimum)
5. Return: `Map<employeeId, [Date, Date]>`

**Example:**
```
Employee A: 0 weekend offs in last 6 weeks → High priority → Gets Sat+Sun
Employee B: 3 weekend offs in last 6 weeks → Low priority → Gets Wed+Thu
```

### Step 6.2: Shift Assignment

**`services/algorithm/shiftAssigner.ts`**

**Goal:** Assign specific shift times to working employees, balancing early vs late.

**Daily Staffing Requirements:**

**Option 1 (8 employees available):**
- 2× 06:30 (Early Morning)
- 2× 07:00 (Morning)
- 2× 09:00 (Mid-Day)
- 2× 10:00 (Late)

**Option 2 (7 employees available):**
- 3× 06:30 (Early Morning)
- 1× 09:00 (Mid-Day)
- 3× 10:00 (Late)

**Process for each day:**
1. Get available employees (not on leave, not on off day)
2. Load shift history (count early vs late shifts)
3. Calculate balance score:
   - Ideal: 50% early, 50% late over 6 weeks
   - Deviation = need more of opposite type
4. Prioritize employees who need balance:
   - Employee with 80% late shifts → Assign early shift
   - Employee with 30% early shifts → Assign late shift
5. Assign scanner IDs (1-4) randomly
6. Validate daily coverage

**Example:**
```
Monday, Employee C:
  - History: 15 early shifts, 25 late shifts
  - Balance score: Needs more early shifts
  - Assignment: 06:30 (Early Morning) + Scanner 2
```

### Step 6.3: Schedule Generation

**`services/algorithm/scheduleGenerator.ts`**

**Main orchestrator that ties everything together:**

```typescript
function generateBaseSchedule(employees, weekStarting) {
  // 1. Filter employees
  const available = employees.filter(e => !e.isOnLeave)
  
  // 2. Assign off days
  const offDayMap = assignOffDays(available, weekStarting)
  
  // 3. Assign shifts
  const assignments = assignShifts(available, offDayMap, weekStarting)
  
  // 4. Validate
  const isValid = validateCoverage(assignments)
  if (!isValid) throw new Error('Invalid coverage')
  
  // 5. Calculate fairness
  const score = calculateFairnessScore(assignments, allHistory)
  
  // 6. Retry if score too low
  if (score < 70) {
    // Try again with slight randomization (max 3 attempts)
  }
  
  return {
    weekStarting,
    weekEnding,
    dailySchedules: assignments,
    fairnessScore: score,
    validated: isValid
  }
}
```

### Step 6.4: Fairness Calculation

**`services/algorithm/fairnessCalculator.ts`**

**Calculates 0-100 score based on multiple factors:**

**1. Shift Balance (30% of score):**
- For each employee over 6 weeks:
  - Count early shifts (06:30, 07:00)
  - Count late shifts (09:00, 10:00)
  - Target ratio: 50/50
  - Calculate deviation from target
- Lower deviation = higher score

**2. Weekend Fairness (40% of score):**
- Count weekend offs per employee over 6 weeks
- Calculate variance across all employees
- Target: Everyone gets similar number
- Penalize: 3+ consecutive weekend offs
- Lower variance = higher score

**3. Pattern Diversity (30% of score):**
- Check for repetitive patterns:
  - Same off days every week
  - Same shift time every day
  - Consecutive weeks with same schedule
- More variety = higher score

**Final Score:**
```
fairnessScore = (shiftBalance × 0.3) + 
                (weekendFairness × 0.4) + 
                (patternDiversity × 0.3)
```

**Example:**
```
Week score: 85/100
- Shift balance: 90 (good)
- Weekend fairness: 75 (okay, some variance)
- Pattern diversity: 88 (excellent variety)
```

---

## 🎯 Key Algorithms Summary

| Algorithm | Input | Output | Purpose |
|-----------|-------|--------|---------|
| `offDayAssigner` | Employees + History | Off day map | Fair distribution of days off |
| `shiftAssigner` | Employees + Off days | Shift assignments | Balance early/late shifts |
| `scheduleGenerator` | Employees + Week | Complete schedule | Orchestrate full generation |
| `fairnessCalculator` | Schedule + History | 0-100 score | Measure schedule quality |

---

## 🚀 Implementation Order

1. ✅ Phase 1: Project setup
2. ✅ Phase 2: Appwrite backend
3. ✅ Phase 3: Local SQLite + Sync
4. ✅ Phase 4: Type definitions
5. ✅ Phase 5: Employee data
6. ✅ Phase 6: Scheduling algorithm
7. ⏭️ Phase 7: AI integration (Gemini)
8. ⏭️ Phase 8: UI components
9. ⏭️ Phase 9: PDF export
10. ⏭️ Phase 10: Testing & polish

---

## 💡 Key Concepts Explained

**Offline-First:** App works without internet. All data stored locally first, synced later.

**Fair Scheduling:** Algorithm analyzes history to ensure everyone gets similar number of early/late shifts and weekend offs.

**Sync Queue:** List of changes waiting to upload to cloud when online.

**Fairness Score:** Number (0-100) measuring how fair the schedule is based on shift balance, weekend distribution, and pattern variety.

**Scanner IDs:** Physical scanners (1-4) employees use at work, assigned randomly each shift.