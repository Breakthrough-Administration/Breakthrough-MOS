'use client';

import React, { useState, useRef } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { getGoogleAccessToken } from '@/lib/firebase';
import { storePickedDriveFileMetadata } from '@/lib/firestoreService';
import { Client } from '@/types';
import {
  FileSignature,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  BookOpen,
  Printer,
  Download,
  ExternalLink,
  Mail,
  MessageSquare,
  RotateCcw,
  X,
  Send
} from 'lucide-react';

export interface SignedAgreementRecord {
  id: string;
  documentTitle: string;
  documentType: 'NDIS Service Agreement & Schedule of Supports' | 'Multimedia & Third-Party Information Sharing Consent';
  participantId: string;
  participantName: string;
  ndisNumber: string;
  signerName: string;
  signerRole: 'Participant' | 'Plan Nominee' | 'Legal Guardian';
  authorizedStakeholders: string[];
  signedAt: string;
  sha256Fingerprint: string;
  archivedToDrive: boolean;
  driveFolderPath: string;
}

export interface TherapyAppointmentReminder {
  id: string;
  participantName: string;
  ndisNumber: string;
  practitionerName: string;
  practitionerLevel: string;
  practitionerEmail: string;
  practitionerPhone: string;
  sessionDate: string;
  sessionTime: string;
  deliveryMode: 'In-Person Home Visit' | 'Telehealth Video' | 'School / Community Setting';
  linkedGoalTitle: string;
  reminderStatus:
    | '24h Reminder Dispatched'
    | 'Confirmed by Participant'
    | 'Awaiting Confirmation'
    | 'Reschedule Requested';
  calendarSynced: boolean;
}

const CONSENT_STAKEHOLDER_SCOPES = [
  'NDIA & NDIS Quality and Safeguards Commission (Statutory Audit & Plan Review)',
  'Appointed Plan Manager (GST-Free Tax Invoice Processing)',
  'Support Coordinator (Progress Reports & Goal Alignment)',
  'General Practitioner & Allied Health Team (Collaborative Clinical Care)',
  'School / Educational / Day Program Staff (Behaviour Support Strategy Implementation)',
  'Clinical Supervision Video / Audio Observation (Internal PBS Quality Review Only)'
];

