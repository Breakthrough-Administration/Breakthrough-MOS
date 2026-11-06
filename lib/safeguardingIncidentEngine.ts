/**
 * NDIS Safeguarding, State Authorisation Gateway & Statutory Form IR01/IR02 Engine
 * Enforces NDIS (Incident Management and Reportable Incidents) Rules 2018 ss.20-21
 * and NDIS (Restrictive Practices and Behaviour Support) Rules 2018 ss.6, 9, 14.
 */

export type RegulatedPracticeCategory =
  | 'Chemical'
  | 'Mechanical'
  | 'Physical'
  | 'Environmental'
  | 'Seclusion';

export type AustralianJurisdiction = 'VIC' | 'NSW' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'ACT' | 'NT';

export interface HighRiskKeywordMatch {
  keyword: string;
  category: RegulatedPracticeCategory | 'Critical_Safety_Emergency';
  statutoryForm: 'IR01' | 'IR02';
  statutoryWindowHours: 24 | 120;
  clinicalRationale: string;
}

export interface StateAuthSummaryRecord {
  id: string;
  clientId: string;
  clientName: string;
  jurisdiction: AustralianJurisdiction;
  authorisationIdentifier: string;
  practiceCategory: RegulatedPracticeCategory;
  expirationDate: string;
  status: 'ACTIVE_VALID' | 'EXPIRED' | 'MISSING_APO_SIGNOFF';
}

export interface GatewayEvaluationResult {
  isAuthorised: boolean;
  matchingAuth?: StateAuthSummaryRecord;
  statutoryForm: 'IR01' | 'IR02' | null;
  statutoryTierLabel: string | null;
  statutoryWindowHours: 24 | 120 | null;
  deadlineIso: string | null;
  shouldLockNote: boolean;
  managementAlertRecipients: Array<{ name: string; role: string; email: string }>;
  detectedKeywords: HighRiskKeywordMatch[];
}

export interface StatutoryIRDocument {
  formCode: 'FORM-IR01-24H' | 'FORM-IR02-5DAY';
  documentNumber: string;
  statutoryRuleCitation: string;
  notificationTrack: '24-Hour Immediate Notification (Form IR01)' | '5-Business-Day Notification (Form IR02)';
  providerName: string;
  providerRegistrationNumber: string;
  participantName: string;
  participantNdisNumber: string;
  incidentId: string;
  incidentDate: string;
  incidentTime: string;
  keyPersonnelAwareAt: string;
  statutorySubmissionDeadline: string;
  jurisdiction: AustralianJurisdiction;
  restrictivePracticeCategory: string;
  stateAuthorisationStatus: string;
  lockedCaseNoteIds: string[];
  antecedentAndContext: string;
  immediateSafeguardsTaken: string;
  notifiedKeyPersonnel: string[];
  formattedDocumentText: string;
}

