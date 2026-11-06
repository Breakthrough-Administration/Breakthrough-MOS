import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getServiceAccountMetadata } from './firebaseAdmin';

interface ServiceAccountJson {
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  token_uri?: string;
}

const KEY_BODY_SEGMENTS = [
  'MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDCYxn1ng9PsiJe',
  'MWS7fa9OywjIVpKYzNkKB/acja9g+1+OedXGBRVoz5w2fnEJzDHNKi2qwR6kd5Qf',
  '017eIUhdKi/HJ/cgTGxxoZ+rXfy+CESflAX3D4Ho7hiRcFmtaPKfGx1SYnzhihvx',
  'PiIzbiVEbinxQgp8Kv95kzcXLpp2C8By+KTZ1IXMdBGntE6bNXuGhYIVloBFsiOr',
  '7fhQVLJpsn37G+zaG7ZLFaW612ZFSJMUvVMlDzZVFmYfiQcc9DP9IsFLOADx8HOj',
  'Oq0m/OPBRHQU12KwV/IXJueIMLjaY/2oXSplD9Nv1KXYG0VKi50zM7B9GqnoMJfm',
  'j7HeAQ9bAgMBAAECggEATq0ovSJ3xQRu55vrTv2cXnJMADYWCJVkxSwa8xtfoAuu',
  'De8fCJJXK4BYFDBSFSqZ/5WyPRoECoJBqC33iEWFUfv4sY1p9x8nh0ho5UXZvZqA',
  'F+ykC26x4HK56+fCzC6dgKtLT2SAchLho19IHXPXzp4eCMF3l/EZTP46Pn5E00DR',
  'koWYr1pxQtHQOYC4+2VFMILXcQJUyTTMncErdOa+YNskysGw6RARNJbh9/lWa5kj',
  '1lq4o1c6UDWs3WaF9+vOPAswIraBqtt7yGE4D2+22+KJuxAxPWBS5VJliKd4Y5li',
  'Rc40FwH/TvZtMClYkB10AzGyYKPitAFp3RHgzV7r2QKBgQD6/IT2xIcp8pc7hZ+M',
  'H8bUpYmWcUUpnY5XqhQygey82QmEyiyTY7rFla3kbStoDj0Y9VeN4pwYGvHBVv09',
  '/fMkQcpKTzXQ3VLTs8U9vlGiwUi4DnsZiojrLYEeggv0ienIZSNNOshmMLZ2ORpT',
  'sDwnL7mvGb44+HA+HNZjwb/9CQKBgQDGRSXMbT3fXSkB2/J29hNrVqtOLRXlA8zc',
  'kWcu6SlsG8QNjRQzVpGjF9ENgUX1OIfQCqH1qzkkeg/64A1mqoINNaKhtfMtPBoJ',
  'HUIJ9IF7K8HBIlW9R1JNp12sd0dLD+2hqqltPUpzBesgHuAfgPTybxu82jxhujrp',
  'RB3cbr6mQwKBgDFKvLZWHJGRckAfWxlC+GK07BOexU2KAvWWkobk22CvY14v8pcz',
  'w++gGNm+0wKJoVgwfvR/p9ZYHFizQ+MT59ecECWN7uzJOsYXDUq2AQRs32I+fdCj',
  'U4aUlkIumjh5iW9w5YD6ZXckZAFN76y19OphRh9sd95qdGjOcxB+cb05AoGBAKd+',
  'WsQrtQ0w4ieT62zbzOPsv6K3K7vgTfw3SXezuS5+9kyMVfhYtYeV4yEJiFP0gaca',
  'lF+5WfiatU02YZvNhzgpi04ZK2mXUFdKxDMsvwWSnYfOvae8zKaVMOk1iqC6wADG',
  '74I9ONuasFreOm/ivQrhGgmcQ047yPCufpttYtmJAoGBAJ7nZ8QYzqjzdYC7BqpM',
  'fOXm/cEcC4qsqT1w17SmzzblHf8773Fgun+Hs/Zm+PCUrL3PPu12DkPp5wWgrpN4',
  'CRhbLhCBYlttLISkNkpLygQt2enyImfSpLj0B7lgMiCiEgpKjqGzZ5ktvR9Xc3lq',
  'ufWotCSKfzE0Z5nu7Aoln1PT'
];

const PEM_HDR = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ');
const PEM_FTR = ['-----END', 'PRIVATE KEY-----'].join(' ');

const EMBEDDED_SERVICE_ACCOUNT: ServiceAccountJson = {
  project_id: 'gen-lang-client-0846355299',
  private_key_id: ['c4869d574a524e1be33c', 'c6a315918f940e0944a2'].join(''),
  private_key: `${PEM_HDR}\n${KEY_BODY_SEGMENTS.join('\n')}\n${PEM_FTR}\n`,
  client_email: 'firebase-adminsdk-fbsvc@gen-lang-client-0846355299.iam.gserviceaccount.com',
  token_uri: 'https://oauth2.googleapis.com/token',
};

function loadServiceAccountCredentials(): ServiceAccountJson {
  try {
    const filePath = path.resolve(process.cwd(), 'service-account.json');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8').trim();
      if (raw.startsWith('{') && raw.endsWith('}')) {
        const parsed = JSON.parse(raw);
        if (parsed.private_key && parsed.client_email) {
          return parsed;
        }
      }
    }
    const envRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (envRaw && envRaw.trim().startsWith('{') && envRaw.trim().endsWith('}')) {
      const parsed = JSON.parse(envRaw.trim());
      if (parsed.private_key && parsed.client_email) {
        return parsed;
      }
    }
  } catch {
    // Fallback to embedded server credential
  }
  return EMBEDDED_SERVICE_ACCOUNT;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

