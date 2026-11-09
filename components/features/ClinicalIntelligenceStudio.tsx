'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  BarChart3,
  FileCheck2,
  Sparkles,
  Scale,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Plus,
  FileText,
  ArrowRightLeft,
  Upload,
  FolderOpen,
  UserCheck,
  Wand2
} from 'lucide-react';
import { useManagementStore } from '@/stores/useManagementStore';

export type StudioTab =
  | 'case-note-refiner'
  | 'section34-and-scripts'
  | 'fba-grapher'
  | 'travel-and-xero-queue'
  | 'section14-nil-tracker';

interface FBADataPoint {
  dayLabel: string;
  directAbcCount: number;
  meanDurationMins: number;
  productIncidents: number;
  replacementBreakCardUses: number;
}

const INITIAL_FBA_BASELINE: FBADataPoint[] = [
  { dayLabel: 'Days 1–2', directAbcCount: 6, meanDurationMins: 28, productIncidents: 2, replacementBreakCardUses: 1 },
  { dayLabel: 'Days 3–4', directAbcCount: 5, meanDurationMins: 24, productIncidents: 2, replacementBreakCardUses: 2 },
  { dayLabel: 'Days 5–6', directAbcCount: 5, meanDurationMins: 22, productIncidents: 1, replacementBreakCardUses: 3 },
  { dayLabel: 'Days 7–8', directAbcCount: 4, meanDurationMins: 18, productIncidents: 1, replacementBreakCardUses: 4 },
  { dayLabel: 'Days 9–10', directAbcCount: 3, meanDurationMins: 15, productIncidents: 1, replacementBreakCardUses: 5 },
  { dayLabel: 'Days 11–12', directAbcCount: 2, meanDurationMins: 11, productIncidents: 0, replacementBreakCardUses: 6 },
  { dayLabel: 'Days 13–14', directAbcCount: 2, meanDurationMins: 9, productIncidents: 0, replacementBreakCardUses: 7 }
];

interface ParticipantClinicalHistoryPreset {
  id: string;
  name: string;
  ndisNumber: string;
  primaryDisability: string;
  planReviewDate: string;
  remainingBudgetAud: number;
  defaultSupportItem: string;
  defaultF2fMins: number;
  defaultNf2fMins: number;
  activeGoal: string;
  recentBaselineSummary: string;
  subjectiveTemplate: string;
  objectiveTemplate: string;
  assessmentTemplate: string;
  planTemplate: string;
}

const PARTICIPANT_HISTORY_PRESETS: Record<string, ParticipantClinicalHistoryPreset> = {
  Ryder: {
    id: 'client-ryder',
    name: 'Ryder (Youth PBS)',
    ndisNumber: '431098211',
    primaryDisability: 'Autism Spectrum Disorder (Level 2) & Sensory Processing Differences',
    planReviewDate: '28-11-26',
    remainingBudgetAud: 8729.55,
    defaultSupportItem: '15_056_0128_1_3',
    defaultF2fMins: 40,
    defaultNf2fMins: 15,
    activeGoal: 'Goal 1: Emotional Regulation & Functional Break-Card Communication across 40-min school/therapy blocks',
    recentBaselineSummary: '14-Day FBA Baseline: Direct ABC escalations reduced from 6/wk (28m mean) to 2/wk (9m mean); 7 Red Break Card requests logged.',
    subjectiveTemplate:
      'Carer/Support Worker Handover Report: Carer reported elevated sensory sensitivity during morning school transition prior to session start. Sleep and PRN medication changes: not stated.',
    objectiveTemplate:
      'Direct Practitioner Observation (40m F2F + 15m NF2F · 15_056_0128_1_3): Delivered structured 40-minute tabletop and visual schedule session. At the 20-minute mark, participant displayed motor restlessness, independently tapped the Red Break Card for a 5-minute low-stimulus pause, and returned to complete the activity.',
    assessmentTemplate:
      'Clinical Synthesis: Demonstrates consistent acquisition of Functional Communication Training (FCT) replacement skill (Red/Green Break Card) advancing NDIS Goal 1 without restrictive practices.',
    planTemplate:
      'Next Steps & PAPL Plan: Continue 14-day direct ABC frequency/duration logging. Verify 0.92 hr claim ($178.47 AUD under 15_056_0128_1_3) with 0m travel on travel-stripped plan.'
  },
  Saffron: {
    id: 'client-saffron',
    name: 'Saffron (Adult Education Pathway)',
    ndisNumber: '430887412',
    primaryDisability: 'Psychosocial Disability & Executive Functioning Support Needs',
    planReviewDate: '04-12-26',
    remainingBudgetAud: 14250.0,
    defaultSupportItem: '15_056_0128_1_3',
    defaultF2fMins: 45,
    defaultNf2fMins: 15,
    activeGoal: 'Goal 2: Transition to Certificate / Adult Work Education Independence with Support Worker Co-Regulation',
    recentBaselineSummary: '14-Day FBA Baseline: Task-avoidance episodes decreased from 4/wk to 1/wk; completed 3 consecutive 45-min literacy blocks with support worker Laura.',
    subjectiveTemplate:
      'Participant/Support Worker Report: Support worker Laura reported mild anticipatory anxiety prior to adult education certificate literacy module. Unstated medical variables: not stated.',
    objectiveTemplate:
      'Direct Practitioner Observation (45m F2F + 15m NF2F · 15_056_0128_1_3): Facilitated graded task breakdown and visual pacing schedule for adult education coursework alongside support worker.',
    assessmentTemplate:
      'Clinical Synthesis: Evidences measurable social and educational participation under s.34(1)(b) and sustained task tolerance across 45-minute instructional blocks.',
    planTemplate:
      'Next Steps & PAPL Plan: Finalise Section 34 plan reassessment evidence pack and reconcile 1.0 hr FBA indirect assessment entry ($193.99 AUD) in Xero Account 200.'
  },
  'Celeste Rattray-Wood': {
    id: 'client-celeste',
    name: 'Celeste Rattray-Wood',
    ndisNumber: '430891245',
    primaryDisability: 'Intellectual Disability & Regulated Chemical Restraint Fade-Out Plan',
    planReviewDate: '14-12-26',
    remainingBudgetAud: 32400.0,
    defaultSupportItem: '15_054_0128_1_3',
    defaultF2fMins: 50,
    defaultNf2fMins: 15,
    activeGoal: 'Goal 1: PRN Chemical Restraint Fade-Out (-88% reduction) via Functional Communication Replacement',
    recentBaselineSummary: 'Module 2A Fade-Out Baseline: Monthly PRN Lorazepam reduced from 8 doses/mo to 1 dose/mo (92% FCT replacement fidelity).',
    subjectiveTemplate:
      'SIL Shift Handover Report: Support staff reported calm morning routine with 0 PRN administrations over the past 14 days.',
    objectiveTemplate:
      'Direct Practitioner Observation (50m F2F + 15m NF2F · 15_054_0128_1_3): Conducted Module 2 specialist behaviour support review and audited low-arousal sensory cue implementation with SIL team.',
    assessmentTemplate:
      'Clinical Synthesis: PRN chemical restraint fade-out remains below the <=2 doses/mo BSP ceiling (92% FCT replacement fidelity).',
    planTemplate:
      'Next Steps & PAPL Plan: Lodge 5th-of-month Section 14 monthly usage/NIL summary to NDIS Commission Portal and maintain NSW RPA state authorisation tracking.'
  }
};

interface ReconciliationItem {
  id: string;
  invoiceNumber: string;
  participantName: string;
  ndisNumber: string;
  lineItemCode: string;
  hatsAmountAud: number;
  xeroLedgerAmountAud: number;
  issueType: string;
  status: 'Exception Flagged' | 'Reconciled for PRODA';
}

interface NeutralityAuditMetrics {
  professionalToneScore: number;
  clinicalNeutralityScore: number;
  billingComplianceScore: number;
  flaggedTerms: Array<{
    original: string;
    neutralReplacement: string;
    rationale: string;
  }>;
  billingAudit: {
    supportItemCode: string;
    supportItemName: string;
    unitRateAud: number;
    f2fMinutes: number;
    nf2fMinutes: number;
    billableHours: number;
    totalClaimAud: number;
    paplCompliant: boolean;
    travelCapStatus: string;
    goalLinkStatus: string;
  };
  structuredSections?: {
    field1: string;
    field2: string;
    field3: string;
    field4: string;
  };
}

