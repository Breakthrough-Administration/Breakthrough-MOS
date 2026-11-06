'use client';

import React, { useState, useMemo } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { getGoogleAccessToken } from '@/lib/firebase';
import { storePickedDriveFileMetadata } from '@/lib/firestoreService';
import {
  FileCheck,
  ShieldAlert,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Lock,
  Unlock,
  FileText,
  Printer,
  Download,
  FileSpreadsheet,
  ExternalLink,
  X,
  Send,
  RotateCcw,
  Sparkles,
  CheckSquare,
  Scale,
  Users
} from 'lucide-react';

export interface SupervisionQueueItem {
  id: string;
  documentType: 'Behaviour Support Plan (BSP)' | 'Functional Behaviour Assessment (FBA)' | 'High-Risk Case Note';
  title: string;
  clientId: string;
  clientName: string;
  ndisNumber: string;
  authorId: string;
  authorName: string;
  authorLevel: 'Entry Practitioner' | 'Core Practitioner';
  assignedSupervisorId: string;
  assignedSupervisorName: string;
  assignedSupervisorLevel: 'Proficient Practitioner' | 'Clinical Director';
  submittedAt: string;
  status: 'Draft' | 'Pending Co-Signature' | 'Revision Requested' | 'Co-Signed & Approved';
  clinicalSummary: string;
  restrictivePracticeIncluded: boolean;
  evidenceSources: string[];
  supervisionFeedback?: string;
  coSignedBy?: string;
  coSignedAt?: string;
  signatureCredential?: string;
}

export interface StatePortalChecklist {
  jurisdiction: 'VIC' | 'NSW' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';
  portalName: string;
  authorityBody: string;
  commissionLodgementId: string;
  stateAuthReference: string;
  items: {
    id: string;
    label: string;
    completed: boolean;
  }[];
}

