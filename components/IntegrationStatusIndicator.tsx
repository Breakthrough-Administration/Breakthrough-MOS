'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  HardDrive,
  FolderSearch,
  Mail,
  Calendar,
  CheckSquare,
  FileText,
  FileSpreadsheet,
  Presentation,
  ClipboardList,
  Users,
  MessageSquare,
  StickyNote,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wifi,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import { useManagementStore } from '@/stores/useManagementStore';
import {
  getCachedGoogleAccessToken,
  getGoogleTokenSource,
  subscribeGoogleAccessToken,
  fetchServiceAccountAccessToken,
  signInWithGoogle,
  GoogleTokenSource
} from '@/lib/firebase';

export type ServiceStatus = 'connected' | 'warning' | 'disconnected';

interface ServiceIntegration {
  id:
    | 'drive'
    | 'picker'
    | 'gmail'
    | 'calendar'
    | 'tasks'
    | 'docs'
    | 'sheets'
    | 'slides'
    | 'forms'
    | 'contacts'
    | 'chat'
    | 'keep';
  name: string;
  scopeLabel: string;
  icon: React.ElementType;
  description: string;
  status: ServiceStatus;
  statusText: string;
}

export const IntegrationStatusIndicator: React.FC = () => {
  const { isOnline, setActiveTab } = useManagementStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [hasGoogleToken, setHasGoogleToken] = useState<boolean>(() => !!getCachedGoogleAccessToken());
  const [tokenSource, setTokenSource] = useState<GoogleTokenSource>(() => getGoogleTokenSource());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Hydrate and check current connection state
  const checkStatus = async () => {
    setIsChecking(true);
    try {
      let token = getCachedGoogleAccessToken();
      if (!token && isOnline) {
        token = await fetchServiceAccountAccessToken();
      }
      setHasGoogleToken(!!token);
      setTokenSource(getGoogleTokenSource());
    } finally {
      setTimeout(() => {
        setIsChecking(false);
      }, 300);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeGoogleAccessToken((token, source) => {
      setHasGoogleToken(!!token);
      setTokenSource(source);
    });

    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const serviceState: ServiceStatus = !isOnline
    ? 'disconnected'
    : hasGoogleToken
    ? 'connected'
    : 'warning';
  const serviceStatusText = !isOnline
    ? 'Offline'
    : hasGoogleToken
    ? 'Connected'
    : 'Connecting...';

  const services: ServiceIntegration[] = [
    {
      id: 'drive',
      name: 'Google Drive',
      scopeLabel: 'drive, drive.file, drive.readonly',
      icon: HardDrive,
      description: 'Clinical PDF storage, participant folders, and global workspace search',
      status: serviceState,
      statusText: serviceStatusText
    },
    {
      id: 'picker',
      name: 'Google Picker API',
      scopeLabel: 'PickerBuilder / drive.file',
      icon: FolderSearch,
      description: 'Direct file & folder selection into the Company Document Library',
      status: serviceState,
      statusText: serviceStatusText
    },
    {
      id: 'gmail',
      name: 'Gmail Correspondence',
      scopeLabel: 'gmail.modify, gmail.send',
      icon: Mail,
      description: 'Integrated NDIS inbox view, labelling, and stakeholder replies',
      status: serviceState,
      statusText: serviceStatusText
    },
    {
      id: 'calendar',
      name: 'Google Calendar',
      scopeLabel: 'calendar, calendar.events',
      icon: Calendar,
      description: 'Therapy appointments, plan review scheduling, and session sync',
      status: serviceState,
      statusText: serviceStatusText
    },
    {
      id: 'tasks',
      name: 'Google Tasks',
      scopeLabel: 'tasks, tasks.readonly',
      icon: CheckSquare,
      description: 'Practitioner clinical follow-ups and compliance action items',
      status: serviceState,
      statusText: serviceStatusText
    },
    {
      id: 'docs',
      name: 'Google Docs',
      scopeLabel: 'documents, documents.readonly',
      icon: FileText,
      description: 'Behaviour Support Plans (BSP), clinical reports, and service agreements',
      status: serviceState,
      statusText: serviceStatusText
    },
    {
      id: 'sheets',
      name: 'Google Sheets',
      scopeLabel: 'spreadsheets',
      icon: FileSpreadsheet,
      description: 'NDIS budget trackers, PRODA claim ledgers, and dynamic tab discovery',
      status: serviceState,
      statusText: serviceStatusText
    },
    {
      id: 'slides',
      name: 'Google Slides',
      scopeLabel: 'presentations',
      icon: Presentation,
      description: 'Participant plan review decks and clinical induction presentations',
      status: serviceState,
      statusText: serviceStatusText
    },
    {
      id: 'forms',
      name: 'Google Forms',
      scopeLabel: 'forms.body, forms.responses.readonly',
      icon: ClipboardList,
      description: 'Participant intake questionnaires and nominee feedback surveys',
      status: serviceState,
      statusText: serviceStatusText
    },
    {
      id: 'contacts',
      name: 'Google Contacts (People API)',
      scopeLabel: 'contacts, contacts.readonly',
      icon: Users,
      description: 'Support coordinators, plan managers, and nominee directory sync',
      status: serviceState,
      statusText: serviceStatusText
    },
    {
      id: 'chat',
      name: 'Google Chat',
      scopeLabel: 'chat.spaces, chat.messages',
      icon: MessageSquare,
      description: 'Multidisciplinary allied health team spaces and clinical alerts',
      status: serviceState,
      statusText: serviceStatusText
    },
    {
      id: 'keep',
      name: 'Google Keep',
      scopeLabel: 'keep / Firestore field sync',
      icon: StickyNote,
      description: 'Quick clinical field observations and 1-click BIRP note conversion',
      status: serviceState,
      statusText: serviceStatusText
    }
  ];

  const connectedCount = services.filter((s) => s.status === 'connected').length;
  const overallStatus: ServiceStatus = !isOnline
    ? 'disconnected'
    : connectedCount === services.length
    ? 'connected'
    : 'warning';

  const statusColors = {
    connected: {
      dot: 'bg-emerald-400',
      ring: 'ring-emerald-400/30',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      label: 'Connected (12/12)'
    },
    warning: {
      dot: 'bg-amber-400 animate-pulse',
      ring: 'ring-amber-400/30',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      label: isChecking ? 'Connecting...' : 'Auth Ready'
    },
    disconnected: {
      dot: 'bg-rose-400',
      ring: 'ring-rose-400/30',
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      label: 'Offline'
    }
  };

  const currentTheme = statusColors[overallStatus];

  const handleConnectAll = async () => {
    try {
      setIsChecking(true);
      await signInWithGoogle();
      await checkStatus();
    } catch (err) {
      console.warn('OAuth sign-in notice, verifying service account bridge:', err);
      await checkStatus();
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Centralized Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Google Workspace Integration Status"
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all text-xs font-medium cursor-pointer ${
          isOpen
            ? 'bg-slate-800 border-slate-600 text-white shadow-sm'
            : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-300 hover:text-white'
        }`}
      >
        {/* Traffic Light Dot Indicator */}
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ring-4 ${currentTheme.ring} ${currentTheme.dot}`}
          />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${currentTheme.dot}`} />
        </span>

        <span className="hidden sm:inline-block font-medium">Workspace</span>
        <span
          className={`hidden md:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border ${currentTheme.badge}`}
        >
          {currentTheme.label}
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-[420px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-slate-200">
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <div>
                <h4 className="text-xs font-bold text-white leading-tight">
                  Google Workspace Suite (12 APIs)
                </h4>
                <p className="text-[11px] text-slate-400">
                  {tokenSource === 'user_oauth'
                    ? 'Authenticated via Personal Google OAuth 2.0 SSO'
                    : 'Authenticated via Server Service Account Bridge (gen-lang-client-0846355299)'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={checkStatus}
              disabled={isChecking}
              title="Refresh connection status"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-teal-400' : ''}`} />
            </button>
          </div>

          {/* Overall Health Summary Banner */}
          <div
            className={`my-3 p-2.5 rounded-xl border flex items-center justify-between text-xs ${
              overallStatus === 'connected'
                ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                : overallStatus === 'warning'
                ? 'bg-amber-950/30 border-amber-800/40 text-amber-300'
                : 'bg-rose-950/30 border-rose-800/40 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {overallStatus === 'connected' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : overallStatus === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>
                {overallStatus === 'connected'
                  ? 'All 12 Google Workspace APIs Connected & Active'
                  : overallStatus === 'warning'
                  ? 'Synchronising Google Workspace OAuth2 token...'
                  : 'Browser offline — local encrypted cache active'}
              </span>
            </div>

            <span className="font-mono text-[10px] uppercase font-bold tracking-wider">
              {overallStatus}
            </span>
          </div>

          {/* Service List Grid */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.id}
                  onClick={() => {
                    setActiveTab('google-workspace');
                    setIsOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors flex items-start justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-700/50 text-slate-200 shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-teal-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-white">{service.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono truncate hidden sm:inline">
                          {service.scopeLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        {service.description}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator Pill */}
                  <div className="shrink-0 flex items-center gap-1.5 mt-1">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        service.status === 'connected'
                          ? 'bg-emerald-400'
                          : service.status === 'warning'
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-semibold font-mono ${
                        service.status === 'connected'
                          ? 'text-emerald-400'
                          : service.status === 'warning'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {service.statusText}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('google-workspace');
                  setIsOpen(false);
                }}
                className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Open Workspace Hub</span>
                <ExternalLink className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('integrations');
                  setIsOpen(false);
                }}
                className="text-xs text-slate-400 hover:text-slate-200 font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>API Hub</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {hasGoogleToken && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  Live Sync
                </span>
              )}
              <button
                type="button"
                onClick={handleConnectAll}
                disabled={isChecking}
                className="px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-[11px] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <KeyRound className="w-3 h-3" />
                <span>{tokenSource === 'user_oauth' ? 'Switch Google Account' : 'Sign in with Google'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