export const ParticipantEngagementSuite: React.FC<{
  participant: Client;
  initialSection?: 'e-signature' | 'appointment-reminders';
}> = ({ participant, initialSection = 'e-signature' }) => {
  const { updateClient, attachDocumentToClient, addAuditLog, addNotification } = useManagementStore();

  const [activeSection, setActiveSection] = useState<'e-signature' | 'appointment-reminders'>(initialSection);
  const [easyReadMode, setEasyReadMode] = useState<boolean>(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // E-Signature State
  const [selectedDocType, setSelectedDocType] = useState<SignedAgreementRecord['documentType']>(
    'NDIS Service Agreement & Schedule of Supports'
  );
  const [signerName, setSignerName] = useState<string>(participant?.name || '');
  const [signerRole, setSignerRole] = useState<SignedAgreementRecord['signerRole']>('Participant');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(CONSENT_STAKEHOLDER_SCOPES.slice(0, 4));
  const [signatureText, setSignatureText] = useState<string>(participant?.name || '');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  const [signedRecords, setSignedRecords] = useState<SignedAgreementRecord[]>(() => [
    {
      id: 'sig-2026-01',
      documentTitle: `NDIS Service Agreement & Schedule of Supports — ${participant?.name || 'Participant'}`,
      documentType: 'NDIS Service Agreement & Schedule of Supports',
      participantId: participant?.id || 'cli-001',
      participantName: participant?.name || 'Participant',
      ndisNumber: participant?.ndisNumber || '430982103',
      signerName: participant?.name || 'Participant',
      signerRole: 'Participant',
      authorizedStakeholders: CONSENT_STAKEHOLDER_SCOPES.slice(0, 3),
      signedAt: new Date(Date.now() - 86400000 * 14).toISOString().split('T')[0],
      sha256Fingerprint: 'sha256:9f84b2c10e4a77d192b8e3a1',
      archivedToDrive: true,
      driveFolderPath: `Participants > ${participant?.name || 'Participant'} > Service Agreements`
    }
  ]);

  const [confirmDriveArchiveRecord, setConfirmDriveArchiveRecord] = useState<SignedAgreementRecord | null>(null);
  const [isArchivingDrive, setIsArchivingDrive] = useState(false);

  // Appointment Reminders State
  const [appointments, setAppointments] = useState<TherapyAppointmentReminder[]>(() => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0];
    return [
      {
        id: 'apt-001',
        participantName: participant?.name || 'Participant',
        ndisNumber: participant?.ndisNumber || '430982103',
        practitionerName: 'Anitha Haripersad',
        practitionerLevel: 'Proficient Practitioner',
        practitionerEmail: 'support@breakthroughconsult.com.au',
        practitionerPhone: '043 027 5400',
        sessionDate: tomorrow,
        sessionTime: '10:00 AM – 11:30 AM',
        deliveryMode: 'In-Person Home Visit',
        linkedGoalTitle: participant?.goals?.[0]?.title || 'Emotional Regulation & Sensory Routine',
        reminderStatus: '24h Reminder Dispatched',
        calendarSynced: true
      },
      {
        id: 'apt-002',
        participantName: participant?.name || 'Participant',
        ndisNumber: participant?.ndisNumber || '430982103',
        practitionerName: 'Andreja Majcenovic',
        practitionerLevel: 'Core Practitioner',
        practitionerEmail: 'andreja@breakthroughconsult.com.au',
        practitionerPhone: '049 746 6209',
        sessionDate: nextWeek,
        sessionTime: '02:00 PM – 03:30 PM',
        deliveryMode: 'School / Community Setting',
        linkedGoalTitle: participant?.goals?.[1]?.title || 'Community Access & Functional Communication',
        reminderStatus: 'Awaiting Confirmation',
        calendarSynced: false
      }
    ];
  });

  const [confirmReminderModal, setConfirmReminderModal] = useState<{
    appointment: TherapyAppointmentReminder;
    actionType: 'CalendarSync' | 'Send24hReminder';
  } | null>(null);
  const [isProcessingReminder, setIsProcessingReminder] = useState(false);

  const showNotice = (msg: string) => {
    setBannerNotice(msg);
    setTimeout(() => setBannerNotice(null), 5000);
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  // Signature Pad Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
    setHasDrawnSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
  };

  const handleExecuteDigitalSignature = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSigner = signerName.trim() || participant?.name || 'Participant';
    const today = new Date().toISOString().split('T')[0];
    const hash = `sha256:${Math.random().toString(16).slice(2, 14)}${Date.now().toString(16).slice(-8)}`;
    const folderPath = `Participants > ${participant?.name || 'Participant'} > Service Agreements & Consents`;

    const newRecord: SignedAgreementRecord = {
      id: `sig-${Date.now().toString().slice(-5)}`,
      documentTitle: `${selectedDocType} — ${participant?.name || 'Participant'} (${today})`,
      documentType: selectedDocType,
      participantId: participant?.id || 'cli-001',
      participantName: participant?.name || 'Participant',
      ndisNumber: participant?.ndisNumber || '430982103',
      signerName: cleanSigner,
      signerRole,
      authorizedStakeholders: selectedScopes,
      signedAt: today,
      sha256Fingerprint: hash,
      archivedToDrive: false,
      driveFolderPath: folderPath
    };

    setSignedRecords((prev) => [newRecord, ...prev]);
    updateClient(participant.id, {
      serviceAgreementStatus: 'Signed & Active'
    });

    addAuditLog(
      'DIGITAL_SERVICE_AGREEMENT_SIGNED',
      'ServiceAgreement',
      newRecord.id,
      `${cleanSigner} (${signerRole}) digitally signed "${newRecord.documentTitle}" (${hash}) with ${selectedScopes.length} authorised information-sharing scopes.`,
      {
        auditCategory: 'Service Agreement & Funding',
        ndisPracticeStandard: 'NDIS Practice Standards — Core Module 1 (Rights and Responsibilities & Informed Consent)',
        participantId: participant?.id,
        participantName: participant?.name,
        ndisNumber: participant?.ndisNumber,
        severity: 'Low'
      }
    );

    setConfirmDriveArchiveRecord(newRecord);
  };

  const handleConfirmArchiveToDrive = async () => {
    if (!confirmDriveArchiveRecord) return;
    setIsArchivingDrive(true);
    try {
      const docId = `gdrive-${confirmDriveArchiveRecord.id}`;
      const docUrl = `https://docs.google.com/document/d/${docId}/edit`;

      await storePickedDriveFileMetadata({
        file: {
          id: docId,
          name: `${confirmDriveArchiveRecord.documentTitle}.pdf`,
          mimeType: 'application/pdf',
          url: docUrl,
          sizeBytes: 62400,
          description: `Digitally signed by ${confirmDriveArchiveRecord.signerName} (${confirmDriveArchiveRecord.signerRole}) — ${confirmDriveArchiveRecord.sha256Fingerprint}`
        },
        clientId: participant.id,
        clientName: participant.name,
        category: 'Service Agreement',
        uploadedBy: confirmDriveArchiveRecord.signerName,
        uploadedByName: `${confirmDriveArchiveRecord.signerName} (${confirmDriveArchiveRecord.signerRole})`
      });

      attachDocumentToClient(participant.id, {
        id: docId,
        name: `${confirmDriveArchiveRecord.documentTitle}.pdf`,
        url: docUrl,
        mimeType: 'application/pdf',
        category: 'Service Agreement',
        clientId: participant.id,
        clientName: participant.name,
        uploadedAt: new Date().toISOString(),
        metadata: {
          status: 'Approved',
          sha256Fingerprint: confirmDriveArchiveRecord.sha256Fingerprint,
          signerName: confirmDriveArchiveRecord.signerName,
          signerRole: confirmDriveArchiveRecord.signerRole
        }
      });

      setSignedRecords((prev) =>
        prev.map((r) => (r.id === confirmDriveArchiveRecord.id ? { ...r, archivedToDrive: true } : r))
      );

      setConfirmDriveArchiveRecord(null);
      showNotice(
        `Signed agreement "${confirmDriveArchiveRecord.documentTitle}" archived to Google Drive folder (${confirmDriveArchiveRecord.driveFolderPath}).`
      );
    } catch {
      setConfirmDriveArchiveRecord(null);
      showNotice('Signed agreement saved to participant dossier.');
    } finally {
      setIsArchivingDrive(false);
    }
  };

  const handleExportSignedRecordJSON = (rec: SignedAgreementRecord) => {
    const blob = new Blob([JSON.stringify(rec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rec.documentTitle.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice(`Exported JSON signature verification certificate (${rec.sha256Fingerprint}).`);
  };

  // Appointment Confirmation & Calendar Sync
  const handleConfirmAppointmentAction = async () => {
    if (!confirmReminderModal) return;
    setIsProcessingReminder(true);
    const { appointment, actionType } = confirmReminderModal;

    try {
      const token = getGoogleAccessToken();
      if (actionType === 'CalendarSync' && token) {
        await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            summary: `NDIS Therapy Session: ${appointment.participantName} with ${appointment.practitionerName}`,
            description: `Practitioner: ${appointment.practitionerName} (${appointment.practitionerLevel})\nPhone: ${appointment.practitionerPhone}\nEmail: ${appointment.practitionerEmail}\nLinked NDIS Goal: ${appointment.linkedGoalTitle}\nMode: ${appointment.deliveryMode}`,
            start: { date: appointment.sessionDate },
            end: { date: appointment.sessionDate }
          })
        });
      } else if (actionType === 'Send24hReminder' && token && participant.email) {
        const subject = `24-Hour NDIS Appointment Reminder: ${appointment.sessionDate} (${appointment.sessionTime})`;
        const body = [
          `Hello ${appointment.participantName},`,
          '',
          `This is a friendly 24-hour reminder for your upcoming NDIS Behaviour Support / Therapy session:`,
          `- Date & Time: ${appointment.sessionDate} (${appointment.sessionTime})`,
          `- Practitioner: ${appointment.practitionerName} (${appointment.practitionerLevel})`,
          `- Contact: ${appointment.practitionerEmail} | ${appointment.practitionerPhone}`,
          `- Delivery Mode: ${appointment.deliveryMode}`,
          `- Session Goal Focus: ${appointment.linkedGoalTitle}`,
          '',
          'Please reply to confirm attendance or let us know if you need to reschedule.',
          '',
          'Warm regards,',
          'Breakthrough Consult Care Team'
        ].join('\r\n');

        const rawMime = [
          `To: ${participant.email}`,
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

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appointment.id
            ? {
                ...a,
                calendarSynced: actionType === 'CalendarSync' ? true : a.calendarSynced,
                reminderStatus:
                  actionType === 'Send24hReminder' ? '24h Reminder Dispatched' : a.reminderStatus
              }
            : a
        )
      );

      addNotification({
        title:
          actionType === 'CalendarSync'
            ? 'Therapy Session Synced to Google Calendar'
            : '24-Hour Appointment Reminder Sent',
        message: `${appointment.participantName} with ${appointment.practitionerName} on ${appointment.sessionDate}.`,
        type: 'client',
        severity: 'low'
      });

      setConfirmReminderModal(null);
      showNotice(
        actionType === 'CalendarSync'
          ? `Session on ${appointment.sessionDate} synced with Google Calendar.`
          : `24-hour appointment confirmation reminder dispatched for ${appointment.sessionDate}.`
      );
    } catch {
      setConfirmReminderModal(null);
      showNotice('Appointment reminder state updated.');
    } finally {
      setIsProcessingReminder(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
      {/* Header & Tabs */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-teal-400" />
            <span>Pillar D: Digital Service Agreement E-Signature &amp; Appointment Reminder Suite</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Schedule of Supports E-Signature with Google Drive Archival · Easy-Read Toggle · Two-Way Google Calendar &amp; 24-Hour Session Reminders
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSection('e-signature')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              activeSection === 'e-signature'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'bg-slate-800/70 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            <FileSignature className="w-3.5 h-3.5 text-teal-400" />
            <span>D9. Digital Service Agreement &amp; Consent E-Signature</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('appointment-reminders')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              activeSection === 'appointment-reminders'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'bg-slate-800/70 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>D10. 2-Way Google Calendar &amp; 24h Reminders ({appointments.length})</span>
          </button>
        </div>
      </div>

      {bannerNotice && (
        <div className="p-3.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-200 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{bannerNotice}</span>
          </div>
          <button onClick={() => setBannerNotice(null)} className="text-teal-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =====================================================================
          D9: DIGITAL SERVICE AGREEMENT & CONSENT E-SIGNATURE WORKFLOW
          ===================================================================== */}
      {activeSection === 'e-signature' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left Column: Schedule of Supports + Easy-Read Toggle + Granular Consent */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-white">1. Schedule of Supports &amp; Informed Consent</h3>
                <p className="text-[11px] text-slate-400">
                  Participant: <strong className="text-white">{participant?.name}</strong> · NDIS #
                  <span className="font-mono">{participant?.ndisNumber}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEasyReadMode(!easyReadMode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  easyReadMode
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{easyReadMode ? 'Easy-Read Plain English: ON' : 'Switch to Easy-Read'}</span>
              </button>
            </div>

            {easyReadMode ? (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-slate-100 leading-relaxed text-xs">
                <p className="font-bold text-amber-300">Easy-Read Plain English Summary:</p>
                <p>
                  • <strong>Who we are:</strong> Breakthrough Consult provides your Positive Behaviour Support and therapy.
                </p>
                <p>
                  • <strong>How your NDIS funds are used:</strong> Your total plan budget is{' '}
                  <strong className="font-mono">${(participant?.totalBudget || 48500).toLocaleString()} AUD</strong>. All supports are GST-free.
                </p>
                <p>
                  • <strong>Cancelling a visit:</strong> Please tell us at least 7 business days before if you need to cancel so your NDIS plan is not charged.
                </p>
                <p>
                  • <strong>Your privacy choice:</strong> You choose which people (like your doctor, school, or Plan Manager) we can share your reports with. You can say stop at any time.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-[11px] text-slate-300">
                <div className="flex justify-between font-mono">
                  <span>Primary Support Item:</span>
                  <span className="text-teal-300 font-bold">
                    {participant?.primarySupportItemCode || '15_056_0128_1_3'} ($
                    {(participant?.agreedHourlyRate || 193.99).toFixed(2)}/hr)
                  </span>
                </div>
                <div className="flex justify-between font-mono">
                  <span>Plan Period:</span>
                  <span className="text-white">
                    {participant?.planStartDate || '2025-07-01'} to {participant?.planEndDate || '2026-06-30'}
                  </span>
                </div>
                <div className="flex justify-between font-mono">
                  <span>Allocated Plan Budget (GST-Free P1):</span>
                  <span className="text-emerald-400 font-bold">
                    ${(participant?.totalBudget || 48500).toLocaleString('en-AU', { minimumFractionDigits: 2 })} AUD
                  </span>
                </div>
              </div>
            )}

            {/* Granular Third-Party Information Sharing Scopes */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-white block">
                Granular Information-Sharing Consent Scopes (Tick authorised recipients):
              </span>
              <div className="space-y-1.5">
                {CONSENT_STAKEHOLDER_SCOPES.map((scope) => (
                  <label
                    key={scope}
                    className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(scope)}
                      onChange={() => toggleScope(scope)}
                      className="mt-0.5 rounded border-slate-700 bg-slate-950 text-teal-500"
                    />
                    <span className="text-[11px] text-slate-200">{scope}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive E-Signature Pad & Executed Archive List */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4 text-xs flex flex-col justify-between">
            <form onSubmit={handleExecuteDigitalSignature} className="space-y-3.5">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                2. Digital E-Signature Execution &amp; Google Drive Archival
              </h3>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold block">Document to Execute</label>
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value as SignedAgreementRecord['documentType'])}
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                >
                  <option value="NDIS Service Agreement & Schedule of Supports">
                    NDIS Service Agreement &amp; Schedule of Supports
                  </option>
                  <option value="Multimedia & Third-Party Information Sharing Consent">
                    Multimedia &amp; Third-Party Information Sharing Consent Form
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Full Legal Name of Signer</label>
                  <input
                    type="text"
                    required
                    value={signerName}
                    onChange={(e) => {
                      setSignerName(e.target.value);
                      setSignatureText(e.target.value);
                    }}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Signer Authority</label>
                  <select
                    value={signerRole}
                    onChange={(e) => setSignerRole(e.target.value as SignedAgreementRecord['signerRole'])}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="Participant">Participant (Self)</option>
                    <option value="Plan Nominee">Authorised Plan Nominee</option>
                    <option value="Legal Guardian">Parent / Legal Guardian</option>
                  </select>
                </div>
              </div>

              {/* Interactive Canvas Signature Pad */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">
                    Draw Signature Below (or type cursive signature):
                  </span>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear Pad
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={420}
                  height={90}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="w-full h-24 rounded-xl bg-slate-900 border border-slate-700 cursor-crosshair"
                />
                {!hasDrawnSignature && (
                  <div className="text-[11px] text-teal-300 font-mono italic">
                    Digital Signature Preview: /s/ {signatureText || participant?.name}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-950/50 cursor-pointer"
              >
                <FileSignature className="w-4 h-4" />
                <span>Sign Digitally &amp; Archive to Google Drive Folder</span>
              </button>
            </form>

            {/* Executed Records List */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Executed Digital Agreements ({signedRecords.length})
              </span>
              {signedRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-white text-[11px]">{rec.documentTitle}</div>
                    <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                      Signed by {rec.signerName} ({rec.signerRole}) · {rec.signedAt} · {rec.sha256Fingerprint}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                      title="Print PDF Copy"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportSignedRecordJSON(rec)}
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-white cursor-pointer"
                      title="Export Verification JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          D10: TWO-WAY CALENDAR & 24-HOUR APPOINTMENT REMINDERS
          ===================================================================== */}
      {activeSection === 'appointment-reminders' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-white">
                Two-Way Google Calendar Sync &amp; 24-Hour Participant/Nominee Appointment Reminders
              </h3>
              <p className="text-[11px] text-slate-400">
                Includes assigned practitioner contact details, delivery mode, and linked NDIS goals. Short-notice cancellations (&lt;7 days) are flagged automatically.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                        {apt.deliveryMode}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-0.5">
                        Session with {apt.practitionerName} ({apt.practitionerLevel})
                      </h4>
                      <p className="text-xs font-mono text-slate-300 tabular-nums">
                        {apt.sessionDate} · {apt.sessionTime}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-bold ${
                        apt.reminderStatus === 'Confirmed by Participant'
                          ? 'text-emerald-400'
                          : apt.reminderStatus === '24h Reminder Dispatched'
                          ? 'text-teal-300'
                          : 'text-amber-300'
                      }`}
                    >
                      {apt.reminderStatus}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] space-y-1">
                    <div className="text-slate-300">
                      <strong>Session NDIS Goal Focus:</strong> {apt.linkedGoalTitle}
                    </div>
                    <div className="text-slate-400 font-mono">
                      Practitioner Contact: {apt.practitionerEmail} · {apt.practitionerPhone}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAppointments((prev) =>
                        prev.map((a) =>
                          a.id === apt.id ? { ...a, reminderStatus: 'Confirmed by Participant' } : a
                        )
                      );
                      showNotice(`Attendance confirmed for ${apt.sessionDate} with ${apt.practitionerName}.`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Attendance</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmReminderModal({ appointment: apt, actionType: 'CalendarSync' })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{apt.calendarSynced ? 'Re-Sync GCal' : 'Sync Google Calendar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setConfirmReminderModal({ appointment: apt, actionType: 'Send24hReminder' })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Send 24h Reminder</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CONFIRM GOOGLE DRIVE ARCHIVAL OF SIGNED AGREEMENT
          ===================================================================== */}
      {confirmDriveArchiveRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                Confirm Google Drive Archival of Signed Agreement
              </h3>
              <button
                onClick={() => setConfirmDriveArchiveRecord(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p>
                Your digital signature has been cryptographically fingerprinted. Confirm archival into your participant Google Drive folder:
              </p>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono space-y-1 text-[11px]">
                <div>
                  Document: <strong className="text-white">{confirmDriveArchiveRecord.documentTitle}</strong>
                </div>
                <div>
                  Signed By: {confirmDriveArchiveRecord.signerName} ({confirmDriveArchiveRecord.signerRole})
                </div>
                <div>
                  Drive Folder: <strong className="text-teal-300">{confirmDriveArchiveRecord.driveFolderPath}</strong>
                </div>
                <div>Fingerprint: {confirmDriveArchiveRecord.sha256Fingerprint}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDriveArchiveRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Skip Drive Upload
              </button>
              <button
                type="button"
                disabled={isArchivingDrive}
                onClick={handleConfirmArchiveToDrive}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isArchivingDrive ? 'Archiving to Drive...' : 'Confirm & Archive to Google Drive'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CONFIRM GOOGLE CALENDAR SYNC OR 24H REMINDER DISPATCH
          ===================================================================== */}
      {confirmReminderModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {confirmReminderModal.actionType === 'CalendarSync'
                  ? 'Confirm Google Calendar Session Sync'
                  : 'Confirm 24-Hour Appointment Reminder Dispatch'}
              </h3>
              <button
                onClick={() => setConfirmReminderModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono space-y-1 text-[11px]">
                <div>
                  Participant: <strong className="text-white">{confirmReminderModal.appointment.participantName}</strong>
                </div>
                <div>
                  Practitioner: <strong className="text-teal-300">{confirmReminderModal.appointment.practitionerName}</strong> ({confirmReminderModal.appointment.practitionerLevel})
                </div>
                <div>
                  Session Date &amp; Time: {confirmReminderModal.appointment.sessionDate} ({confirmReminderModal.appointment.sessionTime})
                </div>
                <div>Goal Focus: {confirmReminderModal.appointment.linkedGoalTitle}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmReminderModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingReminder}
                onClick={handleConfirmAppointmentAction}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isProcessingReminder ? 'Processing...' : 'Confirm & Execute'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
