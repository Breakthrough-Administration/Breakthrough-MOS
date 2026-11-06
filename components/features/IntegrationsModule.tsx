'use client';

import React from 'react';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { GoogleWorkspaceAuthDiagnosticPanel } from './GoogleWorkspaceAuthDiagnosticPanel';

export const IntegrationsModule: React.FC = () => {
  const integrations = [
    {
      name: 'Firebase Admin Service Account',
      category: 'Server IAM & Admin SDK',
      description:
        'Authenticated via firebase-adminsdk-fbsvc@gen-lang-client-0846355299.iam.gserviceaccount.com (Client ID: 104636634649545776303, Key ID: c4869d57...44a2) for server-side Firestore & Auth verification.',
      status: 'Verified Certificate',
      version: 'RSA-2048'
    },
    {
      name: 'Google Cloud Firebase / Firestore',
      category: 'Database & Auth',
      description:
        'Distributed document ledger (ai-studio-amos-2f422ba5-7cb0-48ad-bac6-be491064bb5d) storing participant records, case notes, and incident reports with offline delta cache.',
      status: 'Connected',
      version: 'Firebase v11'
    },
    {
      name: 'Google Gemini Clinical Engine',
      category: 'AI Decision Support',
      description:
        'Powers conversational clinical drafting, BIRP note structuring, document extraction, and SCHADS award compliance checks.',
      status: 'Connected',
      version: 'v1.0'
    },
    {
      name: 'PRODA PACE Gateway',
      category: 'NDIS Statutory API',
      description:
        'National Disability Insurance Agency direct API claiming and service booking reconciliation gateway.',
      status: 'Ready / 2026 Spec',
      version: 'PACE 2.4'
    },
    {
      name: 'Xero Cloud Accounting',
      category: 'Financial Ledger',
      description:
        'Automated invoice generation, GST-free NDIS schedule mapping, and payroll synchronization for therapy staff.',
      status: 'Connected',
      version: 'OAuth 2.0'
    },
    {
      name: '17hats CRM & Bookings',
      category: 'Participant Intake',
      description:
        'Automated lead capture, onboarding agreements, and client intake question sync.',
      status: 'Active',
      version: 'Webhook v2'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">System Integrations & API Gateways</h1>
          <p className="text-xs text-slate-400">
            Connected enterprise services and server credentials powering Breakthrough Allied Health Operations OS
          </p>
        </div>
      </div>

      {/* Live Google Workspace OAuth & Heartbeat Diagnostic Panel */}
      <GoogleWorkspaceAuthDiagnosticPanel />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((item, idx) => (
          <div
            key={idx}
            className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                  {item.category}
                </span>
                <span className="text-[10px] font-mono tabular-nums text-teal-300 font-semibold">
                  {item.version}
                </span>
              </div>
              <h3 className="text-base font-bold text-white">{item.name}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-teal-400 font-bold">
                <CheckCircle2 className="w-4 h-4" /> {item.status}
              </span>
              <span className="text-slate-500 font-mono text-[11px] tabular-nums">
                gen-lang-client-0846355299
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
