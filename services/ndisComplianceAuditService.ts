import { AuditCategory, AuditFieldChange, AuditLog } from '@/types';

const FIELD_LABELS: Record<string, string> = {
  // Support Items (NDIS Price Guide)
  code: 'NDIS Support Item Code',
  name: 'Support Item Name',
  category: 'NDIS Support Category',
  pricePerUnit: 'National Price Limit (AUD)',
  remotePricePerUnit: 'Remote (MMM 6) Price Limit (AUD)',
  veryRemotePricePerUnit: 'Very Remote (MMM 7) Price Limit (AUD)',
  unitOfMeasure: 'Unit of Measure',
  registrationGroup: 'Registration Group Name',
  registrationGroupNumber: 'Registration Group Number',
  travelClaimable: 'Provider Travel Claimable',
  nonFaceToFaceClaimable: 'Non-Face-to-Face (NF2F) Claimable',
  shortNoticeCancellationClaimable: 'Short Notice Cancellation Claimable',
  ndiaReportWritingClaimable: 'NDIA Report Writing Claimable',
  effectiveDate: 'PAPL Effective Date',
  description: 'Support Item Description',

  // Participant & Service Agreement Fields
  ndisNumber: 'NDIS Number (9-Digit)',
  dateOfBirth: 'Date of Birth',
  primaryDisability: 'Primary Disability',
  status: 'Record Status',
  planManagementType: 'Funding Management Type',
  planStartDate: 'NDIS Plan Start Date',
  planEndDate: 'NDIS Plan End Date',
  totalBudget: 'NDIS Plan Total Budget (AUD)',
  allocatedBudget: 'Service Agreement Allocated Budget (AUD)',
  spentBudget: 'Cumulative Claimed / Spent Budget (AUD)',
  serviceAgreementStatus: 'Service Agreement Status',
  primaryPractitionerId: 'Primary Practitioner ID',
  primaryPractitionerName: 'Primary Practitioner Name',
  secondaryPractitionerId: 'Secondary / Supervising Practitioner ID',
  secondaryPractitionerName: 'Secondary / Supervising Practitioner Name',
  riskLevel: 'Clinical Risk Level',
  restrictivePracticesActive: 'Restrictive Practices Active Flag',
  primarySupportItemCode: 'Primary Support Item Code',
  agreedHourlyRate: 'Agreed Hourly Rate (AUD)',
  weeklyAllocatedHours: 'Weekly Allocated Hours',

  // Clinical Case Notes (SOAP / BIRP / SIMPL)
  format: 'Clinical Note Format (SOAP/BIRP/SIMPL)',
  date: 'Session Date',
  sessionDurationMinutes: 'Direct Face-to-Face Duration (Minutes)',
  nonFaceToFaceMinutes: 'Non-Face-to-Face Documentation (Minutes)',
  travelMinutes: 'Provider Travel Duration (Minutes)',
  supportItemCode: 'Claimed NDIS Support Item Code',
  subjective: 'Subjective / Situation / Behaviour',
  objective: 'Objective / Intervention',
  assessment: 'Assessment / Response / Monitoring',
  plan: 'Clinical Plan & Next Steps',
  practitionerName: 'Authoring Practitioner',
  isLocked: 'Statutory Incident Lock Status',
  flaggedForReview: 'Clinical Governance Review Flag',
  reviewNotes: 'Governance / Escalation Notes',
  amendmentReason: 'Clinical Amendment Reason',
  version: 'Document Version',
  hourlyRate: 'Session Hourly Rate (AUD)',
  totalAmount: 'Total Billable Amount (AUD)',

  // Practitioner & HR Fields
  pbsRegistrationLevel: 'PBS Capability Framework Level',
  qualification: 'Academic / Clinical Qualification',
  email: 'Staff Email Address',
  phone: 'Staff Phone Number',
  workerScreeningId: 'NDIS Worker Screening Check (WSC) ID',
  workerScreeningExpiry: 'NDIS Worker Screening Expiry Date',
  schadsLevel: 'SCHADS Award Classification',
  hourlyPayRate: 'Hourly Pay Rate (AUD)',
  billableTargetHours: 'Weekly Billable Target (Hours)',
  maxCaseload: 'Maximum Caseload Target (Participants)'
};

const CURRENCY_FIELDS = new Set([
  'pricePerUnit',
  'remotePricePerUnit',
  'veryRemotePricePerUnit',
  'totalBudget',
  'allocatedBudget',
  'spentBudget',
  'agreedHourlyRate',
  'hourlyRate',
  'unitRate',
  'unitPrice',
  'totalAmount',
  'billedAmount',
  'hourlyPayRate'
]);

