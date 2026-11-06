import { StateCreator } from 'zustand';
import { OfflineDelta, Client } from '@/types';
import {
  COMPANY_DRIVE_PARTICIPANTS,
  INITIAL_PRACTITIONERS,
  INITIAL_COMPANY_DOCUMENTS
} from '@/lib/seedData';
import {
  fetchClients,
  fetchCaseNotes,
  fetchBillingClaims,
  fetchIncidents,
  fetchRestrictivePractices,
  fetchABCLogs,
  fetchBSPDocuments,
  fetchCRMLeads,
  fetchCRMTasks,
  fetchPractitioners,
  fetchCompanyDocuments,
  fetchSupportItems,
  fetchAuditLogs,
  fetchScheduledShifts,
  fetchUsers,
  fetchNotifications,
  seedInitialFirestoreDataIfEmpty,
  createClientsBatch,
  createPractitioner,
  createCompanyDocument,
  subscribeToClients,
  subscribeToCaseNotes,
  subscribeToBillingClaims,
  subscribeToIncidents,
  subscribeToRestrictivePractices,
  subscribeToABCLogs,
  subscribeToBSPDocuments,
  subscribeToCRMLeads,
  subscribeToCRMTasks,
  subscribeToPractitioners,
  subscribeToCompanyDocuments,
  subscribeToSupportItems,
  subscribeToAuditLogs,
  subscribeToScheduledShifts,
  subscribeToUsers,
  subscribeToNotifications,
  createDocument,
  deleteDocument
} from '@/lib/firestoreService';
import { SyncSlice, RootStore } from '../types';

// Module-level unsubscribe handles for real-time Firestore listeners
let _unsubClients: (() => void) | null = null;
let _unsubCaseNotes: (() => void) | null = null;
let _unsubBillingClaims: (() => void) | null = null;
let _unsubIncidents: (() => void) | null = null;
let _unsubRP: (() => void) | null = null;
let _unsubABCLogs: (() => void) | null = null;
let _unsubBSPDocuments: (() => void) | null = null;
let _unsubCRMLeads: (() => void) | null = null;
let _unsubCRMTasks: (() => void) | null = null;
let _unsubPractitioners: (() => void) | null = null;
let _unsubCompanyDocuments: (() => void) | null = null;
let _unsubSupportItems: (() => void) | null = null;
let _unsubAuditLogs: (() => void) | null = null;
let _unsubScheduledShifts: (() => void) | null = null;
let _unsubUsers: (() => void) | null = null;
let _unsubNotifications: (() => void) | null = null;

