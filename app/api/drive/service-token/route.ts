import { NextRequest, NextResponse } from 'next/server';
import {
  mintServiceAccountAccessToken,
  ensureFirebaseAuthorizedDomains,
} from '@/lib/googleServiceAccountAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const hostname = url.searchParams.get('hostname') || req.headers.get('host') || '';
    const forceRefresh =
      url.searchParams.get('force') === '1' || url.searchParams.get('force') === 'true';

    const [tokenInfo, domainStatus] = await Promise.all([
      mintServiceAccountAccessToken(undefined, forceRefresh),
      ensureFirebaseAuthorizedDomains(hostname ? [hostname] : []),
    ]);

    return NextResponse.json({
      success: true,
      accessToken: tokenInfo.accessToken,
      clientEmail: tokenInfo.clientEmail,
      projectId: tokenInfo.projectId,
      expiresIn: tokenInfo.expiresIn,
      issuedAt: tokenInfo.issuedAt,
      scopesCount: tokenInfo.scopesCount,
      forceRefreshed: forceRefresh,
      heartbeatTimestamp: new Date().toISOString(),
      domainStatus,
    });
  } catch (err: any) {
    console.error('Error in /api/drive/service-token:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Could not mint service account token',
      },
      { status: 500 }
    );
  }
}