const IGNORED_DIFF_KEYS = new Set([
  'id',
  'updatedAt',
  'createdAt',
  'amendedAt',
  'isCustomUserParticipant',
  'isCompanyDriveParticipant',
  'documents',
  'attachedDocuments',
  'goals',
  'budgetBreakdown',
  'emergencyContact',
  'supportCoordinator',
  'planManager',
  'linkedDriveFiles',
  'linkedDocumentIds'
]);

export function formatAuditFieldValue(field: string, val: any): string {
  if (val === undefined || val === null || val === '') {
    return 'Not stated';
  }
  if (typeof val === 'boolean') {
    return val ? 'Yes (Enabled)' : 'No (Disabled)';
  }
  if (typeof val === 'number') {
    if (CURRENCY_FIELDS.has(field)) {
      return `$${val.toLocaleString('en-AU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} AUD`;
    }
    return String(val);
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return 'None';
    return val
      .map((item) => (typeof item === 'object' ? item?.title || item?.name || item?.id || JSON.stringify(item) : String(item)))
      .join(', ');
  }
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  const str = String(val).trim();
  return str.length > 0 ? str : 'Not stated';
}

/**
 * Computes field-by-field before/after differences between two snapshots of an entity.
 */
export function computeFieldChanges(
  beforeSnapshot?: Record<string, any> | null,
  afterSnapshot?: Record<string, any> | null
): AuditFieldChange[] {
  if (!beforeSnapshot && !afterSnapshot) return [];

  const changes: AuditFieldChange[] = [];
  const allKeys = new Set<string>([
    ...Object.keys(beforeSnapshot || {}),
    ...Object.keys(afterSnapshot || {})
  ]);

  for (const key of allKeys) {
    if (IGNORED_DIFF_KEYS.has(key)) continue;

    // If afterSnapshot is a partial update object, only compare keys present in afterSnapshot
    if (beforeSnapshot && afterSnapshot && !(key in afterSnapshot)) {
      continue;
    }

    const rawBefore = beforeSnapshot ? beforeSnapshot[key] : undefined;
    const rawAfter = afterSnapshot ? afterSnapshot[key] : undefined;

    const formattedBefore = beforeSnapshot ? formatAuditFieldValue(key, rawBefore) : 'None (New Record)';
    const formattedAfter = afterSnapshot ? formatAuditFieldValue(key, rawAfter) : 'Deleted / Removed';

    if (formattedBefore !== formattedAfter) {
      changes.push({
        field: key,
        label: FIELD_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
        beforeValue: formattedBefore,
        afterValue: formattedAfter
      });
    }
  }

  return changes;
}

/**
 * Classifies an audit event into an official NDIS Quality & Safeguards Commission
 * audit category and Practice Standard reference.
 */
