# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start                        # Start Expo dev server
npx expo start --tunnel          # Start with tunnel (different network)
npm run android / ios / web      # Target specific platform

npm test                         # Run all Jest tests (892 tests, 58 suites)
npm run test:watch               # Watch mode
npm run test:coverage            # Coverage report
npx jest src/__tests__/hooks/useGoals.test.ts   # Run a single test file
npx jest --testNamePattern "inserts and prepends"  # Run by test name

npm run lint                     # ESLint (src/ + App.tsx)
npm run lint:fix                 # ESLint with auto-fix
npm run typecheck                # tsc --noEmit

npm run db:types                 # Regenerate src/db/types.ts from Supabase schema
npm run db:push                  # Push migrations to Supabase
npm run db:reset                 # Reset local Supabase DB
```

**Environment:** Copy `.env.example` to `.env` and set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The app throws on startup if either is missing.

## Stack

- **Expo SDK 54** (managed workflow — no native `android/` or `ios/` folders)
- **React Native 0.81.5**, **React 19.1**, **TypeScript** (strict)
- **Supabase JS v2** — auth + database backend (`src/lib/supabase.ts`)
- **TanStack Query v5** — server-state caching and mutations (`src/lib/queryClient.ts`)
- **Jest + jest-expo** — test runner; mocks in `__mocks__/`

## App Purpose

**GrowTracker** — employee performance tracking with three roles:

| Role | Responsibilities |
|---|---|
| **Employee** | View assigned goals, submit evidence, write daily logs |
| **Reporting Manager** | Set goals, approve/reject evidence, view team dashboards |
| **Admin** | Onboard employees, assign reporting managers |

Core flow: `New hire → Manager assigns goals (per quarter) → Employee submits evidence → Manager approves/rejects → Fiscal year report`

## Architecture

### Provider tree (`App.tsx`)

```
ErrorBoundary
  ThemeProvider          — dark/light mode, useTheme()
    AuthProvider         — session + user list, useAuth()       [AuthContext.tsx]
      AppProvider        — goals/notifs/logs mutations, useApp() [AppContext.tsx]
        ToastProvider    — in-app toasts, useToast()
          AppRoot
```

`AppRoot` gates on `isLoading` / `currentUser`. No user → `AuthFlow` state machine (splash → login → signup → forgot-*). Authenticated → `ThemedRoot` (screen switcher).

### Data layer

All server data flows through TanStack Query hooks in `src/hooks/`:

| Hook | Purpose |
|---|---|
| `useGoals` / `useAddGoal` / `useUpdateGoal` / `useDeleteGoal` | Goal CRUD with cache patching |
| `useSubmitEvidence` / `useReviewEvidence` | Evidence upsert (atomic: evidence + goal status; rolls back evidence if goal update fails) |
| `useNotifications` / `useMarkNotifRead` / `useMarkAllRead` | Notification feed with optimistic reads |
| `useDailyLogs` / `useSaveDailyLog` | Daily log CRUD |
| `useProfiles` | Employee profile list |
| `useAIReports` | AI-generated performance reports |

`AppContext` wraps these hooks and exposes a stable imperative API to screens so screens don't interact with React Query directly. Optimistic updates (goal add, notification read) are applied immediately in `AppContext`; mutations run in the background with toast errors on failure.

**Supabase join shape:** `supabase.from('goals').select('*, evidence(*)')` returns `evidence` as an array (even for 1:1). `dbRowToGoal()` in `useGoals.ts` takes `evArr[0] ?? null` — don't read it as a scalar.

**Query cache persistence:** `asyncStoragePersister` in `queryClient.ts` persists the TanStack Query cache to AsyncStorage under `@gt:query-cache`. Cache survives app restarts for 24 h; stale after 2 min (background refetch).

### Auth flow

- Session persisted via Supabase's `AsyncStorage` adapter; `AuthProvider` loads profile on mount via `getSession()`.
- `onAuthStateChange` skips the `INITIAL_SESSION` event (already handled by `getSession()`) to prevent double `loadProfile`.
- Role is never read from auth metadata (privilege escalation fix). The `handle_new_user` DB trigger always creates `'employee'`; admins update the role via `profiles.update()`.
- Password reset is OTP-based: `resetPasswordRequest` → `resetPasswordCheckOtp` → `resetPasswordSetNewPassword`.

### Navigation pattern

Custom stack in `App.tsx`: `StackEntry[]` state, `navigate(screen, params)` pushes, `goBack()` pops. No external nav library. Every screen receives `ScreenProps` (`navigation`, `params`, `currentUserId`, `currentRole`, `onLogout`). All screen names are typed as the `Screen` union in `src/types/index.ts`.

### Key types (`src/types/index.ts`)

- `StoredUser` — maps to the `profiles` DB table; includes `role`, `status`, `managerId`
- `Goal` — per-employee per-quarter; has `weight`, `status`, optional `evidence: Evidence`
- `Evidence` — nested inside `Goal`; has `selfRating`, `managerFeedback`, `status`, optional `attachments`
- `DailyLog` — employee daily progress entries

DB types are auto-generated (`npm run db:types`) into `src/db/types.ts` — don't hand-edit.

### Performance score formula

`Σ(goal.weight × managerRating/5) / totalWeight` — implemented in `src/utils.ts` as `calcQuarterScore`. The FY score averages Q1 and Q2, but divides by 1 (not 2) if only one quarter has data.

## Test structure

```
src/__tests__/
  hooks/          — useGoals, useNotifications, useDailyLogs, etc.
  screens/        — per-screen render + interaction tests
  context/        — ThemeContext, ToastContext
  auth/           — storage helpers
  security/       — auth gates, token storage, logging audit
  network/        — loading states, API error UI behavior
  accessibility/  — a11y audits on key screens
  forms/          — validation edge cases
  performance/    — render benchmarks
```

Tests mock `../../lib/supabase` and `../../context/*` with `jest.mock()`. The Supabase chain builder pattern (in hook tests) builds a mock that is awaitable both directly and via `.single()` — see `useGoals.test.ts` for the reference implementation.

`jest.setup.ts` configures TanStack Query's `notifyManager` and `timeoutManager` to use synchronous scheduling so tests don't leak open handles.
