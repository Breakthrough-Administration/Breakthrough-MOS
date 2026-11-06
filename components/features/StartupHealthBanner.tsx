'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SystemHealthReport, runClientStartupHealthCheck } from '@/lib/startupHealthCheck';

interface LiveAdminStatus {
  authenticated: boolean;
  operational: boolean;
  projectId: string | null;
  databaseId: string;
  serviceAccountEmail: string | null;
  services?: {
    firestore?: { connected: boolean; latencyMs: number | null; message: string };
    auth?: { connected: boolean; customTokenMintable: boolean; message: string };
  };
}

export const StartupHealthBanner: React.FC = () => {
  const [report, setReport] = useState<SystemHealthReport | null>(null);
  const [adminStatus, setAdminStatus] = useState<LiveAdminStatus | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchHealth = async () => {
    setIsLoading(true);
    try {
      const [healthRes, statusRes] = await Promise.all([
        fetch('/api/health').catch(() => null),
        fetch('/api/firebase/status').catch(() => null)
      ]);

      if (healthRes && healthRes.ok) {
        const data = await healthRes.json();
        setReport(data);
      } else {
        setReport(runClientStartupHealthCheck());
      }

      if (statusRes && statusRes.ok) {
        const statusData = await statusRes.json();
        setAdminStatus(statusData);
      }
    } catch {
      setReport(runClientStartupHealthCheck());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  if (!report) return null;

  const isHealthy = report.overallStatus === 'healthy' && (adminStatus ? adminStatus.operational : true);
  const isCritical = report.overallStatus === 'critical';

  return (
    <div
      className={`rounded-2xl border transition-all ${
        isCritical
          ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
          : isHealthy
          ? 'bg-slate-900/60 border-slate-800 text-slate-300'
          : 'bg-amber-950/30 border-amber-800/50 text-amber-200'
      } p-3 sm:p-4 text-xs`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {isCritical ? (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : isHealthy ? (
            <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white">Startup Health & Credentials</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isHealthy
                    ? 'text-teal-300'
                    : isCritical
                    ? 'text-rose-300'
                    : 'text-amber-300'
                }`}
              >
                {adminStatus?.operational ? 'Admin Connected & Operational' : report.overallStatus}
              </span>
              <span className="text-slate-600 hidden md:inline" aria-hidden="true">·</span>
              <span className="text-[11px] text-slate-400 font-mono tabular-nums hidden md:inline">
                Project: {adminStatus?.projectId || report.metadata?.projectId} · DB: {adminStatus?.databaseId || report.metadata?.databaseId}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {adminStatus?.operational
                ? `Service account (${adminStatus.serviceAccountEmail}) authenticated · Firestore latency ${adminStatus.services?.firestore?.latencyMs ?? 0}ms · Custom Auth Bridge active.`
                : report.summary}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={fetchHealth}
            disabled={isLoading}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Refresh startup health check"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium transition cursor-pointer flex items-center gap-1"
          >
            <span>{isExpanded ? 'Hide' : 'Details'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {adminStatus && (
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-slate-200 text-[11px]">
                    Live /api/firebase/status Probe
                  </span>
                  {adminStatus.operational ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  {adminStatus.services?.firestore?.message}
                </p>
                <p className="text-[9px] font-mono text-slate-500 tabular-nums">
                  {adminStatus.serviceAccountEmail} · Latency: {adminStatus.services?.firestore?.latencyMs ?? '-'}ms
                </p>
              </div>
            )}
            {report.checks.map((c) => (
              <div
                key={c.id}
                className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-slate-200 text-[11px]">{c.name}</span>
                  {c.status === 'valid' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : c.status === 'error' ? (
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400">{c.message}</p>
                {c.details && <p className="text-[9px] font-mono text-slate-500">{c.details}</p>}
                {c.recommendedAction && (
                  <p className="text-[9px] text-amber-300/90 font-medium">
                    Tip: {c.recommendedAction}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
