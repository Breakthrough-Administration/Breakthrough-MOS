'use client';

import React, { useState, useMemo } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import {
  Calculator,
  MapPin,
  Users,
  Car,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Download,
  FileSpreadsheet,
  DollarSign,
  ShieldCheck,
  Info,
  ArrowRight,
  X
} from 'lucide-react';

export type PAPLMmmZone = 'MMM1' | 'MMM2' | 'MMM3' | 'MMM4' | 'MMM5' | 'MMM6' | 'MMM7';

export type ApportionmentMethod = 'EQUAL_SPLIT' | 'DURATION_WEIGHTED' | 'CUSTOM_PERCENT';

export type CancellationScenario =
  | 'NONE_DELIVERED'
  | 'SHORT_NOTICE_BEFORE_DEPARTURE'
  | 'SHORT_NOTICE_NO_SHOW_ON_ARRIVAL'
  | 'ADEQUATE_NOTICE_7PLUS_DAYS';

export interface SharedVisitParticipantStop {
  id: string;
  clientId: string;
  clientName: string;
  ndisNumber: string;
  practitionerName: string;
  directTherapyHours: number;
  nf2fMinutes: number;
  customWeightPct: number;
  serviceAgreementSigned: boolean;
  caseNoteLinked: boolean;
}

export const PAPL_MMM_ZONE_RULES: Record<
  PAPLMmmZone,
  {
    code: PAPLMmmZone;
    name: string;
    classification: string;
    maxOneWayTravelMins: number;
    remotePriceLoadingMultiplier: number;
    loadingLabel: string;
    ruleNotes: string;
  }
> = {
  MMM1: {
    code: 'MMM1',
    name: 'MMM 1 — Metropolitan Areas',
    classification: 'Metropolitan',
    maxOneWayTravelMins: 30,
    remotePriceLoadingMultiplier: 1.0,
    loadingLabel: '1.00× Base PAPL Cap',
    ruleNotes: 'Maximum 30 minutes provider labour travel time claimable per participant trip.'
  },
  MMM2: {
    code: 'MMM2',
    name: 'MMM 2 — Regional Centres',
    classification: 'Regional',
    maxOneWayTravelMins: 30,
    remotePriceLoadingMultiplier: 1.0,
    loadingLabel: '1.00× Base PAPL Cap',
    ruleNotes: 'Maximum 30 minutes provider labour travel time claimable per participant trip.'
  },
  MMM3: {
    code: 'MMM3',
    name: 'MMM 3 — Large Rural Towns',
    classification: 'Regional / Rural',
    maxOneWayTravelMins: 30,
    remotePriceLoadingMultiplier: 1.0,
    loadingLabel: '1.00× Base PAPL Cap',
    ruleNotes: 'Maximum 30 minutes provider labour travel time claimable per participant trip.'
  },
  MMM4: {
    code: 'MMM4',
    name: 'MMM 4 — Medium Rural Towns',
    classification: 'Rural',
    maxOneWayTravelMins: 60,
    remotePriceLoadingMultiplier: 1.0,
    loadingLabel: '1.00× Base PAPL Cap',
    ruleNotes: 'Maximum 60 minutes provider labour travel time claimable per participant trip.'
  },
  MMM5: {
    code: 'MMM5',
    name: 'MMM 5 — Small Rural Towns',
    classification: 'Rural',
    maxOneWayTravelMins: 60,
    remotePriceLoadingMultiplier: 1.0,
    loadingLabel: '1.00× Base PAPL Cap',
    ruleNotes: 'Maximum 60 minutes provider labour travel time claimable per participant trip.'
  },
  MMM6: {
    code: 'MMM6',
    name: 'MMM 6 — Remote Communities',
    classification: 'Remote (+40% PAPL Loading)',
    maxOneWayTravelMins: 90,
    remotePriceLoadingMultiplier: 1.4,
    loadingLabel: '1.40× (+40% Remote Loading)',
    ruleNotes: '40% Remote PAPL price limit loading applies; travel time governed by Service Agreement (90m reference cap).'
  },
  MMM7: {
    code: 'MMM7',
    name: 'MMM 7 — Very Remote Communities',
    classification: 'Very Remote (+50% PAPL Loading)',
    maxOneWayTravelMins: 120,
    remotePriceLoadingMultiplier: 1.5,
    loadingLabel: '1.50× (+50% Very Remote Loading)',
    ruleNotes: '50% Very Remote PAPL price limit loading applies; travel time governed by Service Agreement (120m reference cap).'
  }
};

const PAPL_SUPPORT_CATALOG = [
  {
    code: '07_002_0115_8_3',
    travelCode: '07_799_0115_8_3',
    name: 'Specialist Behavioural Intervention Support',
    baseCapAud: 244.22,
    category: 'Capacity Building — Improved Relationships'
  },
  {
    code: '07_001_0106_8_3',
    travelCode: '07_799_0106_8_3',
    name: 'Behaviour Management Plan Incl. Training in Implementation Strategies',
    baseCapAud: 193.99,
    category: 'Capacity Building — Improved Relationships'
  },
  {
    code: '15_056_0128_1_3',
    travelCode: '15_799_0128_1_3',
    name: 'Assessment, Recommendation, Therapy or Training — Other Professional',
    baseCapAud: 193.99,
    category: 'Capacity Building — Improved Daily Living'
  },
  {
    code: '15_054_0128_1_3',
    travelCode: '15_799_0128_1_3',
    name: 'Assessment, Recommendation, Therapy or Training — Psychology',
    baseCapAud: 214.41,
    category: 'Capacity Building — Improved Daily Living'
  }
];

