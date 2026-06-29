/**
 * GET /api/health — public liveness probe.
 *
 * Used by the deploy workflow's smoke test, Docker's HEALTHCHECK every
 * 30s, and external uptime monitors. Returns 200 in degraded mode so
 * monitors can read JSON and alert on `status !== 'healthy'`; reserves
 * a 5xx for the truly unreachable case.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/tickets/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface SubsystemStatus {
  ok: boolean;
  detail?: string;
}

function probeSqlite(): SubsystemStatus {
  try {
    const row = getDb().prepare('SELECT 1 AS ok').get() as { ok?: number };
    return { ok: row?.ok === 1 };
  } catch (e) {
    return { ok: false, detail: (e as Error).message.slice(0, 160) };
  }
}

export async function GET() {
  const sqlite = probeSqlite();
  const status: 'healthy' | 'degraded' = sqlite.ok ? 'healthy' : 'degraded';
  return NextResponse.json(
    {
      ok: true,
      service: 'support-vizzor',
      status,
      sha: process.env.GIT_SHA ?? 'unknown',
      buildTime: process.env.BUILD_TIME ?? null,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      subsystems: { sqlite },
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
