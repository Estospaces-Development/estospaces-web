# Local Testing Guide - EstoSpaces Web Application

This guide will help you set up and test the Next.js web application locally.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ (for local development without Docker)
- npm or yarn
- Backend services running (Core Service at minimum)

---

## Option 1: Quick Start with Docker Compose

### 1. Start the Web Application

```bash
# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f web

# Check status
docker-compose ps
```

### 2. Access the Application

Open your browser and navigate to:
- **Home Page**: http://localhost:3000
- **Login Page**: http://localhost:3000/login
- **Admin Dashboard**: http://localhost:3000/admin/verifications
- **Manager Dashboard**: http://localhost:3000/manager/dashboard
- **User Dashboard**: http://localhost:3000/dashboard

### 3. Stop the Application

```bash
# Stop
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

---

## Option 2: Local Development (Recommended for Development)

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Set Up Environment

```bash
# Create .env.local file
cat > .env.local << 'EOF'
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=EstoSpaces

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_CORE_SERVICE_URL=http://localhost:8080
NEXT_PUBLIC_BOOKING_SERVICE_URL=http://localhost:8081
NEXT_PUBLIC_PAYMENT_SERVICE_URL=http://localhost:8082
NEXT_PUBLIC_PLATFORM_SERVICE_URL=http://localhost:8083

# Feature Flags
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_VIRTUAL_TOURS=true
NEXT_PUBLIC_ENABLE_FAST_TRACK=true
EOF
```

### 3. Start Development Server

```bash
npm run dev
# or
yarn dev
```

The application will start on http://localhost:3000

### 4. Build for Production

```bash
# Build
npm run build

# Start production server
npm run start
```

---

## Testing with Backend Services

### 1. Start Backend Services First

```bash
# In estospaces-core-service directory
cd ../estospaces-core-service
docker-compose up -d

# Verify backend is running
curl http://localhost:8080/health
```

### 2. Start Web Application

```bash
# In estospaces-web directory
npm run dev
```

### 3. Test Authentication Flow

1. Navigate to http://localhost:3000/login
2. Register a new user:
   - Email: test@example.com
   - Password: password123
3. Login with the credentials
4. You should be redirected to the dashboard

---

## Available Routes

### Public Routes
- `/` - Landing page
- `/about` - About page
- `/contact` - Contact page
- `/pricing` - Pricing page
- `/login` - Login page
- `/register` - Registration page

### User Dashboard (Requires Authentication)
- `/dashboard` - User dashboard home
- `/search` - Property search
- `/properties` - Property listings
- `/bookings` - User bookings
- `/applications` - Rental applications
- `/contracts` - Contracts
- `/payments` - Payment history
- `/favorites` - Saved properties
- `/profile` - User profile
- `/messages` - Messages
- `/notifications` - Notifications
- `/settings` - User settings

### Manager Dashboard (Requires Manager Role)
- `/manager/dashboard` - Manager home
- `/manager/properties` - Property management
- `/manager/leads` - Lead management
- `/manager/bookings` - Booking management
- `/manager/clients` - Client management
- `/manager/analytics` - Analytics
- `/manager/billing` - Billing

### Admin Dashboard (Requires Admin Role)
- `/admin/verifications` - User & property verifications
- `/admin/properties` - Property management
- `/admin/chat` - Support chat
- `/admin/analytics` - Platform analytics

---

## Docker Commands

### Rebuild After Code Changes

```bash
# Rebuild image
docker-compose build

# Rebuild and restart
docker-compose up -d --build
```

### View Logs

```bash
# Follow logs
docker-compose logs -f web

# Last 100 lines
docker-compose logs --tail=100 web
```

### Execute Commands in Container

```bash
# Access shell
docker-compose exec web sh

# Check Next.js version
docker-compose exec web node -v

# Check environment variables
docker-compose exec web env
```

---

## Testing Checklist

### Frontend Features
- [ ] Landing page loads correctly
- [ ] Navigation works (header, sidebar)
- [ ] Login/Register forms work
- [ ] Authentication redirects work
- [ ] Protected routes require login
- [ ] Role-based access control works
- [ ] Images and assets load
- [ ] Tailwind CSS styles applied
- [ ] Responsive design on mobile

### Integration with Backend
- [ ] Can register new user
- [ ] Can login successfully
- [ ] Token stored in cookies
- [ ] API calls include auth header
- [ ] Protected routes fetch data
- [ ] Error messages display correctly
- [ ] Loading states work
- [ ] 401 redirects to login

---

## Troubleshooting

### Port Already in Use

```bash
# Find process on port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### Cannot Connect to Backend

```bash
# Check if backend is running
curl http://localhost:8080/health

# Check Docker network
docker network ls
docker network inspect estospaces-web_default
```

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### Hot Reload Not Working

```bash
# Try running in dev mode again
npm run dev

# Or clear cache
rm -rf .next
npm run dev
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| NEXT_PUBLIC_APP_URL | http://localhost:3000 | Application URL |
| NEXT_PUBLIC_API_URL | http://localhost:8080/api | API base URL |
| NEXT_PUBLIC_CORE_SERVICE_URL | http://localhost:8080 | Core service URL |
| NEXT_PUBLIC_BOOKING_SERVICE_URL | http://localhost:8081 | Booking service URL |
| NEXT_PUBLIC_PAYMENT_SERVICE_URL | http://localhost:8082 | Payment service URL |
| NEXT_PUBLIC_PLATFORM_SERVICE_URL | http://localhost:8083 | Platform service URL |

---

## Development Tips

### Hot Reload

```bash
# Development server with hot reload
npm run dev
```

### TypeScript Type Checking

```bash
# Check types
npx tsc --noEmit
```

### Linting

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

### Format Code

```bash
# Using Prettier (if installed)
npx prettier --write .
```

---

## Testing User Roles

### Create Test Users

Use the backend API to create users with different roles:

```bash
# Create admin user
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@estospaces.com",
    "password": "admin123",
    "role": "admin"
  }'

# Create manager user
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@estospaces.com",
    "password": "manager123",
    "role": "manager"
  }'

# Create regular user
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@estospaces.com",
    "password": "user123"
  }'
```

### Test Role-Based Access

1. Login as **user** → Should access `/dashboard` only
2. Login as **manager** → Should access `/manager/*` routes
3. Login as **admin** → Should access `/admin/*` routes

---

## Performance Testing

### Lighthouse Audit

```bash
# Run Lighthouse
npm install -g lighthouse
lighthouse http://localhost:3000 --view
```

### Bundle Analysis

```bash
# Install bundle analyzer
npm install @next/bundle-analyzer

# Analyze bundle
ANALYZE=true npm run build
```

---

## Quick Reference

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm run start

# Docker
docker-compose up -d
docker-compose logs -f web
docker-compose down

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

**Last Updated**: February 6, 2026
**Status**: Ready for Local Testing ✅
