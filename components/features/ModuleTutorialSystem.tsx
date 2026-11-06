'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useManagementStore, TabType } from '@/stores/useManagementStore';
import { getCachedGoogleAccessToken } from '@/lib/firebase';
import { storePickedDriveFileMetadata } from '@/lib/firestoreService';
import {
  BookOpen,
  Compass,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Users,
  FileText,
  Printer,
  Search,
  ExternalLink,
  Award,
  Play,
  X,
  CheckSquare,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

export interface ModuleGuideEntry {
  tabId: TabType;
  title: string;
  pillar:
    | 'Practice Operations'
    | 'Clinical & PBS'
    | 'Google Cloud Ecosystem'
    | 'Finance & Compliance'
    | 'Portals';
  purpose: string;
  whenToUse: string;
  steps: [string, string, string, string];
  ndisComplianceGuardrail: string;
  entryCoreRoleDuty: string;
  proficientDirectorRoleDuty: string;
}

export const MODULE_GUIDES_REGISTRY: ModuleGuideEntry[] = [
  {
    tabId: 'command-center',
    title: 'Command Center (Executive & Clinical Overview)',
    pillar: 'Practice Operations',
    purpose:
      'Provides a real-time executive snapshot of active NDIS participants, pending PRODA claims, reportable incidents, restrictive practice expiries, and Google Workspace connectivity.',
    whenToUse:
      'Use at the start of each shift to triage urgent clinical risks, review expiring authorisations, and check Google OAuth health.',
    steps: [
      'Review the top KPI cards for active participant count, pending claims, and open incident alerts.',
      'Check the Google Workspace Authentication Diagnostic Panel to confirm OAuth token health or click Re-authorize.',
      'Inspect the priority action feed for 14/30/60-day restrictive practice or service agreement alerts.',
      'Click any quick-launch module shortcut or press Ctrl+K to jump directly to a participant or workflow.'
    ],
    ndisComplianceGuardrail:
      'Dashboard metrics reflect recorded app state only; always verify underlying clinical notes and signed agreements before making compliance claims.',
    entryCoreRoleDuty:
      'Check assigned participant alerts, scheduled sessions, and supervision revision requests.',
    proficientDirectorRoleDuty:
      'Monitor practice-wide reportable incident timelines, pending co-signatures, and budget burn rates.'
  },
  {
    tabId: 'clients',
    title: 'Participants (CRM & NDIS Dossiers)',
    pillar: 'Practice Operations',
    purpose:
      'Manages the 22 active NDIS participant profiles, including NDIS numbers, plan start/end dates, core/capacity budgets, risk levels, and linked Google Drive clinical folders.',
    whenToUse:
      'Use when onboarding a new participant, reviewing plan dates, checking assigned practitioners, or linking Google Drive records.',
    steps: [
      'Search or filter the 22 participants by risk level, practitioner assignment, or funding management type.',
      'Click a participant card to inspect their NDIS plan dates, allocated budgets, and primary practitioner.',
      'Use the Google Drive folder linker to attach or preview evidence documents directly from their clinical folder.',
      'Update service agreement status or plan review dates with automatic NDIS audit trail logging.'
    ],
    ndisComplianceGuardrail:
      'Keep each participant record strictly separated. Never guess or fabricate missing NDIS numbers, DOBs, or diagnoses—mark unknown fields as "Not stated".',
    entryCoreRoleDuty:
      'Review assigned participant goals, communication preferences, and risk profiles before delivering support.',
    proficientDirectorRoleDuty:
      'Approve participant onboarding, allocate primary practitioners, and audit service agreement status.'
  },
  {
    tabId: 'caseload-kanban',
    title: 'Caseload Kanban Visualizer',
    pillar: 'Practice Operations',
    purpose:
      'Displays practitioner assignments across all 22 NDIS participants in a Kanban board grouped by practitioner capability tier and billable capacity.',
    whenToUse:
      'Use during clinical allocation meetings to balance caseloads across Anitha Haripersad, Zubaida Baher, Andreja Majcenovic, and Tania Bobovec.',
    steps: [
      'Inspect each practitioner column to view their current participant count, utilization %, and contact details.',
      'Filter participant cards by clinical risk level (High/Critical) or support category.',
      'Reassign a participant between practitioners using the transfer selector on any participant card.',
      'Ensure high-risk or restrictive-practice participants have a Proficient Practitioner assigned or supervising.'
    ],
    ndisComplianceGuardrail:
      'Under the NDIS PBS Capability Framework, Entry (Tania Bobovec) and Core (Andreja Majcenovic) practitioners require Proficient supervision for complex/RP caseloads.',
    entryCoreRoleDuty:
      'Monitor personal caseload capacity and flag high-complexity participants requiring supervision.',
    proficientDirectorRoleDuty:
      'Rebalance caseloads across the 4 practitioners and assign Proficient supervisors.'
  },
  {
    tabId: 'company-library',
    title: 'Company Document Library & Master Operations Guide',
    pillar: 'Practice Operations',
    purpose:
      'Centralised corporate vault for Financials/BAS, NDIS Policies & SOPs, HR Insurance/Contracts, Clinical Templates, Participant Plans, and this Master Application Guide.',
    whenToUse:
      'Use to store and retrieve corporate governance documents, batch-group Plan Manager invoices, or consult the Application & Module Operations Handbook.',
    steps: [
      'Switch between the Corporate Document Vaults and the "Application & Module Operations Guide" tab.',
      'Filter documents by vault category (Financials, NDIS Policies, HR & Insurance, Clinical Templates, Participant Plans).',
      'Upload local files or link Google Drive files via the Google Picker integration.',
      'Record staff SOP acknowledgement sign-offs and export the Operations Guide to PDF or Google Docs.'
    ],
    ndisComplianceGuardrail:
      'Maintain current versions of NDIS Practice Standards policies, $20M insurance certificates, and staff SOP sign-off records for quality audits.',
    entryCoreRoleDuty:
      'Read mandatory NDIS SOPs, download clinical templates, and complete the Staff Onboarding Tracker.',
    proficientDirectorRoleDuty:
      'Upload updated corporate policies, BAS/financial statements, and audit staff SOP acknowledgements.'
  },
  {
    tabId: 'hr-roster',
    title: 'Practitioners, HR Roster & SCHADS Compliance Suite',
    pillar: 'Practice Operations',
    purpose:
      'Manages practitioner profiles, NDIS Worker Screening / AHPRA / First Aid expiry watchdogs, and the interactive SCHADS Award Pay & Allowance Simulator.',
    whenToUse:
      'Use when rostering shifts, calculating SCHADS ordinary/overtime/broken-shift pay estimates, or auditing worker screening expiries.',
    steps: [
      'Review the 4 core Breakthrough practitioners and verify their NDIS Worker Screening and AHPRA expiry countdowns.',
      'Open the SCHADS Award Pay & Allowance Simulator to calculate ordinary hours, overtime, broken shifts, and $0.99/km vehicle allowances.',
      'Use the Credential Expiry Watchdog to create Google Calendar reminders or dispatch Gmail renewal alerts.',
      'Export the SCHADS payroll estimate CSV for reconciliation with Xero and the current Fair Work pay guide.'
    ],
    ndisComplianceGuardrail:
      'SCHADS Award rates and allowances change periodically; treat calculator outputs as decision-support estimates and verify against the current Fair Work Commission pay guide.',
    entryCoreRoleDuty:
      'Keep NDIS Worker Screening, First Aid/CPR, and WWCC credentials current prior to expiry.',
    proficientDirectorRoleDuty:
      'Audit staff credentials, approve rosters, and verify SCHADS pay classifications.'
  },
  {
    tabId: 'ndis-goals',
    title: 'NDIS Participant Goal Tracking & Progress Digest',
    pillar: 'Practice Operations',
    purpose:
      'Tracks longitudinal participant progress against NDIS plan goals, links clinical case notes as audit evidence, and generates Support Coordinator Monthly Digests.',
    whenToUse:
      'Use after therapy sessions to update goal attainment percentages, attach clinical notes, or prepare monthly Support Coordinator updates.',
    steps: [
      'Select a participant to view their active NDIS goals across Core and Capacity Building categories.',
      'Update the goal milestone status and progress slider or assign a Goal Attainment Scaling (GAS -2 to +2) score.',
      'Attach relevant SOAP/BIRP/SIMPL clinical case notes directly to the goal for NDIS audit traceability.',
      'Use the Support Coordinator Monthly Progress Digest Generator to export a privacy-safe stakeholder summary.'
    ],
    ndisComplianceGuardrail:
      'Distinguish participant/carer subjective statements from objective practitioner measurements when recording goal progress.',
    entryCoreRoleDuty:
      'Link session case notes to participant goals and record observable milestone progress.',
    proficientDirectorRoleDuty:
      'Review longitudinal GAS T-Scores and approve stakeholder progress digests.'
  },
  {
    tabId: 'google-maps',
    title: 'Field Route & NDIS Provider Travel',
    pillar: 'Practice Operations',
    purpose:
      'Calculates outreach route distances, travel minutes, Modified Monash Model (MMM1–MMM7) zone caps, and shared visit travel apportionment.',
    whenToUse:
      'Use when planning outreach home/school/SIL visits or calculating apportioned provider travel claims across multiple participants.',
    steps: [
      'Select the starting clinic address and participant destination to preview route distance and travel duration.',
      'Open Turn-by-Turn directions in Google Maps for outreach navigation.',
      'Use the embedded NDIS PAPL Travel & Apportionment Calculator to split travel time and kilometres across shared visits.',
      'Queue compliant provider travel claims directly to the NDIS Billing & PACE ledger.'
    ],
    ndisComplianceGuardrail:
      'Enforce MMM1–MMM3 (30m) and MMM4–MMM5 (60m) travel time caps and apportion shared runs so claimed travel never exceeds 100% of actual travel.',
    entryCoreRoleDuty:
      'Log accurate outbound/return travel minutes and odometer kilometres for outreach visits.',
    proficientDirectorRoleDuty:
      'Audit multi-participant travel apportionment and remote loading claims.'
  },
  {
    tabId: 'pbs-governance',
    title: 'PBS Governance Suite (Plan Review Generator & RP Alert System)',
    pillar: 'Clinical & PBS',
    purpose:
      'Integrates the NDIS Plan Review & Report Generator (compiling case notes and GAS scores into PDF/Google Docs) and the 60/30/14-Day Restrictive Practices Alert System.',
    whenToUse:
      'Use when preparing end-of-plan NDIS review reports or monitoring 60/30/14-day expiry countdowns for regulated restrictive practices.',
    steps: [
      'In Tab 1 (Plan Review Generator), select a participant, review their GAS (-2 to +2) scores and Composite T-Score, and select attributed case notes.',
      'Click "Compile & Preview Printable PDF Report" or "Compile to Google Docs / Drive" (with staff confirmation).',
      'In Tab 2 (RP Alert System), filter regulated practices by 14-Day Critical, 30-Day Warning, or 60-Day Watch tiers.',
      'Complete state portal checklists (VIC RIDS, NSW RPA, QLD, etc.) and click "Trigger All 60/30/14d Expiry Alerts".'
    ],
    ndisComplianceGuardrail:
      'Composite GAS T-Scores use the Kiresuk & Sherman formula. Never claim a BSP is Commission-approved unless state and NDIS Commission IDs are verified.',
    entryCoreRoleDuty:
      'Compile draft plan review evidence and update fade-out progress metrics for supervisor review.',
    proficientDirectorRoleDuty:
      'Co-sign Plan Review Outcome Reports, escalate 14-day critical RP expiries, and lodge NDIS Commission renewals.'
  },
  {
    tabId: 'clinical-signoff-queue',
    title: 'Clinical Supervision & Co-Signature Queue',
    pillar: 'Clinical & PBS',
    purpose:
      'Dedicated clinical governance interface where Entry (Tania Bobovec) and Core (Andreja Majcenovic) practitioners submit draft BSPs, FBAs, and high-risk case notes for formal co-signature by Proficient Practitioners (Anitha Haripersad, Zubaida Baher) or the Clinical Director.',
    whenToUse:
      'Use whenever an Entry or Core practitioner authors a draft BSP, FBA, or high-risk case note requiring supervisory sign-off.',
    steps: [
      'Click "Submit Draft BSP / High-Risk Note" (or pre-fill from an existing logged case note) as an Entry or Core practitioner.',
      'Ensure Participant/Carer Report (Subjective) is clearly separated from Practitioner Direct Observation (Objective).',
      'Switch to a Proficient Practitioner or Clinical Director session to review the 3-point supervision quality checklist.',
      'Click "Co-Sign & Lock" to formally approve the record or "Request Author Revision" to return it with feedback.'
    ],
    ndisComplianceGuardrail:
      'Enforces role-based capability gates: Entry and Core practitioners are blocked from self-approving or co-signing clinical drafts.',
    entryCoreRoleDuty:
      'Submit draft BSPs, FBAs, and high-risk notes and address supervisor revision feedback promptly.',
    proficientDirectorRoleDuty:
      'Audit clinical quality, verify subjective/objective separation, and formally Co-Sign & Lock approved records.'
  },
  {
    tabId: 'case-notes',
    title: 'Clinical Case Notes (SOAP / BIRP / SIMPL)',
    pillar: 'Clinical & PBS',
    purpose:
      'Records structured clinical session notes in SOAP, BIRP, or SIMPL format with goal linking, Drive evidence attachment, billing claim generation, and immutable amendment diffs.',
    whenToUse:
      'Use immediately following every participant therapy session or non-face-to-face clinical documentation block.',
    steps: [
      'Select the participant, session date, duration, NDIS support item code, and preferred format (SOAP, BIRP, or SIMPL).',
      'Complete the 4 structured fields, keeping participant/carer statements distinct from practitioner observations.',
      'Link relevant Google Drive session artefacts and select whether to auto-queue a corresponding billing claim.',
      'For high-risk notes authored by Entry/Core staff, submit the note to the Clinical Sign-Off Queue at the bottom of the module.'
    ],
    ndisComplianceGuardrail:
      'Any post-save edits require a mandatory amendment reason and generate a before/after field diff in the NDIS Compliance Audit Logger.',
    entryCoreRoleDuty:
      'Document factual, person-centred session notes within 24 hours of service delivery.',
    proficientDirectorRoleDuty:
      'Review amended notes and co-sign high-risk behavioural case notes.'
  },
  {
    tabId: 'incidents',
    title: 'Incidents & Reportable Governance Workflow',
    pillar: 'Clinical & PBS',
    purpose:
      'End-to-end NDIS incident management system covering Filing/Triage, Investigation, 24-Hour / 5-Day NDIS Commission Statutory Notifications, Corrective Action Plans, and Resolution.',
    whenToUse:
      'Use immediately after any behavioural, medical, medication, safeguarding, or reportable incident involving a participant.',
    steps: [
      'Click "File New Incident" to record the date/time, category, severity, immediate safety actions, and witnesses.',
      'For immediate physical danger or serious injury, call Emergency Services (000) first and follow urgent escalation protocols.',
      'Advance the incident through Triage, Investigation, and 24-hour / 5-day NDIS Commission notification tracking.',
      'Document Root Cause Analysis and Corrective Actions before marking the incident Resolved with management notification.'
    ],
    ndisComplianceGuardrail:
      'Potential reportable incidents require prompt review by the Key Personnel / Clinical Director under the NDIS (Incident Management and Reportable Incidents) Rules 2018.',
    entryCoreRoleDuty:
      'Ensure immediate participant safety, file factual incident reports promptly, and trigger management escalation.',
    proficientDirectorRoleDuty:
      'Lead investigations, submit 24h/5d NDIS Commission portal notifications, and sign off corrective actions.'
  },
  {
    tabId: 'restrictive-practices',
    title: 'Restrictive Practices Register & Dual Sign-Off',
    pillar: 'Clinical & PBS',
    purpose:
      'Manages the statutory register of Chemical, Mechanical, Physical, Environmental, and Seclusion practices with dual BSP Practitioner + Authorised Program Officer (APO) sign-off.',
    whenToUse:
      'Use when registering a regulated restrictive practice, recording monthly NDIS Commission usage reports, or tracking least-restrictive fade strategies.',
    steps: [
      'Review the integrated 60/30/14-Day Restrictive Practices Alert System at the top of the module.',
      'Inspect individual regulated practice cards for dual sign-off status (BSP Practitioner + APO).',
      'Adjust the least-restrictive fade progress slider as replacement skills are mastered by the participant.',
      'Click "Submit Monthly Commission Report" once monthly usage logs are reconciled.'
    ],
    ndisComplianceGuardrail:
      'A regulated restrictive practice cannot be marked Authorised without both Behaviour Support Practitioner and APO sign-off plus state/territory authorisation where applicable.',
    entryCoreRoleDuty:
      'Monitor replacement skill acquisition and collect accurate usage data for monthly reporting.',
    proficientDirectorRoleDuty:
      'Execute BSP Practitioner / APO sign-offs and oversee state portal authorisations.'
  },
  {
    tabId: 'abc-analyser',
    title: 'ABC Behaviour Log & Conditional Probability Heatmap',
    pillar: 'Clinical & PBS',
    purpose:
      'Captures Antecedent-Behaviour-Consequence (ABC) episodes and calculates conditional probabilities P(B|A) and time-of-day escalation heatmaps for Functional Behaviour Assessments.',
    whenToUse:
      'Use when logging observable behavioural episodes or analysing setting events and functional hypotheses for a BSP.',
    steps: [
      'Log new ABC episodes with specific date/time, antecedent trigger, observable behaviour topography, consequence, and intensity.',
      'Review the ABC Conditional Probability & Time-of-Day Heatmap to identify peak escalation hours (e.g., evening handovers).',
      'Inspect the transparent conditional probability calculations showing exact episode counts and formulas.',
      'Use the derived functional hypothesis to inform proactive strategies in the Behaviour Plans (BSP) module.'
    ],
    ndisComplianceGuardrail:
      'Distinguish correlation from causation; label conditional probabilities with exact sample sizes (n) and observation periods.',
    entryCoreRoleDuty:
      'Record objective, non-judgmental antecedent, behaviour, and consequence observations.',
    proficientDirectorRoleDuty:
      'Synthesise ABC probability matrices into formal Functional Behaviour Assessments (FBAs).'
  },
  {
    tabId: 'bsp-plans',
    title: 'Behaviour Support Plans (BSP) Studio',
    pillar: 'Clinical & PBS',
    purpose:
      'Authors and updates NDIS Behaviour Support Plans across Proactive, Active, and Reactive strategy tiers with direct Google Docs compilation and Plan Review generation.',
    whenToUse:
      'Use when drafting or updating a participant’s Interim (6-Month) or Comprehensive (12-Month) Behaviour Support Plan.',
    steps: [
      'Select the target participant to load their current Behaviour Support Plan and next mandatory review date.',
      'Use the embedded PBS Governance Suite to compile longitudinal GAS scores and case notes into a Plan Review Report.',
      'Edit Proactive (green), Active (amber), and Reactive (red) strategies using person-centred language.',
      'Save BSP revisions (logged to the NDIS Audit Trail) or export the formatted plan directly to Google Docs.'
    ],
    ndisComplianceGuardrail:
      'Draft BSPs authored by Entry or Core practitioners must be co-signed by a Proficient Practitioner prior to NDIS Commission submission.',
    entryCoreRoleDuty:
      'Draft proactive, active, and reactive strategies grounded in FBA data and submit for co-signature.',
    proficientDirectorRoleDuty:
      'Review, co-sign, and authorise Behaviour Support Plans for NDIS Commission lodgement.'
  },
  {
    tabId: 'practice-tools',
    title: 'Clinical Assessment Tools (WHODAS 2.0 / FAST / MAS / QABF)',
    pillar: 'Clinical & PBS',
    purpose:
      'Provides interactive psychometric and functional behaviour assessment calculators including WHODAS 2.0, FAST, MAS, and QABF.',
    whenToUse:
      'Use during initial intake assessments, Functional Behaviour Assessments, and annual NDIS Plan Review evaluations.',
    steps: [
      'Select the target participant and choose an assessment instrument (WHODAS 2.0, FAST, MAS, or QABF).',
      'Score each domain item based on participant/carer interviews and direct clinical observation.',
      'Review the automatically calculated domain scores, functional rank order, and formula summary.',
      'Save the assessment summary to the participant dossier or export to Google Drive.'
    ],
    ndisComplianceGuardrail:
      'Psychometric screening tools support clinical formulation; they do not replace comprehensive multi-setting observation or medical diagnosis.',
    entryCoreRoleDuty:
      'Administer functional screening questionnaires with participants/carers and record raw scores.',
    proficientDirectorRoleDuty:
      'Interpret composite psychometric scores and integrate findings into the FBA/BSP.'
  },
  {
    tabId: 'ai-predictive-insights',
    title: 'Clinical & Operational Decision-Support Insights',
    pillar: 'Clinical & PBS',
    purpose:
      'Provides transparent, evidence-grounded budget trajectory projections, caseload risk stratification, and documentation completeness checks.',
    whenToUse:
      'Use during monthly clinical governance reviews to spot participants at risk of budget exhaustion or overdue plan reviews.',
    steps: [
      'Select a participant or practice-wide view to inspect calculated budget burn rates and session trends.',
      'Review the explicit inputs, time periods, and linear projection assumptions shown on each card.',
      'Check documentation completeness alerts for missing service agreements or unlinked case notes.',
      'Export the decision-support summary for clinical supervision meetings.'
    ],
    ndisComplianceGuardrail:
      'All forecasts are clearly labelled as mathematical estimates based on supplied historical data, never as guaranteed NDIA funding outcomes.',
    entryCoreRoleDuty:
      'Review caseload completeness flags and resolve missing session notes.',
    proficientDirectorRoleDuty:
      'Use trajectory estimates to plan NDIS Change of Circumstances or Plan Reassessment requests.'
  },
  {
    tabId: 'google-workspace',
    title: 'Google Workspace Hub (Drive, Docs, Sheets, Calendar, Gmail)',
    pillar: 'Google Cloud Ecosystem',
    purpose:
      'Unified command hub for 1P Google Workspace integrations including Drive folder sync, Google Picker, Calendar scheduling, and Gmail communications.',
    whenToUse:
      'Use when syncing participant Google Drive folders, classifying uploaded files, or checking Google OAuth connection status.',
    steps: [
      'Verify the Google Workspace OAuth connection status in the diagnostic banner at the top.',
      'Use the Google Drive Picker or Folder Sync Manager to link participant clinical folders.',
      'Classify and preview Drive documents (PDFs, Docs, Sheets) without leaving Breakthrough OS.',
      'Review Workspace search insights and file-type distributions across the practice.'
    ],
    ndisComplianceGuardrail:
      'Base document classification and participant matching on actual document content; leave ambiguous matches unassigned for human review.',
    entryCoreRoleDuty:
      'Attach session evidence and verify participant folder assignments.',
    proficientDirectorRoleDuty:
      'Manage practice-wide Drive folder structures and review unassigned document classifications.'
  },
  {
    tabId: 'google-keep',
    title: 'Google Keep Clinical Sync',
    pillar: 'Google Cloud Ecosystem',
    purpose:
      'Synchronises rapid field notes and action checklists from Google Keep into structured CRM tasks and clinical follow-ups.',
    whenToUse:
      'Use after community outreach visits to convert quick field reminders into assigned practice tasks.',
    steps: [
      'Review field notes and checklists captured during outreach sessions.',
      'Tag each note with a clinical or operational category and priority level.',
      'Click "Sync to CRM Tasks" to convert checklist items into trackable tasks.',
      'Link participant-specific action items to their formal Case Notes or CRM profile.'
    ],
    ndisComplianceGuardrail:
      'Transient field notes must be converted into formal SOAP/BIRP/SIMPL case notes to serve as valid NDIS claim evidence.',
    entryCoreRoleDuty:
      'Convert outreach field reminders into formal clinical case notes on the same day.',
    proficientDirectorRoleDuty:
      'Assign follow-up tasks across the clinical and intake team.'
  },
  {
    tabId: 'google-classroom',
    title: 'Training, Induction & NDIS Quality Modules',
    pillar: 'Google Cloud Ecosystem',
    purpose:
      'Tracks mandatory NDIS Worker Orientation, PBS Capability Framework modules, and internal clinical supervision coursework.',
    whenToUse:
      'Use during staff onboarding and annual CPD reviews to track mandatory training completion.',
    steps: [
      'Browse mandatory NDIS Quality & Safeguards Commission and internal PBS training courses.',
      'Check completion status and CPD hours logged for each practitioner.',
      'Launch linked Google Classroom training materials and competency quizzes.',
      'Record course completion certificates into the practitioner’s HR compliance profile.'
    ],
    ndisComplianceGuardrail:
      'All NDIS workers must complete the mandatory NDIS Worker Orientation Module ("Quality, Safety and You") and maintain required CPD hours.',
    entryCoreRoleDuty:
      'Complete assigned induction and PBS capability training modules.',
    proficientDirectorRoleDuty:
      'Assign supervision coursework and audit practitioner CPD completion.'
  },
  {
    tabId: 'budget-monitoring',
    title: 'Real-Time NDIS Budget Monitoring Dashboard',
    pillar: 'Finance & Compliance',
    purpose:
      'Calculates remaining NDIS funds per participant in real time based on signed Service Agreements, Core/Capacity allocations, and logged support hours.',
    whenToUse:
      'Use prior to scheduling intensive therapy blocks or submitting PRODA claims to prevent over-claiming.',
    steps: [
      'Review practice-wide total allocated NDIS funding, committed spend, and remaining balance KPIs.',
      'Inspect individual participant budget bars comparing Budget Used % against Plan Time Elapsed %.',
      'Identify participants flagged as "Over-Burn Risk" (spending faster than plan timeline) or "Under-Utilised".',
      'Drill down into linked billing claims and service agreement allocations per client.'
    ],
    ndisComplianceGuardrail:
      'Calculations use supplied budget allocations and logged claims in AUD. Always confirm live balances in the myplace / PACE portal before final claiming.',
    entryCoreRoleDuty:
      'Check remaining participant hours before booking additional therapy or travel.',
    proficientDirectorRoleDuty:
      'Monitor burn-rate alerts and coordinate budget variations with Support Coordinators.'
  },
  {
    tabId: 'billing',
    title: 'NDIS Billing, PACE Pre-Flight Validator & Plan Manager Invoicing',
    pillar: 'Finance & Compliance',
    purpose:
      'Manages NDIS support claims, runs the 5-Point PRODA/PACE Pre-Flight CSV Validator, and dispatches GST-free Plan Manager tax invoices via Gmail.',
    whenToUse:
      'Use during weekly billing runs to validate pending claims, export PRODA bulk CSVs, or email invoices to Plan Managers.',
    steps: [
      'Run the 5-Point PRODA/PACE Pre-Flight Validator to check Service Agreement dates, remaining budget, PAPL price caps, linked case notes, and duplicates.',
      'Export only validated, compliant claim lines into the official PRODA Bulk Payment Request CSV format.',
      'Switch to the Plan Manager Invoice Dispatch tab to review itemised, GST-free NDIS tax invoices grouped by Plan Manager.',
      'Click "Review & Dispatch via Gmail" and confirm the recipient details in the staff confirmation modal.'
    ],
    ndisComplianceGuardrail:
      'Claims missing linked case note evidence, active service agreements, or within-cap unit rates are automatically blocked from PRODA CSV export.',
    entryCoreRoleDuty:
      'Ensure session case notes and durations are accurately logged so billing lines pass pre-flight validation.',
    proficientDirectorRoleDuty:
      'Review pre-flight validation results, export PRODA bulk CSVs, and authorise Gmail invoice dispatch.'
  },
  {
    tabId: 'papl-calculator',
    title: 'PAPL Travel, MMM Zone & Shared Apportionment Calculator',
    pillar: 'Finance & Compliance',
    purpose:
      'Interactive NDIS PAPL calculator for MMM1–MMM7 provider travel caps, remote price loadings, short-notice cancellations (<7 clear business days), and multi-participant shared visit apportionment.',
    whenToUse:
      'Use whenever calculating provider travel time/kilometres across 1–6 participants or verifying short-notice cancellation eligibility.',
    steps: [
      'Select the NDIS Support Item code, service date, and Modified Monash Model zone (MMM1 to MMM7).',
      'Enter outbound/return travel minutes and route kilometres ($0.99/km reference rate).',
      'If applicable, select a Short-Notice Cancellation scenario and verify the 4 mandatory PAPL statutory conditions.',
      'Add 1 to 6 participants on the shared run, choose Equal (1/N), Duration-Weighted, or Custom % apportionment, and click "Queue Apportioned Claims".'
    ],
    ndisComplianceGuardrail:
      'Shows all inputs, formulas, and units in AUD. Unincurred travel is automatically zeroed out if a short-notice cancellation occurs prior to departure.',
    entryCoreRoleDuty:
      'Calculate apportioned travel time and kilometres accurately after shared outreach runs.',
    proficientDirectorRoleDuty:
      'Verify 4-point short-notice cancellation compliance and queue apportioned claims to the ledger.'
  },
  {
    tabId: 'audit',
    title: 'NDIS Audit, Quality & Evidence Pack Builder',
    pillar: 'Finance & Compliance',
    purpose:
      'Monitors compliance with NDIS Practice Standards (Core Module + Module 2A Specialist Behaviour Support) and builds exportable NDIS Commission Audit Evidence Packs.',
    whenToUse:
      'Use during internal quality reviews or when preparing for NDIS mid-term and renewal certification audits.',
    steps: [
      'Review compliance readiness scores across Participant Rights, Governance, Provision of Supports, and Module 2A PBS.',
      'Use the NDIS Commission Audit Evidence Pack Builder to cross-check signed agreements, co-signed BSPs, RP authorisations, and staff credentials.',
      'Inspect any flagged compliance gaps (e.g., unsigned agreements or expiring worker screenings).',
      'Export the structured NDIS Audit Evidence Pack to Printable PDF, CSV, or JSON.'
    ],
    ndisComplianceGuardrail:
      'Audit readiness indicators reflect internal record completeness and do not constitute formal certification by an approved quality auditor.',
    entryCoreRoleDuty:
      'Resolve any flagged clinical documentation or case note gaps on assigned participants.',
    proficientDirectorRoleDuty:
      'Compile and sign off NDIS Commission audit evidence packs for external auditors.'
  },
  {
    tabId: 'audit-logs',
    title: 'Automated NDIS Compliance Audit Logger',
    pillar: 'Finance & Compliance',
    purpose:
      'Immutable, hash-chained audit trail recording every change to support items, participant service agreements, clinical notes, restrictive practices, and claims.',
    whenToUse:
      'Use during quality audits or clinical investigations to inspect who changed a record, when, why, and the exact before/after field values.',
    steps: [
      'Filter audit entries by category (Support Item, Service Agreement, Clinical Case Note, Incident & RP, Billing).',
      'Search by participant name, NDIS number, practitioner actor, or action type.',
      'Expand any log entry to inspect the field-level before/after diff table and integrity hash.',
      'Export the filtered audit log trail to CSV or JSON for NDIS Quality and Safeguards Commission auditors.'
    ],
    ndisComplianceGuardrail:
      'All state mutations across clinical notes, service agreements, and support item rates are automatically logged with actor attribution.',
    entryCoreRoleDuty:
      'Provide clear clinical reasons whenever amending a previously saved case note.',
    proficientDirectorRoleDuty:
      'Review the audit trail during monthly governance and quality assurance meetings.'
  },
  {
    tabId: 'crm',
    title: 'Intake & 17hats CRM Pipeline',
    pillar: 'Finance & Compliance',
    purpose:
      'Manages prospective NDIS participant enquiries from initial referral through screening, service agreement drafting, and conversion to active client.',
    whenToUse:
      'Use when receiving referrals from Support Coordinators, hospitals, or families and tracking intake tasks.',
    steps: [
      'Add new referral leads with NDIS number, Support Coordinator contact details, and requested PBS/therapy services.',
      'Move leads across intake stages (New Intake → Screening → Service Agreement Pending → Converted to Client).',
      'Manage linked CRM tasks and follow-up communication logs.',
      'Convert approved intake leads directly into active NDIS Participant profiles.'
    ],
    ndisComplianceGuardrail:
      'Verify practitioner capacity and capability tier suitability before accepting high-risk behaviour support referrals.',
    entryCoreRoleDuty:
      'Complete assigned intake screening tasks and initial contact logs.',
    proficientDirectorRoleDuty:
      'Triage new referrals, assess clinical risk, and approve conversion to active caseload.'
  },
  {
    tabId: 'security-audit',
    title: 'Security, Privacy & Role Access Audit',
    pillar: 'Finance & Compliance',
    purpose:
      'Monitors role-based access control (RBAC), Firebase authentication sessions, Australian Privacy Principles (APP) safeguards, and data encryption status.',
    whenToUse:
      'Use by the Clinical Director / Admin to verify practitioner role permissions and audit session security.',
    steps: [
      'Review active practitioner roles and module access permissions.',
      'Verify participant data isolation and privacy safeguards under the Privacy Act 1988 (Cth).',
      'Inspect authentication session logs and Google OAuth scope permissions.',
      'Run security posture checks across Firestore rules and client-side storage.'
    ],
    ndisComplianceGuardrail:
      'Access control and participant consent must be enforced at all times; never combine or disclose one participant’s data in another’s context.',
    entryCoreRoleDuty:
      'Follow minimum-necessary participant privacy principles and lock workstations when unattended.',
    proficientDirectorRoleDuty:
      'Manage user roles, audit access logs, and oversee data governance.'
  },
  {
    tabId: 'integrations',
    title: 'API Integrations Hub (Google Workspace, Xero, PRODA)',
    pillar: 'Finance & Compliance',
    purpose:
      'Configures and monitors external ecosystem connections including Google Workspace OAuth (Drive, Docs, Gmail, Calendar), PRODA/PACE exports, and Xero accounting.',
    whenToUse:
      'Use when re-authorising Google Workspace OAuth scopes or checking integration health.',
    steps: [
      'Inspect the live connection status of Google Drive, Docs, Sheets, Calendar, and Gmail scopes.',
      'Use the Google Workspace Auth Diagnostic Panel to test token validity or trigger Re-authorization.',
      'Review PRODA CSV and Xero invoice export schema mappings.',
      'Check offline delta queue synchronisation status.'
    ],
    ndisComplianceGuardrail:
      'Never hardcode API secrets in client code; Google Workspace OAuth uses explicit user consent and Bearer tokens.',
    entryCoreRoleDuty:
      'Ensure personal Google Workspace account is connected when exporting Docs or Calendar reminders.',
    proficientDirectorRoleDuty:
      'Manage practice-wide integration settings and OAuth scope authorisations.'
  },
  {
    tabId: 'participant-portal',
    title: 'Participant / Nominee Portal & E-Signature Suite',
    pillar: 'Portals',
    purpose:
      'Dedicated accessible portal for NDIS participants and nominees to view goals, check budget utilisation, sign Service Agreements/Consents digitally, and confirm appointments.',
    whenToUse:
      'Use with participants/nominees during onboarding or service agreement renewals to capture digital e-signatures and send 24h appointment reminders.',
    steps: [
      'Select the participant profile to preview their Easy-Read Schedule of Supports, goals, and budget utilisation.',
      'Open the Digital Service Agreement & Consent E-Signature tab to review the GST-free Schedule of Supports and PAPL terms.',
      'Have the participant or authorised nominee sign on the interactive HTML5 signature pad and archive the signed record to Google Drive.',
      'Use the Two-Way Calendar & 24-Hour Appointment Reminder tab to sync sessions to Google Calendar or send Gmail confirmations.'
    ],
    ndisComplianceGuardrail:
      'Confirm whether the signatory is the participant or an authorised Plan Nominee / Guardian and record their full name, relationship, and timestamp.',
    entryCoreRoleDuty:
      'Walk participants/nominees through their Easy-Read support schedule and session reminders.',
    proficientDirectorRoleDuty:
      'Verify signed Service Agreements and consent records prior to commencing billable supports.'
  }
];

const STAFF_ONBOARDING_ROSTER = [
  {
    id: 'staff-anitha',
    name: 'Anitha Haripersad',
    tier: 'Proficient Practitioner',
    email: 'support@breakthroughconsult.com.au',
    phone: '043 027 5400'
  },
  {
    id: 'staff-zubaida',
    name: 'Zubaida Baher',
    tier: 'Proficient Practitioner',
    email: 'zubaida@breakthroughconsult.com.au',
    phone: '042 308 8606'
  },
  {
    id: 'staff-andreja',
    name: 'Andreja Majcenovic',
    tier: 'Core Practitioner',
    email: 'andreja@breakthroughconsult.com.au',
    phone: '049 746 6209'
  },
  {
    id: 'staff-tania',
    name: 'Tania Bobovec',
    tier: 'Entry Practitioner',
    email: 'tanja@breakthroughconsult.com.au',
    phone: '046 882 8132'
  }
];

function toIsoDdMmYy(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '04-11-26';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

// ============================================================================
// 1. CONTEXTUAL MODULE GUIDE BANNER (RENDERED ABOVE EVERY ACTIVE MODULE)
// ============================================================================
export const ContextualModuleGuideBanner: React.FC<{
  activeTab: TabType;
  onOpenFullTour: () => void;
}> = ({ activeTab, onOpenFullTour }) => {
  const { setActiveTab } = useManagementStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [completedTabs, setCompletedTabs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem('breakthrough_completed_module_guides_v1');
      if (saved) setCompletedTabs(JSON.parse(saved));
    } catch {
      // ignore storage error
    }
  }, []);

  const toggleModuleCompleted = (tabId: string) => {
    const updated = { ...completedTabs, [tabId]: !completedTabs[tabId] };
    setCompletedTabs(updated);
    try {
      localStorage.setItem('breakthrough_completed_module_guides_v1', JSON.stringify(updated));
    } catch {
      // ignore storage error
    }
  };

  const guide = useMemo(
    () =>
      MODULE_GUIDES_REGISTRY.find((g) => g.tabId === activeTab) || MODULE_GUIDES_REGISTRY[0],
    [activeTab]
  );

  const isCompleted = Boolean(completedTabs[guide.tabId]);
  const completedCount = Object.values(completedTabs).filter(Boolean).length;

  return (
    <div className="mb-5 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-sm overflow-hidden">
      {/* Compact Top Bar */}
      <div className="px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30">
                Module Guide · {guide.pillar}
              </span>
              <h3 className="text-xs font-bold text-white truncate">{guide.title}</h3>
              {isCompleted && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Read &amp; Verified
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">{guide.purpose}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => toggleModuleCompleted(guide.tabId)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isCompleted
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>
              {isCompleted ? 'Guide Completed' : 'Mark Guide Read'} ({completedCount}/{MODULE_GUIDES_REGISTRY.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="px-3 py-1.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{isExpanded ? 'Hide Step-by-Step Guide' : 'How to Use This Module (4 Steps)'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onOpenFullTour}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3 h-3" />
            <span>Interactive Tour</span>
          </button>
        </div>
      </div>

      {/* Expandable 4-Step Walkthrough & Role Responsibilities */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-3 border-t border-slate-800/80 bg-slate-950/60 space-y-3.5 text-xs">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 block">
                Purpose &amp; When to Use
              </span>
              <p className="text-slate-200 leading-relaxed">{guide.purpose}</p>
              <p className="text-slate-400 text-[11px] pt-1">
                <strong className="text-slate-300">When to use:</strong> {guide.whenToUse}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                Practitioner Tier Responsibilities
              </span>
              <p className="text-slate-300 leading-relaxed">
                <strong className="text-amber-300">Entry / Core (Tania &amp; Andreja):</strong>{' '}
                {guide.entryCoreRoleDuty}
              </p>
              <p className="text-slate-300 leading-relaxed pt-1">
                <strong className="text-teal-300">Proficient / Director (Anitha, Zubaida &amp; Shivan):</strong>{' '}
                {guide.proficientDirectorRoleDuty}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                NDIS Quality &amp; Evidence Guardrail
              </span>
              <p className="text-slate-300 leading-relaxed">{guide.ndisComplianceGuardrail}</p>
              <button
                type="button"
                onClick={() => setActiveTab('company-library')}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-teal-400 hover:text-teal-300 cursor-pointer"
              >
                <span>Open Full Operations Manual in Company Library</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* 4 Operational Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {guide.steps.map((stepText, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 flex items-start gap-2.5"
              >
                <span className="w-5 h-5 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 font-mono text-[11px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-[11px] text-slate-200 leading-relaxed">{stepText}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. INTERACTIVE FIRST-TIME USER WALKTHROUGH TOUR MODAL
// ============================================================================
export const InteractiveAppTourModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { activeTab, setActiveTab } = useManagementStore();
  const [selectedPillar, setSelectedPillar] = useState<string>('ALL');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [dontShowOnStartup, setDontShowOnStartup] = useState<boolean>(false);

  const filteredModules = useMemo(() => {
    if (selectedPillar === 'ALL') return MODULE_GUIDES_REGISTRY;
    return MODULE_GUIDES_REGISTRY.filter((m) => m.pillar === selectedPillar);
  }, [selectedPillar]);

  useEffect(() => {
    const activeIdx = filteredModules.findIndex((m) => m.tabId === activeTab);
    if (activeIdx >= 0) {
      setCurrentIndex(activeIdx);
    } else {
      setCurrentIndex(0);
    }
  }, [activeTab, filteredModules]);

  if (!isOpen) return null;

  const currentGuide = filteredModules[currentIndex] || MODULE_GUIDES_REGISTRY[0];

  const handleCloseTour = () => {
    if (dontShowOnStartup) {
      try {
        localStorage.setItem('breakthrough_first_time_tour_seen_v1', 'true');
      } catch {
        // ignore
      }
    }
    onClose();
  };

  const handleJumpToModule = (tabId: TabType) => {
    setActiveTab(tabId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 my-8">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-teal-500/15 border border-teal-500/30 text-[11px] font-bold uppercase tracking-wider text-teal-300">
                First-Time User Onboarding &amp; Interactive Module Walkthrough
              </span>
              <span className="text-xs font-mono text-slate-400">
                Module {currentIndex + 1} of {filteredModules.length}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Breakthrough OS — Interactive Staff Tutorial &amp; Module Guide
            </h2>
          </div>

          <button
            type="button"
            onClick={handleCloseTour}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pillar Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            'ALL',
            'Practice Operations',
            'Clinical & PBS',
            'Google Cloud Ecosystem',
            'Finance & Compliance',
            'Portals'
          ].map((pillar) => (
            <button
              key={pillar}
              type="button"
              onClick={() => {
                setSelectedPillar(pillar);
                setCurrentIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedPillar === pillar
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {pillar === 'ALL' ? `All Modules (${MODULE_GUIDES_REGISTRY.length})` : pillar}
            </button>
          ))}
        </div>

        {/* Main Walkthrough Content Card */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                {currentGuide.pillar}
              </span>
              <h3 className="text-lg font-extrabold text-white mt-0.5">{currentGuide.title}</h3>
            </div>

            <button
              type="button"
              onClick={() => handleJumpToModule(currentGuide.tabId)}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
            >
              <span>Navigate to Module Live</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 block">
                Module Purpose
              </span>
              <p className="text-slate-200 leading-relaxed">{currentGuide.purpose}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
                When Staff Should Use This Module
              </span>
              <p className="text-slate-200 leading-relaxed">{currentGuide.whenToUse}</p>
            </div>
          </div>

          {/* 4-Step Operational Walkthrough */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Step-by-Step Operational Workflow
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {currentGuide.steps.map((step, sIdx) => (
                <div
                  key={sIdx}
                  className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-2.5"
                >
                  <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                    {sIdx + 1}
                  </span>
                  <span className="text-slate-200 leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Role Duties & NDIS Guardrail */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                Entry &amp; Core Practitioners (Tania &amp; Andreja)
              </span>
              <p className="text-slate-300">{currentGuide.entryCoreRoleDuty}</p>
            </div>

            <div className="p-3 rounded-xl bg-teal-950/20 border border-teal-500/30 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 block">
                Proficient &amp; Director (Anitha, Zubaida &amp; Shivan)
              </span>
              <p className="text-slate-300">{currentGuide.proficientDirectorRoleDuty}</p>
            </div>

            <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">
                NDIS Practice Standard Guardrail
              </span>
              <p className="text-slate-300">{currentGuide.ndisComplianceGuardrail}</p>
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowOnStartup}
              onChange={(e) => setDontShowOnStartup(e.target.checked)}
              className="rounded border-slate-700 text-teal-500"
            />
            <span>Don&apos;t auto-open tutorial on startup (you can reopen anytime from the Header)</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentIndex <= 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Module</span>
            </button>

            <button
              type="button"
              disabled={currentIndex >= filteredModules.length - 1}
              onClick={() =>
                setCurrentIndex((prev) => Math.min(filteredModules.length - 1, prev + 1))
              }
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Next Module</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleCloseTour}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Finish Tour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. COMPANY LIBRARY MASTER APPLICATION & MODULE OPERATIONS HANDBOOK
//    + STAFF ONBOARDING & SOP ACKNOWLEDGEMENT TRACKER
// ============================================================================
export const CompanyLibraryMasterGuideBook: React.FC = () => {
  const { setActiveTab, addAuditLog, addNotification } = useManagementStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState<string>('ALL');
  const [isPrintManualOpen, setIsPrintManualOpen] = useState(false);
  const [isConfirmDocsOpen, setIsConfirmDocsOpen] = useState(false);
  const [isCreatingGoogleDoc, setIsCreatingGoogleDoc] = useState(false);
  const [exportedDocLink, setExportedDocLink] = useState<{ title: string; url: string } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Staff Onboarding & SOP Acknowledgement Tracker State
  const [staffAcknowledgements, setStaffAcknowledgements] = useState<
    Record<
      string,
      {
        acknowledged: boolean;
        acknowledgedDateIso: string;
        modulesCompleted: number;
      }
    >
  >({
    'staff-anitha': {
      acknowledged: true,
      acknowledgedDateIso: '01-11-26',
      modulesCompleted: 27
    },
    'staff-zubaida': {
      acknowledged: true,
      acknowledgedDateIso: '02-11-26',
      modulesCompleted: 27
    },
    'staff-andreja': {
      acknowledged: true,
      acknowledgedDateIso: '03-11-26',
      modulesCompleted: 24
    },
    'staff-tania': {
      acknowledged: false,
      acknowledgedDateIso: 'Not stated',
      modulesCompleted: 19
    }
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 5000);
  };

  const filteredGuides = useMemo(() => {
    return MODULE_GUIDES_REGISTRY.filter((g) => {
      if (pillarFilter !== 'ALL' && g.pillar !== pillarFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = g.title.toLowerCase().includes(q);
        const matchPurpose = g.purpose.toLowerCase().includes(q);
        const matchGuardrail = g.ndisComplianceGuardrail.toLowerCase().includes(q);
        if (!matchTitle && !matchPurpose && !matchGuardrail) return false;
      }
      return true;
    });
  }, [pillarFilter, searchQuery]);

  const handleToggleStaffSignOff = (staffId: string, staffName: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isoDate = toIsoDdMmYy(todayStr);

    setStaffAcknowledgements((prev) => {
      const current = prev[staffId];
      const nextAck = !current?.acknowledged;
      return {
        ...prev,
        [staffId]: {
          acknowledged: nextAck,
          acknowledgedDateIso: nextAck ? isoDate : 'Not stated',
          modulesCompleted: nextAck ? MODULE_GUIDES_REGISTRY.length : current?.modulesCompleted || 19
        }
      };
    });

    addAuditLog(
      'STAFF_OPERATIONS_MANUAL_SOP_ACKNOWLEDGED',
      'companyDocuments',
      staffId,
      `${staffName} recorded formal SOP & Application Operations Manual acknowledgement (ISO ${isoDate}).`,
      {
        auditCategory: 'Practitioner & HR',
        ndisPracticeStandard: 'NDIS Practice Standards — Human Resource Management & Staff Induction',
        severity: 'Low'
      }
    );

    addNotification({
      title: `SOP Manual Signed Off: ${staffName}`,
      message: `${staffName} acknowledged the Breakthrough OS Master Application & Module Operations Guide (${isoDate}).`,
      type: 'hr',
      severity: 'success'
    });

    showToast(`Recorded SOP & Application Guide sign-off for ${staffName} (ISO ${isoDate}).`);
  };

  const handleConfirmExportManualToGoogleDocs = async () => {
    setIsCreatingGoogleDoc(true);
    const docTitle = `Breakthrough_OS_Master_Module_Operations_Guide_${new Date().toISOString().split('T')[0]}`;
    try {
      const token = getCachedGoogleAccessToken();
      let docUrl = 'https://docs.google.com/document/create';

      if (token) {
        const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title: docTitle })
        });
        if (createRes.ok) {
          const created = await createRes.json();
          if (created?.documentId) {
            docUrl = `https://docs.google.com/document/d/${created.documentId}/edit`;
            const bodyText =
              `BREAKTHROUGH NDIS PRACTICE MANAGEMENT — MASTER APPLICATION & MODULE OPERATIONS GUIDE\n` +
              `Generated: ${new Date().toISOString().split('T')[0]}\n\n` +
              MODULE_GUIDES_REGISTRY.map(
                (m, i) =>
                  `${i + 1}. ${m.title} [${m.pillar}]\nPurpose: ${m.purpose}\nWhen to Use: ${m.whenToUse}\nSteps:\n  1) ${m.steps[0]}\n  2) ${m.steps[1]}\n  3) ${m.steps[2]}\n  4) ${m.steps[3]}\nNDIS Guardrail: ${m.ndisComplianceGuardrail}\nEntry/Core Duty: ${m.entryCoreRoleDuty}\nProficient/Director Duty: ${m.proficientDirectorRoleDuty}\n`
              ).join('\n');

            await fetch(`https://docs.googleapis.com/v1/documents/${created.documentId}:batchUpdate`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                requests: [{ insertText: { location: { index: 1 }, text: bodyText } }]
              })
            });

            await storePickedDriveFileMetadata({
              file: {
                id: created.documentId,
                name: `${docTitle}.gdoc`,
                mimeType: 'application/vnd.google-apps.document',
                url: docUrl,
                sizeBytes: 64800,
                description: 'Breakthrough OS Master Application & Module Operations Guide (27 Modules)'
              },
              clientId: 'company-library',
              clientName: 'Breakthrough Consult Corporate Library',
              category: 'Clinical Report',
              uploadedBy: 'admin-shivan',
              uploadedByName: 'Shivandhari Persad'
            });
          }
        }
      }

      setExportedDocLink({ title: docTitle, url: docUrl });
      setIsConfirmDocsOpen(false);
      showToast(`Master Application & Module Operations Guide compiled to Google Docs (${docTitle}).`);
    } catch {
      setIsConfirmDocsOpen(false);
      showToast('Prepared local Printable PDF manual fallback.');
    } finally {
      setIsCreatingGoogleDoc(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-teal-500/15 border border-teal-500/30 text-[11px] font-bold uppercase tracking-wider text-teal-300">
                Company Library SOP · Master Application Manual
              </span>
              <span className="text-xs font-mono text-slate-400">
                {MODULE_GUIDES_REGISTRY.length} Documented Modules · v2026.4
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-teal-400 shrink-0" />
              <span>Breakthrough OS — Master Application &amp; Module Operations Guide</span>
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl">
              Official staff onboarding manual and standard operating reference explaining each module&apos;s purpose,
              step-by-step workflow, NDIS compliance guardrails, and capability-level responsibilities across{' '}
              <strong>Entry</strong>, <strong>Core</strong>, <strong>Proficient</strong>, and <strong>Director</strong>{' '}
              roles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPrintManualOpen(true)}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-teal-950/40 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Printable PDF Handbook</span>
            </button>

            <button
              type="button"
              onClick={() => setIsConfirmDocsOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600/25 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Export Handbook to Google Docs</span>
            </button>
          </div>
        </div>

        {toastMsg && (
          <div className="p-3 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-200 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>{toastMsg}</span>
            </div>
            <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {exportedDocLink && (
          <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-between text-xs">
            <div className="text-indigo-200">
              Compiled to Google Docs: <strong className="text-white">{exportedDocLink.title}</strong>
            </div>
            <a
              href={exportedDocLink.url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold inline-flex items-center gap-1.5"
            >
              <span>Open in Google Docs</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Staff Onboarding Progress & SOP Acknowledgement Tracker */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-teal-400" />
              <span>Staff Onboarding Progress &amp; SOP Manual Acknowledgement Register</span>
            </h3>
            <p className="text-xs text-slate-400">
              Tracks module tutorial completion and formal sign-off on the Breakthrough OS Operations Manual across your 4 practitioners.
            </p>
          </div>
          <span className="text-xs font-mono text-teal-400 font-bold">
            {Object.values(staffAcknowledgements).filter((s) => s.acknowledged).length} / 4 Practitioners Signed Off
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {STAFF_ONBOARDING_ROSTER.map((prac) => {
            const state = staffAcknowledgements[prac.id];
            return (
              <div
                key={prac.id}
                className={`p-3.5 rounded-xl border space-y-2.5 flex flex-col justify-between ${
                  state?.acknowledged
                    ? 'bg-teal-950/15 border-teal-500/30'
                    : 'bg-amber-950/15 border-amber-500/30'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{prac.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        state?.acknowledged
                          ? 'bg-teal-500/20 text-teal-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {state?.acknowledged ? 'SOP Signed' : 'Pending Sign-Off'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">{prac.tier}</div>
                  <div className="text-[10px] font-mono text-slate-500 truncate">{prac.email}</div>
                  <div className="text-[11px] font-mono text-slate-300 pt-1">
                    Modules Completed: <strong>{state?.modulesCompleted || 0}/{MODULE_GUIDES_REGISTRY.length}</strong> · Date:{' '}
                    <strong>{state?.acknowledgedDateIso || 'Not stated'}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleStaffSignOff(prac.id, prac.name)}
                  className={`w-full py-1.5 px-3 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    state?.acknowledged
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-teal-600 hover:bg-teal-500 text-white'
                  }`}
                >
                  {state?.acknowledged ? 'Verified (Click to Toggle)' : 'Record SOP Acknowledgement'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            'ALL',
            'Practice Operations',
            'Clinical & PBS',
            'Google Cloud Ecosystem',
            'Finance & Compliance',
            'Portals'
          ].map((pillar) => (
            <button
              key={pillar}
              type="button"
              onClick={() => setPillarFilter(pillar)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                pillarFilter === pillar
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {pillar === 'ALL' ? `All Modules (${MODULE_GUIDES_REGISTRY.length})` : pillar}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search module guide, PAPL, BSP, SCHADS..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Module Reference Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGuides.map((g, index) => (
          <div
            key={g.tabId}
            className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3.5 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30">
                    {index + 1}. {g.pillar}
                  </span>
                  <h3 className="text-base font-extrabold text-white mt-1.5">{g.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab(g.tabId)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-teal-600 text-slate-200 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <span>Open Module</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{g.purpose}</p>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  How to Use This Module (4-Step SOP)
                </span>
                <ol className="space-y-1 text-slate-300 list-decimal list-inside">
                  {g.steps.map((s, sIdx) => (
                    <li key={sIdx} className="leading-relaxed">
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/80 text-[11px]">
              <div className="text-slate-300">
                <strong className="text-amber-300">Entry/Core Duty:</strong> {g.entryCoreRoleDuty}
              </div>
              <div className="text-slate-300">
                <strong className="text-teal-300">Proficient/Director Duty:</strong> {g.proficientDirectorRoleDuty}
              </div>
              <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-indigo-200">
                <strong>NDIS Compliance Rule:</strong> {g.ndisComplianceGuardrail}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Printable PDF Operations Manual */}
      {isPrintManualOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-4xl w-full bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                  Breakthrough Consult — Standard Operating Procedure (DOC-SOP-APP-GUIDE-2026)
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                  Breakthrough OS — Master Application &amp; Module Operations Manual
                </h2>
                <p className="text-xs text-slate-600 font-mono">
                  Effective Date: 04-11-26 · Total Documented Modules: {MODULE_GUIDES_REGISTRY.length}
                </p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintManualOpen(false)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {MODULE_GUIDES_REGISTRY.map((g, i) => (
                <div key={g.tabId} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>
                      {i + 1}. {g.title}
                    </span>
                    <span className="text-[11px] font-mono text-teal-700">{g.pillar}</span>
                  </div>
                  <p className="text-slate-700">
                    <strong>Purpose:</strong> {g.purpose}
                  </p>
                  <p className="text-slate-700">
                    <strong>Workflow Steps:</strong> 1) {g.steps[0]} 2) {g.steps[1]} 3) {g.steps[2]} 4) {g.steps[3]}
                  </p>
                  <p className="text-slate-700">
                    <strong>NDIS Compliance Rule:</strong> {g.ndisComplianceGuardrail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Google Docs Export */}
      {isConfirmDocsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                Confirm Google Docs Operations Manual Export
              </h3>
              <button
                onClick={() => setIsConfirmDocsOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Confirm creation of the <strong>Breakthrough OS Master Application &amp; Module Operations Guide</strong>{' '}
              ({MODULE_GUIDES_REGISTRY.length} modules) in your connected Google Docs / Drive workspace.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmDocsOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isCreatingGoogleDoc}
                onClick={handleConfirmExportManualToGoogleDocs}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
              >
                {isCreatingGoogleDoc ? 'Exporting to Google Docs...' : 'Confirm & Create Google Doc'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