function formatDdMmYy(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '04-11-26';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

export const NDISPAPLClaimCalculator: React.FC<{
  compactHeader?: boolean;
}> = ({ compactHeader = false }) => {
  const {
    clients,
    addBillingClaim,
    addAuditLog,
    addNotification
  } = useManagementStore();

  // Route & PAPL Parameters
  const [serviceDate, setServiceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedSupportCode, setSelectedSupportCode] = useState<string>('07_002_0115_8_3');
  const [customBaseHourlyRate, setCustomBaseHourlyRate] = useState<number>(244.22);
  const [mmmZone, setMmmZone] = useState<PAPLMmmZone>('MMM1');
  const [apportionmentMethod, setApportionmentMethod] = useState<ApportionmentMethod>('EQUAL_SPLIT');

  // Travel Time & Non-Labour Kilometre Inputs
  const [outboundTravelMinutes, setOutboundTravelMinutes] = useState<number>(28);
  const [includeReturnTravel, setIncludeReturnTravel] = useState<boolean>(true);
  const [returnTravelMinutes, setReturnTravelMinutes] = useState<number>(22);
  const [totalRouteKilometres, setTotalRouteKilometres] = useState<number>(32);
  const [kmReferenceRateAud, setKmReferenceRateAud] = useState<number>(0.99);
  const [parkingTollsAud, setParkingTollsAud] = useState<number>(0);

  // Short-Notice Cancellation State & 4 Statutory PAPL Conditions
  const [cancellationScenario, setCancellationScenario] =
    useState<CancellationScenario>('NONE_DELIVERED');
  const [clearBusinessDaysNotice, setClearBusinessDaysNotice] = useState<number>(1);
  const [cancellationConditions, setCancellationConditions] = useState({
    paplDesignatesEligible: true,
    serviceAgreementAuthorises: true,
    noAlternativeBillableWork: true,
    workerPaidForCancelledTime: true
  });

  // Shared Visit Participant Roster (Default 2 participants on a shared community visit run)
  const [sharedParticipants, setSharedParticipants] = useState<SharedVisitParticipantStop[]>(() => {
    const p1 = clients[0] || { id: 'cli-01', name: 'Lachlan Miller', ndisNumber: '430918273' };
    const p2 = clients[1] || { id: 'cli-02', name: 'Olivia Vance', ndisNumber: '431029384' };
    return [
      {
        id: 'stop-1',
        clientId: p1.id,
        clientName: p1.name,
        ndisNumber: p1.ndisNumber,
        practitionerName: 'Anitha Haripersad (Proficient Practitioner)',
        directTherapyHours: 1.5,
        nf2fMinutes: 30,
        customWeightPct: 50,
        serviceAgreementSigned: true,
        caseNoteLinked: true
      },
      {
        id: 'stop-2',
        clientId: p2.id,
        clientName: p2.name,
        ndisNumber: p2.ndisNumber,
        practitionerName: 'Anitha Haripersad (Proficient Practitioner)',
        directTherapyHours: 1.0,
        nf2fMinutes: 15,
        customWeightPct: 50,
        serviceAgreementSigned: true,
        caseNoteLinked: true
      }
    ];
  });

  const [toastBanner, setToastBanner] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);

  const showToast = (type: 'success' | 'warning', text: string) => {
    setToastBanner({ type, text });
    setTimeout(() => setToastBanner(null), 5000);
  };

  // Sync default base hourly rate when support item changes
  const handleSelectSupportItem = (code: string) => {
    setSelectedSupportCode(code);
    const matched = PAPL_SUPPORT_CATALOG.find((s) => s.code === code);
    if (matched) {
      setCustomBaseHourlyRate(matched.baseCapAud);
    }
  };

  // Add another participant to the shared visit run
  const handleAddParticipantStop = () => {
    if (sharedParticipants.length >= 6) {
      showToast('warning', 'Maximum 6 participants per shared travel run in calculator.');
      return;
    }
    const nextClient =
      clients[sharedParticipants.length % Math.max(1, clients.length)] ||
      clients[0] || { id: 'cli-new', name: 'Participant', ndisNumber: '430999111' };

    const newCount = sharedParticipants.length + 1;
    const equalPct = Number((100 / newCount).toFixed(1));

    setSharedParticipants((prev) => [
      ...prev.map((p) => ({ ...p, customWeightPct: equalPct })),
      {
        id: `stop-${Date.now()}`,
        clientId: nextClient.id,
        clientName: nextClient.name,
        ndisNumber: nextClient.ndisNumber,
        practitionerName: 'Anitha Haripersad (Proficient Practitioner)',
        directTherapyHours: 1.0,
        nf2fMinutes: 15,
        customWeightPct: equalPct,
        serviceAgreementSigned: true,
        caseNoteLinked: true
      }
    ]);
  };

  const handleRemoveParticipantStop = (stopId: string) => {
    if (sharedParticipants.length <= 1) return;
    setSharedParticipants((prev) => prev.filter((p) => p.id !== stopId));
  };

  const handleUpdateStop = (stopId: string, updates: Partial<SharedVisitParticipantStop>) => {
    setSharedParticipants((prev) =>
      prev.map((stop) => {
        if (stop.id !== stopId) return stop;
        if (updates.clientId) {
          const matchedClient = clients.find((c) => c.id === updates.clientId);
          return {
            ...stop,
            ...updates,
            clientName: matchedClient?.name || stop.clientName,
            ndisNumber: matchedClient?.ndisNumber || stop.ndisNumber
          };
        }
        return { ...stop, ...updates };
      })
    );
  };

  // Core PAPL Calculation & Apportionment Engine
  const calculationSummary = useMemo(() => {
    const zoneRule = PAPL_MMM_ZONE_RULES[mmmZone];
    const supportCatalogItem =
      PAPL_SUPPORT_CATALOG.find((s) => s.code === selectedSupportCode) || PAPL_SUPPORT_CATALOG[0];

    // 1. MMM Zone Adjusted Hourly Rate
    const effectiveHourlyRateAud = Number(
      (customBaseHourlyRate * zoneRule.remotePriceLoadingMultiplier).toFixed(2)
    );

    // 2. Travel Time Cap Enforcement (per leg)
    const cappedOutboundMins = Math.min(outboundTravelMinutes, zoneRule.maxOneWayTravelMins);
    const outboundTrimmedMins = Math.max(0, outboundTravelMinutes - cappedOutboundMins);

    const rawReturnMins = includeReturnTravel ? returnTravelMinutes : 0;
    const cappedReturnMins = includeReturnTravel
      ? Math.min(returnTravelMinutes, zoneRule.maxOneWayTravelMins)
      : 0;
    const returnTrimmedMins = Math.max(0, rawReturnMins - cappedReturnMins);

    // 3. Cancellation Rules Evaluation
    const all4CancellationConditionsMet =
      cancellationConditions.paplDesignatesEligible &&
      cancellationConditions.serviceAgreementAuthorises &&
      cancellationConditions.noAlternativeBillableWork &&
      cancellationConditions.workerPaidForCancelledTime &&
      clearBusinessDaysNotice < 7;

    let sessionBillingFactor = 1.0;
    let travelBillingFactor = 1.0;
    let nf2fBillingFactor = 1.0;
    let cancellationStatusNote = 'Standard Service Delivery (100% Direct Support + Apportioned Travel + NF2F)';

    if (cancellationScenario === 'ADEQUATE_NOTICE_7PLUS_DAYS') {
      sessionBillingFactor = 0;
      travelBillingFactor = 0;
      nf2fBillingFactor = 0;
      cancellationStatusNote =
        '≥ 7 Clear Business Days Notice Given — Not Claimable under NDIS PAPL ($0.00 AUD).';
    } else if (cancellationScenario === 'SHORT_NOTICE_BEFORE_DEPARTURE') {
      sessionBillingFactor = all4CancellationConditionsMet ? 1.0 : 0;
      travelBillingFactor = 0; // Travel not incurred when cancelled prior to departure
      nf2fBillingFactor = 0;
      cancellationStatusNote = all4CancellationConditionsMet
        ? `Short-Notice Cancellation (<7d, Prior to Departure) — 100% Agreed Session Fee Claimable; Unincurred Travel & Kilometres Excluded ($0.00).`
        : 'Short-Notice Cancellation Conditions Not Met — Check all 4 PAPL statutory criteria & <7 clear business days.';
    } else if (cancellationScenario === 'SHORT_NOTICE_NO_SHOW_ON_ARRIVAL') {
      sessionBillingFactor = all4CancellationConditionsMet ? 1.0 : 0;
      travelBillingFactor = all4CancellationConditionsMet ? 1.0 : 0;
      nf2fBillingFactor = 0;
      cancellationStatusNote = all4CancellationConditionsMet
        ? 'Short-Notice Cancellation (No-Show Upon Practitioner Arrival) — 100% Agreed Session Fee + Apportioned Incurred Travel Claimable.'
        : 'Short-Notice Cancellation Conditions Not Met — Check all 4 PAPL statutory criteria & <7 clear business days.';
    }

    const totalCappedTravelMins = (cappedOutboundMins + cappedReturnMins) * travelBillingFactor;
    const effectiveKilometres = totalRouteKilometres * travelBillingFactor;
    const effectiveParkingTollsAud = parkingTollsAud * travelBillingFactor;

    // 4. Apportionment Weights Calculation across N Shared Participants
    const countN = Math.max(1, sharedParticipants.length);
    const totalDirectHours = sharedParticipants.reduce((acc, s) => acc + s.directTherapyHours, 0);
    const totalCustomWeight = sharedParticipants.reduce((acc, s) => acc + s.customWeightPct, 0);

    const participantBreakdowns = sharedParticipants.map((stop) => {
      let weightFraction = 1 / countN;
      let weightFormulaLabel = `1 / ${countN} (${(weightFraction * 100).toFixed(1)}%)`;

      if (apportionmentMethod === 'DURATION_WEIGHTED' && totalDirectHours > 0) {
        weightFraction = stop.directTherapyHours / totalDirectHours;
        weightFormulaLabel = `${stop.directTherapyHours}h / ${totalDirectHours.toFixed(2)}h (${(
          weightFraction * 100
        ).toFixed(1)}%)`;
      } else if (apportionmentMethod === 'CUSTOM_PERCENT' && totalCustomWeight > 0) {
        weightFraction = stop.customWeightPct / totalCustomWeight;
        weightFormulaLabel = `${stop.customWeightPct}% / ${totalCustomWeight.toFixed(0)}% (${(
          weightFraction * 100
        ).toFixed(1)}%)`;
      }

      const billableDirectHours = Number((stop.directTherapyHours * sessionBillingFactor).toFixed(2));
      const directSessionAud = Number((billableDirectHours * effectiveHourlyRateAud).toFixed(2));

      const apportionedTravelMins = Number((totalCappedTravelMins * weightFraction).toFixed(1));
      const apportionedTravelHours = Number((apportionedTravelMins / 60).toFixed(2));
      const travelLabourAud = Number(((apportionedTravelMins / 60) * effectiveHourlyRateAud).toFixed(2));

      const apportionedKm = Number((effectiveKilometres * weightFraction).toFixed(2));
      const nonLabourKmAud = Number((apportionedKm * kmReferenceRateAud).toFixed(2));
      const apportionedTollsAud = Number((effectiveParkingTollsAud * weightFraction).toFixed(2));

      const effectiveNf2fMins = Number((stop.nf2fMinutes * nf2fBillingFactor).toFixed(0));
      const nf2fHours = Number((effectiveNf2fMins / 60).toFixed(2));
      const nf2fAud = Number(((effectiveNf2fMins / 60) * effectiveHourlyRateAud).toFixed(2));

      const totalParticipantClaimAud = Number(
        (
          directSessionAud +
          travelLabourAud +
          nonLabourKmAud +
          apportionedTollsAud +
          nf2fAud
        ).toFixed(2)
      );

      return {
        ...stop,
        weightFraction,
        weightFormulaLabel,
        billableDirectHours,
        directSessionAud,
        apportionedTravelMins,
        apportionedTravelHours,
        travelLabourAud,
        apportionedKm,
        nonLabourKmAud,
        apportionedTollsAud,
        effectiveNf2fMins,
        nf2fHours,
        nf2fAud,
        totalParticipantClaimAud
      };
    });

    const grandTotalRunAud = Number(
      participantBreakdowns.reduce((sum, p) => sum + p.totalParticipantClaimAud, 0).toFixed(2)
    );
    const totalLabourTravelAud = Number(
      participantBreakdowns.reduce((sum, p) => sum + p.travelLabourAud, 0).toFixed(2)
    );
    const totalNonLabourKmAud = Number(
      participantBreakdowns
        .reduce((sum, p) => sum + p.nonLabourKmAud + p.apportionedTollsAud, 0)
        .toFixed(2)
    );

    return {
      zoneRule,
      supportCatalogItem,
      effectiveHourlyRateAud,
      cappedOutboundMins,
      outboundTrimmedMins,
      cappedReturnMins,
      returnTrimmedMins,
      totalCappedTravelMins,
      effectiveKilometres,
      all4CancellationConditionsMet,
      cancellationStatusNote,
      participantBreakdowns,
      grandTotalRunAud,
      totalLabourTravelAud,
      totalNonLabourKmAud
    };
  }, [
    mmmZone,
    selectedSupportCode,
    customBaseHourlyRate,
    apportionmentMethod,
    outboundTravelMinutes,
    includeReturnTravel,
    returnTravelMinutes,
    totalRouteKilometres,
    kmReferenceRateAud,
    parkingTollsAud,
    cancellationScenario,
    clearBusinessDaysNotice,
    cancellationConditions,
    sharedParticipants
  ]);

  // Push all apportioned participant claims to the NDIS Billing & PACE ledger
  const handleQueueApportionedClaimsToLedger = () => {
    let queuedCount = 0;

    calculationSummary.participantBreakdowns.forEach((p) => {
      if (p.totalParticipantClaimAud <= 0) return;
      queuedCount += 1;
      const totalHours = Number(
        (p.billableDirectHours + p.apportionedTravelHours + p.nf2fHours).toFixed(2)
      );

      addBillingClaim({
        clientId: p.clientId,
        clientName: p.clientName,
        serviceDate,
        dateOfService: serviceDate,
        supportItemCode: selectedSupportCode,
        supportItemNumber: selectedSupportCode,
        ndisSupportItem: `${selectedSupportCode} — ${calculationSummary.supportCatalogItem.name} (${mmmZone}, Apportioned ${p.weightFormulaLabel})`,
        supportItemName: `${calculationSummary.supportCatalogItem.name} + Travel (${p.apportionedTravelMins}m / ${p.apportionedKm}km)`,
        practitionerName: p.practitionerName,
        hours: totalHours > 0 ? totalHours : 1,
        unitRate: calculationSummary.effectiveHourlyRateAud,
        unitPrice: calculationSummary.effectiveHourlyRateAud,
        rate: calculationSummary.effectiveHourlyRateAud,
        totalAmount: p.totalParticipantClaimAud,
        status: 'Pending',
        invoiceNumber: `INV-PAPL-${Date.now().toString().slice(-5)}-${queuedCount}`,
        isPaceCompliant: p.serviceAgreementSigned && p.caseNoteLinked
      });
    });

    if (queuedCount === 0) {
      showToast(
        'warning',
        'No billable amount ($0.00 AUD) to queue. Verify cancellation eligibility or session hours.'
      );
      return;
    }

    addAuditLog(
      'PAPL_APPORTIONED_CLAIMS_QUEUED',
      'claims',
      `papl-run-${Date.now()}`,
      `Queued ${queuedCount} apportioned NDIS PAPL claims (${mmmZone}, ${apportionmentMethod}, Total: $${calculationSummary.grandTotalRunAud.toFixed(2)} AUD) to PRODA Billing Ledger.`,
      {
        auditCategory: 'Billing & PRODA Claim',
        ndisPracticeStandard: 'NDIS Pricing Arrangements and Price Limits (PAPL) — Provider Travel & Shared Apportionment',
        severity: 'Low'
      }
    );

    addNotification({
      title: `Queued ${queuedCount} Apportioned PAPL Claim(s)`,
      message: `Total $${calculationSummary.grandTotalRunAud.toFixed(2)} AUD (${mmmZone}) apportioned across ${queuedCount} participant(s) and added to PRODA Billing queue.`,
      type: 'billing',
      severity: 'success',
      linkTab: 'billing'
    });

    showToast(
      'success',
      `Successfully queued ${queuedCount} apportioned participant claim(s) ($${calculationSummary.grandTotalRunAud.toFixed(2)} AUD total) to the NDIS Billing & PACE Ledger.`
    );
  };

  // Export Apportionment Schedule as CSV
  const handleExportApportionmentCSV = () => {
    const headers = [
      'ServiceDate_ISO_DD_MM_YY',
      'ParticipantName',
      'NDISNumber',
      'Practitioner',
      'MMMZone',
      'SupportItemCode',
      'EffectiveHourlyRateAUD',
      'ApportionmentWeight',
      'DirectSessionHours',
      'DirectSessionAUD',
      'ApportionedTravelMins',
      'TravelLabourAUD',
      'ApportionedKilometres',
      'NonLabourKmAUD',
      'NF2FMinutes',
      'NF2FAUD',
      'TotalParticipantClaimAUD'
    ];

    const rows = calculationSummary.participantBreakdowns.map((p) => [
      formatDdMmYy(serviceDate),
      `"${p.clientName}"`,
      p.ndisNumber,
      `"${p.practitionerName}"`,
      mmmZone,
      selectedSupportCode,
      calculationSummary.effectiveHourlyRateAud.toFixed(2),
      `"${p.weightFormulaLabel}"`,
      p.billableDirectHours.toFixed(2),
      p.directSessionAud.toFixed(2),
      p.apportionedTravelMins.toFixed(1),
      p.travelLabourAud.toFixed(2),
      p.apportionedKm.toFixed(2),
      p.nonLabourKmAud.toFixed(2),
      p.effectiveNf2fMins,
      p.nf2fAud.toFixed(2),
      p.totalParticipantClaimAud.toFixed(2)
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NDIS_PAPL_Apportioned_Travel_Claims_${formatDdMmYy(serviceDate)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('success', 'Exported NDIS PAPL Apportioned Travel & Claim Schedule CSV.');
  };

  return (
    <div className="space-y-5">
      {/* Top Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-teal-500/15 border border-teal-500/30 text-[11px] font-bold uppercase tracking-wider text-teal-300">
                NDIS PAPL Decision-Support Calculator
              </span>
              <span className="text-xs font-mono text-slate-400">
                MMM1–MMM7 Travel Caps · Shared Visit Apportionment · 7-Day Short-Notice Cancellations
              </span>
            </div>
            {!compactHeader && (
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                <Calculator className="w-6 h-6 text-teal-400 shrink-0" />
                <span>Interactive NDIS PAPL Travel, MMM Zone &amp; Shared Apportionment Calculator</span>
              </h2>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportApportionmentCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-teal-400" />
              <span>Export Apportionment CSV</span>
            </button>

            <button
              type="button"
              onClick={handleQueueApportionedClaimsToLedger}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-teal-950/40 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>
                Queue {sharedParticipants.length} Apportioned Claim(s) (${calculationSummary.grandTotalRunAud.toFixed(2)} AUD)
              </span>
            </button>
          </div>
        </div>

        {/* Statutory Provenance & Uncertainty Notice */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-slate-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-300">NDIS PAPL &amp; Service Agreement Verification Notice:</strong>{' '}
            This calculator applies the general NDIS Pricing Arrangements and Price Limits (PAPL) framework for Modified Monash Model (MMM1–MMM7) provider travel caps, shared visit apportionment, non-labour kilometre reference rate (<strong>${kmReferenceRateAud.toFixed(2)}/km AUD</strong>), and short-notice cancellations (&lt;7 clear business days). Because NDIA price limits are updated periodically, confirm the effective PAPL version, the participant&apos;s signed Service Agreement, and linked session evidence before submitting PRODA claims.
          </div>
        </div>

        {toastBanner && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              toastBanner.type === 'success'
                ? 'bg-teal-500/15 border-teal-500/30 text-teal-200'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>{toastBanner.text}</span>
            </div>
            <button onClick={() => setToastBanner(null)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* KPI Strip: Effective Rate, Capped Travel Time, Shared Apportionment Factor, Run Total */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            MMM Zone Adjusted Rate
          </span>
          <div className="text-2xl font-extrabold font-mono text-teal-400 tabular-nums">
            ${calculationSummary.effectiveHourlyRateAud.toFixed(2)}/hr
          </div>
          <p className="text-[11px] text-slate-400">
            {calculationSummary.zoneRule.code} ({calculationSummary.zoneRule.loadingLabel})
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            PAPL Capped Provider Travel
          </span>
          <div className="text-2xl font-extrabold font-mono text-sky-400 tabular-nums">
            {calculationSummary.totalCappedTravelMins} mins
          </div>
          <p className="text-[11px] text-slate-400">
            Cap: {calculationSummary.zoneRule.maxOneWayTravelMins}m/leg · Labour: $
            {calculationSummary.totalLabourTravelAud.toFixed(2)} AUD
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Shared Visit Apportionment
          </span>
          <div className="text-2xl font-extrabold font-mono text-indigo-400 tabular-nums">
            {sharedParticipants.length} Participant{sharedParticipants.length > 1 ? 's' : ''}
          </div>
          <p className="text-[11px] text-slate-400">
            {apportionmentMethod === 'EQUAL_SPLIT'
              ? `Equal 1/${sharedParticipants.length} Split`
              : apportionmentMethod === 'DURATION_WEIGHTED'
                ? 'Weighted by Session Hours'
                : 'Custom % Split'}{' '}
            · Km: ${calculationSummary.totalNonLabourKmAud.toFixed(2)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Run Claimable (AUD)
          </span>
          <div className="text-2xl font-extrabold font-mono text-emerald-400 tabular-nums">
            ${calculationSummary.grandTotalRunAud.toFixed(2)} AUD
          </div>
          <p className="text-[11px] text-slate-400">GST-Free (P1) across all apportioned stops</p>
        </div>
      </div>

      {/* Main Configuration Grid: 1. MMM Zone & Travel | 2. Short-Notice Cancellation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Panel 1: Support Item, MMM1-MMM7 Zone & Provider Travel Inputs */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-400" />
              <span>1. NDIS Support Item, MMM1–MMM7 Zone &amp; Travel Parameters</span>
            </h3>
            <span className="font-mono text-[11px] text-teal-400 font-bold">
              ISO Date: {formatDdMmYy(serviceDate)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-slate-300 font-semibold block">NDIS Support Item</label>
              <select
                value={selectedSupportCode}
                onChange={(e) => handleSelectSupportItem(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold"
              >
                {PAPL_SUPPORT_CATALOG.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code} — {item.name} (${item.baseCapAud}/hr)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">Service Date</label>
              <input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
              />
            </div>
          </div>

          {/* MMM1-MMM7 Zone Selector Buttons */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold block">
              Modified Monash Model (MMM1–MMM7) Geographic Classification
            </label>
            <div className="grid grid-cols-7 gap-1.5">
              {(Object.keys(PAPL_MMM_ZONE_RULES) as PAPLMmmZone[]).map((z) => {
                const active = mmmZone === z;
                const rule = PAPL_MMM_ZONE_RULES[z];
                return (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setMmmZone(z)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      active
                        ? 'bg-teal-600 border-teal-400 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-extrabold font-mono text-xs">{z}</div>
                    <div className="text-[9px] opacity-85">{rule.maxOneWayTravelMins}m cap</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-teal-300/90 pt-1">{calculationSummary.zoneRule.ruleNotes}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold block">Base Rate ($/hr)</label>
              <input
                type="number"
                step="0.01"
                value={customBaseHourlyRate}
                onChange={(e) => setCustomBaseHourlyRate(parseFloat(e.target.value) || 0)}
                className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono tabular-nums"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold block">Outbound Travel (m)</label>
              <input
                type="number"
                min="0"
                value={outboundTravelMinutes}
                onChange={(e) => setOutboundTravelMinutes(parseInt(e.target.value, 10) || 0)}
                className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono tabular-nums"
              />
              {calculationSummary.outboundTrimmedMins > 0 && (
                <span className="text-[10px] text-amber-400 block">
                  Capped at {calculationSummary.zoneRule.maxOneWayTravelMins}m (-{calculationSummary.outboundTrimmedMins}m)
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold flex items-center justify-between">
                <span>Return (m)</span>
                <input
                  type="checkbox"
                  checked={includeReturnTravel}
                  onChange={(e) => setIncludeReturnTravel(e.target.checked)}
                  title="Include eligible return travel time"
                  className="rounded border-slate-700 text-teal-500"
                />
              </label>
              <input
                type="number"
                min="0"
                disabled={!includeReturnTravel}
                value={returnTravelMinutes}
                onChange={(e) => setReturnTravelMinutes(parseInt(e.target.value, 10) || 0)}
                className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono tabular-nums disabled:opacity-40"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold block">Total Route (km)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={totalRouteKilometres}
                onChange={(e) => setTotalRouteKilometres(parseFloat(e.target.value) || 0)}
                className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold block">
                Non-Labour Vehicle Rate ($/km AUD)
              </label>
              <input
                type="number"
                step="0.01"
                value={kmReferenceRateAud}
                onChange={(e) => setKmReferenceRateAud(parseFloat(e.target.value) || 0)}
                className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono tabular-nums"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold block">
                Agreed Road Tolls / Parking ($ AUD)
              </label>
              <input
                type="number"
                step="0.50"
                min="0"
                value={parkingTollsAud}
                onChange={(e) => setParkingTollsAud(parseFloat(e.target.value) || 0)}
                className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Panel 2: Short-Notice Cancellation & Apportionment Mode */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>2. Short-Notice Cancellation &amp; Shared Apportionment Rules</span>
            </h3>
            <span className="text-[11px] font-mono text-amber-300 font-bold">
              PAPL &lt;7 Clear Business Days Rule
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold block">
              Attendance / Cancellation Scenario
            </label>
            <select
              value={cancellationScenario}
              onChange={(e) => setCancellationScenario(e.target.value as CancellationScenario)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold"
            >
              <option value="NONE_DELIVERED">
                Standard Service Delivered (Full Direct Support + Apportioned Travel + NF2F)
              </option>
              <option value="SHORT_NOTICE_BEFORE_DEPARTURE">
                Short-Notice Cancellation (&lt;7 Clear Business Days — Cancelled Prior to Departure)
              </option>
              <option value="SHORT_NOTICE_NO_SHOW_ON_ARRIVAL">
                Short-Notice Cancellation (Participant No-Show Upon Practitioner Arrival at Premises)
              </option>
              <option value="ADEQUATE_NOTICE_7PLUS_DAYS">
                Standard Cancellation (≥7 Clear Business Days Notice — $0.00 Non-Billable)
              </option>
            </select>
          </div>

          {cancellationScenario !== 'NONE_DELIVERED' && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300">
                  Clear Business Days Notice Provided by Participant/Nominee:
                </span>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={clearBusinessDaysNotice}
                  onChange={(e) => setClearBusinessDaysNotice(parseInt(e.target.value, 10) || 0)}
                  className="w-20 p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-right"
                />
              </div>

              <div className="space-y-1.5 pt-1 border-t border-slate-900">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Mandatory NDIS PAPL 4-Point Short-Notice Cancellation Checklist:
                </span>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cancellationConditions.paplDesignatesEligible}
                    onChange={(e) =>
                      setCancellationConditions((prev) => ({
                        ...prev,
                        paplDesignatesEligible: e.target.checked
                      }))
                    }
                    className="rounded border-slate-600 text-teal-500"
                  />
                  <span>1. Support item is designated eligible for Short-Notice Cancellation in PAPL</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cancellationConditions.serviceAgreementAuthorises}
                    onChange={(e) =>
                      setCancellationConditions((prev) => ({
                        ...prev,
                        serviceAgreementAuthorises: e.target.checked
                      }))
                    }
                    className="rounded border-slate-600 text-teal-500"
                  />
                  <span>2. Signed Participant Service Agreement includes Short-Notice Cancellation clause</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cancellationConditions.noAlternativeBillableWork}
                    onChange={(e) =>
                      setCancellationConditions((prev) => ({
                        ...prev,
                        noAlternativeBillableWork: e.target.checked
                      }))
                    }
                    className="rounded border-slate-600 text-teal-500"
                  />
                  <span>3. Provider could not find alternative billable work for the practitioner</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cancellationConditions.workerPaidForCancelledTime}
                    onChange={(e) =>
                      setCancellationConditions((prev) => ({
                        ...prev,
                        workerPaidForCancelledTime: e.target.checked
                      }))
                    }
                    className="rounded border-slate-600 text-teal-500"
                  />
                  <span>4. Provider is contractually required to pay the worker for the scheduled time</span>
                </label>
              </div>
            </div>
          )}

          {/* Shared Visit Apportionment Method */}
          <div className="space-y-1.5 pt-1">
            <label className="text-slate-300 font-semibold block">
              Shared Participant Visit Apportionment Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setApportionmentMethod('EQUAL_SPLIT')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  apportionmentMethod === 'EQUAL_SPLIT'
                    ? 'bg-teal-600/20 border-teal-500 text-teal-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold text-white">Equal Split (1/N)</div>
                <div className="text-[10px]">Standard PAPL equal division across {sharedParticipants.length} stops</div>
              </button>

              <button
                type="button"
                onClick={() => setApportionmentMethod('DURATION_WEIGHTED')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  apportionmentMethod === 'DURATION_WEIGHTED'
                    ? 'bg-teal-600/20 border-teal-500 text-teal-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold text-white">Session Duration Weighted</div>
                <div className="text-[10px]">Proportional to direct therapy hours (h_i / Σh)</div>
              </button>

              <button
                type="button"
                onClick={() => setApportionmentMethod('CUSTOM_PERCENT')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  apportionmentMethod === 'CUSTOM_PERCENT'
                    ? 'bg-teal-600/20 border-teal-500 text-teal-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold text-white">Custom Leg Weighting</div>
                <div className="text-[10px]">Agreed percentage per participant stop</div>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono">
            <strong className="text-teal-400">Active Rule Outcome:</strong> {calculationSummary.cancellationStatusNote}
          </div>
        </div>
      </div>

      {/* Shared Visit Participant Roster & Interactive Per-Participant Apportionment Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>
                3. Shared Visit Participant Roster &amp; Automatic Apportionment Schedule ({sharedParticipants.length}{' '}
                Participant{sharedParticipants.length > 1 ? 's' : ''})
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              When a practitioner travels to visit multiple NDIS participants in a single region/run, provider travel time ({calculationSummary.totalCappedTravelMins}m) and kilometres ({calculationSummary.effectiveKilometres}km) are automatically apportioned across participants so total claimed travel never exceeds 100% of actual travel.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddParticipantStop}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Participant to Shared Travel Run</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-2.5 px-3">Participant Stop</th>
                <th className="py-2.5 px-3">Delivering Practitioner</th>
                <th className="py-2.5 px-3 text-right">Direct Therapy (h)</th>
                <th className="py-2.5 px-3 text-right">NF2F Mins</th>
                <th className="py-2.5 px-3 text-right">Apportionment Share</th>
                <th className="py-2.5 px-3 text-right">Apportioned Travel Time</th>
                <th className="py-2.5 px-3 text-right">Apportioned Km ($0.99/km)</th>
                <th className="py-2.5 px-3 text-right">Total Claim ($ AUD)</th>
                <th className="py-2.5 px-2 text-center">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {calculationSummary.participantBreakdowns.map((row, index) => (
                <tr key={row.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <select
                        value={row.clientId}
                        onChange={(e) => handleUpdateStop(row.id, { clientId: e.target.value })}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white"
                      >
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (#{c.ndisNumber})
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <select
                      value={row.practitionerName}
                      onChange={(e) => handleUpdateStop(row.id, { practitionerName: e.target.value })}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                    >
                      <option value="Anitha Haripersad (Proficient Practitioner)">
                        Anitha Haripersad (Proficient)
                      </option>
                      <option value="Zubaida Baher (Proficient Practitioner)">
                        Zubaida Baher (Proficient)
                      </option>
                      <option value="Andreja Majcenovic (Core Practitioner)">
                        Andreja Majcenovic (Core)
                      </option>
                      <option value="Tania Bobovec (Entry Practitioner)">
                        Tania Bobovec (Entry)
                      </option>
                    </select>
                  </td>

                  <td className="py-3 px-3 text-right">
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={row.directTherapyHours}
                      onChange={(e) =>
                        handleUpdateStop(row.id, {
                          directTherapyHours: parseFloat(e.target.value) || 0
                        })
                      }
                      className="w-20 p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-right font-mono text-white tabular-nums"
                    />
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      ${row.directSessionAud.toFixed(2)} AUD
                    </div>
                  </td>

                  <td className="py-3 px-3 text-right">
                    <input
                      type="number"
                      step="15"
                      min="0"
                      value={row.nf2fMinutes}
                      onChange={(e) =>
                        handleUpdateStop(row.id, {
                          nf2fMinutes: parseInt(e.target.value, 10) || 0
                        })
                      }
                      className="w-20 p-1.5 rounded-lg bg-slate-950 border border-slate-700 text-right font-mono text-white tabular-nums"
                    />
                    <div className="text-[10px] font-mono text-amber-300 mt-0.5">
                      ${row.nf2fAud.toFixed(2)} AUD
                    </div>
                  </td>

                  <td className="py-3 px-3 text-right font-mono">
                    {apportionmentMethod === 'CUSTOM_PERCENT' ? (
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={row.customWeightPct}
                        onChange={(e) =>
                          handleUpdateStop(row.id, {
                            customWeightPct: parseFloat(e.target.value) || 0
                          })
                        }
                        className="w-16 p-1 rounded bg-slate-950 border border-teal-500 text-right text-teal-300 font-bold"
                      />
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-bold">
                        {row.weightFormulaLabel}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    <div className="font-bold text-sky-300">
                      {row.apportionedTravelMins}m ({row.apportionedTravelHours}h)
                    </div>
                    <div className="text-[10px] text-slate-400">
                      ${row.travelLabourAud.toFixed(2)} AUD
                    </div>
                  </td>

                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    <div className="font-bold text-indigo-300">{row.apportionedKm} km</div>
                    <div className="text-[10px] text-slate-400">
                      ${row.nonLabourKmAud.toFixed(2)}
                      {row.apportionedTollsAud > 0 ? ` + $${row.apportionedTollsAud.toFixed(2)} tolls` : ''}
                    </div>
                  </td>

                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    <div className="text-sm font-extrabold text-emerald-400">
                      ${row.totalParticipantClaimAud.toFixed(2)} AUD
                    </div>
                    <div className="text-[10px] text-slate-500">GST-Free (P1)</div>
                  </td>

                  <td className="py-3 px-2 text-center">
                    <button
                      type="button"
                      disabled={sharedParticipants.length <= 1}
                      onClick={() => handleRemoveParticipantStop(row.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Transparent Mathematical Formula & Audit Provenance Footer */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs font-mono text-slate-300">
          <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400 font-sans">
            Transparent Calculation Inputs, Method, Units &amp; PAPL Assumptions
          </div>
          <div>
            1. <strong>MMM Zone Rate Formula:</strong> Base Rate (${customBaseHourlyRate.toFixed(2)}/hr) ×{' '}
            {calculationSummary.zoneRule.code} Multiplier (
            {calculationSummary.zoneRule.remotePriceLoadingMultiplier.toFixed(2)}×) ={' '}
            <strong>${calculationSummary.effectiveHourlyRateAud.toFixed(2)}/hr AUD</strong>
          </div>
          <div>
            2. <strong>PAPL Travel Time Cap:</strong> min(Outbound {outboundTravelMinutes}m,{' '}
            {calculationSummary.zoneRule.maxOneWayTravelMins}m cap) +{' '}
            {includeReturnTravel
              ? `min(Return ${returnTravelMinutes}m, ${calculationSummary.zoneRule.maxOneWayTravelMins}m cap)`
              : '0m Return'}{' '}
            = <strong>{calculationSummary.totalCappedTravelMins}m total billable provider travel</strong>
          </div>
          <div>
            3. <strong>Per-Participant Shared Apportionment:</strong> Total Travel ({calculationSummary.totalCappedTravelMins}m &amp;{' '}
            {calculationSummary.effectiveKilometres}km @ ${kmReferenceRateAud.toFixed(2)}/km) × Participant Share (w_i) ={' '}
            <strong>${calculationSummary.totalLabourTravelAud.toFixed(2)} AUD Labour Travel</strong> +{' '}
            <strong>${calculationSummary.totalNonLabourKmAud.toFixed(2)} AUD Non-Labour Km/Tolls</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
