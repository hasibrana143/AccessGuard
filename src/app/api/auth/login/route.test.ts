import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST, DELETE } from './route';
import { NextRequest } from 'next/server';

function createRequest(url: string, options: RequestInit = {}): NextRequest {
  const headers = new Headers(options.headers);
  // Add a default x-forwarded-for header to avoid rate limiting issues
  if (!headers.has('x-forwarded-for')) {
    headers.set('x-forwarded-for', '127.0.0.1');
  }
  
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    ...options,
    headers
  });
}

describe('Auth Login API', () => {
  describe('POST /api/auth/login', () => {
    it('should require email and password', async () => {
      const request = createRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Email and password are required');
    });

    it('should return 401 for invalid credentials', async () => {
      const request = createRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid email or password');
    });

    it('should login successfully with correct credentials', async () => {
      const request = createRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'demo@accessguard.com',
          password: 'demo123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
      expect(data.data.user.email).toBe('demo@accessguard.com');
      expect(data.data.organization).toBeDefined();
      
      // Check session cookie is set
      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toContain('session_token');
    });

    it('should return 401 for wrong password', async () => {
      const request = createRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'demo@accessguard.com',
          password: 'wrongpassword'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid email or password');
    });
  });

  describe('DELETE /api/auth/login (logout)', () => {
    it('should clear session cookie', async () => {
      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Check session cookie is cleared
      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toContain('session_token=');
      expect(setCookie).toContain('Max-Age=0');
    });
  });
});
