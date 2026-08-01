import { NextResponse } from 'next/server';
import { openApiSpec } from '@/lib/openapi';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const accept = request.headers.get('accept') || '';

  if (accept.includes('application/json') || url.searchParams.has('format') && url.searchParams.get('format') === 'json') {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    // Reattach API version and CORS headers from proxy
    headers.set('X-API-Version', 'v1');
    headers.set('Access-Control-Allow-Origin', '*');
    return NextResponse.json(openApiSpec, { headers });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>AccessGuard API — Swagger UI</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.20.1/swagger-ui.min.css" />
  <style>
    body { margin: 0; background: #1a1a2e; color: #e0e0e0; }
    .swagger-ui { color: #e0e0e0; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #e0e0e0; }
    .swagger-ui .info a { color: #ff6b6b; }
    .swagger-ui .opblock-tag { color: #e0e0e0; }
    .swagger-ui .opblock .opblock-summary-description { color: #aaa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.20.1/swagger-ui-bundle.min.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/docs?format=json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.SwaggerUIStandalonePreset,
      ],
      layout: 'BaseLayout',
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
      docExpansion: 'list',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    });
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'X-API-Version': 'v1',
    },
  });
}
