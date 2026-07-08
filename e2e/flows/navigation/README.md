# Navigation Guard Flows

## Run

```powershell
maestro test --env-file e2e/.env e2e/flows/navigation/01_double_tap_prevention.yaml
```

---

## What `01_double_tap_prevention.yaml` tests

Rapid double-tapping a navigation card should not push the same screen twice onto
the stack. The test uses the **UI "‹" back button** (not the hardware back) so it
can run independently of the BackHandler fix in the back-button flows.

**Why this matters:**
The current `navigate()` in `App.tsx` has no guard:
```tsx
function navigate(screen: Screen, params?: NavParams) {
  setStack(prev => [...prev, { screen, params }]);  // no duplicate check
}
```
Two rapid taps → two identical stack entries → pressing back once returns to the
_duplicate_ screen instead of the dashboard. Users notice this as the back button
seeming to "do nothing" the first time they press it.

**Fix — deduplicate inside the updater function:**
```tsx
function navigate(screen: Screen, params?: NavParams) {
  setStack(prev => {
    const top = prev[prev.length - 1];
    if (top?.screen === screen) return prev;   // already there, no-op
    return [...prev, { screen, params }];
  });
}
```
This is safe because the updater runs synchronously with the latest state, so even
batched/concurrent taps that both call navigate() will be deduplicated.

---

## How the test detects a duplicate push

```
tap "My Goals" → tap "My Goals" again immediately
     ↓
waitForAnimationToEnd
     ↓
tap "‹" (back) once
     ↓
assertVisible: "My Workspace"   ← PASS if only one push
assertNotVisible: "Q1"          ← PASS if only one push

If two pushes happened:
  "‹" back → still on Goals List (second push popped)
  assertVisible: "My Workspace" FAILS  ✗
```

Screenshots capture the state after each back press for visual diagnosis.

---

## Deep link status — NOT CONFIGURED

`app.json` contains no `scheme`, `intentFilters`, or `associatedDomains`.

When a URI scheme is added (e.g. `growtracker://`), add the following flows here:

| Flow file | URI | Expected screen |
|---|---|---|
| `02_deep_link_goals.yaml` | `growtracker://goals` | Goals List (authenticated) |
| `03_deep_link_notifications.yaml` | `growtracker://notifications` | Notifications |
| `04_deep_link_cold_start.yaml` | Any URI, app not running | Auth → correct screen after login |

Until then, there is nothing to test for deep links.
