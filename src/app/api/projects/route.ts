import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/projects - List all projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgId') || 'demo-org';

    const org = await db.organization.findFirst({
      where: { slug: orgSlug }
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    const projects = await db.project.findMany({
      where: {
        orgId: org.id,
        isActive: true
      },
      include: {
        scans: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate violation summary for each project
    const projectsWithSummary = await Promise.all(
      projects.map(async (project) => {
        const violations = await db.violation.groupBy({
          by: ['severity'],
          where: {
            projectId: project.id,
            status: 'open'
          },
          _count: true
        });

        const violationSummary = {
          critical: violations.find(v => v.severity === 'critical')?._count || 0,
          serious: violations.find(v => v.severity === 'serious')?._count || 0,
          moderate: violations.find(v => v.severity === 'moderate')?._count || 0,
          minor: violations.find(v => v.severity === 'minor')?._count || 0
        };

        const totalOpen = Object.values(violationSummary).reduce((a, b) => a + b, 0);
        
        // Calculate risk score based on violations
        let riskScore = 100;
        riskScore -= violationSummary.critical * 10;
        riskScore -= violationSummary.serious * 5;
        riskScore -= violationSummary.moderate * 2;
        riskScore -= violationSummary.minor * 1;
        riskScore = Math.max(0, Math.min(100, riskScore));

        return {
          ...project,
          violations: violationSummary,
          totalViolations: totalOpen,
          riskScore: project.riskScore ?? riskScore
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: projectsWithSummary
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, description, crawlConfig, orgSlug = 'demo-org' } = body;

    if (!name || !url) {
      return NextResponse.json(
        { success: false, error: 'Name and URL are required' },
        { status: 400 }
      );
    }

    // Get organization
    const org = await db.organization.findFirst({
      where: { slug: orgSlug }
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Create project
    const project = await db.project.create({
      data: {
        name,
        url,
        description: description || null,
        crawlConfig: JSON.stringify(crawlConfig || {
          maxPages: 100,
          excludePaths: [],
          includeSubdomains: false
        }),
        orgId: org.id
      }
    });

    // Create initial scan
    const scan = await db.scan.create({
      data: {
        projectId: project.id,
        status: 'pending'
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        project,
        scan
      }
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
