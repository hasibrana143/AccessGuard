import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GET, PUT, POST } from './route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

function createRequest(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options);
}

describe('Violations API', () => {
  describe('GET /api/violations', () => {
    it('should return violations with pagination', async () => {
      const request = createRequest('/api/violations?limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.pagination).toBeDefined();
      expect(data.pagination).toHaveProperty('total');
      expect(data.pagination).toHaveProperty('limit');
      expect(data.pagination).toHaveProperty('offset');
      expect(data.pagination).toHaveProperty('hasMore');
    });

    it('should filter by severity', async () => {
      const request = createRequest('/api/violations?severity=critical');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // All returned violations should be critical
      if (data.data.length > 0) {
        data.data.forEach((v: { severity: string }) => {
          expect(v.severity).toBe('critical');
        });
      }
    });

    it('should filter by status', async () => {
      const request = createRequest('/api/violations?status=open');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // All returned violations should be open
      if (data.data.length > 0) {
        data.data.forEach((v: { status: string }) => {
          expect(v.status).toBe('open');
        });
      }
    });

    it('should respect limit parameter', async () => {
      const request = createRequest('/api/violations?limit=5');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.limit).toBe(5);
      expect(data.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('PUT /api/violations', () => {
    let testViolationId: string;

    beforeAll(async () => {
      // Get a test violation
      const violation = await db.violation.findFirst();
      testViolationId = violation?.id || '';
    });

    it('should require id and status', async () => {
      const request = createRequest('/api/violations', {
        method: 'PUT',
        body: JSON.stringify({})
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ID and status are required');
    });

    it('should validate status value', async () => {
      const request = createRequest('/api/violations', {
        method: 'PUT',
        body: JSON.stringify({
          id: testViolationId,
          status: 'invalid-status'
        })
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid status');
    });

    it('should update violation status to fixed', async () => {
      if (!testViolationId) {
        console.log('Skipping test - no violation found');
        return;
      }

      const request = createRequest('/api/violations', {
        method: 'PUT',
        body: JSON.stringify({
          id: testViolationId,
          status: 'fixed'
        })
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('fixed');
      expect(data.data.fixedAt).toBeDefined();

      // Reset back to open for other tests
      await db.violation.update({
        where: { id: testViolationId },
        data: { status: 'open', fixedAt: null }
      });
    });
  });

  describe('POST /api/violations (stats)', () => {
    it('should return violation statistics', async () => {
      const request = createRequest('/api/violations', {
        method: 'POST',
        body: JSON.stringify({ orgSlug: 'demo-org' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('severity');
      expect(data.data).toHaveProperty('status');
      expect(data.data).toHaveProperty('topRules');
      expect(data.data).toHaveProperty('recent');
    });

    it('should include severity breakdown', async () => {
      const request = createRequest('/api/violations', {
        method: 'POST',
        body: JSON.stringify({ orgSlug: 'demo-org' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.severity).toHaveProperty('critical');
      expect(data.data.severity).toHaveProperty('serious');
      expect(data.data.severity).toHaveProperty('moderate');
      expect(data.data.severity).toHaveProperty('minor');
      expect(data.data.severity).toHaveProperty('total');
    });

    it('should return 404 for non-existent organization', async () => {
      const request = createRequest('/api/violations', {
        method: 'POST',
        body: JSON.stringify({ orgSlug: 'non-existent-org' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Organization not found');
    });
  });
});
