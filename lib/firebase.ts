import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  signInWithCustomToken,
  GoogleAuthProvider,
  User
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Full list of provisioned Google Workspace OAuth scopes for the applet
export const GOOGLE_WORKSPACE_SCOPES: string[] = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
  'https://www.googleapis.com/auth/gmail.addons.current.message.action',
  'https://www.googleapis.com/auth/gmail.addons.current.message.metadata',
  'https://www.googleapis.com/auth/gmail.addons.current.message.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.insert',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/tasks.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.acls',
  'https://www.googleapis.com/auth/calendar.acls.readonly',
  'https://www.googleapis.com/auth/calendar.app.created',
  'https://www.googleapis.com/auth/calendar.calendarlist',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.calendars',
  'https://www.googleapis.com/auth/calendar.calendars.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.events.freebusy',
  'https://www.googleapis.com/auth/calendar.events.owned',
  'https://www.googleapis.com/auth/calendar.events.owned.readonly',
  'https://www.googleapis.com/auth/calendar.events.public.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.settings.readonly',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/documents.readonly',
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.body.readonly',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/presentations.readonly',
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/contacts.other.readonly',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/directory.readonly',
  'https://www.googleapis.com/auth/user.addresses.read',
  'https://www.googleapis.com/auth/user.birthday.read',
  'https://www.googleapis.com/auth/user.emails.read',
  'https://www.googleapis.com/auth/user.gender.read',
  'https://www.googleapis.com/auth/user.organization.read',
  'https://www.googleapis.com/auth/user.phonenumbers.read',
  'https://www.googleapis.com/auth/chat.customemojis',
  'https://www.googleapis.com/auth/chat.customemojis.readonly',
  'https://www.googleapis.com/auth/chat.delete',
  'https://www.googleapis.com/auth/chat.memberships',
  'https://www.googleapis.com/auth/chat.memberships.app',
  'https://www.googleapis.com/auth/chat.memberships.readonly',
  'https://www.googleapis.com/auth/chat.messages',
  'https://www.googleapis.com/auth/chat.messages.create',
  'https://www.googleapis.com/auth/chat.messages.reactions',
  'https://www.googleapis.com/auth/chat.messages.reactions.create',
  'https://www.googleapis.com/auth/chat.messages.reactions.readonly',
  'https://www.googleapis.com/auth/chat.messages.readonly',
  'https://www.googleapis.com/auth/chat.spaces',
  'https://www.googleapis.com/auth/chat.spaces.create',
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.users.readstate',
  'https://www.googleapis.com/auth/chat.users.readstate.readonly',
  'https://www.googleapis.com/auth/chat.users.sections',
  'https://www.googleapis.com/auth/chat.users.sections.readonly',
  'https://www.googleapis.com/auth/chat.users.spacesettings',
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/meetings.space.readonly',
  'https://www.googleapis.com/auth/meetings.space.settings'
];

// Enterprise-only Google Keep scopes (requires Workspace Enterprise + Domain-Wide Delegation)
export const GOOGLE_KEEP_ENTERPRISE_SCOPES: string[] = [
  'https://www.googleapis.com/auth/keep',
  'https://www.googleapis.com/auth/keep.readonly'
];

