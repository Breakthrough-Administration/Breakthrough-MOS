import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scanTextForHighRiskKeywords,
  evaluateStateAuthorisationGateway,
  generateStatutoryIRDocument
} from '../lib/safeguardingIncidentEngine';
import { buildZipArchive, computeArchiveSealHex } from '../lib/zipArchiveBuilder';
import { SeventeenHatsService } from '../services/seventeenHatsService';

test('scanTextForHighRiskKeywords detects IR01 and IR02 restrictive practice keywords', () => {
  const sampleNote =
    'Support worker applied a physical hold for 3 minutes after escalation and locked door to courtyard.';
  const matches = scanTextForHighRiskKeywords(sampleNote);

  assert.ok(matches.length >= 2, 'Should detect both physical hold and locked door');
  assert.ok(matches.some((m) => m.statutoryForm === 'IR01' && m.category === 'Physical'));
  assert.ok(matches.some((m) => m.statutoryForm === 'IR02' && m.category === 'Environmental'));
});

test('evaluateStateAuthorisationGateway triggers IR01/IR02 escalation, locks note, and alerts Key Personnel on URP', () => {
  const decision = evaluateStateAuthorisationGateway({
    clientId: 'client-1',
    clientName: 'Lachlan',
    practiceCategory: 'Chemical',
    jurisdiction: 'VIC',
    narrativeText: 'Staff had PRN administered to calm participant without VCAT/RIDS authorisation.',
    resultedInHarm: false,
    stateAuthorisations: []
  });

  assert.equal(decision.isAuthorised, false);
  assert.equal(decision.shouldLockNote, true);
  assert.equal(decision.statutoryForm, 'IR02');
  assert.equal(decision.statutoryWindowHours, 120);
  assert.ok(
    decision.managementAlertRecipients.some((r) => r.name === 'Shivandhari Persad'),
    'Management alert must include Clinical Director & APO'
  );
});

test('generateStatutoryIRDocument formats official Form IR01 24-Hour Notification document', () => {
  const doc = generateStatutoryIRDocument({
    formType: 'IR01',
    incidentId: 'inc-2026-901',
    participantName: 'Ryder',
    participantNdisNumber: '430981220',
    incidentDate: '06-11-26',
    incidentTime: '14:15',
    keyPersonnelAwareAt: '2026-11-06T03:15:00.000Z',
    jurisdiction: 'VIC',
    restrictivePracticeCategory: 'Physical',
    stateAuthorisationStatus: 'UNAUTHORISED_RESTRICTIVE_PRACTICE',
    lockedCaseNoteIds: ['note-202'],
    antecedentAndContext: 'Sensory overload during transition; physical hold applied.',
    immediateSafeguardsTaken: 'Red card break offered; participant checked by supervisor.'
  });

  assert.equal(doc.formCode, 'FORM-IR01-24H');
  assert.ok(doc.formattedDocumentText.includes('24-Hour Immediate Notification (Form IR01'));
  assert.ok(doc.formattedDocumentText.includes('IMMUTABLE_STATUTORY_HOLD'));
});

test('buildZipArchive produces valid PKZIP binary with encrypted manifest seal', () => {
  const entries = [
    { path: '00_ARCHIVE_MANIFEST.txt', content: 'NDIS Commission Audit Pack Manifest' },
    { path: '04_Behavioural_Heatmaps/ABC_Matrix.csv', content: 'Antecedent,Behaviour,Probability\nDemand,Escape,0.75' }
  ];

  const { uint8Array, sha256SealHex, fileManifest } = buildZipArchive(entries, {
    encryptionPassphrase: 'NDIS-AUDIT-2026-KEY',
    packageTimestampIso: '2026-11-06T08:00:00.000Z'
  });

  const expectedSeal = computeArchiveSealHex(fileManifest, 'NDIS-AUDIT-2026-KEY');
  assert.equal(sha256SealHex.length, 64, 'Cryptographic seal must be a 64-char hex digest');
  assert.equal(sha256SealHex, expectedSeal);

  // Verify PK\x03\x04 local file header signature
  assert.equal(uint8Array[0], 0x50); // 'P'
  assert.equal(uint8Array[1], 0x4b); // 'K'
  assert.equal(uint8Array[2], 0x03);
  assert.equal(uint8Array[3], 0x04);
});

test('SeventeenHatsService.createClientInvoiceRecord maps NDIS GST-free support item and Xero Account 200', () => {
  const inv = SeventeenHatsService.createClientInvoiceRecord({
    clientName: 'Ryder',
    ndisNumber: '430981220',
    ndisSupportItemCode: '15_056_0128_1_3',
    description: 'Specialist Behavioural Intervention Support',
    hours: 2,
    unitRate: 193.99
  });

  assert.equal(inv.amount, 387.98);
  assert.equal(inv.xeroAccountCode, '200');
  assert.ok(inv.invoiceNumber.startsWith('17H-INV-2026-'));
});

test('SeventeenHatsService.mapContactToParticipantDossier maps 17hats contact to NDIS Participant Dossier', () => {
  const dossier = SeventeenHatsService.mapContactToParticipantDossier({
    id: '17h-cnt-104',
    name: 'Noah Patel',
    ndisNumber: '431884920',
    email: 'noah.patel.family@example.com',
    phone: '0411 892 301',
    status: 'Lead',
    companyOrNominee: 'Priya Patel (Mother)',
    source: 'Support Coordinator Referral',
    linkedProjectName: 'Tier 3 School Refusal PBS',
    serviceAgreementSigned: true,
    totalInvoicedAud: 1939.9,
    assignedPractitioner: 'Anitha Haripersad',
    createdAt: '2026-11-06T08:00:00.000Z'
  });

  assert.equal(dossier.name, 'Noah Patel');
  assert.equal(dossier.ndisNumber, '431884920');
  assert.equal(dossier.totalBudget, 8729.55);
  assert.equal(dossier.riskLevel, 'Medium');
  assert.equal(dossier.emergencyContact.name, 'Priya Patel (Mother)');
  assert.equal(dossier.serviceAgreementStatus, 'Signed (17hats E-Sign)');
});

