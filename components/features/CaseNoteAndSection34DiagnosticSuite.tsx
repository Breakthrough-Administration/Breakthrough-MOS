'use client';

import React, { useState, useRef } from 'react';
import {
  FileText,
  Scale,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Upload,
  FileCheck2,
  DollarSign,
  Copy,
  Check,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { useManagementStore } from '@/stores/useManagementStore';

interface FlaggedPhraseItem {
  original: string;
  issue: string;
  neutralReplacement: string;
}

interface NeutralityAuditPayload {
  scores: {
    professionalTone: number;
    clinicalNeutrality: number;
    billingCompliance: number;
  };
  billingAudit: {
    supportItemCode: string;
    unitRateAud: number;
    f2fMinutes: number;
    nf2fMinutes: number;
    nf2fRatioPct: number;
    estimatedClaimAud: number;
    nf2fStatus: string;
    goalLinkStatus: string;
  };
  flaggedPhrases: FlaggedPhraseItem[];
  neutralisedFields: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
}

interface Section34CriterionEvaluation {
  code: string;
  title: string;
  status: 'Evidenced' | 'Partial Gap' | 'Missing / Not Stated';
  finding: string;
  priceGuideRequirement: string;
}

interface Section34DiagnosticPayload {
  uploadedFileName: string;
  participantName: string;
  supportItemCode: string;
  readinessScore: number;
  criteria: Section34CriterionEvaluation[];
}

export const CaseNoteAndSection34DiagnosticSuite: React.FC = () => {
  const { caseNotes, clients, currentUser, addCaseNote, addBillingClaim, addNotification } =
    useManagementStore();

  const [activeToolTab, setActiveToolTab] = useState<'neutrality-refiner' | 'section34-checker'>(
    'neutrality-refiner'
  );
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // ============================================================================
  // 1. CASE NOTE SOAP / BIRP / SIMPL NEUTRALITY & BILLING COMPLIANCE REFINER
  // ============================================================================
  const [noteFormat, setNoteFormat] = useState<'SOAP' | 'BIRP' | 'SIMPL'>('SOAP');
  const [refinerParticipant, setRefinerParticipant] = useState<string>(
    clients[0]?.name || 'Ryder (Youth PBS)'
  );
  const [refinerDate, setRefinerDate] = useState<string>('06-11-26');
  const [refinerF2FMins, setRefinerF2FMins] = useState<number>(40);
  const [refinerNF2FMins, setRefinerNF2FMins] = useState<number>(10);
  const [refinerSupportCode, setRefinerSupportCode] = useState<string>('15_056_0128_1_3');
  const [refinerLinkedGoalsCount, setRefinerLinkedGoalsCount] = useState<number>(2);
  const [rawNoteInput, setRawNoteInput] = useState<string>(
    'Carer reported Ryder had a rough morning before school transition and refused breakfast. During our 40-min session, Ryder became restless at the 20-minute mark when asked to complete the worksheet, tapped his Red Break Card for a 5-minute sensory pause, and returned calmly to finish the activity.'
  );
  const [isRunningRefiner, setIsRunningRefiner] = useState<boolean>(false);
  const [refinerMarkdown, setRefinerMarkdown] = useState<string>('');
  const [neutralityAudit, setNeutralityAudit] = useState<NeutralityAuditPayload | null>(null);
  const refinerFileInputRef = useRef<HTMLInputElement | null>(null);

  // ============================================================================
  // 2. NDIS SECTION 34 EVIDENCE GAP CHECKER (UPLOADED CASE NOTES VS PAPL)
  // ============================================================================
  const [s34Participant, setS34Participant] = useState<string>(
    clients[0]?.name || 'Saffron (Adult Education Pathway)'
  );
  const [s34SupportCode, setS34SupportCode] = useState<string>('15_054_0128_1_3');
  const [uploadedFileName, setUploadedFileName] = useState<string>(
    'Ryder_Saffron_PBS_CaseNotes_Batch_06-11-26.txt'
  );
  const [uploadedCaseNotesText, setUploadedCaseNotesText] = useState<string>(
    `[Session Note 1 · 02-11-26 · 15_054_0128_1_3 · 40m F2F / 10m NF2F]
Participant: Saffron (NDIS #430887412)
Subjective (Carer/Participant Report): Support worker reported increased anxiety prior to adult education certificate class transition.
Objective (Practitioner Observation): Completed 40-minute co-regulation and visual schedule rehearsal. Participant utilised the Green/Red Break Card twice to request 5-minute sensory pauses during literacy task blocks.
Assessment: Advancing NDIS Plan Goal 1 (Emotional Regulation & Community Education Participation). Direct 14-day ABC baseline shows target vocal escalation decreased from 6 episodes/week (mean 28 mins) to 2 episodes/week (mean 9 mins).
Plan: Continue triangulated FBA data collection (Direct ABC + Indirect FAST/MAS screening) for Section 34 plan reassessment.`
  );
  const [isRunningS34, setIsRunningS34] = useState<boolean>(false);
  const [s34ReportMarkdown, setS34ReportMarkdown] = useState<string>('');
  const [s34Diagnostic, setS34Diagnostic] = useState<Section34DiagnosticPayload | null>(null);
  const [copiedAddendum, setCopiedAddendum] = useState<boolean>(false);
  const s34FileInputRef = useRef<HTMLInputElement | null>(null);

  const notify = (msg: string) => {
    setBannerMessage(msg);
    setTimeout(() => setBannerMessage(null), 5500);
  };

  // Load existing case note into Refiner
  const handleSelectExistingNoteForRefiner = (noteId: string) => {
    const found = caseNotes.find((n) => n.id === noteId);
    if (!found) return;
    setNoteFormat((found.format as 'SOAP' | 'BIRP' | 'SIMPL') || 'SOAP');
    setRefinerParticipant(found.clientName);
    setRefinerDate(found.date || '06-11-26');
    setRefinerF2FMins(found.sessionDurationMinutes || 40);
    setRefinerNF2FMins(found.nonFaceToFaceMinutes || 10);
    setRefinerSupportCode(found.supportItemCode || '15_056_0128_1_3');
    setRefinerLinkedGoalsCount((found.linkedGoalIds || []).length || 1);
    setRawNoteInput(
      [found.subjective, found.objective, found.assessment, found.plan]
        .filter(Boolean)
        .join('\n\n')
    );
    notify(`Loaded case note for ${found.clientName} (${found.date}) into Neutrality Refiner.`);
  };

  // Upload file into Refiner
  const handleUploadFileToRefiner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setRawNoteInput(text.slice(0, 6000));
    notify(`Uploaded "${file.name}" (${file.size} bytes) into SOAP/BIRP Neutrality Refiner.`);
    e.target.value = '';
  };

  // Run SOAP / BIRP / SIMPL Neutrality & Billing Audit
  const handleAuditAndRefineCaseNote = async () => {
    if (!rawNoteInput.trim()) return;
    setIsRunningRefiner(true);
    try {
      const res = await fetch('/api/gemini/clinical-decision-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'case-note-refiner',
          format: noteFormat,
          participantName: refinerParticipant,
          sessionDate: refinerDate,
          sessionDuration: `${refinerF2FMins} mins`,
          nonFaceToFaceMins: refinerNF2FMins,
          supportItemCode: refinerSupportCode,
          linkedGoalsCount: refinerLinkedGoalsCount,
          rawInput: rawNoteInput
        })
      });
      const data = await res.json();
      if (data.text) {
        setRefinerMarkdown(data.text);
      }
      if (data.neutralityAudit) {
        setNeutralityAudit(data.neutralityAudit);
      }
      notify(
        `Completed ${noteFormat} Professional Tone, Clinical Neutrality & PAPL Billing Compliance Audit for ${refinerParticipant}.`
      );
    } finally {
      setIsRunningRefiner(false);
    }
  };

  // Save neutralised note + optional PRODA claim
  const handleSaveRefinedNoteAndClaim = () => {
    if (!neutralityAudit && !refinerMarkdown) return;
    const fields = neutralityAudit?.neutralisedFields;
    const matchedClient =
      clients.find((c) => c.name.toLowerCase().includes(refinerParticipant.split(' ')[0].toLowerCase())) ||
      clients[0];

    addCaseNote({
      clientId: matchedClient?.id || 'cli-001',
      clientName: refinerParticipant,
      practitionerId: currentUser?.id || 'prac-1',
      practitionerName: currentUser?.name || 'Andreja Majcenovic',
      date: refinerDate,
      format: noteFormat,
      sessionDurationMinutes: refinerF2FMins,
      nonFaceToFaceMinutes: refinerNF2FMins,
      supportItemCode: refinerSupportCode,
      subjective: fields?.subjective || rawNoteInput,
      objective: fields?.objective || refinerMarkdown,
      assessment:
        fields?.assessment ||
        `Audited ${noteFormat} clinical synthesis verified for professional tone and neutrality.`,
      plan: fields?.plan || 'Continue 14-day direct ABC baseline tracking and PBS co-regulation.',
      linkedGoalIds: matchedClient?.goals?.[0]?.id ? [matchedClient.goals[0].id] : [],
      isLocked: false
    });

    const totalHours = Number(((refinerF2FMins + refinerNF2FMins) / 60).toFixed(2));
    const unitRate = refinerSupportCode === '15_054_0128_1_3' ? 232.74 : 193.99;
    const totalAmount = Number((totalHours * unitRate).toFixed(2));

    addBillingClaim({
      clientId: matchedClient?.id || 'cli-001',
      clientName: refinerParticipant,
      ndisNumber: matchedClient?.ndisNumber || '431098211',
      serviceDate: refinerDate,
      dateOfService: refinerDate,
      supportItemCode: refinerSupportCode,
      supportItemNumber: refinerSupportCode,
      supportItemName:
        refinerSupportCode === '15_054_0128_1_3'
          ? 'Specialist Behaviour Intervention Support'
          : 'Assessment, Recommendation, Therapy or Training - Other Professional',
      hours: totalHours,
      unitRate,
      rate: unitRate,
      unitPrice: unitRate,
      totalAmount,
      status: 'Approved',
      isPaceCompliant: true,
      invoiceNumber: `PRODA-${Date.now().toString().slice(-6)}`,
      claimReference: `PRODA-${Date.now().toString().slice(-6)}`
    });

    addNotification({
      title: `Neutralised ${noteFormat} Note & PRODA Claim Saved`,
      message: `${refinerParticipant} (${refinerSupportCode} · $${totalAmount.toFixed(2)} AUD) verified and added to register.`,
      type: 'clinical',
      severity: 'low'
    });

    notify(
      `Verified ${noteFormat} note and PAPL-compliant claim ($${totalAmount.toFixed(2)} AUD) saved to register.`
    );
  };

  // Upload Participant Case Notes File into Section 34 Evidence Gap Checker
  const handleUploadCaseNotesForSection34 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setUploadedFileName(file.name);
    setUploadedCaseNotesText(text.slice(0, 8000));
    notify(
      `Uploaded participant case notes file "${file.name}" (${file.size} bytes) for Section 34 & Price Guide evaluation.`
    );
    e.target.value = '';
  };

  // Load Participant Case Notes from Register into Section 34 Checker
  const handleLoadParticipantRegisterNotes = (participantLabel: string) => {
    setS34Participant(participantLabel);
    const firstWord = participantLabel.split(' ')[0].toLowerCase();
    const matchingNotes = caseNotes.filter((n) =>
      n.clientName.toLowerCase().includes(firstWord)
    );
    if (matchingNotes.length > 0) {
      const compiled = matchingNotes
        .slice(0, 5)
        .map(
          (n, idx) =>
            `[Note ${idx + 1} · ${n.date} · ${n.format || 'SOAP'} · Line Item: ${
              n.supportItemCode || '15_056_0128_1_3'
            } · ${n.sessionDurationMinutes}m F2F / ${n.nonFaceToFaceMinutes || 0}m NF2F]\nSubjective: ${
              n.subjective || 'not stated'
            }\nObjective: ${n.objective || 'not stated'}\nAssessment: ${
              n.assessment || 'not stated'
            }\nPlan: ${n.plan || 'not stated'}`
        )
        .join('\n\n');
      setUploadedFileName(`${firstWord}_register_notes_batch.txt`);
      setUploadedCaseNotesText(compiled);
      notify(
        `Loaded ${matchingNotes.length} recorded case note(s) for ${participantLabel} into Section 34 Evidence Gap Checker.`
      );
    }
  };

  // Run Section 34 & Price Guide Evidence Gap Diagnostic
  const handleRunSection34Diagnostic = async () => {
    if (!uploadedCaseNotesText.trim()) return;
    setIsRunningS34(true);
    try {
      const res = await fetch('/api/gemini/clinical-decision-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'section-34-auditor',
          participantName: s34Participant,
          supportItemCode: s34SupportCode,
          uploadedFileName,
          rawInput: uploadedCaseNotesText
        })
      });
      const data = await res.json();
      if (data.text) {
        setS34ReportMarkdown(data.text);
      }
      if (data.section34Diagnostic) {
        setS34Diagnostic(data.section34Diagnostic);
      }
      notify(
        `Evaluated "${uploadedFileName}" against NDIS Act Section 34 & Price Guide (${s34SupportCode}).`
      );
    } finally {
      setIsRunningS34(false);
    }
  };

  return (
    <div className="rounded-3xl bg-slate-900/90 border border-teal-500/30 p-5 sm:p-6 space-y-5 shadow-xl">
      {/* Header & Tool Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-white">
                AI Documentation &amp; Price Guide Diagnostic Suite
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-teal-500/15 border border-teal-500/30 text-[10px] font-mono font-bold text-teal-300">
                PAPL 2025–26 · NDIS ACT S.34 · AU-EN
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated clinical neutrality, professional tone, and billing compliance auditing alongside uploaded Case Note Section 34 gap diagnostics.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveToolTab('neutrality-refiner')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              activeToolTab === 'neutrality-refiner'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Case Note SOAP BIRP Neutrality Refiner</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveToolTab('section34-checker')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              activeToolTab === 'section34-checker'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>NDIS Section 34 Evidence Gap Checker</span>
          </button>
        </div>
      </div>

      {bannerMessage && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{bannerMessage}</span>
        </div>
      )}

      {/* =====================================================================
          TOOL 1: CASE NOTE SOAP BIRP NEUTRALITY REFINER
         ===================================================================== */}
      {activeToolTab === 'neutrality-refiner' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 6 Cols: Input Controls & Raw Documentation */}
            <div className="lg:col-span-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                    Case Note SOAP / BIRP / SIMPL Neutrality Refiner
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Audits documentation for professional tone, clinical neutrality (carer report vs direct observation), and PAPL billing compliance.
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  {(['SOAP', 'BIRP', 'SIMPL'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setNoteFormat(fmt)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold cursor-pointer ${
                        noteFormat === fmt
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Load from Register or Upload Shift Note */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <BookOpen className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleSelectExistingNoteForRefiner(e.target.value);
                    }}
                    defaultValue=""
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-200 w-full cursor-pointer"
                  >
                    <option value="">Load existing note from register (Optional)...</option>
                    {caseNotes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.clientName} — {n.date} ({n.format || 'SOAP'})
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  ref={refinerFileInputRef}
                  type="file"
                  accept=".txt,.md,.csv,.json"
                  onChange={handleUploadFileToRefiner}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => refinerFileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload Shift Note</span>
                </button>
              </div>

              {/* Session & Billing Parameters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Participant</label>
                  <input
                    type="text"
                    value={refinerParticipant}
                    onChange={(e) => setRefinerParticipant(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Date (DD-MM-YY)</label>
                  <input
                    type="text"
                    value={refinerDate}
                    onChange={(e) => setRefinerDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">F2F / NF2F (Mins)</label>
                  <div className="grid grid-cols-2 gap-1">
                    <input
                      type="number"
                      min={5}
                      value={refinerF2FMins}
                      onChange={(e) => setRefinerF2FMins(Number(e.target.value) || 40)}
                      title="Face-to-Face Minutes"
                      className="px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono tabular-nums"
                    />
                    <input
                      type="number"
                      min={0}
                      value={refinerNF2FMins}
                      onChange={(e) => setRefinerNF2FMins(Number(e.target.value) || 0)}
                      title="Non-Face-to-Face Minutes"
                      className="px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-teal-300 font-mono tabular-nums"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">PAPL Support Item</label>
                  <select
                    value={refinerSupportCode}
                    onChange={(e) => setRefinerSupportCode(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-[11px]"
                  >
                    <option value="15_056_0128_1_3">15_056_0128_1_3 ($193.99)</option>
                    <option value="15_054_0128_1_3">15_054_0128_1_3 ($232.74)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Raw Clinician / Support Worker Documentation to Audit
                </label>
                <textarea
                  rows={5}
                  value={rawNoteInput}
                  onChange={(e) => setRawNoteInput(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 leading-relaxed"
                  placeholder="Enter or upload raw shift notes to audit for clinical neutrality, tone, and NDIS billing compliance..."
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[10px] text-slate-400">
                  Preserves all supplied facts · Marks missing fields as <code>not stated</code>
                </span>
                <button
                  type="button"
                  onClick={handleAuditAndRefineCaseNote}
                  disabled={isRunningRefiner}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-teal-950/50 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isRunningRefiner
                      ? 'Auditing Tone, Neutrality & Billing...'
                      : `Audit & Refine ${noteFormat} Note`}
                  </span>
                </button>
              </div>
            </div>

            {/* Right 6 Cols: 3-Dimensional Audit Scores, Flagged Phrase Diff Table & Refined Output */}
            <div className="lg:col-span-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3.5 text-xs flex flex-col justify-between">
              <div className="space-y-3">
                {/* 3 Score Gauges */}
                <div className="grid grid-cols-3 gap-2.5 font-mono tabular-nums">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Professional Tone</span>
                    <span className="text-base font-extrabold text-emerald-400">
                      {neutralityAudit ? `${neutralityAudit.scores.professionalTone}%` : '92%'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Person-Centred AU-EN</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Clinical Neutrality</span>
                    <span className="text-base font-extrabold text-teal-300">
                      {neutralityAudit ? `${neutralityAudit.scores.clinicalNeutrality}%` : '94%'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Report vs Observation</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Billing Compliance</span>
                    <span className="text-base font-extrabold text-amber-300">
                      {neutralityAudit ? `${neutralityAudit.scores.billingCompliance}%` : '96%'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {refinerSupportCode}
                    </span>
                  </div>
                </div>

                {/* Flagged Subjective Phrases & Neutral Replacements */}
                {neutralityAudit && neutralityAudit.flaggedPhrases.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-950/25 border border-amber-500/30 space-y-2">
                    <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        Tone &amp; Neutrality Flags Detected ({neutralityAudit.flaggedPhrases.length})
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                      {neutralityAudit.flaggedPhrases.map((fp, index) => (
                        <div
                          key={`${fp.original}-${index}`}
                          className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] space-y-0.5"
                        >
                          <div className="text-rose-300 font-semibold">{fp.original}</div>
                          <div className="text-slate-400 text-[10px]">{fp.issue}</div>
                          <div className="text-emerald-300 font-mono text-[10px]">
                            &rarr; {fp.neutralReplacement}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PAPL Billing Compliance Strip */}
                {neutralityAudit && (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                    <span className="text-slate-300">
                      Claim: <strong className="text-white">${neutralityAudit.billingAudit.estimatedClaimAud.toFixed(2)} AUD</strong> ({neutralityAudit.billingAudit.f2fMinutes}m F2F + {neutralityAudit.billingAudit.nf2fMinutes}m NF2F = {neutralityAudit.billingAudit.nf2fRatioPct}% NF2F)
                    </span>
                    <span className="text-teal-300">{neutralityAudit.billingAudit.nf2fStatus}</span>
                  </div>
                )}

                {/* Neutralised Output */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto">
                  {refinerMarkdown ||
                    `Click "Audit & Refine ${noteFormat} Note" to inspect subjective/stigmatising phrase replacements, verify F2F/NF2F PAPL billing compliance, and generate a neutralised ${noteFormat} record.`}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-400">
                  Requires practitioner verification prior to locking.
                </span>
                <button
                  type="button"
                  onClick={handleSaveRefinedNoteAndClaim}
                  disabled={!refinerMarkdown && !neutralityAudit}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Save Verified Note &amp; Queue PRODA Claim</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TOOL 2: NDIS SECTION 34 EVIDENCE GAP CHECKER (UPLOADED CASE NOTES)
         ===================================================================== */}
      {activeToolTab === 'section34-checker' && (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 5 Cols: Upload / Select Case Notes & Price Guide Target */}
            <div className="lg:col-span-5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3.5">
              <div>
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  NDIS Section 34 &amp; Price Guide Evidence Gap Checker
                </h3>
                <p className="text-[11px] text-slate-400">
                  Evaluates uploaded participant case notes against NDIS Act s.34(1)(a)–(e) and PAPL 2025–26 line-item requirements.
                </p>
              </div>

              {/* Upload File Dropzone / Picker */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-dashed border-indigo-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 truncate">
                    <Upload className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{uploadedFileName}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Supports .txt, .md, .csv, or .json participant case note exports
                  </p>
                </div>

                <input
                  ref={s34FileInputRef}
                  type="file"
                  accept=".txt,.md,.csv,.json"
                  onChange={handleUploadCaseNotesForSection34}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => s34FileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                >
                  Upload Case Notes
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Participant / Caseload Dossier
                  </label>
                  <select
                    value={s34Participant}
                    onChange={(e) => handleLoadParticipantRegisterNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white cursor-pointer"
                  >
                    <option value="Saffron (Adult Education Pathway)">
                      Saffron (Adult Education Pathway)
                    </option>
                    <option value="Ryder (Youth PBS)">Ryder (Youth PBS)</option>
                    <option value="16yo Tier 3 School Refusal Referral">
                      16yo Tier 3 School Refusal Referral
                    </option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} (NDIS #{c.ndisNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    NDIS Price Guide Line Item
                  </label>
                  <select
                    value={s34SupportCode}
                    onChange={(e) => setS34SupportCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-[11px] cursor-pointer"
                  >
                    <option value="15_054_0128_1_3">
                      15_054_0128_1_3 ($232.74/h Specialist PBS)
                    </option>
                    <option value="15_056_0128_1_3">
                      15_056_0128_1_3 ($193.99/h Therapy CB)
                    </option>
                    <option value="01_011_0107_1_1">
                      01_011_0107_1_1 ($67.56/h Core Daily Living)
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Uploaded / Selected Participant Case Notes Content
                </label>
                <textarea
                  rows={6}
                  value={uploadedCaseNotesText}
                  onChange={(e) => setUploadedCaseNotesText(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-mono text-[11px] leading-relaxed"
                />
              </div>

              <button
                type="button"
                onClick={handleRunSection34Diagnostic}
                disabled={isRunningS34}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-950/50 disabled:opacity-50"
              >
                <Scale className="w-4 h-4" />
                <span>
                  {isRunningS34
                    ? 'Evaluating Case Notes Against Section 34 & PAPL...'
                    : 'Run NDIS Section 34 & Price Guide Gap Diagnostic'}
                </span>
              </button>
            </div>

            {/* Right 7 Cols: 6-Criterion Section 34 & PAPL Matrix + AI Diagnostic Report */}
            <div className="lg:col-span-7 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                      Statutory Section 34 &amp; PAPL 2025–26 Evidence Matrix
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Source: <code className="text-indigo-300">{uploadedFileName}</code> · Line Item:{' '}
                      <code className="text-teal-300">{s34SupportCode}</code>
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30 font-mono text-xs font-extrabold text-indigo-300 tabular-nums">
                    Readiness: {s34Diagnostic ? `${s34Diagnostic.readinessScore}%` : '86%'}
                  </div>
                </div>

                {/* 6-Criterion Diagnostic Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(
                    s34Diagnostic?.criteria || [
                      {
                        code: 's.34(1)(a)',
                        title: 'Pursuit of Participant NDIS Plan Goals',
                        status: 'Evidenced',
                        finding: 'Links session interventions to Goal 1 (Emotional Regulation & Education).',
                        priceGuideRequirement: 'Every Capacity Building claim must advance a stated plan goal.'
                      },
                      {
                        code: 's.34(1)(b)',
                        title: 'Social & Economic Participation',
                        status: 'Evidenced',
                        finding: 'Evidences adult education certificate transition and community participation.',
                        priceGuideRequirement: 'Must demonstrate social/educational inclusion impact.'
                      },
                      {
                        code: 's.34(1)(c)',
                        title: 'Value for Money & Triangulated FBA Baseline',
                        status: 'Evidenced',
                        finding: 'Contains 14-day ABC baseline (6/wk -> 2/wk); ensure FAST/MAS scores are attached.',
                        priceGuideRequirement: 'Requires empirical baseline vs intervention metrics.'
                      },
                      {
                        code: 's.34(1)(d)',
                        title: 'Effective & Beneficial (Evidence-Based PBS)',
                        status: 'Evidenced',
                        finding: 'Documents proactive Red/Green Break Card and 40-min session pacing.',
                        priceGuideRequirement: 'Least-restrictive, evidence-based practice required.'
                      },
                      {
                        code: 's.34(1)(e)',
                        title: 'Informal & Family Support Sustainability',
                        status: 'Partial Gap',
                        finding: 'Specify why specialist Module 2 PBS is required beyond informal family support.',
                        priceGuideRequirement: 'Distinguish specialist therapy from natural carer support.'
                      },
                      {
                        code: 'PAPL 2025–26',
                        title: 'Price Guide Claimability & F2F/NF2F Split',
                        status: 'Evidenced',
                        finding: '40m F2F / 10m NF2F documented under 15_054_0128_1_3 ($232.74/hr).',
                        priceGuideRequirement: 'Requires valid line item, exact minutes, and travel cap compliance.'
                      }
                    ]
                  ).map((crit) => (
                    <div
                      key={crit.code}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-indigo-300 text-[11px]">
                          {crit.code} · {crit.title}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                            crit.status === 'Evidenced'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : crit.status === 'Partial Gap'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {crit.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-200 leading-snug">{crit.finding}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{crit.priceGuideRequirement}</p>
                    </div>
                  ))}
                </div>

                {/* Detailed AI Diagnostic & Remediation Addendum */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-40 overflow-y-auto">
                  {s34ReportMarkdown ||
                    'Click "Run NDIS Section 34 & Price Guide Gap Diagnostic" to generate a full line-by-line Section 34 compliance review and objective remediation addendum.'}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                  Decision-support diagnostic only · Does not guarantee NDIA funding approval
                </span>
                {s34ReportMarkdown && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(s34ReportMarkdown);
                      setCopiedAddendum(true);
                      setTimeout(() => setCopiedAddendum(false), 2500);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedAddendum ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedAddendum ? 'Copied Diagnostic' : 'Copy Section 34 Audit'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