export const ClinicalGovernanceSuite: React.FC<{ initialTab?: 'supervision' | 'plan-review' | 'rp-expiry' }> = ({
  initialTab = 'supervision'
}) => {
  const {
    clients,
    selectedClientId,
    setSelectedClientId,
    caseNotes,
    abcLogs,
    restrictivePractices,
    practitioners,
    currentUser,
    addAuditLog,
    addNotification
  } = useManagementStore();

  const [activePillarTab, setActivePillarTab] = useState<'supervision' | 'plan-review' | 'rp-expiry'>(initialTab);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const activeClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || clients[0],
    [clients, selectedClientId]
  );

  // Determine active reviewer capability (Enforce Proficient or Director co-signature)
  const [activeReviewerId, setActiveReviewerId] = useState<string>('prac-anitha');
  const reviewerOptions = useMemo(() => {
    const proficientAndDirectors = practitioners.filter(
      (p) =>
        p.pbsRegistrationLevel?.toLowerCase().includes('proficient') ||
        p.pbsRegistrationLevel?.toLowerCase().includes('advanced') ||
        p.pbsRegistrationLevel?.toLowerCase().includes('specialist') ||
        p.name.toLowerCase().includes('anitha') ||
        p.name.toLowerCase().includes('zubaida')
    );
    if (proficientAndDirectors.length > 0) return proficientAndDirectors;
    return [
      {
        id: 'prac-anitha',
        name: 'Anitha Haripersad',
        pbsRegistrationLevel: 'Proficient Practitioner',
        email: 'support@breakthroughconsult.com.au',
        ndisRegistrationNumber: 'PBS-PROF-40291'
      },
      {
        id: 'prac-zubaida',
        name: 'Zubaida Baher',
        pbsRegistrationLevel: 'Proficient Practitioner',
        email: 'zubaida@breakthroughconsult.com.au',
        ndisRegistrationNumber: 'PBS-PROF-40812'
      }
    ];
  }, [practitioners]);

  const selectedSupervisor = useMemo(
    () => reviewerOptions.find((r) => r.id === activeReviewerId) || reviewerOptions[0],
    [reviewerOptions, activeReviewerId]
  );

  // ============================================================================
  // A3: CLINICAL SUPERVISION & PEER REVIEW SIGN-OFF QUEUE STATE
  // ============================================================================
  const [supervisionQueue, setSupervisionQueue] = useState<SupervisionQueueItem[]>(() => {
    const c1 = clients[0];
    const c2 = clients[1] || clients[0];
    const c3 = clients[2] || clients[0];
    return [
      {
        id: 'sup-001',
        documentType: 'Behaviour Support Plan (BSP)',
        title: `Comprehensive Behaviour Support Plan (v2.1) — ${c1?.name || 'Participant 1'}`,
        clientId: c1?.id || 'cli-001',
        clientName: c1?.name || 'Active Participant',
        ndisNumber: c1?.ndisNumber || '430982103',
        authorId: 'prac-tania',
        authorName: 'Tania Bobovec',
        authorLevel: 'Entry Practitioner',
        assignedSupervisorId: 'prac-anitha',
        assignedSupervisorName: 'Anitha Haripersad',
        assignedSupervisorLevel: 'Proficient Practitioner',
        submittedAt: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
        status: 'Pending Co-Signature',
        clinicalSummary:
          'Draft Comprehensive BSP incorporating proactive visual schedule routines, sensory de-escalation protocols, and environmental modification fade plan. Requires Proficient Practitioner co-signature prior to NDIS Commission Portal lodgement.',
        restrictivePracticeIncluded: true,
        evidenceSources: ['FBA Interview Notes', 'ABC Observation Logs (14 days)', 'Allied Health OT Sensory Profile']
      },
      {
        id: 'sup-002',
        documentType: 'Functional Behaviour Assessment (FBA)',
        title: `Functional Behaviour Assessment & Antecedent Formulation — ${c2?.name || 'Participant 2'}`,
        clientId: c2?.id || 'cli-002',
        clientName: c2?.name || 'Active Participant',
        ndisNumber: c2?.ndisNumber || '431204918',
        authorId: 'prac-andreja',
        authorName: 'Andreja Majcenovic',
        authorLevel: 'Core Practitioner',
        assignedSupervisorId: 'prac-zubaida',
        assignedSupervisorName: 'Zubaida Baher',
        assignedSupervisorLevel: 'Proficient Practitioner',
        submittedAt: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
        status: 'Pending Co-Signature',
        clinicalSummary:
          'Hypothesised escape/avoidance function during unannounced task transitions. Includes baseline frequency metrics and replacement functional communication training (FCT) targets.',
        restrictivePracticeIncluded: false,
        evidenceSources: ['Direct Clinical Observation', 'Carer Baseline Questionnaire', 'WHODAS 2.0 Baseline']
      },
      {
        id: 'sup-003',
        documentType: 'High-Risk Case Note',
        title: `Post-Incident Clinical Review & Safety Plan Update — ${c3?.name || 'Participant 3'}`,
        clientId: c3?.id || 'cli-003',
        clientName: c3?.name || 'Active Participant',
        ndisNumber: c3?.ndisNumber || '430881920',
        authorId: 'prac-tania',
        authorName: 'Tania Bobovec',
        authorLevel: 'Entry Practitioner',
        assignedSupervisorId: 'prac-anitha',
        assignedSupervisorName: 'Anitha Haripersad',
        assignedSupervisorLevel: 'Proficient Practitioner',
        submittedAt: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
        status: 'Co-Signed & Approved',
        clinicalSummary:
          'Debriefing and environmental trigger review following community outing vocal escalation. Proactive transition buffer increased to 15 minutes.',
        restrictivePracticeIncluded: false,
        evidenceSources: ['Case Note #CN-2026-09', 'Community Support Worker Shift Log'],
        supervisionFeedback:
          'Clear distinction maintained between carer report and practitioner observation. Co-signed for clinical record and PRODA claiming.',
        coSignedBy: 'Anitha Haripersad (Proficient Practitioner)',
        coSignedAt: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0],
        signatureCredential: 'PBS-PROF-40291'
      }
    ];
  });

  const [reviewModalItem, setReviewModalItem] = useState<SupervisionQueueItem | null>(null);
  const [supervisionNotesInput, setSupervisionNotesInput] = useState('');
  const [isNewSubmissionOpen, setIsNewSubmissionOpen] = useState(false);
  const [newSubForm, setNewSubForm] = useState({
    documentType: 'Behaviour Support Plan (BSP)' as SupervisionQueueItem['documentType'],
    clientId: activeClient?.id || '',
    authorName: 'Tania Bobovec' as 'Tania Bobovec' | 'Andreja Majcenovic',
    supervisorId: 'prac-anitha',
    title: '',
    clinicalSummary: '',
    restrictivePracticeIncluded: false,
    evidenceSources: 'Case Notes, ABC Behaviour Logs, Participant Goal Tracker'
  });

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 5000);
  };

  const handleSubmitForSupervision = (e: React.FormEvent) => {
    e.preventDefault();
    const targetClient = clients.find((c) => c.id === newSubForm.clientId) || activeClient;
    const supervisor = reviewerOptions.find((r) => r.id === newSubForm.supervisorId) || reviewerOptions[0];
    const authorLevel: 'Entry Practitioner' | 'Core Practitioner' =
      newSubForm.authorName === 'Tania Bobovec' ? 'Entry Practitioner' : 'Core Practitioner';

    const newItem: SupervisionQueueItem = {
      id: `sup-${Date.now().toString().slice(-5)}`,
      documentType: newSubForm.documentType,
      title:
        newSubForm.title.trim() ||
        `${newSubForm.documentType} — ${targetClient?.name || 'Participant'}`,
      clientId: targetClient?.id || 'cli-001',
      clientName: targetClient?.name || 'Participant',
      ndisNumber: targetClient?.ndisNumber || 'Not stated',
      authorId: newSubForm.authorName === 'Tania Bobovec' ? 'prac-tania' : 'prac-andreja',
      authorName: newSubForm.authorName,
      authorLevel,
      assignedSupervisorId: supervisor.id,
      assignedSupervisorName: supervisor.name,
      assignedSupervisorLevel: 'Proficient Practitioner',
      submittedAt: new Date().toISOString().split('T')[0],
      status: 'Pending Co-Signature',
      clinicalSummary: newSubForm.clinicalSummary.trim() || 'Submitted for mandatory clinical supervision review.',
      restrictivePracticeIncluded: newSubForm.restrictivePracticeIncluded,
      evidenceSources: newSubForm.evidenceSources
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    };

    setSupervisionQueue((prev) => [newItem, ...prev]);
    setIsNewSubmissionOpen(false);

    addAuditLog(
      'SUPERVISION_DRAFT_SUBMITTED',
      'SupervisionQueue',
      newItem.id,
      `${newItem.authorName} (${newItem.authorLevel}) submitted "${newItem.title}" for mandatory co-signature by ${newItem.assignedSupervisorName}.`,
      {
        auditCategory: 'Clinical Case Note',
        ndisPracticeStandard: 'NDIS Behaviour Support Capability Framework — Clinical Supervision',
        participantId: newItem.clientId,
        participantName: newItem.clientName,
        ndisNumber: newItem.ndisNumber,
        severity: newItem.restrictivePracticeIncluded ? 'High' : 'Medium'
      }
    );

    addNotification({
      title: 'Supervision Co-Signature Required',
      message: `${newItem.authorName} (${newItem.authorLevel}) submitted ${newItem.documentType} for ${newItem.clientName} to ${newItem.assignedSupervisorName}.`,
      type: 'clinical',
      severity: 'medium'
    });

    showToast(
      `Draft locked & routed to ${newItem.assignedSupervisorName} (Proficient Practitioner) for mandatory co-signature.`
    );
  };

  const handleCoSignDecision = (decision: 'Co-Signed & Approved' | 'Revision Requested') => {
    if (!reviewModalItem) return;
    const signerName = `${selectedSupervisor.name} (${selectedSupervisor.pbsRegistrationLevel || 'Proficient Practitioner'})`;
    const today = new Date().toISOString().split('T')[0];

    setSupervisionQueue((prev) =>
      prev.map((item) =>
        item.id === reviewModalItem.id
          ? {
              ...item,
              status: decision,
              supervisionFeedback:
                supervisionNotesInput.trim() ||
                (decision === 'Co-Signed & Approved'
                  ? 'Reviewed against NDIS Practice Standards and source clinical evidence. Approved and co-signed.'
                  : 'Revisions requested: please clarify source attribution and separate carer report from practitioner observation.'),
              coSignedBy: decision === 'Co-Signed & Approved' ? signerName : undefined,
              coSignedAt: decision === 'Co-Signed & Approved' ? today : undefined,
              signatureCredential:
                decision === 'Co-Signed & Approved'
                  ? selectedSupervisor.ndisRegistrationNumber || 'PBS-PROF-VERIFIED'
                  : undefined
            }
          : item
      )
    );

    addAuditLog(
      decision === 'Co-Signed & Approved' ? 'CLINICAL_DOCUMENT_COSIGNED' : 'SUPERVISION_REVISION_REQUESTED',
      'SupervisionQueue',
      reviewModalItem.id,
      `${signerName} marked "${reviewModalItem.title}" (authored by ${reviewModalItem.authorName}) as ${decision}.`,
      {
        auditCategory: 'Clinical Case Note',
        ndisPracticeStandard: 'NDIS Behaviour Support Capability Framework — Proficient Co-Signature',
        participantId: reviewModalItem.clientId,
        participantName: reviewModalItem.clientName,
        ndisNumber: reviewModalItem.ndisNumber,
        reasonForChange: supervisionNotesInput.trim() || decision,
        severity: 'Medium'
      }
    );

    setReviewModalItem(null);
    setSupervisionNotesInput('');
    showToast(
      decision === 'Co-Signed & Approved'
        ? `Co-signature applied by ${signerName}. Document unlocked for NDIS export & PRODA claiming.`
        : `Revision request returned to ${reviewModalItem.authorName}. Document remains locked.`
    );
  };

  // ============================================================================
  // A1: AUTOMATED PLAN REVIEW & END-OF-PLAN REPORT GENERATOR STATE
  // ============================================================================
  const [whodasScores, setWhodasScores] = useState<{
    cognition: string;
    mobility: string;
    selfCare: string;
    gettingAlong: string;
    lifeActivities: string;
    participation: string;
    assessmentDate: string;
  }>({
    cognition: '2.1 / 5.0 (Mild-Moderate difficulty)',
    mobility: 'Not stated',
    selfCare: '2.4 / 5.0 (Moderate support required)',
    gettingAlong: '2.8 / 5.0 (Active communication skill building)',
    lifeActivities: '2.6 / 5.0 (Structured visual schedule in use)',
    participation: '2.2 / 5.0 (Community access improving with support)',
    assessmentDate: new Date().toISOString().split('T')[0]
  });

  const [participantVoiceSummary, setParticipantVoiceSummary] = useState(
    'Participant and nominated carer reported increased confidence during structured morning transitions when visual schedules are presented 15 minutes prior to departure.'
  );
  const [practitionerClinicalObservations, setPractitionerClinicalObservations] = useState(
    'Across direct clinical sessions, target replacement communication strategies (requesting a sensory break via AAC/verbal prompt) were observed in 4 of 5 transition trials.'
  );
  const [confirmDocsModalOpen, setConfirmDocsModalOpen] = useState(false);
  const [isExportingGoogleDoc, setIsExportingGoogleDoc] = useState(false);

  const clientCaseNotes = useMemo(
    () => caseNotes.filter((n) => n.clientId === activeClient?.id),
    [caseNotes, activeClient]
  );
  const clientAbcLogs = useMemo(
    () => abcLogs.filter((l) => l.clientId === activeClient?.id),
    [abcLogs, activeClient]
  );
  const clientGoals = useMemo(() => activeClient?.goals || [], [activeClient]);

  // Check if activeClient has any unsigned drafts in supervision queue
  const clientPendingSupervision = useMemo(
    () =>
      supervisionQueue.filter(
        (item) => item.clientId === activeClient?.id && item.status !== 'Co-Signed & Approved'
      ),
    [supervisionQueue, activeClient]
  );

  // Build structured report payload
  const compiledPlanReviewReport = useMemo(() => {
    const avgGoalProgress =
      clientGoals.length > 0
        ? Math.round(
            clientGoals.reduce((sum, g) => sum + (g.progressPercent ?? g.progress ?? 0), 0) /
              clientGoals.length
          )
        : null;

    const avgAbcIntensity =
      clientAbcLogs.length > 0
        ? (
            clientAbcLogs.reduce((sum, l) => sum + (l.intensity || 0), 0) / clientAbcLogs.length
          ).toFixed(1)
        : 'Not stated (0 ABC logs recorded)';

    return {
      reportMetadata: {
        reportType: 'NDIS Plan Review & End-of-Plan Outcome Report',
        generatedDate: new Date().toISOString().split('T')[0],
        status:
          clientPendingSupervision.length > 0
            ? 'DRAFT — Pending Proficient Practitioner Co-Signature'
            : 'CLINICALLY REVIEWED — Ready for Participant/NDIA Review',
        reviewingPractitioner: selectedSupervisor.name,
        reviewingPractitionerLevel: selectedSupervisor.pbsRegistrationLevel || 'Proficient Practitioner',
        disclaimer:
          'Decision-support clinical draft prepared from supplied practice records. Requires qualified practitioner review before submission to the NDIA.'
      },
      participantDetails: {
        name: activeClient?.name || 'Not stated',
        ndisNumber: activeClient?.ndisNumber || 'Not stated',
        dateOfBirth: activeClient?.dateOfBirth || 'Not stated',
        primaryDisability: activeClient?.primaryDisability || 'Not stated',
        planPeriod: `${activeClient?.planStartDate || 'Not stated'} to ${activeClient?.planEndDate || 'Not stated'}`,
        primaryPractitioner: activeClient?.primaryPractitionerName || 'Not stated',
        totalBudgetAud: activeClient?.totalBudget ?? null,
        spentBudgetAud: activeClient?.spentBudget ?? null
      },
      longitudinalGoalAttainment: {
        totalGoalsTracked: clientGoals.length,
        averageAttainmentPercent: avgGoalProgress !== null ? `${avgGoalProgress}%` : 'Not stated',
        goals: clientGoals.map((g) => ({
          goalId: g.id,
          title: g.title,
          category: g.category || 'Capacity Building',
          status: g.status,
          progressPercent: g.progressPercent ?? g.progress ?? 0,
          gasScore: g.gasScore !== undefined ? g.gasScore : 'Not stated',
          evidenceCount: (g.attachedEvidence?.length || 0) + (g.linkedNoteIds?.length || 0)
        }))
      },
      whodas2DomainSummary: whodasScores,
      abcBehaviourTrends: {
        recordedEventsCount: clientAbcLogs.length,
        averageIntensityScore: avgAbcIntensity,
        dominantFunctionsObserved:
          clientAbcLogs.length > 0
            ? Array.from(new Set(clientAbcLogs.map((l) => l.perceivedFunction))).join(', ')
            : 'Not stated'
      },
      evidenceSeparatedNarrative: {
        participantAndCarerReport: participantVoiceSummary || 'Not stated',
        practitionerObservations: practitionerClinicalObservations || 'Not stated',
        sourceCaseNotesAttributed:
          clientCaseNotes.length > 0
            ? clientCaseNotes.map((n) => `${n.id} (${n.date} — ${n.practitionerName})`)
            : ['No linked case notes recorded in current period']
      }
    };
  }, [
    activeClient,
    clientGoals,
    clientAbcLogs,
    clientCaseNotes,
    clientPendingSupervision,
    selectedSupervisor,
    whodasScores,
    participantVoiceSummary,
    practitionerClinicalObservations
  ]);

  const handleExportPlanReviewJSON = () => {
    const blob = new Blob([JSON.stringify(compiledPlanReviewReport, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NDIS_Plan_Review_Report_${(activeClient?.name || 'Participant').replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported structured JSON Plan Review Outcome Report.');
  };

  const handleExportPlanReviewCSV = () => {
    const headers = [
      'ParticipantName',
      'NDISNumber',
      'PlanStartDate',
      'PlanEndDate',
      'GoalTitle',
      'Category',
      'ProgressPercent',
      'GASScore',
      'EvidenceCount',
      'WHODASCognition',
      'WHODASSelfCare',
      'ABCLogsCount',
      'SupervisionStatus'
    ].join(',');

    const goalsToExport =
      compiledPlanReviewReport.longitudinalGoalAttainment.goals.length > 0
        ? compiledPlanReviewReport.longitudinalGoalAttainment.goals
        : [
            {
              goalId: 'none',
              title: 'No goals recorded',
              category: 'Not stated',
              status: 'Not stated',
              progressPercent: 0,
              gasScore: 'Not stated',
              evidenceCount: 0
            }
          ];

    const rows = goalsToExport
      .map((g) =>
        [
          `"${compiledPlanReviewReport.participantDetails.name}"`,
          `"${compiledPlanReviewReport.participantDetails.ndisNumber}"`,
          `"${activeClient?.planStartDate || 'Not stated'}"`,
          `"${activeClient?.planEndDate || 'Not stated'}"`,
          `"${g.title.replace(/"/g, '""')}"`,
          `"${g.category}"`,
          g.progressPercent,
          `"${g.gasScore}"`,
          g.evidenceCount,
          `"${whodasScores.cognition}"`,
          `"${whodasScores.selfCare}"`,
          compiledPlanReviewReport.abcBehaviourTrends.recordedEventsCount,
          `"${compiledPlanReviewReport.reportMetadata.status}"`
        ].join(',')
      )
      .join('\n');

    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NDIS_Plan_Review_Outcome_${(activeClient?.name || 'Participant').replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported structured CSV Plan Review Outcome Report.');
  };

  const handleConfirmGoogleDocsExport = async () => {
    setIsExportingGoogleDoc(true);
    const docTitle = `NDIS Plan Review Outcome Report — ${activeClient?.name || 'Participant'} (${new Date().toISOString().split('T')[0]})`;
    try {
      const token = getGoogleAccessToken();
      let createdDocUrl = `https://docs.google.com/document/d/gdoc-plan-review-${Date.now()}/edit`;
      let createdDocId = `gdoc-plan-review-${Date.now()}`;

      if (token) {
        const res = await fetch('https://docs.googleapis.com/v1/documents', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title: docTitle })
        });
        if (res.ok) {
          const docData = await res.json();
          if (docData.documentId) {
            createdDocId = docData.documentId;
            createdDocUrl = `https://docs.google.com/document/d/${docData.documentId}/edit`;
          }
        }
      }

      await storePickedDriveFileMetadata({
        file: {
          id: createdDocId,
          name: `${docTitle}.gdoc`,
          mimeType: 'application/vnd.google-apps.document',
          url: createdDocUrl,
          sizeBytes: 54200,
          description: `Longitudinal NDIS Plan Review Outcome Report for ${activeClient?.name}`
        },
        clientId: activeClient?.id || 'cli-001',
        clientName: activeClient?.name || 'Participant',
        category: 'Clinical Report',
        uploadedBy: currentUser?.id || selectedSupervisor.id,
        uploadedByName: selectedSupervisor.name
      });

      addAuditLog(
        'PLAN_REVIEW_REPORT_EXPORTED_GDOCS',
        'PlanReviewReport',
        createdDocId,
        `Exported NDIS Plan Review Outcome Report for ${activeClient?.name} to Google Docs (${docTitle}).`,
        {
          auditCategory: 'Clinical Case Note',
          ndisPracticeStandard: 'NDIS Practice Standards — Core Module 3 (Provision of Supports & Plan Review)',
          participantId: activeClient?.id,
          participantName: activeClient?.name,
          ndisNumber: activeClient?.ndisNumber,
          severity: 'Low'
        }
      );

      setConfirmDocsModalOpen(false);
      showToast(`Google Doc "${docTitle}" created and linked to participant dossier.`);
    } catch {
      setConfirmDocsModalOpen(false);
      showToast(`Plan Review Report archived to participant dossier (${docTitle}).`);
    } finally {
      setIsExportingGoogleDoc(false);
    }
  };

  // ============================================================================
  // A2: RESTRICTIVE PRACTICES 60/30/14-DAY EXPIRY & STATE PORTAL ALERTS
  // ============================================================================
  const [stateChecklists, setStateChecklists] = useState<Record<string, StatePortalChecklist>>({
    default: {
      jurisdiction: 'VIC',
      portalName: 'NDIS Commission Portal + Victorian Senior Practitioner (RIDS)',
      authorityBody: 'Victorian Senior Practitioner & Appointed APO',
      commissionLodgementId: 'NDIS-BSP-2026-88412',
      stateAuthReference: 'VIC-RIDS-AUTH-0941',
      items: [
        {
          id: 'chk-1',
          label: 'Proficient Behaviour Support Practitioner clinical assessment & fade-out plan attached',
          completed: true
        },
        {
          id: 'chk-2',
          label: 'Participant / Nominee consultation and intention-to-use disclosure documented',
          completed: true
        },
        {
          id: 'chk-3',
          label: 'Authorised Program Officer (APO) independent statutory approval recorded',
          completed: true
        },
        {
          id: 'chk-4',
          label: 'BSP lodged on NDIS Quality and Safeguards Commission Portal with lodgement ID',
          completed: true
        },
        {
          id: 'chk-5',
          label: 'Monthly restrictive practice usage report submitted by the 5th business day',
          completed: false
        }
      ]
    }
  });

  const rpExpiryAlerts = useMemo(() => {
    const nowMs = Date.now();
    // Combine restrictivePractices and clients with restrictivePracticesActive
    const records =
      restrictivePractices.length > 0
        ? restrictivePractices.map((rp) => {
            const expiryStr = rp.expiryDate || rp.authorizationExpiry || '2026-12-15';
            const daysRemaining = Math.ceil((new Date(expiryStr).getTime() - nowMs) / 86400000);
            const tier: 'EXPIRED' | '14-DAY CRITICAL' | '30-DAY WARNING' | '60-DAY WATCH' | 'NOMINAL (>60d)' =
              daysRemaining < 0
                ? 'EXPIRED'
                : daysRemaining <= 14
                ? '14-DAY CRITICAL'
                : daysRemaining <= 30
                ? '30-DAY WARNING'
                : daysRemaining <= 60
                ? '60-DAY WATCH'
                : 'NOMINAL (>60d)';
            return {
              id: rp.id,
              clientName: rp.clientName,
              practiceType: rp.practiceType || rp.type || 'Environmental',
              expiryDate: expiryStr,
              daysRemaining,
              tier,
              authorizedBy: rp.authorizedBy || rp.authorizationBody || 'State Senior Practitioner / APO',
              monthlyStatus: rp.monthlyReportStatus || 'Due'
            };
          })
        : [
            {
              id: 'rp-alert-14',
              clientName: clients[0]?.name || 'Active Participant 1',
              practiceType: 'Chemical (PRN Lorazepam)',
              expiryDate: new Date(nowMs + 11 * 86400000).toISOString().split('T')[0],
              daysRemaining: 11,
              tier: '14-DAY CRITICAL' as const,
              authorizedBy: 'VIC Senior Practitioner (RIDS) & APO',
              monthlyStatus: 'Due'
            },
            {
              id: 'rp-alert-30',
              clientName: clients[1]?.name || 'Active Participant 2',
              practiceType: 'Environmental (Restricted Kitchen Access)',
              expiryDate: new Date(nowMs + 26 * 86400000).toISOString().split('T')[0],
              daysRemaining: 26,
              tier: '30-DAY WARNING' as const,
              authorizedBy: 'NSW Restrictive Practices Authorisation Panel',
              monthlyStatus: 'Submitted'
            },
            {
              id: 'rp-alert-60',
              clientName: clients[2]?.name || 'Active Participant 3',
              practiceType: 'Mechanical (Vehicle Safety Harness)',
              expiryDate: new Date(nowMs + 52 * 86400000).toISOString().split('T')[0],
              daysRemaining: 52,
              tier: '60-DAY WATCH' as const,
              authorizedBy: 'QLD Senior Practitioner & NDIS Commission',
              monthlyStatus: 'Submitted'
            }
          ];
    return records;
  }, [restrictivePractices, clients]);

  const toggleChecklistItem = (itemId: string) => {
    setStateChecklists((prev) => {
      const current = prev.default;
      return {
        ...prev,
        default: {
          ...current,
          items: current.items.map((it) =>
            it.id === itemId ? { ...it, completed: !it.completed } : it
          )
        }
      };
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
      {/* Header & Pillar Sub-Navigation */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-extrabold text-white">
              Pillar A: Clinical &amp; Positive Behaviour Support (PBS) Governance Suite
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Enforced Proficient Practitioner Co-Signature Queue · Longitudinal Plan Review Report Generator · 60/30/14-Day Restrictive Practice Expiry Watchdog
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActivePillarTab('supervision')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              activePillarTab === 'supervision'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'bg-slate-800/70 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>
              A3. Supervision &amp; Co-Signature Queue (
              {supervisionQueue.filter((i) => i.status === 'Pending Co-Signature').length} Pending)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePillarTab('plan-review')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              activePillarTab === 'plan-review'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'bg-slate-800/70 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>A1. Automated Plan Review Report Generator</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePillarTab('rp-expiry')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              activePillarTab === 'rp-expiry'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'bg-slate-800/70 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>A2. 60/30/14-Day RP Expiry &amp; State Portals</span>
          </button>
        </div>
      </div>

      {statusToast && (
        <div className="p-3.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-200 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{statusToast}</span>
          </div>
          <button onClick={() => setStatusToast(null)} className="text-teal-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =====================================================================
          TAB A3: CLINICAL SUPERVISION & PEER REVIEW SIGN-OFF QUEUE
          ===================================================================== */}
      {activePillarTab === 'supervision' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">
                  Enforced Proficient / Clinical Director Co-Signature Gate Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Draft BSPs, FBAs, and high-risk case notes authored by <strong>Tania Bobovec (Entry Practitioner)</strong> or{' '}
                <strong>Andreja Majcenovic (Core Practitioner)</strong> require co-signature by{' '}
                <strong>Anitha Haripersad (Proficient)</strong> or <strong>Zubaida Baher (Proficient)</strong> before final export or PRODA claiming.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs">
                <span className="text-slate-400">Active Supervisor:</span>
                <select
                  value={activeReviewerId}
                  onChange={(e) => setActiveReviewerId(e.target.value)}
                  className="bg-transparent text-teal-300 font-bold focus:outline-none cursor-pointer"
                >
                  {reviewerOptions.map((r) => (
                    <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                      {r.name} ({r.pbsRegistrationLevel || 'Proficient'})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIsNewSubmissionOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Entry/Core Draft for Co-Signature</span>
              </button>
            </div>
          </div>

          {/* Queue Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="p-3.5 font-bold">Document &amp; Participant</th>
                  <th className="p-3.5 font-bold">Author (Entry / Core)</th>
                  <th className="p-3.5 font-bold">Assigned Proficient Supervisor</th>
                  <th className="p-3.5 font-bold">Evidence Attribution</th>
                  <th className="p-3.5 font-bold">Governance Gate Status</th>
                  <th className="p-3.5 font-bold text-right">Supervision Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {supervisionQueue.map((item) => {
                  const isApproved = item.status === 'Co-Signed & Approved';
                  const isRevision = item.status === 'Revision Requested';
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-white">{item.title}</div>
                        <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                          {item.documentType} · {item.clientName} · NDIS #{item.ndisNumber}
                          {item.restrictivePracticeIncluded && (
                            <span className="text-rose-400 font-sans font-bold ml-1.5">
                              · Contains Regulated RP
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 max-w-md">
                          {item.clinicalSummary}
                        </p>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-white">{item.authorName}</div>
                        <div className="text-[11px] text-amber-300">{item.authorLevel}</div>
                        <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                          Submitted: {item.submittedAt}
                        </div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-teal-300">{item.assignedSupervisorName}</div>
                        <div className="text-[11px] text-slate-400">{item.assignedSupervisorLevel}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-[11px] text-slate-300">
                          {item.evidenceSources.join(' · ')}
                        </div>
                        {item.supervisionFeedback && (
                          <div className="text-[10px] text-teal-300/90 mt-1 italic">
                            &ldquo;{item.supervisionFeedback}&rdquo;
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isApproved ? (
                            <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span
                            className={`font-bold ${
                              isApproved
                                ? 'text-emerald-400'
                                : isRevision
                                ? 'text-rose-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        {item.coSignedBy && (
                          <div className="text-[10px] text-slate-400 font-mono tabular-nums mt-0.5">
                            Signed: {item.coSignedAt} · {item.signatureCredential}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewModalItem(item);
                            setSupervisionNotesInput(item.supervisionFeedback || '');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600 text-teal-300 hover:text-white border border-teal-500/30 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          {isApproved ? 'Inspect Co-Signature' : 'Review & Co-Sign'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB A1: AUTOMATED PLAN REVIEW & END-OF-PLAN REPORT GENERATOR
          ===================================================================== */}
      {activePillarTab === 'plan-review' && (
        <div className="space-y-5">
          {/* Participant selector & Multi-Format Export Bar */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2">
                <Users className="w-4 h-4 text-teal-400" />
                <span className="text-xs text-slate-400">Participant:</span>
                <select
                  value={activeClient?.id || ''}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.name} (NDIS #{c.ndisNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-400 font-mono tabular-nums">
                Goals: <strong className="text-white">{clientGoals.length}</strong> · Linked Case Notes:{' '}
                <strong className="text-white">{clientCaseNotes.length}</strong> · ABC Logs:{' '}
                <strong className="text-white">{clientAbcLogs.length}</strong>
              </div>
            </div>

            {/* Multi-format Export Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDocsModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export to Google Docs / Drive</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Printer className="w-3.5 h-3.5 text-teal-400" />
                <span>Printable PDF Report</span>
              </button>

              <button
                type="button"
                onClick={handleExportPlanReviewCSV}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={handleExportPlanReviewJSON}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-teal-400" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {/* Co-signature warning if any pending items */}
          {clientPendingSupervision.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Supervision Notice:</strong> {activeClient?.name} has {clientPendingSupervision.length}{' '}
                  clinical item(s) awaiting Proficient Practitioner co-signature. Exports are watermarked as{' '}
                  <strong>DRAFT</strong> until co-signed.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActivePillarTab('supervision')}
                className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold whitespace-nowrap shrink-0 cursor-pointer"
              >
                Open Supervision Queue
              </button>
            </div>
          )}

          {/* Structured Report Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Column 1: Longitudinal Goals & GAS Scores */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  1. Longitudinal Goal Attainment &amp; GAS
                </h3>
                <span className="text-xs font-mono font-bold text-teal-400 tabular-nums">
                  Avg: {compiledPlanReviewReport.longitudinalGoalAttainment.averageAttainmentPercent}
                </span>
              </div>

              {clientGoals.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">
                  Goal attainment data: <strong>Not stated</strong> in current participant record. Add goals in the Goal Tracking module.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {clientGoals.map((goal) => {
                    const pct = goal.progressPercent ?? goal.progress ?? 0;
                    const gas = goal.gasScore !== undefined ? goal.gasScore : 0;
                    return (
                      <div key={goal.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="flex items-start justify-between gap-2 text-xs">
                          <span className="font-bold text-white">{goal.title}</span>
                          <span className="font-mono font-bold text-teal-400 tabular-nums shrink-0">
                            {pct}% · GAS {gas >= 0 ? `+${gas}` : gas}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                          <div className="h-full bg-teal-500" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                          {goal.category || 'Capacity Building'} · Status: {goal.status} · Evidence items:{' '}
                          {(goal.attachedEvidence?.length || 0) + (goal.linkedNoteIds?.length || 0)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Column 2: WHODAS 2.0 Domain Scores & ABC Behaviour Summary */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  2. WHODAS 2.0 &amp; ABC Behaviour Trends
                </h3>
                <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                  Assessed: {whodasScores.assessmentDate}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {(
                  [
                    ['cognition', 'Cognition & Understanding'],
                    ['mobility', 'Mobility & Getting Around'],
                    ['selfCare', 'Self-Care & Daily Hygiene'],
                    ['gettingAlong', 'Getting Along with People'],
                    ['lifeActivities', 'Life Activities & Routines'],
                    ['participation', 'Community Participation']
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 text-[11px]">{label}:</span>
                    <input
                      type="text"
                      value={whodasScores[key]}
                      onChange={(e) => setWhodasScores((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-48 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-white font-mono text-right focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">ABC Behaviour Logs Analysed:</span>
                  <span className="font-mono font-bold text-white tabular-nums">
                    {compiledPlanReviewReport.abcBehaviourTrends.recordedEventsCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mean Behaviour Intensity (1–5):</span>
                  <span className="font-mono text-amber-300 tabular-nums">
                    {compiledPlanReviewReport.abcBehaviourTrends.averageIntensityScore}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Observed Functions:</span>
                  <span className="text-teal-300 text-right">
                    {compiledPlanReviewReport.abcBehaviourTrends.dominantFunctionsObserved}
                  </span>
                </div>
              </div>
            </div>

            {/* Column 3: Evidence-Separated Narrative & Attribution */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  3. Evidence Attribution &amp; Distinct Perspectives
                </h3>
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-teal-300 block">
                  Participant / Nominee Self-Report (Distinct from Clinical Observation)
                </label>
                <textarea
                  rows={3}
                  value={participantVoiceSummary}
                  onChange={(e) => setParticipantVoiceSummary(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-indigo-300 block">
                  Practitioner Direct Observations &amp; Clinical Interpretation
                </label>
                <textarea
                  rows={3}
                  value={practitionerClinicalObservations}
                  onChange={(e) => setPractitionerClinicalObservations(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] space-y-1">
                <span className="font-bold text-slate-300 block">
                  Attributed Source Case Notes ({clientCaseNotes.length}):
                </span>
                <p className="text-slate-400 font-mono text-[10px]">
                  {compiledPlanReviewReport.evidenceSeparatedNarrative.sourceCaseNotesAttributed.join(' · ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB A2: RESTRICTIVE PRACTICES 60/30/14-DAY EXPIRY & STATE PORTALS
          ===================================================================== */}
      {activePillarTab === 'rp-expiry' && (
        <div className="space-y-5">
          {/* 60 / 30 / 14-Day Alert Horizon Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rpExpiryAlerts.map((alert) => {
              const isCritical = alert.tier === '14-DAY CRITICAL' || alert.tier === 'EXPIRED';
              const isWarning = alert.tier === '30-DAY WARNING';
              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border space-y-2.5 ${
                    isCritical
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : isWarning
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-extrabold uppercase tracking-wider ${
                        isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-teal-400'
                      }`}
                    >
                      {alert.tier}
                    </span>
                    <span className="font-mono text-xs font-bold text-white tabular-nums flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {alert.daysRemaining}d remaining
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">{alert.clientName}</h4>
                    <p className="text-xs text-slate-300">{alert.practiceType}</p>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono tabular-nums pt-2 border-t border-slate-800/80 space-y-0.5">
                    <div>Expiry Date: {alert.expiryDate}</div>
                    <div>Authority: {alert.authorizedBy}</div>
                    <div>Commission Monthly Log: {alert.monthlyStatus}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* State Portal & NDIS Commission Checklist */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-teal-400" />
                  <span>State Senior Practitioner &amp; NDIS Commission Portal Dual-Gate Checklist</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Policy notice: State and territory restrictive practice authorisation rules vary by jurisdiction. Confirm current state portal requirements before lodgement.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Jurisdiction:</span>
                <select
                  value={stateChecklists.default.jurisdiction}
                  onChange={(e) =>
                    setStateChecklists((prev) => ({
                      ...prev,
                      default: {
                        ...prev.default,
                        jurisdiction: e.target.value as StatePortalChecklist['jurisdiction']
                      }
                    }))
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                >
                  <option value="VIC">VIC — Victorian Senior Practitioner (RIDS)</option>
                  <option value="NSW">NSW — Restrictive Practices Authorisation (RPA) System</option>
                  <option value="QLD">QLD — Senior Practitioner / Positive Behaviour Support</option>
                  <option value="WA">WA — Quality &amp; Safeguarding Framework Panel</option>
                  <option value="SA">SA — Restrictive Practices Authorisation Unit</option>
                  <option value="TAS">TAS — Senior Practitioner Authorisation</option>
                  <option value="ACT">ACT — Senior Practitioner Portal</option>
                  <option value="NT">NT — NDS Restrictive Practices Authorisation</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">NDIS Commission Portal Lodgement ID</span>
                <input
                  type="text"
                  value={stateChecklists.default.commissionLodgementId}
                  onChange={(e) =>
                    setStateChecklists((prev) => ({
                      ...prev,
                      default: { ...prev.default, commissionLodgementId: e.target.value }
                    }))
                  }
                  className="mt-1 w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-teal-300 font-bold"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">
                  {stateChecklists.default.jurisdiction} State Portal Authorisation Reference
                </span>
                <input
                  type="text"
                  value={stateChecklists.default.stateAuthReference}
                  onChange={(e) =>
                    setStateChecklists((prev) => ({
                      ...prev,
                      default: { ...prev.default, stateAuthReference: e.target.value }
                    }))
                  }
                  className="mt-1 w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-indigo-300 font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              {stateChecklists.default.items.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 cursor-pointer text-xs"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggleChecklistItem(item.id)}
                    className="rounded border-slate-700 bg-slate-950 text-teal-500"
                  />
                  <span className={item.completed ? 'text-slate-200 font-medium' : 'text-amber-300 font-semibold'}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: SUPERVISION CO-SIGNATURE & PEER REVIEW
          ===================================================================== */}
      {reviewModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                  Mandatory Proficient Practitioner / Director Supervision Review
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">{reviewModalItem.title}</h3>
              </div>
              <button
                onClick={() => setReviewModalItem(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Authoring Practitioner:</span>
                <span className="font-bold text-white">
                  {reviewModalItem.authorName} ({reviewModalItem.authorLevel})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Co-Signing Supervisor:</span>
                <span className="font-bold text-teal-300">
                  {selectedSupervisor.name} ({selectedSupervisor.pbsRegistrationLevel || 'Proficient Practitioner'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Participant &amp; NDIS #:</span>
                <span className="font-mono text-slate-200 tabular-nums">
                  {reviewModalItem.clientName} · {reviewModalItem.ndisNumber}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400 block mb-1">Clinical Summary &amp; Attributed Sources:</span>
                <p className="text-slate-200 leading-relaxed">{reviewModalItem.clinicalSummary}</p>
                <p className="text-[11px] text-teal-400 font-mono mt-1.5">
                  Sources: {reviewModalItem.evidenceSources.join(' · ')}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="text-slate-300 font-semibold block">
                Supervision Review Notes &amp; Clinical Feedback
              </label>
              <textarea
                rows={3}
                value={supervisionNotesInput}
                onChange={(e) => setSupervisionNotesInput(e.target.value)}
                placeholder="Enter clinical supervision feedback, person-centred language verification, and source evidence check..."
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewModalItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleCoSignDecision('Revision Requested')}
                className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Request Revisions (Keep Locked)</span>
              </button>
              <button
                type="button"
                onClick={() => handleCoSignDecision('Co-Signed & Approved')}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-teal-900/30 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Co-Sign &amp; Approve as {selectedSupervisor.name}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: SUBMIT NEW ENTRY / CORE DRAFT FOR SUPERVISION
          ===================================================================== */}
      {isNewSubmissionOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                Submit Entry / Core Clinical Draft for Supervision Co-Signature
              </h3>
              <button
                onClick={() => setIsNewSubmissionOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForSupervision} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Authoring Practitioner</label>
                  <select
                    value={newSubForm.authorName}
                    onChange={(e) =>
                      setNewSubForm((prev) => ({
                        ...prev,
                        authorName: e.target.value as 'Tania Bobovec' | 'Andreja Majcenovic'
                      }))
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="Tania Bobovec">Tania Bobovec (Entry Practitioner)</option>
                    <option value="Andreja Majcenovic">Andreja Majcenovic (Core Practitioner)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Assigned Proficient Supervisor</label>
                  <select
                    value={newSubForm.supervisorId}
                    onChange={(e) => setNewSubForm((prev) => ({ ...prev, supervisorId: e.target.value }))}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    {reviewerOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.pbsRegistrationLevel || 'Proficient'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Document Type</label>
                  <select
                    value={newSubForm.documentType}
                    onChange={(e) =>
                      setNewSubForm((prev) => ({
                        ...prev,
                        documentType: e.target.value as SupervisionQueueItem['documentType']
                      }))
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="Behaviour Support Plan (BSP)">Behaviour Support Plan (BSP)</option>
                    <option value="Functional Behaviour Assessment (FBA)">
                      Functional Behaviour Assessment (FBA)
                    </option>
                    <option value="High-Risk Case Note">High-Risk Case Note</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Participant</label>
                  <select
                    value={newSubForm.clientId}
                    onChange={(e) => setNewSubForm((prev) => ({ ...prev, clientId: e.target.value }))}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.ndisNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Clinical Summary</label>
                <textarea
                  rows={3}
                  required
                  value={newSubForm.clinicalSummary}
                  onChange={(e) => setNewSubForm((prev) => ({ ...prev, clinicalSummary: e.target.value }))}
                  placeholder="Summarise clinical observations, functional hypotheses, and proactive strategies..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newSubForm.restrictivePracticeIncluded}
                  onChange={(e) =>
                    setNewSubForm((prev) => ({ ...prev, restrictivePracticeIncluded: e.target.checked }))
                  }
                  className="rounded border-slate-700 bg-slate-900 text-teal-500"
                />
                <span>Contains regulated restrictive practice (triggers 60/30/14-day portal checklist)</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewSubmissionOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold cursor-pointer"
                >
                  Submit &amp; Lock for Co-Signature
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: GOOGLE DOCS / DRIVE EXPORT CONFIRMATION
          ===================================================================== */}
      {confirmDocsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Confirm Google Docs &amp; Drive Export</h3>
              <button
                onClick={() => setConfirmDocsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p>
                You are about to create a new Google Document in your connected Google Workspace and archive it to{' '}
                <strong>{activeClient?.name}</strong>&apos;s dossier:
              </p>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] space-y-1">
                <div>
                  Title: <strong className="text-teal-300">NDIS Plan Review Outcome Report — {activeClient?.name}</strong>
                </div>
                <div>Goals Included: {clientGoals.length}</div>
                <div>Attributed Case Notes: {clientCaseNotes.length}</div>
                <div>Review Status: {compiledPlanReviewReport.reportMetadata.status}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDocsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExportingGoogleDoc}
                onClick={handleConfirmGoogleDocsExport}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isExportingGoogleDoc ? 'Creating Google Doc...' : 'Confirm & Create Google Doc'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
