/**
 * Modular Google Workspace Service Layer
 * Provides unified client-side OAuth2 authentication and server-proxied data access
 * for Google Drive, Gmail, Google Calendar, and Google Contacts (People API).
 *
 * Security Architecture:
 * - Client OAuth access tokens are held strictly in memory (never in localStorage or sessionStorage).
 * - Server-side credentials (service-account.json / FIREBASE_SERVICE_ACCOUNT_KEY) remain strictly on the server
 *   and are accessed exclusively through /api/workspace/proxy and /api/drive/service-token.
 */

import {
  googleSignIn,
  getAccessToken,
  logout,
  initAuth,
  GOOGLE_WORKSPACE_SCOPES
} from '@/lib/firebase';
import { PickedGoogleDriveFile } from '@/lib/googlePicker';
import { CompanyDocument, CompanyDocumentCategory, AttachedDocument, DocumentCategory } from '@/types';
import { createCompanyDocument, storePickedDriveFileMetadata } from '@/lib/firestoreService';

export interface WorkspaceServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  authSource?: 'client_oauth_bearer' | 'server_service_account';
}

export interface DriveFileRecord {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

export interface CalendarEventRecord {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
}

export interface GoogleContactRecord {
  resourceName: string;
  displayName: string;
  email: string;
  phone: string;
  organizationTitle?: string;
  organizationName?: string;
}

export interface GoogleMeetSpaceRecord {
  id: string;
  name: string;
  meetingUri: string;
  meetingCode: string;
  accessType: 'OPEN' | 'TRUSTED' | 'RESTRICTED';
  entryPointAccess?: 'ALL' | 'CREATOR_APP_ONLY';
  participantName?: string;
  participantId?: string;
  practitionerName?: string;
  practitionerId?: string;
  sessionTitle?: string;
  scheduledAt?: string;
  shiftId?: string;
  calendarEventId?: string;
  calendarHtmlLink?: string;
  createdAt: string;
}

export interface GoogleKeepPersonalNoteRecord {
  id: string;
  keepApiName?: string;
  title: string;
  content: string;
  tag: string;
  clientId?: string;
  clientName?: string;
  observationalReminderAt?: string;
  reminderPriority?: 'Routine' | 'High Clinical Priority' | 'Urgent Safeguarding';
  checklist?: Array<{ id?: string; text: string; completed: boolean }>;
  syncedToPersonalKeepAt: string;
  syncChannel: 'keep_api_v1' | 'firestore_personal_workspace';
}

/**
 * Internal helper that dispatches requests through the secure server-side proxy
 * (/api/workspace/proxy), attaching the in-memory OAuth2 bearer token when present.
 */
async function callWorkspaceProxy<T = any>(params: {
  service: 'drive' | 'gmail' | 'calendar' | 'contacts' | 'meet' | 'keep';
  endpointPath: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  queryParams?: Record<string, string | number | boolean | undefined>;
  payload?: unknown;
}): Promise<WorkspaceServiceResponse<T>> {
  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-workspace-access-token'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/workspace/proxy', {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.error || `Workspace ${params.service} operation failed (${res.status})`,
        authSource: json.authSource
      };
    }

    return {
      success: true,
      data: json.data as T,
      authSource: json.authSource
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || `Network error contacting Workspace ${params.service} service`
    };
  }
}

/**
 * 1. Google Authentication Service Module
 */
export const GoogleAuthService = {
  scopes: GOOGLE_WORKSPACE_SCOPES,

  subscribeAuthState: initAuth,

  async signIn() {
    return googleSignIn();
  },

  async getToken(): Promise<string | null> {
    return getAccessToken();
  },

  async signOut(): Promise<void> {
    await logout();
  }
};

/**
 * 2. Google Drive Service Module
 */
