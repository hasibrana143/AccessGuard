import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// Mock NextRequest
function createRequest(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

describe('Projects API', () => {
  let testOrgId: string;

  beforeAll(async () => {
    // Ensure test organization exists
    const org = await db.organization.upsert({
      where: { slug: 'test-org' },
      create: {
        slug: 'test-org',
        name: 'Test Organization',
        plan: 'agency'
      },
      update: {}
    });
    testOrgId = org.id;
  });

  afterAll(async () => {
    // Cleanup test data
    const testProjects = await db.project.findMany({
      where: { organization: { slug: 'test-org' } }
    });
    
    for (const project of testProjects) {
      await db.violation.deleteMany({ where: { projectId: project.id } });
      await db.scan.deleteMany({ where: { projectId: project.id } });
    }
    
    await db.project.deleteMany({
      where: { organization: { slug: 'test-org' } }
    });
  });

  describe('GET /api/projects', () => {
    it('should return projects for demo-org', async () => {
      const request = createRequest('/api/projects?orgId=demo-org');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should return 404 for non-existent organization', async () => {
      const request = createRequest('/api/projects?orgId=non-existent-org');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Organization not found');
    });

    it('should include violation summary for each project', async () => {
      const request = createRequest('/api/projects?orgId=demo-org');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      if (data.data.length > 0) {
        const project = data.data[0];
        expect(project).toHaveProperty('violations');
        expect(project.violations).toHaveProperty('critical');
        expect(project.violations).toHaveProperty('serious');
        expect(project.violations).toHaveProperty('moderate');
        expect(project.violations).toHaveProperty('minor');
      }
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const request = createRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Project',
          url: 'https://test-example.com',
          description: 'Test project description',
          orgSlug: 'test-org'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.project.name).toBe('Test Project');
      expect(data.data.project.url).toBe('https://test-example.com');
      expect(data.data.scan).toBeDefined();
    });

    it('should require name and URL', async () => {
      const request = createRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Missing name and URL'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Name and URL are required');
    });

    it('should return 404 for non-existent organization', async () => {
      const request = createRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Project',
          url: 'https://test.com',
          orgSlug: 'non-existent-org'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Organization not found');
    });
  });
});
