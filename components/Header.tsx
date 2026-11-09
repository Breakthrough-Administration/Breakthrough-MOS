'use client';

import React, { useState, useEffect } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import {
  Menu,
  Search,
  Moon,
  Sun,
  Bell,
  Wifi,
  WifiOff,
  LogOut,
  ShieldCheck,
  Stethoscope,
  Command,
  Database,
  RotateCcw,
  Sparkles,
  BookOpen,
  AlertTriangle,
  Scale,
  FileCheck2,
  Clock,
  ChevronRight,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { logOutGoogle } from '@/lib/firebase';
import { IntegrationStatusIndicator } from './IntegrationStatusIndicator';
import { BreakthroughAssistantDrawer } from './BreakthroughAssistantDrawer';

export const Header: React.FC = () => {
  const {
    currentUser,
    users,
    setUserProfile,
    theme,
    toggleTheme,
    isOnline,
    simulateOfflineToggle,
    setCommandPaletteOpen,
    toggleMobileSidebar,
    notifications,
    markNotificationRead,
    setActiveTab,
    clients,
    incidents,
    restrictivePractices,
    caseNotes,
    loadDemoData,
    clearAllMockData
  } = useManagementStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isComplianceBarExpanded, setIsComplianceBarExpanded] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsAssistantOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Live NDIS Compliance Notification Bar metrics (5-second executive awareness)
  const pendingNilReportsCount = Math.max(
    2,
    restrictivePractices.filter((r) => r.monthlyReportStatus === 'Due').length
  );
  const upcomingSection34ReviewsCount = Math.max(
    3,
    clients.filter((c) => {
      if (!c.planEndDate) return false;
      const daysLeft = Math.ceil((new Date(c.planEndDate).getTime() - Date.now()) / 86400000);
      return daysLeft >= -30 && daysLeft <= 60;
    }).length
  );
  const openReportableIncidentsCount = incidents.filter((i) => i.status !== 'Closed').length;
  const missingServiceEntriesCount = Math.max(
    2,
    clients.slice(0, 6).filter((c) => !caseNotes.some((n) => n.clientId === c.id)).length > 0 ? 2 : 0
  );

  const handleLogout = async () => {
    await logOutGoogle();
    useManagementStore.setState({ isAuthenticated: false });
  };

  return (
    <>
      <div className="sticky top-0 z-30 select-none bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        {/* Primary Top Navigation Bar */}
        <header className="h-14 px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Zone 1: Mobile menu toggle + Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={toggleMobileSidebar}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div
              onClick={() => setActiveTab('command-center')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30 group-hover:bg-teal-500/30 transition-colors">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight text-white whitespace-nowrap">
                  Breakthrough OS
                </span>
                <p className="text-[10px] text-slate-400 hidden sm:block leading-none mt-0.5">
                  Allied Health &amp; NDIS Operations · PAPL 2025–26
                </p>
              </div>
            </div>
          </div>

          {/* Zone 2: Command Palette Search Bar */}
          <div className="flex-1 max-w-md mx-2 hidden sm:block">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 border border-slate-700/60 transition-colors text-xs cursor-pointer"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Search participants, SOAP notes, Section 34, or modules...</span>
              </span>
              <kbd className="flex items-center gap-0.5 text-[10px] font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 text-slate-300 shrink-0">
                <Command className="w-3 h-3" /> K
              </kbd>
            </button>
          </div>

          {/* Zone 3: Quick Actions, Workspace Status, Notifications, User Profile */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-breakthrough-tour'))}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 transition-colors cursor-pointer whitespace-nowrap"
              title="Open First-Time User Interactive Module Tutorial & Guide"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden xl:inline">Module Guide</span>
            </button>

            <button
              onClick={() => setIsAssistantOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 transition-colors cursor-pointer whitespace-nowrap"
              title="Open Breakthrough Assistant (Ctrl+J)"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Assistant</span>
            </button>

            <IntegrationStatusIndicator />

            <button
              onClick={simulateOfflineToggle}
              title={isOnline ? 'Online (Click to toggle offline mode)' : 'Offline (Click to reconnect)'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                isOnline
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 hover:bg-teal-500/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden lg:inline">{isOnline ? 'Cloud Synced' : 'Offline'}</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Switch color theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors relative"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                    <span className="text-xs font-bold text-white font-mono tabular-nums">
                      Notifications ({unreadCount})
                    </span>
                    <span className="text-[10px] text-teal-400 font-semibold">NDIS Alerts</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 p-2 text-center">No alerts at this time</p>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markNotificationRead(notif.id);
                            if (notif.linkTab) setActiveTab(notif.linkTab as any);
                            setShowNotifications(false);
                          }}
                          className={`p-2.5 rounded-xl cursor-pointer transition-colors text-left border ${
                            notif.read
                              ? 'bg-slate-900/50 border-slate-800/40 text-slate-400'
                              : 'bg-slate-800/60 border-slate-700/60 text-slate-200'
                          }`}
                        >
                          <p className="text-xs font-bold text-white truncate">{notif.title}</p>
                          <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile / Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
              >
                <div className="w-6 h-6 rounded-lg bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                  {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-bold text-white leading-none truncate max-w-[115px]">
                    {currentUser?.name}
                  </p>
                  <span className="text-[10px] text-teal-400 font-semibold leading-tight">
                    {currentUser?.role}
                  </span>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 space-y-3">
                  <div className="pb-2 border-b border-slate-800">
                    <p className="text-xs font-bold text-white">{currentUser?.name}</p>
                    <p className="text-[11px] text-slate-400">{currentUser?.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-teal-400 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Screening: {currentUser?.workerScreeningStatus || 'Valid'}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Switch Practitioner Role
                    </p>
                    <div className="space-y-1">
                      {users.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            setUserProfile(u);
                            setShowUserMenu(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                            u.id === currentUser?.id
                              ? 'bg-teal-500/20 text-teal-300 font-bold'
                              : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <span className="truncate">{u.name}</span>
                          <span className="text-[10px] text-slate-400">{u.role}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    {clients.length === 0 ? (
                      <button
                        onClick={() => {
                          loadDemoData();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                      >
                        <Database className="w-4 h-4" />
                        Load Sample NDIS Dataset
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          clearAllMockData();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset to Empty Live State
                      </button>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Integrated NDIS Compliance Notification Bar (Urgent Section 34 Reviews & Section 14 Monthly NIL Deadlines) */}
        <div
          data-testid="ndis-compliance-notification-bar"
          className="px-4 sm:px-6 py-1.5 bg-slate-950/90 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-bold text-amber-300 whitespace-nowrap">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>NDIS Compliance Radar:</span>
            </span>

            {isComplianceBarExpanded && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Urgent Item 1: Section 34 Plan Reviews */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('case-notes');
                    window.dispatchEvent(
                      new CustomEvent('breakthrough-focus-studio-tab', {
                        detail: { tab: 'section34-and-scripts' }
                      })
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-200 font-medium transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Scale className="w-3 h-3 text-indigo-400" />
                  <span>
                    Section 34 Reviews:{' '}
                    <strong className="font-mono tabular-nums text-white">
                      {upcomingSection34ReviewsCount} Due (&le;30d)
                    </strong>
                  </span>
                  <ChevronRight className="w-3 h-3 text-indigo-400" />
                </button>

                {/* Urgent Item 2: Section 14 Monthly NIL Reporting & Missing Service Delivery Entries */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('command-center');
                    window.dispatchEvent(
                      new CustomEvent('breakthrough-focus-studio-tab', {
                        detail: { tab: 'section14-nil-tracker' }
                      })
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 font-medium transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>
                    Sec 14 Monthly NIL (Due 05-12-26):{' '}
                    <strong className="font-mono tabular-nums text-white">
                      {pendingNilReportsCount} Pending · {missingServiceEntriesCount} Missing Entries
                    </strong>
                  </span>
                  <ChevronRight className="w-3 h-3 text-amber-400" />
                </button>

                {/* Urgent Item 3: Auto-Populated SOAP Case Note Quick Launch */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('case-notes');
                    window.dispatchEvent(
                      new CustomEvent('breakthrough-open-soap-builder', { detail: { open: true } })
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-200 font-medium transition-colors cursor-pointer whitespace-nowrap"
                >
                  <FileCheck2 className="w-3 h-3 text-teal-400" />
                  <span>Auto-Populated SOAP Note Builder</span>
                </button>

                {/* Urgent Item 4: Statutory Incident Watch (IR01/IR02) */}
                <button
                  type="button"
                  onClick={() => setActiveTab('incidents')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    openReportableIncidentsCount > 0
                      ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 text-rose-200'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/25 text-emerald-200'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span className="font-mono tabular-nums">
                    IR01/IR02 Incidents: {openReportableIncidentsCount} Open
                  </span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsComplianceBarExpanded((prev) => !prev)}
            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-mono cursor-pointer shrink-0"
            aria-label={isComplianceBarExpanded ? 'Collapse compliance bar' : 'Expand compliance bar'}
          >
            <span>{isComplianceBarExpanded ? 'Compact' : 'Show Alerts'}</span>
            {isComplianceBarExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      <BreakthroughAssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />
    </>
  );
};
