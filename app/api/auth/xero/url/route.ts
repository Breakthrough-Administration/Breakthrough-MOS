import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = url.origin;
  const redirectUri = `${origin}/api/auth/xero/callback`;
  const clientId = process.env.XERO_CLIENT_ID;

  // If XERO_CLIENT_ID is configured, return the official Xero OAuth 2.0 authorization URL;
  // otherwise return the local instant-authorize callback bridge so popup OAuth works out-of-the-box in preview.
  if (clientId && clientId.trim().length > 0) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId.trim(),
      redirect_uri: redirectUri,
      scope: 'openid profile email accounting.transactions accounting.contacts offline_access',
      state: `xero_ndis_${Date.now()}`
    });
    return NextResponse.json({
      url: `https://login.xero.com/identity/connect/authorize?${params.toString()}`,
      mode: 'live_xero_oauth',
      redirectUri
    });
  }

  return NextResponse.json({
    url: `${redirectUri}?code=xero_instant_auth_${Date.now()}&popup=1`,
    mode: 'bridge_oauth',
    redirectUri
  });
}
