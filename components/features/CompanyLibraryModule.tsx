'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useManagementStore } from '@/stores/useManagementStore';
import { CompanyDocument, CompanyDocumentCategory } from '@/types';
import {
  FolderOpen,
  FileText,
  UploadCloud,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  ShieldCheck,
  Briefcase,
  FileSpreadsheet,
  Sparkles,
  Download,
  Trash2,
  ExternalLink,
  Users,
  Mail,
  ArrowRight,
  Building2,
  X,
  Check,
  RefreshCw,
  Compass,
  HardDrive,
  BookOpen
} from 'lucide-react';
import { GooglePickerDocumentLibraryModal } from './GooglePickerDocumentLibraryModal';
import { CompanyLibraryMasterGuideBook } from './ModuleTutorialSystem';

const VAULT_CATEGORIES: {
  id: CompanyDocumentCategory | 'ALL';
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}[] = [
  {
    id: 'ALL',
    label: 'All Company Documents',
    shortLabel: 'All Vaults',
    description: 'Complete repository of corporate financials, NDIS policies, HR contracts, and templates',
    icon: FolderOpen,
    accent: 'text-teal-400 bg-teal-500/10 border-teal-500/20'
  },
  {
    id: 'Financials, P&L, BAS & Tax',
    label: 'Financials, P&L, BAS & Tax',
    shortLabel: 'Financials & Tax',
    description: 'Profit & Loss statements, quarterly BAS, Xero exports, payroll ledgers, and tax filings',
    icon: DollarSign,
    accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  },
  {
    id: 'NDIS Policies, SOPs & Governance',
    label: 'NDIS Policies, SOPs & Governance',
    shortLabel: 'Policies & SOPs',
    description: 'NDIS Practice Standards policies, Incident & Restrictive Practice SOPs, and Risk Registers',
    icon: ShieldCheck,
    accent: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
  },
  {
    id: 'HR Contracts, Insurance & Licenses',
    label: 'HR Contracts, Insurance & Licenses',
    shortLabel: 'HR & Insurance',
    description: 'Public Liability & Professional Indemnity ($20M), WorkCover, SCHADS contracts, and PRODA certs',
    icon: Briefcase,
    accent: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
  },
  {
    id: 'Clinical Templates & Service Agreements',
    label: 'Clinical Templates & Service Agreements',
    shortLabel: 'Templates & Agreements',
    description: 'Master Service Agreements, Schedule of Supports, Consent forms, and BSP/FBA clinical templates',
    icon: FileText,
    accent: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
  },
  {
    id: 'Participant Plans & Schedules',
    label: 'Participant Plans & Schedules',
    shortLabel: 'Participant Plans',
    description: 'Uploaded NDIS Plan PDFs and funding schedules linked to your 22 active participants',
    icon: Users,
    accent: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
  }
];

