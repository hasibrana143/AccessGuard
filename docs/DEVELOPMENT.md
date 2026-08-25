# AccessGuard — Development Guide

## Getting Started

### Prerequisites
- **Node.js:** 20+ (LTS)
- **npm:** 10+
- **Docker:** 24+ (for database)
- **Git:** 2.40+

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/accessguard.git
cd accessguard

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your values

# Start database
docker compose up -d postgres redis

# Run migrations
npm run db:push

# Seed database
npm run db:seed

# Start development server
npm run dev
```

### Development Server
```bash
# Start dev server (port 3000)
npm run dev

# Health check
curl http://localhost:3000/api/health
```

## Project Structure

```
accessguard/
├── src/
│   ├── ai/                    # AI remediation module
│   │   ├── prompts.ts         # Prompt templates
│   │   ├── model-router.ts    # Model routing
│   │   ├── cost.ts            # Cost tracking
│   │   └── __tests__/         # AI tests
│   ├── app/                   # Next.js App Router
│   │   ├── (dashboard)/       # Dashboard pages
│   │   ├── api/               # API routes
│   │   ├── auth/              # Auth pages
│   │   └── public/            # Public pages
│   ├── components/            # React components
│   │   ├── ui/                # shadcn primitives
│   │   ├── dashboard/         # Dashboard components
│   │   └── landing/           # Landing page
│   ├── lib/                   # Core libraries
│   │   ├── auth.ts            # Authentication
│   │   ├── rbac.ts            # Authorization
│   │   ├── audit.ts           # Audit logging
│   │   ├── rate-limit.ts      # Rate limiting
│   │   └── ...                # Other utilities
│   ├── services/              # Business logic
│   │   └── scanner/           # Accessibility scanner
│   └── types/                 # TypeScript types
├── prisma/                    # Database schema
├── e2e/                       # Playwright tests
├── tests/                     # Load tests
└── docs/                      # Documentation
```

## Coding Standards

### TypeScript
- **Strict mode:** Enabled
- **Path aliases:** `@/*` → `./src/*`
- **No relative imports:** Use `@/` prefix

### React
- **Components:** Function components only
- **Props:** Interface definitions
- **Hooks:** Custom hooks in `src/hooks/`

### Styling
- **Framework:** Tailwind CSS v4
- **Components:** shadcn/ui primitives
- **Tokens:** Semantic tokens in `globals.css`

### API Routes
- **Validation:** Zod schemas
- **Error handling:** Try-catch with proper responses
- **Logging:** Pino structured logging

## Commands

### Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
```

### Testing
```bash
npm test             # Run unit tests
npm run test:watch   # Watch mode
npm run test:coverage # With coverage
npm run test:e2e     # E2E tests
```

### Database
```bash
npm run db:push      # Push schema
npm run db:seed      # Seed data
npm run db:reset     # Reset database
npm run db:backup    # Create backup
```

### Code Quality
```bash
npm run lint         # Run ESLint
npx tsc -p tsconfig.check.json --noEmit  # Type check
```

## Git Workflow

### Branches
- `main` - Production branch
- `develop` - Development branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches
- `release/*` - Release branches

### Commit Messages
```
feat: add new feature
fix: bug fix
docs: documentation update
style: code style change
refactor: code refactoring
test: adding tests
chore: maintenance tasks
```

### Pull Requests
1. Create feature branch from `develop`
2. Make changes
3. Write tests
4. Update documentation
5. Create PR to `develop`
6. Get review approval
7. Merge to `develop`
8. Deploy to staging
9. Test in staging
10. Merge to `main`
11. Deploy to production

## Database

### Schema Changes
```bash
# Create migration
npx prisma migrate dev --name <migration_name>

# Apply to production
npm run db:migrate:prod
```

### Seeding
```bash
# Full seed
npm run db:seed

# Reset and seed
npm run db:reset
npm run db:seed
```

### Backup
```bash
# Create backup
npm run db:backup

# Restore backup
npm run db:restore
```

## API Development

### Adding New Endpoint

1. Create route file:
```typescript
// src/app/api/my-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedEmail } from '@/lib/rbac';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const auth = await requireVerifiedEmail(request, { permission: 'create_project' });
  if (auth.error) return auth.error;

  const body = await request.json();
  const validated = schema.parse(body);

  // Implementation

  return NextResponse.json({ success: true, data: { ... } });
}
```

2. Add tests:
```typescript
// src/app/api/my-endpoint/route.test.ts
import { describe, it, expect } from 'vitest';
import { POST } from './route';

describe('POST /api/my-endpoint', () => {
  it('creates resource', async () => {
    const request = new Request('http://localhost/api/my-endpoint', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});
```

3. Update API documentation

## Adding New Feature

### 1. Plan
- Define requirements
- Design API
- Design UI/UX
- Plan tests

### 2. Implement
- Create database schema
- Implement API
- Implement UI
- Write tests

### 3. Test
- Unit tests
- Integration tests
- E2E tests
- Manual testing

### 4. Document
- Update API docs
- Update user guide
- Update changelog

### 5. Deploy
- Create PR
- Review
- Merge
- Deploy

## Debugging

### VS Code Launch Config
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Dev Server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Common Issues

#### Database Connection
```bash
# Check PostgreSQL
docker compose ps postgres

# Check logs
docker compose logs postgres
```

#### Redis Connection
```bash
# Check Redis
docker compose ps redis

# Test connection
redis-cli ping
```

#### Build Errors
```bash
# Clear cache
rm -rf .next
rm -rf node_modules/.cache

# Reinstall
npm install

# Rebuild
npm run build
```

## Performance

### Optimization Checklist
- [ ] Use React Server Components
- [ ] Implement caching
- [ ] Optimize images
- [ ] Minimize bundle size
- [ ] Use CDN for static assets
- [ ] Enable compression

### Monitoring
- **Lighthouse:** Performance scores
- **Web Vitals:** Core metrics
- **Sentry:** Error tracking
- **Analytics:** User behavior

## Security

### Security Checklist
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] Authentication
- [ ] Authorization
- [ ] Encryption
- [ ] Audit logging