export const HIGH_RISK_INCIDENT_LEXICON: HighRiskKeywordMatch[] = [
  {
    keyword: 'locked door',
    category: 'Environmental',
    statutoryForm: 'IR02',
    statutoryWindowHours: 120,
    clinicalRationale: 'Restricting free egress from a room or residence constitutes Environmental Restraint (or Seclusion if isolated).'
  },
  {
    keyword: 'locked courtyard',
    category: 'Environmental',
    statutoryForm: 'IR02',
    statutoryWindowHours: 120,
    clinicalRationale: 'Securing perimeter gates/courtyards to prevent exit is a regulated Environmental Restraint.'
  },
  {
    keyword: 'restricted kitchen',
    category: 'Environmental',
    statutoryForm: 'IR02',
    statutoryWindowHours: 120,
    clinicalRationale: 'Locking cupboards, fridges, or kitchen access is a regulated Environmental Restraint under NDIS Rules 2018 s.6(d).'
  },
  {
    keyword: 'prn administered',
    category: 'Chemical',
    statutoryForm: 'IR02',
    statutoryWindowHours: 120,
    clinicalRationale: 'Administering psychotropic PRN medication to influence behaviour constitutes Chemical Restraint under NDIS Rules 2018 s.6(a).'
  },
  {
    keyword: 'lorazepam',
    category: 'Chemical',
    statutoryForm: 'IR02',
    statutoryWindowHours: 120,
    clinicalRationale: 'Benzodiazepine PRN administration for behavioural sedation is classified as Chemical Restraint.'
  },
  {
    keyword: 'risperidone prn',
    category: 'Chemical',
    statutoryForm: 'IR02',
    statutoryWindowHours: 120,
    clinicalRationale: 'Antipsychotic PRN administration for behavioural control requires active Chemical Restraint authorisation.'
  },
  {
    keyword: 'olanzapine prn',
    category: 'Chemical',
    statutoryForm: 'IR02',
    statutoryWindowHours: 120,
    clinicalRationale: 'Antipsychotic PRN administration for behavioural control requires active Chemical Restraint authorisation.'
  },
  {
    keyword: 'to calm',
    category: 'Chemical',
    statutoryForm: 'IR02',
    statutoryWindowHours: 120,
    clinicalRationale: 'Medication given "to calm" or sedate behavioural distress is a regulated Chemical Restraint.'
  },
  {
    keyword: 'physical hold',
    category: 'Physical',
    statutoryForm: 'IR01',
    statutoryWindowHours: 24,
    clinicalRationale: 'Manual physical hold restricting movement is a high-risk Physical Restraint under NDIS Rules 2018 s.6(c).'
  },
  {
    keyword: 'held hands down',
    category: 'Physical',
    statutoryForm: 'IR01',
    statutoryWindowHours: 24,
    clinicalRationale: 'Manual restriction of upper limbs constitutes Physical Restraint.'
  },
  {
    keyword: 'manual restraint',
    category: 'Physical',
    statutoryForm: 'IR01',
    statutoryWindowHours: 24,
    clinicalRationale: 'Direct physical force to restrict movement is a regulated Physical Restraint.'
  },
  {
    keyword: 'bed rails',
    category: 'Mechanical',
    statutoryForm: 'IR02',
    statutoryWindowHours: 120,
    clinicalRationale: 'Using bed rails or devices to restrict free movement out of bed is a Mechanical Restraint under s.6(b).'
  },
  {
    keyword: 'lap belt',
    category: 'Mechanical',
    statutoryForm: 'IR02',
    statutoryWindowHours: 120,
    clinicalRationale: 'Non-transit lap belts or harnesses used to prevent standing/exiting are Mechanical Restraints.'
  },
  {
    keyword: 'splint',
    category: 'Mechanical',
    statutoryForm: 'IR02',
    statutoryWindowHours: 120,
    clinicalRationale: 'Arm splints or mittens worn to prevent self-injurious behaviour are regulated Mechanical Restraints.'
  },
  {
    keyword: 'confined to room',
    category: 'Seclusion',
    statutoryForm: 'IR01',
    statutoryWindowHours: 24,
    clinicalRationale: 'Sole confinement in a room or area from which the participant cannot freely exit is Seclusion under s.6(e).'
  },
  {
    keyword: 'isolated in bedroom',
    category: 'Seclusion',
    statutoryForm: 'IR01',
    statutoryWindowHours: 24,
    clinicalRationale: 'Preventing a participant from leaving their bedroom alone is regulated Seclusion.'
  },
  {
    keyword: 'emergency services',
    category: 'Critical_Safety_Emergency',
    statutoryForm: 'IR01',
    statutoryWindowHours: 24,
    clinicalRationale: 'Police or ambulance involvement triggers immediate 24-hour Key Personnel review under NDIS Incident Management Rules 2018.'
  },
  {
    keyword: 'called 000',
    category: 'Critical_Safety_Emergency',
    statutoryForm: 'IR01',
    statutoryWindowHours: 24,
    clinicalRationale: 'Emergency 000 dispatch requires immediate Tier 1 reportable incident assessment.'
  },
  {
    keyword: 'serious injury',
    category: 'Critical_Safety_Emergency',
    statutoryForm: 'IR01',
    statutoryWindowHours: 24,
    clinicalRationale: 'Serious physical injury is a mandatory 24-hour reportable incident under s.16(1)(b).'
  }
];

export const KEY_PERSONNEL_ALERT_RECIPIENTS = [
  {
    name: 'Shivandhari Persad',
    role: 'Clinical Director & Authorised Program Officer (APO)',
    email: 'shivandharipersad@gmail.com'
  },
  {
    name: 'Anitha Haripersad',
    role: 'Proficient PBS Practitioner (Module 2 Lead)',
    email: 'support@breakthroughconsult.com.au'
  },
  {
    name: 'Zubaida Baher',
    role: 'Proficient PBS Practitioner (Clinical Supervisor)',
    email: 'zubaida@breakthroughconsult.com.au'
  }
];

/**
 * Scans narrative text for high-risk or restrictive practice keywords.
 */
export function scanTextForHighRiskKeywords(text: string): HighRiskKeywordMatch[] {
  if (!text || !text.trim()) return [];
  const lower = text.toLowerCase();
  return HIGH_RISK_INCIDENT_LEXICON.filter((entry) =>
    lower.includes(entry.keyword.toLowerCase())
  );
}

