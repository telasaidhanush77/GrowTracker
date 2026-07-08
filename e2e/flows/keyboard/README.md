# Keyboard Behavior Flows

## Run all four flows

```powershell
# From the GrowTracker root
maestro test e2e/flows/keyboard/01_signup_keyboard.yaml
maestro test e2e/flows/keyboard/02_login_keyboard.yaml
maestro test e2e/flows/keyboard/03_forgot_username_keyboard.yaml
maestro test e2e/flows/keyboard/04_daily_log_keyboard.yaml
```

Screenshots land in `~/.maestro/tests/<timestamp>/` — open them in any image viewer to review.

---

## What to look for in each screenshot

### Overlap check (most important)
Every `*_focused.png` screenshot: the **focused field's label and input border must be fully visible above the keyboard**. If the keyboard overlaps the input, the field is unreachable without the user scrolling manually.

| Screenshot | What to check |
|---|---|
| `01_signup_first_name_focused` | First Name input above keyboard |
| `04_signup_last_name_focused` | Last Name input above keyboard |
| `05_signup_email_focused` | Email input above keyboard |
| `06_signup_username_focused` | Username input above keyboard |
| `07_signup_mobile_focused` | Mobile input above keyboard (phone-pad keyboard) |
| `09_signup_password_focused` | **CRITICAL** — Password near bottom; most likely to be covered on Android |
| `11_signup_confirm_focused` | **CRITICAL** — Confirm Password at very bottom; highest overlap risk |
| `01_login_identifier_focused` | Identifier input above keyboard |
| `04_login_password_focused` | Password + "Forgot password" link above keyboard |
| `01_forgot_username_email_focused` | Email + **"Recover Username" button** above keyboard |
| `01_daily_log_task_focused` | Task input + "+" button above keyboard |
| `04_daily_log_notes_focused` | Notes multiline input above keyboard |

### Next-key behavior (documented gap on auth screens)
| Screenshot | What you'll see | What you want |
|---|---|---|
| `03_signup_enter_key_result` | Focus stays on First Name (keyboard may dismiss) | Focus moves to Last Name |
| `03_login_enter_after_identifier` | Identifier field blurs, nothing moves | Focus moves to Password |
| `03_forgot_username_done_key_result` | Nothing happens | `handleRecover()` fires |

### Done-key behavior
| Screenshot | What you'll see | What you want |
|---|---|---|
| `13_signup_done_key_result` | Nothing | Form validates, "Please accept terms" error shows |
| `06_login_done_key_result` | Nothing | Login attempt starts |
| `03_daily_log_task_enter_done` | **Task added to list** ← this is the correct behavior | Same |

### Keyboard dismissal
| Screenshot | What to check |
|---|---|
| `08_signup_keyboard_dismissed` | Keyboard gone; full form + CTA visible |
| `07_login_keyboard_dismissed` | Keyboard gone; Sign In button + sign-up row visible |
| `05_forgot_username_keyboard_dismissed` | Keyboard gone; "Recover Username" button visible |
| `06_daily_log_keyboard_dismissed` | Keyboard gone; "Save Daily Log" button visible |

---

## Gaps to fix (by priority)

### HIGH — Android keyboard overlap (check screenshots first)
`SignUpScreen` and all auth screens use:
```tsx
<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
```
On Android, `behavior={undefined}` means no adjustment — the layout relies on `windowSoftInputMode=adjustResize`. If your screenshots show the password/confirm fields hidden behind the keyboard, fix by:
```tsx
// Option A: add Android behavior
behavior={Platform.OS === 'ios' ? 'padding' : 'height'}

// Option B: ensure AndroidManifest has:
// android:windowSoftInputMode="adjustResize"
```

### HIGH — Missing Next/Done keyboard actions on auth forms
Add `returnKeyType` and `onSubmitEditing` to create focus chains. Example for SignUpScreen:
```tsx
<TextInput
  ref={firstNameRef}
  returnKeyType="next"
  onSubmitEditing={() => lastNameRef.current?.focus()}
  ...
/>
<TextInput
  ref={lastNameRef}
  returnKeyType="next"
  onSubmitEditing={() => emailRef.current?.focus()}
  ...
/>
// ... chain through all fields ...
<TextInput
  ref={confirmRef}
  returnKeyType="done"
  onSubmitEditing={handleSignUp}
  ...
/>
```

### MEDIUM — Forgot Username button not dismissing keyboard
`ForgotUsernameScreen` uses `KeyboardAvoidingView` but has no `ScrollView`. If the keyboard covers the "Recover Username" button, add:
```tsx
<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
  <View style={{ flex: 1 }}>
    {/* existing content */}
  </View>
</TouchableWithoutFeedback>
```

### Reference — DailyLogScreen does it right
`04_daily_log_keyboard.yaml` is the positive reference. Compare `03_daily_log_task_enter_done.png` (task added on Enter) with the gap screenshots from auth screens.