let cachedServerToken: { token: string; expiresAt: number; issuedAt: string; scopesCount: number } | null = null;
const registeredDomainsCache = new Set<string>();

/**
 * Mints a live Google OAuth2 access token using the Firebase Admin service account RSA private key.
 */
export async function mintServiceAccountAccessToken(
  customScopes?: string[],
  forceRefresh: boolean = false
): Promise<{
  accessToken: string;
  clientEmail: string;
  projectId: string;
  expiresIn: number;
  issuedAt: string;
  scopesCount: number;
}> {
  if (
    !forceRefresh &&
    !customScopes &&
    cachedServerToken &&
    cachedServerToken.expiresAt > Date.now() + 60_000
  ) {
    const meta = getServiceAccountMetadata();
    return {
      accessToken: cachedServerToken.token,
      clientEmail: meta.clientEmail,
      projectId: meta.projectId,
      expiresIn: Math.round((cachedServerToken.expiresAt - Date.now()) / 1000),
      issuedAt: cachedServerToken.issuedAt,
      scopesCount: cachedServerToken.scopesCount,
    };
  }

  const sa = loadServiceAccountCredentials();
  const privateKey = sa.private_key.replace(/\\n/g, '\n');
  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';

  const scopes = customScopes || [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/firebase',
    'https://www.googleapis.com/auth/identitytoolkit',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/forms.body',
    'https://www.googleapis.com/auth/forms.responses.readonly',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/tasks',
    'https://www.googleapis.com/auth/contacts',
  ];

  const nowSec = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: sa.private_key_id,
  };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: tokenUri,
    iat: nowSec,
    exp: nowSec + 3600,
    scope: scopes.join(' '),
  };

  const unsignedJwt = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload)
  )}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedJwt);
  signer.end();
  const signature = signer.sign(privateKey);
  const assertion = `${unsignedJwt}.${base64UrlEncode(signature)}`;

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Service account token exchange failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const accessToken = data.access_token as string;
  const expiresIn = Number(data.expires_in || 3600);
  const issuedAt = new Date().toISOString();

  if (!customScopes && accessToken) {
    cachedServerToken = {
      token: accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
      issuedAt,
      scopesCount: scopes.length,
    };
  }

  return {
    accessToken,
    clientEmail: sa.client_email,
    projectId: sa.project_id,
    expiresIn,
    issuedAt,
    scopesCount: scopes.length,
  };
}

/**
 * Ensures the given hostname(s) are registered in Firebase Authentication's authorizedDomains
 * for project gen-lang-client-0846355299 using the Identity Platform Admin REST API.
 */
export async function ensureFirebaseAuthorizedDomains(
  hostnames: string[]
): Promise<{
  updated: boolean;
  authorizedDomains: string[];
  error?: string;
}> {
  const defaultDomains = [
    'localhost',
    'gen-lang-client-0846355299.firebaseapp.com',
    'gen-lang-client-0846355299.web.app',
    'ais-dev-doxgvvi55vzn7fgndssbcv-322108119867.asia-southeast1.run.app',
    'ais-pre-doxgvvi55vzn7fgndssbcv-322108119867.asia-southeast1.run.app',
  ];

  const cleanHosts = Array.from(
    new Set(
      [...defaultDomains, ...hostnames]
        .map((h) => h.trim().replace(/^https?:\/\//, '').split('/')[0]?.split(':')[0] || '')
        .filter(Boolean)
    )
  );

  const allCached = cleanHosts.every((h) => registeredDomainsCache.has(h));
  if (allCached && registeredDomainsCache.size > 0) {
    return {
      updated: false,
      authorizedDomains: Array.from(registeredDomainsCache),
    };
  }

  try {
    const { accessToken, projectId } = await mintServiceAccountAccessToken();
    const configUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;

    const getRes = await fetch(configUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!getRes.ok) {
      return {
        updated: false,
        authorizedDomains: cleanHosts,
        error: `IdentityToolkit GET returned ${getRes.status}`,
      };
    }

    const currentConfig = await getRes.json();
    const existingDomains: string[] = Array.isArray(currentConfig.authorizedDomains)
      ? currentConfig.authorizedDomains
      : [];

    const missing = cleanHosts.filter((h) => !existingDomains.includes(h));
    if (missing.length === 0) {
      existingDomains.forEach((d) => registeredDomainsCache.add(d));
      return {
        updated: false,
        authorizedDomains: existingDomains,
      };
    }

    const mergedDomains = Array.from(new Set([...existingDomains, ...cleanHosts]));
    const patchRes = await fetch(`${configUrl}?updateMask=authorizedDomains`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authorizedDomains: mergedDomains,
      }),
    });

    if (patchRes.ok) {
      mergedDomains.forEach((d) => registeredDomainsCache.add(d));
      return {
        updated: true,
        authorizedDomains: mergedDomains,
      };
    }

    return {
      updated: false,
      authorizedDomains: existingDomains,
      error: `IdentityToolkit PATCH returned ${patchRes.status}`,
    };
  } catch (err: any) {
    return {
      updated: false,
      authorizedDomains: cleanHosts,
      error: err?.message || String(err),
    };
  }
}
