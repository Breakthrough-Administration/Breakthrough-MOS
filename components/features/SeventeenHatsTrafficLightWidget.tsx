'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  Activity,
  Zap
} from 'lucide-react';
import {
  SeventeenHatsService,
  SeventeenHatsConnectionHealth,
  SeventeenHatsWorkspacePayload
} from '@/services/seventeenHatsService';
import { useManagementStore } from '@/stores/useManagementStore';

export type TrafficLightState = 'online' | 'degraded' | 'offline';

interface PollSample {
  id: string;
  timestamp: string;
  latencyMs: number;
  state: TrafficLightState;
}

interface SeventeenHatsTrafficLightWidgetProps {
  compact?: boolean;
  pollIntervalSeconds?: number;
  externalSyncTimestamp?: string;
  onHealthUpdated?: (
    health: SeventeenHatsConnectionHealth,
    payload: SeventeenHatsWorkspacePayload,
    lastSyncedFormatted: string
  ) => void;
}

export function formatAustralianSyncTimestamp(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const time = date.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  return `${day}-${month}-${year} • ${time}`;
}

export function formatRelativeSyncAge(seconds: number): string {
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  return remSec > 0 ? `${mins}m ${remSec}s ago` : `${mins}m ago`;
}

export function getSyncStalenessMeta(seconds: number): {
  status: 'fresh' | 'aging' | 'stale';
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  if (seconds < 120) {
    return {
      status: 'fresh',
      label: 'Fresh',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      dotClass: 'bg-emerald-400 animate-pulse'
    };
  }
  if (seconds < 300) {
    return {
      status: 'aging',
      label: 'Aging',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      dotClass: 'bg-amber-400'
    };
  }
  return {
    status: 'stale',
    label: 'Stale · Refresh Due',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    dotClass: 'bg-rose-400 animate-ping'
  };
}

export const SeventeenHatsTrafficLightWidget: React.FC<
  SeventeenHatsTrafficLightWidgetProps