export function classifyNdisAuditEvent(
  action: string,
  entity?: string,
  details?: string,
  fieldChanges?: AuditFieldChange[]
): {
  auditCategory: AuditCategory;
  ndisPracticeStandard: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
} {
  const ent = (entity || '').toLowerCase();
  const act = (action || '').toUpperCase();
  const det = (details || '').toLowerCase();
  const changedFields = new Set((fieldChanges || []).map((f) => f.field));

  // 1. Support Items & NDIS Price Guide
  if (
    ent.includes('supportitem') ||
    ent.includes('priceguide') ||
    act.includes('SUPPORT_ITEM') ||
    act.includes('PRICE_GUIDE')
  ) {
    return {
      auditCategory: 'Support Item & Price Guide',
      ndisPracticeStandard:
        'NDIS Pricing Arrangements and Price Limits (PAPL) & Core Module 2: Provider Governance (Financial Integrity)',
      severity: changedFields.has('pricePerUnit') || act.includes('DELETE') ? 'High' : 'Medium'
    };
  }

  // 2. Service Agreements & Participant Funding
  const isServiceAgreementChange =
    ent.includes('serviceagreement') ||
    act.includes('SERVICE_AGREEMENT') ||
    det.includes('service agreement') ||
    det.includes('schedule of supports') ||
    det.includes('allocated budget') ||
    changedFields.has('allocatedBudget') ||
    changedFields.has('totalBudget') ||
    changedFields.has('serviceAgreementStatus') ||
    changedFields.has('planManagementType') ||
    changedFields.has('planStartDate') ||
    changedFields.has('planEndDate');

  if (isServiceAgreementChange) {
    return {
      auditCategory: 'Service Agreement & Funding',
      ndisPracticeStandard:
        'NDIS Practice Standard: Core Module 3 — Provision of Supports (Service Agreements with Participants)',
      severity:
        changedFields.has('allocatedBudget') ||
        changedFields.has('totalBudget') ||
        changedFields.has('serviceAgreementStatus')
          ? 'High'
          : 'Medium'
    };
  }

  // 3. Clinical Case Notes & Progress Reports
  if (ent.includes('casenote') || act.includes('CASE_NOTE') || act.includes('AMEND_NOTE')) {
    const isLockedOrAmended =
      changedFields.has('isLocked') ||
      changedFields.has('subjective') ||
      changedFields.has('objective') ||
      changedFields.has('assessment') ||
      changedFields.has('plan') ||
      act.includes('DELETE') ||
      act.includes('AMEND');
    return {
      auditCategory: 'Clinical Case Note',
      ndisPracticeStandard:
        'NDIS Practice Standard: Core Module 2 — Information Management & Module 2A: Behaviour Support Clinical Records',
      severity: act.includes('DELETE') || changedFields.has('isLocked') ? 'High' : isLockedOrAmended ? 'Medium' : 'Low'
    };
  }

  // 4. Incidents & Restrictive Practices
  if (
    ent.includes('incident') ||
    ent.includes('restrictive') ||
    ent.includes('bsp') ||
    ent.includes('abclog')
  ) {
    return {
      auditCategory: 'Incident & Restrictive Practice',
      ndisPracticeStandard:
        'NDIS (Incident Management and Reportable Incidents) Rules 2018 & (Restrictive Practices and Behaviour Support) Rules 2018',
      severity: 'High'
    };
  }

  // 5. Billing & PRODA Claims
  if (ent.includes('billing') || ent.includes('claim')) {
    return {
      auditCategory: 'Billing & PRODA Claim',
      ndisPracticeStandard:
        'NDIA PRODA / PACE Claiming Rules & NDIS Practice Standard: Governance and Operational Management',
      severity: act.includes('DELETE') || act.includes('RECONCILE') ? 'Medium' : 'Low'
    };
  }

  // 6. Practitioners & HR Roster
  if (ent.includes('practitioner') || ent.includes('shift') || act.includes('ASSIGN_PRACTITIONER')) {
    return {
      auditCategory: 'Practitioner & HR',
      ndisPracticeStandard:
        'NDIS Practice Standard: Core Module 2 — Human Resource Management & Worker Screening Rules',
      severity: 'Low'
    };
  }

  // 7. Participant Record
  if (ent.includes('client') || ent.includes('participant') || ent.includes('goal')) {
    return {
      auditCategory: 'Participant Record',
      ndisPracticeStandard:
        'NDIS Practice Standard: Core Module 1 — Rights and Responsibilities (Privacy & Dignity)',
      severity: act.includes('DELETE') ? 'High' : 'Low'
    };
  }

  return {
    auditCategory: 'System & Security',
    ndisPracticeStandard:
      'NDIS Practice Standard: Core Module 2 — Information Management & Quality Management',
    severity: 'Low'
  };
}

/**
 * Deterministic 64-char hexadecimal tamper-evident hash linking each audit record
 * to the previous record's hash (blockchain-style audit chain for NDIS quality audits).
 */
export function computeAuditIntegrityHash(
  payload: {
    id: string;
    timestamp: string;
    actorId?: string;
    action: string;
    entity?: string;
    entityId?: string;
    details: string;
  },
  previousHash: string = 'GENESIS_NDIS_AUDIT_CHAIN_0000000000000000'
): string {
  const canonical = `${previousHash}|${payload.id}|${payload.timestamp}|${payload.actorId || 'sys'}|${payload.action}|${payload.entity || ''}|${payload.entityId || ''}|${payload.details}`;

  // Compute two 32-bit FNV-1a style lanes across shifted seeds to form a deterministic 64-hex-character digest
  const lanes = [
    0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35,
    0x27d4eb2f, 0x165667b1, 0xd3a2646c, 0xfd7046c5
  ];

  for (let i = 0; i < canonical.length; i++) {
    const code = canonical.charCodeAt(i);
    for (let l = 0; l < lanes.length; l++) {
      lanes[l] ^= code + ((i + 1) * (l + 3));
      lanes[l] = Math.imul(lanes[l], 0x01000193) >>> 0;
    }
  }

  return lanes.map((v) => v.toString(16).padStart(8, '0')).join('');
}

/**
 * Verifies the integrity of the audit log chain.
 */
export function verifyAuditChainIntegrity(logs: AuditLog[]): {
  isValid: boolean;
  verifiedCount: number;
  chainedCount: number;
  brokenLogId?: string;
} {
  let verifiedCount = 0;
  let chainedCount = 0;

  for (const log of logs) {
    if (!log.integrityHash) continue;
    chainedCount++;
    const expected = computeAuditIntegrityHash(
      {
        id: log.id,
        timestamp: log.timestamp,
        actorId: log.actorId,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        details: log.details
      },
      log.previousHash || 'GENESIS_NDIS_AUDIT_CHAIN_0000000000000000'
    );
    if (expected === log.integrityHash) {
      verifiedCount++;
    } else {
      return {
        isValid: false,
        verifiedCount,
        chainedCount,
        brokenLogId: log.id
      };
    }
  }

  return {
    isValid: true,
    verifiedCount,
    chainedCount
  };
}
