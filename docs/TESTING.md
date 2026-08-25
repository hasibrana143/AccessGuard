# AccessGuard — Testing Documentation

## Testing Strategy

AccessGuard follows a comprehensive testing strategy with multiple layers:

```
┌─────────────────────────────────────┐
│         Load Tests (k6)             │  ← Performance
├─────────────────────────────────────┤
│      E2E Tests (Playwright)         │  ← User Flows
├─────────────────────────────────────┤
│    Integration Tests (Vitest)       │  ← API + DB
├─────────────────────────────────────┤
│      Unit Tests (Vitest)            │  ← Logic
└─────────────────────────────────────┘
```

## Unit Tests

### Location
```
src/lib/__tests__/
src/ai/__tests__/
src/app/api/__tests__/
services/scanner/__tests__/
```

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- src/ai/__tests__/model-router.test.ts

# Run in watch mode
npm run test:watch
```

### Test Examples

#### Model Router Test
```typescript
describe('ai/model-router', () => {
  it('calls the primary provider and parses usage', async () => {
    mockFetch.mockResolvedValue(providerResponse('ok', {
      prompt_tokens: 100,
      completion_tokens: 50,
    }));

    const result = await callChatCompletions(
      [{ role: 'user', content: 'u' }],
      configs,
      mockFetch
    );

    expect(result?.model).toBe('primary-model');
    expect(result?.usage?.totalTokens).toBe(150);
  });
});
```

#### URL Validation Test
```typescript
describe('url-validation', () => {
  it('blocks private IPs', async () => {
    const result = await validateTargetUrl('http://192.168.1.1');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('blocked address');
  });

  it('allows public URLs', async () => {
    const result = await validateTargetUrl('https://example.com');
    expect(result.ok).toBe(true);
  });
});
```

## Integration Tests

### API Route Tests
```typescript
describe('POST /api/projects', () => {
  it('creates a project', async () => {
    const request = new Request('http://localhost/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Project',
        url: 'https://example.com'
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Test Project');
  });
});
```

### Database Tests
```typescript
describe('Database Operations', () => {
  it('creates and retrieves a project', async () => {
    const project = await db.project.create({
      data: {
        orgId: 'org_123',
        name: 'Test',
        url: 'https://example.com'
      }
    });

    const found = await db.project.findUnique({
      where: { id: project.id }
    });

    expect(found?.name).toBe('Test');
  });
});
```

## E2E Tests (Playwright)

### Location
```
e2e/
├── auth.spec.ts
├── dashboard.spec.ts
├── projects.spec.ts
├── scans.spec.ts
├── settings.spec.ts
├── violations.spec.ts
├── reports.spec.ts
├── landing.spec.ts
├── smoke.spec.ts
└── a11y.spec.ts
```

### Running E2E Tests
```bash
# Setup test database
npm run test:e2e:setup

# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run specific test
npx playwright test e2e/auth.spec.ts
```

### Test Examples

#### Authentication Flow
```typescript
test('user can login and access dashboard', async ({ page }) => {
  await page.goto('/auth/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

#### Project Creation
```typescript
test('user can create a project', async ({ page }) => {
  await page.goto('/projects');
  await page.click('button:has-text("New Project")');
  await page.fill('[name="name"]', 'My Website');
  await page.fill('[name="url"]', 'https://example.com');
  await page.click('button[type="submit"]');

  await expect(page.locator('.project-card')).toContainText('My Website');
});
```

### Accessibility Tests
```typescript
test('page has no accessibility violations', async ({ page }) => {
  await page.goto('/dashboard');
  const accessibilityScanResults = await axe.run(page);
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

## Load Tests (k6)

### Location
```
tests/load/
├── smoke.js
├── scan-flow.js
├── ai-remediate.js
├── soak.js
└── load-test-seed.ts
```

### Running Load Tests
```bash
# Seed test data
npm run test:load:seed

# Smoke test (baseline)
npm run test:load:smoke

# Scan flow test
npm run test:load:scan

# AI remediation test
npm run test:load:ai

# Soak test (1 hour)
npm run test:load:soak
```

### Test Scenarios

#### Smoke Test
```javascript
export const options = {
  vus: 1,
  duration: '1m',
};

export default function () {
  http.get('http://localhost:3000/api/health');
  sleep(1);
}
```

#### Scan Flow Test
```javascript
export const options = {
  vus: 5,
  duration: '5m',
};

export default function () {
  // Login
  const loginRes = http.post('http://localhost:3000/api/auth/login', JSON.stringify({
    email: 'test@example.com',
    password: 'testpass123',
  }));

  // Create project
  const projectRes = http.post('http://localhost:3000/api/projects', JSON.stringify({
    name: 'Load Test Project',
    url: 'https://example.com',
  }), { headers: { Authorization: `Bearer ${loginRes.json('token')}` } });

  // Start scan
  http.post('http://localhost:3000/api/scans', JSON.stringify({
    projectId: projectRes.json('data.id'),
  }), { headers: { Authorization: `Bearer ${loginRes.json('token')}` } });

  sleep(5);
}
```

## Coverage

### Thresholds
| Metric | Threshold |
|--------|-----------|
| Statements | 55% |
| Branches | 50% |
| Functions | 58% |
| Lines | 57% |

### Current Coverage
| Metric | Current |
|--------|---------|
| Statements | 58% |
| Branches | 52% |
| Functions | 61% |
| Lines | 59% |

### Running Coverage
```bash
npm run test:coverage
```

## CI/CD Integration

### GitHub Actions
```yaml
# ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npx tsc -p tsconfig.check.json --noEmit
      - run: npm test
      - run: npx playwright install
      - run: npm run test:e2e
```

## Best Practices

### Writing Tests
1. **Arrange-Act-Assert** pattern
2. **Isolated tests** (no shared state)
3. **Descriptive names** (what, not how)
4. **Test one thing** per test
5. **Use factories** for test data

### Mocking
1. **Mock external services** (APIs, databases)
2. **Use vi.fn()** for function mocks
3. **Restore mocks** after each test
4. **Avoid over-mocking** (test real code when possible)

### Flaky Tests
1. **Use explicit waits** (not sleep)
2. **Avoid timing dependencies**
3. **Use stable selectors** (data-testid)
4. **Retry flaky tests** (max 2 retries)