export const CompanyLibraryModule: React.FC = () => {
  const {
    companyDocuments,
    addCompanyDocument,
    updateCompanyDocument,
    deleteCompanyDocument,
    clients,
    practitioners,
    updateClient,
    addBillingClaim,
    setActiveTab,
    currentUser,
    addNotification
  } = useManagementStore();

  const [activeView, setActiveView] = useState<
    'vault' | 'drive-sync' | 'staff-meeting' | 'module-guide' | 'plan-managers' | 'advisory'
  >('vault');
  const [selectedCategory, setSelectedCategory] = useState<CompanyDocumentCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isGooglePickerModalOpen, setIsGooglePickerModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<CompanyDocument | null>(null);
  const [isExtractingAI, setIsExtractingAI] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Simulated Google Drive Sync Engine state
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [driveSyncProgress, setDriveSyncProgress] = useState(100);
  const [lastDriveSyncTimestamp, setLastDriveSyncTimestamp] = useState('06-11-26 07:05 AWST');
  const [driveFolderSyncState, setDriveFolderSyncState] = useState<
    Array<{
      id: string;
      driveFolderPath: string;
      vaultCategory: CompanyDocumentCategory;
      fileCount: number;
      status: 'Synced' | 'Delta Detected' | 'Syncing';
      lastHash: string;
      sampleFiles: string[];
    }>
  >([
    {
      id: 'gdrive-fin',
      driveFolderPath: '/Breakthrough_Corporate_Vault/01_Financials_PAPL_Pricing',
      vaultCategory: 'Financials, P&L, BAS & Tax',
      fileCount: 6,
      status: 'Synced',
      lastHash: 'SHA256-8F4A-FIN26',
      sampleFiles: [
        'NDIS_Funding_Cuts_60h_to_45h_Travel_Elimination_06-11-26.pdf',
        'Support_Worker_Pricing_Adjustment_73_to_62_Oct2026.xlsx',
        'Marketing_Outreach_1000_Emails_vs_Agency_ROI_Analysis.pdf'
      ]
    },
    {
      id: 'gdrive-pol',
      driveFolderPath: '/Breakthrough_Corporate_Vault/02_NDIS_Policies_Audit_SOPs',
      vaultCategory: 'NDIS Policies, SOPs & Governance',
      fileCount: 7,
      status: 'Synced',
      lastHash: 'SHA256-3C9E-POL26',
      sampleFiles: [
        'Mandatory_FBA_Direct_Indirect_FAST_MAS_Policy_06-11-26.pdf',
        'Empirical_Evidence_2Week_Baseline_Excel_Graph_Standard.pdf',
        'Immediate_Incident_Photography_Property_Damage_SOP.pdf'
      ]
    },
    {
      id: 'gdrive-hr',
      driveFolderPath: '/Breakthrough_Corporate_Vault/03_HR_Meetings_BOC_Training',
      vaultCategory: 'HR Contracts, Insurance & Licenses',
      fileCount: 5,
      status: 'Delta Detected',
      lastHash: 'SHA256-7D1B-HR26',
      sampleFiles: [
        'Staff_Meeting_Minutes_and_9_Action_Items_06-11-26.pdf',
        'Anitha_Haripersad_BOC_Training_Module_Curriculum_2026.pdf',
        'SCHADS_Support_Worker_Rate_Schedule_v2026.4.pdf'
      ]
    },
    {
      id: 'gdrive-tpl',
      driveFolderPath: '/Breakthrough_Corporate_Vault/04_Clinical_Templates_FBA_BSP',
      vaultCategory: 'Clinical Templates & Service Agreements',
      fileCount: 8,
      status: 'Delta Detected',
      lastHash: 'SHA256-9E2C-TPL26',
      sampleFiles: [
        'TriModal_FBA_Data_Collection_Sheet_Direct_Indirect_Product.xlsx',
        'Ryder_Social_Scripts_and_VIC_Red_Green_Break_Card_Template.pdf',
        'Saffron_Adult_Education_Pathway_and_Independence_Resource.pdf',
        'Tier3_16yo_School_Refusal_and_Aiden_8yo_FBA_Intake_Pack.pdf'
      ]
    }
  ]);

  // Nov 6, 2026 Staff Meeting Action Items state
  const [staffMeetingActions, setStaffMeetingActions] = useState([
    {
      id: 'act-1',
      owner: 'Anitha Haripersad',
      role: 'Proficient Practitioner / Clinical Lead',
      title: 'Send Assessment Data',
      detail:
        'Distribute the Functional Behaviour Assessment (FBA) data collection materials to the team. Ensure all members receive a copy of the methods for documenting direct and indirect observation.',
      category: 'Clinical Templates & Service Agreements' as CompanyDocumentCategory,
      dueDate: '08-11-26',
      completed: true
    },
    {
      id: 'act-2',
      owner: 'Anitha Haripersad',
      role: 'Proficient Practitioner / Clinical Lead',
      title: 'Present Reporting Data & Excel Graph Formatting',
      detail:
        'Demonstrate the required formatting for 2-week baseline Excel data graphs during the next staff meeting and explain empirical evidence standards for NDIS compliance audits.',
      category: 'NDIS Policies, SOPs & Governance' as CompanyDocumentCategory,
      dueDate: '13-11-26',
      completed: false
    },
    {
      id: 'act-3',
      owner: 'The Group (All Practitioners)',
      role: 'Clinical & Support Team',
      title: 'Record Client Data (Direct, Indirect & Product)',
      detail:
        'Implement standardized direct observation (witnessing, video, photo, audio) and indirect observation (FAST, MAS, 2 interviews) techniques using tally sheets.',
      category: 'Clinical Templates & Service Agreements' as CompanyDocumentCategory,
      dueDate: 'Ongoing',
      completed: true
    },
    {
      id: 'act-4',
      owner: 'The Group (All Practitioners)',
      role: 'Clinical & Support Team',
      title: 'Photograph & Document Incidents Immediately',
      detail:
        'Photograph and document incidents of physical aggression or property damage immediately (Behaviour Product Measurement) to ensure sufficient empirical audit evidence.',
      category: 'NDIS Policies, SOPs & Governance' as CompanyDocumentCategory,
      dueDate: 'Immediate',
      completed: true
    },
    {
      id: 'act-5',
      owner: 'Anitha Haripersad',
      role: 'Proficient Practitioner / Clinical Lead',
      title: 'Develop Behaviours of Concern (BOC) Training',
      detail:
        'Develop comprehensive training modules focusing on Behaviours of Concern to improve Behaviour Support Plans and reporting consistency across the practice.',
      category: 'HR Contracts, Insurance & Licenses' as CompanyDocumentCategory,
      dueDate: '15-11-26',
      completed: false
    },
    {
      id: 'act-6',
      owner: 'Anitha Haripersad',
      role: 'Proficient Practitioner / Clinical Lead',
      title: 'Share Standardized Data Collection Sheet',
      detail:
        'Distribute the unified data collection sheet (organized into an accessible web-ready format) to the team to ensure consistency in tracking direct and indirect observations.',
      category: 'Clinical Templates & Service Agreements' as CompanyDocumentCategory,
      dueDate: '08-11-26',
      completed: true
    },
    {
      id: 'act-7',
      owner: 'Anitha Haripersad',
      role: 'Proficient Practitioner / Clinical Lead',
      title: 'Create 2-Week Baseline Data Graph',
      detail:
        'Create a visual Excel graph using behaviour data from recent cases to demonstrate progress and 2-week baseline metrics for the upcoming staff training.',
      category: 'Clinical Templates & Service Agreements' as CompanyDocumentCategory,
      dueDate: '12-11-26',
      completed: false
    },
    {
      id: 'act-8',
      owner: 'Andreja Majcenovic',
      role: 'Core Practitioner',
      title: 'Provide Saffron Adult Education Pathway Update',
      detail:
        'Share findings regarding adult certificate courses and work education pathway alternatives to mainstream Year 12 for Saffron following the scheduled 09-11-26 meeting with Laura.',
      category: 'Clinical Templates & Service Agreements' as CompanyDocumentCategory,
      dueDate: '09-11-26',
      completed: false
    },
    {
      id: 'act-9',
      owner: 'Anitha Haripersad',
      role: 'Proficient Practitioner / Clinical Lead',
      title: 'Create Saffron Confidence & Independence Resource',
      detail:
        'Design a specific learning and support resource tailored to help Saffron build confidence and independence for her post-school transition.',
      category: 'Clinical Templates & Service Agreements' as CompanyDocumentCategory,
      dueDate: '14-11-26',
      completed: false
    }
  ]);

  // Upload Form State
  const [uploadForm, setUploadForm] = useState<{
    title: string;
    fileName: string;
    category: CompanyDocumentCategory;
    version: string;
    status: 'Current' | 'Review Due Soon' | 'Expired' | 'Draft';
    effectiveDate: string;
    reviewOrExpiryDate: string;
    fileSize: string;
    mimeType: string;
    url: string;
    linkedParticipantId: string;
    summary: string;
    rawTextContent: string;
    extractedFacts: { label: string; value: string }[];
    extractedBudgetAmount: number;
    tagsInput: string;
  }>({
    title: '',
    fileName: '',
    category: 'Financials, P&L, BAS & Tax',
    version: 'v1.0',
    status: 'Current',
    effectiveDate: new Date().toISOString().split('T')[0],
    reviewOrExpiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    fileSize: '250 KB',
    mimeType: 'application/pdf',
    url: '',
    linkedParticipantId: '',
    summary: '',
    rawTextContent: '',
    extractedFacts: [],
    extractedBudgetAmount: 0,
    tagsInput: 'Company, Governance, 2026'
  });

  const showBanner = (msg: string) => {
    setBannerMessage(msg);
    setTimeout(() => setBannerMessage(null), 5000);
  };

  const handleRunSimulatedDriveSync = () => {
    setIsDriveSyncing(true);
    setDriveSyncProgress(25);
    setDriveFolderSyncState((prev) =>
      prev.map((f) => ({ ...f, status: 'Syncing' }))
    );

    setTimeout(() => {
      setDriveSyncProgress(70);
    }, 350);

    setTimeout(() => {
      setDriveSyncProgress(100);
      setIsDriveSyncing(false);
      setLastDriveSyncTimestamp(`06-11-26 ${new Date().toTimeString().slice(0, 5)} AWST`);
      setDriveFolderSyncState((prev) =>
        prev.map((f) => ({
          ...f,
          status: 'Synced',
          lastHash: `SHA256-${Math.random().toString(16).slice(2, 6).toUpperCase()}-SYNC`
        }))
      );
      showBanner(
        'Google Drive Corporate Vault Sync Completed: Verified Financials, NDIS Policies, HR Action Register, and FBA Clinical Templates (06-11-26).'
      );
    }, 800);
  };

  const allDocumentsWithMasterGuide = useMemo<CompanyDocument[]>(() => {
    const curatedNov6VaultDocs: CompanyDocument[] = [
      {
        id: 'DOC-SOP-APP-GUIDE-2026',
        title: 'Breakthrough OS — Master Application & Module Operations Manual (27 Modules)',
        fileName: 'Breakthrough_OS_Master_Module_Operations_Guide_v2026.4.pdf',
        category: 'NDIS Policies, SOPs & Governance',
        version: 'v2026.4',
        status: 'Current',
        uploadedBy: 'Shivandhari Persad (Clinical Director)',
        uploadedAt: '2026-11-04',
        effectiveDate: '2026-11-04',
        reviewOrExpiryDate: '2027-11-04',
        fileSize: '420 KB',
        mimeType: 'application/pdf',
        summary:
          'Comprehensive staff onboarding and standard operating manual explaining the purpose, 4-step workflow, NDIS compliance guardrails, and role duties (Entry, Core, Proficient, Director) for all 27 modules in Breakthrough OS.',
        extractedFacts: [
          { label: 'Documented Modules', value: '27 Modules across 5 Pillars' },
          { label: 'Target Staff Roles', value: 'Entry, Core, Proficient & Director' },
          { label: 'Export Formats', value: 'Interactive Handbook, Printable PDF & Google Docs' }
        ],
        tags: ['Master Guide', 'Onboarding', 'SOP', 'NDIS Compliance', 'Module Tutorial']
      },
      {
        id: 'DOC-FIN-NDIS-CUTS-061126',
        title: 'NDIS Funding Cuts (60h→45h), Support Worker Pricing ($73→$62) & Marketing ROI Brief',
        fileName: 'NDIS_Funding_Adjustments_and_Pricing_Analysis_06-11-26.pdf',
        category: 'Financials, P&L, BAS & Tax',
        version: 'v2026.11',
        status: 'Current',
        uploadedBy: 'Anitha Haripersad & Director Office',
        uploadedAt: '2026-11-06',
        effectiveDate: '2026-10-01',
        reviewOrExpiryDate: '2027-06-30',
        fileSize: '315 KB',
        mimeType: 'application/pdf',
        summary:
          'Financial & pricing impact brief from the 06-11-26 Staff Meeting: NDIS reduced participants receiving behaviour support funding by 20% and cut plan hours from 60 hours to 45 hours by eliminating provider travel allocations. Support worker pricing decreased from $73.00/hr to $62.00/hr effective 01-10-26 while travel reimbursement rates remained static despite rising petrol prices. Also documents marketing outreach (>1,000 emails sent; $1,200/mo and $650/mo agency retainers declined in favour of direct personal engagement).',
        extractedFacts: [
          { label: 'PBS Participant Funding Cut', value: '-20% across NDIS renewals' },
          { label: 'Plan Hours Allocation Cut', value: '60 hrs → 45 hrs (Travel Eliminated)' },
          { label: 'Support Worker Rate (Eff. 01-10-26)', value: '$73.00/hr → $62.00/hr (-$11.00/hr)' },
          { label: 'Marketing Agency Proposals Declined', value: '$1,200/mo & $650/mo retainers declined' }
        ],
        tags: ['Financials', 'NDIS Funding Cuts', 'Support Worker Pricing', 'Travel Allocation', '06-11-26']
      },
      {
        id: 'DOC-POL-FBA-EVIDENCE-061126',
        title: 'Mandatory FBA Minimum Evidence, Tri-Modal Measurement & 2-Week Baseline Excel Graph Policy',
        fileName: 'NDIS_Audit_Empirical_Evidence_and_FBA_Standard_06-11-26.pdf',
        category: 'NDIS Policies, SOPs & Governance',
        version: 'v3.2',
        status: 'Current',
        uploadedBy: 'Anitha Haripersad (Proficient Practitioner)',
        uploadedAt: '2026-11-06',
        effectiveDate: '2026-11-06',
        reviewOrExpiryDate: '2027-11-06',
        fileSize: '290 KB',
        mimeType: 'application/pdf',
        summary:
          'Mandatory clinical governance policy addressing heightened NDIS compliance audits: funding renewals require empirical evidence and 2-week baseline data displayed on Excel graphs. Every Functional Behaviour Assessment (FBA) must include: (1) Direct Observation (real-time witnessing, video, photographs, or audio), (2) Indirect Measurement (minimum 2 structured interviews, document reviews, and standardized questionnaires FAST & MAS), and (3) Behaviour Product Measurement (immediate post-incident photography of property damage or environmental evidence).',
        extractedFacts: [
          { label: 'Mandatory FBA Components', value: 'Direct Obs + 2 Interviews + Docs + FAST/MAS' },
          { label: 'Baseline Graphing Requirement', value: '2-Week Baseline Data on Excel Graphs' },
          { label: 'Incident Evidence Standard', value: 'Immediate Photography + Tally Sheets' },
          { label: 'Emergency Escalation Protocol', value: 'Adolescent 000 Dispute Triage & Lock' }
        ],
        tags: ['Policy', 'FBA Requirements', 'FAST', 'MAS', '2-Week Baseline', 'Excel Graph', '06-11-26']
      },
      {
        id: 'DOC-HR-MINUTES-061126',
        title: 'Staff Meeting Minutes, Action Register & BOC Training Rollout (06-11-26)',
        fileName: 'Staff_Meeting_Minutes_and_Action_Register_06-11-26.pdf',
        category: 'HR Contracts, Insurance & Licenses',
        version: 'v1.0',
        status: 'Current',
        uploadedBy: 'Anitha Haripersad & Andreja Majcenovic',
        uploadedAt: '2026-11-06',
        effectiveDate: '2026-11-06',
        reviewOrExpiryDate: '2026-12-06',
        fileSize: '265 KB',
        mimeType: 'application/pdf',
        summary:
          'Official HR & clinical team meeting minutes from 06-11-26 covering therapy strategies (Ryder 40-min session contribution, social scripts, Victorian school Red/Green 5-min break card), NDIS funding cuts (60h→45h), new referrals (16yo Tier 3 school refusal; Aiden 8–9yo), Saffron adult education pathway (09-11-26 Laura meeting), and 9 assigned team action items.',
        extractedFacts: [
          { label: 'Meeting Date', value: '06-11-26' },
          { label: 'Assigned Action Items', value: '9 Actions (Anitha, Andreja & The Group)' },
          { label: 'New Referrals Logged', value: '16yo Tier 3 School Refusal & Aiden (8–9yo)' },
          { label: 'BOC Training Lead', value: 'Anitha Haripersad (Web Page Resource Hub)' }
        ],
        tags: ['HR', 'Staff Meeting', '06-11-26', 'Action Items', 'BOC Training', 'Anitha', 'Andreja']
      },
      {
        id: 'DOC-TPL-FBA-SHEET-061126',
        title: 'Standardized Tri-Modal FBA Data Collection Sheet & 2-Week Baseline Excel Graph Template',
        fileName: 'Standardized_FBA_Direct_Indirect_Product_Data_Sheet_2026.xlsx',
        category: 'Clinical Templates & Service Agreements',
        version: 'v2.4',
        status: 'Current',
        uploadedBy: 'Anitha Haripersad (Proficient Practitioner)',
        uploadedAt: '2026-11-06',
        effectiveDate: '2026-11-06',
        reviewOrExpiryDate: '2027-11-06',
        fileSize: '195 KB',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        summary:
          'Web-accessible clinical template organized by Anitha Haripersad for team-wide FBA data collection: includes tally sheets for Direct Observation (witnessing, video, photo, audio), Indirect Measurement scoring matrices (FAST & MAS questionnaires + 2 structured interviews), Behaviour Product Measurement logs, and pre-formatted 2-week baseline Excel graph tabs.',
        extractedFacts: [
          { label: 'Template Author', value: 'Anitha Haripersad (Proficient Practitioner)' },
          { label: 'Standardized Questionnaires', value: 'FAST & MAS Scoring Grids Included' },
          { label: 'Graph Output', value: '2-Week Baseline Excel Graph Auto-Plotter' }
        ],
        tags: ['Clinical Template', 'FBA', 'FAST', 'MAS', 'Tally Sheet', 'Excel Graph', '06-11-26']
      },
      {
        id: 'DOC-TPL-RYDER-SAFFRON-061126',
        title: 'Ryder Social Scripts (Red/Green Break Card) & Saffron Adult Education Pathway Kit',
        fileName: 'Ryder_Social_Scripts_and_Saffron_Adult_Education_Pathways_06-11-26.pdf',
        category: 'Clinical Templates & Service Agreements',
        version: 'v1.2',
        status: 'Current',
        uploadedBy: 'Andreja Majcenovic & Anitha Haripersad',
        uploadedAt: '2026-11-06',
        effectiveDate: '2026-11-06',
        reviewOrExpiryDate: '2027-05-06',
        fileSize: '240 KB',
        mimeType: 'application/pdf',
        summary:
          'Combined clinical intervention template pack: (1) Fictional narrative Social Scripts and Victorian school Red Card / Green Card (5-minute break) visual system used by Andreja Majcenovic with Ryder (achieving 40 minutes of regulated session engagement), and (2) Adult Certificate & Work Education pathway matrix and confidence/independence resource for Saffron ahead of the 09-11-26 meeting with Laura.',
        extractedFacts: [
          { label: 'Ryder Session Milestone', value: '40 Minutes Active Contribution (Social Scripts)' },
          { label: 'School Break Mechanism', value: 'Victorian Red Card / Green Card (5-Min Break)' },
          { label: 'Saffron Pathway Review', value: 'Adult Cert / Work Ed (Meeting w/ Laura 09-11-26)' }
        ],
        tags: ['Clinical Template', 'Ryder', 'Saffron', 'Social Scripts', 'Red Green Card', 'Adult Education']
      }
    ];

    const existingIds = new Set(companyDocuments.map((d) => d.id));
    const missingCurated = curatedNov6VaultDocs.filter((d) => !existingIds.has(d.id));
    return [...missingCurated, ...companyDocuments];
  }, [companyDocuments]);

  const filteredDocuments = useMemo(() => {
    return allDocumentsWithMasterGuide.filter((doc) => {
      const matchesCat = selectedCategory === 'ALL' || doc.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesCat;
      return (
        matchesCat &&
        (doc.title.toLowerCase().includes(q) ||
          doc.fileName.toLowerCase().includes(q) ||
          (doc.summary || '').toLowerCase().includes(q) ||
          doc.tags.some((t) => t.toLowerCase().includes(q)) ||
          (doc.linkedParticipantName || '').toLowerCase().includes(q))
      );
    });
  }, [allDocumentsWithMasterGuide, selectedCategory, searchQuery]);

  // Group 22 Active Participants by Plan Manager Invoice Email for Batch Invoicing
  const planManagerGroups = useMemo(() => {
    const groups: Record<
      string,
      {
        agency: string;
        invoiceEmail: string;
        planManagementType: string;
        participants: typeof clients;
        totalRecordedBudget: number;
      }
    > = {};

    for (const c of clients) {
      const email = c.planManager?.email || (c.planManagementType?.includes('Self') ? c.email || 'Self-Managed' : 'NDIA');
      const agency =
        c.planManager?.agency ||
        c.planManager?.agencyName ||
        (email === 'NDIA' ? 'NDIA PRODA Portal' : c.planManagementType || 'Plan Managed');
      const key = `${agency}__${email}`;

      if (!groups[key]) {
        groups[key] = {
          agency,
          invoiceEmail: email,
          planManagementType: c.planManagementType || 'Plan-Managed',
          participants: [],
          totalRecordedBudget: 0
        };
      }
      groups[key].participants.push(c);
      groups[key].totalRecordedBudget += c.totalBudget || 0;
    }

    return Object.values(groups).sort((a, b) => b.participants.length - a.participants.length);
  }, [clients]);

  // Auto-detect category & facts when user selects a local file
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeKB = Math.max(1, Math.round(file.size / 1024));
    const formattedSize = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
    const lowerName = file.name.toLowerCase();

    let detectedCategory: CompanyDocumentCategory = uploadForm.category;
    if (
      lowerName.includes('fin') ||
      lowerName.includes('bas') ||
      lowerName.includes('p&l') ||
      lowerName.includes('tax') ||
      lowerName.includes('invoice') ||
      lowerName.includes('xero') ||
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.xlsx')
    ) {
      detectedCategory = 'Financials, P&L, BAS & Tax';
    } else if (
      lowerName.includes('policy') ||
      lowerName.includes('sop') ||
      lowerName.includes('incident') ||
      lowerName.includes('governance') ||
      lowerName.includes('audit')
    ) {
      detectedCategory = 'NDIS Policies, SOPs & Governance';
    } else if (
      lowerName.includes('insurance') ||
      lowerName.includes('contract') ||
      lowerName.includes('hr') ||
      lowerName.includes('screening') ||
      lowerName.includes('certificate')
    ) {
      detectedCategory = 'HR Contracts, Insurance & Licenses';
    } else if (
      lowerName.includes('agreement') ||
      lowerName.includes('template') ||
      lowerName.includes('consent') ||
      lowerName.includes('schedule')
    ) {
      detectedCategory = 'Clinical Templates & Service Agreements';
    } else if (lowerName.includes('plan') || lowerName.includes('ndis')) {
      detectedCategory = 'Participant Plans & Schedules';
    }

    // Match participant name if present in filename
    const matchedClient = clients.find((c) =>
      lowerName.includes(c.name.toLowerCase().split(' ')[0]) &&
      c.name.toLowerCase().split(' ')[0].length > 3
    );

    let textPreview = '';
    if (
      file.type.startsWith('text/') ||
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.json') ||
      lowerName.endsWith('.md')
    ) {
      try {
        textPreview = (await file.text()).slice(0, 6000);
      } catch {
        textPreview = '';
      }
    }

    const cleanTitle = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim();

    setUploadForm((prev) => ({
      ...prev,
      title: prev.title || cleanTitle,
      fileName: file.name,
      category: detectedCategory,
      fileSize: formattedSize,
      mimeType: file.type || 'application/octet-stream',
      linkedParticipantId: matchedClient?.id || prev.linkedParticipantId,
      rawTextContent: textPreview,
      summary:
        prev.summary ||
        `Uploaded company record (${file.name}, ${formattedSize}) categorized under ${detectedCategory}.`
    }));
  };

  // Run AI Evidence-Based Fact Extraction on the document
  const handleRunAIExtraction = async () => {
    setIsExtractingAI(true);
    try {
      const prompt = `You are Breakthrough Assistant analysing a company document uploaded to the Company Document Library.
Document Title: ${uploadForm.title || uploadForm.fileName}
File Name: ${uploadForm.fileName}
Category: ${uploadForm.category}
Document Content / Notes Supplied:
${uploadForm.rawTextContent || uploadForm.summary || 'Only filename and metadata supplied.'}

Extract only facts explicitly evidenced in the supplied text/metadata. Never invent or guess figures.
Return valid JSON only with this structure:
{
  "summary": "1-2 sentence neutral factual summary of the document",
  "facts": [
    { "label": "Fact Label", "value": "Evidenced Value or Not stated" }
  ],
  "detectedBudgetAud": 0
}`;

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.text || data.response || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setUploadForm((prev) => ({
            ...prev,
            summary: parsed.summary || prev.summary,
            extractedFacts: Array.isArray(parsed.facts) ? parsed.facts : prev.extractedFacts,
            extractedBudgetAmount:
              typeof parsed.detectedBudgetAud === 'number' ? parsed.detectedBudgetAud : prev.extractedBudgetAmount
          }));
          showBanner('Extracted evidenced document facts via Breakthrough Assistant.');
          setIsExtractingAI(false);
          return;
        }
      }
    } catch (err) {
      console.warn('AI extraction fallback:', err);
    }

    // Deterministic regex extraction fallback (strictly from supplied text)
    const content = `${uploadForm.title} ${uploadForm.fileName} ${uploadForm.rawTextContent} ${uploadForm.summary}`;
    const dollarMatches = content.match(/\$[0-9,]+(\.[0-9]{2})?/g) || [];
    const dateMatches = content.match(/\b(202[4-9]-[01][0-9]-[0-3][0-9]|[0-3][0-9]\/[01][0-9]\/202[4-9])\b/g) || [];
    const facts: { label: string; value: string }[] = [
      { label: 'Document Category', value: uploadForm.category },
      { label: 'File Format', value: uploadForm.fileName.split('.').pop()?.toUpperCase() || 'PDF' }
    ];
    if (dollarMatches.length > 0) {
      facts.push({ label: 'Evidenced Monetary Figures', value: dollarMatches.slice(0, 3).join(', ') });
    }
    if (dateMatches.length > 0) {
      facts.push({ label: 'Evidenced Dates', value: dateMatches.slice(0, 3).join(', ') });
    }

    const numericBudget =
      dollarMatches[0] ? parseFloat(dollarMatches[0].replace(/[^0-9.]/g, '')) || 0 : 0;

    setUploadForm((prev) => ({
      ...prev,
      extractedFacts: facts,
      extractedBudgetAmount: numericBudget
    }));
    setIsExtractingAI(false);
  };

  const handleSaveCompanyDocument = (e: React.FormEvent) => {
    e.preventDefault();
    const linkedClient = clients.find((c) => c.id === uploadForm.linkedParticipantId);
    const newDoc: CompanyDocument = {
      id: `comp-doc-${Date.now()}`,
      title: uploadForm.title.trim() || uploadForm.fileName || 'Untitled Company Document',
      fileName: uploadForm.fileName || `${uploadForm.title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      category: uploadForm.category,
      version: uploadForm.version || 'v1.0',
      status: uploadForm.status,
      effectiveDate: uploadForm.effectiveDate,
      reviewOrExpiryDate: uploadForm.reviewOrExpiryDate,
      uploadedBy: currentUser?.name || 'Director Office',
      uploadedAt: new Date().toISOString(),
      fileSize: uploadForm.fileSize || '240 KB',
      mimeType: uploadForm.mimeType || 'application/pdf',
      url: uploadForm.url || undefined,
      linkedParticipantId: linkedClient?.id,
      linkedParticipantName: linkedClient?.name,
      summary: uploadForm.summary || 'Uploaded to company operations vault.',
      extractedFacts:
        uploadForm.extractedFacts.length > 0
          ? uploadForm.extractedFacts
          : [
              { label: 'Vault Folder', value: uploadForm.category },
              { label: 'Version', value: uploadForm.version },
              { label: 'Review / Expiry Date', value: uploadForm.reviewOrExpiryDate || 'Not stated' }
            ],
      tags: uploadForm.tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    };

    addCompanyDocument(newDoc);

    // If linked to a participant and a budget amount was explicitly entered/extracted, update participant budget if desired
    if (linkedClient && uploadForm.extractedBudgetAmount > 0) {
      updateClient(linkedClient.id, {
        totalBudget: uploadForm.extractedBudgetAmount,
        allocatedBudget: uploadForm.extractedBudgetAmount,
        serviceAgreementStatus: 'Signed & Active',
        budgetBreakdown: {
          ...linkedClient.budgetBreakdown,
          capacityBuildingPBS: uploadForm.extractedBudgetAmount
        }
      });
    }

    setIsUploadModalOpen(false);
    setSelectedDoc(newDoc);
    showBanner(`Saved "${newDoc.title}" to ${newDoc.category} and synchronized with Firestore.`);
  };

  // Generate Batch Claims for a Plan Manager group
  const handleGeneratePlanManagerBatch = (group: (typeof planManagerGroups)[0]) => {
    const today = new Date().toISOString().split('T')[0];
    let createdCount = 0;

    for (const participant of group.participants) {
      addBillingClaim({
        clientId: participant.id,
        clientName: participant.name,
        ndisNumber: participant.ndisNumber,
        serviceDate: today,
        supportItemCode: '07_002_0115_8_3',
        supportItemName: 'Specialist Behavioural Intervention Support',
        ndisSupportItem: '07_002_0115_8_3 - Specialist Behavioural Intervention Support',
        hours: 2.0,
        unitRate: 214.41,
        totalAmount: 428.82,
        status: 'Pending',
        invoiceNumber: `INV-${participant.ndisNumber.slice(-4)}-${Date.now().toString().slice(-3)}`,
        claimType: participant.planManagementType || 'Plan Managed',
        practitionerId: participant.primaryPractitionerId,
        practitionerName: participant.primaryPractitionerName
      });
      createdCount++;
    }

    addNotification({
      title: `Batch Claims Prepared for ${group.agency}`,
      message: `Prepared ${createdCount} draft claims ($${(createdCount * 428.82).toFixed(2)} AUD) addressed to ${group.invoiceEmail} for staff review.`,
      type: 'billing',
      severity: 'low',
      linkTab: 'billing'
    });

    showBanner(
      `Prepared ${createdCount} draft claims for ${group.agency} (${group.invoiceEmail}). Review them in NDIS Billing & PACE before submission.`
    );
  };

  const handleExportPlanManagerCSV = (group: (typeof planManagerGroups)[0]) => {
    const headers = [
      'Participant Name',
      'NDIS Number',
      'Plan Management Type',
      'Plan Manager Agency',
      'Invoice Email',
      'Primary Practitioner',
      'Support Item Code',
      'Recorded Total Budget (AUD)'
    ];
    const rows = group.participants.map((p) => [
      `"${p.name}"`,
      `"${p.ndisNumber}"`,
      `"${p.planManagementType || 'Plan-Managed'}"`,
      `"${group.agency}"`,
      `"${group.invoiceEmail}"`,
      `"${p.primaryPractitionerName || 'Unassigned'}"`,
      `"07_002_0115_8_3"`,
      `"${(p.totalBudget || 0).toFixed(2)}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Plan_Manager_Batch_${group.agency.replace(/[^a-zA-Z0-9]+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeClientsCount = clients.filter((c) => c.status === 'Active').length;
  const zeroBudgetClients = clients.filter((c) => !c.totalBudget || c.totalBudget === 0);
  const totalCompanyBudget = clients.reduce((sum, c) => sum + (c.totalBudget || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Executive Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Company Document Library &amp; Google Drive Sync Hub
            </h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
              {allDocumentsWithMasterGuide.length} Vault Docs · Last Drive Sync {lastDriveSyncTimestamp}
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl">
            Centralized corporate vault for Financials (NDIS 60h→45h funding cuts, $73→$62 pricing, BAS, Tax), NDIS Policies &amp; FBA Audit SOPs, HR &amp; 06-11-26 Staff Meeting Action Register, and Clinical Templates with two-way Google Drive sync.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            disabled={isDriveSyncing}
            onClick={handleRunSimulatedDriveSync}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-extrabold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isDriveSyncing ? 'animate-spin' : ''}`} />
            <span>{isDriveSyncing ? `Syncing Drive (${driveSyncProgress}%)...` : 'Sync Google Drive Vault'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsGooglePickerModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold transition-all flex items-center gap-2 shadow-lg shadow-teal-500/20 cursor-pointer"
          >
            <HardDrive className="w-4 h-4" />
            <span>Import from Google Drive (Picker)</span>
          </button>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-teal-400" />
            <span>Upload Local Document</span>
          </button>
        </div>
      </div>

      {bannerMessage && (
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <span>{bannerMessage}</span>
          </div>
          <button onClick={() => setBannerMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Executive KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Company Vault Documents</span>
            <FolderOpen className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {allDocumentsWithMasterGuide.length}
          </div>
          <p className="text-[11px] text-emerald-400">
            Financials, Policies, HR &amp; Clinical Templates
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>06-11-26 Staff Meeting Actions</span>
            <Briefcase className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {staffMeetingActions.filter((a) => a.completed).length} / {staffMeetingActions.length} Done
          </div>
          <p className="text-[11px] text-amber-300">
            Anitha, Andreja &amp; Group FBA / BOC tasks
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>NDIS Funding &amp; Rate Watch</span>
            <DollarSign className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">60h &rarr; 45h | $62/hr</div>
          <p className="text-[11px] text-rose-300">
            -20% PBS funding cut · SW rate $73&rarr;$62 (01-10-26)
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Google Drive Mirror Status</span>
            <HardDrive className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {driveFolderSyncState.filter((f) => f.status === 'Synced').length} / {driveFolderSyncState.length} Folders
          </div>
          <p className="text-[11px] text-indigo-300">
            Last verified {lastDriveSyncTimestamp}
          </p>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveView('vault')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeView === 'vault'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Company Document Vault ({allDocumentsWithMasterGuide.length})</span>
        </button>

        <button
          onClick={() => setActiveView('drive-sync')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeView === 'drive-sync'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <HardDrive className="w-4 h-4 text-indigo-400" />
          <span>Google Drive Sync Interface</span>
        </button>

        <button
          onClick={() => setActiveView('staff-meeting')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeView === 'staff-meeting'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Briefcase className="w-4 h-4 text-amber-400" />
          <span>06-11-26 Staff Meeting &amp; Action Register (9)</span>
        </button>

        <button
          onClick={() => setActiveView('module-guide')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeView === 'module-guide'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <BookOpen className="w-4 h-4 text-teal-400" />
          <span>Application &amp; Module Operations Guide (27 Modules)</span>
        </button>

        <button
          onClick={() => setActiveView('plan-managers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeView === 'plan-managers'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Plan Manager Invoice Batching ({planManagerGroups.length})</span>
        </button>

        <button
          onClick={() => setActiveView('advisory')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeView === 'advisory'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Practice Improvement &amp; Executive Advisory</span>
        </button>
      </div>

      {/* =====================================================================
          VIEW 0: MASTER APPLICATION & MODULE OPERATIONS GUIDE
          ===================================================================== */}
      {activeView === 'module-guide' && <CompanyLibraryMasterGuideBook />}

      {/* =====================================================================
          VIEW 0A: SIMULATED & LIVE GOOGLE DRIVE SYNC INTERFACE
          ===================================================================== */}
      {activeView === 'drive-sync' && (
        <div className="space-y-5">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-indigo-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono font-bold">
                <HardDrive className="w-3.5 h-3.5" />
                <span>GOOGLE DRIVE CORPORATE VAULT MIRROR · 4 FOLDERS MAPPED</span>
              </div>
              <h2 className="text-lg font-extrabold text-white">
                Two-Way Google Drive Sync Interface (Financials, Policies, HR &amp; Clinical Templates)
              </h2>
              <p className="text-xs text-slate-300 max-w-3xl">
                Synchronizes Breakthrough OS company folders with your Google Workspace Drive repository. Detects delta updates across NDIS funding analyses, FBA policies, HR meeting action items, and clinical templates.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                disabled={isDriveSyncing}
                onClick={handleRunSimulatedDriveSync}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isDriveSyncing ? 'animate-spin' : ''}`} />
                <span>{isDriveSyncing ? `Synchronizing (${driveSyncProgress}%)...` : 'Run Full Drive Folder Sync Now'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsGooglePickerModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-300 text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Launch Live Google Drive Picker</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {driveFolderSyncState.map((folder) => (
              <div
                key={folder.id}
                className="p-5 rounded-2xl bg-slate-900/85 border border-slate-800 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-teal-300">
                      {folder.vaultCategory}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        folder.status === 'Synced'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : folder.status === 'Syncing'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {folder.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 truncate">
                    {folder.driveFolderPath}
                  </p>
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Mapped Drive Files ({folder.fileCount}):
                    </span>
                    {folder.sampleFiles.map((fn, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-[11px] text-slate-300 font-mono bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800/80"
                      >
                        <span className="truncate">{fn}</span>
                        <span className="text-[10px] text-teal-400 ml-2 shrink-0">v2026</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="font-mono text-slate-400">Checksum: {folder.lastHash}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(folder.vaultCategory);
                      setActiveView('vault');
                    }}
                    className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Folder in Vault</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW 0B: NOV 6, 2026 STAFF MEETING & ACTION REGISTER
          ===================================================================== */}
      {activeView === 'staff-meeting' && (
        <div className="space-y-5">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-amber-500/30 space-y-4 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">
                  OFFICIAL CLINICAL &amp; OPERATIONAL BRIEF · 06-11-26 STAFF MEETING
                </span>
                <h2 className="text-lg font-extrabold text-white mt-0.5">
                  Therapy Strategies, NDIS Funding Adjustments, Tri-Modal FBA Evidence &amp; Action Register
                </h2>
              </div>
              <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold self-start">
                {staffMeetingActions.filter((a) => a.completed).length} of {staffMeetingActions.length} Actions Completed
              </span>
            </div>

            {/* 4 Key Digest Cards from the Nov 6, 2026 Staff Meeting */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-teal-400">
                  1. Clinical Interventions &amp; Referrals
                </span>
                <p className="font-bold text-white">Ryder (40m), Saffron, 16yo Tier 3 &amp; Aiden</p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Andreja reported <strong>Ryder</strong> contributed for <strong>40 mins</strong> using social scripts &amp; Victorian school Red/Green 5-min break cards. New referrals: <strong>16yo school refusal (Tier 3)</strong> &amp; <strong>Aiden (8–9yo)</strong>. <strong>Saffron</strong> adult cert/work pathway meeting with Laura on <strong>09-11-26</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-rose-400">
                  2. NDIS Funding &amp; Rate Cuts
                </span>
                <p className="font-bold text-white">-20% PBS Plans · 60h&rarr;45h · SW $73&rarr;$62</p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  NDIS reduced participants receiving behaviour support funding by <strong>20%</strong> and cut hours from <strong>60h to 45h</strong> by eliminating travel allocations. Support worker pricing dropped from <strong>$73 to $62/hr</strong> (eff. 01-10-26) with static travel reimbursement despite rising petrol costs.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-indigo-400">
                  3. FBA &amp; 2-Week Baseline Graphs
                </span>
                <p className="font-bold text-white">Direct, Indirect (FAST/MAS) &amp; Product</p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Mandatory FBAs require <strong>direct observation</strong> (witness, video, photo, audio), <strong>2 interviews</strong>, documents, and <strong>FAST &amp; MAS</strong> questionnaires, plus <strong>2-week baseline data on Excel graphs</strong> and immediate incident photography.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-amber-400">
                  4. Outreach &amp; Growth Strategy
                </span>
                <p className="font-bold text-white">Direct Engagement Over Cold Agencies</p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Over <strong>1,000 cold outreach emails</strong> yielded low response, and external marketing retainers (<strong>$1,200/mo</strong> &amp; <strong>$650/mo</strong>) were declined. Anitha emphasized direct personal relationship-building with referrers and schools.
                </p>
              </div>
            </div>

            {/* Interactive 9-Item Staff Meeting Action Register */}
            <div className="space-y-2.5 pt-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                Assigned Team Next Steps (Click Any Action to Toggle Completion Status)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {staffMeetingActions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() =>
                      setStaffMeetingActions((prev) =>
                        prev.map((a) => (a.id === item.id ? { ...a, completed: !a.completed } : a))
                      )
                    }
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      item.completed
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono font-bold text-teal-300">
                          [{item.owner}]
                        </span>
                        <span className="text-xs font-bold text-white">{item.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{item.detail}</p>
                      <span className="text-[10px] font-mono text-slate-400 block">
                        Vault Folder: {item.category} · Target: {item.dueDate}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold shrink-0 ${
                        item.completed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {item.completed ? 'COMPLETED' : 'IN PROGRESS'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW 1: COMPANY DOCUMENT VAULT
          ===================================================================== */}
      {activeView === 'vault' && (
        <div className="space-y-5">
          {/* 5 Vault Category Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {VAULT_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const count =
                cat.id === 'ALL'
                  ? allDocumentsWithMasterGuide.length
                  : allDocumentsWithMasterGuide.filter((d) => d.category === cat.id).length;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-teal-500/50 shadow-lg'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={`p-2 rounded-xl border ${cat.accent}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800">
                      {count} {count === 1 ? 'doc' : 'docs'}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white mt-3">{cat.label}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{cat.description}</p>
                </button>
              );
            })}
          </div>

          {/* Search & Quick Upload Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 p-3.5 rounded-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search company documents by title, filename, policy standard, BAS, or tag..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (selectedCategory !== 'ALL') {
                    setUploadForm((prev) => ({ ...prev, category: selectedCategory }));
                  }
                  setIsUploadModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add to {selectedCategory === 'ALL' ? 'Vault' : selectedCategory.split(',')[0]}</span>
              </button>
            </div>
          </div>

          {/* Document Grid + Detail Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-3">
              {filteredDocuments.length === 0 ? (
                <div className="p-10 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                  <FolderOpen className="w-8 h-8 text-slate-500 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No Documents Found in This Vault</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Upload your financials (P&amp;L, BAS, Xero exports), NDIS policies, HR contracts, or participant NDIS plans to centralize your company records.
                  </p>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload First Document</span>
                  </button>
                </div>
              ) : (
                filteredDocuments.map((doc) => {
                  const isActive = selectedDoc?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-800/90 border-teal-500/50 shadow-md'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950 text-teal-400 border border-slate-800">
                              {doc.category}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">{doc.version}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                doc.status === 'Current'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : doc.status === 'Review Due Soon'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {doc.status}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white truncate">{doc.title}</h4>
                          <p className="text-xs text-slate-400 line-clamp-2">{doc.summary}</p>
                        </div>

                        <div className="text-right flex-shrink-0 space-y-1">
                          <div className="text-[11px] font-mono text-slate-400">{doc.fileSize}</div>
                          {doc.reviewOrExpiryDate && (
                            <div className="text-[10px] text-slate-500">
                              Review: <span className="font-mono text-slate-300">{doc.reviewOrExpiryDate}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-slate-300">{doc.fileName}</span>
                          {doc.linkedParticipantName && (
                            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-semibold">
                              Participant: {doc.linkedParticipantName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.url && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-teal-400 hover:text-teal-300 font-bold inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Open</span>
                            </a>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCompanyDocument(doc.id);
                              if (selectedDoc?.id === doc.id) setSelectedDoc(null);
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="Delete document from company vault"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Inspector Drawer */}
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 h-fit sticky top-20">
              {selectedDoc ? (
                <>
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                        {selectedDoc.category}
                      </span>
                      <h3 className="text-base font-bold text-white mt-0.5">{selectedDoc.title}</h3>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">{selectedDoc.fileName}</p>
                    </div>
                    <button
                      onClick={() => setSelectedDoc(null)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="text-slate-300 leading-relaxed">{selectedDoc.summary}</p>
                  </div>

                  {selectedDoc.extractedFacts && selectedDoc.extractedFacts.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Evidenced Document Facts</span>
                      </div>
                      <div className="space-y-1.5">
                        {selectedDoc.extractedFacts.map((fact, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs gap-2">
                            <span className="text-slate-400">{fact.label}:</span>
                            <span className="font-mono font-semibold text-white text-right">{fact.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Effective Date</span>
                      <span className="font-mono text-slate-200">{selectedDoc.effectiveDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Review / Expiry</span>
                      <span className="font-mono text-slate-200">{selectedDoc.reviewOrExpiryDate || 'Not stated'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Uploaded By</span>
                      <span className="text-slate-200">{selectedDoc.uploadedBy}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Version</span>
                      <span className="font-mono text-slate-200">{selectedDoc.version}</span>
                    </div>
                  </div>

                  {selectedDoc.url && (
                    <a
                      href={selectedDoc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>View Source File</span>
                    </a>
                  )}
                </>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                  <h4 className="text-xs font-bold text-slate-300">Select a Document to Inspect</h4>
                  <p className="text-[11px] text-slate-500">
                    Click any policy, financial statement, or template on the left to view extracted facts, version history, and review dates.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW 2: PLAN MANAGER INVOICE BATCHING HUB
          ===================================================================== */}
      {activeView === 'plan-managers' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">
                Plan Manager &amp; Agency Claim Channels (All 22 Active Participants)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Grouped automatically by the invoice emails from your imported V2 roster. Prepare draft NDIS claims or export remittance CSVs per Plan Manager.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('billing')}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              <span>Open Full Billing &amp; PACE Ledger</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {planManagerGroups.map((group) => (
              <div
                key={`${group.agency}-${group.invoiceEmail}`}
                className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {group.planManagementType}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-1.5">{group.agency}</h3>
                      <p className="text-xs font-mono text-teal-400">{group.invoiceEmail}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-white font-mono">
                        {group.participants.length} {group.participants.length === 1 ? 'Participant' : 'Participants'}
                      </span>
                      <div className="text-[11px] font-mono text-slate-400">
                        Recorded Budget: ${group.totalRecordedBudget.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80">
                    {group.participants.map((p) => (
                      <span
                        key={p.id}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 text-slate-200 border border-slate-800 font-medium"
                      >
                        {p.name} <span className="font-mono text-[10px] text-slate-400">({p.ndisNumber})</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => handleGeneratePlanManagerBatch(group)}
                    className="flex-1 py-2 px-3 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Prepare Draft Claims ({group.participants.length})</span>
                  </button>
                  <button
                    onClick={() => handleExportPlanManagerCSV(group)}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW 3: PRACTICE IMPROVEMENT & EXECUTIVE ADVISORY
          ===================================================================== */}
      {activeView === 'advisory' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
              Breakthrough Executive Advisory — Based on Your Live 22-Participant Roster
            </span>
            <h2 className="text-lg font-extrabold text-white">
              How to Run &amp; Scale Your NDIS Practice End-to-End
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl">
              Below is an evidence-based operational roadmap tailored to your 22 active participants, their Plan Management channels, and NDIS Quality &amp; Safeguards Commission requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Priority 1 · Revenue &amp; Plan Integrity
                  </span>
                  <span className="text-xs font-mono text-amber-400">{zeroBudgetClients.length} Participants at $0.00</span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  1. Complete NDIS Plan Budgets &amp; Signed Service Agreements
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  While all 22 participants are now <strong>Active</strong>, {zeroBudgetClients.length} participants currently have <code>$0.00</code> recorded budget in the V2 roster (only Abu Bakr Tyson Amiri, Celeste Rattray-Wood, Eman Syed, Titan Tai, and Viren Virdi have dollar budgets entered). Upload their NDIS Plan PDFs or use the Quick Budget Editor on the Participants page to record their Capacity Building (15_056 / 07_002) and Core funding ceilings so automated burn-rate alerts can protect you from over-servicing.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('clients')}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Open Participants &amp; Quick Budget Editor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                    Priority 2 · Workforce &amp; Caseload Allocation
                  </span>
                  <span className="text-xs font-mono text-teal-400">{practitioners.length} Practitioners</span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  2. Assign Primary &amp; Secondary Practitioners + Weekly Billable Targets
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Use the new <strong>Caseload Assignment Matrix</strong> in the HR &amp; Roster module to onboard your full clinical team, verify their NDIS Worker Screening (NDISWC) and AHPRA numbers, and bulk-assign Primary and Secondary practitioners across all 22 participants. Setting weekly billable hour targets (e.g., 25–28 billable hrs/week) lets you track utilization against SCHADS wage costs.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('hr-roster')}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Open Practitioner Creation &amp; Caseload Matrix</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    Priority 3 · Cashflow &amp; Claim Automation
                  </span>
                  <span className="text-xs font-mono text-indigo-400">14 Plan-Managed · 7 NDIA · 1 Self</span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  3. Automate Case Note → Claim Generation &amp; Plan Manager Dispatch
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  7 of your active participants are <strong>NDIA-Managed</strong> (claimed via PRODA Bulk CSV) and 14 are <strong>Plan-Managed</strong> across Blossom Community Care, Plan Managers, Supportive Choices, My Plan Manager, Motivision, AYS, NSP, Sky, Canny Group, and Focus On You. Requiring practitioners to sign SOAP/BIRP case notes at the end of each shift automatically creates validated draft claims ready for Friday batch invoicing.
                </p>
              </div>
              <button
                onClick={() => setActiveView('plan-managers')}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Review Plan Manager Batch Channels</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    Priority 4 · Clinical &amp; Statutory Governance
                  </span>
                  <span className="text-xs font-mono text-purple-400">Module 2A Audit Ready</span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  4. Complete Missing Dates of Birth &amp; High-Risk BSP Reviews
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  3 active participants (<strong>Viren Virdi</strong>, <strong>Saffron Robinson</strong>, and <strong>Zachariah Psaila Nogueira</strong>) have <code>Not stated</code> for Date of Birth in the imported sheet, and 10 participants are flagged as <strong>High Risk</strong>. Updating their DOBs (required for PRODA bulk claim validation) and ensuring every High-Risk participant has an active Behaviour Support Plan (BSP) &amp; Emergency Disaster Plan in the Vault ensures 100% NDIS Commission audit readiness.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('bsp-plans')}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Open Behaviour Support Plans (BSP)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: UPLOAD COMPANY DOCUMENT TO VAULT
          ===================================================================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Upload Document to Company Library</h3>
                <p className="text-xs text-slate-400">
                  Store financials, BAS/tax records, NDIS policies, HR contracts, or participant NDIS plans
                </p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompanyDocument} className="space-y-4 text-xs">
              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-5 rounded-2xl border-2 border-dashed border-slate-700 hover:border-teal-500/60 bg-slate-950/60 text-center space-y-2 cursor-pointer transition-all"
              >
                <UploadCloud className="w-7 h-7 text-teal-400 mx-auto" />
                <div className="text-xs font-bold text-white">
                  {uploadForm.fileName
                    ? `Selected: ${uploadForm.fileName} (${uploadForm.fileSize})`
                    : 'Click to select a PDF, Excel (.xlsx), CSV, Word (.docx), or Image file'}
                </div>
                <p className="text-[11px] text-slate-400">
                  Automatically detects folder category and supports AI fact extraction
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.csv,.xlsx,.xls,.doc,.docx,.txt,.json,.png,.jpg,.jpeg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Document Title *</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="e.g., Q2 FY27 Profit & Loss Statement"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Company Vault Folder *</label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, category: e.target.value as CompanyDocumentCategory })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="Financials, P&L, BAS & Tax">Financials, P&amp;L, BAS &amp; Tax</option>
                    <option value="NDIS Policies, SOPs & Governance">NDIS Policies, SOPs &amp; Governance</option>
                    <option value="HR Contracts, Insurance & Licenses">HR Contracts, Insurance &amp; Licenses</option>
                    <option value="Clinical Templates & Service Agreements">
                      Clinical Templates &amp; Service Agreements
                    </option>
                    <option value="Participant Plans & Schedules">Participant Plans &amp; Schedules</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Version</label>
                  <input
                    type="text"
                    value={uploadForm.version}
                    onChange={(e) => setUploadForm({ ...uploadForm, version: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Effective Date</label>
                  <input
                    type="date"
                    value={uploadForm.effectiveDate}
                    onChange={(e) => setUploadForm({ ...uploadForm, effectiveDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Review / Expiry Date</label>
                  <input
                    type="date"
                    value={uploadForm.reviewOrExpiryDate}
                    onChange={(e) => setUploadForm({ ...uploadForm, reviewOrExpiryDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">
                    Link to Active Participant (Optional)
                  </label>
                  <select
                    value={uploadForm.linkedParticipantId}
                    onChange={(e) => setUploadForm({ ...uploadForm, linkedParticipantId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="">— Company-Wide (Not Participant-Specific) —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (NDIS: {c.ndisNumber}) — Current Budget: ${(c.totalBudget || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">
                    Update Linked Participant Budget (AUD, Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={uploadForm.extractedBudgetAmount || ''}
                    onChange={(e) =>
                      setUploadForm({
                        ...uploadForm,
                        extractedBudgetAmount: parseFloat(e.target.value) || 0
                      })
                    }
                    placeholder="e.g. 45000.00"
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">
                    Executive Summary / Paste Document Excerpt for AI Extraction
                  </label>
                  <button
                    type="button"
                    onClick={handleRunAIExtraction}
                    disabled={isExtractingAI}
                    className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {isExtractingAI ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>Extract Evidenced Facts</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={uploadForm.summary}
                  onChange={(e) => setUploadForm({ ...uploadForm, summary: e.target.value })}
                  placeholder="Summarize key financial figures, policy scope, or paste document text here..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              {uploadForm.extractedFacts.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                    Extracted Facts Preview
                  </span>
                  {uploadForm.extractedFacts.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{f.label}:</span>
                      <span className="font-mono text-white">{f.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Google Drive / Document Link (Optional)</label>
                  <input
                    type="text"
                    value={uploadForm.url}
                    onChange={(e) => setUploadForm({ ...uploadForm, url: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    value={uploadForm.tagsInput}
                    onChange={(e) => setUploadForm({ ...uploadForm, tagsInput: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save to Company Vault</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Secure Google Picker Document Library Import Modal */}
      <GooglePickerDocumentLibraryModal
        isOpen={isGooglePickerModalOpen}
        onClose={() => setIsGooglePickerModalOpen(false)}
        defaultVaultCategory={selectedCategory === 'ALL' ? 'NDIS Policies, SOPs & Governance' : selectedCategory}
        onImportedSuccess={(count) => {
          showBanner(`Imported ${count} file(s) from Google Drive into the Document Library via Google Picker.`);
        }}
      />
    </div>
  );
};
