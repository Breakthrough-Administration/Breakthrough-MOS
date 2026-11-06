'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Users,
  Copy,
  Check,
  FilePlus,
  RotateCcw,
  Maximize2
} from 'lucide-react';
import { useManagementStore } from '@/stores/useManagementStore';
import type { AssistantTaskMode, AssistantTurnContext } from '@/services/chatService';

interface DrawerMessage {
  role: 'user' | 'model';
  text: string;
}

interface BreakthroughAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BreakthroughAssistantDrawer: React.FC<BreakthroughAssistantDrawerProps> = ({
  isOpen,
  onClose
}) => {
  const {
    clients,
    caseNotes,
    claims,
    incidents,
    restrictivePractices,
    scheduledShifts,
    selectedClientId,
    setSelectedClientId,
    currentUser,
    isUsingMockData,
    addCaseNote,
    addNotification,
    setActiveTab
  } = useManagementStore();

  const [taskMode, setTaskMode] = useState<AssistantTaskMode>('general');
  const [noteFormat, setNoteFormat] = useState<'SOAP' | 'BIRP' | 'SIMPL'>('SOAP');
  const [contextClientId, setContextClientId] = useState<string>(selectedClientId || '');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (selectedClientId && !contextClientId) {
      setContextClientId(selectedClientId);
    }
  }, [selectedClientId, contextClientId]);

  const selectedParticipant = useMemo(
    () => clients.find((c) => c.id === contextClientId) || null,
    [clients, contextClientId]
  );

  const [messages, setMessages] = useState<DrawerMessage[]>([
    {
      role: 'model',
      text: `Hello. I am **Breakthrough Assistant**.\n\nI can help you understand supplied participant records, edit case notes (**SOAP**, **BIRP**, or **SIMPL**), check NDIS plan budgets in AUD, review incident/restrictive-practice protocols, or identify required SCHADS Award facts.\n\n*Drafts and recommendations require staff review before saving or submitting.*`
    }
  ]);

  if (!isOpen) return null;

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

  const handleSend = async (promptOverride?: string) => {
    const textToSend = promptOverride || input;
    if (!textToSend.trim() || isLoading) return;

    const updatedMessages: DrawerMessage[] = [...messages, { role: 'user', text: textToSend }];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          sessionId: selectedParticipant
            ? `drawer-${selectedParticipant.id}`
            : 'drawer-general',
          context: buildRequestContext()
        })
      });
      const data = await res.json();
      setMessages([
        ...updatedMessages,
        {
          role: 'model',
          text:
            data.reply ||
            'Breakthrough Assistant could not generate a response from the supplied inputs.'
        }
      ]);
    } catch {
      setMessages([
        ...updatedMessages,
        {
          role: 'model',
          text: `[Breakthrough Assistant] Unable to reach the assistant endpoint. No records were modified.`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    const sessionId = selectedParticipant
      ? `drawer-${selectedParticipant.id}`
      : 'drawer-general';
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear', sessionId })
    }).catch(() => {});

    setMessages([
      {
        role: 'model',
        text: `Conversation reset. ${
          selectedParticipant
            ? `Scoped strictly to **${selectedParticipant.name}** (NDIS #${selectedParticipant.ndisNumber || 'not stated'}).`
            : 'Operating in General Practice Mode.'
        }`
      }
    ]);
  };

  const handleSaveAsDraftNote = (text: string) => {
    const targetClient = selectedParticipant || clients[0];
    if (!targetClient) {
      addNotification({
        title: 'No Participant Selected',
        message: 'Select a participant in the assistant header before saving a draft case note.',
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
      title: 'Draft Case Note Created (Requires Staff Review)',
      message: `Saved under ${targetClient.name} with status "Draft".`,
      type: 'clinical',
      severity: 'low',
      linkTab: 'case-notes'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
      <div className="fixed inset-0" onClick={onClose} />
      <aside className="relative z-10 w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-extrabold text-white">Breakthrough Assistant</h2>
                <span className="text-slate-600" aria-hidden="true">·</span>
                <span className="text-[10px] font-semibold text-teal-400">Staff Decision Support</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Australian English · Evidence-bounded · Drafts require staff review
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setActiveTab('ai-predictive-insights');
                onClose();
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Open full Breakthrough Assistant workspace"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Reset conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close Breakthrough Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Context & Task Mode Controls */}
        <div className="p-3 bg-slate-950/50 border-b border-slate-800 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="text-[11px] text-slate-400 shrink-0">Participant:</span>
            <select
              value={contextClientId}
              onChange={(e) => {
                setContextClientId(e.target.value);
                if (e.target.value) setSelectedClientId(e.target.value);
              }}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              <option value="">Unassigned (General Practice Only)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.ndisNumber || 'NDIS not stated'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={taskMode}
              onChange={(e) => setTaskMode(e.target.value as AssistantTaskMode)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="general">Mode: General NDIS &amp; Practice Support</option>
              <option value="case-note-draft">Mode: Case Note Editor (SOAP/BIRP/SIMPL)</option>
              <option value="incident-review">Mode: Incident &amp; Restrictive Practice Review</option>
              <option value="ndis-claim-check">Mode: NDIS Plan, Funding &amp; Claim Check (AUD)</option>
              <option value="schads-check">Mode: Staff Scheduling &amp; SCHADS Award</option>
              <option value="document-extract">Mode: Document Classification &amp; Extraction</option>
            </select>

            {taskMode === 'case-note-draft' && (
              <select
                value={noteFormat}
                onChange={(e) => setNoteFormat(e.target.value as 'SOAP' | 'BIRP' | 'SIMPL')}
                className="bg-slate-900 border border-teal-500/40 rounded-lg px-2 py-1 text-xs font-bold text-teal-300 focus:outline-none cursor-pointer"
              >
                <option value="SOAP">SOAP</option>
                <option value="BIRP">BIRP</option>
                <option value="SIMPL">SIMPL</option>
              </select>
            )}
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'model' && (
                <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`p-3 rounded-2xl max-w-[85%] leading-relaxed space-y-2 ${
                  m.role === 'user'
                    ? 'bg-teal-600 text-white rounded-tr-xs'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/70 rounded-tl-xs whitespace-pre-line'
                }`}
              >
                <div>{m.text}</div>
                {m.role === 'model' && idx > 0 && (
                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                    <span>Requires staff review</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(m.text);
                          setCopiedIdx(idx);
                          setTimeout(() => setCopiedIdx(null), 2000);
                        }}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedIdx === idx ? (
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
                        onClick={() => handleSaveAsDraftNote(m.text)}
                        className="px-2 py-0.5 rounded bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 flex items-center gap-1 cursor-pointer"
                      >
                        <FilePlus className="w-3 h-3" /> Draft Note
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {m.role === 'user' && (
                <div className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/90 border border-slate-700/70 text-slate-400 animate-pulse">
                Checking supplied records and preparing response...
              </div>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="px-4 py-2 border-t border-slate-800/80 flex flex-wrap gap-1.5 bg-slate-950/30">
          {[
            selectedParticipant
              ? `Summarise ${selectedParticipant.name}'s supplied budget (AUD) & goals`
              : 'What evidence is required for an NDIS claim?',
            'Check SCHADS broken shift requirements',
            'Review SOAP case note structure'
          ].map((chip, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(chip)}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 border-t border-slate-800 flex gap-2 bg-slate-900"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Breakthrough Assistant or paste a draft note..."
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </aside>
    </div>
  );
};
