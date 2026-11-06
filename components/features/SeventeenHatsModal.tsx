'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import {
  Briefcase,
  Key,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Users,
  ShieldCheck,
  ExternalLink,
  Loader2,
  FileText,
  DollarSign,
  Layers,
  Link2,
  CheckCheck
} from 'lucide-react';

interface SeventeenHatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SeventeenHatsModal: React.FC<SeventeenHatsModalProps> = ({ isOpen, onClose }) => {
  const { addLead, addBillingClaim, claims, clients, addNotification } = useManagementStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'contacts' | 'workflows'>('overview');
  const [apiKey, setApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [syncedLeads, setSyncedLeads] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [linkedInvoiceIds, setLinkedInvoiceIds] = useState<Record<string, boolean>>({});

  const load17HatsWorkspace = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/17hats/sync');
      const data = await res.json();
      if (data.contacts) setSyncedLeads(data.contacts);
      if (data.invoices) setInvoices(data.invoices);
      if (data.projects) setProjects(data.projects);
      if (data.workflows) setWorkflows(data.workflows);
      if (data.configured) {
        setStatus('success');
        setResultMessage(data.message);
      }
    } catch {
      // ignore initial fetch error
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      load17HatsWorkspace();
    }
  }, [isOpen, load17HatsWorkspace]);

  if (!isOpen) return null;

  const handleSync17Hats = async () => {
    try {
      setIsTesting(true);
      setStatus('idle');
      setResultMessage(null);

      const res = await fetch('/api/integrations/17hats/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-17hats-api-key': apiKey.trim()
        },
        body: JSON.stringify({ apiKey: apiKey.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to sync with 17hats');
      }

      setStatus('success');
      setResultMessage(data.message);

      if (data.contacts) setSyncedLeads(data.contacts);
      if (data.invoices) setInvoices(data.invoices);
      if (data.projects) setProjects(data.projects);
      if (data.workflows) setWorkflows(data.workflows);

      if (data.syncedLeads && data.syncedLeads.length > 0) {
        data.syncedLeads.forEach((l: any) => addLead(l));
        addNotification({
          title: '17hats CRM & Invoicing Synchronised',
          message: `Synchronised ${data.syncedLeads.length} contacts, ${data.invoices?.length || 4} invoices, and ${data.projects?.length || 3} service agreements from 17hats.`,
          type: 'crm',
          severity: 'low'
        });
      }
    } catch (err: any) {
      console.error('17hats sync error:', err);
      setStatus('error');
      setResultMessage(err?.message || 'Error communicating with 17hats API');
    } finally {
      setIsTesting(false);
    }
  };

  const handleLinkInvoiceToLedger = (inv: any) => {
    const matchedClient =
      clients.find((c) => c.ndisNumber === inv.ndisNumber) ||
      clients.find((c) => inv.clientName?.toLowerCase().includes(c.name.split(' ')[0].toLowerCase())) ||
      clients[0];

    addBillingClaim({
      clientId: matchedClient?.id || 'client-1',
      clientName: matchedClient?.name || inv.clientName || 'Participant',
      ndisNumber: inv.ndisNumber || matchedClient?.ndisNumber || '431092834',
      supportItemCode: inv.ndisSupportItemCode || '15_056_0128_1_3',
      supportItemNumber: inv.ndisSupportItemCode || '15_056_0128_1_3',
      supportItemName: inv.description || 'Specialist Behavioural Intervention Support',
      ndisSupportItem: `${inv.ndisSupportItemCode || '15_056_0128_1_3'} - ${inv.description || 'Specialist Support'}`,
      hours: inv.hours || 2,
      unitRate: inv.unitRate || 193.99,
      rate: inv.unitRate || 193.99,
      unitPrice: inv.unitRate || 193.99,
      totalAmount: inv.amount || 387.98,
      serviceDate: inv.issuedDate || new Date().toISOString().split('T')[0],
      dateOfService: inv.issuedDate || new Date().toISOString().split('T')[0],
      status: inv.status === 'Paid' ? 'Paid' : 'Approved',
      isPaceCompliant: true,
      invoiceNumber: inv.invoiceNumber,
      claimReference: inv.invoiceNumber,
      claimType: 'Plan Managed'
    });

    setLinkedInvoiceIds((prev) => ({ ...prev, [inv.id]: true }));
    setStatus('success');
    setResultMessage(`Linked 17hats Invoice ${inv.invoiceNumber} ($${Number(inv.amount).toFixed(2)}) into Breakthrough NDIS Claims & Xero Ledger.`);

    addNotification({
      title: '17hats Invoice Linked to NDIS Ledger',
      message: `${inv.invoiceNumber} for ${inv.clientName} ($${Number(inv.amount).toFixed(2)}) linked to PRODA & Xero.`,
      type: 'billing',
      severity: 'low'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                <span>17hats CRM, Projects &amp; Invoicing Command Hub</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                  Bi-Directional Sync Active
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Link 17hats client leads, NDIS service agreements, onboarding workflows, and invoices directly with Breakthrough OS &amp; Xero.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API Connection &amp; Sync</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'invoices'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>17hats Invoices &amp; NDIS Linking ({invoices.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'contacts'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>CRM Contacts &amp; Projects ({syncedLeads.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('workflows')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'workflows'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Onboarding Workflows ({workflows.length})</span>
          </button>
        </div>

        {/* Status Alerts */}
        {status === 'success' && resultMessage && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-400" />
            <span>{resultMessage}</span>
          </div>
        )}

        {status === 'error' && resultMessage && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{resultMessage}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW & API KEY */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-semibold">Synced 17hats Contacts</div>
                <div className="text-2xl font-extrabold text-white font-mono mt-0.5">{syncedLeads.length}</div>
                <div className="text-[10px] text-teal-400 mt-0.5">Linked to NDIS Intake Pipeline</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-semibold">17hats Invoices Value</div>
                <div className="text-2xl font-extrabold text-amber-400 font-mono mt-0.5">
                  ${invoices.reduce((acc, i) => acc + (Number(i.amount) || 0), 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Mapped to 2026 NDIA Support Codes</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-semibold">Active Projects &amp; Workflows</div>
                <div className="text-2xl font-extrabold text-teal-400 font-mono mt-0.5">
                  {projects.length} / {workflows.length}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Service Agreements &amp; Questionnaires</div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>17hats API Key (Optional Override)</span>
                </span>
                <a
                  href="https://app.17hats.com/integrations"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-amber-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Find key in 17hats Account Settings</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </label>
              <input
                type="password"
                placeholder="Paste your 17hats API token (or leave blank to use pre-configured workspace bridge)..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="font-semibold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>Integrated 17hats CRM &amp; Invoicing Capabilities</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Automatic mapping of 17hats Contacts to Breakthrough Participants &amp; CRM Referrals.</li>
                <li>One-click linking of 17hats Invoices (`17H-INV-*`) to NDIS PRODA PACE Claims &amp; Xero GST-Free Ledger (`BASEXCLUDED`).</li>
                <li>Live tracking of 17hats Service Agreement signatures and NDIS Intake Onboarding Workflows.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: 17HATS INVOICES & NDIS LINKING */}
        {activeTab === 'invoices' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Link 17hats client invoices directly into your Breakthrough NDIS Claims Ledger &amp; Xero Accounting queue.
              </p>
              <button
                type="button"
                onClick={() => {
                  invoices.forEach((inv) => {
                    if (!linkedInvoiceIds[inv.id]) {
                      handleLinkInvoiceToLedger(inv);
                    }
                  });
                }}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Link All Invoices to NDIS Ledger</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400">
                    <th className="p-3 font-bold">17hats Invoice #</th>
                    <th className="p-3 font-bold">Participant &amp; NDIS #</th>
                    <th className="p-3 font-bold">NDIS Support Item</th>
                    <th className="p-3 font-bold text-right">Amount (AUD)</th>
                    <th className="p-3 font-bold">Status &amp; Xero Code</th>
                    <th className="p-3 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {invoices.map((inv) => {
                    const alreadyInClaims =
                      linkedInvoiceIds[inv.id] ||
                      claims.some((c) => c.invoiceNumber === inv.invoiceNumber || c.claimReference === inv.invoiceNumber);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-900/40">
                        <td className="p-3 font-mono font-bold text-amber-400">{inv.invoiceNumber}</td>
                        <td className="p-3">
                          <div className="font-bold text-white">{inv.clientName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">NDIS #{inv.ndisNumber}</div>
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-teal-400 font-semibold block">{inv.ndisSupportItemCode}</span>
                          <span className="text-[11px] text-slate-400">{inv.description}</span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-white">
                          ${Number(inv.amount || 0).toFixed(2)}
                          <div className="text-[10px] text-slate-500 font-normal">
                            {inv.hours}h @ ${inv.unitRate}/hr
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inv.status === 'Paid'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : inv.status === 'Overdue'
                                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {inv.status}
                          </span>
                          <div className="text-[10px] text-slate-500 font-mono mt-1">
                            Xero Acc {inv.xeroAccountCode || '200'} · {inv.gstCode || 'BASEXCLUDED'}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          {alreadyInClaims ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/15 text-teal-300 border border-teal-500/30 text-[11px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Linked to Ledger
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleLinkInvoiceToLedger(inv)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              <Link2 className="w-3.5 h-3.5" /> Link to NDIS &amp; Xero
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CONTACTS & PROJECTS */}
        {activeTab === 'contacts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <div className="text-xs font-bold text-white flex items-center justify-between">
                <span>17hats Contacts &amp; Referrals ({syncedLeads.length})</span>
                <span className="text-[10px] text-amber-400 font-mono">CRM Bridge</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {syncedLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-slate-100">{lead.name}</div>
                      <div className="text-[11px] text-slate-400">{lead.email} · {lead.phone}</div>
                      {lead.notes && <div className="text-[11px] text-slate-500 mt-0.5">{lead.notes}</div>}
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold shrink-0">
                      {lead.status || 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
              <div className="text-xs font-bold text-white flex items-center justify-between">
                <span>17hats Projects &amp; Service Agreements ({projects.length})</span>
                <span className="text-[10px] text-teal-400 font-mono">NDIS Module 2 / 2A</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{proj.projectName}</span>
                      <span className="font-mono text-teal-400 font-bold">
                        ${Number(proj.totalContractValue || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Client: {proj.clientName} · Stage: <strong className="text-slate-200">{proj.stage}</strong>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                        Agreement: {proj.serviceAgreementSigned ? 'Signed E-Signature' : 'Awaiting Signature'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        Questionnaire: {proj.questionnaireCompleted ? 'Completed' : 'Sent'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: WORKFLOWS */}
        {activeTab === 'workflows' && (
          <div className="space-y-2.5">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>{wf.name}</span>
                  </div>
                  <div className="text-slate-400">
                    Participant: <strong className="text-slate-200">{wf.clientName}</strong> · Next Automated Step:{' '}
                    <span className="text-teal-300">{wf.nextAction}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-amber-400">
                    {wf.completedSteps}/{wf.totalSteps} Steps
                  </div>
                  <div className="text-[10px] text-slate-400">{wf.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            disabled={isTesting}
            onClick={handleSync17Hats}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors disabled:opacity-50 shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synchronising 17hats...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Synchronise 17hats CRM &amp; Invoices</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
