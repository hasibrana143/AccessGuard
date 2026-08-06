// Pre-seeded load-test data — docs/qa/LOAD_TESTING.md §5
// Usage: npx tsx tests/load/load-test-seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ORG_SLUG = 'load-test-org';
const USER_EMAIL = 'loadtest@accessguard.dev';
const USER_PASSWORD = 'load-test-password-123';
const PROJECT_NAME = 'project_load_test';
const VIOLATION_ID = 'violation_test_1';

async function main() {
  const password = await bcrypt.hash(USER_PASSWORD, 10);

  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: {},
    create: { slug: ORG_SLUG, name: 'Load Test Org' },
  });

  await prisma.user.upsert({
    where: { email: USER_EMAIL },
    update: {},
    create: {
      email: USER_EMAIL,
      password,
      name: 'Load Test User',
      role: 'owner',
      orgId: org.id,
      emailVerifiedAt: new Date(),
    },
  });

  const project = await prisma.project.upsert({
    where: { id: PROJECT_NAME },
    update: {},
    create: {
      id: PROJECT_NAME,
      orgId: org.id,
      name: PROJECT_NAME,
      url: 'https://example.com',
    },
  });

  const scan = await prisma.scan.upsert({
    where: { id: `${VIOLATION_ID}-scan` },
    update: {},
    create: { id: `${VIOLATION_ID}-scan`, projectId: project.id, status: 'completed' },
  });

  await prisma.violation.upsert({
    where: { id: VIOLATION_ID },
    update: {},
    create: {
      id: VIOLATION_ID,
      scanId: scan.id,
      projectId: project.id,
      ruleId: 'image-alt',
      wcagCriteria: '1.1.1',
      severity: 'critical',
      url: 'https://example.com/',
      elementSelector: 'img',
      elementHtml: '<img src="a.jpg">',
      description: 'Image missing alt text (load-test fixture)',
      status: 'open',
    },
  });

  console.log(`Load-test data ready:
  org:        ${org.slug}
  user:       ${USER_EMAIL} / ${USER_PASSWORD}
  project:    ${project.id}
  violation:  ${VIOLATION_ID}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
