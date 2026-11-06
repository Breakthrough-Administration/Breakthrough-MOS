'use client';

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  Users,
  RotateCcw,
  Copy,
  Check,
  FilePlus,
  Info
} from 'lucide-react';
import { useManagementStore } from '@/stores/useManagementStore';
import type { AssistantTaskMode, AssistantTurnContext } from '@/services/chatService';

interface Message {
  role: 'user' | 'model';
  text: string;
  taskMode?: AssistantTaskMode;
  participantName?: string;
}

const TASK_MODES: { id: AssistantTaskMode; label: string; hint: string }[] = [
  {
    id: 'general',
    label: 'General Practice & Operations',
    hint: 'NDIS practice operations, compliance preparation, and general framework questions'
  },
  {
    id: 'case-note-draft',
    label: 'Case Note Editor (SOAP / BIRP / SIMPL)',
    hint: 'Preserves author meaning and material facts; marks missing fields as "not stated"'
  },
  {
    id: 'incident-review',
    label: 'Incident & Restrictive Practice Review',
    hint: 'Identifies urgent safety concerns (000) and possible reportable incidents for prompt policy review'
  },
  {
    id: 'ndis-claim-check',
    label: 'NDIS Plans, Funding & Claims (AUD)',
    hint: 'Shows inputs, method, AUD units, and required claiming evidence'
  },
  {
    id: 'schads-check',
    label: 'Staff Scheduling & SCHADS Award',
    hint: 'Identifies missing classification, employment type, hours, and break facts'
  },
  {
    id: 'document-extract',
    label: 'Document Classification & Extraction',
    hint: 'Classifies by evidenced content; leaves uncertain participant matches unassigned for review'
  }
];