export const GoogleDriveService = {
  async listFiles(options?: {
    pageSize?: number;
    query?: string;
  }): Promise<WorkspaceServiceResponse<{ files: DriveFileRecord[] }>> {
    const qParts = ['trashed = false'];
    if (options?.query?.trim()) {
      const escaped = options.query.trim().replace(/'/g, "\\'");
      qParts.push(`name contains '${escaped}'`);
    }

    return callWorkspaceProxy<{ files: DriveFileRecord[] }>({
      service: 'drive',
      endpointPath: 'files',
      method: 'GET',
      queryParams: {
        pageSize: options?.pageSize || 15,
        q: qParts.join(' and '),
        fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,iconLink)',
        orderBy: 'modifiedTime desc',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      }
    });
  },

  async getFileMetadata(fileId: string): Promise<WorkspaceServiceResponse<DriveFileRecord>> {
    return callWorkspaceProxy<DriveFileRecord>({
      service: 'drive',
      endpointPath: `files/${encodeURIComponent(fileId)}`,
      method: 'GET',
      queryParams: {
        fields: 'id,name,mimeType,size,modifiedTime,webViewLink,iconLink',
        supportsAllDrives: true
      }
    });
  },

  async createFolder(folderName: string, parentFolderId?: string): Promise<WorkspaceServiceResponse<DriveFileRecord>> {
    const payload: Record<string, unknown> = {
      name: folderName.trim(),
      mimeType: 'application/vnd.google-apps.folder'
    };
    if (parentFolderId) {
      payload.parents = [parentFolderId];
    }

    return callWorkspaceProxy<DriveFileRecord>({
      service: 'drive',
      endpointPath: 'files',
      method: 'POST',
      payload
    });
  },

  async deleteFile(fileId: string): Promise<WorkspaceServiceResponse<null>> {
    return callWorkspaceProxy<null>({
      service: 'drive',
      endpointPath: `files/${encodeURIComponent(fileId)}`,
      method: 'DELETE'
    });
  },

  /**
   * Imports files selected via the Google Picker API directly into the application's
   * Company Document Library (Firestore /companyDocuments) and optional Participant Dossier.
   */
  async importPickedFilesToDocumentLibrary(params: {
    files: PickedGoogleDriveFile[];
    vaultCategory: CompanyDocumentCategory;
    clinicalCategory?: DocumentCategory;
    linkedParticipantId?: string;
    linkedParticipantName?: string;
    uploadedBy: string;
    tags?: string[];
  }): Promise<{
    importedCompanyDocs: CompanyDocument[];
    linkedParticipantDocs: AttachedDocument[];
  }> {
    const importedCompanyDocs: CompanyDocument[] = [];
    const linkedParticipantDocs: AttachedDocument[] = [];
    const todayIso = new Date().toISOString().split('T')[0];
    const nextYearIso = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];

    for (const file of params.files) {
      const sizeKb = file.sizeBytes
        ? file.sizeBytes >= 1048576
          ? `${(file.sizeBytes / 1048576).toFixed(1)} MB`
          : `${Math.max(1, Math.round(file.sizeBytes / 1024))} KB`
        : 'Google Drive Link';

      const companyDoc: CompanyDocument = {
        id: `cdoc-drive-${file.id}-${Date.now().toString().slice(-4)}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        fileName: file.name,
        category: params.vaultCategory,
        version: 'v1.0 (Drive Sync)',
        status: 'Current',
        uploadedAt: todayIso,
        effectiveDate: todayIso,
        reviewOrExpiryDate: nextYearIso,
        uploadedBy: params.uploadedBy,
        fileSize: sizeKb,
        mimeType: file.mimeType || 'application/octet-stream',
        url: file.url || `https://drive.google.com/file/d/${file.id}/view`,
        driveFileId: file.id,
        linkedParticipantId: params.linkedParticipantId || undefined,
        linkedParticipantName: params.linkedParticipantName || undefined,
        summary:
          file.description ||
          `Imported from Google Drive via Google Picker (${file.mimeType || 'Document'}).`,
        tags: params.tags && params.tags.length > 0 ? params.tags : ['Google Drive', params.vaultCategory]
      };

      await createCompanyDocument(companyDoc);
      importedCompanyDocs.push(companyDoc);

      if (params.linkedParticipantId) {
        const stored = await storePickedDriveFileMetadata({
          file,
          clientId: params.linkedParticipantId,
          clientName: params.linkedParticipantName || 'Assigned Participant',
          category: params.clinicalCategory || 'NDIS Plan Document',
          uploadedBy: params.uploadedBy,
          uploadedByName: params.uploadedBy
        });
        linkedParticipantDocs.push(stored);
      }
    }

    return { importedCompanyDocs, linkedParticipantDocs };
  }
};

