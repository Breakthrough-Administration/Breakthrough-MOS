import { NextRequest, NextResponse } from 'next/server';
import { mintServiceAccountAccessToken } from '@/lib/googleServiceAccountAuth';
import { verifyAuthToken } from '@/lib/auth/verifySession';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SupportedWorkspaceService = 'drive' | 'gmail' | 'calendar' | 'contacts' | 'meet' | 'keep';

const SERVICE_BASE_URLS: Record<SupportedWorkspaceService, string> = {
  drive: 'https://www.googleapis.com/drive/v3',
  gmail: 'https://gmail.googleapis.com/gmail/v1',
  calendar: 'https://www.googleapis.com/calendar/v3',
  contacts: 'https://people.googleapis.com/v1',
  meet: 'https://meet.googleapis.com/v2',
  keep: 'https://keep.googleapis.com/v1'
};

/**
 * Resolves a valid Google OAuth2 Bearer token from the incoming request header
 * or mints a scoped server-side token using the protected service account credentials.
 * Sensitive private keys never leave the server.
 */
async function resolveWorkspaceBearerToken(req: NextRequest): Promise<{
  accessToken: string;
  source: 'client_oauth_bearer' | 'server_service_account';
}> {
  const authHeader = req.headers.get('x-workspace-access-token') || req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token && token !== 'null' && token !== 'undefined') {
      return { accessToken: token, source: 'client_oauth_bearer' };
    }
  }

  // Verify the caller is an authenticated session before falling back to server credentials
  const sessionUser = await verifyAuthToken(req);
  if (!sessionUser) {
    throw new Error('Unauthorized: Valid session or Google OAuth Bearer token is required.');
  }

  const minted = await mintServiceAccountAccessToken();
  return {
    accessToken: minted.accessToken,
    source: 'server_service_account'
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      service,
      endpointPath,
      method = 'GET',
      queryParams,
      payload
    }: {
      service: SupportedWorkspaceService;
      endpointPath: string;
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      queryParams?: Record<string, string | number | boolean | undefined>;
      payload?: unknown;
    } = body;

    if (!service || !SERVICE_BASE_URLS[service]) {
      return NextResponse.json(
        { error: 'Invalid or unsupported Google Workspace service specified.' },
        { status: 400 }
      );
    }

    // Prevent path traversal or external host injection
    const cleanPath = String(endpointPath || '').replace(/^\/+/, '');
    if (cleanPath.includes('..') || cleanPath.startsWith('http')) {
      return NextResponse.json(
        { error: 'Invalid endpoint path.' },
        { status: 400 }
      );
    }

    const { accessToken, source } = await resolveWorkspaceBearerToken(req);

    const baseUrl = SERVICE_BASE_URLS[service];
    const url = new URL(cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl);
    if (queryParams && typeof queryParams === 'object') {
      Object.entries(queryParams).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.set(key, String(val));
        }
      });
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    };

    const fetchOptions: RequestInit = {
      method,
      headers
    };

    if (payload !== undefined && method !== 'GET' && method !== 'DELETE') {
      headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(payload);
    }

    const upstreamRes = await fetch(url.toString(), fetchOptions);

    if (upstreamRes.status === 204) {
      return NextResponse.json({
        success: true,
        status: 204,
        authSource: source,
        data: null
      });
    }

    const responseData = await upstreamRes.json().catch(() => ({}));

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          success: false,
          status: upstreamRes.status,
          authSource: source,
          error:
            responseData?.error?.message ||
            responseData?.error_description ||
            `Google ${service} API returned HTTP ${upstreamRes.status}`,
          details: responseData?.error || null
        },
        { status: upstreamRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      status: upstreamRes.status,
      authSource: source,
      data: responseData
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Workspace proxy request failed.'
      },
      { status: 500 }
    );
  }
}
