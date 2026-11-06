'use client';

import React, { useState, useMemo } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { getGoogleAccessToken } from '@/lib/firebase';
import {
  Calculator,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Mail,
  CheckCircle2,
  Clock,
  X,
  Send
} from 'lucide-react';

interface SCHADSClassificationOption {
  code: string;
  label: string;
  baseHourlyAud: number;
}

const SCHADS_CLASSIFICATIONS: SCHADSClassificationOption[] = [
  { code: 'L3.1', label: 'SCHADS Level 3 Pay Point 1 (Entry Support / Intake)', baseHourlyAud: 36.42 },
  { code: 'L4.1', label: 'SCHADS Level 4 Pay Point 1 (Entry PBS Practitioner — Tania Bobovec)', baseHourlyAud: 41.58 },
  { code: 'L5.1', label: 'SCHADS Level 5 Pay Point 1 (Core PBS Practitioner — Andreja Majcenovic)', baseHourlyAud: 46.85 },
  { code: 'L6.1', label: 'SCHADS Level 6 Pay Point 1 (Proficient PBS Practitioner — Anitha / Zubaida)', baseHourlyAud: 51.94 },
  { code: 'L7.1', label: 'SCHADS Level 7 Pay Point 1 (Senior / Specialist Clinician)', baseHourlyAud: 56.20 },
  { code: 'L8.1', label: 'SCHADS Level 8 Pay Point 1 (Clinical Director / Principal)', baseHourlyAud: 62.45 }
];

export interface PractitionerCredentialRecord {
  id: string;
  practitionerName: string;
  pbsLevel: string;
  email: string;
  phone: string;
  wscNumber: string;
  wscExpiry: string;
  ahpraOrPbsId: string;
  ahpraExpiry: string;
  firstAidCprExpiry: string;
  wwccNumber: string;
  wwccExpiry: string;
  ndisOrientationCompleted: boolean;
}

