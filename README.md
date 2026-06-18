# GrowTracker

An employee performance tracking mobile app built with Expo and React Native.

## What it does

GrowTracker helps organisations manage employee performance across a two-quarter fiscal year. Three roles drive the workflow:

| Role | What they do |
|---|---|
| **Employee** | View assigned goals, submit evidence of completion, write daily logs |
| **Reporting Manager** | Set goals, approve or reject evidence, monitor team progress |
| **Admin** | Onboard new employees, assign reporting managers |

Core cycle: `New hire → Manager assigned → Goals set per quarter → Employee submits evidence → Manager reviews → Fiscal year report`

## Features

- **Goal management** — per-employee, per-quarter goals with category, priority, target date, and weight (weights must sum ≤ 100 per quarter)
- **Evidence submission** — description, links, file attachments, and a self-rating (1–5 ★)
- **Manager review** — approve or reject submissions with a star rating and written feedback
- **Weighted performance score** — `Σ(weight × managerRating/5) / totalWeight`, shown as 0–100
- **Daily logs** — employees log daily progress; managers can view the full team feed
- **Fiscal year report** — two-quarter summary with charts
- **Notifications** — status-change alerts with unread badge
- **Dark / light theme** toggle
- **Q1 carry-over nudge** — rejected Q1 goals are surfaced on the employee dashboard
- **Overdue indicators** on goals past their target date

## Tech stack

- [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/) — managed workflow (no native `android/` or `ios/` folders)
- React Native 0.81.5 · React 19.1 · TypeScript (strict)
- AsyncStorage for local persistence
- expo-crypto for password hashing (SHA-256 + salt) and OTP generation
- Custom stack navigator — no external nav library

## Getting started

```bash
npm install
npm start          # opens Expo dev server — scan QR with Expo Go
npm run web        # run in browser
npm run android    # target Android emulator
```

## Project structure

```
App.tsx                  — provider tree + auth flow + screen switcher
src/
  auth/storage.ts        — AsyncStorage stores (users, session, goals, logs, OTPs)
  context/
    AuthContext.tsx       — login, signup, logout, password reset
    AppContext.tsx        — goals, notifications, daily logs state
    ThemeContext.tsx      — dark/light mode
    ToastContext.tsx      — in-app toast messages
  screens/
    auth/                — Splash, Login, SignUp, ForgotPassword, ForgotUsername
    admin/               — AdminDashboard, OnboardEmployee
    manager/             — Dashboard, TeamOverview, SetGoals, ReviewEvidence, TeamDailyLogs
    employee/            — Dashboard, GoalsList, SubmitEvidence, DailyLog, MyProgress
    shared/              — Notifications, Profile, FYReport
  components/            — Header, BottomTabBar, AnimatedButton, charts/
  types/index.ts         — all TypeScript types
  theme.ts               — design tokens (colors, spacing, radius, shadows)
  utils.ts               — formatDate, timeAgo, calcQuarterScore, STATUS_CONFIG
  data/mockData.ts       — seed data loaded on first launch
```

## Demo accounts

Seed data is loaded automatically on first launch. Sign up with any role via the splash screen, or use the mock data seeded into the app on first run.

> Password reset uses a simulated OTP flow — the 6-digit code is printed to the Metro console, not sent by email.

## License

MIT
