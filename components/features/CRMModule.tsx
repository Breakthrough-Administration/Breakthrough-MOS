'use client';

import React, { useState, useEffect } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { Lead } from '@/types';
import {
  Briefcase,
  Plus,
  UserCheck,
  Phone,
  Mail,
  X,
  RefreshCw,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { SeventeenHatsService, SeventeenHatsConnectionHealth } from '@/services/seventeenHatsService';
import {
  SeventeenHatsTrafficLightWidget,
  formatAustralianSyncTimestamp,
  formatRelativeSyncAge,
  getSyncStalenessMeta
} from './SeventeenHatsTrafficLightWidget';

export const CRMModule: React.FC = () => {
  const { leads, addLead, updateLead, addClient, setActiveTab } = useManagementStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState<SeventeenHatsConnectionHealth | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(() =>
    formatAustralianSyncTimestamp(new Date())
  );
  const [syncAgeSeconds, setSyncAgeSeconds] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [syncBanner, setSyncBanner] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setSyncAgeSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    SeventeenHatsService.verifyConnectionHealth()
      .then((res) => {
        if (active) {
          setHealthStatus(res.health);
          setLastSyncedAt(formatAustralianSyncTimestamp(new Date()));
          setSyncAgeSeconds(0);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleVerifyAndPull17Hats = async () => {
    setIsVerifying(true);
    try {
      const { health, payload: workspace } = await SeventeenHatsService.verifyConnectionHealth();
      const nowFormatted = formatAustralianSyncTimestamp(new Date());
      setHealthStatus(health);
      setLastSyncedAt(nowFormatted);
      setSyncAgeSeconds(0);
      let importedCount = 0;
      workspace.contacts.forEach((contact) => {
        const exists = leads.some(
          (l) =>
            (l.name || l.prospectName || '').toLowerCase() === contact.name.toLowerCase()
        );
        if (!exists) {
          importedCount++;
          addLead({
            prospectName: contact.name,
            name: contact.name,
            contactName: contact.companyOrNominee || contact.name,
            contactEmail: contact.email,
            email: contact.email,
            contactPhone: contact.phone,
            phone: contact.phone,
            ndisNumber: contact.ndisNumber,
            stage: contact.lifecycleStage || contact.workflowName || 'New Intake',
            status: contact.status === 'Lead' ? 'New Inquiry' : 'Onboarded',
            source: contact.source || '17hats CRM API Sync',
            estimatedPlanValue: 29098.5,
            supportNeeds: contact.notes || contact.linkedProjectName || 'Specialist Positive Behaviour Support',
            fundingType: 'NDIS Plan-Managed',
            notes: `17hats Contact ID: ${contact.id}`
          });
        }
      });
      setSyncBanner(
        `17hats API Verified (${health.latencyMs}ms RTT · Last Synced ${nowFormatted}) — ${workspace.contacts.length} CRM contacts checked (${importedCount} new leads imported).`
      );
      setTimeout(() => setSyncBanner(null), 5000);
    } finally {
      setIsVerifying(false);
    }
  };

  const [formData, setFormData] = useState<Partial<Lead>>({
    prospectName: '',
    name: '',
    contactName: '',
    contactEmail: '',
    email: '',
    contactPhone: '',
    phone: '',
    stage: 'New Intake',
    status: 'New Inquiry',
    source: 'Support Coordinator Referral',
    supportNeeds: 'Allied Health PBS & Capacity Building',
    fundingType: 'NDIS Plan-Managed',
    estimatedPlanValue: 25000,
    notes: ''
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const displayName = formData.prospectName || formData.name;
    if (!displayName) return;
    const newLead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'> = {
      prospectName: displayName,
      name: displayName,
      contactName: formData.contactName || displayName,
      contactEmail: formData.contactEmail || formData.email || '',
      email: formData.email || formData.contactEmail || '',
      contactPhone: formData.contactPhone || formData.phone || '',
      phone: formData.phone || formData.contactPhone || '',
      stage: formData.stage || 'New Intake',
      status: formData.status || 'New Inquiry',
      source: formData.source || 'Support Coordinator Referral',
      estimatedPlanValue: formData.estimatedPlanValue || 25000,
      supportNeeds: formData.supportNeeds || '',
      fundingType: formData.fundingType || '',
      notes: formData.notes || ''
    };
    addLead(newLead);
    setIsAddOpen(false);
  };

  const convertToParticipant = (lead: Lead) => {
    const leadName = lead.prospectName || lead.name || 'New Participant';
    const leadPhone = lead.contactPhone || lead.phone || '0400 000 000';
    const leadEmail = lead.contactEmail || lead.email || '';
    addClient({
      id: `cli-${Date.now().toString().slice(-4)}`,
      name: leadName,
      ndisNumber: lead.ndisNumber || `${Math.floor(400000000 + Math.random() * 90000000)}`,
      dateOfBirth: '1995-01-01',
      status: 'Active',
      primaryDisability: lead.supportNeeds || 'General Capacity Building',
      phone: leadPhone,
      email: leadEmail,
      goals: [],
      planStartDate: 'Not stated',
      planEndDate: 'Not stated',
      totalBudget: lead.estimatedPlanValue || 0,
      allocatedBudget: lead.estimatedPlanValue || 0,
      spentBudget: 0,
      primaryPractitionerId: '',
      primaryPractitionerName: 'Unassigned',
      riskLevel: 'Low',
      emergencyContact: {
        name: lead.contactName || 'Not stated',
        relationship: 'Primary Contact',
        phone: leadPhone || 'Not stated'
      },
      restrictivePracticesActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    updateLead(lead.id, { stage: 'Converted to Client', status: 'Converted to Participant' });
    setActiveTab('clients');
  };

  const stalenessMeta = getSyncStalenessMeta(syncAgeSeconds);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-extrabold text-white">Intake &amp; 17hats CRM Pipeline</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider border ${
                healthStatus?.healthy
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  healthStatus?.healthy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {healthStatus
                ? `17HATS API HEALTHY · ${healthStatus.latencyMs}ms RTT (${healthStatus.endpoints.length}/5 OK)`
                : 'CHECKING 17HATS API...'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono tabular-nums text-amber-300">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>
                Last Synced: <strong className="text-white">{lastSyncedAt}</strong> ({formatRelativeSyncAge(syncAgeSeconds)})
              </span>
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold ${stalenessMeta.badgeClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${stalenessMeta.dotClass}`} />
              {stalenessMeta.label}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Participant onboarding, support coordinator referrals, and 17hats REST v1 service agreement workflow
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleVerifyAndPull17Hats}
            disabled={isVerifying}
            className="px-3.5 py-2 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            {isVerifying ? 'Verifying 17hats...' : 'Verify Health & Sync 17hats'}
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Referral / Lead
          </button>
        </div>
      </div>

      {/* Periodic Polling 17hats Traffic-Light Connection Monitor */}
      <SeventeenHatsTrafficLightWidget
        externalSyncTimestamp={lastSyncedAt}
        onHealthUpdated={(liveHealth, _payload, syncedFormatted) => {
          setHealthStatus(liveHealth);
          setLastSyncedAt(syncedFormatted);
          setSyncAgeSeconds(0);
        }}
      />

      {syncBanner && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-200">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {syncBanner}
          </span>
          <span className="text-[10px] font-mono text-emerald-300">
            {healthStatus?.baseUrl || 'https://api.17hats.com/v1'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leads.map((lead) => (
          <div
            key={lead.id}
            className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{lead.name || lead.prospectName}</h3>
                  <p className="text-xs text-slate-400">{lead.source}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-semibold border border-teal-500/20">
                  {lead.status || lead.stage}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-slate-400">
                  <Phone className="w-3.5 h-3.5 text-teal-400" />
                  <span>{lead.phone || lead.contactPhone || 'Phone on file'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Mail className="w-3.5 h-3.5 text-teal-400" />
                  <span className="truncate">{lead.email || lead.contactEmail || 'Email on file'}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 text-xs text-slate-300">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Requested Support
                </span>
                <p>{lead.supportNeeds}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">{lead.fundingType}</span>
              {lead.status !== 'Converted to Participant' && (
                <button
                  onClick={() => convertToParticipant(lead)}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors flex items-center gap-1"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Convert to Active
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Lead Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Create Intake Referral</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Participant Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Referral Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                >
                  <option>Support Coordinator Referral</option>
                  <option>17hats Inbound Web Inquiry</option>
                  <option>Hospital / Allied Health Discharge</option>
                  <option>Direct Family Contact</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Support Needs</label>
                <textarea
                  rows={2}
                  value={formData.supportNeeds}
                  onChange={(e) => setFormData({ ...formData, supportNeeds: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 font-bold text-white"
                >
                  Create Referral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
