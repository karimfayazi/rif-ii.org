/**
 * Health Check API Route
 * 
 * Quick endpoint to test server connectivity
 * GET /api/health
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
    service: 'RIF-II MIS',
    version: '1.0.0'
  });
}