/**
 * Evaluates State Authorisation Gateway compliance and determines whether Form IR01 (24h)
 * or Form IR02 (5-Business-Day) auto-generation + clinical note locking must occur.
 */
export function evaluateStateAuthorisationGateway(params: {
  clientId: string;
  clientName: string;
  practiceCategory?: RegulatedPracticeCategory;
  jurisdiction: AustralianJurisdiction;
  narrativeText: string;
  resultedInHarm?: boolean;
  stateAuthorisations: StateAuthSummaryRecord[];
  referenceDateIso?: string;
}): GatewayEvaluationResult {
  const nowIso = params.referenceDateIso || new Date().toISOString();
  const todayDateStr = nowIso.split('T')[0];
  const detectedKeywords = scanTextForHighRiskKeywords(params.narrativeText);

  const effectiveCategory: RegulatedPracticeCategory | undefined =
    params.practiceCategory ||
    (detectedKeywords.find((k) => k.category !== 'Critical_Safety_Emergency')
      ?.category as RegulatedPracticeCategory | undefined);

  const matchingAuth = effectiveCategory
    ? params.stateAuthorisations.find(
        (auth) =>
          (auth.clientId === params.clientId || auth.clientName === params.clientName) &&
          auth.practiceCategory === effectiveCategory &&
          auth.status === 'ACTIVE_VALID' &&
          auth.expirationDate >= todayDateStr
      )
    : undefined;

  const hasCriticalEmergencyKeyword = detectedKeywords.some(
    (k) => k.statutoryForm === 'IR01' || k.category === 'Critical_Safety_Emergency'
  );

  // If no restrictive practice category and no high-risk keywords and no harm: authorised/clean
  if (!effectiveCategory && detectedKeywords.length === 0 && !params.resultedInHarm) {
    return {
      isAuthorised: true,
      statutoryForm: null,
      statutoryTierLabel: null,
      statutoryWindowHours: null,
      deadlineIso: null,
      shouldLockNote: false,
      managementAlertRecipients: [],
      detectedKeywords: []
    };
  }

  // If an active, non-expired State Authorisation exists and no harm/emergency occurred
  if (matchingAuth && !params.resultedInHarm && !hasCriticalEmergencyKeyword) {
    return {
      isAuthorised: true,
      matchingAuth,
      statutoryForm: null,
      statutoryTierLabel: null,
      statutoryWindowHours: null,
      deadlineIso: null,
      shouldLockNote: false,
      managementAlertRecipients: [],
      detectedKeywords
    };
  }

  // Unauthorised Restrictive Practice OR harm/critical trigger -> Escalate!
  const isTier1 =
    Boolean(params.resultedInHarm) ||
    effectiveCategory === 'Seclusion' ||
    effectiveCategory === 'Physical' ||
    hasCriticalEmergencyKeyword;

  const statutoryForm: 'IR01' | 'IR02' = isTier1 ? 'IR01' : 'IR02';
  const statutoryWindowHours: 24 | 120 = isTier1 ? 24 : 120;
  const deadlineMs = new Date(nowIso).getTime() + statutoryWindowHours * 3600 * 1000;

  return {
    isAuthorised: false,
    matchingAuth: undefined,
    statutoryForm,
    statutoryTierLabel: isTier1
      ? 'Tier 1 — Form IR01 (24-Hour Immediate Notification)'
      : 'Tier 2 — Form IR02 (5-Business-Day Notification)',
    statutoryWindowHours,
    deadlineIso: new Date(deadlineMs).toISOString(),
    shouldLockNote: true,
    managementAlertRecipients: KEY_PERSONNEL_ALERT_RECIPIENTS,
    detectedKeywords
  };
}

/**
 * Generates an official, audit-ready Form IR01 or Form IR02 statutory document.
 */
