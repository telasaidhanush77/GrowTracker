# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start                    # Start Expo dev server (scan QR with Expo Go)
npx expo start --tunnel      # Start with tunnel (phone on a different network)
npm run android              # Target Android emulator
npm run web                  # Target browser
```

No test runner or linter is configured.

> **Before writing any Expo or React Native API calls**, check the versioned docs at https://docs.expo.dev/versions/v54.0.0/

## Stack

- **Expo SDK 54** (managed workflow — no native `android/` or `ios/` folders)
- **React Native 0.81.5**, **React 19.1**, **TypeScript** (strict)
- Entry: `index.ts` → `App.tsx`
- Persistence: `@react-native-async-storage/async-storage`
- Crypto: `expo-crypto` (SHA-256 password hashing, OTP generation)

## App Purpose

**GrowTracker** is an employee performance tracking app. Three roles:

| Role | Responsibilities |
|---|---|
| **Employee** | View assigned goals, submit progress updates with evidence, write daily logs |
| **Reporting Manager** | Set goals, approve/reject evidence, view team dashboards and daily logs |
| **Admin** | Onboard employees, assign reporting managers |

Core workflow: `New hire → Manager assigned → Manager sets goals (per quarter) → Employee updates + submits evidence → Manager approves/rejects → Fiscal year report`

## Architecture

### Provider tree (App.tsx)

```
ErrorBoundary
  ThemeProvider          — dark/light mode, colors exposed via useTheme()
    AuthProvider         — login/logout/signup, persisted session, useAuth()
      AppProvider        — goals, notifications, daily logs state, useApp()
        ToastProvider    — in-app toast messages, useToast()
          AppRoot
```

`AppRoot` gates on `isLoading` / `currentUser`. If no user → `AuthFlow` state machine. If authenticated → `ThemedRoot` (screen switcher).

### Navigation pattern

`App.tsx` holds a `StackEntry[]` in `useState`. `navigate(screen, params)` pushes; `goBack()` pops. No external nav library. Every screen receives `ScreenProps` (`navigation`, `params`, `currentUserId`, `currentRole`, `onLogout`). All screen names are typed as the `Screen` union in `src/types/index.ts`.

### Auth flow

`AuthFlow` is a local state machine in `App.tsx` cycling through views: `splash → login → signup → signup-success → forgot-username / forgot-password`. Login/signup persist to `AsyncStorage` via stores in `src/auth/storage.ts`. Passwords are `salt:SHA256(salt+password)` using `expo-crypto`.

### State management

- **AuthContext** — `StoredUser[]`, current session, login/logout/signup, OTP-based password reset, admin `createUser`/`updateUser`/`removeUser`
- **AppContext** — `Goal[]`, `Notification[]`, `DailyLog[]` + mutation functions, seeded from `src/data/mockData.ts` if AsyncStorage is empty
- **ThemeContext** — `isDark`, `colors`, `toggleTheme`
- **ToastContext** — `showToast(message, type)`

### Key types (`src/types/index.ts`)

- `StoredUser` — extends `Employee` with `firstName`, `lastName`, `username`, `passwordHash`, `mobile`
- `Goal` — per-employee, per-quarter; has `weight`, `status`, optional `evidence: Evidence`, optional `attachments`
- `Evidence` — inside a goal; has `selfRating`, `managerFeedback`, `status`
- `DailyLog` — employee daily progress entries
- `AuthSession`, `SignupData`, `ScreenProps`, `NavParams`, `Screen` (union of all screen names)

### Data persistence (`src/auth/storage.ts`)

All stores wrap AsyncStorage with typed `get<T>(key, fallback)` / `set(key, value)` helpers:

| Store | Key | What it holds |
|---|---|---|
| `userStore` | `@gt:users` | `StoredUser[]` |
| `sessionStore` | `@gt:session` | `AuthSession \| null` |
| `goalStore` | `@gt:goals` | `Goal[]` |
| `notifStore` | `@gt:notifications` | `Notification[]` |
| `logStore` | `@gt:dailylogs` | `DailyLog[]` |
| `otpStore` | `@gt:otps` | `OTPRecord[]` (6-digit OTP, 10 min TTL) |
| `counterStore` | `@gt:counters` | `RoleCounters` (auto-increment IDs) |

### Screen map

```
src/screens/
  auth/
    SplashScreen.tsx        — role selector (first screen)
    LoginScreen.tsx
    SignUpScreen.tsx
    SignUpSuccessScreen.tsx  — shows generated uniqueId + username after signup
    ForgotPasswordScreen.tsx — OTP-based reset
    ForgotUsernameScreen.tsx
  admin/
    AdminDashboard.tsx
    OnboardEmployee.tsx
  manager/
    ManagerDashboard.tsx    — team stats, quarter progress bars, pending reviews CTA
    TeamOverview.tsx        — per-employee progress bars + score chips
    SetGoals.tsx            — goal CRUD per employee per quarter (weight budget ≤ 100)
    ReviewEvidence.tsx      — approve/reject submissions, star rating, feedback
    TeamDailyLogs.tsx       — manager view of employee daily logs
  employee/
    EmployeeDashboard.tsx   — personal performance cards, overdue alerts, carry-over nudge
    GoalsList.tsx           — tabbed Q1/Q2, submit/resubmit actions
    SubmitEvidence.tsx      — evidence form (description + links + self-rating)
    DailyLogScreen.tsx      — write daily progress logs
    MyProgressScreen.tsx    — employee's own progress view
  shared/
    NotificationsScreen.tsx — per-user feed with mark-read
    ProfileScreen.tsx       — user profile
    FYReportScreen.tsx      — fiscal year report
```

### Components (`src/components/`)

- `Header.tsx` — shared header with back/notifications badge/logout
- `BottomTabBar.tsx` — bottom tab navigation bar
- `AnimatedButton.tsx` — animated pressable button
- `charts/GoalStatusBar.tsx` — stacked status segment bar
- `charts/MiniBarChart.tsx` — compact bar chart
- `charts/ProgressRing.tsx` — circular progress ring

### Theme and utilities

- `src/theme.ts` — `Colors`, `Spacing`, `Radius`, `Shadow` constants
- `src/utils.ts` — `formatDate`, `timeAgo`, `calcQuarterScore`, `STATUS_CONFIG`; performance score = `Σ(weight × managerRating/5) / totalWeight`

### Key features (beyond core PRD)

- Weighted performance score (0–100) per quarter
- Self-assessment rating (1–5 ★) on evidence
- Goal weight budget per quarter (must sum ≤ 100), enforced in SetGoals
- Overdue indicator on goals past target date
- Q1 carry-over nudge on employee dashboard for rejected Q1 goals
- Notification bell with badge in every dashboard header
- Stacked quarter progress bars (approved/pending/in-progress/rejected segments)
- Resubmit flow for rejected evidence
- Dark/light theme toggle
- Daily log entries per employee
- OTP-based forgot-password flow (simulated — OTP printed to console, not emailed)
