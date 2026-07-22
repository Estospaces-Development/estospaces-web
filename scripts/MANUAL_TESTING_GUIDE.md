# Manual Testing Guide — Run These Yourself

## Step 1: Pre-commit Checklist
Open a new terminal and run these commands:

```powershell
cd C:\Users\jeevi\Estospaces\esto-app-projects\estospaces-web

# 1. Build
npm run build
# Expected: "✓ built in X.XXs" — copy the output

# 2. TypeScript check
npx tsc --noEmit
# Expected: exits with code 0, no errors

# 3. Lint
npm run lint
# Expected: no errors (warnings OK)

# 4. Tests
npm run test
# Expected: all tests pass
```

## Step 2: Browser Smoke Tests
Open Chrome/Firefox and navigate to: https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app

### Flow 1: Public Landing Page
1. Load the homepage → hero section, stats, search button should be visible
2. Click "Search properties" → should go to /search
3. Scroll to footer → contact, FAQ, about links should work
4. Resize to mobile (375px) → responsive layout
5. Check browser console (F12) → zero red errors

### Flow 2: Authentication
1. Go to /login → form with email, password, sign in button
2. Try empty fields → validation errors
3. Click eye icon → password toggles visibility (FIX #168)
4. Go to /register → name, email, password fields
5. Try submitting with emoji name → validation error (FIX #279)
6. Submit with invalid credentials → friendly error message (FIX #290)

### Flow 3: User Dashboard
1. Login as user → /user/dashboard loads
2. Check no console errors
3. Navigate to /user/favorites, /user/profile
4. Logout

### Flow 4: Manager Dashboard
1. Login as manager → /manager/dashboard loads
2. Check stats cards, property grid
3. Navigate to /manager/profile → photo upload section loads
4. Logout

### Flow 5: Admin Dashboard
1. Login as admin → /admin/dashboard loads
2. Check analytics charts, property counts (FIX #304)
3. Navigate to /admin/verifications → queue loads
4. Navigate to /admin/properties → property list loads
5. Logout

## Step 3: Bug Regression
Check these specific scenarios for each fix:

### #168 - Login password toggle
- Go to /login, click eye icon → password should show/hide
- BEFORE FIX: icon was inverted (showed EyeOff when password visible)

### #172 - Registration name split
- Register with "John Doe" → first_name="John", last_name="Doe"
- BEFORE FIX: fallback was "Unknown" for empty parts

### #243 - Support transcript
- Open a support conversation as staff → messages from current user show as "staff"
- BEFORE FIX: messages without sender_role showed incorrectly

### #275 - Contact page India block
- Visit /contact → India office address block visible
- BEFORE FIX: no India contact info

### #279 - Register name validation
- Try registering with emoji-only name → blocked
- BEFORE FIX: emoji names accepted

### #290 - Registration error messages
- Try registering with existing email → friendly "already exists" message
- BEFORE FIX: raw backend error shown

### #304 - Admin live performance rows
- Go to /admin/dashboard → performance metrics section
- BEFORE FIX: showed 0 when rows were empty

### #305 - Property image resolution
- Browse properties → images should load
- BEFORE FIX: images from /api/v1/properties/ paths broken

### #308 - Admin dashboard grid
- Go to /admin/dashboard → no blank gap between Quarterly Goals and sidebar
- BEFORE FIX: items-start caused blank area

### #265 - Manager profile photo
- Go to /manager/profile → remove avatar button works without crash
- BEFORE FIX: crashed on null avatar_url

## Step 4: Report Results
For each test, note:
- PASS: works as expected
- FAIL: broken or unexpected behavior
- Console errors (red in DevTools)

Share the results and I'll address any failures immediately.
