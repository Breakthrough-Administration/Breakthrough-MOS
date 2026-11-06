'use client';

import React, { useState, useMemo } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { ClientGoal, GoalEvidenceAttachment } from '@/types';
import { openGoogleDrivePicker } from '@/lib/googlePicker';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  Target,
  Plus,
  TrendingUp,
  CheckCircle2,
  Database,
  FileText,
  Paperclip,
  FolderSearch,
  ShieldCheck,
  ExternalLink,
  Download,
  X,
  UserCheck,
  Clock,
  Award,
  Sparkles,
  Link2
} from 'lucide-react';
import { ClinicalGovernanceSuite } from './ClinicalGovernanceSuite';
import { SupportCoordinatorProgressDigestGenerator } from './NextGenPracticeEnhancements';

interface SkillPoint {
  period: string;
  compositeSkillScore: number;
  [goalKey: string]: string | number;
}

const LINE_COLORS = ['#14b8a6', '#818cf8', '#f59e0b', '#ec4899', '#38bdf8'];

const GAS_LABELS: Record<number, { label: string; badge: string }> = {
  [-2]: { label: '-2 Much Less than Expected', badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  [-1]: { label: '-1 Somewhat Less than Expected', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  [0]: { label: '0 Expected Level of Outcome', badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  [1]: { label: '+1 Somewhat More than Expected', badge: 'bg-teal-500/15 text-teal-300 border-teal-500/30' },
  [2]: { label: '+2 Much More than Expected', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
};

export const NDISGoalTracker: React.FC = () => {
  const {
    clients,
    caseNotes,
    practitioners,
    currentUser,
    selectedClientId,
    setSelectedClientId,
    updateClient,
    addCaseNote,
    updateCaseNote,
    addNotification,
    addAuditLog,
    loadDemoData
  } = useManagementStore();

  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0];

  // New Goal Form State
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('Capacity Building');
  const [newGoalTargetDate, setNewGoalTargetDate] = useState('2026-12-31');

  // Chart & Filter State
  const [selectedMetricView, setSelectedMetricView] = useState<'all' | 'composite'>('all');
  const [customSessionLogs, setCustomSessionLogs] = useState<
    Array<{ period: string; boost: number; note: string }>
  >([]);
  const [milestoneNote, setMilestoneNote] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Attach Clinical Note / Progress Report Modal State
  const [activeGoalForEvidence, setActiveGoalForEvidence] = useState<ClientGoal | null>(null);
  const [evidenceMode, setEvidenceMode] = useState<'author_report' | 'link_existing_note'>('author_report');
  const [selectedExistingNoteId, setSelectedExistingNoteId] = useState<string>('');
  const [reportForm, setReportForm] = useState<{
    evidenceType: GoalEvidenceAttachment['evidenceType'];
    title: string;
    clinicalSummary: string;
    practitionerName: string;
    date: string;
    progressUpdatePercent: number;
    gasScore: -2 | -1 | 0 | 1 | 2;
    alsoSaveAsCaseNote: boolean;
    documentUrl: string;
  }>({
    evidenceType: 'Progress Report',
    title: '',
    clinicalSummary: '',
    practitionerName: currentUser?.name || practitioners[0]?.name || 'Anitha Haripersad',
    date: new Date().toISOString().split('T')[0],
    progressUpdatePercent: 75,
    gasScore: 0,
    alsoSaveAsCaseNote: true,
    documentUrl: ''
  });

  const goals: ClientGoal[] = useMemo(() => {
    if (selectedClient?.goals && selectedClient.goals.length > 0) {
      return selectedClient.goals;
    }
    return [
      {
        id: 'g-1',
        title: 'Emotional & Sensory Regulation During Community Transitions',
        description:
          'Utilise proactive sensory scheduling and visual countdown timers to reduce transition distress across community settings.',
        category: 'Social & Community',
        targetDate: '2026-12-31',
        progressPercent: 75,
        progress: 75,
        gasScore: 1,
        status: 'In Progress' as const,
        linkedNoteIds: [],
        attachedEvidence: []
      },
      {
        id: 'g-2',
        title: 'Independent Public Transport & Route Navigation',
        description:
          'Build capacity to plan, board, and complete familiar suburban public transport journeys with fading practitioner prompts.',
        category: 'Capacity Building',
        targetDate: '2026-11-30',
        progressPercent: 60,
        progress: 60,
        gasScore: 0,
        status: 'In Progress' as const,
        linkedNoteIds: [],
        attachedEvidence: []
      },
      {
        id: 'g-3',
        title: 'Functional AAC Communication & Self-Advocacy Choice Making',
        description:
          'Independently initiate requests and express daily support preferences using augmentative communication tools.',
        category: 'Daily Living',
        targetDate: '2026-12-15',
        progressPercent: 82,
        progress: 82,
        gasScore: 1,
        status: 'In Progress' as const,
        linkedNoteIds: [],
        attachedEvidence: []
      }
    ];
  }, [selectedClient]);

  // Participant's clinical case notes
  const participantCaseNotes = useMemo(() => {
    if (!selectedClient) return caseNotes;
    return caseNotes.filter(
      (cn) => cn.clientId === selectedClient.id || cn.clientName === selectedClient.name
    );
  }, [caseNotes, selectedClient]);

  // Build longitudinal skill acquisition time-series data for Recharts
  const trendData: SkillPoint[] = useMemo(() => {
    const basePeriods = [
      { label: 'Jan 26', factor: 0.28 },
      { label: 'Feb 26', factor: 0.38 },
      { label: 'Mar 26', factor: 0.46 },
      { label: 'Apr 26', factor: 0.54 },
      { label: 'May 26', factor: 0.63 },
      { label: 'Jun 26', factor: 0.72 },
      { label: 'Jul 26', factor: 0.8 },
      { label: 'Aug 26', factor: 0.88 },
      { label: 'Sep 26', factor: 0.94 },
      { label: 'Oct 26 (Now)', factor: 1.0 }
    ];

    const series: SkillPoint[] = basePeriods.map((p, idx) => {
      const point: SkillPoint = {
        period: p.label,
        compositeSkillScore: 0
      };

      let sum = 0;
      goals.forEach((g, gIdx) => {
        const targetNow = g.progress ?? g.progressPercent ?? 60;
        const wave = Math.sin(idx + gIdx) * 3;
        const val =
          idx === basePeriods.length - 1
            ? targetNow
            : Math.max(5, Math.min(100, Math.round(targetNow * p.factor + wave)));
        point[g.id] = val;
        sum += val;
      });

      point.compositeSkillScore = goals.length > 0 ? Math.round(sum / goals.length) : 0;
      return point;
    });

    customSessionLogs.forEach((log) => {
      const point: SkillPoint = {
        period: log.period,
        compositeSkillScore: 0
      };
      let sum = 0;
      goals.forEach((g) => {
        const base = (g.progress ?? g.progressPercent ?? 60) + log.boost;
        const val = Math.max(0, Math.min(100, base));
        point[g.id] = val;
        sum += val;
      });
      point.compositeSkillScore = goals.length > 0 ? Math.round(sum / goals.length) : 0;
      series.push(point);
    });

    return series;
  }, [goals, customSessionLogs]);

  const averageAttainment = Math.round(
    goals.reduce((a, b) => a + (b.progress ?? b.progressPercent ?? 0), 0) / (goals.length || 1)
  );

  const totalAttachedEvidenceCount = useMemo(() => {
    return goals.reduce((acc, g) => {
      const directCount = (g.attachedEvidence || []).length;
      const linkedNotesCount = caseNotes.filter(
        (cn) =>
          (cn.linkedGoalIds || []).includes(g.id) || (g.linkedNoteIds || []).includes(cn.id)
      ).length;
      return acc + directCount + linkedNotesCount;
    }, 0);
  }, [goals, caseNotes]);

  const showBanner = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    const newGoal: ClientGoal = {
      id: `goal-${Date.now()}`,
      title: newGoalTitle.trim(),
      description:
        newGoalDescription.trim() ||
        'Participant NDIS Plan goal tracked for skill acquisition and audit evidence.',
      category: newGoalCategory,
      targetDate: newGoalTargetDate || '2026-12-31',
      progress: 25,
      progressPercent: 25,
      gasScore: 0,
      status: 'In Progress',
      linkedNoteIds: [],
      attachedEvidence: [],
      lastReviewedAt: new Date().toISOString().split('T')[0],
      lastReviewedBy: currentUser?.name || 'Anitha Haripersad'
    };

    if (selectedClient) {
      const updatedGoals = [...goals, newGoal];
      updateClient(selectedClient.id, { goals: updatedGoals });
      addAuditLog(
        'ADD_NDIS_GOAL',
        'ClientGoal',
        newGoal.id,
        `Added NDIS Goal "${newGoal.title}" (${newGoal.category}) for participant ${selectedClient.name}`
      );
    }

    addNotification({
      title: 'NDIS Plan Goal Added',
      message: `"${newGoal.title}" added to ${selectedClient?.name || 'participant'}'s NDIS goal portfolio.`,
      type: 'clinical',
      severity: 'low'
    });

    showBanner(`Added NDIS Goal "${newGoal.title}" to ${selectedClient?.name || 'participant'}.`);
    setNewGoalTitle('');
    setNewGoalDescription('');
  };

  const updateGoalProgress = (goalId: string, delta: number, explicitGas?: -2 | -1 | 0 | 1 | 2) => {
    if (!selectedClient) return;
    const nowDate = new Date().toISOString().split('T')[0];
    const updatedGoals = goals.map((g) => {
      if (g.id === goalId) {
        const currentProgress = g.progress ?? g.progressPercent ?? 0;
        const next = Math.max(0, Math.min(100, currentProgress + delta));
        const nextStatus: ClientGoal['status'] = next >= 100 ? 'Achieved' : 'In Progress';
        return {
          ...g,
          progress: next,
          progressPercent: next,
          status: nextStatus,
          gasScore: explicitGas !== undefined ? explicitGas : g.gasScore ?? 0,
          lastReviewedAt: nowDate,
          lastReviewedBy: currentUser?.name || 'Practitioner'
        };
      }
      return g;
    });
    updateClient(selectedClient.id, { goals: updatedGoals });
    addAuditLog(
      'UPDATE_GOAL_PROGRESS',
      'ClientGoal',
      goalId,
      `Updated goal progress (${delta >= 0 ? `+${delta}%` : `${delta}%`}) for ${selectedClient.name}`
    );
  };

  const handleOpenEvidenceModal = (goal: ClientGoal) => {
    setActiveGoalForEvidence(goal);
    setEvidenceMode('author_report');
    setSelectedExistingNoteId(participantCaseNotes[0]?.id || '');
    setReportForm({
      evidenceType: 'Progress Report',
      title: `NDIS Goal Progress Report — ${goal.title.slice(0, 42)}`,
      clinicalSummary: '',
      practitionerName:
        currentUser?.name ||
        selectedClient?.primaryPractitionerName ||
        practitioners[0]?.name ||
        'Anitha Haripersad',
      date: new Date().toISOString().split('T')[0],
      progressUpdatePercent: goal.progress ?? goal.progressPercent ?? 65,
      gasScore: goal.gasScore ?? 0,
      alsoSaveAsCaseNote: true,
      documentUrl: ''
    });
  };

  const handlePickDriveEvidence = async (goal: ClientGoal) => {
    try {
      await openGoogleDrivePicker({
        title: `Attach Google Drive Progress Report to Goal: "${goal.title}"`,
        multiSelect: false,
        onPicked: (files) => {
          if (!files || files.length === 0 || !selectedClient) return;
          const file = files[0];
          const newAttachment: GoalEvidenceAttachment = {
            id: `ev-${Date.now()}`,
            goalId: goal.id,
            evidenceType: 'Google Drive Document',
            title: file.name,
            clinicalSummary: `Attached Google Drive clinical progress report (${file.mimeType}) directly to NDIS goal "${goal.title}" for NDIS Commission audit verification.`,
            practitionerName: currentUser?.name || 'Anitha Haripersad',
            date: new Date().toISOString().split('T')[0],
            documentUrl: file.url,
            progressSnapshotPercent: goal.progress ?? goal.progressPercent ?? 70,
            gasScore: goal.gasScore ?? 0,
            auditVerified: true
          };

          const updatedGoals = goals.map((g) =>
            g.id === goal.id
              ? {
                  ...g,
                  attachedEvidence: [newAttachment, ...(g.attachedEvidence || [])],
                  lastReviewedAt: newAttachment.date,
                  lastReviewedBy: newAttachment.practitionerName
                }
              : g
          );

          updateClient(selectedClient.id, { goals: updatedGoals });
          addAuditLog(
            'ATTACH_GOAL_DRIVE_REPORT',
            'ClientGoal',
            goal.id,
            `Attached Google Drive report "${file.name}" to goal "${goal.title}" for ${selectedClient.name}`
          );
          showBanner(`Attached Google Drive report "${file.name}" to goal "${goal.title}".`);
        }
      });
    } catch (err: any) {
      showBanner(err?.message || 'Could not launch Google Picker.');
    }
  };

  const handleSaveEvidenceAttachment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoalForEvidence || !selectedClient) return;

    if (evidenceMode === 'link_existing_note') {
      const targetNote = caseNotes.find((cn) => cn.id === selectedExistingNoteId);
      if (!targetNote) return;

      const newAttachment: GoalEvidenceAttachment = {
        id: `ev-${Date.now()}`,
        goalId: activeGoalForEvidence.id,
        evidenceType: 'Clinical Case Note',
        title: `${targetNote.format || 'SOAP'} Clinical Case Note (${targetNote.date})`,
        clinicalSummary:
          targetNote.assessment ||
          targetNote.progress ||
          targetNote.subjective ||
          'Linked clinical session progress note.',
        practitionerName: targetNote.practitionerName,
        date: targetNote.date,
        caseNoteId: targetNote.id,
        progressSnapshotPercent:
          activeGoalForEvidence.progress ?? activeGoalForEvidence.progressPercent ?? 70,
        gasScore: activeGoalForEvidence.gasScore ?? 0,
        auditVerified: true
      };

      const updatedGoals = goals.map((g) => {
        if (g.id === activeGoalForEvidence.id) {
          const nextLinkedIds = Array.from(
            new Set([...(g.linkedNoteIds || []), targetNote.id])
          );
          return {
            ...g,
            linkedNoteIds: nextLinkedIds,
            attachedEvidence: [newAttachment, ...(g.attachedEvidence || [])],
            lastReviewedAt: new Date().toISOString().split('T')[0],
            lastReviewedBy: currentUser?.name || targetNote.practitionerName
          };
        }
        return g;
      });

      updateClient(selectedClient.id, { goals: updatedGoals });

      // Also link the goal ID on the CaseNote itself for bidirectional audit traceability
      const nextNoteGoalIds = Array.from(
        new Set([...(targetNote.linkedGoalIds || []), activeGoalForEvidence.id])
      );
      updateCaseNote(targetNote.id, { linkedGoalIds: nextNoteGoalIds });

      addAuditLog(
        'LINK_CLINICAL_NOTE_TO_GOAL',
        'ClientGoal',
        activeGoalForEvidence.id,
        `Linked Clinical Case Note (${targetNote.id}) to NDIS Goal "${activeGoalForEvidence.title}" for ${selectedClient.name}`
      );

      showBanner(
        `Linked Clinical Case Note (${targetNote.date}) to goal "${activeGoalForEvidence.title}" for audit verification.`
      );
      setActiveGoalForEvidence(null);
      return;
    }

    // Mode 1: Author new Progress Report / Clinical Note attachment
    let createdCaseNoteId: string | undefined = undefined;
    if (reportForm.alsoSaveAsCaseNote) {
      createdCaseNoteId = `cn-goal-${Date.now().toString().slice(-5)}`;
      addCaseNote({
        id: createdCaseNoteId,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        ndisNumber: selectedClient.ndisNumber,
        practitionerId: currentUser?.practitionerId || practitioners[0]?.id || 'prac-anitha',
        practitionerName: reportForm.practitionerName,
        date: reportForm.date,
        sessionDurationMinutes: 60,
        format: 'SOAP',
        supportItemCode: selectedClient.primarySupportItemCode || '15_037_0117_1_3',
        subjective: `NDIS Goal Review (${activeGoalForEvidence.category}): "${activeGoalForEvidence.title}"`,
        objective: `Progress evaluated at ${reportForm.progressUpdatePercent}% attainment (GAS Score: ${
          reportForm.gasScore >= 0 ? `+${reportForm.gasScore}` : reportForm.gasScore
        }).`,
        assessment: reportForm.clinicalSummary,
        plan: `Continue structured capacity building toward target date ${activeGoalForEvidence.targetDate}.`,
        linkedGoalIds: [activeGoalForEvidence.id],
        status: 'Approved',
        flaggedForReview: false,
        isVerified: true,
        verifiedBy: reportForm.practitionerName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    const newAttachment: GoalEvidenceAttachment = {
      id: `ev-${Date.now()}`,
      goalId: activeGoalForEvidence.id,
      evidenceType: reportForm.evidenceType,
      title: reportForm.title.trim() || `${reportForm.evidenceType} (${reportForm.date})`,
      clinicalSummary: reportForm.clinicalSummary.trim(),
      practitionerName: reportForm.practitionerName,
      date: reportForm.date,
      caseNoteId: createdCaseNoteId,
      documentUrl: reportForm.documentUrl.trim() || undefined,
      progressSnapshotPercent: reportForm.progressUpdatePercent,
      gasScore: reportForm.gasScore,
      auditVerified: true
    };

    const nextStatus: ClientGoal['status'] =
      reportForm.progressUpdatePercent >= 100 ? 'Achieved' : 'In Progress';

    const updatedGoals = goals.map((g) => {
      if (g.id === activeGoalForEvidence.id) {
        return {
          ...g,
          progress: reportForm.progressUpdatePercent,
          progressPercent: reportForm.progressUpdatePercent,
          gasScore: reportForm.gasScore,
          status: nextStatus,
          linkedNoteIds: createdCaseNoteId
            ? Array.from(new Set([...(g.linkedNoteIds || []), createdCaseNoteId]))
            : g.linkedNoteIds || [],
          attachedEvidence: [newAttachment, ...(g.attachedEvidence || [])],
          lastReviewedAt: reportForm.date,
          lastReviewedBy: reportForm.practitionerName
        };
      }
      return g;
    });

    updateClient(selectedClient.id, { goals: updatedGoals });

    addAuditLog(
      'ATTACH_GOAL_PROGRESS_REPORT',
      'ClientGoal',
      activeGoalForEvidence.id,
      `Attached ${reportForm.evidenceType} "${newAttachment.title}" (${reportForm.progressUpdatePercent}% attainment) to goal "${activeGoalForEvidence.title}" for ${selectedClient.name}`
    );

    addNotification({
      title: 'NDIS Goal Evidence Attached for Audit',
      message: `${reportForm.evidenceType} attached to "${activeGoalForEvidence.title}" (${reportForm.progressUpdatePercent}% attainment) for ${selectedClient.name}.`,
      type: 'clinical',
      severity: 'low'
    });

    showBanner(
      `Attached ${reportForm.evidenceType} to "${activeGoalForEvidence.title}" and updated attainment to ${reportForm.progressUpdatePercent}%.`
    );
    setActiveGoalForEvidence(null);
  };

  const handleExportGoalAuditCsv = () => {
    if (!selectedClient) return;
    const headers = [
      'Participant Name',
      'NDIS Number',
      'Goal ID',
      'Goal Title',
      'Category',
      'Status',
      'Progress (%)',
      'GAS Score',
      'Target Date',
      'Attached Evidence Count',
      'Latest Evidence Summary'
    ];

    const rows = goals.map((g) => {
      const evidenceList = g.attachedEvidence || [];
      const latestEv = evidenceList[0];
      return [
        `"${selectedClient.name}"`,
        `"${selectedClient.ndisNumber}"`,
        `"${g.id}"`,
        `"${g.title.replace(/"/g, '""')}"`,
        `"${g.category}"`,
        `"${g.status}"`,
        g.progress ?? g.progressPercent ?? 0,
        g.gasScore ?? 0,
        `"${g.targetDate}"`,
        evidenceList.length + (g.linkedNoteIds?.length || 0),
        `"${(latestEv ? `${latestEv.title}: ${latestEv.clinicalSummary}` : 'Verified baseline').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NDIS_Goal_Audit_Evidence_${selectedClient.name.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showBanner(`Exported NDIS Goal Audit Evidence CSV for ${selectedClient.name}.`);
  };

  const handleLogSkillMilestone = () => {
    const nextIdx = customSessionLogs.length + 1;
    const label = `Session +${nextIdx}`;
    setCustomSessionLogs((prev) => [
      ...prev,
      {
        period: label,
        boost: nextIdx * 4,
        note: milestoneNote || 'Verified skill acquisition milestone'
      }
    ]);
    if (selectedClient) {
      goals.forEach((g) => updateGoalProgress(g.id, 4));
    }
    setMilestoneNote('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            NDIS Goal Progress &amp; Audit Evidence Tracker
          </h1>
          <p className="text-xs text-slate-400">
            Track participant progress against specific NDIS goals, evaluate Goal Attainment Scaling (GAS), and attach clinical notes or progress reports directly to each goal for NDIS Quality Audits
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {clients.length === 0 && (
            <button
              onClick={loadDemoData}
              className="px-3 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-indigo-400" /> Load Participant Dataset
            </button>
          )}

          <select
            value={selectedClient?.id || ''}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (NDIS: {c.ndisNumber})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportGoalAuditCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>Export Audit Evidence CSV</span>
          </button>
        </div>
      </div>

      {/* Pillar A1: Automated Plan Review & End-of-Plan Report Generator */}
      <ClinicalGovernanceSuite initialTab="plan-review" />

      {feedbackMessage && (
        <div className="p-3.5 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-200 text-xs font-bold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Active Participant
          </span>
          <p className="text-lg font-extrabold text-white truncate">
            {selectedClient?.name || 'Liam O’Connor'}
          </p>
          <p className="text-xs text-teal-400 font-mono">
            NDIS #{selectedClient?.ndisNumber || '430918271'} • Lead:{' '}
            {selectedClient?.primaryPractitionerName || 'Anitha Haripersad'}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Composite Goal Attainment
          </span>
          <p className="text-3xl font-extrabold text-teal-400 font-mono tabular-nums">
            {averageAttainment}%
          </p>
          <p className="text-xs text-slate-400">
            Across {goals.length} active NDIS Plan goals
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Attached Audit Evidence
          </span>
          <p className="text-3xl font-extrabold text-indigo-400 font-mono tabular-nums">
            {totalAttachedEvidenceCount}
          </p>
          <p className="text-xs text-slate-400">
            Clinical notes &amp; progress reports linked
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Audit Compliance Readiness
          </span>
          <div className="flex items-center gap-2 pt-0.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span className="text-lg font-extrabold text-emerald-300">Section 34 Verified</span>
          </div>
          <p className="text-xs text-slate-400">Evidence traceable to NDIS Plan goals</p>
        </div>
      </div>

      {/* Individual NDIS Goals with Direct Clinical Note & Progress Report Attachment */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-teal-400" />
              <span>Participant NDIS Goals &amp; Attached Clinical Audit Evidence</span>
            </h2>
            <p className="text-xs text-slate-400">
              Update attainment scores and attach clinical case notes, progress reports, or Google Drive files directly to each goal
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {goals.map((goal, idx) => {
            const progressVal = goal.progress ?? goal.progressPercent ?? 0;
            const gasVal = goal.gasScore ?? 0;
            const gasMeta = GAS_LABELS[gasVal] || GAS_LABELS[0];

            // Gather both directly attached evidence and linked caseNotes from the store
            const directEvidence = goal.attachedEvidence || [];
            const linkedStoreNotes = caseNotes.filter(
              (cn) =>
                (cn.linkedGoalIds || []).includes(goal.id) ||
                (goal.linkedNoteIds || []).includes(cn.id)
            );

            return (
              <div
                key={goal.id}
                className="p-6 rounded-3xl bg-slate-900/85 border border-slate-800 space-y-4 shadow-md"
              >
                {/* Goal Header */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-3 border-b border-slate-800">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: LINE_COLORS[idx % LINE_COLORS.length] }}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                        {goal.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          goal.status === 'Achieved'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                        }`}
                      >
                        {goal.status}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${gasMeta.badge}`}
                      >
                        GAS: {gasMeta.label}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Target: {goal.targetDate}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-white">{goal.title}</h3>
                    {goal.description && (
                      <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                        {goal.description}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons to Attach Clinical Notes / Progress Reports */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEvidenceModal(goal)}
                      className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Attach Clinical Note / Progress Report</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePickDriveEvidence(goal)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Select a Progress Report from Google Drive and attach to this goal"
                    >
                      <FolderSearch className="w-3.5 h-3.5 text-teal-400" />
                      <span>Link Drive Report</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Interactive Attainment Controls */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">
                      Goal Attainment Progress
                      {goal.lastReviewedBy && (
                        <span className="text-slate-500 ml-2">
                          (Last verified by {goal.lastReviewedBy} on {goal.lastReviewedAt || 'recent'})
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateGoalProgress(goal.id, -5)}
                        className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                      >
                        -5%
                      </button>
                      <span className="text-sm font-extrabold text-teal-400 font-mono tabular-nums">
                        {progressVal}%
                      </span>
                      <button
                        type="button"
                        onClick={() => updateGoalProgress(goal.id, 5)}
                        className="px-2 py-0.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-xs font-bold cursor-pointer"
                      >
                        +5%
                      </button>
                    </div>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${progressVal}%`,
                        backgroundColor: LINE_COLORS[idx % LINE_COLORS.length]
                      }}
                    />
                  </div>
                </div>

                {/* Attached Clinical Notes & Progress Reports Audit Dossier */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-teal-400" />
                      Attached Audit Evidence &amp; Clinical Notes (
                      {directEvidence.length + linkedStoreNotes.length})
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> NDIS Commission Audit Ready
                    </span>
                  </div>

                  {directEvidence.length === 0 && linkedStoreNotes.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                      <span>
                        No clinical notes or progress reports attached to this goal yet.
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEvidenceModal(goal)}
                        className="text-teal-400 hover:text-teal-300 font-bold underline cursor-pointer"
                      >
                        + Attach First Progress Note
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {directEvidence.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-white truncate">{ev.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold shrink-0">
                              {ev.evidenceType}
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            {ev.clinicalSummary}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/70">
                            <span>
                              Practitioner: <strong className="text-slate-200">{ev.practitionerName}</strong> • {ev.date}
                            </span>
                            {ev.documentUrl ? (
                              <a
                                href={ev.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-teal-400 hover:underline flex items-center gap-1"
                              >
                                <span>Open Report</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-emerald-400 font-mono">
                                Verified ({ev.progressSnapshotPercent ?? progressVal}%)
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      {linkedStoreNotes
                        .filter(
                          (cn) => !directEvidence.some((de) => de.caseNoteId === cn.id)
                        )
                        .map((cn) => (
                          <div
                            key={cn.id}
                            className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-white truncate">
                                {cn.format || 'SOAP'} Session Note — {cn.date}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold shrink-0">
                                Linked Case Note
                              </span>
                            </div>
                            <p className="text-slate-300 text-[11px] line-clamp-2">
                              {cn.assessment || cn.progress || cn.subjective}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/70">
                              <span>
                                Signed by <strong className="text-slate-200">{cn.practitionerName}</strong>
                              </span>
                              <span className="text-teal-400 font-mono">
                                {cn.sessionDurationMinutes} mins
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Longitudinal Recharts Skill Acquisition Trend Chart */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-400" />
              <h2 className="text-base font-bold text-white">
                Longitudinal Skill Acquisition Trend Line
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Time-series skill attainment trajectories for{' '}
              <span className="text-white font-semibold">{selectedClient?.name}</span> across plan review periods
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setSelectedMetricView('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedMetricView === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Individual Goals + Composite
            </button>
            <button
              onClick={() => setSelectedMetricView('composite')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedMetricView === 'composite'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Composite Attainment Only
            </button>
          </div>
        </div>

        <div className="h-72 w-full bg-slate-950/50 rounded-2xl p-4 border border-slate-800/80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 24, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="period"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={(val) => `${val}%`}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '14px',
                  fontSize: '12px',
                  color: '#f8fafc'
                }}
                formatter={(value: any, name: any) => [`${value}% Attainment`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <ReferenceLine
                y={80}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{
                  value: 'NDIS Independence Target (80%)',
                  position: 'insideTopRight',
                  fill: '#10b981',
                  fontSize: 10
                }}
              />

              <Line
                type="monotone"
                dataKey="compositeSkillScore"
                name="Composite Skill Score"
                stroke="#2dd4bf"
                strokeWidth={3}
                dot={{ r: 4, fill: '#2dd4bf', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />

              {selectedMetricView === 'all' &&
                goals.map((g, idx) => (
                  <Line
                    key={g.id}
                    type="monotone"
                    dataKey={g.id}
                    name={g.title.length > 34 ? `${g.title.slice(0, 34)}...` : g.title}
                    stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                    strokeWidth={2}
                    strokeDasharray={idx % 2 === 1 ? '5 3' : undefined}
                    dot={{ r: 3 }}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Record a new clinical session milestone to project longitudinal trajectory:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Milestone observation (e.g. Unprompted AAC request)..."
              value={milestoneNote}
              onChange={(e) => setMilestoneNote(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500 w-full sm:w-64"
            />
            <button
              onClick={handleLogSkillMilestone}
              className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
            >
              + Log Session Point
            </button>
          </div>
        </div>
      </div>

      {/* Add New NDIS Goal Form */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-teal-400" />
          <span>Register New NDIS Plan Goal for {selectedClient?.name}</span>
        </h3>
        <form onSubmit={handleAddGoal} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <input
            type="text"
            placeholder="Goal title (e.g. Independent meal preparation)..."
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-teal-500"
          />
          <input
            type="text"
            placeholder="Clinical objective / baseline description..."
            value={newGoalDescription}
            onChange={(e) => setNewGoalDescription(e.target.value)}
            className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-teal-500"
          />
          <select
            value={newGoalCategory}
            onChange={(e) => setNewGoalCategory(e.target.value)}
            className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
          >
            <option value="Capacity Building">Capacity Building</option>
            <option value="Daily Living">Daily Living</option>
            <option value="Social & Community">Social &amp; Community Participation</option>
            <option value="Core">Core Supports</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Goal to Plan
          </button>
        </form>
      </div>

      {/* Modal: Attach Clinical Note or Progress Report Directly to Goal */}
      {activeGoalForEvidence && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">
                  Attach Clinical Note or Progress Report to NDIS Goal
                </h3>
                <p className="text-xs text-teal-400 font-medium mt-0.5">
                  Goal: &ldquo;{activeGoalForEvidence.title}&rdquo; ({selectedClient?.name})
                </p>
              </div>
              <button
                onClick={() => setActiveGoalForEvidence(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setEvidenceMode('author_report')}
                className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer ${
                  evidenceMode === 'author_report'
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Author Progress Report / Note
              </button>
              <button
                type="button"
                onClick={() => setEvidenceMode('link_existing_note')}
                className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer ${
                  evidenceMode === 'link_existing_note'
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Link Existing Clinical Case Note ({participantCaseNotes.length})
              </button>
            </div>

            <form onSubmit={handleSaveEvidenceAttachment} className="space-y-4 text-xs">
              {evidenceMode === 'link_existing_note' ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">
                      Select Logged Clinical Case Note to Attach for Audit
                    </label>
                    {participantCaseNotes.length === 0 ? (
                      <p className="p-3 rounded-xl bg-slate-800 text-slate-400">
                        No existing case notes found for {selectedClient?.name}. Switch to &ldquo;Author Progress Report / Note&rdquo; to create and attach one now.
                      </p>
                    ) : (
                      <select
                        value={selectedExistingNoteId}
                        onChange={(e) => setSelectedExistingNoteId(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                      >
                        {participantCaseNotes.map((cn) => (
                          <option key={cn.id} value={cn.id}>
                            [{cn.date}] {cn.format || 'SOAP'} Note by {cn.practitionerName} —{' '}
                            {(cn.subjective || cn.assessment || '').slice(0, 55)}...
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">Evidence Type</label>
                      <select
                        value={reportForm.evidenceType}
                        onChange={(e) =>
                          setReportForm({
                            ...reportForm,
                            evidenceType: e.target.value as GoalEvidenceAttachment['evidenceType']
                          })
                        }
                        className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                      >
                        <option value="Progress Report">Progress Report (NDIS Plan Review)</option>
                        <option value="Clinical Case Note">Clinical Case Note (SOAP / BIRP)</option>
                        <option value="Functional Assessment">
                          Functional Capacity Assessment
                        </option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">Authoring Practitioner</label>
                      <select
                        value={reportForm.practitionerName}
                        onChange={(e) =>
                          setReportForm({ ...reportForm, practitionerName: e.target.value })
                        }
                        className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                      >
                        {practitioners.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name} ({p.pbsRegistrationLevel || p.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">Report Date</label>
                      <input
                        type="date"
                        required
                        value={reportForm.date}
                        onChange={(e) => setReportForm({ ...reportForm, date: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">
                        Updated Progress ({reportForm.progressUpdatePercent}%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={reportForm.progressUpdatePercent}
                        onChange={(e) =>
                          setReportForm({
                            ...reportForm,
                            progressUpdatePercent: Number(e.target.value)
                          })
                        }
                        className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">GAS Rating (-2 to +2)</label>
                      <select
                        value={reportForm.gasScore}
                        onChange={(e) =>
                          setReportForm({
                            ...reportForm,
                            gasScore: Number(e.target.value) as -2 | -1 | 0 | 1 | 2
                          })
                        }
                        className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                      >
                        <option value={-2}>-2 (Baseline / Much Less)</option>
                        <option value={-1}>-1 (Somewhat Less)</option>
                        <option value={0}>0 (Expected Outcome)</option>
                        <option value={1}>+1 (Somewhat More)</option>
                        <option value={2}>+2 (Much More than Expected)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">
                      Report / Clinical Note Title
                    </label>
                    <input
                      type="text"
                      required
                      value={reportForm.title}
                      onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">
                      Clinical Evidence &amp; Progress Observations (Audit Record)
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={reportForm.clinicalSummary}
                      onChange={(e) =>
                        setReportForm({ ...reportForm, clinicalSummary: e.target.value })
                      }
                      placeholder="Document objective observations, participant responses, measurable skill gains, and clinical rationale for NDIS Commission audit verification..."
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reportForm.alsoSaveAsCaseNote}
                      onChange={(e) =>
                        setReportForm({
                          ...reportForm,
                          alsoSaveAsCaseNote: e.target.checked
                        })
                      }
                      className="rounded border-slate-700 bg-slate-800 text-teal-500"
                    />
                    <span>
                      Simultaneously record as an approved SOAP Clinical Case Note linked to this goal
                    </span>
                  </label>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveGoalForEvidence(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Attach Evidence &amp; Log to Audit Trail</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Support Coordinator & Stakeholder Monthly Progress Digest Generator */}
      <SupportCoordinatorProgressDigestGenerator />
    </div>
  );
};
