'use client';

import React, { useState, useMemo } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { AuditCategory, AuditLog } from '@/types';
import {
  verifyAuditChainIntegrity,
  classifyNdisAuditEvent,
  computeFieldChanges
} from '@/services/ndisComplianceAuditService';
import {
  History,
  ShieldCheck,
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  FileText,
  DollarSign,
  FileCheck2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Users,
  RefreshCw
} from 'lucide-react';

const CATEGORY_TABS: Array<{ id: 'ALL' | AuditCategory; label: string }> = [
  { id: 'ALL', label: 'All Compliance Events' },
  { id: 'Support Item & Price Guide', label: 'Support Items & Price Guide' },
  { id: 'Service Agreement & Funding', label: 'Service Agreements & Funding' },
  { id: 'Clinical Case Note', label: 'Clinical Case Notes' },
  { id: 'Participant Record', label: 'Participant Records' },
  { id: 'Billing & PRODA Claim', label: 'Billing & PRODA Claims' },
  { id: 'Practitioner & HR', label: 'Practitioners & HR' },
  { id: 'Incident & Restrictive Practice', label: 'Incidents & Restrictive Practices' }
];

export const AuditLogsModule: React.FC = () => {
  const { auditLogs, clients, setActiveTab } = useManagementStore();

  const [selectedCategory, setSelectedCategory] = useState<'ALL' | AuditCategory>('ALL');
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});
  const [verificationBanner, setVerificationBanner] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Enrich legacy logs that were saved before auditCategory / fieldChanges were added
  const enrichedLogs = useMemo(() => {
    return auditLogs.map((log) => {
      const classified = classifyNdisAuditEvent(
        log.action,
        log.entity,
        log.details,
        log.fieldChanges
      );
      const computedDiffs =
        log.fieldChanges ||
        computeFieldChanges(log.beforeSnapshot || null, log.afterSnapshot || null);

      return {
        ...log,
        auditCategory: log.auditCategory || (log.category as AuditCategory) || classified.auditCategory,
        ndisPracticeStandard: log.ndisPracticeStandard || classified.ndisPracticeStandard,
        severity: log.severity || classified.severity,
        fieldChanges: computedDiffs
      };
    });
  }, [auditLogs]);

  const chainVerification = useMemo(() => {
    return verifyAuditChainIntegrity(enrichedLogs);
  }, [enrichedLogs]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: enrichedLogs.length,
      'Support Item & Price Guide': 0,
      'Service Agreement & Funding': 0,
      'Clinical Case Note': 0,
      'Participant Record': 0,
      'Billing & PRODA Claim': 0,
      'Practitioner & HR': 0,
      'Incident & Restrictive Practice': 0,
      'System & Security': 0
    };
    for (const log of enrichedLogs) {
      const cat = log.auditCategory || 'System & Security';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [enrichedLogs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedLogs.filter((log) => {
      const matchesCategory =
        selectedCategory === 'ALL' || log.auditCategory === selectedCategory;
      const matchesParticipant =
        selectedParticipantId === 'ALL' ||
        log.participantId === selectedParticipantId ||
        log.entityId === selectedParticipantId;
      const matchesAction =
        actionFilter === 'ALL' || (log.action || '').toUpperCase().includes(actionFilter);
      const matchesQuery =
        !q ||
        (log.details || '').toLowerCase().includes(q) ||
        (log.action || '').toLowerCase().includes(q) ||
        (log.entity || '').toLowerCase().includes(q) ||
        (log.entityId || '').toLowerCase().includes(q) ||
        (log.actorName || '').toLowerCase().includes(q) ||
        (log.participantName || '').toLowerCase().includes(q) ||
        (log.reasonForChange || '').toLowerCase().includes(q) ||
        (log.fieldChanges || []).some(
          (fc) =>
            fc.label.toLowerCase().includes(q) ||
            fc.beforeValue.toLowerCase().includes(q) ||
            fc.afterValue.toLowerCase().includes(q)
        );
      return matchesCategory && matchesParticipant && matchesAction && matchesQuery;
    });
  }, [enrichedLogs, selectedCategory, selectedParticipantId, actionFilter, searchQuery]);

  const handleVerifyIntegrity = () => {
    const res = verifyAuditChainIntegrity(enrichedLogs);
    if (res.isValid) {
      setVerificationBanner(
        `NDIS Compliance Audit Chain Verified: ${enrichedLogs.length} total event(s) inspected (${res.verifiedCount} cryptographic hash-chained entries verified with zero tampering).`
      );
    } else {
      setVerificationBanner(
        `Hash Chain Mismatch Detected at entry ${res.brokenLogId}. Please review Firestore auditLogs collection.`
      );
    }
    setTimeout(() => setVerificationBanner(null), 6000);
  };

  const handleExportAuditCSV = () => {
    const headers = [
      'AuditID',
      'TimestampISO',
      'AuditCategory',
      'Action',
      'Entity',
      'EntityID',
      'ParticipantName',
      'NDISNumber',
      'ActorName',
      'ActorRole',
      'ReasonForChange',
      'FieldChangesCount',
      'FieldChangesSummary',
      'NDISPracticeStandard',
      'IntegrityHash',
      'Details'
    ].join(',');

    const rows = filteredLogs.map((l) => {
      const diffSummary = (l.fieldChanges || [])
        .map((f) => `${f.label}: ${f.beforeValue} -> ${f.afterValue}`)
        .join(' | ');
      return [
        `"${l.id}"`,
        `"${l.timestamp}"`,
        `"${l.auditCategory || ''}"`,
        `"${l.action}"`,
        `"${l.entity || ''}"`,
        `"${l.entityId || ''}"`,
        `"${l.participantName || 'Not stated'}"`,
        `"${l.ndisNumber || 'Not stated'}"`,
        `"${l.actorName || 'System'}"`,
        `"${l.actorRole || ''}"`,
        `"${(l.reasonForChange || 'Standard operational action').replace(/"/g, '""')}"`,
        (l.fieldChanges || []).length,
        `"${diffSummary.replace(/"/g, '""')}"`,
        `"${(l.ndisPracticeStandard || '').replace(/"/g, '""')}"`,
        `"${l.integrityHash || 'LEGACY_ENTRY'}"`,
        `"${(l.details || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Breakthrough_NDIS_Compliance_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAuditJSON = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      organisation: 'Breakthrough Coaching & Consulting',
      complianceFramework: 'NDIS Quality and Safeguards Commission Practice Standards (Core & Module 2A)',
      chainVerificationStatus: chainVerification,
      totalRecords: filteredLogs.length,
      auditTrail: filteredLogs
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Breakthrough_NDIS_Compliance_Audit_Trail_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              Automated NDIS Compliance Audit Logger
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              <Lock className="w-3 h-3" />
              Tamper-Evident Hash Chain: {chainVerification.isValid ? 'VERIFIED' : 'CHECK REQUIRED'}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            NDIS Quality &amp; Safeguards Change-History Audit Trail
          </h1>
          <p className="text-xs text-slate-400 max-w-3xl">
            Automatically captures field-by-field before/after snapshots for all modifications to{' '}
            <strong className="text-slate-200">NDIS Support Items</strong>,{' '}
            <strong className="text-slate-200">Participant Service Agreements &amp; Budgets</strong>, and{' '}
            <strong className="text-slate-200">Clinical Case Notes (SOAP / BIRP / SIMPL)</strong>, persisted in real time to Firebase Firestore (<code className="text-teal-300">auditLogs</code>).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleVerifyIntegrity}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
            <span>Verify Hash Chain</span>
          </button>

          <button
            type="button"
            onClick={handleExportAuditCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>Export Audit CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportAuditJSON}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-teal-950/40 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Commission JSON</span>
          </button>
        </div>
      </div>

      {verificationBanner && (
        <div className="p-4 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-200 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{verificationBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setVerificationBanner(null)}
            className="text-slate-400 hover:text-white text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tracked Domain Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setSelectedCategory('Support Item & Price Guide')}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer space-y-1.5"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider">Support Item Changes</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-white font-mono">
            {categoryCounts['Support Item & Price Guide'] || 0}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">PAPL price caps &amp; rules</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('billing');
              }}
              className="text-teal-400 hover:underline font-semibold"
            >
              Open Catalogue →
            </button>
          </div>
        </div>

        <div
          onClick={() => setSelectedCategory('Service Agreement & Funding')}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/40 transition-all cursor-pointer space-y-1.5"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider">Service Agreements</span>
            <FileCheck2 className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-extrabold text-white font-mono">
            {categoryCounts['Service Agreement & Funding'] || 0}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Budgets &amp; Schedule of Supports</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('budget-monitoring');
              }}
              className="text-teal-400 hover:underline font-semibold"
            >
              Open Budgets →
            </button>
          </div>
        </div>

        <div
          onClick={() => setSelectedCategory('Clinical Case Note')}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition-all cursor-pointer space-y-1.5"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider">Clinical Case Notes</span>
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-extrabold text-white font-mono">
            {categoryCounts['Clinical Case Note'] || 0}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">SOAP/BIRP/SIMPL &amp; amendments</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('case-notes');
              }}
              className="text-teal-400 hover:underline font-semibold"
            >
              Open Notes →
            </button>
          </div>
        </div>

        <div
          onClick={() => setSelectedCategory('ALL')}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer space-y-1.5"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider">Total Audit Events</span>
            <History className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-white font-mono">{enrichedLogs.length}</p>
          <p className="text-[11px] text-emerald-400 font-semibold">
            {chainVerification.chainedCount} cryptographically chained
          </p>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORY_TABS.map((tab) => {
          const active = selectedCategory === tab.id;
          const count = categoryCounts[tab.id] || 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-[10px] font-mono text-slate-300">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search, Participant Filter, and Action Type Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by support item code, participant, field name, before/after value, or reason..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div>
          <select
            value={selectedParticipantId}
            onChange={(e) => setSelectedParticipantId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white cursor-pointer"
          >
            <option value="ALL">All Participants ({clients.length})</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.ndisNumber})
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white cursor-pointer"
          >
            <option value="ALL">All Audit Actions</option>
            <option value="CREATE">CREATE (New Records)</option>
            <option value="UPDATE">UPDATE (Modifications)</option>
            <option value="AMEND">AMEND (Clinical Amendments)</option>
            <option value="SERVICE_AGREEMENT">SERVICE AGREEMENT Events</option>
            <option value="SUPPORT_ITEM">SUPPORT ITEM Events</option>
            <option value="DELETE">DELETE / Void Events</option>
          </select>
        </div>
      </div>

      {/* Audit Log Change-History Cards & Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-teal-400" />
            <span>Change-History Trail ({filteredLogs.length} matching records)</span>
          </h2>
          <span className="text-[11px] text-slate-400">
            Click any entry to inspect field-by-field <strong className="text-slate-200">Before → After</strong> values &amp; NDIS Practice Standard citations
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <History className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm font-bold text-white">No Matching Compliance Audit Records</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Any changes made to NDIS Support Items, Participant Service Agreements &amp; Budgets, or Clinical Case Notes will automatically appear here with full before/after field diffs.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredLogs.map((log) => {
              const isExpanded = Boolean(expandedLogIds[log.id]);
              const diffCount = (log.fieldChanges || []).length;

              return (
                <div key={log.id} className="p-4 hover:bg-slate-800/30 transition-colors space-y-3">
                  <div
                    onClick={() => toggleExpand(log.id)}
                    className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono text-slate-400">
                          {new Date(log.timestamp).toLocaleString('en-AU', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                            log.action.includes('DELETE')
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : log.action.includes('AMEND') || log.action.includes('UPDATE')
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                          }`}
                        >
                          {log.action}
                        </span>

                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                          {log.auditCategory}
                        </span>

                        {log.participantName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            <Users className="w-3 h-3" />
                            {log.participantName}
                            {log.ndisNumber && log.ndisNumber !== 'Not stated' ? ` (#${log.ndisNumber})` : ''}
                          </span>
                        )}

                        {diffCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            {diffCount} field{diffCount === 1 ? '' : 's'} tracked
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-semibold text-white">{log.details}</p>

                      {log.reasonForChange && (
                        <p className="text-[11px] text-amber-300">
                          <strong>Stated Audit Reason:</strong> {log.reasonForChange}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold text-slate-200">
                          {log.actorName || log.userEmail || 'Authorised Staff'}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400">
                          {log.actorRole || 'PRACTITIONER'} · Ref: {log.entityId || 'N/A'}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1"
                      >
                        <span>{isExpanded ? 'Hide Diff' : 'Inspect Diff'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-teal-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-teal-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Field-Level Diff & Governance Metadata */}
                  {isExpanded && (
                    <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 block">
                            NDIS Practice Standard &amp; Regulatory Mapping
                          </span>
                          <span className="text-xs text-slate-200 font-semibold">
                            {log.ndisPracticeStandard}
                          </span>
                        </div>
                        <div className="text-left sm:text-right font-mono text-[10px] text-slate-400">
                          <div>Audit ID: {log.id}</div>
                          <div>
                            Integrity Hash:{' '}
                            <span className="text-emerald-400">
                              {log.integrityHash ? `${log.integrityHash.slice(0, 24)}...` : 'Legacy Record'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {diffCount > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
                            <thead className="bg-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              <tr>
                                <th className="p-2.5 border-b border-slate-800">Field / Attribute</th>
                                <th className="p-2.5 border-b border-slate-800">Previous Value (Before)</th>
                                <th className="p-2.5 border-b border-slate-800 w-8 text-center">→</th>
                                <th className="p-2.5 border-b border-slate-800">Updated Value (After)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                              {(log.fieldChanges || []).map((fc, idx) => (
                                <tr key={`${fc.field}-${idx}`} className="bg-slate-950/60">
                                  <td className="p-2.5 font-sans font-bold text-slate-200">{fc.label}</td>
                                  <td className="p-2.5 text-rose-300/90 break-words max-w-xs">
                                    {fc.beforeValue}
                                  </td>
                                  <td className="p-2.5 text-center text-slate-500">
                                    <ArrowRight className="w-3.5 h-3.5 mx-auto" />
                                  </td>
                                  <td className="p-2.5 text-emerald-300 font-semibold break-words max-w-xs">
                                    {fc.afterValue}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400">
                          Event summary recorded without individual field-level diff payload: {log.details}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
