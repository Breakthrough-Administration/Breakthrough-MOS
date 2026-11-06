'use client';

import React, { useState, useMemo } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { Client, Practitioner } from '@/types';
import {
  Kanban,
  Users,
  Mail,
  Phone,
  ShieldCheck,
  AlertTriangle,
  Clock,
  DollarSign,
  Search,
  Filter,
  UserCheck,
  ArrowRightLeft,
  Sliders,
  CheckCircle2,
  FileText,
  Sparkles,
  ExternalLink,
  X
} from 'lucide-react';

export const CaseloadKanbanVisualizer: React.FC = () => {
  const {
    clients,
    practitioners,
    caseNotes,
    scheduledShifts,
    updateClient,
    updatePractitioner,
    setSelectedClientId,
    setActiveTab,
    addAuditLog,
    addNotification
  } = useManagementStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'High' | 'Medium' | 'Low'>('ALL');
  const [fundingFilter, setFundingFilter] = useState<'ALL' | 'Plan-Managed' | 'NDIA-Managed' | 'Self-Managed'>('ALL');
  const [budgetFilter, setBudgetFilter] = useState<'ALL' | 'STATED' | 'UNSTATED'>('ALL');

  const [draggedClientId, setDraggedClientId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Inline Capacity Editor modal state for a practitioner
  const [editingCapacityPrac, setEditingCapacityPrac] = useState<Practitioner | null>(null);
  const [capacityForm, setCapacityForm] = useState<{
    maxCaseload: number;
    billableTargetHours: number;
    schadsLevel: string;
    hourlyPayRate: number;
  }>({
    maxCaseload: 0,
    billableTargetHours: 0,
    schadsLevel: '',
    hourlyPayRate: 0
  });

  const showBanner = (message: string) => {
    setStatusBanner(message);
    setTimeout(() => setStatusBanner(null), 4500);
  };

  // Pre-compute logged support hours per client & practitioner from CaseNotes + ScheduledShifts
  const supportMetricsByClient = useMemo(() => {
    const map: Record<string, { loggedHours: number; rosteredHours: number; noteCount: number }> = {};
    clients.forEach((c) => {
      map[c.id] = { loggedHours: 0, rosteredHours: 0, noteCount: 0 };
    });

    caseNotes.forEach((n) => {
      if (!map[n.clientId]) {
        map[n.clientId] = { loggedHours: 0, rosteredHours: 0, noteCount: 0 };
      }
      const totalMins =
        (Number(n.sessionDurationMinutes || n.durationMinutes) || 0) +
        (Number(n.nonFaceToFaceMinutes) || 0) +
        (Number(n.travelMinutes) || 0);
      map[n.clientId].loggedHours += totalMins / 60;
      map[n.clientId].noteCount += 1;
    });

    scheduledShifts.forEach((s) => {
      if (!map[s.clientId]) {
        map[s.clientId] = { loggedHours: 0, rosteredHours: 0, noteCount: 0 };
      }
      const startParts = (s.startTime || '09:00').split(':').map(Number);
      const endParts = (s.endTime || '11:00').split(':').map(Number);
      const startH = (startParts[0] || 9) + (startParts[1] || 0) / 60;
      const endH = (endParts[0] || 11) + (endParts[1] || 0) / 60;
      const dur = Math.max(0, endH - startH);
      if (s.status === 'Completed') {
        map[s.clientId].loggedHours += dur;
      } else if (s.status === 'Scheduled') {
        map[s.clientId].rosteredHours += dur;
      }
    });

    return map;
  }, [clients, caseNotes, scheduledShifts]);

  // Filter the 22 participants based on search & filter controls
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.ndisNumber || '').toLowerCase().includes(q) ||
        (c.primaryDisability || '').toLowerCase().includes(q) ||
        (c.planManager?.agency || c.planManager?.agencyName || '').toLowerCase().includes(q);

      const matchesRisk = riskFilter === 'ALL' || c.riskLevel === riskFilter;
      const matchesFunding =
        fundingFilter === 'ALL' ||
        (c.planManagementType || '').toLowerCase().includes(fundingFilter.toLowerCase());
      const matchesBudget =
        budgetFilter === 'ALL' ||
        (budgetFilter === 'STATED' && (c.totalBudget || 0) > 0) ||
        (budgetFilter === 'UNSTATED' && (c.totalBudget || 0) === 0);

      return matchesSearch && matchesRisk && matchesFunding && matchesBudget;
    });
  }, [clients, searchQuery, riskFilter, fundingFilter, budgetFilter]);

  // Group participants into Kanban columns: 'UNASSIGNED' + each active practitioner
  const kanbanColumns = useMemo(() => {
    const validPracIds = new Set(practitioners.map((p) => p.id));

    const unassignedClients = filteredClients.filter(
      (c) =>
        !c.primaryPractitionerId ||
        c.primaryPractitionerName === 'Unassigned' ||
        !validPracIds.has(c.primaryPractitionerId)
    );

    const pracColumns = practitioners.map((prac) => {
      const assigned = filteredClients.filter(
        (c) =>
          c.primaryPractitionerId === prac.id ||
          c.allocatedPractitionerId === prac.id ||
          (c.primaryPractitionerName &&
            c.primaryPractitionerName.toLowerCase() === prac.name.toLowerCase())
      );

      const totalAssignedAll = clients.filter(
        (c) =>
          c.primaryPractitionerId === prac.id ||
          c.allocatedPractitionerId === prac.id ||
          (c.primaryPractitionerName &&
            c.primaryPractitionerName.toLowerCase() === prac.name.toLowerCase())
      );

      const secondarySupervised = clients.filter(
        (c) =>
          c.secondaryPractitionerId === prac.id ||
          (c.secondaryPractitionerName &&
            c.secondaryPractitionerName.toLowerCase() === prac.name.toLowerCase())
      );

      const managedBudget = totalAssignedAll.reduce((sum, c) => sum + (c.totalBudget || 0), 0);
      const highRiskCount = totalAssignedAll.filter((c) => c.riskLevel === 'High').length;
      const loggedHours = totalAssignedAll.reduce(
        (sum, c) => sum + (supportMetricsByClient[c.id]?.loggedHours || 0),
        0
      );

      return {
        id: prac.id,
        practitioner: prac,
        clients: assigned,
        totalCount: totalAssignedAll.length,
        secondaryCount: secondarySupervised.length,
        managedBudget,
        highRiskCount,
        loggedHours
      };
    });

    return {
      unassigned: unassignedClients,
      totalUnassignedAll: clients.filter(
        (c) =>
          !c.primaryPractitionerId ||
          c.primaryPractitionerName === 'Unassigned' ||
          !validPracIds.has(c.primaryPractitionerId)
      ).length,
      practitionerColumns: pracColumns
    };
  }, [filteredClients, clients, practitioners, supportMetricsByClient]);

  // Assign a participant to a practitioner (or Unassigned) and persist to Firestore
  const handleAssignParticipant = (clientId: string, targetColumnId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    if (targetColumnId === 'UNASSIGNED') {
      updateClient(clientId, {
        primaryPractitionerId: '',
        primaryPractitionerName: 'Unassigned',
        allocatedPractitionerId: '',
        allocatedPractitionerName: 'Unassigned',
        updatedAt: new Date().toISOString()
      });
      addAuditLog(
        'UNASSIGN_PRACTITIONER',
        'Client',
        clientId,
        `Moved participant ${client.name} (${client.ndisNumber}) to Unassigned Roster.`
      );
      showBanner(`Moved ${client.name} to the Unassigned column.`);
      return;
    }

    const prac = practitioners.find((p) => p.id === targetColumnId);
    if (!prac) return;

    // If assigning to Entry level practitioner (e.g. Tania Bobovec) and no secondary supervisor is set, flag helpful notice
    const isEntryPrac = (prac.pbsRegistrationLevel || '').toLowerCase().includes('entry');
    const proficientSupervisor = practitioners.find((p) =>
      (p.pbsRegistrationLevel || '').toLowerCase().includes('proficient')
    );

    const updates: Partial<Client> = {
      primaryPractitionerId: prac.id,
      primaryPractitionerName: prac.name,
      allocatedPractitionerId: prac.id,
      allocatedPractitionerName: prac.name,
      updatedAt: new Date().toISOString()
    };

    updateClient(clientId, updates);

    addAuditLog(
      'ASSIGN_PRACTITIONER_KANBAN',
      'Client',
      clientId,
      `Assigned ${client.name} (NDIS #${client.ndisNumber}) to ${prac.name} (${prac.pbsRegistrationLevel}).`
    );

    if (isEntryPrac && !client.secondaryPractitionerId && proficientSupervisor) {
      showBanner(
        `Assigned ${client.name} to ${prac.name} (Entry Practitioner). Tip: Link a Proficient Supervisor (${proficientSupervisor.name}) via the Secondary Supervisor selector on the card.`
      );
    } else {
      showBanner(
        `Assigned ${client.name} to ${prac.name} (${prac.pbsRegistrationLevel}) — saved to Firestore.`
      );
    }
  };

  // Assign secondary / supervising practitioner on a participant card
  const handleAssignSecondarySupervisor = (clientId: string, secondaryPracId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    if (!secondaryPracId) {
      updateClient(clientId, {
        secondaryPractitionerId: '',
        secondaryPractitionerName: '',
        updatedAt: new Date().toISOString()
      });
      showBanner(`Cleared secondary/supervising practitioner for ${client.name}.`);
      return;
    }

    const prac = practitioners.find((p) => p.id === secondaryPracId);
    if (!prac) return;

    updateClient(clientId, {
      secondaryPractitionerId: prac.id,
      secondaryPractitionerName: prac.name,
      updatedAt: new Date().toISOString()
    });
    addAuditLog(
      'ASSIGN_SECONDARY_SUPERVISOR',
      'Client',
      clientId,
      `Linked ${prac.name} (${prac.pbsRegistrationLevel}) as Secondary / Supervising Practitioner for ${client.name}.`
    );
    showBanner(`Linked ${prac.name} as Secondary / Supervising Practitioner for ${client.name}.`);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, clientId: string) => {
    setDraggedClientId(clientId);
    e.dataTransfer.setData('text/plain', clientId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const clientId = e.dataTransfer.getData('text/plain') || draggedClientId;
    setDraggedClientId(null);
    setDragOverColumnId(null);
    if (clientId) {
      handleAssignParticipant(clientId, targetColumnId);
    }
  };

  const openCapacityModal = (prac: Practitioner) => {
    setEditingCapacityPrac(prac);
    setCapacityForm({
      maxCaseload: prac.maxCaseload || 0,
      billableTargetHours: prac.billableTargetHours || 0,
      schadsLevel: prac.schadsLevel === 'Not stated' ? '' : prac.schadsLevel || '',
      hourlyPayRate: prac.hourlyPayRate || 0
    });
  };

  const handleSaveCapacity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCapacityPrac) return;

    updatePractitioner(editingCapacityPrac.id, {
      maxCaseload: Number(capacityForm.maxCaseload) || 0,
      billableTargetHours: Number(capacityForm.billableTargetHours) || 0,
      schadsLevel: capacityForm.schadsLevel.trim() || 'Not stated',
      hourlyPayRate: Number(capacityForm.hourlyPayRate) || 0
    });

    addNotification({
      title: 'Practitioner Capacity Updated',
      message: `Updated workload targets for ${editingCapacityPrac.name} (Max Caseload: ${capacityForm.maxCaseload || 'Not stated'}, Target Billable: ${capacityForm.billableTargetHours || 0}h/wk).`,
      type: 'compliance',
      severity: 'low'
    });
    showBanner(`Saved workload capacity settings for ${editingCapacityPrac.name} to Firestore.`);
    setEditingCapacityPrac(null);
  };

  const getPbsBadgeStyle = (level?: string) => {
    const l = (level || '').toLowerCase();
    if (l.includes('proficient') || l.includes('advanced') || l.includes('specialist')) {
      return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
    }
    if (l.includes('core')) {
      return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    }
    return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  };

  const getRiskBadgeStyle = (risk?: string) => {
    if (risk === 'High') return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    if (risk === 'Medium') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  };

  const totalAssignedCount = clients.length - kanbanColumns.totalUnassignedAll;
  const totalStatedBudget = clients.reduce((sum, c) => sum + (c.totalBudget || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Summary Strip */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-bold">
              <Kanban className="w-3.5 h-3.5" />
              <span>Real-Time Firestore Kanban Caseload Visualizer</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Practitioner Caseload &amp; Capacity Kanban Board ({clients.length} Participants)
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl">
              Drag and drop participant cards across columns or use the card quick-selector to allocate caseloads across{' '}
              <strong className="text-slate-200">Anitha Haripersad</strong> (Proficient),{' '}
              <strong className="text-slate-200">Zubaida Baher</strong> (Proficient),{' '}
              <strong className="text-slate-200">Andreja Majcenovic</strong> (Core), and{' '}
              <strong className="text-slate-200">Tania Bobovec</strong> (Entry). All changes sync immediately with Cloud Firestore.
            </p>
          </div>

          {/* Summary KPI Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="px-3.5 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Roster
              </span>
              <span className="text-lg font-extrabold text-white font-mono tabular-nums">
                {clients.length}
              </span>
              <span className="text-[10px] text-teal-400 block">100% Active NDIS</span>
            </div>

            <div className="px-3.5 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Assigned / Unassigned
              </span>
              <span className="text-lg font-extrabold text-white font-mono tabular-nums">
                {totalAssignedCount} <span className="text-slate-500">/</span>{' '}
                <span className={kanbanColumns.totalUnassignedAll > 0 ? 'text-amber-400' : 'text-teal-400'}>
                  {kanbanColumns.totalUnassignedAll}
                </span>
              </span>
              <span className="text-[10px] text-slate-400 block">Across {practitioners.length} clinicians</span>
            </div>

            <div className="px-3.5 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Stated NDIS Budgets
              </span>
              <span className="text-lg font-extrabold text-teal-400 font-mono tabular-nums">
                ${totalStatedBudget.toLocaleString('en-AU', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] text-slate-400 block">6 stated / 16 pending</span>
            </div>

            <div className="px-3.5 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                PBS Team Mix
              </span>
              <span className="text-lg font-extrabold text-white font-mono tabular-nums">
                2 / 1 / 1
              </span>
              <span className="text-[10px] text-slate-400 block">Prof / Core / Entry</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter 22 participants by name, NDIS #, diagnosis, or Plan Manager..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-400 font-semibold">Risk:</span>
              {(['ALL', 'High', 'Medium', 'Low'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRiskFilter(r)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    riskFilter === r
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <select
              value={fundingFilter}
              onChange={(e) => setFundingFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-teal-500 focus:outline-none"
            >
              <option value="ALL">All Plan Management Types</option>
              <option value="Plan-Managed">Plan-Managed (14)</option>
              <option value="NDIA-Managed">NDIA-Managed (7)</option>
              <option value="Self-Managed">Self-Managed (1)</option>
            </select>

            <select
              value={budgetFilter}
              onChange={(e) => setBudgetFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-teal-500 focus:outline-none"
            >
              <option value="ALL">All Budget States (22)</option>
              <option value="STATED">Stated Budget &gt; $0 (6)</option>
              <option value="UNSTATED">Budget Not Stated $0 (16)</option>
            </select>
          </div>
        </div>
      </div>

      {statusBanner && (
        <div className="p-3.5 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-200 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button onClick={() => setStatusBanner(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Horizontal Kanban Board: Unassigned Column + 4 Practitioner Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start">
        {/* COLUMN 0: UNASSIGNED PARTICIPANTS */}
        <div
          onDragOver={(e) => handleDragOver(e, 'UNASSIGNED')}
          onDragLeave={() => setDragOverColumnId(null)}
          onDrop={(e) => handleDrop(e, 'UNASSIGNED')}
          className={`rounded-3xl bg-slate-900/85 border transition-all flex flex-col max-h-[820px] ${
            dragOverColumnId === 'UNASSIGNED'
              ? 'border-amber-400 ring-2 ring-amber-400/20 bg-slate-900'
              : 'border-slate-800'
          }`}
        >
          {/* Column Header */}
          <div className="p-4 border-b border-slate-800 space-y-2.5 bg-slate-950/60 rounded-t-3xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <AlertTriangle className="w-3 h-3" /> Unassigned Queue
                </span>
                <h3 className="text-sm font-extrabold text-white mt-1.5">Unassigned Participants</h3>
                <p className="text-[11px] text-slate-400">
                  Awaiting Primary Practitioner allocation
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-extrabold tabular-nums">
                {kanbanColumns.unassigned.length}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Stated Funds in Queue:</span>
              <span className="font-mono font-bold text-amber-300 tabular-nums">
                $
                {kanbanColumns.unassigned
                  .reduce((s, c) => s + (c.totalBudget || 0), 0)
                  .toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Cards List */}
          <div className="p-3 space-y-2.5 overflow-y-auto flex-1">
            {kanbanColumns.unassigned.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-slate-800 text-center space-y-1.5">
                <CheckCircle2 className="w-6 h-6 text-teal-400 mx-auto" />
                <p className="text-xs font-bold text-slate-300">All Filtered Participants Assigned</p>
                <p className="text-[11px] text-slate-500">
                  Drag any participant card here to unassign them.
                </p>
              </div>
            ) : (
              kanbanColumns.unassigned.map((client) => {
                const metrics = supportMetricsByClient[client.id] || {
                  loggedHours: 0,
                  rosteredHours: 0,
                  noteCount: 0
                };
                return (
                  <div
                    key={client.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, client.id)}
                    className="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all cursor-grab active:cursor-grabbing space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-extrabold text-white leading-snug">{client.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">NDIS #{client.ndisNumber}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${getRiskBadgeStyle(
                          client.riskLevel
                        )}`}
                      >
                        {client.riskLevel} Risk
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 line-clamp-1">
                      {client.primaryDisability || 'Not stated'}
                    </p>

                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/80">
                      <span className="text-slate-400">{client.planManagementType}</span>
                      {(client.totalBudget || 0) > 0 ? (
                        <span className="font-mono font-bold text-teal-300 tabular-nums">
                          ${client.totalBudget.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="font-mono text-amber-400/90">Budget: Not stated ($0)</span>
                      )}
                    </div>

                    {metrics.loggedHours > 0 && (
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Logged Support:</span>
                        <span className="font-mono font-semibold text-slate-200">
                          {metrics.loggedHours.toFixed(1)} hrs ({metrics.noteCount} notes)
                        </span>
                      </div>
                    )}

                    {/* Quick Assign Selector */}
                    <div className="pt-1.5 flex items-center gap-1.5">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) handleAssignParticipant(client.id, e.target.value);
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-[11px] text-teal-300 font-semibold focus:border-teal-500 focus:outline-none cursor-pointer"
                      >
                        <option value="">Assign Practitioner...</option>
                        {practitioners.map((p) => (
                          <option key={p.id} value={p.id}>
                            → {p.name} ({p.pbsRegistrationLevel?.replace(' Practitioner', '')})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClientId(client.id);
                          setActiveTab('clients');
                        }}
                        title="Open Participant Profile"
                        className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMNS 1..4: PRACTITIONER COLUMNS */}
        {kanbanColumns.practitionerColumns.map((col) => {
          const { practitioner: prac, clients: colClients, totalCount, secondaryCount, managedBudget, highRiskCount, loggedHours } = col;
          const maxCap = prac.maxCaseload && prac.maxCaseload > 0 ? prac.maxCaseload : 0;
          const capPct = maxCap > 0 ? Math.min(100, Math.round((totalCount / maxCap) * 100)) : 0;
          const isOverCapacity = maxCap > 0 && totalCount > maxCap;

          return (
            <div
              key={prac.id}
              onDragOver={(e) => handleDragOver(e, prac.id)}
              onDragLeave={() => setDragOverColumnId(null)}
              onDrop={(e) => handleDrop(e, prac.id)}
              className={`rounded-3xl bg-slate-900/85 border transition-all flex flex-col max-h-[820px] ${
                dragOverColumnId === prac.id
                  ? 'border-teal-400 ring-2 ring-teal-400/20 bg-slate-900'
                  : 'border-slate-800'
              }`}
            >
              {/* Practitioner Column Header */}
              <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-950/60 rounded-t-3xl">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${getPbsBadgeStyle(
                        prac.pbsRegistrationLevel
                      )}`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      {prac.pbsRegistrationLevel || 'PBS Practitioner'}
                    </span>
                    <h3 className="text-sm font-extrabold text-white mt-1.5 truncate">{prac.name}</h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openCapacityModal(prac)}
                      title="Configure Caseload Capacity & Billable Target"
                      className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-teal-300 border border-slate-800 cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                    <span
                      className={`px-2.5 py-1 rounded-xl font-mono text-xs font-extrabold tabular-nums border ${
                        isOverCapacity
                          ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                          : 'bg-teal-500/15 border-teal-500/30 text-teal-300'
                      }`}
                    >
                      {maxCap > 0 ? `${totalCount}/${maxCap}` : totalCount}
                    </span>
                  </div>
                </div>

                {/* Verified Contact Details */}
                <div className="space-y-1 text-[11px] text-slate-300 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-1.5 truncate" title={prac.email}>
                    <Mail className="w-3 h-3 text-teal-400 shrink-0" />
                    <a
                      href={`mailto:${prac.email}`}
                      className="truncate hover:text-teal-300 transition-colors"
                    >
                      {prac.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-teal-400 shrink-0" />
                    <a
                      href={`tel:${(prac.phone || '').replace(/\s+/g, '')}`}
                      className="font-mono hover:text-teal-300 transition-colors"
                    >
                      {prac.phone}
                    </a>
                  </div>
                </div>

                {/* Capacity Bar & Workload Metrics */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-semibold">
                      Workload Capacity {maxCap > 0 ? `(${capPct}%)` : '(Target Cap Not Set)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => openCapacityModal(prac)}
                      className="text-teal-400 hover:underline font-semibold cursor-pointer"
                    >
                      {maxCap > 0 ? 'Edit Cap' : '+ Set Cap'}
                    </button>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isOverCapacity
                          ? 'bg-rose-500'
                          : capPct >= 80
                          ? 'bg-amber-400'
                          : 'bg-teal-500'
                      }`}
                      style={{
                        width: `${maxCap > 0 ? Math.min(100, capPct) : Math.min(100, totalCount * 12)}%`
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px]">
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800/80 text-center">
                      <span className="text-slate-400 block">Managed</span>
                      <span className="font-mono font-bold text-teal-300 tabular-nums">
                        ${(managedBudget / 1000).toFixed(1)}k
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800/80 text-center">
                      <span className="text-slate-400 block">Logged Hrs</span>
                      <span className="font-mono font-bold text-white tabular-nums">
                        {loggedHours.toFixed(1)}h
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800/80 text-center">
                      <span className="text-slate-400 block">High Risk</span>
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          highRiskCount > 0 ? 'text-rose-400' : 'text-slate-300'
                        }`}
                      >
                        {highRiskCount}
                      </span>
                    </div>
                  </div>

                  {secondaryCount > 0 && (
                    <div className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-2 py-1 flex items-center justify-between">
                      <span>Secondary / Supervising on:</span>
                      <span className="font-mono font-bold">{secondaryCount} participant(s)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned Participant Cards */}
              <div className="p-3 space-y-2.5 overflow-y-auto flex-1">
                {colClients.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-800 text-center space-y-1.5">
                    <Users className="w-6 h-6 text-slate-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-400">No Participants Assigned</p>
                    <p className="text-[11px] text-slate-500">
                      Drag participant cards here or select <strong className="text-slate-300">{prac.name}</strong> on any card.
                    </p>
                  </div>
                ) : (
                  colClients.map((client) => {
                    const metrics = supportMetricsByClient[client.id] || {
                      loggedHours: 0,
                      rosteredHours: 0,
                      noteCount: 0
                    };
                    const isEntryPrac = (prac.pbsRegistrationLevel || '').toLowerCase().includes('entry');
                    const missingSupervisorForEntry = isEntryPrac && !client.secondaryPractitionerId;

                    return (
                      <div
                        key={client.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, client.id)}
                        className="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-950 border border-slate-800 hover:border-teal-500/40 transition-all cursor-grab active:cursor-grabbing space-y-2.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-extrabold text-white leading-snug">{client.name}</p>
                            <p className="text-[10px] font-mono text-slate-400">NDIS #{client.ndisNumber}</p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${getRiskBadgeStyle(
                              client.riskLevel
                            )}`}
                          >
                            {client.riskLevel}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 line-clamp-1">
                          {client.primaryDisability || 'Not stated'}
                        </p>

                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/80">
                          <span className="text-slate-400">{client.planManagementType}</span>
                          {(client.totalBudget || 0) > 0 ? (
                            <span className="font-mono font-bold text-teal-300 tabular-nums">
                              ${client.totalBudget.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="font-mono text-amber-400/90">Budget: Not stated ($0)</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Logged Hours:</span>
                          <span className="font-mono font-semibold text-slate-200">
                            {metrics.loggedHours.toFixed(1)}h ({metrics.noteCount} notes)
                          </span>
                        </div>

                        {/* Secondary / Supervising Practitioner Selector */}
                        <div className="space-y-1 pt-1 border-t border-slate-800/60">
                          <label className="text-[10px] text-slate-400 block">
                            Secondary / Supervisor:
                          </label>
                          <select
                            value={client.secondaryPractitionerId || ''}
                            onChange={(e) => handleAssignSecondarySupervisor(client.id, e.target.value)}
                            className={`w-full px-2 py-1 rounded-lg bg-slate-900 border text-[10px] font-semibold focus:outline-none cursor-pointer ${
                              missingSupervisorForEntry
                                ? 'border-amber-500/50 text-amber-300'
                                : 'border-slate-800 text-slate-300'
                            }`}
                          >
                            <option value="">None (No Secondary Linked)</option>
                            {practitioners
                              .filter((p) => p.id !== prac.id)
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.pbsRegistrationLevel?.replace(' Practitioner', '')})
                                </option>
                              ))}
                          </select>
                          {missingSupervisorForEntry && (
                            <p className="text-[10px] text-amber-400">
                              Entry Practitioner case: Select a Proficient Supervisor (Anitha or Zubaida).
                            </p>
                          )}
                        </div>

                        {/* Reassign Primary or Open Profile */}
                        <div className="pt-1 flex items-center gap-1.5">
                          <select
                            value={prac.id}
                            onChange={(e) => handleAssignParticipant(client.id, e.target.value)}
                            className="flex-1 px-2 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-300 focus:border-teal-500 focus:outline-none cursor-pointer"
                          >
                            <option value="UNASSIGNED">Move to Unassigned</option>
                            {practitioners.map((p) => (
                              <option key={p.id} value={p.id}>
                                Primary: {p.name}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClientId(client.id);
                              setActiveTab('case-notes');
                            }}
                            title="Log Clinical Case Note"
                            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-400 border border-slate-800 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClientId(client.id);
                              setActiveTab('clients');
                            }}
                            title="Open Participant Dossier"
                            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Configure Practitioner Workload Capacity & Targets */}
      {editingCapacityPrac && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                  Practitioner Workload Configuration
                </span>
                <h3 className="text-lg font-extrabold text-white">{editingCapacityPrac.name}</h3>
                <p className="text-xs text-slate-400">{editingCapacityPrac.pbsRegistrationLevel}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCapacityPrac(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCapacity} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Maximum Participant Caseload Cap (0 = Not stated)
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={capacityForm.maxCaseload}
                  onChange={(e) =>
                    setCapacityForm((prev) => ({ ...prev, maxCaseload: Number(e.target.value) }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Weekly Billable Target Hours (hrs/week)
                </label>
                <input
                  type="number"
                  min={0}
                  max={40}
                  step="0.5"
                  value={capacityForm.billableTargetHours}
                  onChange={(e) =>
                    setCapacityForm((prev) => ({
                      ...prev,
                      billableTargetHours: Number(e.target.value)
                    }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  SCHADS Award Classification Level
                </label>
                <input
                  type="text"
                  placeholder="e.g. SCHADS Level 6.2 ( Leave blank if not stated )"
                  value={capacityForm.schadsLevel}
                  onChange={(e) =>
                    setCapacityForm((prev) => ({ ...prev, schadsLevel: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Base Hourly Pay Rate ($ AUD / hr)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={capacityForm.hourlyPayRate}
                  onChange={(e) =>
                    setCapacityForm((prev) => ({ ...prev, hourlyPayRate: Number(e.target.value) }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCapacityPrac(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold cursor-pointer"
                >
                  Save to Firestore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
