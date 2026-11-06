import { StateCreator } from 'zustand';
import { Incident, IncidentWorkflowEntry } from '@/types';
import {
  createIncident as createIncidentDoc,
  updateIncident as updateIncidentDoc,
  deleteIncident as deleteIncidentDoc
} from '@/lib/firestoreService';
import { IncidentsSlice, RootStore } from '../types';

export const createIncidentsSlice: StateCreator<RootStore, [], [], IncidentsSlice> = (set, get) => ({
  incidents: [],

  addIncident: (incidentData) => {
    const nowIso = new Date().toISOString();
    const actorName =
      get().currentUser?.name || incidentData.reportedBy || 'Breakthrough Practitioner';
    const actorRole = get().currentUser?.role || 'PRACTITIONER';
    const initialStatus = incidentData.status || 'Filed / Triage';

    const initialHistoryEntry: IncidentWorkflowEntry = {
      id: `wf-${Date.now()}-1`,
      stage: initialStatus,
      timestamp: nowIso,
      actorName,
      actorRole,
      note: `Incident filed (${incidentData.type || incidentData.category || 'Clinical/Behavioural'}) — Assigned to ${
        incidentData.assignedManagerName || 'Clinical Director (Shivandhari Persad)'
      }.`,
      automatedNotificationSent: true
    };

    const newIncident: Incident = {
      id: (incidentData as Incident).id || `inc-${Date.now().toString().slice(-4)}`,
      createdAt: nowIso,
      status: initialStatus,
      assignedManagerName:
        incidentData.assignedManagerName || 'Shivandhari Persad (Clinical Director)',
      assignedManagerEmail:
        incidentData.assignedManagerEmail || 'support@breakthroughconsult.com.au',
      managementNotifiedAt: nowIso,
      workflowHistory:
        incidentData.workflowHistory && incidentData.workflowHistory.length > 0
          ? incidentData.workflowHistory
          : [initialHistoryEntry],
      ...incidentData
    } as Incident;

    set((state) => ({ incidents: [newIncident, ...state.incidents] }));
    get().addAuditLog(
      'CREATE',
      'Incident',
      newIncident.id,
      `Filed ${newIncident.severity} incident (${newIncident.type || 'General'}) for ${newIncident.clientName}`
    );

    createIncidentDoc(newIncident).catch((err) => {
      console.warn('Firestore write failed for addIncident, queueing offline:', err);
      get().queueOfflineDelta('CREATE', 'Incident', newIncident.id, newIncident);
    });

    const isCritical =
      newIncident.severity?.toLowerCase().includes('critical') || !!newIncident.isNdisReportable;
    const isHigh = newIncident.severity?.toLowerCase().includes('high') || isCritical;
    const actionText = (
      newIncident.immediateActionTaken ||
      newIncident.actionTaken ||
      'Immediate safety protocol enacted'
    ).slice(0, 110);

    get().addNotification({
      title: isCritical
        ? `🚨 CRITICAL / 24H REPORTABLE INCIDENT: ${newIncident.clientName}`
        : isHigh
        ? `⚠️ HIGH SEVERITY INCIDENT FILED: ${newIncident.clientName}`
        : `📋 INCIDENT FILED (${newIncident.type || 'Clinical'}): ${newIncident.clientName}`,
      message: `${newIncident.severity} ${
        newIncident.type || ''
      } incident filed by ${actorName} for ${newIncident.clientName}. Stage: ${initialStatus}. Immediate action: "${actionText}". Management (${
        newIncident.assignedManagerName
      }) automatically notified.`,
      type: 'incident',
      severity: isHigh ? 'high' : 'medium',
      linkTab: 'incidents'
    });

    get().addAuditLog(
      'INCIDENT_MANAGEMENT_TRIGGER',
      'Incident',
      newIncident.id,
      `Automated Management Notification dispatched to ${newIncident.assignedManagerName} for incident ${newIncident.id} (${newIncident.clientName})`
    );
  },

  updateIncident: (id, updates) => {
    const existing = get().incidents.find((inc) => inc.id === id);
    const nowIso = new Date().toISOString();
    const actorName = get().currentUser?.name || 'Clinical Supervisor';
    const actorRole = get().currentUser?.role || 'ADMIN';

    let nextHistory = existing?.workflowHistory ? [...existing.workflowHistory] : [];
    const statusChanged = updates.status && existing && updates.status !== existing.status;

    if (statusChanged && updates.status) {
      const entry: IncidentWorkflowEntry = {
        id: `wf-${Date.now()}`,
        stage: updates.status,
        timestamp: nowIso,
        actorName,
        actorRole,
        note:
          updates.resolutionSummary ||
          updates.correctiveActions ||
          updates.rootCauseAnalysis ||
          `Workflow stage advanced from "${existing?.status}" to "${updates.status}".`,
        automatedNotificationSent: true
      };
      nextHistory = [...nextHistory, entry];
    }

    const mergedUpdates: Partial<Incident> = {
      ...updates,
      ...(statusChanged ? { workflowHistory: nextHistory, managementNotifiedAt: nowIso } : {})
    };

    set((state) => ({
      incidents: state.incidents.map((inc) =>
        inc.id === id ? { ...inc, ...mergedUpdates } : inc
      )
    }));

    get().addAuditLog(
      'UPDATE',
      'Incident',
      id,
      statusChanged
        ? `Incident workflow transitioned to "${updates.status}" by ${actorName}`
        : `Updated incident investigation / governance record (${id})`
    );

    if (statusChanged && existing) {
      const isResolved =
        updates.status === 'Resolved' ||
        updates.status === 'Closed' ||
        updates.status === 'Resolved / Closed';
      get().addNotification({
        title: isResolved
          ? `✅ Incident Resolved: ${existing.clientName} (${id})`
          : `🔄 Incident Status Updated: ${existing.clientName} → ${updates.status}`,
        message: `${actorName} updated incident ${id} (${existing.type || 'Clinical'}) for ${
          existing.clientName
        } to "${updates.status}". ${
          updates.resolutionSummary ? `Outcome: ${updates.resolutionSummary}` : 'Management notified.'
        }`,
        type: 'incident',
        severity: isResolved ? 'low' : 'medium',
        linkTab: 'incidents'
      });
    }

    updateIncidentDoc(id, mergedUpdates).catch((err) => {
      console.warn('Firestore write failed for updateIncident, queueing offline:', err);
      get().queueOfflineDelta('UPDATE', 'Incident', id, mergedUpdates);
    });
  },

  updateIncidentStatus: (id, status) => {
    get().updateIncident(id, { status });
  },

  deleteIncident: (id) => {
    set((state) => ({
      incidents: state.incidents.filter((inc) => inc.id !== id)
    }));
    get().addAuditLog('DELETE', 'Incident', id, `Archived incident record`);

    deleteIncidentDoc(id).catch((err) => {
      console.warn('Firestore write failed for deleteIncident, queueing offline:', err);
      get().queueOfflineDelta('DELETE', 'Incident', id, { id });
    });
  }
});