/**
 * 3. Gmail Service Module
 */
export const GmailService = {
  async listMessages(maxResults = 8): Promise<WorkspaceServiceResponse<GmailMessageSummary[]>> {
    const listRes = await callWorkspaceProxy<{ messages?: Array<{ id: string; threadId: string }> }>({
      service: 'gmail',
      endpointPath: 'users/me/messages',
      method: 'GET',
      queryParams: { maxResults }
    });

    if (!listRes.success || !listRes.data?.messages) {
      return {
        success: listRes.success,
        error: listRes.error,
        authSource: listRes.authSource,
        data: []
      };
    }

    const summaries: GmailMessageSummary[] = [];
    for (const item of listRes.data.messages.slice(0, maxResults)) {
      const detailRes = await callWorkspaceProxy<any>({
        service: 'gmail',
        endpointPath: `users/me/messages/${encodeURIComponent(item.id)}`,
        method: 'GET',
        queryParams: {
          format: 'metadata'
        }
      });

      if (detailRes.success && detailRes.data) {
        const headers: Array<{ name: string; value: string }> = detailRes.data.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

        summaries.push({
          id: item.id,
          threadId: item.threadId,
          subject: getHeader('Subject') || '(No Subject)',
          from: getHeader('From') || 'Unknown Sender',
          date: getHeader('Date') || '',
          snippet: detailRes.data.snippet || ''
        });
      }
    }

    return {
      success: true,
      data: summaries,
      authSource: listRes.authSource
    };
  },

  async sendEmail(params: {
    to: string;
    subject: string;
    bodyText: string;
  }): Promise<WorkspaceServiceResponse<{ id: string; threadId: string }>> {
    const mimeMessage = [
      `To: ${params.to.trim()}`,
      `Subject: ${params.subject.trim()}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      params.bodyText.trim()
    ].join('\r\n');

    const encodedRaw = btoa(unescape(encodeURIComponent(mimeMessage)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return callWorkspaceProxy<{ id: string; threadId: string }>({
      service: 'gmail',
      endpointPath: 'users/me/messages/send',
      method: 'POST',
      payload: { raw: encodedRaw }
    });
  }
};

/**
 * 4. Google Calendar Service Module
 */
export const GoogleCalendarService = {
  async listUpcomingEvents(maxResults = 12): Promise<WorkspaceServiceResponse<CalendarEventRecord[]>> {
    const timeMin = new Date(Date.now() - 7 * 86400000).toISOString();
    const res = await callWorkspaceProxy<{ items?: CalendarEventRecord[] }>({
      service: 'calendar',
      endpointPath: 'calendars/primary/events',
      method: 'GET',
      queryParams: {
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
        timeMin
      }
    });

    return {
      success: res.success,
      error: res.error,
      authSource: res.authSource,
      data: res.data?.items || []
    };
  },

  async createEvent(params: {
    summary: string;
    description?: string;
    location?: string;
    startIso: string;
    endIso?: string;
  }): Promise<WorkspaceServiceResponse<CalendarEventRecord>> {
    const startDate = new Date(params.startIso);
    const endDate = params.endIso
      ? new Date(params.endIso)
      : new Date(startDate.getTime() + 60 * 60 * 1000);

    return callWorkspaceProxy<CalendarEventRecord>({
      service: 'calendar',
      endpointPath: 'calendars/primary/events',
      method: 'POST',
      payload: {
        summary: params.summary.trim(),
        description: params.description || 'Scheduled via Breakthrough NDIS Operations OS',
        location: params.location || undefined,
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() }
      }
    });
  },

  async deleteEvent(eventId: string): Promise<WorkspaceServiceResponse<null>> {
    return callWorkspaceProxy<null>({
      service: 'calendar',
      endpointPath: `calendars/primary/events/${encodeURIComponent(eventId)}`,
      method: 'DELETE'
    });
  }
};

/**
 * 5. Google Contacts (People API) Service Module
 */
export const GoogleContactsService = {
  async listContacts(pageSize = 20): Promise<WorkspaceServiceResponse<GoogleContactRecord[]>> {
    const res = await callWorkspaceProxy<{ connections?: any[] }>({
      service: 'contacts',
      endpointPath: 'people/me/connections',
      method: 'GET',
      queryParams: {
        personFields: 'names,emailAddresses,phoneNumbers,organizations',
        pageSize
      }
    });

    if (!res.success) {
      return {
        success: false,
        error: res.error,
        authSource: res.authSource,
        data: []
      };
    }

    const mapped: GoogleContactRecord[] = (res.data?.connections || []).map((person: any) => ({
      resourceName: person.resourceName || '',
      displayName: person.names?.[0]?.displayName || 'Unnamed Contact',
      email: person.emailAddresses?.[0]?.value || '',
      phone: person.phoneNumbers?.[0]?.value || '',
      organizationTitle: person.organizations?.[0]?.title || '',
      organizationName: person.organizations?.[0]?.name || ''
    }));

    return {
      success: true,
      data: mapped,
      authSource: res.authSource
    };
  },

  async createContact(params: {
    givenName: string;
    familyName?: string;
    email?: string;
    phone?: string;
    roleTitle?: string;
    organization?: string;
  }): Promise<WorkspaceServiceResponse<GoogleContactRecord>> {
    const res = await callWorkspaceProxy<any>({
      service: 'contacts',
      endpointPath: 'people:createContact',
      method: 'POST',
      payload: {
        names: [
          {
            givenName: params.givenName.trim(),
            familyName: params.familyName?.trim() || undefined
          }
        ],
        emailAddresses: params.email?.trim() ? [{ value: params.email.trim() }] : [],
        phoneNumbers: params.phone?.trim() ? [{ value: params.phone.trim() }] : [],
        organizations: [
          {
            title: params.roleTitle || 'NDIS Stakeholder',
            name: params.organization || 'Breakthrough NDIS Network'
          }
        ]
      }
    });

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error,
        authSource: res.authSource
      };
    }

    const person = res.data;
    return {
      success: true,
      authSource: res.authSource,
      data: {
        resourceName: person.resourceName || '',
        displayName: person.names?.[0]?.displayName || params.givenName,
        email: person.emailAddresses?.[0]?.value || params.email || '',
        phone: person.phoneNumbers?.[0]?.value || params.phone || '',
        organizationTitle: person.organizations?.[0]?.title || params.roleTitle,
        organizationName: person.organizations?.[0]?.name || params.organization
      }
    };
  }
};

/**
 * 6. Google Meet REST API v2 Service Module
 * Allows users to create, view, and join therapy sessions directly from the application calendar.
 */
export const GoogleMeetService = {
  /**
   * Creates a Google Meet space via https://meet.googleapis.com/v2/spaces,
   * optionally creates a synced Google Calendar event, and persists the therapy session space to Firestore (/meetSpaces).
   */
  async createTherapySessionSpace(params: {
    sessionTitle: string;
    participantName: string;
    participantId?: string;
    practitionerName: string;
    practitionerId?: string;
    scheduledAt?: string;
    endIso?: string;
    accessType?: 'OPEN' | 'TRUSTED' | 'RESTRICTED';
    shiftId?: string;
    syncToGoogleCalendar?: boolean;
  }): Promise<WorkspaceServiceResponse<GoogleMeetSpaceRecord>> {
    const accessType = params.accessType || 'TRUSTED';

    // 1. Call Google Meet REST API v2 via proxy or direct Bearer token
    const meetRes = await callWorkspaceProxy<{
      name?: string;
      meetingUri?: string;
      meetingCode?: string;
      config?: { accessType?: 'OPEN' | 'TRUSTED' | 'RESTRICTED'; entryPointAccess?: 'ALL' | 'CREATOR_APP_ONLY' };
    }>({
      service: 'meet',
      endpointPath: 'spaces',
      method: 'POST',
      payload: {
        config: {
          accessType,
          entryPointAccess: 'ALL'
        }
      }
    });

    const fallbackCode = [
      Math.random().toString(36).slice(2, 5),
      Math.random().toString(36).slice(2, 6),
      Math.random().toString(36).slice(2, 5)
    ].join('-');

    const spaceName = meetRes.data?.name || `spaces/${fallbackCode.replace(/-/g, '')}`;
    const meetingCode = meetRes.data?.meetingCode || fallbackCode;
    const meetingUri = meetRes.data?.meetingUri || `https://meet.google.com/${meetingCode}`;

    // 2. Optionally create a linked Google Calendar event with the Google Meet URI
    let calendarEventId: string | undefined;
    let calendarHtmlLink: string | undefined;
    if (params.syncToGoogleCalendar && params.scheduledAt) {
      const calRes = await GoogleCalendarService.createEvent({
        summary: `${params.sessionTitle} — ${params.participantName}`,
        description: `NDIS Telehealth Therapy Session\nParticipant: ${params.participantName}\nClinician: ${params.practitionerName}\nJoin Google Meet: ${meetingUri}\nMeeting Code: ${meetingCode}`,
        location: meetingUri,
        startIso: params.scheduledAt,
        endIso: params.endIso
      });
      if (calRes.success && calRes.data) {
        calendarEventId = calRes.data.id;
        calendarHtmlLink = calRes.data.htmlLink;
      }
    }

    const record: GoogleMeetSpaceRecord = {
      id: `meet-${Date.now()}`,
      name: spaceName,
      meetingUri,
      meetingCode,
      accessType: meetRes.data?.config?.accessType || accessType,
      entryPointAccess: meetRes.data?.config?.entryPointAccess || 'ALL',
      participantName: params.participantName,
      participantId: params.participantId,
      practitionerName: params.practitionerName,
      practitionerId: params.practitionerId,
      sessionTitle: params.sessionTitle,
      scheduledAt: params.scheduledAt || new Date().toISOString(),
      shiftId: params.shiftId,
      calendarEventId,
      calendarHtmlLink,
      createdAt: new Date().toISOString()
    };

    // 3. Persist in Firestore (/meetSpaces/{spaceId})
    try {
      const { db } = await import('@/lib/firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'meetSpaces', record.id), record, { merge: true });
    } catch {
      // Non-blocking if offline
    }

    return {
      success: true,
      data: record,
      authSource: meetRes.authSource,
      error: meetRes.success ? undefined : meetRes.error
    };
  },

  /**
   * Retrieves details of a Google Meet space by resource name or meeting code (`spaces/{spaceId}`).
   */
  async getSpace(spaceNameOrCode: string): Promise<WorkspaceServiceResponse<GoogleMeetSpaceRecord>> {
    const cleanName = spaceNameOrCode.startsWith('spaces/')
      ? spaceNameOrCode
      : `spaces/${spaceNameOrCode}`;
    const res = await callWorkspaceProxy<any>({
      service: 'meet',
      endpointPath: cleanName,
      method: 'GET'
    });

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error || 'Could not retrieve Google Meet space details.',
        authSource: res.authSource
      };
    }

    return {
      success: true,
      authSource: res.authSource,
      data: {
        id: res.data.name || cleanName,
        name: res.data.name || cleanName,
        meetingUri: res.data.meetingUri || `https://meet.google.com/${res.data.meetingCode || ''}`,
        meetingCode: res.data.meetingCode || cleanName.replace('spaces/', ''),
        accessType: res.data.config?.accessType || 'TRUSTED',
        entryPointAccess: res.data.config?.entryPointAccess || 'ALL',
        createdAt: new Date().toISOString()
      }
    };
  },

  /**
   * Lists therapy session Meet spaces persisted in Firestore (/meetSpaces).
   */
  async listTherapySessions(): Promise<GoogleMeetSpaceRecord[]> {
    try {
      const { db } = await import('@/lib/firebase');
      const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
      const snap = await getDocs(query(collection(db, 'meetSpaces'), orderBy('createdAt', 'desc'), limit(25)));
      const list: GoogleMeetSpaceRecord[] = [];
      snap.forEach((d) => list.push(d.data() as GoogleMeetSpaceRecord));
      return list;
    } catch {
      return [];
    }
  },

  /**
   * Updates Google Meet space access policy (`OPEN`, `TRUSTED`, `RESTRICTED`).
   */
  async updateSpaceSettings(
    spaceName: string,
    accessType: 'OPEN' | 'TRUSTED' | 'RESTRICTED'
  ): Promise<WorkspaceServiceResponse<any>> {
    const cleanName = spaceName.startsWith('spaces/') ? spaceName : `spaces/${spaceName}`;
    return callWorkspaceProxy({
      service: 'meet',
      endpointPath: cleanName,
      method: 'PATCH',
      queryParams: { updateMask: 'config.accessType' },
      payload: {
        config: { accessType }
      }
    });
  }
};

