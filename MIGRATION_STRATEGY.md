# Migration Strategy: Next.js to Pure React (Vite)

This document outlines the step-by-step process for migrating the Estospaces project from Next.js to a pure React application using Vite and React Router.

## 1. Step-by-Step Migration Strategy

### Phase 1: Infrastructure & Configuration
1.  **Initialize Vite**: Create `vite.config.ts`, `index.html`, and `src/main.tsx`.
2.  **Update Dependencies**: 
    *   Add: `vite`, `@vitejs/plugin-react`, `react-router-dom`.
    *   Remove: `next`, `eslint-config-next`.
3.  **TypeScript Configuration**: Update `tsconfig.json` to be compatible with Vite and React Router.

### Phase 2: Routing & Layouts
1.  **Define Routes**: Map all Next.js file-based routes (from `src/app`) to a centralized `src/routes.tsx` or `src/App.tsx`.
2.  **Convert Layouts**: Transform `layout.tsx` files into React components that use `<Outlet />` from `react-router-dom`.
3.  **Group Routes**: Maintain the existing grouping (`(admin)`, `(auth)`, `(manager)`, `(user)`, `(public)`) using nested routes.

### Phase 3: Component Transformation
1.  **Global Replacements**:
    *   `next/link` -> `react-router-dom` (`Link`).
    *   `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`, `redirect`) -> `react-router-dom` (`useNavigate`, `useLocation`, `useSearchParams`, `Navigate`).
    *   `next/image` -> standard `<img>` (or a custom Image component if needed).
2.  **Cleanup Next.js Features**: Remove `metadata` exports, `head` components, and any SSR-specific logic.
3.  **Static Assets**: Ensure all assets in `public/` are referenced correctly.

### Phase 4: Finalization
1.  **Build & Test**: Execute `npm run build` using Vite and verify the output.
2.  **Clean Up**: Delete Next.js specific files: `next.config.ts`, `src/app/`, `.next/`.

## 2. Updated Folder Structure

```
estospaces-web/
├── public/              # Static assets
├── src/
│   ├── components/      # Shared UI components
│   ├── contexts/        # Context providers
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Utilities, API clients
│   ├── pages/           # Ported components from src/app
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── manager/
│   │   ├── public/
│   │   └── user/
│   ├── services/        # API services
│   ├── App.tsx          # Main App component with React Router definitions
│   ├── main.tsx         # Application entry point
│   ├── routes.tsx       # Route definitions (optional, can be in App.tsx)
│   └── globals.css      # Global styles
├── index.html           # Vite entry HTML
├── vite.config.ts       # Vite configuration
└── package.json         # Updated dependencies and scripts
```

## 3. Dependency Changes

### Additions
- `vite`: Build tool
- `@vitejs/plugin-react`: Vite plugin for React
- `react-router-dom`: Client-side routing
- `globals`: (Optional) for linting

### Removals
- `next`: Next.js framework
- `eslint-config-next`: Next.js linting config

## 4. Key Code Transformation Examples

### Link Replacement
**Before (Next.js):**
```tsx
import Link from 'next/link';
<Link href="/dashboard">Dashboard</Link>
```
**After (React Router):**
```tsx
import { Link } from 'react-router-dom';
<Link to="/dashboard">Dashboard</Link>
```

### Router Replacement
**Before (Next.js):**
```tsx
import { useRouter } from 'next/navigation';
const router = useRouter();
router.push('/login');
```
**After (React Router):**
```tsx
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/login');
```

### Layout Replacement
**Before (Next.js):**
```tsx
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Header />
      {children}
    </div>
  );
}
```
**After (React Router):**
```tsx
import { Outlet } from 'react-router-dom';
export default function Layout() {
  return (
    <div>
      <Header />
      <Outlet />
    </div>
  );
}
```

## 5. Final Checklist to Verify Full Next.js Removal
- [ ] `package.json` contains no reference to `next`.
- [ ] No files import from `next/*`.
- [ ] `next.config.ts` has been deleted.
- [ ] `src/app` directory has been deleted (or moved to `src/pages`).
- [ ] Application runs in development mode via `vite`.
- [ ] Application builds successfully via `vite build`.
