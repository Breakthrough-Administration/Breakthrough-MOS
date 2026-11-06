'use client';

import React, { useState, useMemo } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import {
  UserCheck,
  FileCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  RotateCcw,
  Plus,
  Filter,
  Search,
  Lock,
  AlertTriangle,
  FileText,
  Users,
  Award,
  CheckSquare,
  History,
  X,
  ArrowRight,
  Eye,
  Send
} from 'lucide-react';

export type PractitionerCapabilityLevel =
  | 'Entry Practitioner'
  | 'Core Practitioner'
  | 'Proficient Practitioner'
  | 'Clinical Director';

export type SignOffDocumentCategory =
  | 'Interim BSP (6-Month)'
  | 'Comprehensive BSP (12-Month)'
  | 'Functional Behaviour Assessment (FBA)'
  | 'High-Risk Case Note (SOAP)'
  | 'High-Risk Case Note (BIRP)'
  | 'Incident Debrief & Risk Note';

export type SignOffApprovalStatus =
  | 'Pending Co-Signature'
  | 'Under Clinical Review'
  | 'Revision Required'
  | 'Co-Signed & Locked';

export interface SignOffAuditTrailEntry {
  id: string;
  timestampIso: string;
  dateFormatted: string;
  actorName: string;
  actorTier: PractitionerCapabilityLevel;
  action: 'Submitted Draft' | 'Started Review' | 'Requested Revision' | 'Resubmitted Draft' | 'Co-Signed & Locked';
  notes: string;
}

export interface ClinicalSignOffSubmission {
  id: string;
  clientId: string;
  clientName: string;
  ndisNumber: string;
  documentTitle: string;
  documentCategory: SignOffDocumentCategory;
  authorName: string;
  authorEmail: string;
  authorPhone: string;
  authorTier: 'Entry Practitioner' | 'Core Practitioner';
  assignedReviewerName: string;
  assignedReviewerTier: 'Proficient Practitioner' | 'Clinical Director';
  submittedDate: string;
  submittedIso: string;
  riskSeverity: 'Medium' | 'High' | 'Critical';
  containsRestrictivePractice: boolean;
  restrictivePracticeType?: string;
  status: SignOffApprovalStatus;
  subjectiveParticipantCarerReport: string;
  objectivePractitionerObservation: string;
  clinicalInterpretationAndStrategies: string;
  reviewerSupervisionFeedback: string;
  coSignedBy?: string;
  coSignedRole?: PractitionerCapabilityLevel;
  coSignedAt?: string;
  verificationChecklist: {
    id: string;
    label: string;
    verified: boolean;
  }[];
  auditTrail: SignOffAuditTrailEntry[];
}

const PRACTITIONER_ROSTER = [
  {
    name: 'Tania Bobovec',
    tier: 'Entry Practitioner' as const,
    email: 'tanja@breakthroughconsult.com.au',
    phone: '046 882 8132',
    canApprove: false
  },
  {
    name: 'Andreja Majcenovic',
    tier: 'Core Practitioner' as const,
    email: 'andreja@breakthroughconsult.com.au',
    phone: '049 746 6209',
    canApprove: false
  },
  {
    name: 'Anitha Haripersad',
    tier: 'Proficient Practitioner' as const,
    email: 'support@breakthroughconsult.com.au',
    phone: '043 027 5400',
    canApprove: true
  },
  {
    name: 'Zubaida Baher',
    tier: 'Proficient Practitioner' as const,
    email: 'zubaida@breakthroughconsult.com.au',
    phone: '042 308 8606',
    canApprove: true
  },
  {
    name: 'Shivandhari Persad',
    tier: 'Clinical Director' as const,
    email: 'shivandharipersad@gmail.com',
    phone: '043 027 5400',
    canApprove: true
  }
];

