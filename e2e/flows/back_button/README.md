# Back Button Flows

## Run order

```powershell
maestro test --env-file e2e/.env e2e/flows/back_button/01_employee_back_button.yaml
maestro test --env-file e2e/.env e2e/flows/back_button/02_manager_back_button.yaml
maestro test --env-file e2e/.env e2e/flows/back_button/03_admin_back_button.yaml
```

Screenshots land in `~/.maestro/tests/<timestamp>/`.

---

## What each flow tests

| Flow | Screens covered | Back result |
|---|---|---|
| 01_employee | Goals List, Daily Log, Notifications, Profile, AI Reports, root | Employee Dashboard |
| 02_manager | Team Overview, Review Evidence, Team Daily Logs, Notifications, Profile, root | Manager Dashboard |
| 03_admin | Onboard Employee, Goals List (read-only), Notifications, Profile, root | Admin Dashboard |

Every test checks that `pressKey: Back` (Android hardware button):
- Returns to the correct parent screen — **no blank screen, no crash**
- Does NOT pop the root stack entry (app stays alive at the dashboard)

---

## CRITICAL GAP — No BackHandler registered

**All secondary-screen back-button tests in these flows will FAIL today.**

The custom navigation stack (`setStack` / `goBack` in `App.tsx`) is never wired to the
Android hardware back button. Nothing calls `BackHandler.addEventListener` anywhere in the
codebase. React Native's default behaviour is:

- Secondary screen (stack.length > 1): hardware back **exits the app** (does NOT call `goBack()`)
- Root screen (stack.length = 1): hardware back **exits the app** (expected Android behaviour)

**Fix — add to `App.tsx`:**

```tsx
import { BackHandler } from 'react-native';

// Inside AppRoot, after the navigate/goBack definitions:
useEffect(() => {
  const sub = BackHandler.addEventListener('hardwareBackPress', () => {
    if (stack.length > 1) {
      goBack();
      return true;   // event consumed — do NOT exit
    }
    return false;    // let Android background/close the app (standard root behaviour)
  });
  return () => sub.remove();
}, [stack.length]);
```

The `return false` at the root ensures the app behaves correctly at the home screen
(back press backgrounds the app, as every Android user expects).

---

## Deep link status — NOT CONFIGURED

`app.json` has no `scheme`, `intentFilters`, or `associatedDomains`. Deep linking is not
set up. No deep link E2E flow is written. When a URI scheme is added, create
`e2e/flows/back_button/04_deep_links.yaml` covering:
- `growtracker://goals` → opens Goals List for the logged-in user
- `growtracker://notifications` → opens Notifications
- Cold-start (app not running) vs warm-start (app backgrounded) behaviour

---

## How to read the back-button test results

| Step output | Meaning |
|---|---|
| `assertVisible: "My Workspace"` passes after `pressKey: Back` | ✅ BackHandler working, app stayed alive |
| `assertVisible` fails with "Element not found" | ❌ App exited — BackHandler not registered |
| `assertVisible` fails with "App not running" | ❌ App crashed on back press |
| Re-launch after root back shows blank/wrong screen | ❌ Session or state lost on background |

---

## Required .env additions

Add to `e2e/.env` (see `e2e/.env.example`):

```
ADMIN_USER=e2e.admin@growtracker.test
ADMIN_PASS=TestPass123!
```
