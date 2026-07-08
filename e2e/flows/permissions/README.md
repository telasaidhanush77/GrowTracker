# Permission Flows

## Run

```powershell
maestro test --env-file e2e/.env e2e/flows/permissions/01_image_picker_granted.yaml
maestro test --env-file e2e/.env e2e/flows/permissions/01_image_picker_denied.yaml
maestro test --env-file e2e/.env e2e/flows/permissions/02_notification_granted.yaml
maestro test --env-file e2e/.env e2e/flows/permissions/02_notification_denied.yaml
maestro test --env-file e2e/.env e2e/flows/permissions/03_location_granted.yaml
maestro test --env-file e2e/.env e2e/flows/permissions/03_location_denied.yaml
```

---

## Maestro permissions syntax

These flows use the `launchApp: permissions:` block (Maestro ≥ 1.36.0).

Check your Maestro version before running:
```powershell
maestro --version
```

If you are on an older version, upgrade:
```powershell
# macOS / Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Windows (Scoop)
scoop update maestro
```

### Permission keys

| Key | iOS permission | Android permission |
|-----|---------------|-------------------|
| `camera` | NSCameraUsageDescription | CAMERA |
| `photos` | NSPhotoLibraryUsageDescription | READ_MEDIA_IMAGES / READ_EXTERNAL_STORAGE |
| `notifications` | NSUserNotificationsUsageDescription | POST_NOTIFICATIONS |
| `location` | NSLocationWhenInUseUsageDescription | ACCESS_FINE_LOCATION |

Values: `allow` or `deny`.

> **Android note**: `notifications` key maps to `POST_NOTIFICATIONS` (Android 13+). On older
> Android versions notifications are granted by default — the `deny` flow may not
> be testable on those API levels.

---

## What each flow tests

### Image Picker (01)

| Flow | Permission | Expected behavior |
|------|-----------|------------------|
| `01_image_picker_granted.yaml` | camera + photos: **allow** | "Take Photo" and "Choose from Library" buttons work; no banner shown |
| `01_image_picker_denied.yaml` | camera + photos: **deny** | PermissionDeniedBanner visible; "Open Settings" button present; no crash |

### Notifications (02)

| Flow | Permission | Expected behavior |
|------|-----------|------------------|
| `02_notification_granted.yaml` | notifications: **allow** | Login succeeds; no permission banner in the app |
| `02_notification_denied.yaml` | notifications: **deny** | Login succeeds; app does not crash when permission is denied |

### Location (03)

The app does not currently trigger location on any screen visible without building
the location-enabled feature. These flows are scaffolded for when location is wired in.

| Flow | Expected behavior |
|------|------------------|
| `03_location_granted.yaml` | App launches; no location-related crash |
| `03_location_denied.yaml` | App launches; no location-related crash |

---

## Pre-requisites

1. A physical device or simulator/emulator with the GrowTracker app installed
2. Supabase test accounts seeded (see `e2e/.env.example`)
3. At least one goal assigned to `EMPLOYEE_USER` with status `in_progress` or `not_started` so
   the Submit Evidence screen is reachable

---

## How pre-granted permissions work

Setting `permissions: camera: deny` in the `launchApp` block tells the OS to
pre-configure the permission state before the app launches. The system permission
dialog is never shown, so flows are deterministic across runs.

On iOS this uses the `XCUIDevice` permission API under the hood.
On Android it uses `adb shell pm grant/revoke` before app start.
