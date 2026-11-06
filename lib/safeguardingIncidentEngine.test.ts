import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scanTextForHighRiskKeywords,
  evaluateStateAuthorisationGateway,
  StateAuthSummaryRecord
} from './safeguardingIncidentEngine';

test('scanTextForHighRiskKeywords detects environmental and chemical restrictive practice terms', () => {
  const matches = scanTextForHighRiskKeywords(
    'Worker closed the locked door and prn administered to calm participant.'
  );
  assert.ok(matches.length >= 2);
  assert.ok(matches.some((m) => m.category === 'Environmental'));
  assert.ok(matches.some((m) => m.category === 'Chemical'));
});

test('evaluateStateAuthorisationGateway escalates unauthorised restrictive practice to Form IR02 (120h)', () => {
  const activeAuths: StateAuthSummaryRecord[] = [];
  const res = evaluateStateAuthorisationGateway({
    clientId: 'client-1',
    clientName: 'Marcus Vance',
    practiceCategory: 'Environmental',
    jurisdiction: 'VIC',
    narrativeText: 'Locked kitchen access during shift without active state authorisation.',
    resultedInHarm: false,
    stateAuthorisations: activeAuths,
    referenceDateIso: '2026-04-06T09:00:00.000Z'
  });

  assert.equal(res.isAuthorised, false);
  assert.equal(res.statutoryForm, 'IR02');
  assert.equal(res.statutoryWindowHours, 120);
  assert.equal(res.shouldLockNote, true);
});

test('evaluateStateAuthorisationGateway escalates restrictive practice with harm to Form IR01 (24h)', () => {
  const res = evaluateStateAuthorisationGateway({
    clientId: 'client-1',
    clientName: 'Marcus Vance',
    practiceCategory: 'Physical',
    jurisdiction: 'VIC',
    narrativeText: 'Emergency physical hold applied resulting in minor bruising.',
    resultedInHarm: true,
    stateAuthorisations: [],
    referenceDateIso: '2026-04-06T09:00:00.000Z'
  });

  assert.equal(res.isAuthorised, false);
  assert.equal(res.statutoryForm, 'IR01');
  assert.equal(res.statutoryWindowHours, 24);
  assert.equal(res.shouldLockNote, true);
});
