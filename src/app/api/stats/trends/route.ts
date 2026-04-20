import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/stats/trends - Get historical violation trends
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    // Build where clause
    const where: Record<string, unknown> = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };
    
    if (projectId) {
      where.projectId = projectId;
    }

    // Get violations grouped by day
    const violations = await db.violation.findMany({
      where,
      select: {
        createdAt: true,
        severity: true,
        status: true
      }
    });

    // Get scans grouped by day
    const scans = await db.scan.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        ...(projectId && { projectId })
      },
      select: {
        createdAt: true,
        status: true,
        violationsFound: true
      }
    });

    // Group by day
    const dailyData: Record<string, {
      date: string;
      violations: number;
      critical: number;
      serious: number;
      moderate: number;
      minor: number;
      fixed: number;
      scans: number;
    }> = {};

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyData[dateStr] = {
        date: dateStr,
        violations: 0,
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0,
        fixed: 0,
        scans: 0
      };
    }

    // Count violations by day and severity
    violations.forEach(v => {
      const dateStr = v.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dailyData[dateStr]) {
        dailyData[dateStr].violations++;
        if (v.status === 'fixed') {
          dailyData[dateStr].fixed++;
        }
        switch (v.severity) {
          case 'critical':
            dailyData[dateStr].critical++;
            break;
          case 'serious':
            dailyData[dateStr].serious++;
            break;
          case 'moderate':
            dailyData[dateStr].moderate++;
            break;
          case 'minor':
            dailyData[dateStr].minor++;
            break;
        }
      }
    });

    // Count scans by day
    scans.forEach(s => {
      const dateStr = s.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dailyData[dateStr]) {
        dailyData[dateStr].scans++;
      }
    });

    // Convert to array
    const trendData = Object.values(dailyData);

    return NextResponse.json({
      success: true,
      data: trendData
    });

  } catch (error) {
    console.error('Error fetching trend data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trend data' },
      { status: 500 }
    );
  }
}
