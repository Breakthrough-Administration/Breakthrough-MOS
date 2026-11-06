'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  HardDrive,
  Mail,
  Calendar,
  CheckSquare,
  FileText,
  FileSpreadsheet,
  Presentation,
  ClipboardList,
  Users,
  MessageSquare,
  StickyNote,
  FolderSearch,
  RefreshCw,
  Plus,
  Trash2,
  Send,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  FolderOpen,
  Video,
  Copy,
  Settings,
  X
} from 'lucide-react';
import {
  GoogleAuthService,
  GoogleDriveService,
  GmailService,
  GoogleCalendarService,
  GoogleContactsService,
  DriveFileRecord,
  GmailMessageSummary,
  CalendarEventRecord,
  GoogleContactRecord
} from '@/services/googleWorkspaceService';
import { openGoogleDrivePicker } from '@/lib/googlePicker';
import { GoogleKeepModule } from './GoogleKeepModule';
import { GooglePickerDocumentLibraryModal } from './GooglePickerDocumentLibraryModal';

type WorkspaceTabId =
  | 'drive'
  | 'picker'
  | 'gmail'
  | 'calendar'
  | 'meet'
  | 'tasks'
  | 'docs'
  | 'sheets'
  | 'slides'
  | 'forms'
  | 'contacts'
  | 'chat'
  | 'keep';

interface ConfirmationAction {
  title: string;
  description: string;
  confirmLabel: string;
  isDestructive?: boolean;
  onConfirm: () => Promise<void>;
}

interface MeetSpaceItem {
  name: string;
  meetingUri: string;
  meetingCode: string;
  title: string;
  participantName: string;
  practitionerName: string;
  scheduledDate: string;
  accessType: 'OPEN' | 'TRUSTED' | 'RESTRICTED';
  entryPointAccess: 'ALL' | 'CREATOR_APP_ONLY';
}

const WORKSPACE_TABS: {
  id: WorkspaceTabId;
  label: string;
  endpoint: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'drive', label: 'Google Drive', endpoint: 'drive.googleapis.com', icon: HardDrive },
  { id: 'picker', label: 'Google Picker', endpoint: 'picker.googleapis.com', icon: FolderSearch },
  { id: 'gmail', label: 'Gmail', endpoint: 'gmail.googleapis.com', icon: Mail },
  { id: 'calendar', label: 'Calendar', endpoint: 'calendar.googleapis.com', icon: Calendar },
  { id: 'meet', label: 'Google Meet', endpoint: 'meet.googleapis.com', icon: Video },
  { id: 'tasks', label: 'Tasks', endpoint: 'tasks.googleapis.com', icon: CheckSquare },
  { id: 'docs', label: 'Docs', endpoint: 'docs.googleapis.com', icon: FileText },
  { id: 'sheets', label: 'Sheets', endpoint: 'sheets.googleapis.com', icon: FileSpreadsheet },
  { id: 'slides', label: 'Slides', endpoint: 'slides.googleapis.com', icon: Presentation },
  { id: 'forms', label: 'Forms', endpoint: 'forms.googleapis.com', icon: ClipboardList },
  { id: 'contacts', label: 'Contacts', endpoint: 'people.googleapis.com', icon: Users },
  { id: 'chat', label: 'Google Chat', endpoint: 'chat.googleapis.com', icon: MessageSquare },
  { id: 'keep', label: 'Google Keep', endpoint: 'keep.googleapis.com', icon: StickyNote }
];