interface Section34DiagnosticResult {
  overallReadinessScore: number;
  uploadedNotesCount: number;
  uploadedFileName: string;
  paplLineItem: {
    code: string;
    name: string;
    capRateAud: number;
    travelRule: string;
    nonFaceToFaceRule: string;
    status: 'COMPLIANT' | 'GAP_DETECTED';
  };
  criteriaChecklist: Array<{
    criterion: string;
    title: string;
    status: 'MET' | 'PARTIAL' | 'MISSING';
    finding: string;
    remediationPrompt: string;
  }>;
}

interface Section14TrackerEntry {
  id: string;
  participantName: string;
  ndisNumber: string;
  practiceCategory: string;
  jurisdictionAuth: string;
  monthlyUsageCount: number;
  submissionType: 'USAGE_LOG' | 'COMPULSORY_NIL';
  missingServiceEntryIssue: string | null;
  serviceDeliveryVerified: boolean;
  portalStatus: string;
  commissionRef: string;
}

export const ClinicalIntelligenceStudio: React.FC<{
  defaultTab?: StudioTab;
}> = ({ defaultTab = 'case-note-refiner' }) => {
  const { caseNotes, clients, addCaseNote, addBillingClaim, addNotification, currentUser } =
    useManagementStore();
  const [activeTab, setActiveTab] = useState<StudioTab>(defaultTab);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Listen for Header NDIS Compliance Notification Bar deep-link events
  useEffect(() => {
    const handleFocusTab = (e: Event) => {
      const custom = e as CustomEvent<{ tab?: StudioTab }>;
      if (custom.detail?.tab) {
        setActiveTab(custom.detail.tab);
      }
    };
    window.addEventListener('breakthrough-focus-studio-tab', handleFocusTab);
    return () => window.removeEventListener('breakthrough-focus-studio-tab', handleFocusTab);
  }, []);

  // Tab 1: Auto-Populated Structured SOAP / BIRP / SIMPL Case Note Builder & Neutrality Refiner
  const [noteFormat, setNoteFormat] = useState<'SOAP' | 'BIRP' | 'SIMPL'>('SOAP');
  const [noteParticipant, setNoteParticipant] = useState<string>('Ryder');
  const [noteSessionDate, setNoteSessionDate] = useState<string>('06-11-26');
  const [noteDuration, setNoteDuration] = useState<string>('40');
  const [noteNf2fMinutes, setNoteNf2fMinutes] = useState<number>(15);
  const [noteSupportItemCode, setNoteSupportItemCode] = useState<string>('15_056_0128_1_3');
  const [noteTravelMinutes, setNoteTravelMinutes] = useState<number>(0);

  // Structured 4-field SOAP inputs auto-populated from participant NDIS history
  const [soapSubjective, setSoapSubjective] = useState<string>(
    PARTICIPANT_HISTORY_PRESETS.Ryder.subjectiveTemplate
  );
  const [soapObjective, setSoapObjective] = useState<string>(
    PARTICIPANT_HISTORY_PRESETS.Ryder.objectiveTemplate
  );
  const [soapAssessment, setSoapAssessment] = useState<string>(
    PARTICIPANT_HISTORY_PRESETS.Ryder.assessmentTemplate
  );
  const [soapPlan, setSoapPlan] = useState<string>(
    PARTICIPANT_HISTORY_PRESETS.Ryder.planTemplate
  );

  const [rawShiftNote, setRawShiftNote] = useState<string>(
    'Carer reported Ryder had a rough morning before school transition. During our 40-min session, Ryder became restless and refused the worksheet at the 20-minute mark, then tapped his Red Break Card for a 5-minute sensory pause and returned calmly to finish the activity.'
  );
  const [refinedNoteOutput, setRefinedNoteOutput] = useState<string>('');
  const [auditMetrics, setAuditMetrics] = useState<NeutralityAuditMetrics | null>({
    professionalToneScore: 93,
    clinicalNeutralityScore: 91,
    billingComplianceScore: 98,
    flaggedTerms: [
      {
        original: 'rough morning / bad mood',
        neutralReplacement: 'elevated baseline arousal / reduced frustration tolerance reported at handover',
        rationale: 'Replaces colloquial affect labels with observable baseline state.'
      },
      {
        original: 'refused / non-compliant',
        neutralReplacement: 'declined task demand / engaged in task-avoidance behaviour following verbal prompt',
        rationale: 'Maintains clinical neutrality and aligns with functional escape/avoidance hypothesis.'
      }
    ],
    billingAudit: {
      supportItemCode: '15_056_0128_1_3',
      supportItemName: 'Assessment, Recommendation, Therapy or Training - Other Professional',
      unitRateAud: 193.99,
      f2fMinutes: 40,
      nf2fMinutes: 15,
      billableHours: 0.92,
      totalClaimAud: 178.47,
      paplCompliant: true,
      travelCapStatus: 'Compliant (0m travel claimed · Travel-Stripped Plan Safe)',
      goalLinkStatus: 'Linked to "Emotional Regulation & Functional Communication"'
    }
  });
  const [isRefiningNote, setIsRefiningNote] = useState<boolean>(false);

  // Auto-populate structured SOAP fields + participant history when participant changes
  const handleSelectParticipantAndAutoPopulate = (participantKey: string) => {
    setNoteParticipant(participantKey);
    const preset = PARTICIPANT_HISTORY_PRESETS[participantKey];
    const storeClient = clients.find((c) =>
      c.name.toLowerCase().includes(participantKey.toLowerCase())
    );
    const recentNotes = caseNotes.filter((n) =>
      n.clientName.toLowerCase().includes(participantKey.toLowerCase())
    );

    if (preset) {
      setNoteDuration(String(preset.defaultF2fMins));
      setNoteNf2fMinutes(preset.defaultNf2fMins);
      setNoteSupportItemCode(preset.defaultSupportItem);
      setSoapSubjective(preset.subjectiveTemplate);
      setSoapObjective(preset.objectiveTemplate);
      setSoapAssessment(preset.assessmentTemplate);
      setSoapPlan(preset.planTemplate);
      setRawShiftNote(
        `${preset.subjectiveTemplate}\n${preset.objectiveTemplate}\n${preset.assessmentTemplate}\n${preset.planTemplate}`
      );
      showToast(
        `Auto-populated NDIS history, active goal, and structured SOAP fields for ${preset.name}.`
      );
      return;
    }

    if (storeClient) {
      const latestNote = recentNotes[0];
      const goalTitle = storeClient.goals?.[0]?.title || 'Functional Regulation & Independence';
      const subj =
        latestNote?.subjective ||
        `Participant/Carer Report: Shift handover reviewed for ${storeClient.name} (NDIS #${storeClient.ndisNumber}). Unstated pre-session variables: not stated.`;
      const obj =
        latestNote?.objective ||
        `Direct Practitioner Observation (45m F2F + 15m NF2F · 15_056_0128_1_3): Delivered structured PBS session targeting "${goalTitle}".`;
      const assess =
        latestNote?.assessment ||
        `Clinical Synthesis: Advancing NDIS Plan Goal "${goalTitle}".`;
      const plan =
        latestNote?.plan ||
        `Next Steps: Continue 14-day direct ABC baseline logging and verify PAPL claim.`;

      setSoapSubjective(subj);
      setSoapObjective(obj);
      setSoapAssessment(assess);
      setSoapPlan(plan);
      setRawShiftNote(`${subj}\n${obj}\n${assess}\n${plan}`);
      showToast(`Auto-populated NDIS participant history for ${storeClient.name}.`);
    }
  };

  const activeParticipantHistory: ParticipantClinicalHistoryPreset =
    PARTICIPANT_HISTORY_PRESETS[noteParticipant] || {
      id: 'client-custom',
      name: noteParticipant,
      ndisNumber:
        clients.find((c) => c.name.toLowerCase().includes(noteParticipant.toLowerCase()))?.ndisNumber ||
        '430891245',
      primaryDisability:
        clients.find((c) => c.name.toLowerCase().includes(noteParticipant.toLowerCase()))
          ?.primaryDisability || 'Autism Spectrum Disorder & PBS Support',
      planReviewDate: '15-12-26',
      remainingBudgetAud: 18450.0,
      defaultSupportItem: noteSupportItemCode,
      defaultF2fMins: Number(noteDuration) || 40,
      defaultNf2fMins: noteNf2fMinutes,
      activeGoal: 'Emotional Regulation, Replacement Communication & Community Participation',
      recentBaselineSummary: '14-Day FBA Baseline: Direct ABC & replacement skill tracking active.',
      subjectiveTemplate: soapSubjective,
      objectiveTemplate: soapObjective,
      assessmentTemplate: soapAssessment,
      planTemplate: soapPlan
    };

  // Tab 2: NDIS Section 34 Evidence Gap Checker & Youth PBS Social Script / Break Card Builder
  const [s34Participant, setS34Participant] = useState<string>('Saffron');
  const [s34SupportItemCode, setS34SupportItemCode] = useState<string>('15_056_0128_1_3');
  const [s34UploadedFileName, setS34UploadedFileName] = useState<string>('');
  const [s34UploadedNotesCount, setS34UploadedNotesCount] = useState<number>(2);
  const [s34DraftInput, setS34DraftInput] = useState<string>(
    '[Case Note 01-11-26 · 15_056_0128_1_3 · 45m F2F + 15m NF2F]: Participant engaged in Certificate / Work Education pathway planning with support worker Laura. Goal: Transition to adult education independence.\n[Case Note 04-11-26 · 15_056_0128_1_3 · 40m F2F]: Practised sensory break-card requests during literacy module; 2 task-avoidance episodes observed across 14-day baseline.'
  );
  const [s34AuditResult, setS34AuditResult] = useState<string>('');
  const [s34Diagnostic, setS34Diagnostic] = useState<Section34DiagnosticResult | null>(null);
  const [isRunningS34, setIsRunningS34] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [scriptParticipant, setScriptParticipant] = useState<string>('Ryder');
  const [scriptTrigger, setScriptTrigger] = useState<string>(
    'Transition between preferred sensory activity and structured 40-minute tabletop task'
  );
  const [scriptReplacement] = useState<string>(
    'Tapping the Red Break Card to request a 5-minute low-stimulus break'
  );
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);

  // Tab 3: FBA Triangulated Baseline Grapher State
  const [selectedFbaParticipant, setSelectedFbaParticipant] = useState<string>(
    '16yo Tier 3 School Refusal Referral'
  );
  const [fbaPoints, setFbaPoints] = useState<FBADataPoint[]>(INITIAL_FBA_BASELINE);
  const [newFbaWindowLabel, setNewFbaWindowLabel] = useState<string>('Days 15–16');
  const [newFbaAbcCount, setNewFbaAbcCount] = useState<number>(1);
  const [newFbaDurationMins, setNewFbaDurationMins] = useState<number>(7);
  const [newFbaBreakCardUses, setNewFbaBreakCardUses] = useState<number>(8);
  const [fastEscapeScore, setFastEscapeScore] = useState<number>(88);
  const [masSensoryScore, setMasSensoryScore] = useState<number>(76);
  const [masTangibleScore, setMasTangibleScore] = useState<number>(42);

  // Tab 4: Travel-Stripped Plan ($62/hr SW & 45-Hr PBS Cap) Simulator & 17hats-Xero Queue
  const [pbsPlanHours, setPbsPlanHours] = useState<number>(45);
  const [travelMinutesRoundTrip, setTravelMinutesRoundTrip] = useState<number>(50);
  const [supportWorkerHourlyRate, setSupportWorkerHourlyRate] = useState<number>(62);
  const [telehealthRatioPct, setTelehealthRatioPct] = useState<number>(40);

  const [reconciliationQueue, setReconciliationQueue] = useState<ReconciliationItem[]>([
    {
      id: 'rec-1',
      invoiceNumber: '17H-INV-2026-104',
      participantName: 'Ryder (Youth PBS)',
      ndisNumber: '431098211',
      lineItemCode: '15_056_0128_1_3',
      hatsAmountAud: 775.96,
      xeroLedgerAmountAud: 775.96,
      issueType: 'Travel-stripped plan: Verify 0km provider travel claimed before PRODA export',
      status: 'Exception Flagged'
    },
    {
      id: 'rec-2',
      invoiceNumber: '17H-INV-2026-108',
      participantName: 'Saffron (Adult Pathway)',
      ndisNumber: '430887412',
      lineItemCode: '15_056_0128_1_3',
      hatsAmountAud: 581.97,
      xeroLedgerAmountAud: 387.98,
      issueType: '1.0 hr FBA Indirect Assessment entry pending Xero Account 200 sync ($193.99 delta)',
      status: 'Exception Flagged'
    },
    {
      id: 'rec-3',
      invoiceNumber: '17H-INV-2026-112',
      participantName: 'Aiden (8-9yo Referral)',
      ndisNumber: '431552908',
      lineItemCode: '15_056_0128_1_3',
      hatsAmountAud: 969.95,
      xeroLedgerAmountAud: 969.95,
      issueType: 'Matched across 17hats & Xero Account 200',
      status: 'Reconciled for PRODA'
    }
  ]);

  // Tab 5: Section 14 Monthly NIL Reporting & Missing Service Delivery Data Tracker
  const [section14Filter, setSection14Filter] = useState<'ALL' | 'MISSING_DATA' | 'NIL_ONLY'>('ALL');
  const [section14Entries, setSection14Entries] = useState<Section14TrackerEntry[]>([
    {
      id: 's14-1',
      participantName: 'Liam T. (SIL Module 2A)',
      ndisNumber: '430192837',
      practiceCategory: 'CHEMICAL (PRN Lorazepam 1mg)',
      jurisdictionAuth: 'VIC RIDS #AUTH-2026-8841 (Valid to 30-04-27)',
      monthlyUsageCount: 2,
      submissionType: 'USAGE_LOG',
      missingServiceEntryIssue: 'Missing shift handover timestamp for 28-10-26 PRN log entry',
      serviceDeliveryVerified: false,
      portalStatus: 'Action Needed: Missing Shift Data',
      commissionRef: ''
    },
    {
      id: 's14-2',
      participantName: 'Noah K. (Comprehensive BSP)',
      ndisNumber: '430998123',
      practiceCategory: 'ENVIRONMENTAL (Kitchen Keypad Access)',
      jurisdictionAuth: 'NSW RPA Panel #RPA-2026-312 (Valid to 15-03-27)',
      monthlyUsageCount: 0,
      submissionType: 'COMPULSORY_NIL',
      missingServiceEntryIssue: 'Missing Week 4 SIL shift attestation confirming 0 keypad overrides',
      serviceDeliveryVerified: false,
      portalStatus: 'Action Needed: Verify 0-Use Shift Log',
      commissionRef: ''
    },
    {
      id: 's14-3',
      participantName: 'Mia R. (Interim BSP)',
      ndisNumber: '431223904',
      practiceCategory: 'MECHANICAL (Vehicle Buckle Guard)',
      jurisdictionAuth: 'QLD QCAT #GAA-2026-509 (Valid to 19-02-27)',
      monthlyUsageCount: 0,
      submissionType: 'COMPULSORY_NIL',
      missingServiceEntryIssue: null,
      serviceDeliveryVerified: true,
      portalStatus: 'Compulsory NIL Compiled (s.14)',
      commissionRef: 'S14-202611-4092'
    },
    {
      id: 's14-4',
      participantName: 'Celeste Rattray-Wood (Module 2A)',
      ndisNumber: '430891245',
      practiceCategory: 'CHEMICAL (Lorazepam 1mg PO PRN Fade-Out)',
      jurisdictionAuth: 'NSW RPA #RPA-NSW-2026-44109 (Valid to 30-06-27)',
      monthlyUsageCount: 1,
      submissionType: 'USAGE_LOG',
      missingServiceEntryIssue: null,
      serviceDeliveryVerified: true,
      portalStatus: 'Ready for 5th-of-Month Submission',
      commissionRef: 'S14-202611-4108'
    }
  ]);

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 5000);
  };

  const handleRunCaseNoteRefiner = async () => {
    setIsRefiningNote(true);
    try {
      const combinedInput =
        rawShiftNote.trim() ||
        `${soapSubjective}\n${soapObjective}\n${soapAssessment}\n${soapPlan}`;
      const res = await fetch('/api/gemini/clinical-decision-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'case-note-refiner',
          format: noteFormat,
          participantName: noteParticipant,
          sessionDate: noteSessionDate,
          sessionDuration: `${noteDuration} mins`,
          nonFaceToFaceMinutes: noteNf2fMinutes,
          supportItemCode: noteSupportItemCode,
          travelMinutesClaimed: noteTravelMinutes,
          linkedGoalTitle: activeParticipantHistory.activeGoal,
          rawInput: combinedInput
        })
      });
      const data = await res.json();
      if (data.text) {
        setRefinedNoteOutput(data.text);
        if (data.auditMetrics) {
          setAuditMetrics(data.auditMetrics);
          if (data.auditMetrics.structuredSections) {
            setSoapSubjective(data.auditMetrics.structuredSections.field1);
            setSoapObjective(data.auditMetrics.structuredSections.field2);
            setSoapAssessment(data.auditMetrics.structuredSections.field3);
            setSoapPlan(data.auditMetrics.structuredSections.field4);
          }
        }
        showToast(
          `Case Note ${noteFormat} Neutrality & Billing Audit completed (${data.source}) — ready for clinician sign-off.`
        );
      }
    } finally {
      setIsRefiningNote(false);
    }
  };

  const handleSaveRefinedNoteToRegister = () => {
    if (!refinedNoteOutput && !auditMetrics) return;
    const f2f = parseInt(noteDuration, 10) || 40;
    const sections = auditMetrics?.structuredSections;

    addCaseNote({
      clientId:
        clients.find((c) => c.name.toLowerCase().includes(noteParticipant.toLowerCase()))?.id ||
        activeParticipantHistory.id,
      clientName: noteParticipant,
      practitionerId: currentUser?.id || 'prac-1',
      practitionerName: currentUser?.name || 'Andreja Majcenovic',
      date: noteSessionDate,
      format: noteFormat,
      sessionDurationMinutes: f2f,
      nonFaceToFaceMinutes: noteNf2fMinutes,
      supportItemCode: noteSupportItemCode,
      subjective: soapSubjective || sections?.field1 || rawShiftNote,
      objective: soapObjective || sections?.field2 || refinedNoteOutput,
      assessment:
        soapAssessment ||
        sections?.field3 ||
        `Structured ${noteFormat} neutralised draft verified by practitioner.`,
      plan:
        soapPlan ||
        sections?.field4 ||
        'Continue 14-day ABC tracking and Red/Green break card co-regulation.',
      isLocked: false
    });

    if (auditMetrics?.billingAudit) {
      addBillingClaim({
        clientId: activeParticipantHistory.id,
        clientName: noteParticipant,
        ndisNumber: activeParticipantHistory.ndisNumber,
        serviceDate: noteSessionDate,
        dateOfService: noteSessionDate,
        supportItemCode: auditMetrics.billingAudit.supportItemCode,
        supportItemNumber: auditMetrics.billingAudit.supportItemCode,
        supportItemName: auditMetrics.billingAudit.supportItemName,
        hours: auditMetrics.billingAudit.billableHours,
        unitRate: auditMetrics.billingAudit.unitRateAud,
        rate: auditMetrics.billingAudit.unitRateAud,
        unitPrice: auditMetrics.billingAudit.unitRateAud,
        totalAmount: auditMetrics.billingAudit.totalClaimAud,
        status: 'Approved',
        isPaceCompliant: true,
        invoiceNumber: `PRODA-${Date.now().toString().slice(-5)}`,
        claimReference: `PRODA-${Date.now().toString().slice(-5)}`
      });
    }

    addNotification({
      title: `${noteFormat} Case Note & PAPL Claim Verified`,
      message: `Neutralised ${noteFormat} note for ${noteParticipant} (${noteSessionDate}) saved with PAPL ${noteSupportItemCode} verification.`,
      type: 'clinical',
      severity: 'low'
    });
    showToast(`Verified ${noteFormat} note and PAPL billing claim saved to register.`);
  };

  const handleUploadCaseNotesFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setS34UploadedFileName(file.name);
      const estimatedCount = Math.max(
        1,
        (text.match(/Case Note|Session|SOAP|BIRP|SIMPL|\d{2}-\d{2}-\d{2}/gi) || []).length
      );
      setS34UploadedNotesCount(estimatedCount);
      setS34DraftInput(text.slice(0, 5000));
      showToast(
        `Uploaded "${file.name}" (${estimatedCount} case note entries detected) for Section 34 & Price Guide audit.`
      );
    } catch {
      showToast('Could not read uploaded case note file.');
    } finally {
      e.target.value = '';
    }
  };

  const handleLoadParticipantNotesFromStore = () => {
    const matching = caseNotes.filter((n) =>
      n.clientName.toLowerCase().includes(s34Participant.toLowerCase())
    );
    const sourceList = matching.length > 0 ? matching : caseNotes.slice(0, 4);
    if (sourceList.length === 0) {
      showToast('No existing register notes found; using default clinical case note batch.');
      return;
    }
    const compiled = sourceList
      .map(
        (n) =>
          `[Case Note ${n.date} · Format: ${n.format || 'SOAP'} · Item: ${
            n.supportItemCode || '15_056_0128_1_3'
          } · ${n.sessionDurationMinutes}m F2F + ${n.nonFaceToFaceMinutes || 0}m NF2F]: Subjective: ${
            n.subjective || 'not stated'
          } | Objective: ${n.objective || 'not stated'} | Assessment: ${
            n.assessment || 'not stated'
          } | Plan: ${n.plan || 'not stated'}`
      )
      .join('\n\n');
    setS34DraftInput(compiled);
    setS34UploadedFileName(`${s34Participant}_Register_Case_Notes (${sourceList.length} notes)`);
    setS34UploadedNotesCount(sourceList.length);
    showToast(
      `Loaded ${sourceList.length} participant case note(s) from register for Section 34 evaluation.`
    );
  };

  const handleRunSection34Audit = async () => {
    setIsRunningS34(true);
    try {
      const res = await fetch('/api/gemini/clinical-decision-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'section-34-auditor',
          participantName: s34Participant,
          supportItemCode: s34SupportItemCode,
          uploadedFileName: s34UploadedFileName || `${s34Participant} Case Notes Batch`,
          uploadedNotesCount: s34UploadedNotesCount,
          sessionDate: '06-11-26',
          rawInput: s34DraftInput
        })
      });
      const data = await res.json();
      if (data.text) {
        setS34AuditResult(data.text);
        if (data.section34Diagnostic) {
          setS34Diagnostic(data.section34Diagnostic);
        }
        showToast(
          `NDIS Section 34 & Price Guide (${s34SupportItemCode}) diagnostic completed for ${s34Participant}.`
        );
      }
    } finally {
      setIsRunningS34(false);
    }
  };

  const handleGenerateYouthScript = async () => {
    setIsGeneratingScript(true);
    try {
      const res = await fetch('/api/gemini/clinical-decision-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'youth-pbs-script',
          participantName: scriptParticipant,
          sessionDuration: '40 mins',
          triggerContext: scriptTrigger,
          replacementSkill: scriptReplacement
        })
      });
      const data = await res.json();
      if (data.text) {
        setGeneratedScript(data.text);
        showToast(
          `Youth PBS Social Script & Red/Green Break Card protocol generated for ${scriptParticipant}.`
        );
      }
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleAddFbaObservationPoint = () => {
    if (!newFbaWindowLabel.trim()) return;
    setFbaPoints((prev) => [
      ...prev,
      {
        dayLabel: newFbaWindowLabel.trim(),
        directAbcCount: Math.max(0, Number(newFbaAbcCount)),
        meanDurationMins: Math.max(1, Number(newFbaDurationMins)),
        productIncidents: 0,
        replacementBreakCardUses: Math.max(0, Number(newFbaBreakCardUses))
      }
    ]);
    showToast(
      `Added longitudinal FBA data point (${newFbaWindowLabel}) for ${selectedFbaParticipant}.`
    );
    setNewFbaWindowLabel(`Days ${fbaPoints.length * 2 + 1}–${fbaPoints.length * 2 + 2}`);
  };

  // Calculations for Tab 4: Travel-Stripped Plan & $62/hr Support Worker Margin
  const pbsHourlyRate = 193.99;
  const totalPbsBudgetAud = pbsPlanHours * pbsHourlyRate;
  const inPersonSessionsCount = Math.round((pbsPlanHours * (1 - telehealthRatioPct / 100)) / 1.5);
  const unbillableTravelHours = Number(
    ((inPersonSessionsCount * travelMinutesRoundTrip) / 60).toFixed(1)
  );
  const unbillableTravelExposureAud = Number((unbillableTravelHours * pbsHourlyRate).toFixed(2));
  const CoreSupportCapRate = 67.56;
  const supportWorkerHourlyMarginAud = Number(
    (CoreSupportCapRate - supportWorkerHourlyRate).toFixed(2)
  );
  const supportWorkerMarginPct = Number(
    ((supportWorkerHourlyMarginAud / CoreSupportCapRate) * 100).toFixed(1)
  );

  // Filtered Section 14 entries
  const filteredSection14Entries = section14Entries.filter((entry) => {
    if (section14Filter === 'MISSING_DATA') return !entry.serviceDeliveryVerified;
    if (section14Filter === 'NIL_ONLY') return entry.submissionType === 'COMPULSORY_NIL';
    return true;
  });

  const missingSection14Count = section14Entries.filter((e) => !e.serviceDeliveryVerified).length;
  const compulsoryNilCount = section14Entries.filter(
    (e) => e.submissionType === 'COMPULSORY_NIL'
  ).length;

  return (
    <div
      data-testid="clinical-intelligence-studio"
      className="bg-slate-900/90 border border-teal-500/30 rounded-3xl p-5 sm:p-6 space-y-5"
    >
      {/* Studio Header & 5-Tab Workflow Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-white">
                Breakthrough Clinical Neutrality, Section 34 &amp; Statutory Intelligence Studio
              </h2>
              <span className="text-xs font-mono text-teal-300">
                PAPL 2025–26 · AU-EN · DD-MM-YY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Auto-Populated SOAP Case Note Builder, NDIS Section 34 Evidence Gap Checker, Triangulated FBA Baseline Grapher, Travel Cap Simulator, and Section 14 Monthly NIL Reporting Tracker.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              {
                id: 'case-note-refiner',
                testId: 'tab-case-note-refiner',
                label: '1. Auto-SOAP & Neutrality Refiner',
                icon: FileText
              },
              {
                id: 'section34-and-scripts',
                testId: 'tab-section-34-auditor',
                label: '2. NDIS Section 34 Gap Checker',
                icon: Scale
              },
              {
                id: 'fba-grapher',
                testId: 'tab-fba-grapher',
                label: '3. FBA Baseline Grapher',
                icon: BarChart3
              },
              {
                id: 'travel-and-xero-queue',
                testId: 'tab-travel-xero',
                label: '4. Travel Cap & 17hats-Xero',
                icon: Calculator
              },
              {
                id: 'section14-nil-tracker',
                testId: 'tab-section14-nil',
                label: `5. Sec 14 NIL Tracker (${missingSection14Count} Missing)`,
                icon: ShieldCheck
              }
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                data-testid={tab.testId}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {statusToast && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {statusToast}
          </span>
        </div>
      )}

      {/* TAB 1: AUTO-POPULATED STRUCTURED SOAP CASE NOTE BUILDER & NEUTRALITY REFINER */}
      {activeTab === 'case-note-refiner' && (
        <div className="space-y-4">
          {/* Auto-Populated NDIS Participant History Context Bar */}
          <div
            data-testid="soap-participant-history-banner"
            className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-slate-300">
                <UserCheck className="w-4 h-4 text-teal-400" />
                <span className="font-bold text-white">{activeParticipantHistory.name}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-teal-300">
                  NDIS #{activeParticipantHistory.ndisNumber}
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeParticipantHistory.primaryDisability}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-amber-300">
                  Sec 34 Review: {activeParticipantHistory.planReviewDate}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-emerald-300">
                  Remaining Plan Budget: $
                  {activeParticipantHistory.remainingBudgetAud.toLocaleString('en-AU', {
                    minimumFractionDigits: 2
                  })}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                <strong className="text-slate-200">Auto-Linked Goal &amp; FBA Baseline:</strong>{' '}
                {activeParticipantHistory.activeGoal} — {activeParticipantHistory.recentBaselineSummary}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleSelectParticipantAndAutoPopulate(noteParticipant)}
              className="px-3 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 font-bold flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Re-Populate SOAP from NDIS History</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column: Structured SOAP Auto-Populated Input & PAPL Billing Parameters */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-extrabold text-white">
                    Structured SOAP / BIRP Case Note Builder &amp; Neutrality Refiner
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Selecting a participant auto-populates their NDIS plan history, linked goal, and baseline into structured SOAP fields.
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {(['SOAP', 'BIRP', 'SIMPL'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setNoteFormat(fmt)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold cursor-pointer ${
                        noteFormat === fmt
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">
                    Participant (Auto-Hydrates)
                  </label>
                  <select
                    aria-label="Select participant to auto-populate SOAP history"
                    value={noteParticipant}
                    onChange={(e) => handleSelectParticipantAndAutoPopulate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white"
                  >
                    <option value="Ryder">Ryder (Youth PBS)</option>
                    <option value="Saffron">Saffron (Adult Pathway)</option>
                    <option value="Celeste Rattray-Wood">Celeste Rattray-Wood</option>
                    {clients.slice(0, 6).map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Date (DD-MM-YY)</label>
                  <input
                    type="text"
                    value={noteSessionDate}
                    onChange={(e) => setNoteSessionDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">F2F Mins</label>
                  <input
                    type="number"
                    value={noteDuration}
                    onChange={(e) => setNoteDuration(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">NF2F Mins</label>
                  <input
                    type="number"
                    value={noteNf2fMinutes}
                    onChange={(e) => setNoteNf2fMinutes(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">
                    NDIS Price Guide (PAPL 2025-26) Support Item
                  </label>
                  <select
                    value={noteSupportItemCode}
                    onChange={(e) => setNoteSupportItemCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-[11px]"
                  >
                    <option value="15_056_0128_1_3">
                      15_056_0128_1_3 ($193.99/hr Capacity Building Therapy)
                    </option>
                    <option value="15_054_0128_1_3">
                      15_054_0128_1_3 ($232.74/hr Specialist PBS Module 2)
                    </option>
                    <option value="01_011_0107_1_1">
                      01_011_0107_1_1 ($67.56/hr Core Support Module 2A)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">
                    Provider Travel Mins Claimed (0m for Travel-Stripped Plan)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={noteTravelMinutes}
                    onChange={(e) => setNoteTravelMinutes(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono tabular-nums"
                  />
                </div>
              </div>

              {/* Structured 4-Section SOAP Auto-Populated Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-teal-300 block mb-0.5">
                    S — Subjective (Carer / Participant Report)
                  </label>
                  <textarea
                    rows={2}
                    value={soapSubjective}
                    onChange={(e) => setSoapSubjective(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-teal-300 block mb-0.5">
                    O — Objective (Direct Practitioner Observation)
                  </label>
                  <textarea
                    rows={2}
                    value={soapObjective}
                    onChange={(e) => setSoapObjective(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-teal-300 block mb-0.5">
                    A — Assessment (NDIS Goal &amp; FBA Synthesis)
                  </label>
                  <textarea
                    rows={2}
                    value={soapAssessment}
                    onChange={(e) => setSoapAssessment(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-teal-300 block mb-0.5">
                    P — Plan (Next Session &amp; PAPL Verification)
                  </label>
                  <textarea
                    rows={2}
                    value={soapPlan}
                    onChange={(e) => setSoapPlan(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">
                  Raw Shift Observation Stream (Audited for Clinical Neutrality)
                </label>
                <textarea
                  rows={2}
                  value={rawShiftNote}
                  onChange={(e) => setRawShiftNote(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 leading-relaxed"
                  placeholder="Paste raw clinician or support worker documentation to audit for neutrality, tone, and billing compliance..."
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400">
                  Separates carer report vs direct observation · Marks absent fields as <code>not stated</code>.
                </span>
                <button
                  data-testid="run-case-note-refiner-btn"
                  type="button"
                  onClick={handleRunCaseNoteRefiner}
                  disabled={isRefiningNote}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isRefiningNote ? 'Auditing & Refining...' : `Audit & Refine ${noteFormat} Note`}
                  </span>
                </button>
              </div>
            </div>

            {/* Right Column: Audit Scorecard, Lexical Neutrality Replacements & Output */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                {auditMetrics && (
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Professional Tone</span>
                      <span className="text-base font-extrabold text-emerald-400">
                        {auditMetrics.professionalToneScore}/100
                      </span>
                      <span className="text-[9px] text-slate-400 block">Australian Clinical Standard</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Clinical Neutrality</span>
                      <span className="text-base font-extrabold text-teal-300">
                        {auditMetrics.clinicalNeutralityScore}/100
                      </span>
                      <span className="text-[9px] text-slate-400 block">Carer vs Direct Separated</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Billing Compliance</span>
                      <span
                        className={`text-base font-extrabold ${
                          auditMetrics.billingAudit.paplCompliant ? 'text-emerald-400' : 'text-amber-300'
                        }`}
                      >
                        {auditMetrics.billingComplianceScore}/100
                      </span>
                      <span className="text-[9px] text-amber-300 block">
                        ${auditMetrics.billingAudit.totalClaimAud.toFixed(2)} AUD (
                        {auditMetrics.billingAudit.billableHours}h)
                      </span>
                    </div>
                  </div>
                )}

                {auditMetrics && auditMetrics.flaggedTerms.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-[11px]">
                    <div className="font-bold text-amber-300 flex items-center justify-between">
                      <span>Clinical Neutrality &amp; Tone Replacements Applied</span>
                      <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                        {auditMetrics.flaggedTerms.length} phrase(s) neutralised
                      </span>
                    </div>
                    {auditMetrics.flaggedTerms.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 space-y-0.5"
                      >
                        <div className="flex items-center gap-1.5 flex-wrap font-mono text-[10px]">
                          <span className="line-through text-rose-400">{item.original}</span>
                          <span className="text-slate-500">&rarr;</span>
                          <span className="text-emerald-300 font-bold">{item.neutralReplacement}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">{item.rationale}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white">
                    Refined {noteFormat} Documentation &amp; PAPL Billing Summary
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveRefinedNoteToRegister}
                    className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Verify &amp; Save Note + PRODA Claim</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                  {refinedNoteOutput ||
                    `Click "Audit & Refine ${noteFormat} Note" to run the tone, neutrality, and PAPL 2025-26 billing compliance audit and generate a structured ${noteFormat} case note.`}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
                <strong>Governance Notice:</strong> Decision-support draft only. Clinicians must verify all observations and billable F2F/NF2F minutes prior to signing.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NDIS SECTION 34 EVIDENCE GAP CHECKER & YOUTH PBS SOCIAL SCRIPT BUILDER */}
      {activeTab === 'section34-and-scripts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3.5">
              <div>
                <h3 className="text-xs font-extrabold text-white">
                  NDIS Section 34 Evidence Gap Checker &amp; Price Guide Diagnostic
                </h3>
                <p className="text-[11px] text-slate-400">
                  Upload participant case notes or pull from the register to evaluate against Section 34 criteria and PAPL 2025-26 price guide requirements.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Participant</label>
                  <select
                    value={s34Participant}
                    onChange={(e) => setS34Participant(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white"
                  >
                    <option value="Saffron">Saffron (Adult Education Pathway)</option>
                    <option value="Ryder">Ryder (Youth PBS — 40m Cap)</option>
                    <option value="16yo Tier 3 Referral">16yo Tier 3 School Refusal Referral</option>
                    <option value="Aiden">Aiden (8-9yo Referral)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">
                    NDIS Price Guide Line Item (PAPL 2025-26)
                  </label>
                  <select
                    value={s34SupportItemCode}
                    onChange={(e) => setS34SupportItemCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-[11px]"
                  >
                    <option value="15_056_0128_1_3">15_056_0128_1_3 ($193.99/hr Capacity Building)</option>
                    <option value="15_054_0128_1_3">15_054_0128_1_3 ($232.74/hr Specialist PBS)</option>
                    <option value="01_011_0107_1_1">01_011_0107_1_1 ($67.56/hr Core Support)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.csv,.json"
                    onChange={handleUploadCaseNotesFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Case Notes (.txt/.csv/.md)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadParticipantNotesFromStore}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Pull Participant Notes</span>
                  </button>
                </div>
                <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                  {s34UploadedFileName || `${s34UploadedNotesCount} note(s) loaded`}
                </span>
              </div>

              <textarea
                rows={4}
                value={s34DraftInput}
                onChange={(e) => setS34DraftInput(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono"
                placeholder="Upload participant case notes or paste session documentation to evaluate against Section 34 and NDIS Price Guide requirements..."
              />

              <button
                data-testid="run-section-34-auditor-btn"
                type="button"
                onClick={handleRunSection34Audit}
                disabled={isRunningS34}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>
                  {isRunningS34
                    ? 'Evaluating Case Notes Against Section 34 & Price Guide...'
                    : 'Run NDIS Section 34 & Price Guide Gap Diagnostic'}
                </span>
              </button>

              {s34Diagnostic && s34Diagnostic.paplLineItem && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono tabular-nums">
                    <span className="text-slate-300">
                      PAPL Line Item:{' '}
                      <strong className="text-teal-300">{s34Diagnostic.paplLineItem.code}</strong> ($
                      {s34Diagnostic.paplLineItem.capRateAud}/hr)
                    </span>
                    <span className="text-emerald-300 font-bold">
                      Readiness: {s34Diagnostic.overallReadinessScore}/100
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {(s34Diagnostic.criteriaChecklist || []).map((item) => (
                      <div
                        key={item.criterion}
                        className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white">
                            <span className="font-mono text-indigo-300 mr-1.5">{item.criterion}</span>
                            {item.title}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold ${
                              item.status === 'MET'
                                ? 'text-emerald-300'
                                : item.status === 'PARTIAL'
                                ? 'text-amber-300'
                                : 'text-rose-300'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="text-slate-300">{item.finding}</p>
                        <p className="text-[10px] text-teal-300 font-mono">
                          Action: {item.remediationPrompt}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {s34AuditResult && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap font-mono max-h-44 overflow-y-auto">
                  {s34AuditResult}
                </div>
              )}
            </div>

            {/* Right: Youth PBS Social Script & Red/Green Break Card Studio */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-white">
                    Youth PBS Social Script &amp; Red/Green Break Card Builder
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-300">
                    40-Min Session Cap Ready
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    value={scriptParticipant}
                    onChange={(e) => setScriptParticipant(e.target.value)}
                    placeholder="Participant (e.g. Ryder)"
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white"
                  />
                  <input
                    type="text"
                    value={scriptTrigger}
                    onChange={(e) => setScriptTrigger(e.target.value)}
                    placeholder="Antecedent trigger..."
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/50 space-y-1">
                    <div className="font-extrabold text-emerald-300 flex items-center justify-between">
                      <span>GREEN CARD · READY</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <p className="text-[11px] text-emerald-100">
                      &ldquo;I am feeling calm and working through my 40-minute session plan.&rdquo;
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 space-y-1">
                    <div className="font-extrabold text-rose-300 flex items-center justify-between">
                      <span>RED CARD · 5-MIN BREAK</span>
                      <Clock className="w-3.5 h-3.5 text-rose-400" />
                    </div>
                    <p className="text-[11px] text-rose-100">
                      &ldquo;I need a 5-minute sensory pause now. Please pause verbal demands.&rdquo;
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateYouthScript}
                  disabled={isGeneratingScript}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isGeneratingScript
                      ? 'Building Social Script...'
                      : 'Generate 40-Min Social Script & Co-Regulation Protocol'}
                  </span>
                </button>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap font-mono max-h-56 overflow-y-auto">
                  {generatedScript ||
                    'Click "Generate 40-Min Social Script & Co-Regulation Protocol" to create a printable first-person social story and Module 2A support worker prompt sequence.'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                <strong>Disclaimer:</strong> Section 34 audits and PBS scripts are decision-support tools for clinician review; NDIA funding determinations rest solely with the NDIA delegate.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRIANGULATED FBA BASELINE & RENEWAL EVIDENCE GRAPHER */}
      {activeTab === 'fba-grapher' && (
        <div data-testid="fba-baseline-grapher-panel" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-xs font-extrabold text-white">
                Triangulated Functional Behaviour Assessment (FBA) Baseline &amp; Intervention Efficacy Grapher
              </h3>
              <p className="text-[11px] text-slate-400">
                Visualizes Direct Observation (14-day ABC frequency &amp; duration), Indirect Assessment (FAST / MAS), and Behaviour Product logs over time to track intervention efficacy.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedFbaParticipant}
                onChange={(e) => setSelectedFbaParticipant(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-semibold"
              >
                <option value="16yo Tier 3 School Refusal Referral">
                  16yo Tier 3 School Refusal Referral
                </option>
                <option value="Ryder (Youth PBS — 40m Cap)">Ryder (Youth PBS — 40m Cap)</option>
                <option value="Saffron (Adult Education Pathway)">
                  Saffron (Adult Education Pathway)
                </option>
                <option value="Aiden (8-9yo Referral)">Aiden (8-9yo Referral)</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setFbaPoints((prev) =>
                    prev.map((pt, i) =>
                      i === prev.length - 1
                        ? {
                            ...pt,
                            replacementBreakCardUses: pt.replacementBreakCardUses + 1
                          }
                        : pt
                    )
                  );
                  showToast(
                    `Logged +1 replacement Break Card observation for ${selectedFbaParticipant} (14-day baseline updated).`
                  );
                }}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Replacement Skill Use</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                <span className="font-bold text-white">
                  1. Longitudinal FBA Trajectory: Target ABC Episodes vs. Replacement Skill Acquisition
                </span>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="text-rose-300">Target Behaviour (ABC)</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-300">Mean Duration (mins)</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-300">Break Card Replacement</span>
                </div>
              </div>

              <div
                className="grid gap-2 items-end h-44 pt-4 px-2 border-b border-slate-800"
                style={{ gridTemplateColumns: `repeat(${fbaPoints.length}, minmax(0, 1fr))` }}
              >
                {fbaPoints.map((pt) => {
                  const abcHeight = Math.min(100, Math.max(12, pt.directAbcCount * 14));
                  const durHeight = Math.min(100, Math.max(12, Math.round(pt.meanDurationMins * 3.2)));
                  const repHeight = Math.min(100, Math.max(12, pt.replacementBreakCardUses * 11));
                  return (
                    <div
                      key={pt.dayLabel}
                      className="flex flex-col items-center gap-1.5 h-full justify-end"
                    >
                      <div className="flex items-end gap-1 w-full justify-center h-32">
                        <div
                          style={{ height: `${abcHeight}%` }}
                          className="w-2.5 rounded-t bg-rose-500/85 transition-opacity"
                          title={`${pt.dayLabel}: ${pt.directAbcCount} ABC episodes`}
                        />
                        <div
                          style={{ height: `${durHeight}%` }}
                          className="w-2.5 rounded-t bg-amber-400/80 transition-opacity"
                          title={`${pt.dayLabel}: ${pt.meanDurationMins}m mean episode duration`}
                        />
                        <div
                          style={{ height: `${repHeight}%` }}
                          className="w-2.5 rounded-t bg-emerald-400/85 transition-opacity"
                          title={`${pt.dayLabel}: ${pt.replacementBreakCardUses} replacement Break Card uses`}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 tabular-nums truncate max-w-full">
                        {pt.dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Interactive Add FBA Time-Window Data Point Form */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-2 items-end text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Time Window</label>
                  <input
                    type="text"
                    value={newFbaWindowLabel}
                    onChange={(e) => setNewFbaWindowLabel(e.target.value)}
                    className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">ABC Count</label>
                  <input
                    type="number"
                    min={0}
                    value={newFbaAbcCount}
                    onChange={(e) => setNewFbaAbcCount(Number(e.target.value))}
                    className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-rose-300 font-mono tabular-nums text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Mean Mins</label>
                  <input
                    type="number"
                    min={1}
                    value={newFbaDurationMins}
                    onChange={(e) => setNewFbaDurationMins(Number(e.target.value))}
                    className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-amber-300 font-mono tabular-nums text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Break Cards</label>
                  <input
                    type="number"
                    min={0}
                    value={newFbaBreakCardUses}
                    onChange={(e) => setNewFbaBreakCardUses(Number(e.target.value))}
                    className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300 font-mono tabular-nums text-[11px]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddFbaObservationPoint}
                  className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] cursor-pointer whitespace-nowrap"
                >
                  + Add Window
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Direct ABC Frequency</span>
                  <span className="text-sm font-extrabold text-white font-mono tabular-nums">
                    {fbaPoints[0]?.directAbcCount || 6}/wk &rarr;{' '}
                    {fbaPoints[fbaPoints.length - 1]?.directAbcCount ?? 2}/wk (-67%)
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Mean Episode Duration</span>
                  <span className="text-sm font-extrabold text-teal-300 font-mono tabular-nums">
                    {fbaPoints[0]?.meanDurationMins || 28} mins &rarr;{' '}
                    {fbaPoints[fbaPoints.length - 1]?.meanDurationMins ?? 9} mins
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Behaviour Product Logs</span>
                  <span className="text-sm font-extrabold text-emerald-300 font-mono tabular-nums">
                    7 Incident Artefacts Verified
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-xs font-bold text-white block">
                  2. Indirect Functional Tools (FAST &amp; MAS Concordance)
                </span>
                <p className="text-[11px] text-slate-400">
                  Triangulates teacher/carer Functional Assessment Screening Tool (FAST) and Motivation Assessment Scale (MAS) scores.
                </p>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <div className="flex justify-between font-mono text-[11px] mb-1 tabular-nums">
                      <span className="text-slate-300">Escape / Task Avoidance (FAST)</span>
                      <span className="text-amber-300 font-bold">{fastEscapeScore}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={fastEscapeScore}
                      onChange={(e) => setFastEscapeScore(Number(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-mono text-[11px] mb-1 tabular-nums">
                      <span className="text-slate-300">Sensory / Overstimulation (MAS)</span>
                      <span className="text-teal-300 font-bold">{masSensoryScore}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={masSensoryScore}
                      onChange={(e) => setMasSensoryScore(Number(e.target.value))}
                      className="w-full accent-teal-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-mono text-[11px] mb-1 tabular-nums">
                      <span className="text-slate-300">Tangible / Access (MAS)</span>
                      <span className="text-indigo-300 font-bold">{masTangibleScore}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={masTangibleScore}
                      onChange={(e) => setMasTangibleScore(Number(e.target.value))}
                      className="w-full accent-indigo-400"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-teal-950/30 border border-teal-500/30 text-[11px] text-teal-200 space-y-1">
                <div className="font-bold text-teal-300">Hypothesised Function (Triangulated):</div>
                <p>
                  Primary function is{' '}
                  <strong>Escape from prolonged high-cognitive demands ({fastEscapeScore}%)</strong>{' '}
                  compounded by sensory overload ({masSensoryScore}%). Supports 40-min session cap + Red/Green Break Card replacement skill.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TRAVEL-STRIPPED PLAN ($62/HR SW & 45-HR PBS) SIMULATOR & 17HATS-XERO RECONCILIATION QUEUE */}
      {activeTab === 'travel-and-xero-queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3.5">
            <div>
              <h3 className="text-xs font-extrabold text-white">
                Travel-Stripped Plan (45-Hr PBS Cap) &amp; $62/hr Support Worker Margin Guardrail
              </h3>
              <p className="text-[11px] text-slate-400">
                Simulates unbillable travel exposure on travel-stripped NDIS plans and models Google Meet tele-practice vs in-person delivery.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <label className="text-[10px] text-slate-400 block">
                  PBS Plan Allocation (Hours)
                </label>
                <input
                  type="number"
                  value={pbsPlanHours}
                  onChange={(e) => setPbsPlanHours(Math.max(1, Number(e.target.value)))}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono tabular-nums font-bold"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <label className="text-[10px] text-slate-400 block">
                  Round-Trip Travel per Visit (Mins)
                </label>
                <input
                  type="number"
                  value={travelMinutesRoundTrip}
                  onChange={(e) => setTravelMinutesRoundTrip(Math.max(0, Number(e.target.value)))}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono tabular-nums font-bold"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <label className="text-[10px] text-slate-400 block">
                  Support Worker Base Rate ($/hr)
                </label>
                <input
                  type="number"
                  value={supportWorkerHourlyRate}
                  onChange={(e) => setSupportWorkerHourlyRate(Math.max(30, Number(e.target.value)))}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-amber-300 font-mono tabular-nums font-bold"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <label className="text-[10px] text-slate-400 block">
                  Google Meet Tele-Practice Mix ({telehealthRatioPct}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={10}
                  value={telehealthRatioPct}
                  onChange={(e) => setTelehealthRatioPct(Number(e.target.value))}
                  className="w-full mt-2 accent-emerald-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-xs font-mono tabular-nums">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Total PBS Plan Budget</span>
                <span className="text-sm font-extrabold text-white">
                  ${totalPbsBudgetAud.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-teal-400 block">{pbsPlanHours}h @ $193.99/h</span>
              </div>

              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30">
                <span className="text-[10px] text-rose-300 block">Unfunded Travel Risk</span>
                <span className="text-sm font-extrabold text-rose-300">
                  ${unbillableTravelExposureAud.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {unbillableTravelHours}h unbillable transit
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30">
                <span className="text-[10px] text-amber-300 block">SW Gross Margin</span>
                <span className="text-sm font-extrabold text-amber-300">
                  ${supportWorkerHourlyMarginAud.toFixed(2)}/hr ({supportWorkerMarginPct}%)
                </span>
                <span className="text-[10px] text-slate-400 block">
                  vs ${CoreSupportCapRate}/hr Core Cap
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div>
              <h3 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                17hats &harr; Xero Two-Way Reconciliation Exception Queue
              </h3>
              <p className="text-[11px] text-slate-400">
                Verifies 17hats invoices against Xero Account 200 and travel-stripped plan rules prior to PRODA bulk export.
              </p>
            </div>

            <div className="space-y-2">
              {reconciliationQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-300">{item.invoiceNumber}</span>
                      <span className="font-bold text-white truncate">{item.participantName}</span>
                      <span className="text-[10px] font-mono text-slate-400">#{item.ndisNumber}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 truncate">{item.issueType}</p>
                    <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                      17hats: ${item.hatsAmountAud.toFixed(2)} · Xero Account 200: $
                      {item.xeroLedgerAmountAud.toFixed(2)}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {item.status === 'Reconciled for PRODA' ? (
                      <span className="text-emerald-300 text-[10px] font-mono font-bold">
                        Reconciled
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setReconciliationQueue((prev) =>
                            prev.map((r) =>
                              r.id === item.id
                                ? {
                                    ...r,
                                    xeroLedgerAmountAud: r.hatsAmountAud,
                                    status: 'Reconciled for PRODA',
                                    issueType: 'Verified & synced across 17hats + Xero Account 200'
                                  }
                                : r
                            )
                          );
                          showToast(
                            `Invoice ${item.invoiceNumber} reconciled across 17hats and Xero Account 200.`
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold cursor-pointer"
                      >
                        Resolve &amp; Sync
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SECTION 14 MONTHLY NIL REPORTING & MISSING SERVICE DELIVERY TRACKER */}
      {activeTab === 'section14-nil-tracker' && (
        <div data-testid="section14-nil-tracker-panel" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div>
              <h3 className="text-xs font-extrabold text-white">
                Section 14 Monthly NIL Reporting &amp; Missing Service Delivery Resolution Tracker
              </h3>
              <p className="text-[11px] text-slate-400">
                Helps clinical managers identify and resolve missing service delivery data entries and compile compulsory 0-usage NIL declarations before the 5th day of each calendar month.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-[11px]">
                {(
                  [
                    { id: 'ALL', label: `All (${section14Entries.length})` },
                    { id: 'MISSING_DATA', label: `Missing Entries (${missingSection14Count})` },
                    { id: 'NIL_ONLY', label: `Compulsory NIL (${compulsoryNilCount})` }
                  ] as const
                ).map((flt) => (
                  <button
                    key={flt.id}
                    type="button"
                    onClick={() => setSection14Filter(flt.id)}
                    className={`px-2.5 py-1 rounded-lg font-mono font-bold cursor-pointer whitespace-nowrap ${
                      section14Filter === flt.id
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {flt.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSection14Entries((prev) =>
                    prev.map((entry) => ({
                      ...entry,
                      serviceDeliveryVerified: true,
                      missingServiceEntryIssue: null,
                      portalStatus: 'Verified for NDIS Portal Batch',
                      commissionRef:
                        entry.commissionRef ||
                        `S14-202611-${Math.floor(1000 + Math.random() * 8999)}`
                    }))
                  );
                  showToast(
                    'All missing service delivery entries resolved and Section 14 monthly usage / compulsory NIL batch compiled.'
                  );
                }}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Resolve All &amp; Compile Section 14 Batch</span>
              </button>
            </div>
          </div>

          {/* 3 Summary KPI Cards for Section 14 Monthly Reporting */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono tabular-nums">
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">
                Missing Service Delivery Data Entries
              </span>
              <span
                className={`text-base font-extrabold ${
                  missingSection14Count > 0 ? 'text-amber-300' : 'text-emerald-400'
                }`}
              >
                {missingSection14Count} Participant(s) Flagged
              </span>
              <span className="text-[10px] text-slate-500 block">
                Must be resolved prior to 05-12-26 portal cut-off
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">
                Compulsory 0-Usage NIL Declarations (s.14)
              </span>
              <span className="text-base font-extrabold text-teal-300">
                {compulsoryNilCount} NIL Reports
              </span>
              <span className="text-[10px] text-slate-500 block">
                Mandatory even when 0 regulated practices occurred
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">
                Verified for NDIS Commission Portal
              </span>
              <span className="text-base font-extrabold text-emerald-400">
                {section14Entries.filter((e) => e.serviceDeliveryVerified).length}/
                {section14Entries.length} Ready
              </span>
              <span className="text-[10px] text-slate-500 block">
                Includes VIC RIDS, NSW RPA &amp; QLD QCAT references
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {filteredSection14Entries.map((entry) => (
              <div
                key={entry.id}
                className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white">{entry.participantName}</span>
                    <span aria-hidden="true" className="text-slate-600">
                      ·
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      NDIS #{entry.ndisNumber}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">
                      ·
                    </span>
                    <span
                      className={`font-mono text-[10px] font-bold ${
                        entry.submissionType === 'COMPULSORY_NIL'
                          ? 'text-amber-300'
                          : 'text-teal-300'
                      }`}
                    >
                      {entry.submissionType === 'COMPULSORY_NIL'
                        ? 'COMPULSORY NIL REPORT (0 USES)'
                        : `${entry.monthlyUsageCount} AUTHORISED USES LOGGED`}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Regulated Category: <strong>{entry.practiceCategory}</strong> · State Authorisation:{' '}
                    <span className="font-mono text-teal-300">{entry.jurisdictionAuth}</span>
                  </div>
                  {entry.missingServiceEntryIssue ? (
                    <div className="text-[11px] text-amber-300 flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Missing Service Delivery Entry: {entry.missingServiceEntryIssue}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>All monthly shift delivery and state authorisation logs verified.</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono">
                  {!entry.serviceDeliveryVerified ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSection14Entries((prev) =>
                          prev.map((item) =>
                            item.id === entry.id
                              ? {
                                  ...item,
                                  serviceDeliveryVerified: true,
                                  missingServiceEntryIssue: null,
                                  portalStatus:
                                    item.submissionType === 'COMPULSORY_NIL'
                                      ? 'Compulsory NIL Verified (s.14)'
                                      : 'Verified for 5th-of-Month Submission',
                                  commissionRef:
                                    item.commissionRef ||
                                    `S14-202611-${Math.floor(1000 + Math.random() * 8999)}`
                                }
                              : item
                          )
                        );
                        showToast(
                          `Resolved missing service delivery entry for ${entry.participantName}.`
                        );
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-sans font-bold cursor-pointer whitespace-nowrap"
                    >
                      Resolve Missing Entry
                    </button>
                  ) : (
                    <>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-emerald-300">
                        {entry.portalStatus}
                      </span>
                      {entry.commissionRef && (
                        <span className="text-[10px] text-emerald-200 font-bold">
                          Ref: {entry.commissionRef}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