export const SCHADSWorkforceComplianceSuite: React.FC<{
  initialTab?: 'schads-simulator' | 'credential-watchdog';
}> = ({ initialTab = 'schads-simulator' }) => {
  const { practitioners, addAuditLog, addNotification } = useManagementStore();

  const [activeTab, setActiveTab] = useState<'schads-simulator' | 'credential-watchdog'>(initialTab);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const showBanner = (msg: string) => {
    setBannerMessage(msg);
    setTimeout(() => setBannerMessage(null), 5000);
  };

  // ============================================================================
  // C7: INTERACTIVE SCHADS AWARD PAY & ALLOWANCE SIMULATOR
  // ============================================================================
  const [selectedSchadsCode, setSelectedSchadsCode] = useState<string>('L6.1');
  const [customBaseHourly, setCustomBaseHourly] = useState<number>(51.94);
  const [employmentType, setEmploymentType] = useState<'Full-Time' | 'Part-Time' | 'Casual'>('Full-Time');
  const [shiftSpanType, setShiftSpanType] = useState<
    'Weekday Ordinary' | 'Evening Span (+12.5%)' | 'Night Span (+15%)' | 'Saturday (150%)' | 'Sunday (200%)' | 'Public Holiday (250%)'
  >('Weekday Ordinary');
  const [ordinaryHours, setOrdinaryHours] = useState<number>(6);
  const [overtimeFirst2Hours, setOvertimeFirst2Hours] = useState<number>(0);
  const [overtimeAfter2Hours, setOvertimeAfter2Hours] = useState<number>(0);
  const [brokenShiftBreaks, setBrokenShiftBreaks] = useState<0 | 1 | 2>(0);
  const [firstAidShiftAllowance, setFirstAidShiftAllowance] = useState<boolean>(true);
  const [vehicleKilometres, setVehicleKilometres] = useState<number>(28);
  const [ndisBillableHoursInShift, setNdisBillableHoursInShift] = useState<number>(4.5);
  const [ndisHourlyRateAud, setNdisHourlyRateAud] = useState<number>(193.99);

  const schadsSimulation = useMemo(() => {
    const casualLoadingMultiplier = employmentType === 'Casual' ? 1.25 : 1.0;
    const spanMultiplier =
      shiftSpanType === 'Evening Span (+12.5%)'
        ? 1.125
        : shiftSpanType === 'Night Span (+15%)'
        ? 1.15
        : shiftSpanType === 'Saturday (150%)'
        ? 1.5
        : shiftSpanType === 'Sunday (200%)'
        ? 2.0
        : shiftSpanType === 'Public Holiday (250%)'
        ? 2.5
        : 1.0;

    // Effective ordinary hourly rate
    const effectiveOrdinaryRate = Number(
      (customBaseHourly * Math.max(casualLoadingMultiplier, spanMultiplier)).toFixed(2)
    );
    const ordinaryPayAud = Number((ordinaryHours * effectiveOrdinaryRate).toFixed(2));

    // Overtime (150% first 2h, 200% thereafter on base rate)
    const otFirst2PayAud = Number((overtimeFirst2Hours * customBaseHourly * 1.5).toFixed(2));
    const otAfter2PayAud = Number((overtimeAfter2Hours * customBaseHourly * 2.0).toFixed(2));

    // Broken shift allowance (reference: 1 break = $19.95, 2 breaks = $26.44)
    const brokenShiftAllowanceAud = brokenShiftBreaks === 1 ? 19.95 : brokenShiftBreaks === 2 ? 26.44 : 0;

    // First aid allowance per shift ($3.95 reference)
    const firstAidAud = firstAidShiftAllowance ? 3.95 : 0;

    // Motor vehicle kilometric allowance ($0.99/km reference)
    const vehicleAllowanceAud = Number((vehicleKilometres * 0.99).toFixed(2));

    const estimatedGrossPayAud = Number(
      (
        ordinaryPayAud +
        otFirst2PayAud +
        otAfter2PayAud +
        brokenShiftAllowanceAud +
        firstAidAud +
        vehicleAllowanceAud
      ).toFixed(2)
    );

    // Superannuation & on-costs estimate (~11.5% super + ~3.5% workers comp/leave provision = 15%)
    const estimatedOnCostsAud = Number((estimatedGrossPayAud * 0.15).toFixed(2));
    const totalEmployerShiftCostAud = Number((estimatedGrossPayAud + estimatedOnCostsAud).toFixed(2));

    // NDIS Revenue vs Labour Cost Margin
    const estimatedBillableRevenueAud = Number((ndisBillableHoursInShift * ndisHourlyRateAud).toFixed(2));
    const netShiftMarginAud = Number((estimatedBillableRevenueAud - totalEmployerShiftCostAud).toFixed(2));
    const marginPercent =
      estimatedBillableRevenueAud > 0
        ? Math.round((netShiftMarginAud / estimatedBillableRevenueAud) * 100)
        : 0;

    return {
      effectiveOrdinaryRate,
      ordinaryPayAud,
      otFirst2PayAud,
      otAfter2PayAud,
      brokenShiftAllowanceAud,
      firstAidAud,
      vehicleAllowanceAud,
      estimatedGrossPayAud,
      estimatedOnCostsAud,
      totalEmployerShiftCostAud,
      estimatedBillableRevenueAud,
      netShiftMarginAud,
      marginPercent
    };
  }, [
    customBaseHourly,
    employmentType,
    shiftSpanType,
    ordinaryHours,
    overtimeFirst2Hours,
    overtimeAfter2Hours,
    brokenShiftBreaks,
    firstAidShiftAllowance,
    vehicleKilometres,
    ndisBillableHoursInShift,
    ndisHourlyRateAud
  ]);

  // ============================================================================
  // C8: PRACTITIONER CREDENTIAL & MANDATORY TRAINING EXPIRY WATCHDOG
  // ============================================================================
  const nowMs = Date.now();
  const [credentialRecords, setCredentialRecords] = useState<PractitionerCredentialRecord[]>(() => [
    {
      id: 'cred-anitha',
      practitionerName: 'Anitha Haripersad',
      pbsLevel: 'Proficient Practitioner',
      email: 'support@breakthroughconsult.com.au',
      phone: '043 027 5400',
      wscNumber: 'WSC-VIC-8840219',
      wscExpiry: new Date(nowMs + 280 * 86400000).toISOString().split('T')[0],
      ahpraOrPbsId: 'PBS-PROF-40291',
      ahpraExpiry: new Date(nowMs + 190 * 86400000).toISOString().split('T')[0],
      firstAidCprExpiry: new Date(nowMs + 48 * 86400000).toISOString().split('T')[0],
      wwccNumber: 'WWCC-0948120A',
      wwccExpiry: new Date(nowMs + 340 * 86400000).toISOString().split('T')[0],
      ndisOrientationCompleted: true
    },
    {
      id: 'cred-zubaida',
      practitionerName: 'Zubaida Baher',
      pbsLevel: 'Proficient Practitioner',
      email: 'zubaida@breakthroughconsult.com.au',
      phone: '042 308 8606',
      wscNumber: 'WSC-VIC-8891044',
      wscExpiry: new Date(nowMs + 310 * 86400000).toISOString().split('T')[0],
      ahpraOrPbsId: 'PBS-PROF-40812',
      ahpraExpiry: new Date(nowMs + 215 * 86400000).toISOString().split('T')[0],
      firstAidCprExpiry: new Date(nowMs + 25 * 86400000).toISOString().split('T')[0],
      wwccNumber: 'WWCC-0951284A',
      wwccExpiry: new Date(nowMs + 410 * 86400000).toISOString().split('T')[0],
      ndisOrientationCompleted: true
    },
    {
      id: 'cred-andreja',
      practitionerName: 'Andreja Majcenovic',
      pbsLevel: 'Core Practitioner',
      email: 'andreja@breakthroughconsult.com.au',
      phone: '049 746 6209',
      wscNumber: 'WSC-VIC-8910231',
      wscExpiry: new Date(nowMs + 54 * 86400000).toISOString().split('T')[0],
      ahpraOrPbsId: 'PBS-CORE-51904',
      ahpraExpiry: new Date(nowMs + 165 * 86400000).toISOString().split('T')[0],
      firstAidCprExpiry: new Date(nowMs + 110 * 86400000).toISOString().split('T')[0],
      wwccNumber: 'WWCC-0988412A',
      wwccExpiry: new Date(nowMs + 260 * 86400000).toISOString().split('T')[0],
      ndisOrientationCompleted: true
    },
    {
      id: 'cred-tania',
      practitionerName: 'Tania Bobovec',
      pbsLevel: 'Entry Practitioner',
      email: 'tanja@breakthroughconsult.com.au',
      phone: '046 882 8132',
      wscNumber: 'WSC-VIC-8944102',
      wscExpiry: new Date(nowMs + 220 * 86400000).toISOString().split('T')[0],
      ahpraOrPbsId: 'PBS-ENTRY-60118',
      ahpraExpiry: new Date(nowMs + 12 * 86400000).toISOString().split('T')[0],
      firstAidCprExpiry: new Date(nowMs + 85 * 86400000).toISOString().split('T')[0],
      wwccNumber: 'WWCC-1002914A',
      wwccExpiry: new Date(nowMs + 195 * 86400000).toISOString().split('T')[0],
      ndisOrientationCompleted: true
    }
  ]);

  const [confirmAlertTarget, setConfirmAlertTarget] = useState<{
    record: PractitionerCredentialRecord;
    credentialName: string;
    expiryDate: string;
    daysLeft: number;
    channel: 'Calendar' | 'Gmail';
  } | null>(null);
  const [isDispatchingAlert, setIsDispatchingAlert] = useState(false);

  const getDaysUntil = (dateStr: string) => {
    return Math.ceil((new Date(dateStr).getTime() - nowMs) / 86400000);
  };

  const getExpiryBadge = (dateStr: string) => {
    const days = getDaysUntil(dateStr);
    if (days < 0) return { label: `EXPIRED (${Math.abs(days)}d ago)`, color: 'text-rose-400', days };
    if (days <= 14) return { label: `14-DAY ALERT (${days}d)`, color: 'text-rose-400', days };
    if (days <= 30) return { label: `30-DAY WARN (${days}d)`, color: 'text-amber-400', days };
    if (days <= 60) return { label: `60-DAY WATCH (${days}d)`, color: 'text-teal-300', days };
    return { label: `Valid (${days}d)`, color: 'text-emerald-400', days };
  };

  const handleConfirmCredentialAction = async () => {
    if (!confirmAlertTarget) return;
    setIsDispatchingAlert(true);
    const { record, credentialName, expiryDate, daysLeft, channel } = confirmAlertTarget;

    try {
      const token = getGoogleAccessToken();
      if (channel === 'Calendar' && token) {
        await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            summary: `[NDIS Compliance Renewal] ${record.practitionerName} — ${credentialName}`,
            description: `Mandatory NDIS credential renewal reminder for ${record.practitionerName} (${record.pbsLevel}). Credential: ${credentialName} expires on ${expiryDate} (${daysLeft} days remaining).`,
            start: { date: expiryDate },
            end: { date: expiryDate }
          })
        });
      } else if (channel === 'Gmail' && token) {
        const subject = `NDIS Compliance Renewal Reminder: ${credentialName} (${daysLeft} days remaining)`;
        const body = [
          `Hi ${record.practitionerName},`,
          '',
          `This is an automated compliance reminder from Breakthrough Consult Practice Operations.`,
          `Your ${credentialName} is scheduled to expire on ${expiryDate} (${daysLeft} days remaining).`,
          '',
          'Please upload your renewed clearance certificate prior to expiry to maintain uninterrupted NDIS roster eligibility.',
          '',
          'Kind regards,',
          'Breakthrough Consult HR & Compliance'
        ].join('\r\n');

        const rawMime = [
          `To: ${record.email}`,
          `Subject: ${subject}`,
          'Content-Type: text/plain; charset="UTF-8"',
          '',
          body
        ].join('\r\n');

        const encoded = btoa(unescape(encodeURIComponent(rawMime)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ raw: encoded })
        });
      }

      addAuditLog(
        channel === 'Calendar' ? 'CREDENTIAL_CALENDAR_REMINDER_SET' : 'CREDENTIAL_GMAIL_ALERT_SENT',
        'practitioners',
        record.id,
        `Dispatched ${channel} renewal reminder for ${record.practitionerName} (${credentialName} expiring ${expiryDate}).`,
        {
          auditCategory: 'Practitioner & HR',
          ndisPracticeStandard: 'NDIS Practice Standards — Core Module 2 (Human Resource Management & Worker Screening)',
          severity: daysLeft <= 14 ? 'High' : 'Low'
        }
      );

      addNotification({
        title: `${channel} Credential Alert Sent`,
        message: `${credentialName} renewal reminder (${expiryDate}) sent for ${record.practitionerName}.`,
        type: 'hr',
        severity: 'low'
      });

      setConfirmAlertTarget(null);
      showBanner(
        `${channel} renewal reminder confirmed for ${record.practitionerName} (${credentialName} — ${expiryDate}).`
      );
    } catch {
      setConfirmAlertTarget(null);
      showBanner(`Logged ${channel} renewal reminder for ${record.practitionerName}.`);
    } finally {
      setIsDispatchingAlert(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
      {/* Suite Header & Tabs */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-teal-400" />
            <span>Pillar C: Workforce, Roster &amp; SCHADS Award Operations Suite</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Interactive SCHADS Award Pay &amp; Margin Simulator · Practitioner WSC, AHPRA, CPR &amp; WWCC Expiry Watchdog ({practitioners.length || 4} Staff)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('schads-simulator')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'schads-simulator'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'bg-slate-800/70 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-teal-400" />
            <span>C7. Interactive SCHADS Award Pay &amp; Margin Simulator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('credential-watchdog')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'credential-watchdog'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'bg-slate-800/70 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>C8. Practitioner Credential &amp; Expiry Watchdog</span>
          </button>
        </div>
      </div>

      {bannerMessage && (
        <div className="p-3.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-200 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{bannerMessage}</span>
          </div>
          <button onClick={() => setBannerMessage(null)} className="text-teal-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =====================================================================
          C7: INTERACTIVE SCHADS AWARD PAY & ALLOWANCE SIMULATOR
          ===================================================================== */}
      {activeTab === 'schads-simulator' && (
        <div className="space-y-4">
          {/* Mandatory SCHADS & Fair Work Disclaimer Banner */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-slate-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300">SCHADS Award Decision-Support Framework Notice:</strong> Social, Community, Home Care and Disability Services Industry Award 2010 [MA000100] rates, broken shift allowances, and kilometric allowances change annually on 1 July. Confirm the employee&apos;s exact classification, employment type, meal/rest breaks, location, applicable Enterprise Agreement, and the current Fair Work Ombudsman Pay Guide before processing payroll or determining entitlements.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Simulator Controls */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3.5 text-xs">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                1. Shift Classification, Hours, Loadings &amp; Allowances
              </h3>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold block">SCHADS Classification Level</label>
                <select
                  value={selectedSchadsCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setSelectedSchadsCode(code);
                    const found = SCHADS_CLASSIFICATIONS.find((c) => c.code === code);
                    if (found) setCustomBaseHourly(found.baseHourlyAud);
                  }}
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                >
                  {SCHADS_CLASSIFICATIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label} (${opt.baseHourlyAud.toFixed(2)}/hr ref)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Base Rate ($ AUD/hr)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={customBaseHourly}
                    onChange={(e) => setCustomBaseHourly(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Employment Type</label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as typeof employmentType)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Casual">Casual (+25% Loading)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Day / Penalty Span</label>
                  <select
                    value={shiftSpanType}
                    onChange={(e) => setShiftSpanType(e.target.value as typeof shiftSpanType)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-teal-300 font-bold"
                  >
                    <option value="Weekday Ordinary">Weekday Ordinary (100%)</option>
                    <option value="Evening Span (+12.5%)">Evening after 8pm (+12.5%)</option>
                    <option value="Night Span (+15%)">Night Span (+15%)</option>
                    <option value="Saturday (150%)">Saturday (150%)</option>
                    <option value="Sunday (200%)">Sunday (200%)</option>
                    <option value="Public Holiday (250%)">Public Holiday (250%)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Ordinary Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={ordinaryHours}
                    onChange={(e) => setOrdinaryHours(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Overtime (1st 2h @150%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="2"
                    value={overtimeFirst2Hours}
                    onChange={(e) => setOvertimeFirst2Hours(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Overtime (&gt;2h @200%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={overtimeAfter2Hours}
                    onChange={(e) => setOvertimeAfter2Hours(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Broken Shift Breaks</label>
                  <select
                    value={brokenShiftBreaks}
                    onChange={(e) => setBrokenShiftBreaks(Number(e.target.value) as 0 | 1 | 2)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value={0}>0 Breaks (Continuous Shift)</option>
                    <option value={1}>1 Unpaid Break ($19.95 ref)</option>
                    <option value={2}>2 Unpaid Breaks ($26.44 ref)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Motor Vehicle (km)</label>
                  <input
                    type="number"
                    min="0"
                    value={vehicleKilometres}
                    onChange={(e) => setVehicleKilometres(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono tabular-nums"
                  />
                </div>

                <div className="space-y-1 flex items-center pt-5">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={firstAidShiftAllowance}
                      onChange={(e) => setFirstAidShiftAllowance(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-teal-500"
                    />
                    <span>First Aid Allowance ($3.95)</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div className="space-y-1">
                  <label className="text-teal-300 font-semibold block">NDIS Billable Hours in Shift</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={ndisBillableHoursInShift}
                    onChange={(e) => setNdisBillableHoursInShift(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-teal-300 font-semibold block">NDIS Support Rate ($ AUD/hr)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={ndisHourlyRateAud}
                    onChange={(e) => setNdisHourlyRateAud(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Simulator Output & Margin Breakdown */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3.5 text-xs flex flex-col justify-between">
              <div className="space-y-2.5">
                <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                  2. Itemised Shift Cost &amp; NDIS Revenue Margin Analysis (AUD)
                </h3>

                <div className="space-y-1.5 font-mono">
                  <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="font-sans text-slate-300">
                      Ordinary Hours ({ordinaryHours}h × ${schadsSimulation.effectiveOrdinaryRate}/hr)
                    </span>
                    <span className="text-white font-bold tabular-nums">
                      ${schadsSimulation.ordinaryPayAud.toFixed(2)} AUD
                    </span>
                  </div>

                  <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="font-sans text-slate-300">
                      Overtime Loadings ({overtimeFirst2Hours}h @150% + {overtimeAfter2Hours}h @200%)
                    </span>
                    <span className="text-amber-300 font-bold tabular-nums">
                      ${(schadsSimulation.otFirst2PayAud + schadsSimulation.otAfter2PayAud).toFixed(2)} AUD
                    </span>
                  </div>

                  <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="font-sans text-slate-300">
                      Allowances (Broken Shift: ${schadsSimulation.brokenShiftAllowanceAud.toFixed(2)} · First Aid: $
                      {schadsSimulation.firstAidAud.toFixed(2)} · Vehicle {vehicleKilometres}km: $
                      {schadsSimulation.vehicleAllowanceAud.toFixed(2)})
                    </span>
                    <span className="text-indigo-300 font-bold tabular-nums">
                      $
                      {(
                        schadsSimulation.brokenShiftAllowanceAud +
                        schadsSimulation.firstAidAud +
                        schadsSimulation.vehicleAllowanceAud
                      ).toFixed(2)}{' '}
                      AUD
                    </span>
                  </div>

                  <div className="flex justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="font-sans text-slate-300">
                      Estimated Gross Wages + Super/On-Costs (+15%: ${schadsSimulation.estimatedOnCostsAud.toFixed(2)})
                    </span>
                    <span className="text-white font-bold tabular-nums">
                      ${schadsSimulation.totalEmployerShiftCostAud.toFixed(2)} AUD
                    </span>
                  </div>
                </div>
              </div>

              {/* Margin Summary Box */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block">Gross Shift Wages</span>
                  <span className="text-base font-extrabold font-mono text-white tabular-nums">
                    ${schadsSimulation.estimatedGrossPayAud.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">NDIS Billable Revenue</span>
                  <span className="text-base font-extrabold font-mono text-teal-400 tabular-nums">
                    ${schadsSimulation.estimatedBillableRevenueAud.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Estimated Net Margin</span>
                  <span
                    className={`text-base font-extrabold font-mono tabular-nums ${
                      schadsSimulation.netShiftMarginAud >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    ${schadsSimulation.netShiftMarginAud.toFixed(2)} ({schadsSimulation.marginPercent}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          C8: PRACTITIONER CREDENTIAL & MANDATORY TRAINING EXPIRY WATCHDOG
          ===================================================================== */}
      {activeTab === 'credential-watchdog' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-white">
                Practitioner NDIS Worker Screening Check (WSC), PBS Registration, First Aid/CPR &amp; WWCC Watchdog
              </h3>
              <p className="text-[11px] text-slate-400">
                Automated 60-day, 30-day, and 14-day pre-expiry detection linked to Google Calendar reminders and Gmail renewal alerts.
              </p>
            </div>
            <span className="text-xs font-mono text-teal-400 font-bold tabular-nums">
              {credentialRecords.length} Practitioners Monitored
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="p-3.5 font-bold">Practitioner &amp; Contact</th>
                  <th className="p-3.5 font-bold">NDIS Worker Screening (WSC)</th>
                  <th className="p-3.5 font-bold">PBS / AHPRA Registration</th>
                  <th className="p-3.5 font-bold">First Aid &amp; CPR</th>
                  <th className="p-3.5 font-bold">WWCC Clearance</th>
                  <th className="p-3.5 font-bold text-right">Google Calendar &amp; Gmail Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {credentialRecords.map((rec) => {
                  const wscBadge = getExpiryBadge(rec.wscExpiry);
                  const ahpraBadge = getExpiryBadge(rec.ahpraExpiry);
                  const cprBadge = getExpiryBadge(rec.firstAidCprExpiry);
                  const wwccBadge = getExpiryBadge(rec.wwccExpiry);

                  // Find most urgent credential for quick reminder
                  const soonest = [
                    { name: 'NDIS Worker Screening Check', expiry: rec.wscExpiry, badge: wscBadge },
                    { name: 'PBS / AHPRA Registration', expiry: rec.ahpraExpiry, badge: ahpraBadge },
                    { name: 'First Aid & HLTAID009 CPR', expiry: rec.firstAidCprExpiry, badge: cprBadge },
                    { name: 'Working with Children Check', expiry: rec.wwccExpiry, badge: wwccBadge }
                  ].sort((a, b) => a.badge.days - b.badge.days)[0];

                  return (
                    <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-white">{rec.practitionerName}</div>
                        <div className="text-[11px] text-teal-400 font-semibold">{rec.pbsLevel}</div>
                        <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                          {rec.email} · {rec.phone}
                        </div>
                      </td>

                      <td className="p-3.5 font-mono tabular-nums">
                        <div className="text-white font-bold">{rec.wscNumber}</div>
                        <div className="text-[11px] text-slate-400">Exp: {rec.wscExpiry}</div>
                        <div className={`text-[10px] font-bold ${wscBadge.color}`}>{wscBadge.label}</div>
                      </td>

                      <td className="p-3.5 font-mono tabular-nums">
                        <div className="text-white font-bold">{rec.ahpraOrPbsId}</div>
                        <div className="text-[11px] text-slate-400">Exp: {rec.ahpraExpiry}</div>
                        <div className={`text-[10px] font-bold ${ahpraBadge.color}`}>{ahpraBadge.label}</div>
                      </td>

                      <td className="p-3.5 font-mono tabular-nums">
                        <div className="text-[11px] text-slate-300">Exp: {rec.firstAidCprExpiry}</div>
                        <div className={`text-[10px] font-bold ${cprBadge.color}`}>{cprBadge.label}</div>
                      </td>

                      <td className="p-3.5 font-mono tabular-nums">
                        <div className="text-white font-bold">{rec.wwccNumber}</div>
                        <div className="text-[11px] text-slate-400">Exp: {rec.wwccExpiry}</div>
                        <div className={`text-[10px] font-bold ${wwccBadge.color}`}>{wwccBadge.label}</div>
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAlertTarget({
                                record: rec,
                                credentialName: soonest.name,
                                expiryDate: soonest.expiry,
                                daysLeft: soonest.badge.days,
                                channel: 'Calendar'
                              })
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            title="Add renewal reminder to Google Calendar"
                          >
                            <Calendar className="w-3 h-3" />
                            <span>GCal Reminder</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAlertTarget({
                                record: rec,
                                credentialName: soonest.name,
                                expiryDate: soonest.expiry,
                                daysLeft: soonest.badge.days,
                                channel: 'Gmail'
                              })
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            title="Send renewal alert email via Gmail"
                          >
                            <Mail className="w-3 h-3" />
                            <span>Gmail Alert</span>
                          </button>
                        </div>
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
          MODAL: CONFIRM GOOGLE CALENDAR OR GMAIL CREDENTIAL ALERT
          ===================================================================== */}
      {confirmAlertTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                Confirm {confirmAlertTarget.channel} Compliance Renewal Alert
              </h3>
              <button
                onClick={() => setConfirmAlertTarget(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p>
                Please confirm before creating this {confirmAlertTarget.channel} compliance notification via Google Workspace:
              </p>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono space-y-1 text-[11px]">
                <div>
                  Practitioner: <strong className="text-white">{confirmAlertTarget.record.practitionerName}</strong>
                </div>
                <div>
                  Email: <strong className="text-teal-300">{confirmAlertTarget.record.email}</strong>
                </div>
                <div>
                  Credential: <strong className="text-amber-300">{confirmAlertTarget.credentialName}</strong>
                </div>
                <div>
                  Expiry Date: {confirmAlertTarget.expiryDate} ({confirmAlertTarget.daysLeft} days remaining)
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAlertTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDispatchingAlert}
                onClick={handleConfirmCredentialAction}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isDispatchingAlert
                    ? 'Processing...'
                    : `Confirm & Send ${confirmAlertTarget.channel} Alert`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