export const AIPredictiveInsights: React.FC = () => {
  const {
    clients,
    caseNotes,
    claims,
    incidents,
    restrictivePractices,
    abcLogs,
    scheduledShifts,
    selectedClientId,
    setSelectedClientId,
    currentUser,
    isUsingMockData,
    addCaseNote,
    addNotification
  } = useManagementStore();

  const [taskMode, setTaskMode] = useState<AssistantTaskMode>('general');
  const [noteFormat, setNoteFormat] = useState<'SOAP' | 'BIRP' | 'SIMPL'>('SOAP');
  const [contextClientId, setContextClientId] = useState<string>(selectedClientId || '');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const selectedParticipant = useMemo(
    () => clients.find((c) => c.id === contextClientId) || null,
    [clients, contextClientId]
  );

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: `Hello. I am **Breakthrough Assistant**, your decision-support and drafting assistant for Breakthrough NDIS practice management.\n\n- **Participant & Clinical Records:** Select a single participant above to ground answers strictly in their supplied record (missing fields are marked as *not stated*).\n- **Case Notes (SOAP, BIRP, SIMPL):** Paste a draft to improve clarity and structure without adding unverified observations.\n- **NDIS Claims & SCHADS Award:** Ask about claiming requirements, budget utilisation in AUD, or roster conditions.\n\n*Note: Drafts and recommendations require qualified staff review before they are entered, signed, or submitted.*`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Evidence-based analytics calculated strictly from supplied store data
  const budgetMetrics = useMemo(() => {
    const targetList = selectedParticipant ? [selectedParticipant] : clients;
    if (targetList.length === 0) {
      return {
        hasData: false,
        allocatedAud: 0,
        spentAud: 0,
        remainingAud: 0,
        utilisationPct: null as number | null,
        participantCount: 0
      };
    }

    const allocatedAud = targetList.reduce(
      (sum, c) => sum + Number(c.allocatedBudget ?? c.totalBudget ?? 0),
      0
    );
    const spentAud = targetList.reduce((sum, c) => sum + Number(c.spentBudget ?? 0), 0);
    const remainingAud = Math.max(0, allocatedAud - spentAud);
    const utilisationPct =
      allocatedAud > 0 ? Number(((spentAud / allocatedAud) * 100).toFixed(1)) : null;

    return {
      hasData: true,
      allocatedAud,
      spentAud,
      remainingAud,
      utilisationPct,
      participantCount: targetList.length
    };
  }, [clients, selectedParticipant]);

  const behaviourAndIncidentMetrics = useMemo(() => {
    const scopedIncidents = selectedParticipant
      ? incidents.filter((i) => i.clientId === selectedParticipant.id)
      : incidents;
    const scopedAbc = selectedParticipant
      ? abcLogs.filter((a) => a.clientId === selectedParticipant.id)
      : abcLogs;

    const openIncidents = scopedIncidents.filter((i) => i.status !== 'Closed');
    const reportableCandidates = scopedIncidents.filter(
      (i) => i.severity?.includes('Critical') || i.severity?.includes('24h') || i.isNdisReportable
    );

    // Top perceived function from supplied ABC logs (correlation only, not causation)
    const functionCounts: Record<string, number> = {};
    for (const log of scopedAbc) {
      const fn = log.perceivedFunction || 'Not stated';
      functionCounts[fn] = (functionCounts[fn] || 0) + 1;
    }
    const topFunctionEntry = Object.entries(functionCounts).sort((a, b) => b[1] - a[1])[0] || null;

    return {
      totalIncidents: scopedIncidents.length,
      openIncidentsCount: openIncidents.length,
      reportableCandidatesCount: reportableCandidates.length,
      totalAbcLogs: scopedAbc.length,
      topPerceivedFunction: topFunctionEntry ? `${topFunctionEntry[0]} (${topFunctionEntry[1]} logs)` : 'Not stated'
    };
  }, [incidents, abcLogs, selectedParticipant]);

  const documentationMetrics = useMemo(() => {
    const scopedNotes = selectedParticipant
      ? caseNotes.filter((n) => n.clientId === selectedParticipant.id)
      : caseNotes;
    const scopedRp = selectedParticipant
      ? restrictivePractices.filter((r) => r.clientId === selectedParticipant.id)
      : restrictivePractices;

    const notesWithGoals = scopedNotes.filter(
      (n) => Array.isArray(n.linkedGoalIds) && n.linkedGoalIds.length > 0
    ).length;
    const goalLinkPct =
      scopedNotes.length > 0 ? Number(((notesWithGoals / scopedNotes.length) * 100).toFixed(1)) : null;
    const dueRpCount = scopedRp.filter((r) => r.monthlyReportStatus === 'Due' || r.monthlyReportStatus === 'Overdue').length;

    return {
      totalNotes: scopedNotes.length,
      notesWithGoals,
      goalLinkPct,
      dueRpCount
    };
  }, [caseNotes, restrictivePractices, selectedParticipant]);

  const buildRequestContext = (): AssistantTurnContext => {
    const p = selectedParticipant;
    return {
      taskMode,
      noteFormat,
      participantContext: p
        ? {
            id: p.id,
            name: p.name,
            ndisNumber: p.ndisNumber || 'not stated',
            dateOfBirth: p.dateOfBirth || 'not stated',
            primaryDisability: p.primaryDisability || 'not stated',
            secondaryDisabilities: p.secondaryDisabilities || [],
            planStartDate: p.planStartDate || 'not stated',
            planEndDate: p.planEndDate || 'not stated',
            planManagementType: p.planManagementType || 'not stated',
            totalBudget: p.totalBudget,
            allocatedBudget: p.allocatedBudget,
            spentBudget: p.spentBudget,
            riskLevel: p.riskLevel || 'not stated',
            goals: (p.goals || []).map((g) => ({
              id: g.id,
              title: g.title,
              category: g.category,
              progressPercent: g.progressPercent ?? g.progress,
              status: g.status
            })),
            recentCaseNotes: caseNotes
              .filter((n) => n.clientId === p.id)
              .slice(0, 5)
              .map((n) => ({
                id: n.id,
                date: n.date,
                format: n.format,
                supportItemCode: n.supportItemCode,
                subjective: n.subjective,
                objective: n.objective,
                assessment: n.assessment,
                plan: n.plan
              })),
            incidents: incidents
              .filter((i) => i.clientId === p.id)
              .slice(0, 5)
              .map((i) => ({
                id: i.id,
                date: i.date || i.incidentDate,
                type: i.type,
                severity: i.severity,
                status: i.status,
                description: i.description,
                actionTaken: i.actionTaken || i.immediateActionTaken
              })),
            restrictivePractices: restrictivePractices
              .filter((r) => r.clientId === p.id)
              .map((r) => ({
                id: r.id,
                practiceType: r.practiceType || r.type,
                status: r.status,
                expiryDate: r.expiryDate,
                monthlyReportStatus: r.monthlyReportStatus
              })),
            claims: claims
              .filter((c) => c.clientId === p.id)
              .slice(0, 5)
              .map((c) => ({
                id: c.id,
                serviceDate: c.serviceDate,
                supportItemCode: c.supportItemCode,
                hours: c.hours,
                unitRate: c.unitRate,
                totalAmount: c.totalAmount,
                status: c.status
              }))
          }
        : null,
      practiceSummary: {
        isUsingSampleData: isUsingMockData,
        activeParticipantsCount: clients.filter((c) => c.status === 'Active').length,
        pendingClaimsCount: claims.filter((c) => c.status === 'Pending').length,
        totalClaimsAud: claims.reduce((sum, c) => sum + Number(c.totalAmount || 0), 0),
        openIncidentsCount: incidents.filter((i) => i.status !== 'Closed').length,
        dueRestrictivePracticesCount: restrictivePractices.filter(
          (r) => r.monthlyReportStatus === 'Due'
        ).length,
        scheduledShiftsCount: scheduledShifts.length,
        supportCatalogueEffectiveDate: '2026-07-01 (Supplied App Catalogue)'
      }
    };
  };

  const handleSend = async (userPrompt?: string) => {
    const textToSend = userPrompt || input;
    if (!textToSend.trim() || isLoading) return;

    const newMsgs: Message[] = [
      ...messages,
      {
        role: 'user',
        text: textToSend,
        taskMode,
        participantName: selectedParticipant?.name
      }
    ];
    setMessages(newMsgs);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          sessionId: selectedParticipant ? `session-${selectedParticipant.id}` : 'practice-session',
          context: buildRequestContext()
        })
      });
      const data = await res.json();
      if (data.reply) {
        setMessages([
          ...newMsgs,
          {
            role: 'model',
            text: data.reply,
            taskMode,
            participantName: selectedParticipant?.name
          }
        ]);
      } else {
        setMessages([
          ...newMsgs,
          {
            role: 'model',
            text: 'Breakthrough Assistant could not generate a response from the supplied inputs. Please verify your request and try again.'
          }
        ]);
      }
    } catch {
      setMessages([
        ...newMsgs,
        {
          role: 'model',
          text: `[Breakthrough Assistant] Unable to reach the server assistant endpoint for: "${textToSend}". No records were modified.`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSession = async () => {
    const sessionId = selectedParticipant ? `session-${selectedParticipant.id}` : 'practice-session';
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear', sessionId })
    }).catch(() => {});

    setMessages([
      {
        role: 'model',
        text: `Session history cleared. ${
          selectedParticipant
            ? `Isolated context active for **${selectedParticipant.name}** (NDIS #${selectedParticipant.ndisNumber || 'not stated'}).`
            : 'General Practice Mode active (no individual participant record attached).'
        }`
      }
    ]);
  };

  const handleSaveAsDraftCaseNote = (text: string) => {
    const targetClient = selectedParticipant || clients[0];
    if (!targetClient) {
      addNotification({
        title: 'Select a Participant First',
        message: 'Choose a participant in the context selector before saving a draft case note.',
        type: 'clinical',
        severity: 'medium'
      });
      return;
    }

    addCaseNote({
      clientId: targetClient.id,
      clientName: targetClient.name,
      practitionerId: currentUser?.id || 'prac-1',
      practitionerName: currentUser?.name || 'Allied Health Practitioner',
      date: new Date().toISOString().split('T')[0],
      sessionDurationMinutes: 60,
      format: noteFormat,
      category: `Breakthrough Assistant Draft (${noteFormat}) — Requires Staff Review`,
      subjective: text,
      objective: 'Not stated — requires practitioner verification before sign-off.',
      assessment: 'Not stated — requires practitioner verification before sign-off.',
      plan: 'Review and edit draft fields in Case Notes before clinical approval.',
      status: 'Draft',
      flaggedForReview: true
    });

    addNotification({
      title: 'Saved as Draft Case Note (Requires Staff Review)',
      message: `Draft saved under ${targetClient.name} with status "Draft". Open Case Notes to review and verify before sign-off.`,
      type: 'clinical',
      severity: 'low',
      linkTab: 'case-notes'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white">
              Breakthrough Assistant &amp; Evidence-Based Insights
            </h1>
            <span className="text-[11px] font-semibold text-teal-400">
              Decision-Support &amp; Drafting
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Staff-facing NDIS practice assistant · Strict participant privacy isolation · Explicit AUD calculation inputs &amp; assumptions
          </p>
        </div>

        {/* Participant Isolation Context Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <Users className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="text-[11px] text-slate-400 font-medium">Participant Context:</span>
            <select
              value={contextClientId}
              onChange={(e) => {
                setContextClientId(e.target.value);
                if (e.target.value) setSelectedClientId(e.target.value);
              }}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-300">
                Unassigned / General Practice Only
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.name} ({c.ndisNumber || 'NDIS not stated'})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleResetSession}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 cursor-pointer"
            title="Clear assistant session memory"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Session
          </button>
        </div>
      </div>

      {/* Data Provenance Notice */}
      <div className="px-4 py-2.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-teal-400 shrink-0" />
          <span>
            <strong>Data Source &amp; Boundary:</strong>{' '}
            {isUsingMockData
              ? 'Sample Dataset Active — Metrics below are calculated from sample records and must not be treated as live participant or business results.'
              : clients.length === 0
              ? 'Zero participant records supplied in current workspace — metrics show "Not stated" until records are added.'
              : `Calculated from ${
                  selectedParticipant ? `supplied record for ${selectedParticipant.name}` : `${clients.length} supplied participant record(s)`
                }. Projections are estimates; correlation does not imply causation.`}
          </span>
        </div>
      </div>

      {/* Evidence-Based Analytics Cards (Calculated Strictly from Supplied Store Data) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Plan Budget Utilisation */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-teal-400">
            <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Plan Budget Utilisation (Estimate)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">AUD</span>
          </div>
          <p className="text-lg font-extrabold text-white font-mono tabular-nums">
            {budgetMetrics.utilisationPct !== null
              ? `${budgetMetrics.utilisationPct}% Utilised`
              : 'Not stated (0 records)'}
          </p>
          <p className="text-xs text-slate-300 font-mono tabular-nums">
            Inputs: Spent ${budgetMetrics.spentAud.toLocaleString('en-AU', { minimumFractionDigits: 2 })} AUD / Allocated $
            {budgetMetrics.allocatedAud.toLocaleString('en-AU', { minimumFractionDigits: 2 })} AUD
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Method: <code className="text-slate-300">(Spent ÷ Allocated) × 100</code> across{' '}
            {budgetMetrics.participantCount} supplied participant record(s). Remaining: $
            {budgetMetrics.remainingAud.toLocaleString('en-AU', { minimumFractionDigits: 2 })} AUD.
          </p>
        </div>

        {/* Card 2: Behaviour & Incident Observations */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Supplied Incident &amp; ABC Records
            </span>
            <span className="text-[10px] text-slate-400 font-mono tabular-nums">
              {behaviourAndIncidentMetrics.totalAbcLogs} ABC · {behaviourAndIncidentMetrics.totalIncidents} Inc
            </span>
          </div>
          <p className="text-lg font-extrabold text-white font-mono tabular-nums">
            {behaviourAndIncidentMetrics.openIncidentsCount} Open ·{' '}
            {behaviourAndIncidentMetrics.reportableCandidatesCount} Flagged for Review
          </p>
          <p className="text-xs text-slate-300">
            Most frequent logged ABC function: <strong>{behaviourAndIncidentMetrics.topPerceivedFunction}</strong>
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Descriptive frequency from supplied logs only (observational correlation, not clinical causation). Promptly review any reportable incident under current NDIS policy.
          </p>
        </div>

        {/* Card 3: Case Note & Restrictive Practice Governance */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-teal-400">
            <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Record Completeness Summary
            </span>
            <span className="text-[10px] text-slate-400 font-mono tabular-nums">
              {documentationMetrics.totalNotes} Notes
            </span>
          </div>
          <p className="text-lg font-extrabold text-white font-mono tabular-nums">
            {documentationMetrics.goalLinkPct !== null
              ? `${documentationMetrics.goalLinkPct}% Linked to Stated Goals`
              : 'Not stated (0 notes)'}
          </p>
          <p className="text-xs text-slate-300 font-mono tabular-nums">
            Inputs: {documentationMetrics.notesWithGoals} of {documentationMetrics.totalNotes} supplied notes link a goal ·{' '}
            {documentationMetrics.dueRpCount} RP report(s) due
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Reflects supplied app records only; does not constitute formal NDIS audit certification or legal compliance verification.
          </p>
        </div>
      </div>

      {/* Breakthrough Assistant Workspace */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col min-h-[580px]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Breakthrough Assistant</h2>
                <span className="text-slate-600" aria-hidden="true">·</span>
                <span className="text-[11px] text-teal-400 font-semibold">
                  {selectedParticipant
                    ? `Scoped to ${selectedParticipant.name}`
                    : 'General Practice Scope'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {TASK_MODES.find((m) => m.id === taskMode)?.hint}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={taskMode}
              onChange={(e) => setTaskMode(e.target.value as AssistantTaskMode)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              {TASK_MODES.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                  {m.label}
                </option>
              ))}
            </select>

            {taskMode === 'case-note-draft' && (
              <select
                value={noteFormat}
                onChange={(e) => setNoteFormat(e.target.value as 'SOAP' | 'BIRP' | 'SIMPL')}
                className="bg-slate-800 border border-teal-500/40 rounded-xl px-2.5 py-1.5 text-xs font-bold text-teal-300 focus:outline-none cursor-pointer"
              >
                <option value="SOAP">Format: SOAP</option>
                <option value="BIRP">Format: BIRP</option>
                <option value="SIMPL">Format: SIMPL</option>
              </select>
            )}
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 text-xs max-h-[380px]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'model' && (
                <div className="w-7 h-7 rounded-xl bg-teal-600/30 text-teal-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed space-y-2 ${
                  m.role === 'user'
                    ? 'bg-teal-600 text-white rounded-tr-sm'
                    : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-tl-sm whitespace-pre-line'
                }`}
              >
                <div>{m.text}</div>

                {m.role === 'model' && idx > 0 && (
                  <div className="pt-2 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
                    <span>Draft / Decision Support — Requires qualified staff review</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(m.text);
                          setCopiedIndex(idx);
                          setTimeout(() => setCopiedIndex(null), 2000);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3 h-3 text-teal-400" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveAsDraftCaseNote(m.text)}
                        className="px-2 py-1 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 flex items-center gap-1 cursor-pointer"
                      >
                        <FilePlus className="w-3 h-3" /> Save as Draft Note
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-xl bg-teal-600/30 text-teal-400 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-400 animate-pulse">
                Analysing supplied records and preparing response...
              </div>
            </div>
          )}
        </div>

        {/* Quick Task Prompts */}
        <div className="flex flex-wrap gap-2 pt-2">
          {[
            selectedParticipant
              ? `Summarise supplied plan budget (AUD), stated goals, and missing fields for ${selectedParticipant.name}`
              : 'What facts are required to check a NDIS provider travel claim?',
            'Format a BIRP case note draft preserving my observations and marking missing fields as not stated',
            'What facts do I need to check SCHADS Award broken shift entitlements?',
            'What is the escalation protocol for an urgent incident or possible restrictive practice?'
          ].map((promptText, i) => (
            <button
              key={i}
              onClick={() => handleSend(promptText)}
              className="text-[11px] px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors cursor-pointer text-left"
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2 pt-2 border-t border-slate-800"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              selectedParticipant
                ? `Ask about ${selectedParticipant.name}'s supplied record, paste a draft ${noteFormat} note, or check NDIS/SCHADS rules...`
                : 'Paste a draft case note (SOAP/BIRP/SIMPL), or ask about NDIS plans, claims, incidents, or SCHADS Award...'
            }
            className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> Send
          </button>
        </form>
      </div>
    </div>
  );
};