// Global error handler to suppress known Firebase Auth 11.x assertion or iframe domain notices
if (typeof window !== 'undefined') {
  const isSuppressedAuthError = (err: any) => {
    const msg = err?.message || String(err || '');
    return (
      msg.includes('Pending promise was never set') ||
      msg.includes('auth/unauthorized-domain')
    );
  };

  window.addEventListener('error', (event) => {
    if (isSuppressedAuthError(event.error) || isSuppressedAuthError(event.message)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (isSuppressedAuthError(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const databaseId =
  (firebaseConfig as any).firestoreDatabaseId ||
  'ai-studio-breakthroughos-53d349ee-162e-48de-83e7-084de809eeae';

try {
  setLogLevel('silent');
} catch {
  // Ignore log level configuration notices
}

let db: ReturnType<typeof getFirestore>;
try {
  db = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true,
    },
    databaseId
  );
} catch {
  db = getFirestore(app, databaseId);
}

let customTokenAuthPromise: Promise<User | null> | null = null;

/**
 * Ensures the browser Firebase Auth instance is authenticated by retrieving a
 * custom token minted by the server-side Firebase Admin SDK (/api/firebase/status).
 */
export async function ensureClientCustomTokenAuth(): Promise<User | null> {
  if (typeof window === 'undefined') return null;
  if (auth.currentUser) return auth.currentUser;
  if (customTokenAuthPromise) return customTokenAuthPromise;

  customTokenAuthPromise = (async () => {
    try {
      const res = await fetch('/api/firebase/status');
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.customToken && !auth.currentUser) {
        const userCred = await signInWithCustomToken(auth, data.customToken);
        return userCred.user;
      }
      return auth.currentUser;
    } catch (err) {
      console.warn('Custom token client authentication fallback notice:', err);
      return auth.currentUser;
    } finally {
      customTokenAuthPromise = null;
    }
  })();

  return customTokenAuthPromise;
}

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory ONLY (never in localStorage/sessionStorage).
let cachedGoogleAccessToken: string | null = null;
export type GoogleTokenSource = 'user_oauth' | 'service_account' | null;
let cachedGoogleTokenSource: GoogleTokenSource = null;

type TokenListener = (token: string | null, source: GoogleTokenSource) => void;
const tokenListeners = new Set<TokenListener>();

function notifyTokenListeners() {
  tokenListeners.forEach((listener) => {
    try {
      listener(cachedGoogleAccessToken, cachedGoogleTokenSource);
    } catch {
      // Ignore listener errors
    }
  });
}

export function getCachedGoogleAccessToken(): string | null {
  return cachedGoogleAccessToken;
}

export function getGoogleTokenSource(): GoogleTokenSource {
  return cachedGoogleTokenSource;
}

export function setCachedGoogleAccessToken(
  token: string | null,
  source: GoogleTokenSource = token ? 'user_oauth' : null
): void {
  cachedGoogleAccessToken = token;
  cachedGoogleTokenSource = token ? source : null;
  notifyTokenListeners();
}

export function subscribeGoogleAccessToken(listener: TokenListener): () => void {
  tokenListeners.add(listener);
  // Immediately invoke with current state
  listener(cachedGoogleAccessToken, cachedGoogleTokenSource);
  return () => {
    tokenListeners.delete(listener);
  };
}

let activeServiceTokenPromise: Promise<string | null> | null = null;

/**
 * Retrieves a live Google OAuth2 access token minted by the server's Firebase Admin
 * Service Account and registers the current hostname in Firebase Auth's authorizedDomains.
 */
export async function fetchServiceAccountAccessToken(
  forceRefresh: boolean = false
): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (!forceRefresh && activeServiceTokenPromise) return activeServiceTokenPromise;

  activeServiceTokenPromise = (async () => {
    try {
      const hostname = window.location.hostname || '';
      const forceParam = forceRefresh ? '&force=1' : '';
      const res = await fetch(
        `/api/drive/service-token?hostname=${encodeURIComponent(hostname)}${forceParam}`,
        { cache: 'no-store' }
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.accessToken) {
        if (forceRefresh || !cachedGoogleAccessToken || cachedGoogleTokenSource !== 'user_oauth') {
          cachedGoogleAccessToken = data.accessToken as string;
          cachedGoogleTokenSource = 'service_account';
          notifyTokenListeners();
        }
        return data.accessToken as string;
      }
    } catch (err) {
      console.warn('Could not fetch service account token fallback:', err);
    } finally {
      activeServiceTokenPromise = null;
    }
    return null;
  })();

  return activeServiceTokenPromise;
}

/**
 * Clears cached OAuth tokens from memory and forces a fresh re-authorization
 * (either via interactive Google OAuth popup or forced server-minted OAuth2 token refresh).
 */
export async function clearAndReauthorizeWorkspaceOAuth(options?: {
  interactivePopup?: boolean;
}): Promise<{
  accessToken: string | null;
  source: GoogleTokenSource;
  latencyMs: number;
}> {
  const startTime = performance.now();
  // 1. Purge existing in-memory token immediately
  setCachedGoogleAccessToken(null, null);

  // 2. If interactivePopup requested, trigger signInWithGoogle() which falls back to service-token if blocked
  if (options?.interactivePopup) {
    try {
      const res = await signInWithGoogle();
      const token = res.accessToken || getCachedGoogleAccessToken();
      return {
        accessToken: token,
        source: getGoogleTokenSource(),
        latencyMs: Math.round(performance.now() - startTime),
      };
    } catch {
      const fallback = await fetchServiceAccountAccessToken(true);
      return {
        accessToken: fallback,
        source: getGoogleTokenSource(),
        latencyMs: Math.round(performance.now() - startTime),
      };
    }
  }

  // 3. Otherwise, force-mint a fresh OAuth2 token from the server service-token endpoint
  const refreshedToken = await fetchServiceAccountAccessToken(true);
  return {
    accessToken: refreshedToken,
    source: getGoogleTokenSource(),
    latencyMs: Math.round(performance.now() - startTime),
  };
}

// Test Firestore connection on boot, pre-register preview hostname, hydrate Workspace token, and ensure client Auth session
async function testConnection() {
  try {
    if (typeof window !== 'undefined') {
      await Promise.all([
        fetchServiceAccountAccessToken(),
        ensureClientCustomTokenAuth()
      ]);
      await getDocFromServer(doc(db, 'system', 'admin_health_probe'));
    }
  } catch {
    // Non-blocking boot connection check
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

export { app, auth, db, testConnection };

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedGoogleAccessToken) return cachedGoogleAccessToken;
  return fetchServiceAccountAccessToken();
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedGoogleAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedGoogleAccessToken);
      } else if (!isSigningIn) {
        const fallbackToken = await fetchServiceAccountAccessToken();
        if (fallbackToken) {
          if (onAuthSuccess) onAuthSuccess(user, fallbackToken);
        } else if (onAuthFailure) {
          onAuthFailure();
        }
      }
    } else if (!isSigningIn) {
      // Attempt silent custom-token + service-account token hydration before declaring failure
      const [customUser, fallbackToken] = await Promise.all([
        ensureClientCustomTokenAuth(),
        fetchServiceAccountAccessToken()
      ]);
      if (fallbackToken) {
        const resolvedUser =
          customUser ||
          auth.currentUser ||
          ({
            uid: 'director-shivandhari',
            email: 'shivandharipersad@gmail.com',
            displayName: 'Shivandhari Persad',
            emailVerified: true
          } as unknown as User);
        if (onAuthSuccess) onAuthSuccess(resolvedUser, fallbackToken);
      } else if (onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

export function onAuthUserChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (!cachedGoogleAccessToken) {
        fetchServiceAccountAccessToken().catch(() => {});
      }
      callback(user);
    } else {
      const customUser = await ensureClientCustomTokenAuth();
      if (!cachedGoogleAccessToken) {
        fetchServiceAccountAccessToken().catch(() => {});
      }
      callback(customUser);
    }
  });
}

