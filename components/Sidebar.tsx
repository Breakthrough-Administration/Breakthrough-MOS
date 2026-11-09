'use client';

import React, { useState } from 'react';
import { useManagementStore, TabType } from '@/stores/useManagementStore';
import {
  LayoutDashboard,
  Users,
  Target,
  FileText,
  AlertOctagon,
  Shield,
  Activity,
  FileCheck,
  Wrench,
  Layers,
  StickyNote,
  GraduationCap,
  MapPin,
  FileSpreadsheet,
  CheckSquare,
  DollarSign,
  Briefcase,
  History,
  Lock,
  Boxes,
  UserCheck,
  Sparkles,
  X,
  ChevronDown,
  ChevronRight,
  Search
} from 'lucide-react';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  metaText?: string;
  urgent?: boolean;
}

interface NavSection {
  id: string;
  title: string;
  subtitle: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const {
    currentUser,
    isMobileSidebarOpen,
    setMobileSidebarOpen,
    incidents,
    restrictivePractices,
    claims,
    clients,
    companyDocuments
  } = useManagementStore();

  const [navSearch, setNavSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'daily-practice': true,
    'clinical-pbs': true,
    'safeguarding-compliance': true,
    'finance-integrations': true
  });

  const reportableIncidents = incidents.filter(
    (i) => i.severity?.includes('Critical') && i.status !== 'Closed'
  ).length;
  const pendingRP = restrictivePractices.filter((r) => r.monthlyReportStatus === 'Due').length;
  const pendingClaims = claims.filter((c) => c.status === 'Pending').length;
  const activeClientsCount = clients.filter((c) => c.status === 'Active').length;

  // Reorganized into 4 intuitive workflow-driven groups with collapsible sub-tabs
  const sections: NavSection[] = [
    {
      id: 'daily-practice',
      title: '01. Daily Practice & Caseload',
      subtitle: 'Executive overview, participants & scheduling',
      items: [
        { id: 'command-center', label: 'Command Center', icon: LayoutDashboard, metaText: '5s Hub' },
        {
          id: 'clients',
          label: 'Participants Directory',
          icon: Users,
          metaText: `${activeClientsCount} Active`
        },
        {
          id: 'caseload-kanban',
          label: 'Caseload Kanban',
          icon: Layers,
          metaText: `${clients.length} Cases`
        },
        { id: 'ndis-goals', label: 'Goal & GAS Tracking', icon: Target },
        { id: 'google-maps', label: 'Field Route & Travel', icon: MapPin },
        {
          id: 'company-library',
          label: 'Document Library',
          icon: Briefcase,
          metaText: `${companyDocuments.length} docs`
        }
      ]
    },
    {
      id: 'clinical-pbs',
      title: '02. Clinical & PBS Delivery',
      subtitle: 'SOAP notes, FBA baselines & behaviour plans',
      items: [
        {
          id: 'case-notes',
          label: 'Case Notes & SOAP Builder',
          icon: FileText,
          metaText: 'Sec 34 Ready'
        },
        { id: 'bsp-plans', label: 'Behaviour Plans (BSP)', icon: FileCheck },
        { id: 'abc-analyser', label: 'ABC & FBA Baseline Log', icon: Activity },
        { id: 'practice-tools', label: 'Clinical Assessment Tools', icon: Wrench },
        {
          id: 'clinical-signoff-queue',
          label: 'Clinical Sign-Off Queue',
          icon: UserCheck,
          metaText: 'Co-Sign'
        },
        { id: 'ai-predictive-insights', label: 'Clinical Decision Insights', icon: Sparkles }
      ]
    },
    {
      id: 'safeguarding-compliance',
      title: '03. Safeguarding & NDIS Rules',
      subtitle: 'Section 14 NIL, IR01/IR02 & quality audit',
      items: [
        {
          id: 'restrictive-practices',
          label: 'Restrictive Practices & S.14',
          icon: Shield,
          metaText: pendingRP > 0 ? `${pendingRP} Due` : 'S.14 NIL',
          urgent: pendingRP > 0
        },
        {
          id: 'incidents',
          label: 'Incidents (IR01 / IR02)',
          icon: AlertOctagon,
          metaText: reportableIncidents > 0 ? `${reportableIncidents} Alert` : '0 Open',
          urgent: reportableIncidents > 0
        },
        {
          id: 'pbs-governance',
          label: 'PBS Governance Suite',
          icon: Shield,
          metaText: 'Mod 2/2A'
        },
        { id: 'audit', label: 'NDIS Audit & Quality', icon: CheckSquare },
        { id: 'audit-logs', label: 'Compliance Audit Logger', icon: History },
        { id: 'security-audit', label: 'Security & Access Audit', icon: Lock, adminOnly: true }
      ]
    },
    {
      id: 'finance-integrations',
      title: '04. Finance, PRODA & Hub',
      subtitle: 'PAPL claims, 17hats CRM & Google Workspace',
      items: [
        {
          id: 'budget-monitoring',
          label: 'Real-Time Budget Monitor',
          icon: Activity,
          metaText: `${clients.length} Plans`
        },
        {
          id: 'billing',
          label: 'NDIS Billing & PACE',
          icon: DollarSign,
          metaText: pendingClaims > 0 ? `${pendingClaims} Pending` : undefined
        },
        {
          id: 'papl-calculator',
          label: 'PAPL Travel Calculator',
          icon: MapPin,
          metaText: 'MMM1–7'
        },
        { id: 'crm', label: 'Intake & 17hats CRM', icon: Briefcase },
        { id: 'hr-roster', label: 'Practitioners & HR Roster', icon: FileSpreadsheet },
        { id: 'google-workspace', label: 'Google Workspace Hub', icon: Layers },
        { id: 'google-keep', label: 'Keep Clinical Sync', icon: StickyNote },
        { id: 'google-classroom', label: 'Training & Induction', icon: GraduationCap },
        { id: 'integrations', label: 'API Integrations Hub', icon: Boxes, adminOnly: true },
        { id: 'participant-portal', label: 'Participant / Nominee Portal', icon: UserCheck }
      ]
    }
  ];

  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const content = (
    <div className="flex flex-col h-full bg-slate-900/95 border-r border-slate-800 select-none overflow-hidden">
      <div className="p-3.5 flex items-center justify-between md:hidden border-b border-slate-800">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Workflow Navigation
        </span>
        <button
          onClick={() => setMobileSidebarOpen(false)}
          className="p-1 rounded-lg text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Filter inside Sidebar to find any of the 27 modules in <1 second */}
      <div className="px-3 pt-3 pb-2 border-b border-slate-800/80">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
          <input
            type="text"
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            placeholder="Filter workflow tabs..."
            className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500/60"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3">
        {sections.map((sec) => {
          const visibleItems = sec.items.filter((item) => {
            const roleAllowed = !item.adminOnly || currentUser?.role === 'ADMIN';
            const matchesFilter =
              !navSearch.trim() ||
              item.label.toLowerCase().includes(navSearch.toLowerCase()) ||
              sec.title.toLowerCase().includes(navSearch.toLowerCase());
            return roleAllowed && matchesFilter;
          });
          if (visibleItems.length === 0) return null;

          const isExpanded = Boolean(navSearch.trim()) || expandedGroups[sec.id] !== false;
          const hasActiveChild = visibleItems.some((i) => i.id === activeTab);

          return (
            <div
              key={sec.id}
              className="rounded-2xl bg-slate-950/40 border border-slate-800/70 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleGroup(sec.id)}
                className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  hasActiveChild ? 'bg-slate-900/90 text-white' : 'hover:bg-slate-900/50 text-slate-300'
                }`}
              >
                <div className="min-w-0">
                  <h3 className="text-[11px] font-bold tracking-tight text-slate-200 truncate">
                    {sec.title}
                  </h3>
                  <p className="text-[10px] text-slate-500 truncate">{sec.subtitle}</p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-1.5 pb-2 pt-1 space-y-0.5 border-t border-slate-800/50">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                              isActive ? 'text-teal-400' : 'text-slate-400'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.metaText && (
                          <span
                            className={`text-[10px] font-mono tabular-nums shrink-0 ml-1.5 ${
                              item.urgent
                                ? 'text-amber-300 font-bold'
                                : isActive
                                ? 'text-teal-300'
                                : 'text-slate-500'
                            }`}
                          >
                            {item.metaText}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:block w-64 flex-shrink-0 h-[calc(100vh-5.75rem)]">
        {content}
      </aside>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-50">{content}</div>
        </div>
      )}
    </>
  );
};