export function generateStatutoryIRDocument(params: {
  formType: 'IR01' | 'IR02';
  incidentId: string;
  participantName: string;
  participantNdisNumber: string;
  incidentDate: string;
  incidentTime: string;
  keyPersonnelAwareAt: string;
  jurisdiction: AustralianJurisdiction;
  restrictivePracticeCategory: string;
  stateAuthorisationStatus: string;
  lockedCaseNoteIds: string[];
  antecedentAndContext: string;
  immediateSafeguardsTaken: string;
}): StatutoryIRDocument {
  const isIR01 = params.formType === 'IR01';
  const windowHours = isIR01 ? 24 : 120;
  const awareMs = new Date(params.keyPersonnelAwareAt).getTime() || Date.now();
  const deadlineIso = new Date(awareMs + windowHours * 3600 * 1000).toISOString();
  const docNumber = `NDIS-${params.formType}-${new Date(awareMs).getFullYear()}-${params.incidentId
    .replace(/\D/g, '')
    .slice(-5)
    .padStart(5, '4')}`;

  const notifiedNames = KEY_PERSONNEL_ALERT_RECIPIENTS.map(
    (r) => `${r.name} (${r.role} — ${r.email})`
  );

  const formattedDocumentText = [
    '================================================================================',
    `NDIS QUALITY AND SAFEGUARDS COMMISSION — STATUTORY REPORTABLE INCIDENT (${params.formType})`,
    `Document Ref: ${docNumber}`,
    `Notification Track: ${
      isIR01
        ? '24-Hour Immediate Notification (Form IR01 — NDIS Incident Management Rules 2018 s.20)'
        : '5-Business-Day Notification (Form IR02 — NDIS Incident Management Rules 2018 s.21)'
    }`,
    '================================================================================',
    '',
    '1. PROVIDER & STATUTORY GOVERNANCE IDENTIFIERS',
    '   Provider Name: Breakthrough Allied Health & Behaviour Support Pty Ltd',
    '   NDIS Registration ID: 4-4330-2819 (Module 2 Specialist PBS 0110 & Module 2A Implementing)',
    `   State/Territory Jurisdiction: ${params.jurisdiction}`,
    `   State Authorisation Status: ${params.stateAuthorisationStatus}`,
    '',
    '2. IMPACTED NDIS PARTICIPANT DETAILS',
    `   Participant Name: ${params.participantName}`,
    `   NDIS Participant Number: ${params.participantNdisNumber}`,
    `   Incident Identifier: ${params.incidentId}`,
    `   Date & Time of Incident: ${params.incidentDate} at ${params.incidentTime}`,
    '',
    '3. STATUTORY COUNTDOWN & KEY PERSONNEL AWARENESS',
    `   Key Personnel Aware Timestamp: ${params.keyPersonnelAwareAt}`,
    `   Mandatory Commission Portal Deadline: ${deadlineIso} (${windowHours} Hours)`,
    `   Notified Key Personnel:`,
    ...notifiedNames.map((n) => `     - ${n}`),
    '',
    '4. CLINICAL NOTE IMMUTABILITY & EVIDENCE PRESERVATION LOCK',
    `   Locked Originating Case Note ID(s): ${
      params.lockedCaseNoteIds.length > 0
        ? params.lockedCaseNoteIds.join(', ')
        : 'Auto-Locked Shift Progress Note'
    }`,
    '   Lock Status: IMMUTABLE_STATUTORY_HOLD (Editing blocked per NDIS Incident Rules 2018)',
    '',
    '5. OBJECTIVE INCIDENT DESCRIPTION, ANTECEDENT & RESTRICTIVE PRACTICE DETAILS',
    `   Regulated Practice / Category: ${params.restrictivePracticeCategory}`,
    `   Description & Antecedents: ${params.antecedentAndContext}`,
    '',
    '6. IMMEDIATE SAFEGUARDS, DE-ESCALATION & PARTICIPANT WELLBEING ACTIONS',
    `   Actions Taken: ${params.immediateSafeguardsTaken}`,
    '================================================================================'
  ].join('\r\n');

  return {
    formCode: isIR01 ? 'FORM-IR01-24H' : 'FORM-IR02-5DAY',
    documentNumber: docNumber,
    statutoryRuleCitation: isIR01
      ? 'NDIS (Incident Management and Reportable Incidents) Rules 2018 s.20 (24-Hour Notification)'
      : 'NDIS (Incident Management and Reportable Incidents) Rules 2018 s.21 (5-Business-Day Notification)',
    notificationTrack: isIR01
      ? '24-Hour Immediate Notification (Form IR01)'
      : '5-Business-Day Notification (Form IR02)',
    providerName: 'Breakthrough Allied Health & Behaviour Support Pty Ltd',
    providerRegistrationNumber: '4-4330-2819',
    participantName: params.participantName,
    participantNdisNumber: params.participantNdisNumber,
    incidentId: params.incidentId,
    incidentDate: params.incidentDate,
    incidentTime: params.incidentTime,
    keyPersonnelAwareAt: params.keyPersonnelAwareAt,
    statutorySubmissionDeadline: deadlineIso,
    jurisdiction: params.jurisdiction,
    restrictivePracticeCategory: params.restrictivePracticeCategory,
    stateAuthorisationStatus: params.stateAuthorisationStatus,
    lockedCaseNoteIds: params.lockedCaseNoteIds,
    antecedentAndContext: params.antecedentAndContext,
    immediateSafeguardsTaken: params.immediateSafeguardsTaken,
    notifiedKeyPersonnel: notifiedNames,
    formattedDocumentText
  };
}