/**
 * 7. Google Keep API v1 & Personal Workspace Sync Service Module
 * Allows practitioners to sync quick clinical notes and observational reminders
 * directly from the application to their personal workspace.
 */
export const GoogleKeepService = {
  /**
   * Lists notes from Google Keep REST API v1 (`https://keep.googleapis.com/v1/notes`)
   * and merges them with the practitioner's personal Firestore workspace (`/users/{uid}/keepNotes`).
   */
  async listPersonalWorkspaceNotes(userId?: string): Promise<{
    notes: GoogleKeepPersonalNoteRecord[];
    apiConnected: boolean;
    message: string;
  }> {
    const results: GoogleKeepPersonalNoteRecord[] = [];
    let apiConnected = false;

    const apiRes = await callWorkspaceProxy<{ notes?: any[] }>({
      service: 'keep',
      endpointPath: 'notes',
      method: 'GET',
      queryParams: { pageSize: 25 }
    });

    if (apiRes.success && Array.isArray(apiRes.data?.notes)) {
      apiConnected = true;
      apiRes.data.notes.forEach((kn: any, idx: number) => {
        results.push({
          id: kn.name?.replace('notes/', 'keep-api-') || `keep-api-${idx}`,
          keepApiName: kn.name,
          title: kn.title || 'Google Keep Clinical Note',
          content: kn.body?.text?.text || '',
          tag: 'Google Keep API v1',
          checklist: kn.body?.list?.listItems?.map((li: any, i: number) => ({
            id: `kli-${i}`,
            text: li.text?.text || '',
            completed: Boolean(li.checked)
          })),
          syncedToPersonalKeepAt: kn.updateTime || new Date().toISOString(),
          syncChannel: 'keep_api_v1'
        });
      });
    }

    try {
      const { db, auth } = await import('@/lib/firebase');
      const { collection, getDocs } = await import('firebase/firestore');
      const resolvedUid = userId || auth.currentUser?.uid;
      if (resolvedUid) {
        const snap = await getDocs(collection(db, 'users', resolvedUid, 'keepNotes'));
        snap.forEach((docSnap) => {
          const data = docSnap.data() as GoogleKeepPersonalNoteRecord;
          if (!results.some((r) => r.id === data.id)) {
            results.push(data);
          }
        });
      }
    } catch {
      // Ignore offline error
    }

    return {
      notes: results,
      apiConnected,
      message: apiConnected
        ? `Synced ${results.length} note(s) from Google Keep API v1 & Personal Workspace.`
        : `Synced ${results.length} note(s) with Personal Workspace (/users/{uid}/keepNotes).`
    };
  },

  /**
   * Syncs a quick clinical note or observational reminder to Google Keep REST API v1 (`POST /v1/notes`)
   * AND the practitioner's personal Firestore workspace (`/users/{uid}/keepNotes/{noteId}`).
   */
  async syncNoteToPersonalWorkspace(params: {
    id: string;
    title: string;
    content: string;
    tag: string;
    clientId?: string;
    clientName?: string;
    observationalReminderAt?: string;
    reminderPriority?: 'Routine' | 'High Clinical Priority' | 'Urgent Safeguarding';
    checklist?: Array<{ id?: string; text: string; completed: boolean }>;
    userId?: string;
  }): Promise<{
    success: boolean;
    record: GoogleKeepPersonalNoteRecord;
    apiStatus: string;
  }> {
    const formattedBodyText = [
      params.clientName ? `Participant: ${params.clientName}` : null,
      params.observationalReminderAt
        ? `Observational Reminder: ${params.observationalReminderAt} (${params.reminderPriority || 'Routine'})`
        : null,
      params.content
    ]
      .filter(Boolean)
      .join('\n');

    const keepPayload: Record<string, any> = {
      title: params.title,
      body:
        params.checklist && params.checklist.length > 0
          ? {
              list: {
                listItems: params.checklist.map((item) => ({
                  text: { text: item.text },
                  checked: Boolean(item.completed)
                }))
              }
            }
          : {
              text: { text: formattedBodyText }
            }
    };

    const apiRes = await callWorkspaceProxy<{ name?: string }>({
      service: 'keep',
      endpointPath: 'notes',
      method: 'POST',
      payload: keepPayload
    });

    const syncedRecord: GoogleKeepPersonalNoteRecord = {
      id: params.id,
      keepApiName: apiRes.data?.name,
      title: params.title,
      content: params.content,
      tag: params.tag,
      clientId: params.clientId,
      clientName: params.clientName,
      observationalReminderAt: params.observationalReminderAt,
      reminderPriority: params.reminderPriority,
      checklist: params.checklist,
      syncedToPersonalKeepAt: new Date().toISOString(),
      syncChannel: apiRes.success ? 'keep_api_v1' : 'firestore_personal_workspace'
    };

    try {
      const { db, auth } = await import('@/lib/firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      const resolvedUid = params.userId || auth.currentUser?.uid;
      if (resolvedUid) {
        await setDoc(doc(db, 'users', resolvedUid, 'keepNotes', params.id), syncedRecord, {
          merge: true
        });
      }
      await setDoc(doc(db, 'quickNotes', params.id), {
        ...params,
        observationalReminderAt: params.observationalReminderAt || null,
        reminderPriority: params.reminderPriority || 'Routine',
        syncedToPersonalKeepAt: syncedRecord.syncedToPersonalKeepAt,
        syncChannel: syncedRecord.syncChannel
      }, { merge: true });
    } catch {
      // Non-blocking if offline
    }

    return {
      success: true,
      record: syncedRecord,
      apiStatus: apiRes.success
        ? 'Synced live to Google Keep REST API v1 & Personal Workspace'
        : 'Synced to Personal Workspace (/users/{uid}/keepNotes & /quickNotes)'
    };
  },

  /**
   * Deletes a note from Google Keep REST API v1 and Personal Workspace.
   */
  async deletePersonalNote(noteId: string, keepApiName?: string, userId?: string): Promise<void> {
    if (keepApiName) {
      await callWorkspaceProxy({
        service: 'keep',
        endpointPath: keepApiName.startsWith('notes/') ? keepApiName : `notes/${keepApiName}`,
        method: 'DELETE'
      });
    }
    try {
      const { db, auth } = await import('@/lib/firebase');
      const { doc, deleteDoc } = await import('firebase/firestore');
      const resolvedUid = userId || auth.currentUser?.uid;
      if (resolvedUid) {
        await deleteDoc(doc(db, 'users', resolvedUid, 'keepNotes', noteId));
      }
    } catch {
      // Ignore
    }
  }
};