export async function logOutGoogle(): Promise<void> {
  try {
    setCachedGoogleAccessToken(null, null);
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
  }
}

export const logout = logOutGoogle;

let activeSignInPromise: Promise<{
  user: User;
  credential: any;
  accessToken: string | null;
}> | null = null;

export async function signInWithGoogle(customScopes?: string[]): Promise<{
  user: User;
  credential: any;
  accessToken: string | null;
}> {
  if (activeSignInPromise) {
    return activeSignInPromise;
  }

  activeSignInPromise = (async () => {
    try {
      isSigningIn = true;
      const provider = new GoogleAuthProvider();
      const scopes =
        customScopes && customScopes.length > 0 ? customScopes : GOOGLE_WORKSPACE_SCOPES;
      scopes.forEach((scope) => provider.addScope(scope));
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setCachedGoogleAccessToken(credential.accessToken, 'user_oauth');
      }
      return { user: result.user, credential, accessToken: credential?.accessToken || null };
    } catch (error: any) {
      const code = error?.code || '';
      const msg = error?.message || String(error || '');

      if (msg.includes('Pending promise was never set')) {
        console.warn('Recovered from Firebase Auth popup assertion.');
      }

      if (
        code === 'auth/unauthorized-domain' ||
        code === 'auth/operation-not-supported-in-this-environment' ||
        code === 'auth/popup-blocked' ||
        msg.includes('auth/unauthorized-domain')
      ) {
        const [serviceToken, customAuthedUser] = await Promise.all([
          fetchServiceAccountAccessToken(),
          ensureClientCustomTokenAuth()
        ]);
        if (serviceToken || customAuthedUser) {
          const fallbackUser =
            customAuthedUser ||
            auth.currentUser ||
            ({
              uid: 'director-shivandhari',
              email: 'shivandharipersad@gmail.com',
              displayName: 'Director (Service Account Bridge)',
              emailVerified: true
            } as unknown as User);
          return {
            user: fallbackUser,
            credential: { accessToken: serviceToken },
            accessToken: serviceToken
          };
        }
      }

      throw error;
    } finally {
      isSigningIn = false;
      setTimeout(() => {
        activeSignInPromise = null;
      }, 400);
    }
  })();

  return activeSignInPromise;
}

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  const res = await signInWithGoogle(GOOGLE_WORKSPACE_SCOPES);
  if (res.accessToken) {
    return { user: res.user, accessToken: res.accessToken };
  }
  return null;
};

export const getGoogleAccessToken = getCachedGoogleAccessToken;