> = ({
  compact = false,
  pollIntervalSeconds = 25,
  externalSyncTimestamp,
  onHealthUpdated
}) => {
  const { isOnline } = useManagementStore();
  const [trafficState, setTrafficState] = useState<TrafficLightState>('online');
  const [simulatedOverride, setSimulatedOverride] = useState<TrafficLightState | null>(null);
  const [health, setHealth] = useState<SeventeenHatsConnectionHealth | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(() =>
    formatAustralianSyncTimestamp(new Date())
  );
  const [secondsSinceSync, setSecondsSinceSync] = useState<number>(0);
  const [nextPollIn, setNextPollIn] = useState<number>(pollIntervalSeconds);
  const [autoPollEnabled, setAutoPollEnabled] = useState<boolean>(true);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [pollSamples, setPollSamples] = useState<PollSample[]>([]);
  const pollSeqRef = useRef(0);
  const onHealthUpdatedRef = useRef(onHealthUpdated);

  useEffect(() => {
    onHealthUpdatedRef.current = onHealthUpdated;
  }, [onHealthUpdated]);

  // Synchronise when parent manually refreshes connection data
  useEffect(() => {
    if (externalSyncTimestamp && externalSyncTimestamp !== lastSyncedAt) {
      setLastSyncedAt(externalSyncTimestamp);
      setSecondsSinceSync(0);
      setNextPollIn(pollIntervalSeconds);
    }
  }, [externalSyncTimestamp, lastSyncedAt, pollIntervalSeconds]);

  const executeHealthPoll = useCallback(async () => {
    if (!isOnline) {
      setTrafficState('offline');
      return;
    }

    setIsPolling(true);
    try {
      const { health: liveHealth, payload } =
        await SeventeenHatsService.verifyConnectionHealth();
      setHealth(liveHealth);

      const syncedFormatted = formatAustralianSyncTimestamp(new Date());
      setLastSyncedAt(syncedFormatted);
      setSecondsSinceSync(0);
      setNextPollIn(pollIntervalSeconds);

      const failedEndpoints = (liveHealth.endpoints || []).filter((e) => !e.ok).length;
      const computedState: TrafficLightState =
        !liveHealth.healthy && failedEndpoints >= 3
          ? 'offline'
          : failedEndpoints > 0 || liveHealth.latencyMs > 600
          ? 'degraded'
          : 'online';

      setTrafficState(computedState);

      pollSeqRef.current += 1;
      const sample: PollSample = {
        id: `17h-poll-${Date.now()}-${pollSeqRef.current}`,
        timestamp: syncedFormatted,
        latencyMs: liveHealth.latencyMs,
        state: simulatedOverride || computedState
      };
      setPollSamples((prev) => [...prev.slice(-9), sample]);

      if (onHealthUpdatedRef.current) {
        onHealthUpdatedRef.current(liveHealth, payload, syncedFormatted);
      }
    } catch {
      setTrafficState('offline');
      pollSeqRef.current += 1;
      const fallbackTs = formatAustralianSyncTimestamp(new Date());
      setPollSamples((prev) => [
        ...prev.slice(-9),
        {
          id: `17h-poll-${Date.now()}-${pollSeqRef.current}`,
          timestamp: fallbackTs,
          latencyMs: 0,
          state: 'offline'
        }
      ]);
    } finally {
      setIsPolling(false);
    }
  }, [isOnline, pollIntervalSeconds, simulatedOverride]);

  // Initial poll on mount
  useEffect(() => {
    executeHealthPoll();
  }, [executeHealthPoll]);

  // Periodic polling countdown + data freshness timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsSinceSync((prev) => prev + 1);
      if (autoPollEnabled) {
        setNextPollIn((prev) => {
          if (prev <= 1) {
            executeHealthPoll();
            return pollIntervalSeconds;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [autoPollEnabled, pollIntervalSeconds, executeHealthPoll]);

  const effectiveState: TrafficLightState = !isOnline
    ? 'offline'
    : simulatedOverride || trafficState;

  const relativeAgeLabel = formatRelativeSyncAge(secondsSinceSync);
  const stalenessMeta = getSyncStalenessMeta(secondsSinceSync);

  const endpoints = health?.endpoints || [
    { resource: 'contacts', path: '/v1/contacts', ok: true, httpStatus: 200, recordsCount: 5, latencyMs: 18 },
    { resource: 'projects', path: '/v1/projects', ok: true, httpStatus: 200, recordsCount: 4, latencyMs: 22 },
    { resource: 'invoices', path: '/v1/invoices', ok: true, httpStatus: 200, recordsCount: 4, latencyMs: 24 },
    { resource: 'workflows', path: '/v1/workflows', ok: true, httpStatus: 200, recordsCount: 4, latencyMs: 20 },
    { resource: 'questionnaires', path: '/v1/questionnaires', ok: true, httpStatus: 200, recordsCount: 4, latencyMs: 21 }
  ];

  const healthyCount =
    effectiveState === 'online'
      ? endpoints.length
      : effectiveState === 'degraded'
      ? Math.max(1, endpoints.length - 1)
      : 0;

  return (
    <div
      className={`rounded-2xl bg-slate-950/85 border transition-colors ${
        effectiveState === 'online'
          ? 'border-emerald-500/30'
          : effectiveState === 'degraded'
          ? 'border-amber-500/40'
          : 'border-rose-500/40'
      } ${compact ? 'p-3 space-y-2.5' : 'p-3.5 space-y-3'}`}
    >
      {/* Top Row: Traffic-Light Signal Housing + Status Label + Last Synced Freshness Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          {/* 3-Light Traffic Signal Pod (Red / Amber / Green) */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 shadow-inner"
            title={`17hats Connection Status: ${effectiveState.toUpperCase()}`}
          >
            {/* RED: Offline */}
            <span
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                effectiveState === 'offline'
                  ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e] ring-2 ring-rose-400/50 scale-110'
                  : 'bg-rose-950/60 border border-rose-900/40 opacity-35'
              }`}
              title="Offline LED"
            />
            {/* AMBER: Degraded */}
            <span
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                effectiveState === 'degraded'
                  ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24] ring-2 ring-amber-300/50 scale-110'
                  : 'bg-amber-950/60 border border-amber-900/40 opacity-35'
              }`}
              title="Degraded LED"
            />
            {/* GREEN: Online */}
            <span
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                effectiveState === 'online'
                  ? 'bg-emerald-400 shadow-[0_0_10px_#34d399] ring-2 ring-emerald-300/50 scale-110'
                  : 'bg-emerald-950/60 border border-emerald-900/40 opacity-35'
              }`}
              title="Online LED"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold text-white tracking-tight">
                17hats Service Monitor
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${
                  effectiveState === 'online'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : effectiveState === 'degraded'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}
              >
                {effectiveState === 'online' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                {effectiveState === 'degraded' && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                {effectiveState === 'offline' && <WifiOff className="w-3 h-3 text-rose-400" />}
                {effectiveState.toUpperCase()} · {healthyCount}/{endpoints.length} ENDPOINTS
              </span>
              <span className="text-[10px] font-mono text-teal-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 tabular-nums">
                {effectiveState === 'offline'
                  ? '0ms'
                  : effectiveState === 'degraded'
                  ? `${Math.max(420, (health?.latencyMs || 22) + 390)}ms RTT`
                  : `${health?.latencyMs || 18}ms RTT`}
              </span>
            </div>

            {/* Last Synced Data Freshness Indicator (Exact Time + Relative Age + Staleness Badge) */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-1 font-mono tabular-nums">
              <span className="inline-flex items-center gap-1 text-slate-300">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>
                  Last Synced: <strong className="text-white">{lastSyncedAt}</strong> ({relativeAgeLabel})
                </span>
              </span>
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-semibold ${stalenessMeta.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${stalenessMeta.dotClass}`} />
                {stalenessMeta.label}
              </span>
            </div>
          </div>
        </div>

        {/* Polling Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAutoPollEnabled((prev) => !prev)}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
              autoPollEnabled
                ? 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
            title="Toggle periodic 17hats service layer polling"
          >
            <Zap className="w-3 h-3" />
            <span>{autoPollEnabled ? `Auto-Poll (${nextPollIn}s)` : 'Auto-Poll Paused'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSimulatedOverride(null);
              executeHealthPoll();
            }}
            disabled={isPolling}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Poll 17hats service layer immediately"
          >
            <RefreshCw className={`w-3 h-3 ${isPolling ? 'animate-spin' : ''}`} />
            <span>{isPolling ? 'Polling...' : 'Poll Now'}</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Endpoint Pills + Traffic-Light State Simulator Controls + Sparkline */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[10px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {endpoints.map((ep, idx) => {
            const epOk =
              effectiveState === 'online'
                ? ep.ok
                : effectiveState === 'degraded'
                ? idx !== endpoints.length - 1
                : false;
            return (
              <span
                key={`${ep.path}-${idx}`}
                className={`px-2 py-0.5 rounded-md font-mono border ${
                  epOk
                    ? 'bg-slate-900/90 text-emerald-300 border-slate-800'
                    : effectiveState === 'degraded'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}
              >
                {ep.path} · {epOk ? `${ep.latencyMs}ms` : effectiveState.toUpperCase()}
              </span>
            );
          })}
        </div>

        {/* Traffic-Light Mode Switcher + Mini Poll History */}
        <div className="flex items-center gap-2">
          {pollSamples.length > 0 && (
            <div className="flex items-end gap-0.5 h-3.5 px-1" title="Recent 17hats Poll History">
              {pollSamples.map((s, idx) => (
                <div
                  key={`${s.id}-${idx}`}
                  style={{
                    height: `${Math.min(100, Math.max(30, Math.round(((s.latencyMs || 25) / 100) * 100)))}%`
                  }}
                  className={`w-1 rounded-sm ${
                    s.state === 'online'
                      ? 'bg-emerald-400'
                      : s.state === 'degraded'
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                  }`}
                />
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
            <span className="text-[9px] text-slate-400 px-1 font-mono flex items-center gap-0.5">
              <Activity className="w-2.5 h-2.5 text-slate-400" /> Signal:
            </span>
            {(['online', 'degraded', 'offline'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  setSimulatedOverride((prev) => (prev === mode ? null : mode))
                }
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase transition-colors cursor-pointer ${
                  effectiveState === mode
                    ? mode === 'online'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                      : mode === 'degraded'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
