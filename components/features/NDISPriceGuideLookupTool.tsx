'use client';

import React, { useState, useMemo } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { NDISSupportItem, AttachedDocument, CompanyDocument } from '@/types';
import {
  Search,
  Sparkles,
  Plus,
  Trash2,
  FileCheck2,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Globe,
  ExternalLink,
  Copy,
  Check,
  Car,
  FileText,
  Clock,
  ShieldAlert,
  UserCheck,
  Download,
  TrendingUp,
  Edit3,
  History,
  X
} from 'lucide-react';

interface ScheduleLineItem {
  id: string;
  item: NDISSupportItem;
  quantity: number;
  unitRate: number;
  includeTravelHours: number;
  includeNf2fHours: number;
  notes: string;
}

export const NDISPriceGuideLookupTool: React.FC = () => {
  const {
    supportItems,
    clients,
    practitioners,
    updateClient,
    attachDocumentToClient,
    addCompanyDocument,
    addSupportItem,
    updateSupportItem,
    addAuditLog,
    setActiveTab,
    addNotification
  } = useManagementStore();

  // Support Item Edit / Create Modal state (NDIS Audit Tracked)
  const [editingSupportItem, setEditingSupportItem] = useState<NDISSupportItem | null>(null);
  const [isNewSupportItem, setIsNewSupportItem] = useState(false);
  const [supportItemForm, setSupportItemForm] = useState<{
    code: string;
    name: string;
    category: string;
    pricePerUnit: number;
    remotePricePerUnit: number;
    veryRemotePricePerUnit: number;
    unitOfMeasure: 'Hour' | 'Each' | 'Day' | 'Km' | 'Year';
    registrationGroup: string;
    registrationGroupNumber: string;
    travelClaimable: boolean;
    nonFaceToFaceClaimable: boolean;
    shortNoticeCancellationClaimable: boolean;
    ndiaReportWritingClaimable: boolean;
    description: string;
    auditReason: string;
  }>({
    code: '',
    name: '',
    category: 'Capacity Building - Relationships (Improved Relationships)',
    pricePerUnit: 214.41,
    remotePricePerUnit: 300.17,
    veryRemotePricePerUnit: 321.62,
    unitOfMeasure: 'Hour',
    registrationGroup: 'Specialist Positive Behaviour Support',
    registrationGroupNumber: '0110',
    travelClaimable: true,
    nonFaceToFaceClaimable: true,
    shortNoticeCancellationClaimable: true,
    ndiaReportWritingClaimable: true,
    description: '',
    auditReason: ''
  });

  const handleOpenEditSupportItem = (item: NDISSupportItem) => {
    setIsNewSupportItem(false);
    setEditingSupportItem(item);
    setSupportItemForm({
      code: item.code,
      name: item.name,
      category: item.category,
      pricePerUnit: item.pricePerUnit,
      remotePricePerUnit: item.remotePricePerUnit ?? Number((item.pricePerUnit * 1.4).toFixed(2)),
      veryRemotePricePerUnit: item.veryRemotePricePerUnit ?? Number((item.pricePerUnit * 1.5).toFixed(2)),
      unitOfMeasure: item.unitOfMeasure || 'Hour',
      registrationGroup: item.registrationGroup || 'Specialist Positive Behaviour Support',
      registrationGroupNumber: item.registrationGroupNumber || '0110',
      travelClaimable: Boolean(item.travelClaimable),
      nonFaceToFaceClaimable: Boolean(item.nonFaceToFaceClaimable),
      shortNoticeCancellationClaimable: Boolean(item.shortNoticeCancellationClaimable),
      ndiaReportWritingClaimable: Boolean(item.ndiaReportWritingClaimable),
      description: item.description || '',
      auditReason: ''
    });
  };

  const handleOpenCreateSupportItem = () => {
    setIsNewSupportItem(true);
    setEditingSupportItem({
      code: '',
      name: '',
      category: 'Capacity Building - Relationships (Improved Relationships)',
      pricePerUnit: 193.99,
      unitOfMeasure: 'Hour'
    });
    setSupportItemForm({
      code: '07_002_0115_8_3',
      name: '',
      category: 'Capacity Building - Relationships (Improved Relationships)',
      pricePerUnit: 193.99,
      remotePricePerUnit: 271.59,
      veryRemotePricePerUnit: 290.99,
      unitOfMeasure: 'Hour',
      registrationGroup: 'Specialist Positive Behaviour Support',
      registrationGroupNumber: '0110',
      travelClaimable: true,
      nonFaceToFaceClaimable: true,
      shortNoticeCancellationClaimable: true,
      ndiaReportWritingClaimable: true,
      description: '',
      auditReason: 'Added NDIS support item to practice catalogue'
    });
  };

  const handleSaveSupportItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportItemForm.code.trim() || !supportItemForm.name.trim() || !supportItemForm.auditReason.trim()) return;

    const payload: NDISSupportItem = {
      code: supportItemForm.code.trim(),
      name: supportItemForm.name.trim(),
      category: supportItemForm.category,
      pricePerUnit: Number(supportItemForm.pricePerUnit) || 0,
      remotePricePerUnit: Number(supportItemForm.remotePricePerUnit) || 0,
      veryRemotePricePerUnit: Number(supportItemForm.veryRemotePricePerUnit) || 0,
      unitOfMeasure: supportItemForm.unitOfMeasure,
      registrationGroup: supportItemForm.registrationGroup,
      registrationGroupNumber: supportItemForm.registrationGroupNumber,
      travelClaimable: supportItemForm.travelClaimable,
      nonFaceToFaceClaimable: supportItemForm.nonFaceToFaceClaimable,
      shortNoticeCancellationClaimable: supportItemForm.shortNoticeCancellationClaimable,
      ndiaReportWritingClaimable: supportItemForm.ndiaReportWritingClaimable,
      description: supportItemForm.description,
      effectiveDate: '2025-07-01'
    };

    if (isNewSupportItem) {
      addSupportItem(payload, supportItemForm.auditReason.trim());
    } else {
      updateSupportItem(payload.code, payload, supportItemForm.auditReason.trim());
    }

    setActionBanner(
      `${isNewSupportItem ? 'Added' : 'Updated'} Support Item ${payload.code} ($${payload.pricePerUnit.toFixed(
        2
      )} AUD/${payload.unitOfMeasure}). Change recorded in NDIS Compliance Audit Trail.`
    );
    setTimeout(() => setActionBanner(null), 4500);
    setEditingSupportItem(null);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [mmmZone, setMmmZone] = useState<'NATIONAL' | 'REMOTE' | 'VERY_REMOTE'>('NATIONAL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Selected Participant & Practitioner for Service Agreement & Budget Monitoring
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || '');
  const [selectedPractitionerId, setSelectedPractitionerId] = useState<string>(
    practitioners.find((p) => p.name === 'Anitha Haripersad')?.id ||
      practitioners[0]?.id ||
      'prac-205'
  );

  // Schedule of Supports line items (empty until staff select actual support items)
  const [scheduleLines, setScheduleLines] = useState<ScheduleLineItem[]>([]);

  // Live Grounding Lookup state
  const [isGroundingLoading, setIsGroundingLoading] = useState(false);
  const [groundingResult, setGroundingResult] = useState<{
    analysis: string;
    citations: Array<{ title: string; uri: string }>;
    effectiveDate: string;
  } | null>(null);
  const [groundingError, setGroundingError] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || clients[0] || null,
    [clients, selectedClientId]
  );

  const selectedPractitioner = useMemo(
    () => practitioners.find((p) => p.id === selectedPractitionerId) || practitioners[0] || null,
    [practitioners, selectedPractitionerId]
  );

  const getRateForZone = (item: NDISSupportItem, zone: 'NATIONAL' | 'REMOTE' | 'VERY_REMOTE'): number => {
    if (zone === 'VERY_REMOTE') {
      return item.veryRemotePricePerUnit ?? Number((item.pricePerUnit * 1.5).toFixed(2));
    }
    if (zone === 'REMOTE') {
      return item.remotePricePerUnit ?? Number((item.pricePerUnit * 1.4).toFixed(2));
    }
    return item.pricePerUnit;
  };

  const categories = useMemo(() => {
    const unique = Array.from(new Set(supportItems.map((i) => i.category)));
    return ['ALL', ...unique];
  }, [supportItems]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return supportItems.filter((item) => {
      const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesQuery =
        !q ||
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.registrationGroup || '').toLowerCase().includes(q) ||
        (item.registrationGroupNumber || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [supportItems, searchQuery, selectedCategory]);

  // Update schedule rates when MMM zone changes
  const handleZoneChange = (zone: 'NATIONAL' | 'REMOTE' | 'VERY_REMOTE') => {
    setMmmZone(zone);
    setScheduleLines((prev) =>
      prev.map((line) => ({
        ...line,
        unitRate: getRateForZone(line.item, zone)
      }))
    );
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const addItemToSchedule = (item: NDISSupportItem) => {
    const rate = getRateForZone(item, mmmZone);
    setScheduleLines((prev) => {
      const existing = prev.find((l) => l.item.code === item.code);
      if (existing) {
        return prev.map((l) =>
          l.item.code === item.code ? { ...l, quantity: l.quantity + 5 } : l
        );
      }
      return [
        ...prev,
        {
          id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          item,
          quantity: 10,
          unitRate: rate,
          includeTravelHours: item.travelClaimable ? 1 : 0,
          includeNf2fHours: item.nonFaceToFaceClaimable ? 2 : 0,
          notes: item.name
        }
      ];
    });
    setActionBanner(`Added ${item.code} (${item.name}) to Schedule of Supports.`);
    setTimeout(() => setActionBanner(null), 3500);
  };

  const removeScheduleLine = (id: string) => {
    setScheduleLines((prev) => prev.filter((l) => l.id !== id));
  };

  const updateScheduleLine = (id: string, updates: Partial<ScheduleLineItem>) => {
    setScheduleLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  };

  // Explicit AUD Calculations for Schedule of Supports & Budget Monitoring
  const scheduleCalculations = useMemo(() => {
    const linesWithTotals = scheduleLines.map((line) => {
      const directUnits = Math.max(0, Number(line.quantity) || 0);
      const travelUnits = line.item.travelClaimable
        ? Math.max(0, Number(line.includeTravelHours) || 0)
        : 0;
      const nf2fUnits = line.item.nonFaceToFaceClaimable
        ? Math.max(0, Number(line.includeNf2fHours) || 0)
        : 0;
      const totalBillableUnits = Number((directUnits + travelUnits + nf2fUnits).toFixed(2));
      const lineTotalAud = Number((totalBillableUnits * line.unitRate).toFixed(2));

      return {
        ...line,
        directUnits,
        travelUnits,
        nf2fUnits,
        totalBillableUnits,
        lineTotalAud
      };
    });

    const totalProposedAud = Number(
      linesWithTotals.reduce((sum, l) => sum + l.lineTotalAud, 0).toFixed(2)
    );
    const totalHours = Number(
      linesWithTotals.reduce((sum, l) => sum + l.totalBillableUnits, 0).toFixed(2)
    );

    const planTotalBudget = Number(selectedClient?.totalBudget || 0);
    const currentSpentBudget = Number(selectedClient?.spentBudget || 0);
    const remainingBeforeAgreement = Number(
      Math.max(0, planTotalBudget - currentSpentBudget).toFixed(2)
    );
    const projectedCumulativeCommitment = Number(
      (currentSpentBudget + totalProposedAud).toFixed(2)
    );
    const projectedRemainingAfterAgreement = Number(
      (planTotalBudget - projectedCumulativeCommitment).toFixed(2)
    );
    const isOverBudget = planTotalBudget > 0 && projectedCumulativeCommitment > planTotalBudget;
    const isUnfundedPlan = planTotalBudget === 0;

    const spentPct =
      planTotalBudget > 0
        ? Math.min(100, Number(((currentSpentBudget / planTotalBudget) * 100).toFixed(1)))
        : 0;
    const proposedPct =
      planTotalBudget > 0
        ? Math.min(
            100 - spentPct,
            Number(((totalProposedAud / planTotalBudget) * 100).toFixed(1))
          )
        : 0;
    const totalUtilisationPct =
      planTotalBudget > 0
        ? Number(((projectedCumulativeCommitment / planTotalBudget) * 100).toFixed(1))
        : 0;

    return {
      linesWithTotals,
      totalProposedAud,
      totalHours,
      planTotalBudget,
      currentSpentBudget,
      remainingBeforeAgreement,
      projectedCumulativeCommitment,
      projectedRemainingAfterAgreement,
      isOverBudget,
      isUnfundedPlan,
      spentPct,
      proposedPct,
      totalUtilisationPct
    };
  }, [scheduleLines, selectedClient]);

  // Live Google Search Grounding Lookup via Gemini 3.8 Flash
  const handleRunLiveGroundingLookup = async (customQuery?: string) => {
    const q = (customQuery ?? searchQuery).trim() || 'NDIS Specialist Behaviour Support 07_002_0115_8_3 price limit';
    setIsGroundingLoading(true);
    setGroundingError(null);

    try {
      const res = await fetch('/api/ndis/price-guide/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          participantContext: selectedClient
            ? {
                name: selectedClient.name,
                ndisNumber: selectedClient.ndisNumber,
                planManagementType: selectedClient.planManagementType,
                totalBudget: selectedClient.totalBudget,
                allocatedBudget: selectedClient.allocatedBudget,
                spentBudget: selectedClient.spentBudget
              }
            : null
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not complete live NDIA Price Guide grounding lookup.');
      }

      setGroundingResult({
        analysis: data.analysis,
        citations: data.citations || [],
        effectiveDate: data.effectiveDate || '2025-07-01'
      });
    } catch (err: any) {
      setGroundingError(err?.message || 'Live grounding lookup failed.');
    } finally {
      setIsGroundingLoading(false);
    }
  };

  // Save Service Agreement & Schedule of Supports to Participant Dossier + Company Library
  const handleGenerateServiceAgreement = () => {
    if (!selectedClient || scheduleCalculations.linesWithTotals.length === 0) return;

    const todayIso = new Date().toISOString().split('T')[0];
    const agreementRef = `SA-${selectedClient.ndisNumber || 'NDIS'}-${Date.now().toString().slice(-4)}`;

    const scheduleSummaryText = scheduleCalculations.linesWithTotals
      .map(
        (l) =>
          `${l.item.code} (${l.item.name}): ${l.directUnits} direct + ${l.travelUnits} travel + ${l.nf2fUnits} NF2F = ${l.totalBillableUnits} ${l.item.unitOfMeasure}s @ $${l.unitRate.toFixed(2)} AUD = $${l.lineTotalAud.toFixed(2)} AUD`
      )
      .join(' | ');

    const summaryText = `Draft NDIS Service Agreement & Schedule of Supports (${agreementRef}) prepared for staff & participant review. Lead Practitioner: ${
      selectedPractitioner?.name || 'Not stated'
    } (${selectedPractitioner?.pbsRegistrationLevel || 'Practitioner'}). Total Proposed Allocation: $${scheduleCalculations.totalProposedAud.toLocaleString(
      'en-AU',
      { minimumFractionDigits: 2 }
    )} AUD across ${scheduleCalculations.totalHours} total units (${mmmZone} Price Cap, Effective 2025-07-01). Items: ${scheduleSummaryText}`;

    const cleanFileName = `${selectedClient.name.replace(/\s+/g, '_')}_Service_Agreement_${todayIso}.pdf`;

    const attachedDoc: AttachedDocument = {
      id: `doc-sa-${Date.now()}`,
      name: `${selectedClient.name} - NDIS Service Agreement & Schedule of Supports (${agreementRef}).pdf`,
      url: `#service-agreement-${agreementRef}`,
      category: 'Service Agreement',
      mimeType: 'application/pdf',
      sizeBytes: 245000,
      fileSize: '245 KB',
      uploadedAt: new Date().toISOString(),
      uploadedBy: selectedPractitioner?.name || 'Breakthrough Practice Staff',
      metadata: {
        driveSubfolder: 'Service Agreement',
        extractedSummary: summaryText,
        agreementRef
      }
    };

    attachDocumentToClient(selectedClient.id, attachedDoc);

    // Also register in Company Document Library under Clinical Templates & Service Agreements
    const companyDoc: CompanyDocument = {
      id: `comp-sa-${Date.now()}`,
      title: `Service Agreement & Schedule of Supports — ${selectedClient.name} (${agreementRef})`,
      fileName: cleanFileName,
      category: 'Clinical Templates & Service Agreements',
      version: 'v1.0 (Draft for Review)',
      status: 'Current',
      effectiveDate: todayIso,
      reviewOrExpiryDate: selectedClient.planEndDate || '2027-01-01',
      uploadedBy: selectedPractitioner?.name || 'Clinical Intake Team',
      uploadedAt: new Date().toISOString(),
      fileSize: '245 KB',
      mimeType: 'application/pdf',
      summary: summaryText,
      extractedFacts: [
        { label: 'Participant', value: `${selectedClient.name} (NDIS #${selectedClient.ndisNumber})` },
        {
          label: 'Lead Practitioner',
          value: `${selectedPractitioner?.name || 'Assigned'} (${selectedPractitioner?.pbsRegistrationLevel || 'PBS'})`
        },
        {
          label: 'Total Schedule Value',
          value: `$${scheduleCalculations.totalProposedAud.toLocaleString('en-AU', { minimumFractionDigits: 2 })} AUD (GST-Free)`
        },
        { label: 'Pricing Zone & Basis', value: `${mmmZone} Cap (PAPL Effective 2025-07-01)` },
        { label: 'Approval Status', value: 'Draft — Requires Participant / Nominee Signature' }
      ],
      tags: ['Service Agreement', 'Schedule of Supports', selectedClient.name, agreementRef]
    };

    addCompanyDocument(companyDoc);

    // Update participant allocated budget & practitioner assignment if needed
    updateClient(selectedClient.id, {
      allocatedBudget: scheduleCalculations.totalProposedAud,
      primaryPractitionerId: selectedPractitioner?.id || selectedClient.primaryPractitionerId,
      primaryPractitionerName: selectedPractitioner?.name || selectedClient.primaryPractitionerName,
      serviceAgreementStatus: 'Pending Signature'
    });

    addNotification({
      title: `Service Agreement Draft Saved (${agreementRef})`,
      message: `Saved Schedule of Supports ($${scheduleCalculations.totalProposedAud.toLocaleString('en-AU', {
        minimumFractionDigits: 2
      })} AUD) to ${selectedClient.name}'s dossier and Company Library for review.`,
      type: 'billing',
      severity: 'low',
      linkTab: 'participants'
    });

    setActionBanner(
      `Draft Service Agreement (${agreementRef}) saved to ${selectedClient.name}'s dossier & Company Document Library ($${scheduleCalculations.totalProposedAud.toLocaleString(
        'en-AU',
        { minimumFractionDigits: 2 }
      )} AUD). Requires participant/nominee signature before claiming.`
    );
    setTimeout(() => setActionBanner(null), 6000);
  };

  // Download CSV of Schedule of Supports
  const handleDownloadScheduleCSV = () => {
    if (!selectedClient) return;
    const headers = [
      'ParticipantName',
      'NDISNumber',
      'SupportItemCode',
      'SupportItemName',
      'Category',
      'MMMZone',
      'DirectUnits',
      'ProviderTravelUnits',
      'NonFaceToFaceUnits',
      'TotalUnits',
      'UnitOfMeasure',
      'UnitRateAUD',
      'LineTotalAUD',
      'Notes'
    ].join(',');

    const rows = scheduleCalculations.linesWithTotals
      .map((l) =>
        [
          `"${selectedClient.name}"`,
          `"${selectedClient.ndisNumber}"`,
          `"${l.item.code}"`,
          `"${l.item.name}"`,
          `"${l.item.category}"`,
          `"${mmmZone}"`,
          l.directUnits,
          l.travelUnits,
          l.nf2fUnits,
          l.totalBillableUnits,
          `"${l.item.unitOfMeasure}"`,
          l.unitRate.toFixed(2),
          l.lineTotalAud.toFixed(2),
          `"${(l.notes || '').replace(/"/g, '""')}"`
        ].join(',')
      )
      .join('\n');

    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Schedule_of_Supports_${selectedClient.name.replace(/\s+/g, '_')}_${
      new Date().toISOString().split('T')[0]
    }.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Purpose & Regulatory Disclaimer */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 border border-slate-800 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-500/30 text-[10px] font-extrabold uppercase tracking-wider">
              NDIA PAPL 2025–26 Catalogue (Effective 01-07-25)
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
              All Amounts in AUD (GST-Free s38-38)
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-teal-400" />
            <span>Integrated NDIS Price Guide Search, Service Agreement Builder &amp; Budget Monitor</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-3xl">
            Search official NDIS support item codes and regional MMM price limits, verify current NDIA claiming rules via live Google Search Grounding, and build a Schedule of Supports with real-time participant budget burn-rate monitoring.
          </p>
        </div>

        {/* Regional MMM Zone Selector */}
        <div className="flex flex-col items-start lg:items-end gap-1.5 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Modified Monash Model (MMM) Price Cap Zone
          </span>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
            {(
              [
                { id: 'NATIONAL', label: 'National (MMM 1–5)' },
                { id: 'REMOTE', label: 'Remote (+40% MMM 6)' },
                { id: 'VERY_REMOTE', label: 'Very Remote (+50% MMM 7)' }
              ] as const
            ).map((zone) => (
              <button
                key={zone.id}
                type="button"
                onClick={() => handleZoneChange(zone.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  mmmZone === zone.id
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {zone.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {actionBanner && (
        <div className="p-3.5 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-200 text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{actionBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionBanner(null)}
            className="text-teal-300 hover:text-white text-xs font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Split Grid: Left = Price Guide Search & Live Grounding | Right = Service Agreement & Budget Monitor */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 cols): NDIS Support Item Search & Live Grounding */}
        <div className="xl:col-span-7 space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search NDIS code (e.g. 07_002_0115_8_3, 15_056), support name, or registration group..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <button
                type="button"
                onClick={() => handleRunLiveGroundingLookup()}
                disabled={isGroundingLoading}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 cursor-pointer whitespace-nowrap shrink-0"
                title="Query live NDIA Pricing Arrangements and Price Limits using Google Search Grounding"
              >
                <Sparkles className={`w-4 h-4 ${isGroundingLoading ? 'animate-spin' : ''}`} />
                <span>{isGroundingLoading ? 'Verifying NDIA Rules...' : 'Live NDIA Rule Lookup'}</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat === 'ALL' ? `All Categories (${supportItems.length})` : cat}
                </button>
              ))}
            </div>

            {/* Live Grounding Result Panel */}
            {groundingError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                <span>{groundingError}</span>
                <button
                  type="button"
                  onClick={() => setGroundingError(null)}
                  className="text-rose-300 hover:text-white font-bold"
                >
                  Close
                </button>
              </div>
            )}

            {groundingResult && (
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-extrabold text-indigo-200">
                      Breakthrough Assistant — Grounded NDIA Pricing &amp; Claiming Guidance
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGroundingResult(null)}
                    className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                  >
                    Hide
                  </button>
                </div>

                <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                  {groundingResult.analysis}
                </div>

                {groundingResult.citations.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                      Authoritative Web Sources Retrieved
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {groundingResult.citations.map((cit, idx) => (
                        <a
                          key={`${cit.uri}-${idx}`}
                          href={cit.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/20 text-[11px] font-semibold transition-colors"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[240px]">{cit.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Support Items Table */}
            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {filteredItems.map((item) => {
                const activeRate = getRateForZone(item, mmmZone);
                const isCopied = copiedCode === item.code;

                return (
                  <div
                    key={item.code}
                    className="p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800/90 hover:border-teal-500/30 transition-all space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(item.code)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 font-mono text-xs font-extrabold cursor-pointer"
                            title="Copy NDIS Support Item Number"
                          >
                            <span>{item.code}</span>
                            {isCopied ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-70" />
                            )}
                          </button>

                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 font-semibold">
                            {item.category}
                          </span>

                          {item.registrationGroup && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                              Reg Group #{item.registrationGroupNumber || '0110'}: {item.registrationGroup}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-white">{item.name}</h3>
                        {item.description && (
                          <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-lg font-extrabold text-white font-mono tabular-nums">
                            ${activeRate.toFixed(2)}{' '}
                            <span className="text-[11px] font-normal text-slate-400">
                              AUD / {item.unitOfMeasure}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Nat: ${item.pricePerUnit.toFixed(2)} · Rem: $
                            {(item.remotePricePerUnit ?? item.pricePerUnit * 1.4).toFixed(2)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditSupportItem(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                            title="Edit NDIS support item rate cap or claiming rules (Audit Logged)"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit Rate</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRunLiveGroundingLookup(`${item.code} ${item.name} NDIS claiming rules`)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-800 text-[11px] font-semibold cursor-pointer"
                            title="Check live NDIA claiming rules for this support item"
                          >
                            Rules
                          </button>
                          <button
                            type="button"
                            onClick={() => addItemToSchedule(item)}
                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add to Agreement</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Claiming Rules Badges */}
                    <div className="flex items-center gap-2 flex-wrap pt-1.5 border-t border-slate-900 text-[10px]">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold ${
                          item.travelClaimable
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : 'bg-slate-900 text-slate-500 border border-slate-800'
                        }`}
                      >
                        <Car className="w-3 h-3" />
                        Provider Travel: {item.travelClaimable ? 'Allowed' : 'Not Claimable'}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold ${
                          item.nonFaceToFaceClaimable
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : 'bg-slate-900 text-slate-500 border border-slate-800'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        Non-Face-to-Face: {item.nonFaceToFaceClaimable ? 'Allowed' : 'Not Claimable'}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold ${
                          item.ndiaReportWritingClaimable
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : 'bg-slate-900 text-slate-500 border border-slate-800'
                        }`}
                      >
                        <FileText className="w-3 h-3" />
                        NDIA Reports: {item.ndiaReportWritingClaimable ? 'Allowed' : 'Not Claimable'}
                      </span>

                      <span className="text-slate-500 ml-auto font-mono">
                        Effective: {item.effectiveDate || '2025-07-01'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="p-8 text-center rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <p className="text-xs text-slate-400">
                    No local catalogue items matched &quot;{searchQuery}&quot;.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRunLiveGroundingLookup()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Search Live NDIA Price Guide via Google Grounding</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): Service Agreement Builder & Participant Budget Monitoring */}
        <div className="xl:col-span-5 space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-teal-400" />
                  <span>Service Agreement &amp; Budget Monitor</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Model a Schedule of Supports and check participant NDIS plan budget capacity before signing
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadScheduleCSV}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                title="Download Schedule of Supports CSV"
              >
                <Download className="w-3.5 h-3.5 text-teal-400" />
                <span>CSV</span>
              </button>
            </div>

            {/* Participant & Lead Practitioner Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Select NDIS Participant</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (#{c.ndisNumber}) — ${(c.totalBudget || 0).toLocaleString('en-AU')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                  <span>Assign Lead Practitioner</span>
                </label>
                <select
                  value={selectedPractitionerId}
                  onChange={(e) => setSelectedPractitionerId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold"
                >
                  {practitioners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.pbsRegistrationLevel || p.position})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Participant Budget Monitoring Card */}
            {selectedClient && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Live Participant Plan Budget Monitor
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      {selectedClient.name}{' '}
                      <span className="text-xs font-mono text-teal-400">
                        (NDIS #{selectedClient.ndisNumber})
                      </span>
                    </h4>
                  </div>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-bold">
                    {selectedClient.planManagementType || 'Plan-Managed'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Total Plan Budget</span>
                    <span className="text-xs font-extrabold text-white font-mono tabular-nums">
                      ${scheduleCalculations.planTotalBudget.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Spent to Date</span>
                    <span className="text-xs font-extrabold text-sky-400 font-mono tabular-nums">
                      ${scheduleCalculations.currentSpentBudget.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Proposed Schedule</span>
                    <span className="text-xs font-extrabold text-teal-400 font-mono tabular-nums">
                      ${scheduleCalculations.totalProposedAud.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Multi-segment Budget Utilisation Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                      <span>Projected Plan Utilisation</span>
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        scheduleCalculations.isOverBudget
                          ? 'text-rose-400'
                          : scheduleCalculations.isUnfundedPlan
                          ? 'text-amber-400'
                          : 'text-teal-300'
                      }`}
                    >
                      {scheduleCalculations.isUnfundedPlan
                        ? 'Plan Budget Not Yet Recorded ($0.00)'
                        : `${scheduleCalculations.totalUtilisationPct}% ($${scheduleCalculations.projectedRemainingAfterAgreement.toLocaleString(
                            'en-AU',
                            { minimumFractionDigits: 2 }
                          )} AUD remaining)`}
                    </span>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden flex border border-slate-800">
                    <div
                      className="h-full bg-sky-500 transition-all"
                      style={{ width: `${scheduleCalculations.spentPct}%` }}
                      title={`Current Spent: $${scheduleCalculations.currentSpentBudget.toFixed(2)} AUD`}
                    />
                    <div
                      className={`h-full transition-all ${
                        scheduleCalculations.isOverBudget ? 'bg-rose-500' : 'bg-teal-500'
                      }`}
                      style={{ width: `${scheduleCalculations.proposedPct}%` }}
                      title={`Proposed Schedule: $${scheduleCalculations.totalProposedAud.toFixed(2)} AUD`}
                    />
                  </div>
                </div>

                {scheduleCalculations.isOverBudget && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Budget Over-Allocation Warning:</strong> Proposed Schedule of Supports ($
                      {scheduleCalculations.totalProposedAud.toLocaleString('en-AU', { minimumFractionDigits: 2 })}{' '}
                      AUD) plus current spend exceeds the recorded NDIS Plan budget by $
                      {Math.abs(scheduleCalculations.projectedRemainingAfterAgreement).toLocaleString('en-AU', {
                        minimumFractionDigits: 2
                      })}{' '}
                      AUD. Adjust hours or confirm an updated NDIS Plan before executing.
                    </div>
                  </div>
                )}

                {scheduleCalculations.isUnfundedPlan && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Recorded Plan Budget is $0.00 AUD:</strong> Saving this Service Agreement will set{' '}
                      {selectedClient.name}&apos;s allocated NDIS budget to{' '}
                      <strong>
                        ${scheduleCalculations.totalProposedAud.toLocaleString('en-AU', { minimumFractionDigits: 2 })}{' '}
                        AUD
                      </strong>{' '}
                      pending NDIS Plan verification.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Schedule of Supports Line Items */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">
                  Schedule of Supports Line Items ({scheduleCalculations.linesWithTotals.length})
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Total: {scheduleCalculations.totalHours} units
                </span>
              </div>

              {scheduleCalculations.linesWithTotals.map((line) => (
                <div
                  key={line.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-teal-400 font-bold text-[11px]">
                        {line.item.code}
                      </span>
                      <h5 className="font-bold text-white text-xs">{line.item.name}</h5>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeScheduleLine(line.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                      title="Remove line item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block">
                        Direct ({line.item.unitOfMeasure}s)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={line.quantity}
                        onChange={(e) =>
                          updateScheduleLine(line.id, { quantity: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block">
                        Travel ({line.item.travelClaimable ? 'Hrs' : 'N/A'})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        disabled={!line.item.travelClaimable}
                        value={line.includeTravelHours}
                        onChange={(e) =>
                          updateScheduleLine(line.id, {
                            includeTravelHours: parseFloat(e.target.value) || 0
                          })
                        }
                        className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs disabled:opacity-40"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block">
                        NF2F ({line.item.nonFaceToFaceClaimable ? 'Hrs' : 'N/A'})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        disabled={!line.item.nonFaceToFaceClaimable}
                        value={line.includeNf2fHours}
                        onChange={(e) =>
                          updateScheduleLine(line.id, {
                            includeNf2fHours: parseFloat(e.target.value) || 0
                          })
                        }
                        className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs disabled:opacity-40"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px]">
                    <span className="text-slate-400 font-mono">
                      {line.totalBillableUnits} {line.item.unitOfMeasure}s × ${line.unitRate.toFixed(2)} AUD
                    </span>
                    <span className="font-extrabold text-teal-300 font-mono tabular-nums">
                      ${line.lineTotalAud.toLocaleString('en-AU', { minimumFractionDigits: 2 })} AUD
                    </span>
                  </div>
                </div>
              ))}

              {scheduleCalculations.linesWithTotals.length === 0 && (
                <div className="p-6 text-center rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                  Click <strong>&quot;Add to Agreement&quot;</strong> on any NDIS Support Item on the left to build a Schedule of Supports.
                </div>
              )}
            </div>

            {/* Explicit Calculation Method Summary & Save Button */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">
                  Total Proposed Service Agreement Value (GST-Free):
                </span>
                <span className="text-lg font-extrabold text-teal-400 font-mono tabular-nums">
                  ${scheduleCalculations.totalProposedAud.toLocaleString('en-AU', { minimumFractionDigits: 2 })} AUD
                </span>
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed">
                <strong>Evidence &amp; Compliance Note:</strong> Calculations use the {mmmZone} price limit (NDIA PAPL effective 01-07-25). Draft Service Agreements require staff review, verification against the participant&apos;s active NDIS Plan categories, and participant/nominee signature before supports are delivered or claimed.
              </p>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-900">
                <div>
                  <span className="text-[11px] font-bold text-slate-300 block">
                    Service Agreement Governance Status:
                  </span>
                  <span className="text-[10px] text-slate-400">
                    All status changes are logged to the NDIS Compliance Audit Trail
                  </span>
                </div>
                {selectedClient && (
                  <select
                    value={selectedClient.serviceAgreementStatus || 'Not stated'}
                    onChange={(e) => {
                      updateClient(selectedClient.id, {
                        serviceAgreementStatus: e.target.value
                      });
                      setActionBanner(
                        `Service Agreement status for ${selectedClient.name} updated to "${e.target.value}" and logged in NDIS Compliance Audit Trail.`
                      );
                      setTimeout(() => setActionBanner(null), 4000);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-teal-300 cursor-pointer"
                  >
                    <option value="Not stated">Not stated</option>
                    <option value="Draft">Draft (In Preparation)</option>
                    <option value="Pending Signature">Pending Participant / Nominee Signature</option>
                    <option value="Signed & Active">Signed &amp; Active</option>
                    <option value="Review Required">Review Required</option>
                  </select>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!selectedClient || scheduleCalculations.linesWithTotals.length === 0}
                  onClick={handleGenerateServiceAgreement}
                  className="flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-950/50 cursor-pointer"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>
                    Save Draft Service Agreement &amp; Schedule to {selectedClient?.name || 'Participant'} Dossier
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('audit-logs')}
                  className="py-3 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Inspect NDIS Compliance Audit Trail"
                >
                  <History className="w-4 h-4 text-teal-400" />
                  <span>Audit Log</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit / Add NDIS Support Item Modal (Compliance Audit Logged) */}
      {editingSupportItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {isNewSupportItem ? 'Register NDIS Support Item' : `Edit NDIS Support Item — ${editingSupportItem.code}`}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Changes to price limits and claiming rules are logged in the NDIS Compliance Audit Trail
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSupportItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupportItem} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-amber-300 mb-1">
                  Mandatory NDIS Audit Reason for Support Item Change *
                </label>
                <input
                  type="text"
                  required
                  value={supportItemForm.auditReason}
                  onChange={(e) => setSupportItemForm((prev) => ({ ...prev, auditReason: e.target.value }))}
                  placeholder="e.g., Updated to 2025-26 NDIA PAPL price limit / Verified NF2F rule"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-amber-500/40 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Support Item Code *</label>
                  <input
                    type="text"
                    required
                    disabled={!isNewSupportItem}
                    value={supportItemForm.code}
                    onChange={(e) => setSupportItemForm((prev) => ({ ...prev, code: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Unit of Measure</label>
                  <select
                    value={supportItemForm.unitOfMeasure}
                    onChange={(e) =>
                      setSupportItemForm((prev) => ({
                        ...prev,
                        unitOfMeasure: e.target.value as 'Hour' | 'Each' | 'Day' | 'Km' | 'Year'
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="Hour">Hour</option>
                    <option value="Each">Each</option>
                    <option value="Day">Day</option>
                    <option value="Km">Km</option>
                    <option value="Year">Year</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Support Item Name *</label>
                <input
                  type="text"
                  required
                  value={supportItemForm.name}
                  onChange={(e) => setSupportItemForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">National Cap ($ AUD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={supportItemForm.pricePerUnit}
                    onChange={(e) =>
                      setSupportItemForm((prev) => ({ ...prev, pricePerUnit: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Remote Cap ($ AUD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={supportItemForm.remotePricePerUnit}
                    onChange={(e) =>
                      setSupportItemForm((prev) => ({ ...prev, remotePricePerUnit: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Very Remote ($ AUD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={supportItemForm.veryRemotePricePerUnit}
                    onChange={(e) =>
                      setSupportItemForm((prev) => ({ ...prev, veryRemotePricePerUnit: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={supportItemForm.travelClaimable}
                    onChange={(e) =>
                      setSupportItemForm((prev) => ({ ...prev, travelClaimable: e.target.checked }))
                    }
                  />
                  <span>Provider Travel Claimable</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={supportItemForm.nonFaceToFaceClaimable}
                    onChange={(e) =>
                      setSupportItemForm((prev) => ({ ...prev, nonFaceToFaceClaimable: e.target.checked }))
                    }
                  />
                  <span>Non-Face-to-Face (NF2F) Claimable</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSupportItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold cursor-pointer"
                >
                  Save Support Item &amp; Log Audit Trail
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