function toIsoDdMmYy(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '04-11-26';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

export const ClinicalSignOffQueue: React.FC<{
  compactHeader?: boolean;
}> = ({ compactHeader = false }) => {
  const {
    clients,
    caseNotes,
    currentUser,
    addAuditLog,
    addNotification
  } = useManagementStore();

  // Active practitioner lens so staff can test both Entry/Core submission and Proficient/Director co-signature
  const [activeStaffIdentity, setActiveStaffIdentity] = useState<string>(() => {
    const uName = (currentUser?.name || '').toLowerCase();
    if (uName.includes('zubaida')) return 'Zubaida Baher';
    if (uName.includes('andreja')) return 'Andreja Majcenovic';
    if (uName.includes('tania') || uName.includes('tanja')) return 'Tania Bobovec';
    if (uName.includes('shivan')) return 'Shivandhari Persad';
    return 'Anitha Haripersad';
  });

  const activePractitionerRecord = useMemo(
    () =>
      PRACTITIONER_ROSTER.find((p) => p.name === activeStaffIdentity) ||
      PRACTITIONER_ROSTER[2],
    [activeStaffIdentity]
  );

  const canCoSignDocuments = activePractitionerRecord.canApprove;

  const [statusFilter, setStatusFilter] = useState<'ALL' | SignOffApprovalStatus>('ALL');
  const [authorFilter, setAuthorFilter] = useState<'ALL' | 'Tania Bobovec' | 'Andreja Majcenovic'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [bannerNotice, setBannerNotice] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const triggerBanner = (type: 'success' | 'warning', text: string) => {
    setBannerNotice({ type, text });
    setTimeout(() => setBannerNotice(null), 5000);
  };

  // Seed initial Clinical Sign-Off Queue items grounded in the 22 participants & 4 practitioners
  const [submissions, setSubmissions] = useState<ClinicalSignOffSubmission[]>(() => {
    const c1 = clients[0] || { id: 'cli-01', name: 'Lachlan Miller', ndisNumber: '430918273' };
    const c2 = clients[1] || { id: 'cli-02', name: 'Olivia Vance', ndisNumber: '431029384' };
    const c3 = clients[2] || { id: 'cli-03', name: 'Marcus Chen', ndisNumber: '430847561' };
    const c4 = clients[3] || { id: 'cli-04', name: 'Sienna Patel', ndisNumber: '431298374' };

    return [
      {
        id: 'csq-101',
        clientId: c1.id,
        clientName: c1.name,
        ndisNumber: c1.ndisNumber,
        documentTitle: `Interim Behaviour Support Plan (6-Month) — ${c1.name}`,
        documentCategory: 'Interim BSP (6-Month)',
        authorName: 'Tania Bobovec',
        authorEmail: 'tanja@breakthroughconsult.com.au',
        authorPhone: '046 882 8132',
        authorTier: 'Entry Practitioner',
        assignedReviewerName: 'Anitha Haripersad',
        assignedReviewerTier: 'Proficient Practitioner',
        submittedDate: '2026-11-02',
        submittedIso: '02-11-26',
        riskSeverity: 'Critical',
        containsRestrictivePractice: true,
        restrictivePracticeType: 'Environmental Restraint (Perimeter Keypad)',
        status: 'Pending Co-Signature',
        subjectiveParticipantCarerReport:
          'Support coordinator and family carer reported three instances of unassisted road exit attempts following loud unexpected auditory triggers.',
        objectivePractitionerObservation:
          'During 90-minute home observation, participant oriented toward front exit when garbage truck passed (82dB peak) and accepted visual "First/Then" safety card within 45 seconds.',
        clinicalInterpretationAndStrategies:
          'Hypothesis: Escape from sudden auditory overstimulation. Proactive strategy: Noise-attenuating headphones offered prior to street transitions + functional communication exchange ("Quiet break") + temporary perimeter keypad protocol requiring Proficient Practitioner & APO sign-off.',
        reviewerSupervisionFeedback:
          'Awaiting Proficient Practitioner verification of least-restrictive environmental fade schedule prior to NDIS Commission lodgement.',
        verificationChecklist: [
          {
            id: 'chk-1',
            label: 'Participant/carer subjective report separated from direct practitioner observation',
            verified: true
          },
          {
            id: 'chk-2',
            label: 'Functional replacement behaviour and proactive environmental strategies documented',
            verified: true
          },
          {
            id: 'chk-3',
            label: 'Measurable restrictive practice fade-out schedule & data collection criteria verified',
            verified: false
          }
        ],
        auditTrail: [
          {
            id: 'aud-101-1',
            timestampIso: '2026-11-02T14:20:00Z',
            dateFormatted: '02-11-26',
            actorName: 'Tania Bobovec',
            actorTier: 'Entry Practitioner',
            action: 'Submitted Draft',
            notes: 'Initial Interim BSP draft submitted for Proficient Practitioner co-signature.'
          }
        ]
      },
      {
        id: 'csq-102',
        clientId: c2.id,
        clientName: c2.name,
        ndisNumber: c2.ndisNumber,
        documentTitle: `High-Risk Case Note (BIRP — Community Access Escalation) — ${c2.name}`,
        documentCategory: 'High-Risk Case Note (BIRP)',
        authorName: 'Andreja Majcenovic',
        authorEmail: 'andreja@breakthroughconsult.com.au',
        authorPhone: '049 746 6209',
        authorTier: 'Core Practitioner',
        assignedReviewerName: 'Zubaida Baher',
        assignedReviewerTier: 'Proficient Practitioner',
        submittedDate: '2026-11-03',
        submittedIso: '03-11-26',
        riskSeverity: 'High',
        containsRestrictivePractice: false,
        status: 'Under Clinical Review',
        subjectiveParticipantCarerReport:
          'Participant stated "Too many people, want to go home now" while waiting at shopping centre checkout.',
        objectivePractitionerObservation:
          'Participant displayed pacing and vocal volume increase for 4 minutes. Practitioner implemented low-arousal verbal de-escalation and guided participant to quiet seating area. Baseline calm resumed after 6 minutes with zero physical contact.',
        clinicalInterpretationAndStrategies:
          'Participant demonstrated independent verbal precursor statement prior to escalation. Reinforce early self-advocacy request and adjust community outing time to off-peak morning hours.',
        reviewerSupervisionFeedback:
          'Under review by Zubaida Baher: Reviewing alignment between BIRP de-escalation record and updated ABC log frequency.',
        verificationChecklist: [
          {
            id: 'chk-1',
            label: 'Participant/carer subjective report separated from direct practitioner observation',
            verified: true
          },
          {
            id: 'chk-2',
            label: 'Respectful, person-centred, non-stigmatising Australian English verified',
            verified: true
          },
          {
            id: 'chk-3',
            label: 'Incident cross-reference & post-session risk mitigations confirmed',
            verified: true
          }
        ],
        auditTrail: [
          {
            id: 'aud-102-1',
            timestampIso: '2026-11-03T09:15:00Z',
            dateFormatted: '03-11-26',
            actorName: 'Andreja Majcenovic',
            actorTier: 'Core Practitioner',
            action: 'Submitted Draft',
            notes: 'High-risk BIRP case note submitted for post-escalation clinical review.'
          },
          {
            id: 'aud-102-2',
            timestampIso: '2026-11-03T16:40:00Z',
            dateFormatted: '03-11-26',
            actorName: 'Zubaida Baher',
            actorTier: 'Proficient Practitioner',
            action: 'Started Review',
            notes: 'Commenced clinical supervision check of antecedent and de-escalation documentation.'
          }
        ]
      },
      {
        id: 'csq-103',
        clientId: c3.id,
        clientName: c3.name,
        ndisNumber: c3.ndisNumber,
        documentTitle: `Functional Behaviour Assessment (FBA) & Comprehensive BSP — ${c3.name}`,
        documentCategory: 'Functional Behaviour Assessment (FBA)',
        authorName: 'Tania Bobovec',
        authorEmail: 'tanja@breakthroughconsult.com.au',
        authorPhone: '046 882 8132',
        authorTier: 'Entry Practitioner',
        assignedReviewerName: 'Anitha Haripersad',
        assignedReviewerTier: 'Proficient Practitioner',
        submittedDate: '2026-10-29',
        submittedIso: '29-10-26',
        riskSeverity: 'High',
        containsRestrictivePractice: true,
        restrictivePracticeType: 'Chemical Restraint (PRN Protocol Review)',
        status: 'Revision Required',
        subjectiveParticipantCarerReport:
          'SIL team lead reported heightened evening agitation when shift handovers occur after 20:00.',
        objectivePractitionerObservation:
          'Reviewed 14 days of SIL ABC charts: 78% of recorded behaviours occurred between 19:45 and 20:30 during concurrent staff handover.',
        clinicalInterpretationAndStrategies:
          'Setting event: Reduced staff availability during evening shift change. Recommended staggered handover and scheduled sensory wind-down routine at 19:30.',
        reviewerSupervisionFeedback:
          'Revision requested by Anitha Haripersad: Clarify prescribing medical practitioner details for PRN medication (or mark "Not stated" pending GP letter) and separate SIL carer report from direct FBA observation.',
        verificationChecklist: [
          {
            id: 'chk-1',
            label: 'Participant/carer subjective report separated from direct practitioner observation',
            verified: false
          },
          {
            id: 'chk-2',
            label: 'Functional replacement behaviour and proactive environmental strategies documented',
            verified: true
          },
          {
            id: 'chk-3',
            label: 'Medical practitioner prescription reference attributed or marked Not stated',
            verified: false
          }
        ],
        auditTrail: [
          {
            id: 'aud-103-1',
            timestampIso: '2026-10-29T11:00:00Z',
            dateFormatted: '29-10-26',
            actorName: 'Tania Bobovec',
            actorTier: 'Entry Practitioner',
            action: 'Submitted Draft',
            notes: 'Draft FBA submitted for supervision review.'
          },
          {
            id: 'aud-103-2',
            timestampIso: '2026-10-30T15:10:00Z',
            dateFormatted: '30-10-26',
            actorName: 'Anitha Haripersad',
            actorTier: 'Proficient Practitioner',
            action: 'Requested Revision',
            notes: 'Please separate SIL staff report from direct clinician observation and attribute GP letter.'
          }
        ]
      },
      {
        id: 'csq-104',
        clientId: c4.id,
        clientName: c4.name,
        ndisNumber: c4.ndisNumber,
        documentTitle: `Comprehensive Behaviour Support Plan (12-Month) — ${c4.name}`,
        documentCategory: 'Comprehensive BSP (12-Month)',
        authorName: 'Andreja Majcenovic',
        authorEmail: 'andreja@breakthroughconsult.com.au',
        authorPhone: '049 746 6209',
        authorTier: 'Core Practitioner',
        assignedReviewerName: 'Anitha Haripersad',
        assignedReviewerTier: 'Proficient Practitioner',
        submittedDate: '2026-10-24',
        submittedIso: '24-10-26',
        riskSeverity: 'Medium',
        containsRestrictivePractice: false,
        status: 'Co-Signed & Locked',
        subjectiveParticipantCarerReport:
          'Participant expressed preference for using visual tablet schedule for morning vocational transition.',
        objectivePractitionerObservation:
          'Across 4 consecutive sessions, independent task transition increased from 35% to 80% when visual countdown timer was presented 10 minutes in advance.',
        clinicalInterpretationAndStrategies:
          'Proactive visual predictability strategy effective. No regulated restrictive practices required. Maintain monthly GAS progress monitoring.',
        reviewerSupervisionFeedback:
          'Formally co-signed by Anitha Haripersad (Proficient Practitioner). Person-centred language, GAS baseline/target definitions, and proactive strategies verified.',
        coSignedBy: 'Anitha Haripersad',
        coSignedRole: 'Proficient Practitioner',
        coSignedAt: '2026-10-25',
        verificationChecklist: [
          {
            id: 'chk-1',
            label: 'Participant/carer subjective report separated from direct practitioner observation',
            verified: true
          },
          {
            id: 'chk-2',
            label: 'Functional replacement behaviour and proactive environmental strategies documented',
            verified: true
          },
          {
            id: 'chk-3',
            label: 'Longitudinal GAS goals aligned with NDIS support categories',
            verified: true
          }
        ],
        auditTrail: [
          {
            id: 'aud-104-1',
            timestampIso: '2026-10-24T10:00:00Z',
            dateFormatted: '24-10-26',
            actorName: 'Andreja Majcenovic',
            actorTier: 'Core Practitioner',
            action: 'Submitted Draft',
            notes: '12-Month Comprehensive BSP submitted for Proficient co-signature.'
          },
          {
            id: 'aud-104-2',
            timestampIso: '2026-10-25T13:30:00Z',
            dateFormatted: '25-10-26',
            actorName: 'Anitha Haripersad',
            actorTier: 'Proficient Practitioner',
            action: 'Co-Signed & Locked',
            notes: 'Approved and co-signed under NDIS PBS Capability Framework.'
          }
        ]
      }
    ];
  });

  // New Draft Submission Form State
  const [newSubmissionForm, setNewSubmissionForm] = useState<{
    clientId: string;
    sourceCaseNoteId: string;
    documentTitle: string;
    documentCategory: SignOffDocumentCategory;
    authorName: 'Tania Bobovec' | 'Andreja Majcenovic';
    assignedReviewerName: 'Anitha Haripersad' | 'Zubaida Baher' | 'Shivandhari Persad';
    riskSeverity: 'Medium' | 'High' | 'Critical';
    containsRestrictivePractice: boolean;
    restrictivePracticeType: string;
    subjectiveParticipantCarerReport: string;
    objectivePractitionerObservation: string;
    clinicalInterpretationAndStrategies: string;
  }>({
    clientId: clients[0]?.id || 'cli-01',
    sourceCaseNoteId: '',
    documentTitle: '',
    documentCategory: 'Interim BSP (6-Month)',
    authorName: 'Tania Bobovec',
    assignedReviewerName: 'Anitha Haripersad',
    riskSeverity: 'High',
    containsRestrictivePractice: false,
    restrictivePracticeType: '',
    subjectiveParticipantCarerReport: '',
    objectivePractitionerObservation: '',
    clinicalInterpretationAndStrategies: ''
  });

  // Populate fields if user selects an existing case note to submit for high-risk co-signature
  const handleSelectExistingCaseNote = (noteId: string) => {
    const matched = caseNotes.find((n) => n.id === noteId);
    if (!matched) {
      setNewSubmissionForm((prev) => ({ ...prev, sourceCaseNoteId: '' }));
      return;
    }
    setNewSubmissionForm((prev) => ({
      ...prev,
      sourceCaseNoteId: noteId,
      clientId: matched.clientId,
      documentTitle: `High-Risk Case Note (${matched.format}) — ${matched.clientName} (${matched.date})`,
      documentCategory:
        matched.format === 'BIRP' ? 'High-Risk Case Note (BIRP)' : 'High-Risk Case Note (SOAP)',
      subjectiveParticipantCarerReport: matched.subjective || 'Not stated',
      objectivePractitionerObservation: matched.objective || 'Not stated',
      clinicalInterpretationAndStrategies:
        `${matched.assessment || 'Not stated'} | Plan: ${matched.plan || 'Not stated'}`
    }));
  };

  // Status dashboard counts
  const statusCounts = useMemo(() => {
    const pending = submissions.filter((s) => s.status === 'Pending Co-Signature').length;
    const inReview = submissions.filter((s) => s.status === 'Under Clinical Review').length;
    const revision = submissions.filter((s) => s.status === 'Revision Required').length;
    const locked = submissions.filter((s) => s.status === 'Co-Signed & Locked').length;
    return { pending, inReview, revision, locked, total: submissions.length };
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (authorFilter !== 'ALL' && item.authorName !== authorFilter) return false;
      if (categoryFilter !== 'ALL' && item.documentCategory !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesClient = item.clientName.toLowerCase().includes(q);
        const matchesNdis = item.ndisNumber.toLowerCase().includes(q);
        const matchesTitle = item.documentTitle.toLowerCase().includes(q);
        const matchesAuthor = item.authorName.toLowerCase().includes(q);
        if (!matchesClient && !matchesNdis && !matchesTitle && !matchesAuthor) return false;
      }
      return true;
    });
  }, [submissions, statusFilter, authorFilter, categoryFilter, searchQuery]);

  // Toggle verification checklist item
  const handleToggleChecklistItem = (submissionId: string, checkId: string) => {
    setSubmissions((prev) =>
      prev.map((sub) =>
        sub.id === submissionId
          ? {
              ...sub,
              verificationChecklist: sub.verificationChecklist.map((c) =>
                c.id === checkId ? { ...c, verified: !c.verified } : c
              )
            }
          : sub
      )
    );
  };

  // Update reviewer feedback text
  const handleUpdateReviewerFeedback = (submissionId: string, feedback: string) => {
    setSubmissions((prev) =>
      prev.map((sub) =>
        sub.id === submissionId ? { ...sub, reviewerSupervisionFeedback: feedback } : sub
      )
    );
  };

  // Transition submission status (Start Review, Request Revision, Resubmit, or Formally Co-Sign & Lock)
  const handleTransitionStatus = (
    sub: ClinicalSignOffSubmission,
    nextStatus: SignOffApprovalStatus
  ) => {
    if (
      (nextStatus === 'Co-Signed & Locked' ||
        nextStatus === 'Revision Required' ||
        nextStatus === 'Under Clinical Review') &&
      !canCoSignDocuments
    ) {
      triggerBanner(
        'warning',
        `Access Restricted: ${activePractitionerRecord.name} (${activePractitionerRecord.tier}) cannot approve or co-sign clinical drafts. Switch to a Proficient Practitioner (Anitha Haripersad / Zubaida Baher) or Clinical Director.`
      );
      return;
    }

    const nowIso = new Date().toISOString();
    const todayDate = nowIso.split('T')[0];
    const formattedDdMmYy = toIsoDdMmYy(todayDate);

    const actionMap: Record<SignOffApprovalStatus, SignOffAuditTrailEntry['action']> = {
      'Pending Co-Signature': 'Resubmitted Draft',
      'Under Clinical Review': 'Started Review',
      'Revision Required': 'Requested Revision',
      'Co-Signed & Locked': 'Co-Signed & Locked'
    };

    const newTrailEntry: SignOffAuditTrailEntry = {
      id: `aud-${Date.now()}`,
      timestampIso: nowIso,
      dateFormatted: formattedDdMmYy,
      actorName: activePractitionerRecord.name,
      actorTier: activePractitionerRecord.tier,
      action: actionMap[nextStatus],
      notes:
        nextStatus === 'Co-Signed & Locked'
          ? `Formally co-signed and locked by ${activePractitionerRecord.name} (${activePractitionerRecord.tier}).`
          : nextStatus === 'Revision Required'
            ? `Revision requested: ${sub.reviewerSupervisionFeedback}`
            : nextStatus === 'Under Clinical Review'
              ? `Clinical supervision review commenced by ${activePractitionerRecord.name}.`
              : `Revised draft resubmitted by ${activePractitionerRecord.name} for Proficient co-signature.`
    };

    setSubmissions((prev) =>
      prev.map((item) =>
        item.id === sub.id
          ? {
              ...item,
              status: nextStatus,
              coSignedBy:
                nextStatus === 'Co-Signed & Locked' ? activePractitionerRecord.name : item.coSignedBy,
              coSignedRole:
                nextStatus === 'Co-Signed & Locked' ? activePractitionerRecord.tier : item.coSignedRole,
              coSignedAt: nextStatus === 'Co-Signed & Locked' ? todayDate : item.coSignedAt,
              verificationChecklist:
                nextStatus === 'Co-Signed & Locked'
                  ? item.verificationChecklist.map((c) => ({ ...c, verified: true }))
                  : item.verificationChecklist,
              auditTrail: [...item.auditTrail, newTrailEntry]
            }
          : item
      )
    );

    addAuditLog(
      `CLINICAL_SIGNOFF_QUEUE_${nextStatus.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`,
      'caseNotes',
      sub.id,
      `${sub.documentCategory} authored by ${sub.authorName} (${sub.authorTier}) transitioned to "${nextStatus}" by ${activePractitionerRecord.name} (${activePractitionerRecord.tier}).`,
      {
        auditCategory: 'Clinical Case Note',
        ndisPracticeStandard: 'NDIS PBS Capability Framework — Supervision & Co-Signature',
        participantId: sub.clientId,
        participantName: sub.clientName,
        ndisNumber: sub.ndisNumber,
        severity: sub.riskSeverity === 'Critical' ? 'Critical' : sub.riskSeverity === 'High' ? 'High' : 'Medium',
        fieldChanges: [
          {
            field: 'supervisionSignOffStatus',
            label: 'Supervision Sign-Off Status',
            beforeValue: sub.status,
            afterValue: nextStatus
          }
        ]
      }
    );

    if (nextStatus === 'Co-Signed & Locked') {
      addNotification({
        title: `Co-Signed & Locked: ${sub.clientName}`,
        message: `${sub.documentTitle} authored by ${sub.authorName} was formally co-signed by ${activePractitionerRecord.name} (${activePractitionerRecord.tier}).`,
        type: 'clinical',
        severity: 'success'
      });
      triggerBanner(
        'success',
        `Co-Signature Recorded: "${sub.documentTitle}" is now formally Co-Signed & Locked by ${activePractitionerRecord.name} (${activePractitionerRecord.tier}).`
      );
    } else if (nextStatus === 'Revision Required') {
      addNotification({
        title: `Supervision Revision Requested: ${sub.authorName}`,
        message: `${activePractitionerRecord.name} requested revisions on ${sub.documentTitle} for ${sub.clientName}.`,
        type: 'clinical',
        severity: 'medium'
      });
      triggerBanner(
        'warning',
        `Revision Requested: Feedback dispatched to ${sub.authorName} (${sub.authorEmail}) for "${sub.documentTitle}".`
      );
    } else {
      triggerBanner(
        'success',
        `Status Updated: "${sub.documentTitle}" moved to "${nextStatus}".`
      );
    }
  };

  // Submit new draft BSP or high-risk case note into the queue
  const handleCreateDraftSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find((c) => c.id === newSubmissionForm.clientId) || clients[0];
    const authorProfile =
      PRACTITIONER_ROSTER.find((p) => p.name === newSubmissionForm.authorName) ||
      PRACTITIONER_ROSTER[0];
    const reviewerProfile =
      PRACTITIONER_ROSTER.find((p) => p.name === newSubmissionForm.assignedReviewerName) ||
      PRACTITIONER_ROSTER[2];

    const todayStr = new Date().toISOString().split('T')[0];
    const title =
      newSubmissionForm.documentTitle.trim() ||
      `${newSubmissionForm.documentCategory} — ${client?.name || 'Participant'}`;

    const created: ClinicalSignOffSubmission = {
      id: `csq-${Date.now()}`,
      clientId: client?.id || 'cli-01',
      clientName: client?.name || 'Participant',
      ndisNumber: client?.ndisNumber || 'Not stated',
      documentTitle: title,
      documentCategory: newSubmissionForm.documentCategory,
      authorName: authorProfile.name,
      authorEmail: authorProfile.email,
      authorPhone: authorProfile.phone,
      authorTier: authorProfile.tier as 'Entry Practitioner' | 'Core Practitioner',
      assignedReviewerName: reviewerProfile.name,
      assignedReviewerTier: reviewerProfile.tier as 'Proficient Practitioner' | 'Clinical Director',
      submittedDate: todayStr,
      submittedIso: toIsoDdMmYy(todayStr),
      riskSeverity: newSubmissionForm.riskSeverity,
      containsRestrictivePractice: newSubmissionForm.containsRestrictivePractice,
      restrictivePracticeType: newSubmissionForm.containsRestrictivePractice
        ? newSubmissionForm.restrictivePracticeType || 'Regulated Restrictive Practice (Specify in BSP)'
        : undefined,
      status: 'Pending Co-Signature',
      subjectiveParticipantCarerReport:
        newSubmissionForm.subjectiveParticipantCarerReport.trim() || 'Not stated',
      objectivePractitionerObservation:
        newSubmissionForm.objectivePractitionerObservation.trim() || 'Not stated',
      clinicalInterpretationAndStrategies:
        newSubmissionForm.clinicalInterpretationAndStrategies.trim() || 'Not stated',
      reviewerSupervisionFeedback: `Submitted by ${authorProfile.name} (${authorProfile.tier}) for formal co-signature by ${reviewerProfile.name}.`,
      verificationChecklist: [
        {
          id: 'chk-1',
          label: 'Participant/carer subjective report separated from direct practitioner observation',
          verified: false
        },
        {
          id: 'chk-2',
          label: 'Functional replacement behaviour and proactive environmental strategies documented',
          verified: false
        },
        {
          id: 'chk-3',
          label: 'NDIS PBS Capability Framework supervision requirements satisfied',
          verified: false
        }
      ],
      auditTrail: [
        {
          id: `aud-${Date.now()}-1`,
          timestampIso: new Date().toISOString(),
          dateFormatted: toIsoDdMmYy(todayStr),
          actorName: authorProfile.name,
          actorTier: authorProfile.tier,
          action: 'Submitted Draft',
          notes: `Draft ${newSubmissionForm.documentCategory} submitted to ${reviewerProfile.name} for formal co-signature.`
        }
      ]
    };

    setSubmissions((prev) => [created, ...prev]);
    setIsSubmitModalOpen(false);

    addAuditLog(
      'CLINICAL_SIGNOFF_DRAFT_SUBMITTED',
      'caseNotes',
      created.id,
      `${authorProfile.name} (${authorProfile.tier}) submitted ${created.documentCategory} for ${created.clientName} (Assigned Reviewer: ${reviewerProfile.name}).`,
      {
        auditCategory: 'Clinical Case Note',
        ndisPracticeStandard: 'NDIS PBS Capability Framework — Supervision Submission',
        participantId: created.clientId,
        participantName: created.clientName,
        ndisNumber: created.ndisNumber,
        severity: created.riskSeverity === 'Critical' ? 'Critical' : created.riskSeverity === 'High' ? 'High' : 'Medium'
      }
    );

    addNotification({
      title: `Pending Co-Signature: ${created.clientName}`,
      message: `${authorProfile.name} (${authorProfile.tier}) submitted "${created.documentTitle}" for review by ${reviewerProfile.name}.`,
      type: 'clinical',
      severity: 'info'
    });

    triggerBanner(
      'success',
      `Draft Submitted: "${created.documentTitle}" has been queued for formal review and co-signature by ${reviewerProfile.name}.`
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Active Reviewer Role Selector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                NDIS PBS Capability Framework · Supervision Governance
              </span>
              <span className="text-xs font-mono text-slate-400">
                Entry &amp; Core → Proficient / Director Sign-Off
              </span>
            </div>
            {!compactHeader && (
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                <UserCheck className="w-6 h-6 text-teal-400 shrink-0" />
                <span>Clinical Supervision &amp; Co-Signature Queue</span>
              </h2>
            )}
            <p className="text-xs text-slate-400 max-w-3xl">
              Mandatory clinical governance workflow where <strong>Entry Practitioners</strong> (Tania Bobovec) and{' '}
              <strong>Core Practitioners</strong> (Andreja Majcenovic) submit draft Behaviour Support Plans, FBAs, and
              high-risk case notes for formal review and co-signature by <strong>Proficient Practitioners</strong>{' '}
              (Anitha Haripersad, Zubaida Baher) or the <strong>Clinical Director</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Active Practitioner Role Switcher */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2">
              <Award className="w-4 h-4 text-teal-400 shrink-0" />
              <div className="text-[11px]">
                <span className="text-slate-400 block leading-none">Acting Clinician Session:</span>
                <select
                  value={activeStaffIdentity}
                  onChange={(e) => setActiveStaffIdentity(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer mt-0.5"
                >
                  {PRACTITIONER_ROSTER.map((p) => (
                    <option key={p.name} value={p.name} className="bg-slate-900 text-white">
                      {p.name} ({p.tier})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-teal-950/40 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Draft BSP / High-Risk Note</span>
            </button>
          </div>
        </div>

        {/* Practitioner Tier Directory Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800/80 text-[11px]">
          {PRACTITIONER_ROSTER.slice(0, 4).map((prac) => (
            <div
              key={prac.name}
              className={`p-2.5 rounded-xl border flex items-center justify-between ${
                prac.canApprove
                  ? 'bg-teal-950/20 border-teal-500/30 text-teal-200'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300'
              }`}
            >
              <div className="truncate pr-2">
                <div className="font-bold text-white truncate">{prac.name}</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {prac.email} · {prac.phone}
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                  prac.canApprove
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}
              >
                {prac.canApprove ? 'Co-Signer (Proficient)' : prac.tier.replace(' Practitioner', '')}
              </span>
            </div>
          ))}
        </div>

        {bannerNotice && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              bannerNotice.type === 'success'
                ? 'bg-teal-500/15 border-teal-500/30 text-teal-200'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {bannerNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>{bannerNotice.text}</span>
            </div>
            <button onClick={() => setBannerNotice(null)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Status Tracking Dashboard KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-slate-800/90 border-teal-500/50 shadow-md'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Queue Items
            </span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono tabular-nums mt-1.5">
            {statusCounts.total}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">All supervised clinical records</p>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter(statusFilter === 'Pending Co-Signature' ? 'ALL' : 'Pending Co-Signature')
          }
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'Pending Co-Signature'
              ? 'bg-amber-950/40 border-amber-500 shadow-md'
              : 'bg-slate-900/80 border-slate-800 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              Pending Co-Signature
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono tabular-nums mt-1.5">
            {statusCounts.pending}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Awaiting Proficient review</p>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter(statusFilter === 'Under Clinical Review' ? 'ALL' : 'Under Clinical Review')
          }
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'Under Clinical Review'
              ? 'bg-sky-950/40 border-sky-500 shadow-md'
              : 'bg-slate-900/80 border-slate-800 hover:border-sky-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
              Under Clinical Review
            </span>
            <Eye className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-extrabold text-sky-400 font-mono tabular-nums mt-1.5">
            {statusCounts.inReview}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Active supervisor assessment</p>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter(statusFilter === 'Revision Required' ? 'ALL' : 'Revision Required')
          }
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'Revision Required'
              ? 'bg-rose-950/40 border-rose-500 shadow-md'
              : 'bg-slate-900/80 border-slate-800 hover:border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
              Revision Required
            </span>
            <RotateCcw className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400 font-mono tabular-nums mt-1.5">
            {statusCounts.revision}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Returned to Entry/Core author</p>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter(statusFilter === 'Co-Signed & Locked' ? 'ALL' : 'Co-Signed & Locked')
          }
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'Co-Signed & Locked'
              ? 'bg-teal-950/40 border-teal-500 shadow-md'
              : 'bg-slate-900/80 border-slate-800 hover:border-teal-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300">
              Co-Signed &amp; Locked
            </span>
            <Lock className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-extrabold text-teal-400 font-mono tabular-nums mt-1.5">
            {statusCounts.locked}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Audit-ready clinical sign-off</p>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Submitting Author:</span>
            <select
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value as typeof authorFilter)}
              className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Entry &amp; Core Staff</option>
              <option value="Tania Bobovec" className="bg-slate-900">Tania Bobovec (Entry Practitioner)</option>
              <option value="Andreja Majcenovic" className="bg-slate-900">Andreja Majcenovic (Core Practitioner)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
            <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">Document Type:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Clinical Document Types</option>
              <option value="Interim BSP (6-Month)" className="bg-slate-900">Interim BSP (6-Month)</option>
              <option value="Comprehensive BSP (12-Month)" className="bg-slate-900">Comprehensive BSP (12-Month)</option>
              <option value="Functional Behaviour Assessment (FBA)" className="bg-slate-900">Functional Behaviour Assessment (FBA)</option>
              <option value="High-Risk Case Note (SOAP)" className="bg-slate-900">High-Risk Case Note (SOAP)</option>
              <option value="High-Risk Case Note (BIRP)" className="bg-slate-900">High-Risk Case Note (BIRP)</option>
            </select>
          </div>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search participant, NDIS #, or draft..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Submission Cards */}
      <div className="space-y-4">
        {filteredSubmissions.map((sub) => {
          const allChecklistVerified = sub.verificationChecklist.every((c) => c.verified);
          const isHistoryOpen = expandedHistoryId === sub.id;

          const statusBadgeStyle =
            sub.status === 'Co-Signed & Locked'
              ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
              : sub.status === 'Revision Required'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : sub.status === 'Under Clinical Review'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30';

          const stageStep =
            sub.status === 'Pending Co-Signature'
              ? 1
              : sub.status === 'Under Clinical Review' || sub.status === 'Revision Required'
                ? 2
                : 4;

          return (
            <div
              key={sub.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm"
            >
              {/* Top Row: Badges + Title + Status */}
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${statusBadgeStyle}`}>
                      {sub.status}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-semibold">
                      {sub.documentCategory}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        sub.riskSeverity === 'Critical'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : sub.riskSeverity === 'High'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-sky-500/20 text-sky-300'
                      }`}
                    >
                      {sub.riskSeverity} Risk
                    </span>
                    {sub.containsRestrictivePractice && (
                      <span className="px-2.5 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-bold">
                        Regulated RP: {sub.restrictivePracticeType}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white">{sub.documentTitle}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span>
                      Participant: <strong className="text-slate-200">{sub.clientName}</strong> (NDIS #{sub.ndisNumber})
                    </span>
                    <span>
                      Submitted By: <strong className="text-amber-300">{sub.authorName}</strong> ({sub.authorTier})
                    </span>
                    <span>
                      Assigned Co-Signer: <strong className="text-teal-300">{sub.assignedReviewerName}</strong> ({sub.assignedReviewerTier})
                    </span>
                    <span className="font-mono text-[11px]">Submitted: {sub.submittedDate} (ISO {sub.submittedIso})</span>
                  </div>
                </div>

                {/* Co-Signed Stamp if locked */}
                {sub.status === 'Co-Signed & Locked' && (
                  <div className="px-3.5 py-2 rounded-xl bg-teal-950/40 border border-teal-500/40 text-xs text-teal-200 flex items-center gap-2 shrink-0">
                    <Lock className="w-4 h-4 text-teal-400 shrink-0" />
                    <div>
                      <div className="font-bold">Co-Signed by {sub.coSignedBy}</div>
                      <div className="text-[10px] text-teal-400 font-mono">
                        {sub.coSignedRole} · {sub.coSignedAt}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 4-Stage Approval Progress Bar */}
              <div className="grid grid-cols-4 gap-2 pt-1 text-[10px] font-bold uppercase tracking-wider">
                <div
                  className={`p-2 rounded-lg border text-center ${
                    stageStep >= 1
                      ? 'bg-teal-500/15 border-teal-500/40 text-teal-300'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  1. Draft Submitted ({sub.authorTier.split(' ')[0]})
                </div>
                <div
                  className={`p-2 rounded-lg border text-center ${
                    sub.status === 'Revision Required'
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      : stageStep >= 2
                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  {sub.status === 'Revision Required' ? '2. Revision Requested' : '2. Clinical Supervision Review'}
                </div>
                <div
                  className={`p-2 rounded-lg border text-center ${
                    stageStep >= 4
                      ? 'bg-teal-500/15 border-teal-500/40 text-teal-300'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  3. Proficient / Director Co-Signature
                </div>
                <div
                  className={`p-2 rounded-lg border text-center ${
                    stageStep >= 4
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  4. NDIS Audit Trail Locked
                </div>
              </div>

              {/* Evidence Separation Grid: Subjective vs Objective vs Clinical Strategy */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                    Participant / Carer Report (Subjective)
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {sub.subjectiveParticipantCarerReport || 'Not stated'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
                    Practitioner Direct Observation (Objective)
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {sub.objectivePractitionerObservation || 'Not stated'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 block">
                    Clinical Interpretation &amp; PBS Strategy
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {sub.clinicalInterpretationAndStrategies || 'Not stated'}
                  </p>
                </div>
              </div>

              {/* Supervision Verification Checklist & Reviewer Notes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-teal-400" />
                      <span>Proficient Supervision Quality Checklist</span>
                    </span>
                    <span className="text-[11px] font-mono text-teal-400 font-bold">
                      {sub.verificationChecklist.filter((c) => c.verified).length}/{sub.verificationChecklist.length} Verified
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {sub.verificationChecklist.map((chk) => (
                      <label
                        key={chk.id}
                        className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white"
                      >
                        <input
                          type="checkbox"
                          disabled={sub.status === 'Co-Signed & Locked'}
                          checked={chk.verified}
                          onChange={() => handleToggleChecklistItem(sub.id, chk.id)}
                          className="rounded border-slate-600 text-teal-500 focus:ring-teal-500"
                        />
                        <span className={chk.verified ? 'text-slate-400 line-through' : 'text-slate-200'}>
                          {chk.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">
                    Supervision Review Notes &amp; Co-Signature Rationale
                  </label>
                  <textarea
                    rows={3}
                    disabled={sub.status === 'Co-Signed & Locked'}
                    value={sub.reviewerSupervisionFeedback}
                    onChange={(e) => handleUpdateReviewerFeedback(sub.id, e.target.value)}
                    placeholder="Enter clinical supervision feedback, required amendments, or co-signature rationale..."
                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setExpandedHistoryId(isHistoryOpen ? null : sub.id)}
                  className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    {isHistoryOpen ? 'Hide' : 'View'} Co-Signature Audit Trail ({sub.auditTrail.length} events)
                  </span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {sub.status === 'Revision Required' && (
                    <button
                      type="button"
                      onClick={() => handleTransitionStatus(sub, 'Pending Co-Signature')}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Resubmit Revised Draft for Co-Signature</span>
                    </button>
                  )}

                  {sub.status !== 'Co-Signed & Locked' && (
                    <>
                      {sub.status === 'Pending Co-Signature' && (
                        <button
                          type="button"
                          onClick={() => handleTransitionStatus(sub, 'Under Clinical Review')}
                          className="px-3.5 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Mark Under Clinical Review</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleTransitionStatus(sub, 'Revision Required')}
                        className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Request Author Revision</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTransitionStatus(sub, 'Co-Signed & Locked')}
                        className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-950/50 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          Co-Sign &amp; Lock ({activePractitionerRecord.name.split(' ')[0]})
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Expandable Audit Trail Log */}
              {isHistoryOpen && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                    Immutable Supervision &amp; Co-Signature Audit History
                  </div>
                  <div className="space-y-1.5">
                    {sub.auditTrail.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1.5 border-b border-slate-900 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-teal-300 font-mono text-[10px] font-bold">
                            {entry.dateFormatted}
                          </span>
                          <span className="font-bold text-white">{entry.actorName}</span>
                          <span className="text-slate-400">({entry.actorTier})</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="font-semibold text-indigo-300">{entry.action}</span>
                        </div>
                        <span className="text-slate-400 text-[11px]">{entry.notes}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Submit New Draft BSP or High-Risk Case Note for Co-Signature */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                  Entry &amp; Core Practitioner Supervision Submission
                </span>
                <h3 className="text-base font-bold text-white">
                  Submit Draft BSP or High-Risk Case Note for Proficient Co-Signature
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDraftSubmission} className="space-y-3.5 text-xs">
              {/* Optional Quick-Fill from Existing Case Note */}
              {caseNotes.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <label className="text-slate-300 font-semibold block">
                    Optional: Pre-fill from Logged Participant Case Note
                  </label>
                  <select
                    value={newSubmissionForm.sourceCaseNoteId}
                    onChange={(e) => handleSelectExistingCaseNote(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="">— Write new draft BSP / FBA / Case Note below —</option>
                    {caseNotes.slice(0, 15).map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.date} · {n.clientName} ({n.format}) — {n.practitionerName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Participant</label>
                  <select
                    value={newSubmissionForm.clientId}
                    onChange={(e) => setNewSubmissionForm((prev) => ({ ...prev, clientId: e.target.value }))}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (NDIS #{c.ndisNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Clinical Document Type</label>
                  <select
                    value={newSubmissionForm.documentCategory}
                    onChange={(e) =>
                      setNewSubmissionForm((prev) => ({
                        ...prev,
                        documentCategory: e.target.value as SignOffDocumentCategory
                      }))
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="Interim BSP (6-Month)">Interim BSP (6-Month)</option>
                    <option value="Comprehensive BSP (12-Month)">Comprehensive BSP (12-Month)</option>
                    <option value="Functional Behaviour Assessment (FBA)">Functional Behaviour Assessment (FBA)</option>
                    <option value="High-Risk Case Note (SOAP)">High-Risk Case Note (SOAP)</option>
                    <option value="High-Risk Case Note (BIRP)">High-Risk Case Note (BIRP)</option>
                    <option value="Incident Debrief & Risk Note">Incident Debrief &amp; Risk Note</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Submitting Author (Entry/Core)</label>
                  <select
                    value={newSubmissionForm.authorName}
                    onChange={(e) =>
                      setNewSubmissionForm((prev) => ({
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
                  <label className="text-slate-300 font-semibold block">Assigned Co-Signer</label>
                  <select
                    value={newSubmissionForm.assignedReviewerName}
                    onChange={(e) =>
                      setNewSubmissionForm((prev) => ({
                        ...prev,
                        assignedReviewerName: e.target.value as
                          | 'Anitha Haripersad'
                          | 'Zubaida Baher'
                          | 'Shivandhari Persad'
                      }))
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="Anitha Haripersad">Anitha Haripersad (Proficient)</option>
                    <option value="Zubaida Baher">Zubaida Baher (Proficient)</option>
                    <option value="Shivandhari Persad">Shivandhari Persad (Clinical Director)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Clinical Risk Level</label>
                  <select
                    value={newSubmissionForm.riskSeverity}
                    onChange={(e) =>
                      setNewSubmissionForm((prev) => ({
                        ...prev,
                        riskSeverity: e.target.value as 'Medium' | 'High' | 'Critical'
                      }))
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="High">High Risk</option>
                    <option value="Critical">Critical Risk</option>
                    <option value="Medium">Medium Risk</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Document Title</label>
                <input
                  type="text"
                  value={newSubmissionForm.documentTitle}
                  onChange={(e) => setNewSubmissionForm((prev) => ({ ...prev, documentTitle: e.target.value }))}
                  placeholder="e.g., Interim Behaviour Support Plan — Auditory Transition Protocol"
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-slate-200 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSubmissionForm.containsRestrictivePractice}
                    onChange={(e) =>
                      setNewSubmissionForm((prev) => ({
                        ...prev,
                        containsRestrictivePractice: e.target.checked
                      }))
                    }
                    className="rounded border-slate-600 text-teal-500"
                  />
                  <span>Contains Regulated Restrictive Practice (Requires Dual BSP + APO Sign-Off)</span>
                </label>
                {newSubmissionForm.containsRestrictivePractice && (
                  <input
                    type="text"
                    value={newSubmissionForm.restrictivePracticeType}
                    onChange={(e) =>
                      setNewSubmissionForm((prev) => ({ ...prev, restrictivePracticeType: e.target.value }))
                    }
                    placeholder="Specify RP type (e.g., Environmental Keypad)"
                    className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs sm:w-64"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-amber-300 font-semibold block">
                  1. Participant / Carer Report (Subjective — Keep distinct from direct observation)
                </label>
                <textarea
                  rows={2}
                  required
                  value={newSubmissionForm.subjectiveParticipantCarerReport}
                  onChange={(e) =>
                    setNewSubmissionForm((prev) => ({
                      ...prev,
                      subjectiveParticipantCarerReport: e.target.value
                    }))
                  }
                  placeholder="State what the participant, family member, or support worker reported (or 'Not stated')..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sky-300 font-semibold block">
                  2. Practitioner Direct Observation (Objective — Factual session data)
                </label>
                <textarea
                  rows={2}
                  required
                  value={newSubmissionForm.objectivePractitionerObservation}
                  onChange={(e) =>
                    setNewSubmissionForm((prev) => ({
                      ...prev,
                      objectivePractitionerObservation: e.target.value
                    }))
                  }
                  placeholder="Record observable behaviours, ABC data counts, duration, and environmental antecedents..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-teal-300 font-semibold block">
                  3. Clinical Interpretation, Replacement Skill &amp; Least-Restrictive Strategy
                </label>
                <textarea
                  rows={2}
                  required
                  value={newSubmissionForm.clinicalInterpretationAndStrategies}
                  onChange={(e) =>
                    setNewSubmissionForm((prev) => ({
                      ...prev,
                      clinicalInterpretationAndStrategies: e.target.value
                    }))
                  }
                  placeholder="Formulate functional hypothesis, proactive strategies, and fade-out criteria..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit to Proficient Co-Signature Queue</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
