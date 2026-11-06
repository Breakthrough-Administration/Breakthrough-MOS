'use client';

import React, { useMemo } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { classifyNdisAuditEvent } from '@/services/ndisComplianceAuditService';
import {
  ShieldCheck,
  Download,
  AlertTriangle,
  CheckCircle2,
  History,
  FileText,
  DollarSign,
  FileCheck2,
  Users,
  ArrowUpRight
} from 'lucide-react';
import { NDISCommissionAuditEvidencePackBuilder } from './NextGenPracticeEnhancements';

export const ComplianceDashboard: React.FC = () => {
  const {
    clients,
    practitioners,
    caseNotes,
    supportItems,
    incidents,
    restrictivePractices,
    auditLogs,
    setActiveTab
  } = useManagementStore();

  // Live Evidence-Based Audit Readiness Calculations (No Fabricated Percentages)
  const readinessStats = useMemo(() => {
    const totalClients = clients.length;
    const clientsWithValidNdis = clients.filter((c) =>
      /^\d{9}$/.test((c.ndisNumber || '').replace(/\s+/g, ''))
    ).length;
    const clientsWithBudgetOrAgreement = clients.filter(
      (c) =>
        (c.allocatedBudget && c.allocatedBudget > 0) ||
        (c.totalBudget && c.totalBudget > 0) ||
        (c.serviceAgreementStatus && c.serviceAgreementStatus !== 'Not stated')
    ).length;
    const clientsWithAssignedPractitioner = clients.filter(
      (c) => Boolean(c.primaryPractitionerId && c.primaryPractitionerName !== 'Unassigned')
    ).length;

    const totalPracs = practitioners.length;
    const pracsWithVerifiedContact = practitioners.filter(
      (p) => p.email && p.email !== 'Not stated' && p.phone && p.phone !== 'Not stated'
    ).length;
    const pracsWithScreeningId = practitioners.filter(
      (p) => p.workerScreeningId && p.workerScreeningId !== 'Not stated'
    ).length;

    const ndisIdPct = totalClients > 0 ? Math.round((clientsWithValidNdis / totalClients) * 100) : 0;
    const agreementPct =
      totalClients > 0 ? Math.round((clientsWithBudgetOrAgreement / totalClients) * 100) : 0;
    const caseloadPct =
      totalClients > 0 ? Math.round((clientsWithAssignedPractitioner / totalClients) * 100) : 0;
    const staffContactPct =
      totalPracs > 0 ? Math.round((pracsWithVerifiedContact / totalPracs) * 100) : 0;
    const staffScreeningPct =
      totalPracs > 0 ? Math.round((pracsWithScreeningId / totalPracs) * 100) : 0;

    return {
      totalClients,
      clientsWithValidNdis,
      clientsWithBudgetOrAgreement,
      clientsWithAssignedPractitioner,
      totalPracs,
      pracsWithVerifiedContact,
      pracsWithScreeningId,
      ndisIdPct,
      agreementPct,
      caseloadPct,
      staffContactPct,
      staffScreeningPct
    };
  }, [clients, practitioners]);

  const recentComplianceLogs = useMemo(() => {
    return auditLogs.slice(0, 8).map((log) => {
      const classified = classifyNdisAuditEvent(log.action, log.entity, log.details, log.fieldChanges);
      return {
        ...log,
        auditCategory: log.auditCategory || classified.auditCategory,
        ndisPracticeStandard: log.ndisPracticeStandard || classified.ndisPracticeStandard
      };
    });
  }, [auditLogs]);

  const handleExportAuditDossier = () => {
    const data = {
      practice: 'Breakthrough Coaching & Consulting',
      exportedAt: new Date().toISOString(),
      calculationBasis: 'Calculated directly from supplied Firestore participant, practitioner, clinical note, and audit log records.',
      metrics: {
        activeParticipantsCount: readinessStats.totalClients,
        participantsWithVerified9DigitNdisNumber: `${readinessStats.clientsWithValidNdis} / ${readinessStats.totalClients} (${readinessStats.ndisIdPct}%)`,
        participantsWithRecordedBudgetOrServiceAgreement: `${readinessStats.clientsWithBudgetOrAgreement} / ${readinessStats.totalClients} (${readinessStats.agreementPct}%)`,
        participantsWithAssignedPractitioner: `${readinessStats.clientsWithAssignedPractitioner} / ${readinessStats.totalClients} (${readinessStats.caseloadPct}%)`,
        practitionersWithVerifiedContact: `${readinessStats.pracsWithVerifiedContact} / ${readinessStats.totalPracs} (${readinessStats.staffContactPct}%)`,
        practitionersWithWorkerScreeningIdRecorded: `${readinessStats.pracsWithScreeningId} / ${readinessStats.totalPracs} (${readinessStats.staffScreeningPct}%)`,
        clinicalCaseNotesCount: caseNotes.length,
        supportItemsCatalogueCount: supportItems.length,
        incidentsLogged: incidents.length,
        restrictivePracticesCount: restrictivePractices.length,
        complianceAuditTrailEventsCount: auditLogs.length
      },
      recentAuditTrail: recentComplianceLogs
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Breakthrough_NDIS_Audit_Dossier_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            NDIS Quality, Safeguards &amp; Evidence-Based Audit Readiness
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Live compliance metrics calculated strictly from supplied participant records, service agreements, practitioner credentials, and the automated NDIS compliance audit logger
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('audit-logs')}
            className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
          >
            <History className="w-4 h-4 text-teal-400" />
            <span>Open Compliance Audit Trail ({auditLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={handleExportAuditDossier}
            className="px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-teal-600/20 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export Evidence Dossier
          </button>
        </div>
      </div>

      {/* Evidence-Based Readiness Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Core Module 1 &amp; 3: Participant NDIS IDs &amp; Service Agreements
                </h3>
                <span className="text-xs text-slate-400">
                  Input: {readinessStats.totalClients} Active Participant Records
                </span>
              </div>
            </div>
            <span className="text-lg font-extrabold text-teal-400 font-mono">
              {readinessStats.clientsWithBudgetOrAgreement} / {readinessStats.totalClients}
            </span>
          </div>

          <div className="text-xs text-slate-300 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Verified 9-Digit NDIS Numbers:</span>
              <span>
                {readinessStats.clientsWithValidNdis} / {readinessStats.totalClients} ({readinessStats.ndisIdPct}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span>Service Agreement / Plan Budget Entered:</span>
              <span>
                {readinessStats.clientsWithBudgetOrAgreement} / {readinessStats.totalClients} ({readinessStats.agreementPct}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span>Primary Practitioner Assigned:</span>
              <span>
                {readinessStats.clientsWithAssignedPractitioner} / {readinessStats.totalClients} ({readinessStats.caseloadPct}%)
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-teal-500 h-2 rounded-full transition-all"
              style={{ width: `${readinessStats.agreementPct}%` }}
            />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Core Module 2: Practitioner Contacts &amp; NDIS Worker Screening
                </h3>
                <span className="text-xs text-slate-400">
                  Input: {readinessStats.totalPracs} Registered PBS Practitioners
                </span>
              </div>
            </div>
            <span className="text-lg font-extrabold text-teal-400 font-mono">
              {readinessStats.pracsWithVerifiedContact} / {readinessStats.totalPracs}
            </span>
          </div>

          <div className="text-xs text-slate-300 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Verified Email &amp; Phone Recorded:</span>
              <span className="text-emerald-400">
                {readinessStats.pracsWithVerifiedContact} / {readinessStats.totalPracs} ({readinessStats.staffContactPct}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span>NDIS Worker Screening ID Entered:</span>
              <span className={readinessStats.pracsWithScreeningId < readinessStats.totalPracs ? 'text-amber-400' : 'text-emerald-400'}>
                {readinessStats.pracsWithScreeningId} / {readinessStats.totalPracs} ({readinessStats.staffScreeningPct}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span>Clinical Case Notes Logged:</span>
              <span>{caseNotes.length} signed notes</span>
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-teal-500 h-2 rounded-full transition-all"
              style={{ width: `${readinessStats.staffContactPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Live Automated NDIS Compliance Audit Stream */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-teal-400" />
              <span>Automated NDIS Compliance Change-History Stream</span>
            </h2>
            <p className="text-xs text-slate-400">
              Real-time audit trail of changes to Support Items, Participant Service Agreements, and Clinical Notes
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('audit-logs')}
            className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Inspect Full Change-History Diffs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-800">
          {recentComplianceLogs.map((log) => (
            <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30 font-mono text-[10px] font-bold">
                    {log.action}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px] font-bold">
                    {log.auditCategory}
                  </span>
                  {log.fieldChanges && log.fieldChanges.length > 0 && (
                    <span className="text-[10px] font-mono text-emerald-400">
                      {log.fieldChanges.length} field diff(s) recorded
                    </span>
                  )}
                </div>
                <p className="text-slate-200 font-medium">{log.details}</p>
              </div>
              <div className="text-right font-mono text-[11px] text-slate-400 shrink-0">
                <div>{log.actorName || 'Staff'}</div>
                <div>{new Date(log.timestamp).toLocaleTimeString('en-AU')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NDIS Commission Audit Evidence Pack Builder (Core + Module 2A Specialist Behaviour Support) */}
      <NDISCommissionAuditEvidencePackBuilder />
    </div>
  );
};