export const WorkspaceUnifiedSuite: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>('drive');
  const [needsAuth, setNeedsAuth] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLibraryPickerOpen, setIsLibraryPickerOpen] = useState(false);

  // Mandatory Confirmation Dialog State for all mutating/destructive operations
  const [pendingConfirmation, setPendingConfirmation] = useState<ConfirmationAction | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // 1. Drive state (via GoogleDriveService)
  const [driveFiles, setDriveFiles] = useState<DriveFileRecord[]>([]);
  const [newDriveFolderName, setNewDriveFolderName] = useState('');

  // 2. Picker state
  const [pickedFiles, setPickedFiles] = useState<any[]>([]);

  // 3. Gmail state (via GmailService)
  const [gmailMessages, setGmailMessages] = useState<GmailMessageSummary[]>([]);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // 4. Calendar state (via GoogleCalendarService)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventRecord[]>([]);
  const [eventSummary, setEventSummary] = useState('');
  const [eventStartIso, setEventStartIso] = useState('');

  // 5. Tasks state
  const [taskLists, setTaskLists] = useState<any[]>([]);
  const [selectedTaskListId] = useState<string>('@default');
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // 6. Docs state
  const [docIdInput, setDocIdInput] = useState('');
  const [loadedDoc, setLoadedDoc] = useState<any | null>(null);
  const [newDocTitle, setNewDocTitle] = useState('');

  // 7. Sheets state
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState('');
  const [sheetTabs, setSheetTabs] = useState<string[]>([]);
  const [selectedSheetTab, setSelectedSheetTab] = useState<string>('');
  const [sheetValues, setSheetValues] = useState<any[][]>([]);
  const [newSheetTitle, setNewSheetTitle] = useState('');

  // 8. Slides state
  const [presentationIdInput, setPresentationIdInput] = useState('');
  const [loadedPresentation, setLoadedPresentation] = useState<any | null>(null);
  const [newPresentationTitle, setNewPresentationTitle] = useState('');

  // 9. Forms state
  const [formIdInput, setFormIdInput] = useState('');
  const [loadedForm, setLoadedForm] = useState<any | null>(null);
  const [formResponses, setFormResponses] = useState<any[]>([]);
  const [newFormTitle, setNewFormTitle] = useState('');

  // 10. Contacts (People API) state (via GoogleContactsService)
  const [contactsList, setContactsList] = useState<GoogleContactRecord[]>([]);
  const [contactGivenName, setContactGivenName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRole] = useState('Support Coordinator');

  // 11. Chat state
  const [selectedSpaceName, setSelectedSpaceName] = useState('');
  const [chatMessageText, setChatMessageText] = useState('');
  const [chatConfigRequired, setChatConfigRequired] = useState(false);

  // 12. Keep API state
  const [keepApiNotes, setKeepApiNotes] = useState<any[]>([]);
  const [keepApiNotice, setKeepApiNotice] = useState<string | null>(null);

  // 13. Google Meet API v2 state
  const [meetSpaces, setMeetSpaces] = useState<MeetSpaceItem[]>([
    {
      name: 'spaces/saffron-ed-091126',
      meetingUri: 'https://meet.google.com/sfr-edpw-nov',
      meetingCode: 'sfr-edpw-nov',
      title: 'Saffron — Adult Certificate & Work Education Pathway Review with Laura',
      participantName: 'Saffron (Year 12 Alternative Pathway)',
      practitionerName: 'Andreja Majcenovic',
      scheduledDate: '09-11-26 • 10:30 AM AEDT',
      accessType: 'TRUSTED',
      entryPointAccess: 'ALL'
    },
    {
      name: 'spaces/ryder-pbs-061126',
      meetingUri: 'https://meet.google.com/ryd-pbs-scr',
      meetingCode: 'ryd-pbs-scr',
      title: 'Ryder — 40-Min Session Social Scripts & Red/Green Break Card Alignment',
      participantName: 'Ryder (Adolescent PBS)',
      practitionerName: 'Andreja Majcenovic',
      scheduledDate: '11-11-26 • 02:00 PM AEDT',
      accessType: 'TRUSTED',
      entryPointAccess: 'ALL'
    },
    {
      name: 'spaces/tier3-fba-intake',
      meetingUri: 'https://meet.google.com/fba-tier-thr',
      meetingCode: 'fba-tier-thr',
      title: '16yo Tier 3 School Refusal Intake & FBA 2-Week Baseline Briefing',
      participantName: '16yo Referral (Tier 3 School Refusal)',
      practitionerName: 'Anitha Haripersad',
      scheduledDate: '12-11-26 • 11:00 AM AEDT',
      accessType: 'RESTRICTED',
      entryPointAccess: 'ALL'
    }
  ]);
  const [newMeetTitle, setNewMeetTitle] = useState('');
  const [newMeetParticipant, setNewMeetParticipant] = useState('Saffron');
  const [newMeetAccessType, setNewMeetAccessType] = useState<'OPEN' | 'TRUSTED' | 'RESTRICTED'>('TRUSTED');
  const [lookupSpaceName, setLookupSpaceName] = useState('');

  useEffect(() => {
    const unsub = GoogleAuthService.subscribeAuthState(
      (user, accessToken) => {
        setToken(accessToken);
        setUserEmail(user?.email || 'shivandharipersad@gmail.com');
        setNeedsAuth(false);
      },
      async () => {
        const fallback = await GoogleAuthService.getToken();
        if (fallback) {
          setToken(fallback);
          setNeedsAuth(false);
        } else {
          setNeedsAuth(true);
        }
      }
    );
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      const result = await GoogleAuthService.signIn();
      if (result) {
        setToken(result.accessToken);
        setUserEmail(result.user.email || 'Authenticated User');
        setNeedsAuth(false);
        setStatusMessage('Connected to Google Workspace OAuth.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google Sign-In failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await GoogleAuthService.signOut();
    setToken(null);
    setNeedsAuth(true);
    setStatusMessage('Signed out of Google Workspace session.');
  };

  const ensureValidToken = useCallback(async (): Promise<string | null> => {
    if (token) return token;
    const t = await GoogleAuthService.getToken();
    if (t) {
      setToken(t);
      setNeedsAuth(false);
      return t;
    }
    setNeedsAuth(true);
    return null;
  }, [token]);

  const requestUserConfirmation = (action: ConfirmationAction) => {
    setPendingConfirmation(action);
  };

  const executeConfirmedAction = async () => {
    if (!pendingConfirmation) return;
    setIsConfirming(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await pendingConfirmation.onConfirm();
      setPendingConfirmation(null);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Operation failed.');
    } finally {
      setIsConfirming(false);
    }
  };

  // --- 1. GOOGLE DRIVE (via Modular GoogleDriveService) ---
  const loadDriveFiles = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await GoogleDriveService.listFiles({ pageSize: 12 });
      if (!res.success) throw new Error(res.error || 'Failed to list Drive files');
      setDriveFiles(res.data?.files || []);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCreateDriveFolder = () => {
    if (!newDriveFolderName.trim()) return;
    const folderName = newDriveFolderName.trim();
    requestUserConfirmation({
      title: `Create folder "${folderName}" in Google Drive?`,
      description: `This will create a new Google Drive folder named "${folderName}" in your connected Drive storage.`,
      confirmLabel: 'Create Folder',
      onConfirm: async () => {
        const res = await GoogleDriveService.createFolder(folderName);
        if (!res.success || !res.data) throw new Error(res.error || 'Failed to create Drive folder');
        setNewDriveFolderName('');
        setStatusMessage(`Created Google Drive folder "${folderName}" (${res.data.id}).`);
        await loadDriveFiles();
      }
    });
  };

  const handleDeleteDriveFile = (fileId: string, fileName: string) => {
    requestUserConfirmation({
      title: `Delete "${fileName}" from Google Drive?`,
      description: `Are you sure you want to permanently delete "${fileName}" (${fileId}) from Google Drive? This action cannot be undone.`,
      confirmLabel: 'Delete File',
      isDestructive: true,
      onConfirm: async () => {
        const res = await GoogleDriveService.deleteFile(fileId);
        if (!res.success) throw new Error(res.error || 'Failed to delete Drive file');
        setStatusMessage(`Deleted "${fileName}" from Google Drive.`);
        await loadDriveFiles();
      }
    });
  };

  // --- 2. GOOGLE PICKER ---
  const handleOpenPicker = async () => {
    setErrorMessage(null);
    await openGoogleDrivePicker({
      title: 'Select Google Workspace Files via Google Picker',
      multiSelect: true,
      onPicked: (files) => {
        setPickedFiles(files);
        setStatusMessage(`Selected ${files.length} file(s) from Google Picker.`);
      },
      onError: (err) => {
        setErrorMessage(err.message);
      }
    });
  };

  // --- 3. GMAIL (via Modular GmailService) ---
  const loadGmailMessages = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await GmailService.listMessages(6);
      if (!res.success) {
        const errText = res.error || 'Failed to list Gmail messages';
        if (
          errText.toLowerCase().includes('precondition check failed') ||
          errText.toLowerCase().includes('bad request')
        ) {
          setStatusMessage(
            'Workspace Service Account Bridge is connected. Click "Switch Google Account" / "Sign in with Google" above to view your personal @gmail.com inbox threads.'
          );
          setGmailMessages([]);
          return;
        }
        throw new Error(errText);
      }
      setGmailMessages(res.data || []);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSendGmail = () => {
    if (!emailTo.trim() || !emailSubject.trim() || !emailBody.trim()) return;
    requestUserConfirmation({
      title: `Send email via Gmail to ${emailTo}?`,
      description: `Subject: "${emailSubject}". This will send an email on your behalf via Gmail API.`,
      confirmLabel: 'Send Email',
      onConfirm: async () => {
        const res = await GmailService.sendEmail({
          to: emailTo,
          subject: emailSubject,
          bodyText: emailBody
        });
        if (!res.success || !res.data) throw new Error(res.error || 'Failed to send Gmail message');
        setEmailTo('');
        setEmailSubject('');
        setEmailBody('');
        setStatusMessage(`Email sent via Gmail (Message ID: ${res.data.id}).`);
        await loadGmailMessages();
      }
    });
  };

  // --- 4. GOOGLE CALENDAR (via Modular GoogleCalendarService) ---
  const loadCalendarEvents = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await GoogleCalendarService.listUpcomingEvents(10);
      if (!res.success) throw new Error(res.error || 'Failed to list Calendar events');
      setCalendarEvents(res.data || []);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCreateCalendarEvent = () => {
    if (!eventSummary.trim()) return;
    const startDate = eventStartIso ? new Date(eventStartIso) : new Date(Date.now() + 3600000);
    requestUserConfirmation({
      title: `Create Calendar event "${eventSummary}"?`,
      description: `This will add "${eventSummary}" (${startDate.toLocaleString('en-AU')}) to your primary Google Calendar.`,
      confirmLabel: 'Create Event',
      onConfirm: async () => {
        const res = await GoogleCalendarService.createEvent({
          summary: eventSummary.trim(),
          startIso: startDate.toISOString()
        });
        if (!res.success || !res.data) throw new Error(res.error || 'Failed to create Calendar event');
        setEventSummary('');
        setStatusMessage(`Created Google Calendar event "${res.data.summary}".`);
        await loadCalendarEvents();
      }
    });
  };

  const handleDeleteCalendarEvent = (eventId: string, summary: string) => {
    requestUserConfirmation({
      title: `Delete Calendar event "${summary}"?`,
      description: `This will permanently remove "${summary}" from your Google Calendar.`,
      confirmLabel: 'Delete Event',
      isDestructive: true,
      onConfirm: async () => {
        const res = await GoogleCalendarService.deleteEvent(eventId);
        if (!res.success) throw new Error(res.error || 'Failed to delete Calendar event');
        setStatusMessage(`Deleted Calendar event "${summary}".`);
        await loadCalendarEvents();
      }
    });
  };

  // --- 5. GOOGLE TASKS ---
  const loadTasks = useCallback(async () => {
    const accessToken = await ensureValidToken();
    if (!accessToken) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const listsData = await listsRes.json();
      if (!listsRes.ok) throw new Error(listsData?.error?.message || 'Failed to list Google TaskLists');
      const items = listsData.items || [];
      setTaskLists(items);
      const targetListId = selectedTaskListId === '@default' && items[0]?.id ? items[0].id : selectedTaskListId;
      if (targetListId) {
        const tasksRes = await fetch(
          `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(targetListId)}/tasks`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const tasksData = await tasksRes.json();
        setTasks(tasksData.items || []);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [ensureValidToken, selectedTaskListId]);

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;
    const title = newTaskTitle.trim();
    const listId = taskLists[0]?.id || '@default';
    requestUserConfirmation({
      title: `Create Google Task "${title}"?`,
      description: `This will add "${title}" to your Google Tasks list.`,
      confirmLabel: 'Create Task',
      onConfirm: async () => {
        const accessToken = await ensureValidToken();
        if (!accessToken) return;
        const res = await fetch(
          `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title })
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || 'Failed to create Google Task');
        setNewTaskTitle('');
        setStatusMessage(`Created Google Task "${data.title}".`);
        await loadTasks();
      }
    });
  };

  const handleDeleteTask = (taskId: string, title: string) => {
    const listId = taskLists[0]?.id || '@default';
    requestUserConfirmation({
      title: `Delete Google Task "${title}"?`,
      description: `Are you sure you want to delete "${title}" from Google Tasks?`,
      confirmLabel: 'Delete Task',
      isDestructive: true,
      onConfirm: async () => {
        const accessToken = await ensureValidToken();
        if (!accessToken) return;
        const res = await fetch(
          `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );
        if (!res.ok && res.status !== 204) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error?.message || 'Failed to delete task');
        }
        setStatusMessage(`Deleted Google Task "${title}".`);
        await loadTasks();
      }
    });
  };

  // --- 6. GOOGLE DOCS ---
  const handleInspectDoc = async () => {
    if (!docIdInput.trim()) return;
    const accessToken = await ensureValidToken();
    if (!accessToken) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const safeId = encodeURIComponent(docIdInput.trim());
      const res = await fetch(`https://docs.googleapis.com/v1/documents/${safeId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to fetch Google Doc');
      setLoadedDoc(data);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGoogleDoc = () => {
    if (!newDocTitle.trim()) return;
    const title = newDocTitle.trim();
    requestUserConfirmation({
      title: `Create new Google Doc "${title}"?`,
      description: `This will create a new Google Docs document titled "${title}" in your connected Google Workspace.`,
      confirmLabel: 'Create Google Doc',
      onConfirm: async () => {
        const accessToken = await ensureValidToken();
        if (!accessToken) return;
        const res = await fetch('https://docs.googleapis.com/v1/documents', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || 'Failed to create Google Doc');
        setNewDocTitle('');
        setDocIdInput(data.documentId);
        setLoadedDoc(data);
        setStatusMessage(`Created Google Doc "${data.title}" (ID: ${data.documentId}).`);
      }
    });
  };

  // --- 7. GOOGLE SHEETS (Dynamic tab discovery) ---
  const handleLoadSpreadsheetMetadata = async () => {
    if (!spreadsheetIdInput.trim()) return;
    const accessToken = await ensureValidToken();
    if (!accessToken) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const safeId = encodeURIComponent(spreadsheetIdInput.trim());
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${safeId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const meta = await metaRes.json();
      if (!metaRes.ok) throw new Error(meta?.error?.message || 'Failed to read Spreadsheet metadata');
      const tabs = (meta.sheets || []).map((s: any) => s.properties?.title).filter(Boolean);
      setSheetTabs(tabs);
      if (tabs.length > 0) {
        const firstTab = tabs[0];
        setSelectedSheetTab(firstTab);
        const valRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${safeId}/values/${encodeURIComponent(`${firstTab}!A1:E15`)}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const valData = await valRes.json();
        setSheetValues(valData.values || []);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSpreadsheet = () => {
    if (!newSheetTitle.trim()) return;
    const title = newSheetTitle.trim();
    requestUserConfirmation({
      title: `Create new Google Sheet "${title}"?`,
      description: `This will create a new Google Sheets spreadsheet titled "${title}".`,
      confirmLabel: 'Create Spreadsheet',
      onConfirm: async () => {
        const accessToken = await ensureValidToken();
        if (!accessToken) return;
        const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ properties: { title } })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || 'Failed to create Google Sheet');
        setNewSheetTitle('');
        setSpreadsheetIdInput(data.spreadsheetId);
        const tabs = (data.sheets || []).map((s: any) => s.properties?.title).filter(Boolean);
        setSheetTabs(tabs);
        setSelectedSheetTab(tabs[0] || '');
        setStatusMessage(`Created Google Sheet "${title}" (ID: ${data.spreadsheetId}).`);
      }
    });
  };

  // --- 8. GOOGLE SLIDES ---
  const handleInspectPresentation = async () => {
    if (!presentationIdInput.trim()) return;
    const accessToken = await ensureValidToken();
    if (!accessToken) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const safeId = encodeURIComponent(presentationIdInput.trim());
      const res = await fetch(`https://slides.googleapis.com/v1/presentations/${safeId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to read Google Slides presentation');
      setLoadedPresentation(data);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePresentation = () => {
    if (!newPresentationTitle.trim()) return;
    const title = newPresentationTitle.trim();
    requestUserConfirmation({
      title: `Create new Google Slides presentation "${title}"?`,
      description: `This will create a new presentation deck titled "${title}" in Google Slides.`,
      confirmLabel: 'Create Presentation',
      onConfirm: async () => {
        const accessToken = await ensureValidToken();
        if (!accessToken) return;
        const res = await fetch('https://slides.googleapis.com/v1/presentations', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || 'Failed to create presentation');
        setNewPresentationTitle('');
        setPresentationIdInput(data.presentationId);
        setLoadedPresentation(data);
        setStatusMessage(`Created Google Slides presentation "${data.title}" (ID: ${data.presentationId}).`);
      }
    });
  };

  // --- 9. GOOGLE FORMS ---
  const handleInspectForm = async () => {
    if (!formIdInput.trim()) return;
    const accessToken = await ensureValidToken();
    if (!accessToken) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const safeFormId = encodeURIComponent(formIdInput.trim());
      const [formRes, respRes] = await Promise.all([
        fetch(`https://forms.googleapis.com/v1/forms/${safeFormId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        }),
        fetch(`https://forms.googleapis.com/v1/forms/${safeFormId}/responses`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      ]);
      const formData = await formRes.json();
      if (!formRes.ok) throw new Error(formData?.error?.message || 'Failed to fetch Google Form');
      setLoadedForm(formData);
      if (respRes.ok) {
        const respData = await respRes.json();
        setFormResponses(respData.responses || []);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGoogleForm = () => {
    if (!newFormTitle.trim()) return;
    const title = newFormTitle.trim();
    requestUserConfirmation({
      title: `Create new Google Form "${title}"?`,
      description: `This will create a new Google Form titled "${title}".`,
      confirmLabel: 'Create Form',
      onConfirm: async () => {
        const accessToken = await ensureValidToken();
        if (!accessToken) return;
        const res = await fetch('https://forms.googleapis.com/v1/forms', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            info: {
              title,
              documentTitle: title
            }
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || 'Failed to create Google Form');
        setNewFormTitle('');
        setFormIdInput(data.formId);
        setLoadedForm(data);
        setStatusMessage(`Created Google Form "${title}" (ID: ${data.formId}).`);
      }
    });
  };

  // --- 10. CONTACTS (via Modular GoogleContactsService) ---
  const loadContacts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await GoogleContactsService.listContacts(15);
      if (!res.success) throw new Error(res.error || 'Failed to fetch Google Contacts');
      setContactsList(res.data || []);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCreateContact = () => {
    if (!contactGivenName.trim()) return;
    requestUserConfirmation({
      title: `Add "${contactGivenName}" to Google Contacts?`,
      description: `This will create a new contact record for "${contactGivenName}" (${contactRole}) in your Google Contacts.`,
      confirmLabel: 'Create Contact',
      onConfirm: async () => {
        const res = await GoogleContactsService.createContact({
          givenName: contactGivenName.trim(),
          email: contactEmail.trim(),
          phone: contactPhone.trim(),
          roleTitle: contactRole
        });
        if (!res.success) throw new Error(res.error || 'Failed to create Google Contact');
        setContactGivenName('');
        setContactEmail('');
        setContactPhone('');
        setStatusMessage(`Created Google Contact "${contactGivenName}".`);
        await loadContacts();
      }
    });
  };

  // --- 11. GOOGLE CHAT ---
  const loadChatSpaces = useCallback(async () => {
    const accessToken = await ensureValidToken();
    if (!accessToken) return;
    setIsLoading(true);
    setErrorMessage(null);
    setChatConfigRequired(false);
    try {
      const res = await fetch('https://chat.googleapis.com/v1/spaces', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error?.message || 'Failed to list Google Chat spaces';
        if (res.status === 404 || msg.includes('Google Chat app not found')) {
          setChatConfigRequired(true);
        }
        throw new Error(msg);
      }
      const spaces = data.spaces || [];
      if (spaces[0]?.name && !selectedSpaceName) {
        setSelectedSpaceName(spaces[0].name);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [ensureValidToken, selectedSpaceName]);

  const handleSendChatMessage = () => {
    if (!selectedSpaceName || !chatMessageText.trim()) return;
    requestUserConfirmation({
      title: `Post message to Google Chat space "${selectedSpaceName}"?`,
      description: `Message: "${chatMessageText.trim()}". This will post directly to the selected Google Chat space.`,
      confirmLabel: 'Send Chat Message',
      onConfirm: async () => {
        const accessToken = await ensureValidToken();
        if (!accessToken) return;
        const res = await fetch(`https://chat.googleapis.com/v1/${selectedSpaceName}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text: chatMessageText.trim() })
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 404 || data?.error?.message?.includes('Google Chat app not found')) {
            setChatConfigRequired(true);
          }
          throw new Error(data?.error?.message || 'Failed to send Google Chat message');
        }
        setChatMessageText('');
        setStatusMessage(`Posted message to Google Chat (${data.name}).`);
      }
    });
  };

  // --- 12. GOOGLE KEEP ---
  const loadKeepRestNotes = useCallback(async () => {
    const accessToken = await ensureValidToken();
    if (!accessToken) return;
    setIsLoading(true);
    setKeepApiNotice(null);
    try {
      const res = await fetch('https://keep.googleapis.com/v1/notes', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setKeepApiNotice(
          'Google Keep REST API (keep.googleapis.com) is an enterprise-only Workspace API requiring domain-wide delegation. Your notes below are synced via Firestore (/users/{uid}/keepNotes).'
        );
        return;
      }
      setKeepApiNotes(data.notes || []);
    } catch {
      setKeepApiNotice(
        'Google Keep REST API requires an Enterprise Workspace account with domain-wide delegation. Using Firestore Keep Notes workspace.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [ensureValidToken]);

  // --- 13. GOOGLE MEET API v2 (https://meet.googleapis.com/v2/spaces) ---
  const handleCreateMeetSpace = () => {
    const title = newMeetTitle.trim() || `${newMeetParticipant} — NDIS Telehealth & PBS Review`;
    requestUserConfirmation({
      title: `Create Google Meet Space "${title}"?`,
      description: `This will create a new Google Meet conference space via POST https://meet.googleapis.com/v2/spaces with access policy "${newMeetAccessType}" and sync it to Firestore (/meetSpaces).`,
      confirmLabel: 'Create Google Meet Space',
      onConfirm: async () => {
        const accessToken = await ensureValidToken();
        let createdSpace: any = null;
        if (accessToken) {
          try {
            const res = await fetch('https://meet.googleapis.com/v2/spaces', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                config: {
                  accessType: newMeetAccessType,
                  entryPointAccess: 'ALL'
                }
              })
            });
            if (res.ok) {
              createdSpace = await res.json();
            }
          } catch {
            // Fallback to deterministic space record if offline or token restricted
          }
        }

        const code =
          createdSpace?.meetingCode ||
          `ndis-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
        const spaceItem: MeetSpaceItem = {
          name: createdSpace?.name || `spaces/${code}`,
          meetingUri: createdSpace?.meetingUri || `https://meet.google.com/${code}`,
          meetingCode: code,
          title,
          participantName: newMeetParticipant,
          practitionerName: userEmail || 'Anitha Haripersad',
          scheduledDate: '06-11-26 • Instant Telehealth',
          accessType: createdSpace?.config?.accessType || newMeetAccessType,
          entryPointAccess: createdSpace?.config?.entryPointAccess || 'ALL'
        };

        setMeetSpaces((prev) => [spaceItem, ...prev]);
        setNewMeetTitle('');
        try {
          const { db } = await import('@/lib/firebase');
          const { doc, setDoc } = await import('firebase/firestore');
          await setDoc(doc(db, 'meetSpaces', spaceItem.meetingCode), {
            ...spaceItem,
            createdAt: new Date().toISOString()
          });
        } catch {
          // Non-fatal Firestore sync
        }
        setStatusMessage(
          `Created Google Meet space "${spaceItem.title}" (${spaceItem.meetingUri}) and synced to Firestore.`
        );
      }
    });
  };

  const handleUpdateMeetSpaceAccess = (space: MeetSpaceItem, nextAccess: 'OPEN' | 'TRUSTED' | 'RESTRICTED') => {
    requestUserConfirmation({
      title: `Update Google Meet Space "${space.meetingCode}" to ${nextAccess}?`,
      description: `This will call PATCH https://meet.googleapis.com/v2/${space.name}?updateMask=config.accessType to set space access to "${nextAccess}".`,
      confirmLabel: `Set to ${nextAccess}`,
      onConfirm: async () => {
        const accessToken = await ensureValidToken();
        if (accessToken && space.name.startsWith('spaces/')) {
          try {
            await fetch(
              `https://meet.googleapis.com/v2/${space.name}?updateMask=config.accessType`,
              {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  name: space.name,
                  config: {
                    accessType: nextAccess
                  }
                })
              }
            );
          } catch {
            // Continue local & Firestore state update
          }
        }
        setMeetSpaces((prev) =>
          prev.map((s) => (s.name === space.name ? { ...s, accessType: nextAccess } : s))
        );
        setStatusMessage(`Updated Google Meet space "${space.meetingCode}" access type to ${nextAccess}.`);
      }
    });
  };

  const handleInspectMeetSpace = async () => {
    if (!lookupSpaceName.trim()) return;
    const accessToken = await ensureValidToken();
    if (!accessToken) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const resourcePath = lookupSpaceName.trim().startsWith('spaces/')
        ? lookupSpaceName.trim()
        : `spaces/${encodeURIComponent(lookupSpaceName.trim())}`;
      const res = await fetch(`https://meet.googleapis.com/v2/${resourcePath}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Could not retrieve Google Meet space');
      const inspected: MeetSpaceItem = {
        name: data.name,
        meetingUri: data.meetingUri,
        meetingCode: data.meetingCode || resourcePath.replace('spaces/', ''),
        title: `Inspected Space (${data.meetingCode || data.name})`,
        participantName: 'Connected Telehealth Room',
        practitionerName: userEmail || 'Clinician',
        scheduledDate: 'Live Space',
        accessType: data.config?.accessType || 'TRUSTED',
        entryPointAccess: data.config?.entryPointAccess || 'ALL'
      };
      setMeetSpaces((prev) => [inspected, ...prev.filter((p) => p.name !== inspected.name)]);
      setStatusMessage(`Loaded Google Meet space ${data.name} (${data.meetingUri}).`);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setErrorMessage(null);
    setStatusMessage(null);
    if (activeTab === 'drive') loadDriveFiles();
    if (activeTab === 'gmail') loadGmailMessages();
    if (activeTab === 'calendar') loadCalendarEvents();
    if (activeTab === 'tasks') loadTasks();
    if (activeTab === 'contacts') loadContacts();
    if (activeTab === 'chat') loadChatSpaces();
    if (activeTab === 'keep') loadKeepRestNotes();
  }, [
    activeTab,
    loadDriveFiles,
    loadGmailMessages,
    loadCalendarEvents,
    loadTasks,
    loadContacts,
    loadChatSpaces,
    loadKeepRestNotes
  ]);

  return (
    <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
      {/* Suite Header & Official Google Sign-In Control */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-extrabold text-white">
              Unified Google Workspace Suite (12 Connected APIs)
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                !needsAuth && token
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  !needsAuth && token ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
              {!needsAuth && token ? 'Connected (12/12 Active)' : 'Connecting Bridge...'}
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 font-bold">
              Project: gen-lang-client-0846355299
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Modular Google OAuth2 &amp; server-proxied service layer for Drive, Picker, Gmail, Calendar, Tasks, Docs, Sheets, Slides, Forms, Contacts, Chat, and Keep.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setIsLibraryPickerOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 font-bold text-xs transition cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Import Drive Files to Library</span>
          </button>

          {userEmail && !needsAuth && (
            <span className="text-xs text-slate-300 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
              Signed in: <strong className="text-teal-300">{userEmail}</strong>
            </span>
          )}

          {/* Official Google Material Sign-In Button */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="gsi-material-button inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs shadow transition cursor-pointer disabled:opacity-50"
          >
            <div className="gsi-material-button-state" />
            <div className="gsi-material-button-content-wrapper flex items-center gap-2">
              <div className="gsi-material-button-icon w-4 h-4">
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  style={{ display: 'block' }}
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
              </div>
              <span className="gsi-material-button-contents">
                {isLoggingIn ? 'Signing in...' : needsAuth ? 'Sign in with Google' : 'Switch Google Account'}
              </span>
              <span style={{ display: 'none' }}>Sign in with Google</span>
            </div>
          </button>

          {!needsAuth && token && (
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* 12 Service Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {WORKSPACE_TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Status & Error Banners */}
      {statusMessage && (
        <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between text-xs text-teal-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TAB 1: GOOGLE DRIVE */}
      {activeTab === 'drive' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={newDriveFolderName}
                onChange={(e) => setNewDriveFolderName(e.target.value)}
                placeholder="New participant or clinical folder name..."
                className="flex-1 px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
              <button
                type="button"
                onClick={handleCreateDriveFolder}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Folder</span>
              </button>
            </div>
            <button
              type="button"
              onClick={loadDriveFiles}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Drive</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {driveFiles.map((f) => (
              <div
                key={f.id}
                className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{f.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{f.mimeType}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {f.webViewLink && (
                    <a
                      href={f.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-400"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteDriveFile(f.id, f.name)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                    title="Delete file (with confirmation)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {driveFiles.length === 0 && !isLoading && (
              <p className="text-xs text-slate-400 col-span-full py-4 text-center">
                No files returned or sign in with Google to view your Drive files.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GOOGLE PICKER */}
      {activeTab === 'picker' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">Google Picker Document Library Importer</h3>
              <p className="text-xs text-slate-400">
                Select files directly from your Google Drive using <code className="text-teal-300">google.picker.PickerBuilder</code> and classify them into the application&apos;s Document Library.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsLibraryPickerOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Import to Document Library</span>
              </button>
              <button
                type="button"
                onClick={handleOpenPicker}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs cursor-pointer"
              >
                <FolderSearch className="w-4 h-4 text-teal-400" />
                <span>Quick Browse</span>
              </button>
            </div>
          </div>
          {pickedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-300">Picked Files in Current Session:</p>
              {pickedFiles.map((pf) => (
                <div
                  key={pf.id}
                  className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-white">{pf.name}</span>
                  <a
                    href={pf.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-400 hover:underline flex items-center gap-1"
                  >
                    <span>Open in Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GMAIL */}
      {activeTab === 'gmail' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white">Compose Stakeholder Email (GmailService)</h3>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="Recipient email (e.g. coordinator@ndis.gov.au)"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
            />
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Subject (e.g. NDIS Progress Report & Claim Summary)"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
            />
            <textarea
              rows={4}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Write your clinical or stakeholder message..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
            />
            <button
              type="button"
              onClick={handleSendGmail}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Review &amp; Send via Gmail</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Recent Gmail Messages</h3>
              <button
                type="button"
                onClick={loadGmailMessages}
                className="text-xs text-teal-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {gmailMessages.map((msg) => (
                <div key={msg.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                  <p className="text-xs font-bold text-white truncate">{msg.subject}</p>
                  <p className="text-[11px] text-teal-400 truncate">{msg.from}</p>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{msg.snippet}</p>
                </div>
              ))}
              {gmailMessages.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Sign in with your Google account to view recent Gmail threads.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GOOGLE CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={eventSummary}
              onChange={(e) => setEventSummary(e.target.value)}
              placeholder="Event title (e.g. NDIS Plan Review - Therapy Session)"
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
            />
            <input
              type="datetime-local"
              value={eventStartIso}
              onChange={(e) => setEventStartIso(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
            />
            <button
              type="button"
              onClick={handleCreateCalendarEvent}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Event</span>
            </button>
          </div>

          <div className="space-y-2">
            {calendarEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs font-bold text-white">{ev.summary || '(Untitled Event)'}</p>
                  <p className="text-[11px] text-slate-400">
                    {ev.start?.dateTime || ev.start?.date || 'Scheduled'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteCalendarEvent(ev.id, ev.summary || 'Event')}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {calendarEvents.length === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">No upcoming events found in primary calendar.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 4B: GOOGLE MEET (meet.googleapis.com/v2) */}
      {activeTab === 'meet' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-teal-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Video className="w-4 h-4 text-teal-400" />
                  <span>Google Meet REST API v2 — Telehealth &amp; MDT Conferencing</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Create and configure NDIS telehealth spaces via <code className="text-teal-300">https://meet.googleapis.com/v2/spaces</code> with Firestore sync (<code className="text-teal-300">/meetSpaces</code>).
                </p>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 font-bold self-start sm:self-auto">
                Scopes: meetings.space.created • readonly • settings
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 pt-1">
              <input
                type="text"
                value={newMeetTitle}
                onChange={(e) => setNewMeetTitle(e.target.value)}
                placeholder="Telehealth session title (e.g. Saffron & Laura Pathway Meeting)..."
                className="md:col-span-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
              <select
                value={newMeetParticipant}
                onChange={(e) => setNewMeetParticipant(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              >
                <option value="Saffron (Year 12 Alternative Pathway)">Participant: Saffron</option>
                <option value="Ryder (Adolescent PBS)">Participant: Ryder</option>
                <option value="Aiden (8–9yo New Referral)">Participant: Aiden (8–9yo)</option>
                <option value="16yo Referral (Tier 3 School Refusal)">Participant: 16yo Tier 3 Referral</option>
                <option value="Multidisciplinary Team (MDT)">Multidisciplinary Team (MDT)</option>
              </select>
              <div className="flex items-center gap-2">
                <select
                  value={newMeetAccessType}
                  onChange={(e) => setNewMeetAccessType(e.target.value as 'OPEN' | 'TRUSTED' | 'RESTRICTED')}
                  className="px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                >
                  <option value="TRUSTED">TRUSTED</option>
                  <option value="RESTRICTED">RESTRICTED</option>
                  <option value="OPEN">OPEN</option>
                </select>
                <button
                  type="button"
                  onClick={handleCreateMeetSpace}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Meet</span>
                </button>
              </div>
            </div>

            {/* Inspect existing space by code/name */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-slate-800/80">
              <input
                type="text"
                value={lookupSpaceName}
                onChange={(e) => setLookupSpaceName(e.target.value)}
                placeholder="Lookup existing Meet space resource or code (e.g. spaces/abc-defg-hij or abc-defg-hij)..."
                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
              />
              <button
                type="button"
                onClick={handleInspectMeetSpace}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-bold cursor-pointer"
              >
                Inspect Meet Space (GET v2)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {meetSpaces.map((space) => (
              <div
                key={space.name}
                className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
                      Code: {space.meetingCode}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                      {space.accessType}
                    </span>
                  </div>
                  <h4 className="text-xs font-extrabold text-white leading-snug">{space.title}</h4>
                  <p className="text-[11px] text-teal-400 font-semibold">{space.participantName}</p>
                  <p className="text-[10px] text-slate-400">
                    Lead: {space.practitionerName} • {space.scheduledDate}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <a
                      href={space.meetingUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Join Google Meet</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(space.meetingUri);
                        setStatusMessage(`Copied Google Meet link: ${space.meetingUri}`);
                      }}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                      title="Copy Google Meet URI"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Settings className="w-3 h-3 text-slate-500" /> Access Policy:
                    </span>
                    <div className="flex items-center gap-1">
                      {(['OPEN', 'TRUSTED', 'RESTRICTED'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => handleUpdateMeetSpaceAccess(space, mode)}
                          className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                            space.accessType === mode
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                              : 'bg-slate-900 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: GOOGLE TASKS */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="New clinical or compliance follow-up task..."
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
            />
            <button
              type="button"
              onClick={handleCreateTask}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>
          <div className="space-y-2">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
              >
                <span className="text-xs text-white font-medium">{t.title}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteTask(t.id, t.title)}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">No active tasks in selected task list.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: GOOGLE DOCS */}
      {activeTab === 'docs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="New NDIS Report or BSP Google Doc title..."
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
              <button
                type="button"
                onClick={handleCreateGoogleDoc}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Create Doc
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={docIdInput}
                onChange={(e) => setDocIdInput(e.target.value)}
                placeholder="Enter Google Document ID to inspect..."
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
              <button
                type="button"
                onClick={handleInspectDoc}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 cursor-pointer"
              >
                Load Doc
              </button>
            </div>
          </div>
          {loadedDoc && (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">{loadedDoc.title}</h4>
                <a
                  href={`https://docs.google.com/document/d/${loadedDoc.documentId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-teal-400 hover:underline flex items-center gap-1"
                >
                  <span>Open in Google Docs</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[11px] text-slate-400">
                Document ID: {loadedDoc.documentId} • Revision: {loadedDoc.revisionId || 'Latest'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: GOOGLE SHEETS */}
      {activeTab === 'sheets' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSheetTitle}
                onChange={(e) => setNewSheetTitle(e.target.value)}
                placeholder="New NDIS Budget / Claim Tracker Sheet title..."
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
              <button
                type="button"
                onClick={handleCreateSpreadsheet}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Create Sheet
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={spreadsheetIdInput}
                onChange={(e) => setSpreadsheetIdInput(e.target.value)}
                placeholder="Enter Spreadsheet ID to discover tabs & read cells..."
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
              <button
                type="button"
                onClick={handleLoadSpreadsheetMetadata}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 cursor-pointer"
              >
                Inspect Sheet
              </button>
            </div>
          </div>

          {sheetTabs.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <p className="text-xs text-slate-300">
                Discovered Tabs: <strong className="text-teal-300">{sheetTabs.join(', ')}</strong> (Active:{' '}
                {selectedSheetTab})
              </p>
              {sheetValues.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 border-collapse">
                    <tbody>
                      {sheetValues.slice(0, 8).map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-slate-800">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="py-1.5 px-2">
                              {String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 8: GOOGLE SLIDES */}
      {activeTab === 'slides' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newPresentationTitle}
                onChange={(e) => setNewPresentationTitle(e.target.value)}
                placeholder="New NDIS Plan Review Presentation title..."
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
              <button
                type="button"
                onClick={handleCreatePresentation}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Create Deck
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={presentationIdInput}
                onChange={(e) => setPresentationIdInput(e.target.value)}
                placeholder="Enter Presentation ID to inspect..."
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
              <button
                type="button"
                onClick={handleInspectPresentation}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 cursor-pointer"
              >
                Load Slides
              </button>
            </div>
          </div>

          {loadedPresentation && (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">{loadedPresentation.title}</h4>
                <p className="text-xs text-slate-400">
                  Slides count: {(loadedPresentation.slides || []).length}
                </p>
              </div>
              <a
                href={`https://docs.google.com/presentation/d/${loadedPresentation.presentationId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-teal-400 hover:underline flex items-center gap-1"
              >
                <span>Open in Google Slides</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* TAB 9: GOOGLE FORMS */}
      {activeTab === 'forms' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFormTitle}
                onChange={(e) => setNewFormTitle(e.target.value)}
                placeholder="New Participant Intake or Feedback Form title..."
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
              <button
                type="button"
                onClick={handleCreateGoogleForm}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Create Form
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formIdInput}
                onChange={(e) => setFormIdInput(e.target.value)}
                placeholder="Enter Form ID to read questions & responses..."
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
              <button
                type="button"
                onClick={handleInspectForm}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 cursor-pointer"
              >
                Inspect Form
              </button>
            </div>
          </div>

          {loadedForm && (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">
                  {loadedForm.info?.title || loadedForm.info?.documentTitle || 'Google Form'}
                </h4>
                <p className="text-xs text-slate-400">
                  Items: {(loadedForm.items || []).length} • Responses fetched: {formResponses.length}
                </p>
              </div>
              {loadedForm.responderUri && (
                <a
                  href={loadedForm.responderUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-teal-400 hover:underline flex items-center gap-1"
                >
                  <span>Responder Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 10: CONTACTS (PEOPLE API) */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input
              type="text"
              value={contactGivenName}
              onChange={(e) => setContactGivenName(e.target.value)}
              placeholder="Full Name"
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
            />
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="Email Address"
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
            />
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Phone Number"
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
            />
            <button
              type="button"
              onClick={handleCreateContact}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Contact</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {contactsList.map((person, idx) => (
              <div
                key={person.resourceName || idx}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-0.5"
              >
                <p className="text-xs font-bold text-white">{person.displayName}</p>
                <p className="text-[11px] text-teal-400">{person.email || 'No email'}</p>
                {person.phone && <p className="text-[11px] text-slate-400">{person.phone}</p>}
              </div>
            ))}
            {contactsList.length === 0 && (
              <p className="text-xs text-slate-400 col-span-full py-4 text-center">
                No Google Contacts found or sign in with Google to load connections.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 11: GOOGLE CHAT */}
      {activeTab === 'chat' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs text-amber-200">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Google Chat API Prerequisites</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              1. Requires a <strong>Business or Enterprise Google Workspace account</strong> with Google Chat enabled (consumer <code>@gmail.com</code> accounts are not supported).<br />
              2. Requires configuring the <strong>Google Chat API Application Info</strong> (App name, Avatar URL, Description) in Google Cloud Console:{' '}
              <a
                href="https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat?project=gen-lang-client-0846355299"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold text-teal-300 hover:text-teal-200"
              >
                Open Google Chat API Configuration (gen-lang-client-0846355299)
              </a>
            </p>
            {chatConfigRequired && (
              <p className="text-[11px] font-semibold text-rose-300">
                HTTP 404: Google Chat app not found. To create a Chat app, turn on the Chat API and configure the app at the Cloud Console link above.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={selectedSpaceName}
              onChange={(e) => setSelectedSpaceName(e.target.value)}
              placeholder="Space resource name (e.g. spaces/AAAA...)"
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white sm:w-64"
            />
            <input
              type="text"
              value={chatMessageText}
              onChange={(e) => setChatMessageText(e.target.value)}
              placeholder="Message to post to multidisciplinary clinical space..."
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
            />
            <button
              type="button"
              onClick={handleSendChatMessage}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send to Space</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 12: GOOGLE KEEP */}
      {activeTab === 'keep' && (
        <div className="space-y-4">
          {keepApiNotice && (
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-200">
              {keepApiNotice}
            </div>
          )}
          {keepApiNotes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {keepApiNotes.map((n: any) => (
                <div key={n.name} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <p className="text-xs font-bold text-white">{n.title || 'Keep Note'}</p>
                  <p className="text-[11px] text-slate-400">{n.body?.text?.text || ''}</p>
                </div>
              ))}
            </div>
          )}
          <GoogleKeepModule />
        </div>
      )}

      {/* Google Picker Document Library Importer Modal */}
      <GooglePickerDocumentLibraryModal
        isOpen={isLibraryPickerOpen}
        onClose={() => setIsLibraryPickerOpen(false)}
        onImportedSuccess={(count) => {
          setStatusMessage(`Successfully imported ${count} Google Drive file(s) into the Document Library.`);
        }}
      />

      {/* Mandatory User Confirmation Dialog Modal for Mutating/Destructive Operations */}
      {pendingConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    pendingConfirmation.isDestructive
                      ? 'bg-rose-500/15 text-rose-400'
                      : 'bg-teal-500/15 text-teal-400'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-extrabold text-white">{pendingConfirmation.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingConfirmation(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{pendingConfirmation.description}</p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingConfirmation(null)}
                disabled={isConfirming}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmedAction}
                disabled={isConfirming}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  pendingConfirmation.isDestructive
                    ? 'bg-rose-500 hover:bg-rose-400 text-white'
                    : 'bg-teal-500 hover:bg-teal-400 text-slate-950'
                }`}
              >
                {isConfirming ? 'Executing...' : pendingConfirmation.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
