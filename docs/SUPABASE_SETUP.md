# AccessGuard - Supabase Integration Guide

This guide walks you through setting up Supabase for the AccessGuard platform.

## 🚀 Quick Start

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/log in
2. Click "New Project"
3. Choose your organization
4. Name your project: `accessguard`
5. Set a strong database password (save this!)
6. Choose a region closest to your users
7. Click "Create new project"

### 2. Get Your Credentials

Go to **Project Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL` - Your project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your anon/public key

Go to **Project Settings → Database**:

- Copy the connection string (Direct connection) for `DIRECT_DATABASE_URL`
- Copy the connection string (Transaction pooler) for `DATABASE_URL`

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

DIRECT_DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
DATABASE_URL=postgresql://postgres:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 4. Push Database Schema

Run Prisma migrations to create tables:

```bash
bun run db:push
```

### 5. Configure Authentication

#### Enable Email Auth
1. Go to **Authentication → Providers**
2. Enable "Email" provider
3. Configure settings as needed

#### Enable OAuth Providers (Optional)
1. Go to **Authentication → Providers**
2. Enable Google, GitHub, etc.
3. Add your OAuth credentials

#### Configure Email Templates
1. Go to **Authentication → Email Templates**
2. Customize confirmation, reset password, and magic link emails

### 6. Set Up Row Level Security (RLS)

Supabase requires RLS policies for security. Run this SQL in the **SQL Editor**:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid()::text = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id);

-- Organization members can read organizations they belong to
CREATE POLICY "Members can read organizations" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()::text
    )
  );

-- Organization members can read membership info
CREATE POLICY "Members can read memberships" ON organization_members
  FOR SELECT USING (user_id = auth.uid()::text);

-- Users can insert memberships for themselves
CREATE POLICY "Users can join organizations" ON organization_members
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Projects are readable by organization members
CREATE POLICY "Members can read projects" ON projects
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()::text
    )
  );

-- Scans are readable by organization members
CREATE POLICY "Members can read scans" ON scans
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid()::text
    )
  );

-- Violations are readable by organization members
CREATE POLICY "Members can read violations" ON violations
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid()::text
    )
  );
```

## 📁 File Structure

```
src/
├── lib/
│   └── supabase/
│       ├── client.ts      # Browser client
│       ├── server.ts      # Server client
│       └── middleware.ts  # Auth middleware
├── types/
│   └── database.ts        # TypeScript types
├── hooks/
│   └── useAuthSupabase.ts # Auth hook
├── components/
│   └── SupabaseProvider.tsx
└── app/
    ├── api/auth/
    │   ├── callback/route.ts
    │   ├── session/route.ts
    │   ├── sign-in/route.ts
    │   ├── sign-up/route.ts
    │   └── sign-out/route.ts
    └── auth/
        ├── login/page.tsx
        └── register/page.tsx
```

## 🔐 Authentication Flow

1. **Sign Up**: User registers → Supabase creates auth user → Profile created in users table
2. **Sign In**: User logs in → Supabase validates → Session established
3. **Protected Routes**: Middleware checks session → Redirects if not authenticated
4. **API Access**: Server components use `getCurrentUser()` to get user context

## 🎯 Usage Examples

### Server Component

```tsx
import { getCurrentUser, requireAuth } from '@/lib/auth-supabase'

export default async function DashboardPage() {
  const user = await requireAuth()

  return <div>Welcome, {user.name}!</div>
}
```

### Client Component

```tsx
'use client'

import { useAuthSupabase } from '@/hooks/useAuthSupabase'

export function ProfileButton() {
  const { user, signOut } = useAuthSupabase()

  if (!user) return <SignInButton />

  return (
    <Button onClick={signOut}>
      Sign Out ({user.email})
    </Button>
  )
}
```

### API Route

```tsx
import { requireAuth } from '@/lib/auth-supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const user = await requireAuth()

  // Your protected logic here

  return NextResponse.json({ success: true })
}
```

## 🌐 Deployment

### Vercel (Recommended)

1. Connect your GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy!

### Self-Hosted

1. Set environment variables on your server
2. Build: `bun run build`
3. Start: `bun run start`

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Prisma with Supabase](https://supabase.com/docs/guides/integrations/prisma)
