import { StateCreator } from 'zustand';
import { AuditLog, AppNotification } from '@/types';
import { createAuditLog as createAuditLogDoc } from '@/lib/firestoreService';
import { INITIAL_AUDIT_LOGS, INITIAL_NOTIFICATIONS } from '@/lib/seedData';
import {
  computeFieldChanges,
  classifyNdisAuditEvent,
  computeAuditIntegrityHash
} from '@/services/ndisComplianceAuditService';
import { AuditSlice, RootStore } from '../types';

export const createAuditSlice: StateCreator<RootStore, [], [], AuditSlice> = (set, get) => ({
  auditLogs: INITIAL_AUDIT_LOGS,
  notifications: INITIAL_NOTIFICATIONS,

  addAuditLog: (action, entity, entityId, details, meta) => {
    const user = get().currentUser;
    const currentLogs = get().auditLogs || [];
    const previousHash =
      currentLogs[0]?.integrityHash || 'GENESIS_NDIS_AUDIT_CHAIN_0000000000000000';

    const fieldChanges =
      meta?.fieldChanges ||
      computeFieldChanges(meta?.beforeSnapshot, meta?.afterSnapshot);

    const classified = classifyNdisAuditEvent(action, entity, details, fieldChanges);

    const id = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const timestamp = new Date().toISOString();
    const actorId = user?.id || 'sys-user';

    const integrityHash = computeAuditIntegrityHash(
      {
        id,
        timestamp,
        actorId,
        action,
        entity,
        entityId,
        details
      },
      previousHash
    );

    const newLog: AuditLog = {
      id,
      timestamp,
      actorId,
      actorName: user?.name || 'Authorized Practitioner',
      actorRole: user?.role || 'PRACTITIONER',
      userEmail: user?.email,
      action,
      entity,
      entityId,
      auditCategory: meta?.auditCategory || classified.auditCategory,
      category: meta?.auditCategory || classified.auditCategory,
      ndisPracticeStandard: meta?.ndisPracticeStandard || classified.ndisPracticeStandard,
      participantId: meta?.participantId,
      participantName: meta?.participantName,
      ndisNumber: meta?.ndisNumber,
      details,
      reasonForChange: meta?.reasonForChange,
      fieldChanges: fieldChanges.length > 0 ? fieldChanges : undefined,
      beforeSnapshot: meta?.beforeSnapshot || undefined,
      afterSnapshot: meta?.afterSnapshot || undefined,
      previousHash,
      integrityHash,
      severity: meta?.severity || classified.severity,
      ipAddress: '127.0.0.1'
    };

    set((state) => ({ auditLogs: [newLog, ...state.auditLogs] }));

    createAuditLogDoc(newLog).catch(() => {
      // Audit log write failure in firestore is non-blocking
    });
  },

  addNotification: (notifData) => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
      ...notifData
    };
    set((state) => ({ notifications: [newNotif, ...state.notifications] }));
  },

  markNotificationRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    }));
  },

  markNotificationsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true }))
    }));
  },

  dismissNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }));
  }
});
