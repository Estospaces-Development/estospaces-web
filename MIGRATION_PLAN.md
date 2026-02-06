# EstoSpaces Frontend Migration Plan

## Overview
Migrating from React + Vite monolith to Next.js 15 with proper dashboard separation.

## Source
- **From**: `/Users/puvendhan/Documents/repos/new/estospaces-app` (demo branch)
- **To**: `/Users/puvendhan/Documents/repos/new/esp/estospaces-web`

## Migration Status

### ✅ Completed
- [x] Initialize Next.js 15 with TypeScript
- [x] Create directory structure for all dashboards
- [x] Set up route groups: (admin), (manager), (user), (auth), (public)

### 🔄 In Progress
- [ ] Create layout files for each dashboard
- [ ] Migrate shared UI components

### ⏳ Pending
- [ ] Migrate Admin Dashboard
- [ ] Migrate Manager Dashboard
- [ ] Migrate User Dashboard
- [ ] Set up authentication
- [ ] Set up API clients
- [ ] Set up state management (Zustand)
- [ ] Configure middleware for auth

## Directory Structure

```
src/
├── app/
│   ├── (admin)/admin/*          # Admin Dashboard
│   ├── (manager)/manager/*      # Manager Dashboard
│   ├── (user)/*                 # User Dashboard
│   ├── (auth)/*                 # Authentication
│   └── (public)/*               # Public pages
├── components/
│   ├── admin/                   # Admin-specific components
│   ├── manager/                 # Manager-specific components
│   ├── user/                    # User-specific components
│   ├── shared/                  # Shared components
│   └── ui/                      # UI primitives
└── lib/
    ├── api/                     # API clients
    ├── hooks/                   # Custom hooks
    ├── stores/                  # Zustand stores
    └── utils/                   # Utilities
```

## Migration Mapping

### Admin Dashboard
```
Current → Next.js
src/pages/AdminLogin.jsx → app/(auth)/login/page.tsx (with role check)
src/pages/AdminVerificationDashboard.tsx → app/(admin)/admin/verifications/page.tsx
src/pages/AdminChatDashboard.jsx → app/(admin)/admin/chat/page.tsx
src/pages/AdminPropertyManagement.jsx → app/(admin)/admin/properties/page.tsx
src/pages/UserAnalytics.jsx → app/(admin)/admin/analytics/page.tsx
src/components/Admin/* → src/components/admin/*
```

### Manager Dashboard
```
Current → Next.js
src/pages/manager/* → app/(manager)/manager/*/page.tsx
src/components/manager/* → src/components/manager/*
```

### User Dashboard
```
Current → Next.js
src/pages/Dashboard*.jsx → app/(user)/*/page.tsx
src/components/Dashboard/* → src/components/user/*
```

## Tech Stack Changes

### Old → New
- React Router → Next.js App Router
- Context API → Zustand
- Fetch calls → TanStack Query
- Supabase Client → Custom API Client (Go backend)
- Vite → Next.js

## Next Steps
1. Create base layouts
2. Migrate shared components
3. Migrate dashboard by dashboard
4. Set up authentication
5. Connect to Go backend APIs
