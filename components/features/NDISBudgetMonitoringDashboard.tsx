'use client';

import React, { useState, useMemo } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { Client } from '@/types';
import {
  DollarSign,
  Activity,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit3,
  RefreshCw,
  ShieldCheck,
  Calculator,
  FileText,
  X
} from 'lucide-react';

interface ParticipantBudgetAudit {
  client: Client;
  statedTotalBudget: number;
  hasStatedBudget: boolean;
  serviceAgreementCommitted: number;
  serviceAgreementCount: number;
  invoicedClaimSpend: number;
  invoicedClaimHours: number;
  claimCount: number;
  unbilledCaseNoteSpend: number;
  unbilledCaseNoteHours: number;
  totalLoggedHours: number;
  caseNoteCount: number;
  rosteredShiftSpend: number;
  rosteredShiftHours: number;
  shiftCount: number;
  actualExpenditure: number;
  projectedExpenditureWithShifts: number;
  remainingFunds: number;
  remainingAfterRostered: number;
  utilizationPct: number;
  status: 'HEALTHY' | 'WATCH' | 'OVER_BUDGET' | 'UNSTATED_BUDGET';
}

export const NDISBudgetMonitoringDashboard: React.FC = () => {
  const {
    clients,
    practitioners,
    caseNotes,
    claims,
    scheduledShifts,
    supportItems,
    syncStatus,
    lastSyncTime,
    updateClient,
    addBillingClaim,
    syncWithFirestore,
    addAuditLog,
    addNotification
  } = useManagementStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [practitionerFilter, setPractitionerFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'STATED_ONLY' | 'UNSTATED_ONLY' | 'WATCH_OR_OVER'
  >('ALL');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);

  // Modal state: Edit Participant Budget & Service Agreement Commitment
  const [editingBudgetClient, setEditingBudgetClient] = useState<Client | null>(null);
  const [budgetForm, setBudgetForm] = useState<{
    totalBudget: number;
    allocatedBudget: number;
    capacityBuildingPBS: number;
    capacityBuildingTherapy: number;
    core: number;
    planStartDate: string;
    planEndDate: string;
    serviceAgreementStatus: string;
  }>({
    totalBudget: 0,
    allocatedBudget: 0,
    capacityBuildingPBS: 0,
    capacityBuildingTherapy: 0,
    core: 0,
    planStartDate: '',
    planEndDate: '',
    serviceAgreementStatus: 'Pending Signature'
  });

  // Modal state: Quick Log Support Hours & Claim
  const [loggingSupportClient, setLoggingSupportClient] = useState<Client | null>(null);
  const [supportForm, setSupportForm] = useState<{
    supportItemCode: string;
    hours: number;
    serviceDate: string;
    practitionerName: string;
    notes: string;
  }>({
    supportItemCode: '07_002_0115_8_3',
    hours: 1.5,
    serviceDate: new Date().toISOString().split('T')[0],
    practitionerName: 'Anitha Haripersad',
    notes: ''
  });

  const showBanner = (msg: string) => {
    setBannerMessage(msg);
    setTimeout(() => setBannerMessage(null), 4500);
  };

  // Price lookup map by NDIS Support Item Code
  const priceByCode = useMemo(() => {
    const map: Record<string, { price: number; name: string }> = {};
    supportItems.forEach((item) => {
      map[item.code] = { price: item.pricePerUnit, name: item.name };
    });
    return map;
  }, [supportItems]);

  // Real-time calculation engine across all 22 participants
  const budgetAudits: ParticipantBudgetAudit[] = useMemo(() => {
    // Track which caseNoteIds are already linked to a BillingClaim to prevent double counting
    const billedCaseNoteIds = new Set(
      claims.map((cl) => cl.caseNoteId).filter((id): id is string => Boolean(id))
    );

    return clients.map((client) => {
      const statedTotalBudget = Number(client.totalBudget) || 0;
      const hasStatedBudget = statedTotalBudget > 0;

      // 1. Service Agreement Committed funds (from attached schedules of supports or allocatedBudget)
      const agreementDocs = (client.documents || []).filter(
        (d) =>
          (d.category || '').toLowerCase().includes('agreement') ||
          (d.name || '').toLowerCase().includes('schedule_of_supports') ||
          (d.metadata && typeof d.metadata.scheduleTotal === 'number')
      );
      const docCommittedSum = agreementDocs.reduce(
        (sum, d) => sum + (Number(d.metadata?.scheduleTotal) || 0),
        0
      );
      const serviceAgreementCommitted =
        docCommittedSum > 0 ? docCommittedSum : Number(client.allocatedBudget) || statedTotalBudget;

      // 2. PRODA / Xero Billing Claims for this participant
      const clientClaims = claims.filter(
        (c) =>
          c.clientId === client.id ||
          (c.ndisNumber &&
            client.ndisNumber &&
            c.ndisNumber.replace(/\D/g, '') === client.ndisNumber.replace(/\D/g, ''))
      );
      const invoicedClaimSpend = clientClaims.reduce(
        (sum, c) => sum + (Number(c.totalAmount) || 0),
        0
      );
      const invoicedClaimHours = clientClaims.reduce(
        (sum, c) => sum + (Number(c.hours || c.quantity) || 0),
        0
      );

      // 3. Clinical Case Notes for this participant (unbilled vs total)
      const clientNotes = caseNotes.filter((n) => n.clientId === client.id);
      let unbilledCaseNoteSpend = 0;
      let unbilledCaseNoteHours = 0;
      let allCaseNoteHours = 0;

      clientNotes.forEach((n) => {
        const mins =
          (Number(n.sessionDurationMinutes || n.durationMinutes) || 0) +
          (Number(n.nonFaceToFaceMinutes) || 0) +
          (Number(n.travelMinutes) || 0);
        const hrs = mins / 60;
        allCaseNoteHours += hrs;

        if (!billedCaseNoteIds.has(n.id)) {
          const itemCode = n.supportItemCode || '07_002_0115_8_3';
          const unitRate = priceByCode[itemCode]?.price || 214.41;
          unbilledCaseNoteHours += hrs;
          unbilledCaseNoteSpend += hrs * unitRate;
        }
      });

      // 4. Rostered / Scheduled Shifts exposure
      const clientShifts = scheduledShifts.filter(
        (s) => s.clientId === client.id && s.status === 'Scheduled'
      );
      let rosteredShiftHours = 0;
      let rosteredShiftSpend = 0;
      clientShifts.forEach((s) => {
        const startParts = (s.startTime || '09:00').split(':').map(Number);
        const endParts = (s.endTime || '11:00').split(':').map(Number);
        const dur = Math.max(
          0,
          (endParts[0] || 11) + (endParts[1] || 0) / 60 - ((startParts[0] || 9) + (startParts[1] || 0) / 60)
        );
        rosteredShiftHours += dur;
        rosteredShiftSpend += dur * 214.41; // Standard PBS rate estimate for scheduled shift exposure
      });

      // Total Actual Expenditure = Invoiced Claims + Unbilled Case Notes
      const calculatedActualSpend = Number((invoicedClaimSpend + unbilledCaseNoteSpend).toFixed(2));
      const actualExpenditure = Math.max(Number(client.spentBudget) || 0, calculatedActualSpend);
      const totalLoggedHours = Number((invoicedClaimHours + unbilledCaseNoteHours).toFixed(2));
      const projectedExpenditureWithShifts = Number(
        (actualExpenditure + rosteredShiftSpend).toFixed(2)
      );

      const remainingFunds = Number((statedTotalBudget - actualExpenditure).toFixed(2));
      const remainingAfterRostered = Number(
        (statedTotalBudget - projectedExpenditureWithShifts).toFixed(2)
      );

      const utilizationPct = hasStatedBudget
        ? Number(((actualExpenditure / statedTotalBudget) * 100).toFixed(1))
        : 0;

      let status: ParticipantBudgetAudit['status'] = 'HEALTHY';
      if (!hasStatedBudget) {
        status = 'UNSTATED_BUDGET';
      } else if (actualExpenditure > statedTotalBudget) {
        status = 'OVER_BUDGET';
      } else if (utilizationPct >= 75) {
        status = 'WATCH';
      }

      return {
        client,
        statedTotalBudget,
        hasStatedBudget,
        serviceAgreementCommitted,
        serviceAgreementCount: agreementDocs.length,
        invoicedClaimSpend,
        invoicedClaimHours,
        claimCount: clientClaims.length,
        unbilledCaseNoteSpend: Number(unbilledCaseNoteSpend.toFixed(2)),
        unbilledCaseNoteHours: Number(unbilledCaseNoteHours.toFixed(2)),
        totalLoggedHours,
        caseNoteCount: clientNotes.length,
        rosteredShiftSpend: Number(rosteredShiftSpend.toFixed(2)),
        rosteredShiftHours: Number(rosteredShiftHours.toFixed(2)),
        shiftCount: clientShifts.length,
        actualExpenditure,
        projectedExpenditureWithShifts,
        remainingFunds,
        remainingAfterRostered,
        utilizationPct,
        status
      };
    });
  }, [clients, claims, caseNotes, scheduledShifts, priceByCode]);

  const filteredAudits = useMemo(() => {
    return budgetAudits.filter((a) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (a.client.name || '').toLowerCase().includes(q) ||
        (a.client.ndisNumber || '').toLowerCase().includes(q) ||
        (a.client.planManager?.agency || a.client.planManager?.agencyName || '')
          .toLowerCase()
          .includes(q);

      const matchesPrac =
        practitionerFilter === 'ALL' ||
        (practitionerFilter === 'UNASSIGNED' &&
          (!a.client.primaryPractitionerId ||
            a.client.primaryPractitionerName === 'Unassigned')) ||
        a.client.primaryPractitionerId === practitionerFilter;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'STATED_ONLY' && a.hasStatedBudget) ||
        (statusFilter === 'UNSTATED_ONLY' && !a.hasStatedBudget) ||
        (statusFilter === 'WATCH_OR_OVER' &&
          (a.status === 'WATCH' || a.status === 'OVER_BUDGET'));

      return matchesSearch && matchesPrac && matchesStatus;
    });
  }, [budgetAudits, searchQuery, practitionerFilter, statusFilter]);

  // Aggregate portfolio totals
  const portfolioSummary = useMemo(() => {
    const statedCohort = budgetAudits.filter((a) => a.hasStatedBudget);
    const unstatedCohort = budgetAudits.filter((a) => !a.hasStatedBudget);
    const totalStatedBudget = budgetAudits.reduce((s, a) => s + a.statedTotalBudget, 0);
    const totalCommitted = budgetAudits.reduce((s, a) => s + a.serviceAgreementCommitted, 0);
    const totalActualSpend = budgetAudits.reduce((s, a) => s + a.actualExpenditure, 0);
    const totalLoggedHours = budgetAudits.reduce((s, a) => s + a.totalLoggedHours, 0);
    const totalRemainingOnStated = statedCohort.reduce((s, a) => s + a.remainingFunds, 0);

    return {
      statedCount: statedCohort.length,
      unstatedCount: unstatedCohort.length,
      totalStatedBudget,
      totalCommitted,
      totalActualSpend,
      totalLoggedHours,
      totalRemainingOnStated
    };
  }, [budgetAudits]);

  // Reconcile and persist calculated spentBudget to Firestore for all participants
  const handleSyncCalculationsToFirestore = async () => {
    setIsReconciling(true);
    try {
      let updatedCount = 0;
      for (const audit of budgetAudits) {
        if ((audit.client.spentBudget || 0) !== audit.actualExpenditure) {
          updateClient(audit.client.id, {
            spentBudget: audit.actualExpenditure,
            updatedAt: new Date().toISOString()
          });
          updatedCount++;
        }
      }
      await syncWithFirestore();
      showBanner(
        `Synchronised real-time budget ledger with Cloud Firestore (${updatedCount} participant expenditure balances updated).`
      );
    } finally {
      setIsReconciling(false);
    }
  };

  const openBudgetEditor = (audit: ParticipantBudgetAudit) => {
    const c = audit.client;
    setEditingBudgetClient(c);
    setBudgetForm({
      totalBudget: c.totalBudget || 0,
      allocatedBudget: c.allocatedBudget || c.totalBudget || 0,
      capacityBuildingPBS: c.budgetBreakdown?.capacityBuildingPBS ?? (c.totalBudget || 0),
      capacityBuildingTherapy: c.budgetBreakdown?.capacityBuildingTherapy ?? 0,
      core: c.budgetBreakdown?.core ?? 0,
      planStartDate: c.planStartDate === 'Not stated' ? '' : c.planStartDate || '',
      planEndDate: c.planEndDate === 'Not stated' ? '' : c.planEndDate || '',
      serviceAgreementStatus: c.serviceAgreementStatus || 'Pending Signature'
    });
  };

  const handleSaveBudgetEditor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudgetClient) return;

    const total = Number(budgetForm.totalBudget) || 0;
    const allocated = Number(budgetForm.allocatedBudget) || total;

    updateClient(editingBudgetClient.id, {
      totalBudget: total,
      allocatedBudget: allocated,
      budgetBreakdown: {
        core: Number(budgetForm.core) || 0,
        coreDailyActivities: 0,
        capacityBuildingTherapy: Number(budgetForm.capacityBuildingTherapy) || 0,
        capacityBuildingPBS: Number(budgetForm.capacityBuildingPBS) || 0
      },
      planStartDate: budgetForm.planStartDate.trim() || 'Not stated',
      planEndDate: budgetForm.planEndDate.trim() || 'Not stated',
      serviceAgreementStatus: budgetForm.serviceAgreementStatus as any,
      updatedAt: new Date().toISOString()
    });

    addAuditLog(
      'UPDATE_PARTICIPANT_BUDGET',
      'Client',
      editingBudgetClient.id,
      `Updated NDIS Plan Budget for ${editingBudgetClient.name} (${editingBudgetClient.ndisNumber}): Total $${total.toLocaleString('en-AU', { minimumFractionDigits: 2 })} AUD, Service Agreement Committed $${allocated.toLocaleString('en-AU', { minimumFractionDigits: 2 })} AUD.`
    );

    showBanner(
      `Saved NDIS plan budget ($${total.toLocaleString('en-AU', { minimumFractionDigits: 2 })} AUD) for ${editingBudgetClient.name} to Firestore.`
    );
    setEditingBudgetClient(null);
  };

  const openLogSupportModal = (audit: ParticipantBudgetAudit) => {
    setLoggingSupportClient(audit.client);
    setSupportForm({
      supportItemCode: '07_002_0115_8_3',
      hours: 1.5,
      serviceDate: new Date().toISOString().split('T')[0],
      practitionerName:
        audit.client.primaryPractitionerName &&
        audit.client.primaryPractitionerName !== 'Unassigned'
          ? audit.client.primaryPractitionerName
          : practitioners[0]?.name || 'Anitha Haripersad',
      notes: ''
    });
  };

  const handleSaveSupportLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggingSupportClient) return;

    const item = supportItems.find((i) => i.code === supportForm.supportItemCode);
    const rate = item?.pricePerUnit || 214.41;
    const hours = Number(supportForm.hours) || 1;
    const totalAmount = Number((hours * rate).toFixed(2));

    addBillingClaim({
      clientId: loggingSupportClient.id,
      clientName: loggingSupportClient.name,
      ndisNumber: loggingSupportClient.ndisNumber,
      supportItemCode: supportForm.supportItemCode,
      supportItemNumber: supportForm.supportItemCode,
      supportItemName: item?.name || 'Specialist Behavioural Intervention Support',
      ndisSupportItem: `${supportForm.supportItemCode} - ${item?.name || 'Specialist Support'}`,
      hours,
      quantity: hours,
      unitRate: rate,
      rate,
      unitPrice: rate,
      totalAmount,
      serviceDate: supportForm.serviceDate,
      dateOfService: supportForm.serviceDate,
      practitionerName: supportForm.practitionerName,
      status: 'Pending',
      isPaceCompliant: true,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      claimReference: `INV-${Date.now().toString().slice(-6)}`,
      claimType: loggingSupportClient.planManagementType || 'Plan-Managed'
    });

    const nextSpent = Number(((loggingSupportClient.spentBudget || 0) + totalAmount).toFixed(2));
    updateClient(loggingSupportClient.id, {
      spentBudget: nextSpent,
      updatedAt: new Date().toISOString()
    });

    addNotification({
      title: 'Support Expenditure Logged',
      message: `Recorded ${hours}h (${supportForm.supportItemCode}) = $${totalAmount.toFixed(2)} AUD for ${loggingSupportClient.name}. Remaining budget updated in Firestore.`,
      type: 'billing',
      severity: 'low'
    });

    showBanner(
      `Logged ${hours} hrs ($${totalAmount.toFixed(2)} AUD) for ${loggingSupportClient.name} — Firestore budget balance updated.`
    );
    setLoggingSupportClient(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Executive Banner & Live Firebase Telemetry */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-bold">
                <Activity className="w-3.5 h-3.5" />
                <span>Real-Time Firestore NDIS Budget Engine</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
                <span
                  className={`w-2 h-2 rounded-full ${
                    syncStatus === 'synced' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                  }`}
                />
                Firestore: {syncStatus.toUpperCase()} • Last sync:{' '}
                {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString('en-AU') : 'Live'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              NDIS Plan Budget &amp; Expenditure Monitoring Dashboard
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl">
              Calculates remaining participant funds in real time from <strong className="text-slate-200">Service Agreements</strong>,{' '}
              <strong className="text-slate-200">Signed Clinical Case Notes</strong>,{' '}
              <strong className="text-slate-200">PRODA/Xero Claims</strong>, and{' '}
              <strong className="text-slate-200">Scheduled Shifts</strong>. Click any participant row to inspect the full calculation inputs, method, units (AUD / hours), and assumptions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSyncCalculationsToFirestore}
              disabled={isReconciling}
              className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-teal-600/20 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
              <span>{isReconciling ? 'Reconciling Ledger...' : 'Reconcile & Sync Balances to Firestore'}</span>
            </button>
          </div>
        </div>

        {/* Portfolio Financial KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Stated Plan Budgets ({portfolioSummary.statedCount} of 22)</span>
              <DollarSign className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-2xl font-extrabold text-white font-mono tabular-nums">
              ${portfolioSummary.totalStatedBudget.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-amber-400">
              {portfolioSummary.unstatedCount} participants awaiting plan budget entry ($0.00 stated)
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Service Agreement Committed</span>
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-extrabold text-indigo-300 font-mono tabular-nums">
              ${portfolioSummary.totalCommitted.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400">
              Allocated across active Schedules of Supports
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Actual Logged Expenditure</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-extrabold text-amber-300 font-mono tabular-nums">
              ${portfolioSummary.totalActualSpend.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              {portfolioSummary.totalLoggedHours.toFixed(2)} billable support hours logged
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Remaining Funds (Stated Plans)</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-400 font-mono tabular-nums">
              ${portfolioSummary.totalRemainingOnStated.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400">
              Formula: Stated Plan Budget − Actual Expenditure
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search participant name, 9-digit NDIS #, or Plan Manager..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={practitionerFilter}
              onChange={(e) => setPractitionerFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-teal-500 focus:outline-none"
            >
              <option value="ALL">All Practitioners</option>
              <option value="UNASSIGNED">Unassigned Participants</option>
              {practitioners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.pbsRegistrationLevel?.replace(' Practitioner', '')})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
              {(
                [
                  { id: 'ALL', label: 'All (22)' },
                  { id: 'STATED_ONLY', label: `Stated Budget (${portfolioSummary.statedCount})` },
                  { id: 'UNSTATED_ONLY', label: `Budget Not Stated (${portfolioSummary.unstatedCount})` },
                  { id: 'WATCH_OR_OVER', label: 'High Burn / Alert' }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {bannerMessage && (
        <div className="p-3.5 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-200 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{bannerMessage}</span>
          </div>
          <button onClick={() => setBannerMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Participant Real-Time Budget Ledger Table */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Participant &amp; NDIS #</th>
                <th className="py-3.5 px-3">Assigned Practitioner</th>
                <th className="py-3.5 px-3">Plan Management</th>
                <th className="py-3.5 px-3 text-right">Stated Plan Budget</th>
                <th className="py-3.5 px-3 text-right">Agreement Committed</th>
                <th className="py-3.5 px-3 text-right">Logged Support (Hrs / $)</th>
                <th className="py-3.5 px-3 text-right">Remaining Funds (AUD)</th>
                <th className="py-3.5 px-4">Utilisation &amp; Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {filteredAudits.map((audit) => {
                const { client } = audit;
                const isExpanded = expandedClientId === client.id;

                return (
                  <React.Fragment key={client.id}>
                    <tr
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isExpanded ? 'bg-slate-800/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-white">{client.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">
                          NDIS #{client.ndisNumber}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        {client.primaryPractitionerId &&
                        client.primaryPractitionerName !== 'Unassigned' ? (
                          <div>
                            <span className="font-semibold text-teal-300 block">
                              {client.primaryPractitionerName}
                            </span>
                            {client.secondaryPractitionerName && (
                              <span className="text-[10px] text-indigo-300">
                                Sup: {client.secondaryPractitionerName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="text-slate-200 font-medium block">
                          {client.planManagementType}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block max-w-[150px]">
                          {client.planManager?.agency || 'Not stated'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                        {audit.hasStatedBudget ? (
                          <span className="font-bold text-white">
                            $
                            {audit.statedTotalBudget.toLocaleString('en-AU', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </span>
                        ) : (
                          <span className="text-amber-400 text-[11px]">Not stated ($0.00)</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-indigo-300">
                        $
                        {audit.serviceAgreementCommitted.toLocaleString('en-AU', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                        <span className="font-bold text-amber-300 block">
                          $
                          {audit.actualExpenditure.toLocaleString('en-AU', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {audit.totalLoggedHours.toFixed(2)} hrs ({audit.claimCount} claims,{' '}
                          {audit.caseNoteCount} notes)
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                        {audit.hasStatedBudget ? (
                          <span
                            className={`font-extrabold ${
                              audit.remainingFunds < 0
                                ? 'text-rose-400'
                                : audit.utilizationPct >= 75
                                ? 'text-amber-300'
                                : 'text-emerald-400'
                            }`}
                          >
                            $
                            {audit.remainingFunds.toLocaleString('en-AU', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Awaiting Plan Budget</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 min-w-[165px]">
                        {audit.hasStatedBudget ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span
                                className={`font-bold ${
                                  audit.status === 'OVER_BUDGET'
                                    ? 'text-rose-400'
                                    : audit.status === 'WATCH'
                                    ? 'text-amber-300'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {audit.status === 'OVER_BUDGET'
                                  ? 'Over Budget'
                                  : audit.status === 'WATCH'
                                  ? 'Watch (>75%)'
                                  : 'Healthy'}
                              </span>
                              <span className="font-mono font-bold text-slate-300">
                                {audit.utilizationPct}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full ${
                                  audit.status === 'OVER_BUDGET'
                                    ? 'bg-rose-500'
                                    : audit.status === 'WATCH'
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, audit.utilizationPct)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" /> Enter Plan Budget
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openBudgetEditor(audit)}
                            title="Edit NDIS Plan Budget & Service Agreement"
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3 text-teal-400" />
                            <span>Budget</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openLogSupportModal(audit)}
                            title="Log Support Hours / Claim"
                            className="px-2.5 py-1.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Log Hrs</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedClientId(isExpanded ? null : client.id)
                            }
                            title="View Calculation Inputs, Formula & Evidence"
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Evidence & Calculation Breakdown Row */}
                    {isExpanded && (
                      <tr className="bg-slate-950/90 border-b border-slate-800">
                        <td colSpan={9} className="p-5">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Box 1: Transparent Calculation Inputs & Formula */}
                            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                              <div className="flex items-center gap-2 text-teal-400 text-xs font-extrabold">
                                <Calculator className="w-4 h-4" />
                                <span>Calculation Inputs, Method &amp; Units (AUD)</span>
                              </div>
                              <div className="space-y-1.5 text-[11px] text-slate-300 font-mono">
                                <div className="flex justify-between">
                                  <span className="text-slate-400">1. Stated NDIS Plan Budget:</span>
                                  <span>${audit.statedTotalBudget.toFixed(2)} AUD</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">2. Invoiced Claims ({audit.claimCount}):</span>
                                  <span>
                                    ${audit.invoicedClaimSpend.toFixed(2)} AUD ({audit.invoicedClaimHours.toFixed(2)} h)
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">3. Unbilled Case Notes ({audit.caseNoteCount}):</span>
                                  <span>
                                    ${audit.unbilledCaseNoteSpend.toFixed(2)} AUD ({audit.unbilledCaseNoteHours.toFixed(2)} h)
                                  </span>
                                </div>
                                <div className="flex justify-between border-t border-slate-800 pt-1 font-bold text-amber-300">
                                  <span>Actual Expenditure (2 + 3):</span>
                                  <span>${audit.actualExpenditure.toFixed(2)} AUD</span>
                                </div>
                                <div className="flex justify-between font-bold text-emerald-400">
                                  <span>Remaining Funds (1 − Actual):</span>
                                  <span>${audit.remainingFunds.toFixed(2)} AUD</span>
                                </div>
                                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                                  <span>Scheduled Shifts Exposure ({audit.shiftCount}):</span>
                                  <span>
                                    ${audit.rosteredShiftSpend.toFixed(2)} AUD ({audit.rosteredShiftHours.toFixed(2)} h)
                                  </span>
                                </div>
                                <div className="flex justify-between text-indigo-300">
                                  <span>Projected Remaining After Shifts:</span>
                                  <span>${audit.remainingAfterRostered.toFixed(2)} AUD</span>
                                </div>
                              </div>
                            </div>

                            {/* Box 2: NDIS Plan & Service Agreement Details */}
                            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                              <div className="flex items-center gap-2 text-indigo-400 text-xs font-extrabold">
                                <FileText className="w-4 h-4" />
                                <span>Service Agreement &amp; Plan Metadata</span>
                              </div>
                              <div className="space-y-1.5 text-[11px] text-slate-300">
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Service Agreement Status:</span>
                                  <span className="font-bold text-white">
                                    {client.serviceAgreementStatus || 'Not stated'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Plan Dates:</span>
                                  <span className="font-mono">
                                    {client.planStartDate || 'Not stated'} → {client.planEndDate || 'Not stated'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">CB Relationships / PBS Allocation:</span>
                                  <span className="font-mono">
                                    ${(client.budgetBreakdown?.capacityBuildingPBS || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })} AUD
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">CB Improved Daily Living (Therapy):</span>
                                  <span className="font-mono">
                                    ${(client.budgetBreakdown?.capacityBuildingTherapy || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })} AUD
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Plan Manager Invoice Email:</span>
                                  <span className="font-mono text-teal-300">
                                    {client.planManager?.email || 'Not stated'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Box 3: Assumptions & Evidence Notice */}
                            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                              <div className="flex items-center gap-2 text-amber-400 text-xs font-extrabold">
                                <ShieldCheck className="w-4 h-4" />
                                <span>Audit Evidence &amp; Assumptions</span>
                              </div>
                              <p className="text-[11px] text-slate-300 leading-relaxed">
                                • <strong>Source Attribution:</strong> Initial budget imported from{' '}
                                <code className="text-teal-300">NDIS_Participants_Import_Template_V2.pdf</code>.
                              </p>
                              <p className="text-[11px] text-slate-300 leading-relaxed">
                                • <strong>De-duplication Rule:</strong> Case notes already linked to a PRODA claim (<code className="text-teal-300">caseNoteId</code>) are counted once under Invoiced Claims to prevent double-counting.
                              </p>
                              <p className="text-[11px] text-slate-300 leading-relaxed">
                                • <strong>Unbilled Note Valuation:</strong> Unbilled clinical notes are valued using their recorded NDIS Support Item code from the 2025–26 Price Guide (defaulting to <code className="text-teal-300">07_002_0115_8_3</code> at $214.41/hr if unspecified).
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Edit Participant Budget & Service Agreement */}
      {editingBudgetClient && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                  Update NDIS Plan Budget &amp; Service Agreement
                </span>
                <h3 className="text-lg font-extrabold text-white">{editingBudgetClient.name}</h3>
                <p className="text-xs font-mono text-slate-400">
                  NDIS #{editingBudgetClient.ndisNumber} • {editingBudgetClient.planManagementType}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingBudgetClient(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudgetEditor} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Total NDIS Plan Budget ($ AUD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={budgetForm.totalBudget}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBudgetForm((prev) => ({
                        ...prev,
                        totalBudget: val,
                        allocatedBudget: prev.allocatedBudget || val,
                        capacityBuildingPBS: val
                      }));
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Service Agreement Committed ($ AUD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={budgetForm.allocatedBudget}
                    onChange={(e) =>
                      setBudgetForm((prev) => ({
                        ...prev,
                        allocatedBudget: Number(e.target.value)
                      }))
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    CB Relationships (PBS) ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={budgetForm.capacityBuildingPBS}
                    onChange={(e) =>
                      setBudgetForm((prev) => ({
                        ...prev,
                        capacityBuildingPBS: Number(e.target.value)
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    CB Daily Living (Therapy) ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={budgetForm.capacityBuildingTherapy}
                    onChange={(e) =>
                      setBudgetForm((prev) => ({
                        ...prev,
                        capacityBuildingTherapy: Number(e.target.value)
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Core Supports ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={budgetForm.core}
                    onChange={(e) =>
                      setBudgetForm((prev) => ({ ...prev, core: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Plan Start Date
                  </label>
                  <input
                    type="date"
                    value={budgetForm.planStartDate}
                    onChange={(e) =>
                      setBudgetForm((prev) => ({ ...prev, planStartDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Plan End Date
                  </label>
                  <input
                    type="date"
                    value={budgetForm.planEndDate}
                    onChange={(e) =>
                      setBudgetForm((prev) => ({ ...prev, planEndDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Agreement Status
                  </label>
                  <select
                    value={budgetForm.serviceAgreementStatus}
                    onChange={(e) =>
                      setBudgetForm((prev) => ({
                        ...prev,
                        serviceAgreementStatus: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Pending Signature">Pending Signature</option>
                    <option value="Signed & Active">Signed &amp; Active</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBudgetClient(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold cursor-pointer"
                >
                  Save Budget to Firestore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Quick Log Support Hours & Claim */}
      {loggingSupportClient && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                  Log Support Hours &amp; Deduct Funds
                </span>
                <h3 className="text-lg font-extrabold text-white">{loggingSupportClient.name}</h3>
                <p className="text-xs font-mono text-slate-400">
                  NDIS #{loggingSupportClient.ndisNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLoggingSupportClient(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupportLog} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  NDIS Support Item Code (2025–26 Catalogue)
                </label>
                <select
                  value={supportForm.supportItemCode}
                  onChange={(e) =>
                    setSupportForm((prev) => ({ ...prev, supportItemCode: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  {supportItems.map((si) => (
                    <option key={si.code} value={si.code}>
                      {si.code} — {si.name} (${si.pricePerUnit.toFixed(2)}/{si.unitOfMeasure || 'Hour'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Support Hours Delivered
                  </label>
                  <input
                    type="number"
                    min={0.25}
                    max={24}
                    step="0.25"
                    value={supportForm.hours}
                    onChange={(e) =>
                      setSupportForm((prev) => ({ ...prev, hours: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Date of Service
                  </label>
                  <input
                    type="date"
                    value={supportForm.serviceDate}
                    onChange={(e) =>
                      setSupportForm((prev) => ({ ...prev, serviceDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Delivering Practitioner
                </label>
                <select
                  value={supportForm.practitionerName}
                  onChange={(e) =>
                    setSupportForm((prev) => ({ ...prev, practitionerName: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  {practitioners.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} ({p.pbsRegistrationLevel})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Calculated Line Total:</span>
                <span className="font-mono font-extrabold text-teal-400">
                  $
                  {(
                    (Number(supportForm.hours) || 0) *
                    (supportItems.find((i) => i.code === supportForm.supportItemCode)?.pricePerUnit ||
                      214.41)
                  ).toFixed(2)}{' '}
                  AUD
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLoggingSupportClient(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold cursor-pointer"
                >
                  Log Claim &amp; Update Remaining Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