export const createSyncSlice: StateCreator<RootStore, [], [], SyncSlice> = (set, get) => ({
  isOnline: true,
  syncStatus: 'synced',
  pendingChangesCount: 0,
  offlineQueue: [],
  lastSyncTime: new Date().toISOString(),
  isUsingMockData: false,

  setOnlineStatus: (isOnline: boolean) => {
    set((state) => {
      const syncStatus = !isOnline
        ? 'offline'
        : state.offlineQueue.length > 0
        ? 'pending'
        : 'synced';
      return { isOnline, syncStatus };
    });
    if (isOnline && get().offlineQueue.length > 0) {
      get().triggerDeltaSync();
    }
  },

  simulateOfflineToggle: () => {
    const nextOnline = !get().isOnline;
    get().setOnlineStatus(nextOnline);
    get().addNotification({
      title: nextOnline ? 'Network Connection Restored' : 'Operating in Field Offline Mode',
      message: nextOnline
        ? 'Online connectivity detected. Synchronizing queued clinical and billing deltas with Cloud ledger.'
        : 'Local delta cache active. All case notes, billing claims, and audits will be safely queued locally.',
      type: 'compliance',
      severity: nextOnline ? 'low' : 'medium'
    });
  },

  queueOfflineDelta: (action, entity, entityId, payload) => {
    const delta: OfflineDelta = {
      id: `delta-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      action,
      entity,
      entityId,
      payload
    };

    // Calculate clinical and regulatory priority (Priority 1: Critical Incidents -> Priority 5: CRM)
    const getPriority = (d: OfflineDelta): number => {
      const ent = (d.entity || '').toLowerCase();
      const p = d.payload || {};
      if (ent.includes('incident')) {
        if (p.isNdisReportable || p.severity?.includes('Critical') || p.severity?.includes('High')) return 1;
        return 2;
      }
      if (ent.includes('casenote') || ent.includes('case_note')) {
        if (p.isLocked) return 2;
        return 3;
      }
      if (ent.includes('restrictive') || ent.includes('bsp')) return 2;
      if (ent.includes('claim') || ent.includes('billing') || ent.includes('abc')) return 3;
      if (ent.includes('client') || ent.includes('shift') || ent.includes('goal')) return 4;
      return 5;
    };

    set((state) => {
      const updatedQueue = [...state.offlineQueue, delta].sort((a, b) => {
        const pA = getPriority(a);
        const pB = getPriority(b);
        if (pA !== pB) return pA - pB;
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
      return {
        offlineQueue: updatedQueue,
        pendingChangesCount: updatedQueue.length,
        syncStatus: state.isOnline ? 'pending' : 'offline'
      };
    });

    // Register Background Sync API event with Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then((reg: any) => {
        return reg.sync.register('sync-offline-mutations');
      }).catch((swErr) => {
        console.warn('Background sync registration notice:', swErr);
      });
    }
  },

  triggerDeltaSync: async () => {
    const getPriority = (d: OfflineDelta): number => {
      const ent = (d.entity || '').toLowerCase();
      const p = d.payload || {};
      if (ent.includes('incident')) {
        if (p.isNdisReportable || p.severity?.includes('Critical') || p.severity?.includes('High')) return 1;
        return 2;
      }
      if (ent.includes('casenote') || ent.includes('case_note')) {
        if (p.isLocked) return 2;
        return 3;
      }
      if (ent.includes('restrictive') || ent.includes('bsp')) return 2;
      if (ent.includes('claim') || ent.includes('billing') || ent.includes('abc')) return 3;
      if (ent.includes('client') || ent.includes('shift') || ent.includes('goal')) return 4;
      return 5;
    };

    const queue = [...get().offlineQueue].sort((a, b) => {
      const pA = getPriority(a);
      const pB = getPriority(b);
      if (pA !== pB) return pA - pB;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    if (queue.length === 0) {
      set({ syncStatus: 'synced', pendingChangesCount: 0, lastSyncTime: new Date().toISOString() });
      return;
    }

    set({ syncStatus: 'syncing' });
    try {
      const entityToCollection: Record<string, string> = {
        Client: 'clients',
        CaseNote: 'caseNotes',
        BillingClaim: 'billingClaims',
        Incident: 'incidents',
        RestrictivePractice: 'restrictivePractices',
        ABCLog: 'abcLogs',
        BSPDocument: 'bspDocuments',
        Lead: 'crmLeads',
        CRMTask: 'crmTasks',
        Practitioner: 'practitioners',
        CompanyDocument: 'companyDocuments',
        ScheduledShift: 'scheduledShifts',
        Notification: 'notifications',
        AuditLog: 'auditLogs'
      };

      for (const delta of queue) {
        const colName = entityToCollection[delta.entity] || delta.entity.toLowerCase();
        try {
          if (delta.action === 'CREATE' || delta.action === 'UPDATE' || delta.action === 'UPDATE_GOALS') {
            const docData = delta.payload || {};
            await createDocument(colName, docData, delta.entityId);
          } else if (delta.action === 'DELETE') {
            await deleteDocument(colName, delta.entityId);
          }
        } catch (subErr) {
          console.warn(`Delta sync error for entity ${delta.entity} (${delta.entityId}):`, subErr);
        }
      }

      const processedCount = queue.length;
      set({
        offlineQueue: [],
        pendingChangesCount: 0,
        syncStatus: 'synced',
        lastSyncTime: new Date().toISOString()
      });

      get().addAuditLog(
        'DELTA_SYNC_SUCCESS',
        'OfflineDeltaQueue',
        `batch-${Date.now()}`,
        `Successfully prioritized and synchronized ${processedCount} pending deltas (Critical incidents & clinical records dispatched first).`
      );

      get().addNotification({
        title: 'Priority Deltas Synchronized',
        message: `Successfully flushed ${processedCount} queued records to Cloud Firestore in statutory priority sequence.`,
        type: 'compliance',
        severity: 'low'
      });
    } catch (err) {
      console.error('Failed to flush offline queue:', err);
      set({ syncStatus: 'pending' });
    }
  },

  clearAllMockData: (keepCurrentUser = true) => {
    set({
      isUsingMockData: false,
      clients: [],
      caseNotes: [],
      restrictivePractices: [],
      incidents: [],
      leads: [],
      crmTasks: [],
      abcLogs: [],
      bspPlans: [],
      bspDocuments: [],
      claims: [],
      billingClaims: [],
      scheduledShifts: [],
      selectedClientId: null
    });
    import('@/lib/firestoreService').then(({ purgeMockDataFromFirestore }) => {
      purgeMockDataFromFirestore().catch((e) => console.warn('Purge mock data from firestore:', e));
    });
    get().addAuditLog(
      'WIPE_DEMO_DATABASE',
      'DatabaseEngine',
      'db-root',
      'Cleared all mock participants, notes, and records to initialize production database'
    );
  },

  loadDemoData: () => {
    import('@/lib/seedData').then((seed) => {
      set({
        isUsingMockData: true,
        currentUser: get().currentUser || seed.INITIAL_USERS[0],
        users: seed.INITIAL_USERS,
        clients: seed.SAMPLE_CLIENTS,
        selectedClientId: seed.SAMPLE_CLIENTS[0]?.id || null,
        caseNotes: seed.SAMPLE_CASE_NOTES,
        restrictivePractices: seed.SAMPLE_RESTRICTIVE_PRACTICES,
        incidents: seed.SAMPLE_INCIDENTS,
        leads: seed.SAMPLE_LEADS,
        crmTasks: seed.INITIAL_CRM_TASKS,
        practitioners: seed.SAMPLE_PRACTITIONERS,
        abcLogs: seed.SAMPLE_ABC_LOGS,
        bsp: seed.SAMPLE_BSP_DOCUMENTS[0] || seed.INITIAL_BSP,
        bspPlans: seed.SAMPLE_BSP_DOCUMENTS,
        bspDocuments: seed.SAMPLE_BSP_DOCUMENTS,
        claims: seed.SAMPLE_CLAIMS,
        billingClaims: seed.SAMPLE_CLAIMS,
        supportItems: seed.OFFICIAL_2026_NDIS_PRICE_GUIDE,
        auditLogs: seed.INITIAL_AUDIT_LOGS,
        notifications: seed.SAMPLE_NOTIFICATIONS,
        scheduledShifts: []
      });
      get().addAuditLog(
        'RESTORE_DEMO_DATA',
        'DatabaseEngine',
        'db-root',
        `Loaded sample NDIS clinical practice dataset (${seed.SAMPLE_CLIENTS.length} participants, ${seed.SAMPLE_CASE_NOTES.length} signed notes, ${seed.SAMPLE_CLAIMS.length} claims)`
      );
      get().addNotification({
        title: 'Sample NDIS Practice Dataset Loaded',
        message: 'Populated 3 active participants, clinical notes, ABC logs, BSPs, and PRODA claims for immediate exploration.',
        type: 'compliance',
        severity: 'low'
      });
    });
  },

  exportFullDatabaseJSON: () => {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '2026.1-ndis-enterprise',
      app: 'Breakthrough OS - NDIS Business Operating System',
      clients: get().clients,
      caseNotes: get().caseNotes,
      restrictivePractices: get().restrictivePractices,
      incidents: get().incidents,
      billingClaims: get().billingClaims,
      crmLeads: get().leads,
      crmTasks: get().crmTasks,
      practitioners: get().practitioners
    };
    return JSON.stringify(data, null, 2);
  },

  resetToDefaultData: () => {
    get().loadDemoData();
  },

  loadFromFirestore: async () => {
    await get().syncWithFirestore();
  },

  syncWithFirestore: async () => {
    set({ syncStatus: 'syncing' });
    try {
      const [
        fetchedClients,
        fetchedCaseNotes,
        fetchedClaims,
        fetchedIncidents,
        fetchedRP,
        fetchedABC,
        fetchedBSP,
        fetchedLeads,
        fetchedTasks,
        fetchedPracs,
        fetchedCompanyDocs,
        fetchedSupportItems,
        fetchedAuditLogs,
        fetchedShifts,
        fetchedUsers,
        fetchedNotifications
      ] = await Promise.all([
        fetchClients().catch(() => []),
        fetchCaseNotes().catch(() => []),
        fetchBillingClaims().catch(() => []),
        fetchIncidents().catch(() => []),
        fetchRestrictivePractices().catch(() => []),
        fetchABCLogs().catch(() => []),
        fetchBSPDocuments().catch(() => []),
        fetchCRMLeads().catch(() => []),
        fetchCRMTasks().catch(() => []),
        fetchPractitioners().catch(() => []),
        fetchCompanyDocuments().catch(() => []),
        fetchSupportItems().catch(() => []),
        fetchAuditLogs().catch(() => []),
        fetchScheduledShifts().catch(() => []),
        fetchUsers().catch(() => []),
        fetchNotifications().catch(() => [])
      ]);

      const seed = await import('@/lib/seedData');
      const { purgeMockDataFromFirestore } = await import('@/lib/firestoreService');
      purgeMockDataFromFirestore().catch(() => {});

      const LEGACY_MOCK_CLIENT_IDS = new Set([
        'cli-1',
        'cli-2',
        'cli-3',
        'cli-4',
        'cli-5',
        'cli-sample-01',
        'cli-sample-02',
        'cli-sample-03'
      ]);
      const MOCK_PRACTITIONER_IDS = new Set(['prac-201', 'prac-202', 'prac-203', 'prac-204']);
      const MOCK_PRACTITIONER_NAMES = new Set([
        'Dr. Sarah Jenkins',
        'Marcus Vance',
        'Elena Rostova',
        'Sarah Davies'
      ]);
      const MOCK_DOC_IDS = new Set([
        'comp-doc-fin-02',
        'comp-doc-pol-01',
        'comp-doc-pol-02',
        'comp-doc-hr-01',
        'comp-doc-tpl-01'
      ]);

      const realClients = fetchedClients.filter((c) => {
        if (LEGACY_MOCK_CLIENT_IDS.has(c.id) || String(c.id || '').startsWith('client-mock')) {
          return false;
        }
        return true;
      });

      // Ensure all 22 canonical business participants are present, set to Active status, and stripped of legacy mock assignments/dates/goals
      const canonicalNamesSet = new Set(
        COMPANY_DRIVE_PARTICIPANTS.map((cp) => cp.name.trim().toLowerCase())
      );
      const canonicalNdisSet = new Set(
        COMPANY_DRIVE_PARTICIPANTS.map((cp) => (cp.ndisNumber || '').replace(/[^0-9]/g, ''))
      );

      const clientsToBatchUpsert: Client[] = [];
      const activatedRealClients: Client[] = realClients.map((c) => {
        const cleanNdis = (c.ndisNumber || '').replace(/[^0-9]/g, '');
        const cleanName = (c.name || '').trim().toLowerCase();
        const isCanonical = canonicalNdisSet.has(cleanNdis) || canonicalNamesSet.has(cleanName);

        let needsUpdate = false;
        const nextClient: Client = { ...c };

        if (isCanonical && nextClient.status !== 'Active') {
          nextClient.status = 'Active';
          needsUpdate = true;
        }
        if (
          MOCK_PRACTITIONER_IDS.has(nextClient.primaryPractitionerId || '') ||
          MOCK_PRACTITIONER_NAMES.has(nextClient.primaryPractitionerName || '')
        ) {
          nextClient.primaryPractitionerId = '';
          nextClient.primaryPractitionerName = 'Unassigned';
          nextClient.allocatedPractitionerId = '';
          nextClient.allocatedPractitionerName = 'Unassigned';
          needsUpdate = true;
        }
        if (
          MOCK_PRACTITIONER_IDS.has(nextClient.secondaryPractitionerId || '') ||
          MOCK_PRACTITIONER_NAMES.has(nextClient.secondaryPractitionerName || '')
        ) {
          nextClient.secondaryPractitionerId = '';
          nextClient.secondaryPractitionerName = '';
          needsUpdate = true;
        }
        if (nextClient.planStartDate === '2026-01-01' && nextClient.planEndDate === '2027-01-01') {
          nextClient.planStartDate = 'Not stated';
          nextClient.planEndDate = 'Not stated';
          needsUpdate = true;
        }
        if (
          Array.isArray(nextClient.goals) &&
          nextClient.goals.length === 1 &&
          nextClient.goals[0]?.id === `goal-${cleanNdis}-1`
        ) {
          nextClient.goals = [];
          needsUpdate = true;
        }

        if (needsUpdate) {
          nextClient.updatedAt = new Date().toISOString();
          clientsToBatchUpsert.push(nextClient);
        }
        return nextClient;
      });

      const existingNdisSet = new Set(
        activatedRealClients.map((c) => (c.ndisNumber || '').replace(/[^0-9]/g, '')).filter(Boolean)
      );
      const existingIdSet = new Set(activatedRealClients.map((c) => c.id));
      const missingCanonical: Client[] = COMPANY_DRIVE_PARTICIPANTS.filter(
        (cp) =>
          !existingNdisSet.has((cp.ndisNumber || '').replace(/[^0-9]/g, '')) &&
          !existingIdSet.has(cp.id)
      );

      clientsToBatchUpsert.push(...missingCanonical);
      const mergedClients: Client[] = [...activatedRealClients, ...missingCanonical];

      if (clientsToBatchUpsert.length > 0) {
        createClientsBatch(clientsToBatchUpsert).catch((err) => {
          console.warn('Notice: Could not auto-seed/sanitize canonical business participants to Firestore:', err);
        });
      }

      // Filter out mock practitioners (prac-201..204) and sync verified contact details on real practitioners
      const MOCK_PRAC_PLACEHOLDER_REG = new Set([
        'PRAC-7812051',
        'PRAC-7812062',
        'PRAC-7812073',
        'PRAC-7812084',
        'PRAC-PBS-2026-005',
        'PRAC-PBS-2026-006',
        'PRAC-PBS-2026-007',
        'PRAC-PBS-2026-008'
      ]);
      const realFetchedPracs = fetchedPracs
        .filter((p) => !MOCK_PRACTITIONER_IDS.has(p.id) && !MOCK_PRACTITIONER_NAMES.has(p.name))
        .map((p) => {
          const canonicalPrac = INITIAL_PRACTITIONERS.find(
            (ip) => ip.id === p.id || ip.name.toLowerCase() === (p.name || '').toLowerCase()
          );
          if (canonicalPrac) {
            const hasPlaceholderReg = MOCK_PRAC_PLACEHOLDER_REG.has(p.ndisRegistrationNumber || '');
            const needsContactSync =
              !p.email ||
              p.email === 'Not stated' ||
              p.email.endsWith('@breakthrough.org.au') ||
              !p.phone ||
              p.phone === 'Not stated' ||
              p.phone.startsWith('0411 200') ||
              p.phone.startsWith('0414 501');

            if (hasPlaceholderReg) {
              createPractitioner(canonicalPrac).catch(() => {});
              return canonicalPrac;
            }
            if (needsContactSync) {
              const updatedPrac = {
                ...p,
                email: canonicalPrac.email,
                phone: canonicalPrac.phone,
                pbsRegistrationLevel: canonicalPrac.pbsRegistrationLevel,
                position: canonicalPrac.position,
                role: canonicalPrac.role
              };
              createPractitioner(updatedPrac).catch(() => {});
              return updatedPrac;
            }
          }
          return p;
        });

      const existingPracIds = new Set(realFetchedPracs.map((p) => p.id));
      const missingPracs = INITIAL_PRACTITIONERS.filter((ip) => !existingPracIds.has(ip.id));
      const mergedPracs = [...realFetchedPracs, ...missingPracs];
      if (missingPracs.length > 0) {
        for (const mp of missingPracs) {
          createPractitioner(mp).catch(() => {});
        }
      }

      // Filter out mock company documents
      const realFetchedCompanyDocs = fetchedCompanyDocs.filter((d) => !MOCK_DOC_IDS.has(d.id));
      const existingDocIds = new Set(realFetchedCompanyDocs.map((d) => d.id));
      const missingCompanyDocs = INITIAL_COMPANY_DOCUMENTS.filter((idDoc) => !existingDocIds.has(idDoc.id));
      const mergedCompanyDocs = [...realFetchedCompanyDocs, ...missingCompanyDocs];
      if (missingCompanyDocs.length > 0) {
        for (const md of missingCompanyDocs) {
          createCompanyDocument(md).catch(() => {});
        }
      }

      // Filter out sample clinical/financial records
      const cleanCaseNotes = fetchedCaseNotes.filter((n) => !String(n.id || '').startsWith('cn-sample-'));
      const cleanClaims = fetchedClaims.filter((c) => !String(c.id || '').startsWith('clm-sample-'));
      const cleanIncidents = fetchedIncidents.filter((i) => !String(i.id || '').startsWith('inc-sample-'));
      const cleanRP = fetchedRP.filter((r) => !String(r.id || '').startsWith('rp-sample-'));
      const cleanABC = fetchedABC.filter((a) => !String(a.id || '').startsWith('abc-sample-'));
      const cleanBSP = fetchedBSP.filter((b) => !String(b.id || '').startsWith('bsp-sample-'));
      const cleanLeads = fetchedLeads.filter((l) => !String(l.id || '').startsWith('lead-sample-'));
      const cleanNotifications = fetchedNotifications.filter((n) => !String(n.id || '').startsWith('notif-sample-'));
      const MOCK_USER_IDS = new Set(['user-director', 'user-specialist', 'user-auditor', 'user-coordinator']);
      const cleanUsers = fetchedUsers.filter((u) => !MOCK_USER_IDS.has(u.id) && !MOCK_PRACTITIONER_NAMES.has(u.name));

      // Merge supportItems with OFFICIAL_2026_NDIS_PRICE_GUIDE so enriched fields and new codes are always available
      const existingItemCodes = new Set(fetchedSupportItems.map((si) => si.code));
      const missingSupportItems = seed.OFFICIAL_2026_NDIS_PRICE_GUIDE.filter(
        (guideItem) => !existingItemCodes.has(guideItem.code)
      );
      const enrichedFetchedSupportItems = fetchedSupportItems.map((si) => {
        const canonicalItem = seed.OFFICIAL_2026_NDIS_PRICE_GUIDE.find((g) => g.code === si.code);
        return canonicalItem ? { ...canonicalItem, ...si, remotePricePerUnit: si.remotePricePerUnit ?? canonicalItem.remotePricePerUnit, veryRemotePricePerUnit: si.veryRemotePricePerUnit ?? canonicalItem.veryRemotePricePerUnit, registrationGroup: si.registrationGroup ?? canonicalItem.registrationGroup, description: si.description ?? canonicalItem.description, travelClaimable: si.travelClaimable ?? canonicalItem.travelClaimable, nonFaceToFaceClaimable: si.nonFaceToFaceClaimable ?? canonicalItem.nonFaceToFaceClaimable } : si;
      });
      const mergedSupportItems = [...enrichedFetchedSupportItems, ...missingSupportItems];

      set({
        clients: mergedClients,
        selectedClientId: get().selectedClientId || mergedClients[0]?.id || null,
        caseNotes: cleanCaseNotes,
        billingClaims: cleanClaims,
        claims: cleanClaims,
        incidents: cleanIncidents,
        restrictivePractices: cleanRP,
        abcLogs: cleanABC,
        bspDocuments: cleanBSP,
        bspPlans: cleanBSP,
        bsp: cleanBSP[0] || null,
        leads: cleanLeads,
        crmTasks: fetchedTasks,
        practitioners: mergedPracs,
        companyDocuments: mergedCompanyDocs,
        supportItems: mergedSupportItems.length > 0 ? mergedSupportItems : seed.OFFICIAL_2026_NDIS_PRICE_GUIDE,
        auditLogs: fetchedAuditLogs,
        notifications: cleanNotifications,
        scheduledShifts: fetchedShifts,
        users: cleanUsers.length > 0 ? cleanUsers : seed.INITIAL_USERS,
        isUsingMockData: false,
        syncStatus: 'synced',
        lastSyncTime: new Date().toISOString()
      });
    } catch (error) {
      console.warn('Failed to sync with Firestore, operating in cached mode:', error);
      set({ syncStatus: 'offline' });
    }
  },

  startRealtimeListeners: () => {
    // Tear down any existing listeners first (idempotent)
    get().stopRealtimeListeners();

    const errHandler = (err: Error) => {
      console.warn('[Realtime] Firestore listener error, operating from cache:', err.message);
      set({ syncStatus: 'offline' });
    };

    const canonicalNamesSet = new Set(
      COMPANY_DRIVE_PARTICIPANTS.map((cp) => cp.name.trim().toLowerCase())
    );
    const canonicalNdisSet = new Set(
      COMPANY_DRIVE_PARTICIPANTS.map((cp) => (cp.ndisNumber || '').replace(/[^0-9]/g, ''))
    );
    const LEGACY_MOCK_CLIENT_IDS = new Set([
      'cli-1',
      'cli-2',
      'cli-3',
      'cli-4',
      'cli-5',
      'cli-sample-01',
      'cli-sample-02',
      'cli-sample-03'
    ]);
    const MOCK_PRACTITIONER_IDS = new Set(['prac-201', 'prac-202', 'prac-203', 'prac-204']);
    const MOCK_PRACTITIONER_NAMES = new Set([
      'Dr. Sarah Jenkins',
      'Marcus Vance',
      'Elena Rostova',
      'Sarah Davies'
    ]);
    const MOCK_DOC_IDS = new Set([
      'comp-doc-fin-02',
      'comp-doc-pol-01',
      'comp-doc-pol-02',
      'comp-doc-hr-01',
      'comp-doc-tpl-01'
    ]);

    _unsubClients = subscribeToClients((clients) => {
      const filteredClients = clients.filter(
        (c) => !LEGACY_MOCK_CLIENT_IDS.has(c.id) && !String(c.id || '').startsWith('client-mock')
      );
      const normalizedClients = filteredClients.map((c) => {
        const cleanNdis = (c.ndisNumber || '').replace(/[^0-9]/g, '');
        const cleanName = (c.name || '').trim().toLowerCase();
        const next: Client = { ...c };
        if (
          (canonicalNdisSet.has(cleanNdis) || canonicalNamesSet.has(cleanName)) &&
          next.status !== 'Active'
        ) {
          next.status = 'Active';
        }
        if (
          MOCK_PRACTITIONER_IDS.has(next.primaryPractitionerId || '') ||
          MOCK_PRACTITIONER_NAMES.has(next.primaryPractitionerName || '')
        ) {
          next.primaryPractitionerId = '';
          next.primaryPractitionerName = 'Unassigned';
          next.allocatedPractitionerId = '';
          next.allocatedPractitionerName = 'Unassigned';
        }
        if (
          MOCK_PRACTITIONER_IDS.has(next.secondaryPractitionerId || '') ||
          MOCK_PRACTITIONER_NAMES.has(next.secondaryPractitionerName || '')
        ) {
          next.secondaryPractitionerId = '';
          next.secondaryPractitionerName = '';
        }
        if (next.planStartDate === '2026-01-01' && next.planEndDate === '2027-01-01') {
          next.planStartDate = 'Not stated';
          next.planEndDate = 'Not stated';
        }
        if (
          Array.isArray(next.goals) &&
          next.goals.length === 1 &&
          next.goals[0]?.id === `goal-${cleanNdis}-1`
        ) {
          next.goals = [];
        }
        return next;
      });
      const existingNdisSet = new Set(
        normalizedClients.map((c) => (c.ndisNumber || '').replace(/[^0-9]/g, '')).filter(Boolean)
      );
      const existingIdSet = new Set(normalizedClients.map((c) => c.id));
      const missingCanonical = COMPANY_DRIVE_PARTICIPANTS.filter(
        (cp) =>
          !existingNdisSet.has((cp.ndisNumber || '').replace(/[^0-9]/g, '')) &&
          !existingIdSet.has(cp.id)
      );
      const merged = [...normalizedClients, ...missingCanonical];
      set({
        clients: merged,
        selectedClientId: get().selectedClientId || merged[0]?.id || null,
        syncStatus: 'synced',
        lastSyncTime: new Date().toISOString()
      });
    }, errHandler);

    _unsubCaseNotes = subscribeToCaseNotes((caseNotes) => {
      set({ caseNotes: caseNotes.filter((n) => !String(n.id || '').startsWith('cn-sample-')) });
    }, errHandler);

    _unsubBillingClaims = subscribeToBillingClaims((billingClaims) => {
      const cleaned = billingClaims.filter((c) => !String(c.id || '').startsWith('clm-sample-'));
      set({ billingClaims: cleaned, claims: cleaned });
    }, errHandler);

    _unsubIncidents = subscribeToIncidents((incidents) => {
      set({ incidents: incidents.filter((i) => !String(i.id || '').startsWith('inc-sample-')) });
    }, errHandler);

    _unsubRP = subscribeToRestrictivePractices((restrictivePractices) => {
      set({
        restrictivePractices: restrictivePractices.filter((r) => !String(r.id || '').startsWith('rp-sample-'))
      });
    }, errHandler);

    _unsubABCLogs = subscribeToABCLogs((abcLogs) => {
      set({ abcLogs: abcLogs.filter((a) => !String(a.id || '').startsWith('abc-sample-')) });
    }, errHandler);

    _unsubBSPDocuments = subscribeToBSPDocuments((bspDocuments) => {
      const cleaned = bspDocuments.filter((b) => !String(b.id || '').startsWith('bsp-sample-'));
      set({
        bspDocuments: cleaned,
        bspPlans: cleaned,
        ...(cleaned.length > 0 ? { bsp: cleaned[0] } : {})
      });
    }, errHandler);

    _unsubCRMLeads = subscribeToCRMLeads((leads) => {
      set({ leads: leads.filter((l) => !String(l.id || '').startsWith('lead-sample-')) });
    }, errHandler);

    _unsubCRMTasks = subscribeToCRMTasks((crmTasks) => {
      set({ crmTasks });
    }, errHandler);

    _unsubPractitioners = subscribeToPractitioners((practitioners) => {
      const cleanPracs = practitioners
        .filter((p) => !MOCK_PRACTITIONER_IDS.has(p.id) && !MOCK_PRACTITIONER_NAMES.has(p.name))
        .map((p) => {
          const canonicalPrac = INITIAL_PRACTITIONERS.find(
            (ip) => ip.id === p.id || ip.name.toLowerCase() === (p.name || '').toLowerCase()
          );
          if (
            canonicalPrac &&
            (!p.email || p.email === 'Not stated' || !p.phone || p.phone === 'Not stated')
          ) {
            return {
              ...p,
              email: canonicalPrac.email,
              phone: canonicalPrac.phone,
              pbsRegistrationLevel: canonicalPrac.pbsRegistrationLevel
            };
          }
          return p;
        });
      const existingIds = new Set(cleanPracs.map((p) => p.id));
      const missing = INITIAL_PRACTITIONERS.filter((ip) => !existingIds.has(ip.id));
      if (missing.length > 0) {
        for (const mp of missing) {
          createPractitioner(mp).catch(() => {});
        }
      }
      set({ practitioners: [...cleanPracs, ...missing] });
    }, errHandler);

    _unsubCompanyDocuments = subscribeToCompanyDocuments((companyDocuments) => {
      const cleanDocs = companyDocuments.filter((d) => !MOCK_DOC_IDS.has(d.id));
      const existingIds = new Set(cleanDocs.map((d) => d.id));
      const missing = INITIAL_COMPANY_DOCUMENTS.filter((idDoc) => !existingIds.has(idDoc.id));
      set({ companyDocuments: [...cleanDocs, ...missing] });
    }, errHandler);

    _unsubSupportItems = subscribeToSupportItems((supportItems) => {
      import('@/lib/seedData').then((seed) => {
        const existingCodes = new Set(supportItems.map((si) => si.code));
        const missing = seed.OFFICIAL_2026_NDIS_PRICE_GUIDE.filter((g) => !existingCodes.has(g.code));
        const enriched = supportItems.map((si) => {
          const canonical = seed.OFFICIAL_2026_NDIS_PRICE_GUIDE.find((g) => g.code === si.code);
          return canonical ? { ...canonical, ...si } : si;
        });
        set({ supportItems: [...enriched, ...missing] });
      });
    }, errHandler);

    _unsubAuditLogs = subscribeToAuditLogs((auditLogs) => {
      set({ auditLogs });
    }, errHandler);

    _unsubScheduledShifts = subscribeToScheduledShifts((scheduledShifts) => {
      set({ scheduledShifts });
    }, errHandler);

    _unsubUsers = subscribeToUsers((users) => {
      const MOCK_USER_IDS = new Set(['user-director', 'user-specialist', 'user-auditor', 'user-coordinator']);
      const cleanUsers = users.filter((u) => !MOCK_USER_IDS.has(u.id) && !MOCK_PRACTITIONER_NAMES.has(u.name));
      set({ users: cleanUsers });
    }, errHandler);

    _unsubNotifications = subscribeToNotifications((notifications) => {
      set({
        notifications: notifications.filter((n) => !String(n.id || '').startsWith('notif-sample-'))
      });
    }, errHandler);

    set({ syncStatus: 'synced' });
  },

  stopRealtimeListeners: () => {
    if (_unsubClients) { _unsubClients(); _unsubClients = null; }
    if (_unsubCaseNotes) { _unsubCaseNotes(); _unsubCaseNotes = null; }
    if (_unsubBillingClaims) { _unsubBillingClaims(); _unsubBillingClaims = null; }
    if (_unsubIncidents) { _unsubIncidents(); _unsubIncidents = null; }
    if (_unsubRP) { _unsubRP(); _unsubRP = null; }
    if (_unsubABCLogs) { _unsubABCLogs(); _unsubABCLogs = null; }
    if (_unsubBSPDocuments) { _unsubBSPDocuments(); _unsubBSPDocuments = null; }
    if (_unsubCRMLeads) { _unsubCRMLeads(); _unsubCRMLeads = null; }
    if (_unsubCRMTasks) { _unsubCRMTasks(); _unsubCRMTasks = null; }
    if (_unsubPractitioners) { _unsubPractitioners(); _unsubPractitioners = null; }
    if (_unsubCompanyDocuments) { _unsubCompanyDocuments(); _unsubCompanyDocuments = null; }
    if (_unsubSupportItems) { _unsubSupportItems(); _unsubSupportItems = null; }
    if (_unsubAuditLogs) { _unsubAuditLogs(); _unsubAuditLogs = null; }
    if (_unsubScheduledShifts) { _unsubScheduledShifts(); _unsubScheduledShifts = null; }
    if (_unsubUsers) { _unsubUsers(); _unsubUsers = null; }
    if (_unsubNotifications) { _unsubNotifications(); _unsubNotifications = null; }
  }
});
