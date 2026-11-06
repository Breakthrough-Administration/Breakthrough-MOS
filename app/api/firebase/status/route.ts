import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseAdminStatus } from '@/lib/firebaseAdmin';
import { ensureFirebaseAuthorizedDomains } from '@/lib/googleServiceAccountAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const includeToken = url.searchParams.get('includeToken') !== 'false';
    const hostname = url.searchParams.get('hostname') || req.headers.get('host') || '';

    if (hostname) {
      ensureFirebaseAuthorizedDomains([hostname]).catch(() => {});
    }

    const report = await verifyFirebaseAdminStatus(includeToken);

    return NextResponse.json(report, {
      status: report.authenticated ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: any) {
    console.error('Error in /api/firebase/status:', err);
    return NextResponse.json(
      {
        authenticated: false,
        operational: false,
        error: err?.message || 'Firebase Admin verification failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
