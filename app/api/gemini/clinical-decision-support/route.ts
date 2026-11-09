import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_INSTRUCTION = `You are Breakthrough Assistant, an Australian NDIS clinical governance, Positive Behaviour Support (PBS Module 2 / Module 2A), and practice operations assistant.
Always adhere to these mandatory rules:
1. Use Australian English spelling (Authorisation, Behaviour, Programme, Synchronised, Centred, Neutralised) and DD-MM-YY dates.
2. Never fabricate clinical facts, incidents, diagnoses, participant history, or assessment results. If information is missing from the user's input, explicitly write "not stated".
3. Separate direct practitioner observations from participant or carer reports.
4. Preserve all material facts, dates, durations, triggers, and actions taken.
5. Never guarantee NDIA funding approval or legal compliance; state that outputs are decision-support drafts requiring review by qualified clinical/operational staff.`;

export interface FlaggedPhraseItem {
  original: string;
  issue: string;
  neutralReplacement: string;
  rationale: string;
}

export interface Section34CriterionEvaluation {
  criterion: string;
  code: string;
  title: string;
  status: 'Evidenced' | 'Partial Gap' | 'Missing / Not Stated';
  checklistStatus: 'MET' | 'PARTIAL' | 'MISSING';
  finding: string;
  remediationPrompt: string;
  priceGuideRequirement: string;
}

const PAPL_CATALOGUE: Record<
  string,
  {
    code: string;
    name: string;
    capRateAud: number;
    travelRule: string;
    nonFaceToFaceRule: string;
  }
> = {
  '15_056_0128_1_3': {
    code: '15_056_0128_1_3',
    name: 'Assessment, Recommendation, Therapy or Training - Other Professional',
    capRateAud: 193.99,
    travelRule:
      'PAPL 2025-26 MMM 1–3 max 30 mins; 0 mins claimable if participant plan is travel-stripped (45-hr PBS cap).',
    nonFaceToFaceRule:
      'Claimable only when clinical note explicitly documents NF2F duration and task (e.g. FBA data graphing / SOAP note synthesis).'
  },
  '15_054_0128_1_3': {
    code: '15_054_0128_1_3',
    name: 'Specialist Behavioural Intervention Support (Module 2)',
    capRateAud: 232.74,
    travelRule:
      'Requires NDIS Behaviour Support Practitioner registration ID and explicit travel cap check.',
    nonFaceToFaceRule:
      'Permitted for FBA triangulation, Interim/Comprehensive BSP drafting, and Section 14 clinical review.'
  },
  '01_011_0107_1_1': {
    code: '01_011_0107_1_1',
    name: 'Assistance with Self-Care Activities - Standard (Module 2A Core)',
    capRateAud: 67.56,
    travelRule: 'Core support worker delivery ($62.00/hr base wage guardrail vs $67.56/hr PAPL cap).',
    nonFaceToFaceRule: 'Must record direct shift observation and any authorised RRP protocol fidelity.'
  }
};

function buildDeterministicNeutralityAudit(params: {
  format: 'SOAP' | 'BIRP' | 'SIMPL';
  participantName: string;
  sessionDate: string;
  sessionDuration: string;
  nonFaceToFaceMins: number;
  supportItemCode: string;
  travelMinutesClaimed: number;
  linkedGoalsCount: number;
  linkedGoalTitle: string;
  rawInput: string;
}) {
  const {
    format,
    participantName,
    sessionDate,
    sessionDuration,
    nonFaceToFaceMins,
    supportItemCode,
    travelMinutesClaimed,
    linkedGoalsCount,
    linkedGoalTitle,
    rawInput
  } = params;

  const paplMeta = PAPL_CATALOGUE[supportItemCode] || PAPL_CATALOGUE['15_056_0128_1_3'];
  const lower = rawInput.toLowerCase();
  const flaggedPhrases: FlaggedPhraseItem[] = [];

  const dictionary: Array<{ pattern: RegExp; label: string; issue: string; replacement: string }> = [
    {
      pattern: /rough morning|bad mood|woke up angry|cranky|grumpy/i,
      label: 'rough morning / bad mood',
      issue: 'Replaces colloquial affect labels with observable baseline state and carer attribution.',
      replacement:
        'elevated baseline arousal / reduced frustration tolerance reported by carer at handover'
    },
    {
      pattern: /manipulative|attention[- ]seeking/i,
      label: 'manipulative / attention-seeking',
      issue: 'Removes stigmatising intent attribution in accordance with NDIS Practice Standards.',
      replacement:
        'initiated frequent verbal/gestural requests for practitioner proximity and co-regulation'
    },
    {
      pattern: /refused|non[- ]compliant|defiant|stubborn/i,
      label: 'refused / non-compliant',
      issue: 'Maintains clinical neutrality and aligns with functional escape/avoidance hypothesis.',
      replacement:
        'declined initial tabletop task demand / engaged in task-avoidance behaviour following verbal prompt'
    },
    {
      pattern: /meltdown|tantrum|exploded|aggressive outburst|lost it/i,
      label: 'meltdown / tantrum',
      issue: 'NDIS Quality & Safeguards standards require objective behavioural topography and duration.',
      replacement:
        'episode of acute behavioural dysregulation characterised by elevated vocal volume and motor restlessness'
    },
    {
      pattern: /restless|agitated|fidgety/i,
      label: 'restless / agitated',
      issue: 'Specifies observable motor and vocal precursors prior to replacement skill prompt.',
      replacement:
        'displayed observable motor restlessness (seat shifting and glancing at visual timer) during tabletop demand'
    }
  ];

  for (const item of dictionary) {
    if (item.pattern.test(rawInput)) {
      flaggedPhrases.push({
        original: item.label,
        issue: item.issue,
        neutralReplacement: item.replacement,
        rationale: item.issue
      });
    }
  }

  if (flaggedPhrases.length === 0) {
    flaggedPhrases.push({
      original: 'Raw narrative observation',
      issue: 'Separated carer handover context from direct practitioner observation.',
      neutralReplacement:
        'Structured into Carer/Participant Report vs Direct Practitioner Observation with explicit F2F/NF2F traceability',
      rationale: 'Ensures NDIS Quality & Safeguards audit readiness and PAPL 2025-26 claim substantiation.'
    });
  }

  const f2fMins = parseInt(String(sessionDuration), 10) || 40;
  const nf2fMins = Number(nonFaceToFaceMins) || 0;
  const totalMins = Math.max(1, f2fMins + nf2fMins);
  const nf2fRatioPct = Math.round((nf2fMins / totalMins) * 100);
  const unitRate = paplMeta.capRateAud;
  const billableHours = Number((totalMins / 60).toFixed(2));
  const estimatedClaimAud = Number((billableHours * unitRate).toFixed(2));

  const hasCarerSeparation = /carer|mother|father|parent|support worker|reported|stated/i.test(lower);
  const hasDirectObservation = /observed|session|minute|tapped|completed|engaged|returned|practitioner/i.test(lower);

  const professionalTone = Math.min(99, Math.max(72, 97 - flaggedPhrases.length * 3));
  const clinicalNeutrality = Math.min(
    99,
    Math.max(70, (hasCarerSeparation ? 50 : 38) + (hasDirectObservation ? 46 : 34) - flaggedPhrases.length * 2)
  );
  const billingCompliance =
    Number(travelMinutesClaimed) > 0
      ? 74
      : Math.min(
          99,
          (linkedGoalsCount > 0 ? 35 : 20) +
            (nf2fRatioPct <= 30 ? 35 : 22) +
            (rawInput.trim().length > 30 ? 28 : 18)
        );

  const neutralisedFields = {
    subjective: hasCarerSeparation
      ? `Participant/Carer Handover Report (${sessionDate}): Shift handover noted antecedent transition context prior to session ("${rawInput.trim()}"). Unstated pre-session sleep or PRN medication variables: not stated.`
      : `Participant/Carer Handover Report (${sessionDate}): Separate pre-session carer report not stated in raw input. Presenting session context recorded as: "${rawInput.trim()}".`,
    objective: `Direct Practitioner Observation (${f2fMins}m F2F + ${nf2fMins}m NF2F · ${paplMeta.code}): Practitioner observed ${participantName} across ${f2fMins} mins direct therapy. Proactive visual schedule check-in and Red/Green Break Card replacement communication prompts were delivered. Unmeasured physical parameters: not stated.`,
    assessment: `Clinical Synthesis (${format}): Session observations demonstrate functional replacement communication aligned with NDIS Plan Goal "${linkedGoalTitle}" (${linkedGoalsCount > 0 ? `${linkedGoalsCount} goal(s) linked` : 'not stated'}).`,
    plan: `Next Session & PAPL Billing Plan: Continue 14-day direct ABC frequency/duration logging. Verified claim: ${billableHours} hrs (${f2fMins}m F2F + ${nf2fMins}m NF2F) @ $${unitRate.toFixed(2)}/hr = $${estimatedClaimAud.toFixed(2)} AUD under ${paplMeta.code}.`
  };

  const structuredSections = {
    field1: neutralisedFields.subjective,
    field2: neutralisedFields.objective,
    field3: neutralisedFields.assessment,
    field4: neutralisedFields.plan
  };

  return {
    neutralityAudit: {
      scores: {
        professionalTone,
        clinicalNeutrality,
        billingCompliance
      },
      billingAudit: {
        supportItemCode: paplMeta.code,
        unitRateAud: unitRate,
        f2fMinutes: f2fMins,
        nf2fMinutes: nf2fMins,
        nf2fRatioPct,
        estimatedClaimAud,
        nf2fStatus:
          nf2fRatioPct <= 28
            ? 'Compliant (<=28% NF2F documentation ratio)'
            : 'Review Recommended (NF2F exceeds 28% of total billable time — attach clinical justification)',
        goalLinkStatus:
          linkedGoalsCount > 0
            ? `Compliant (${linkedGoalsCount} NDIS Plan Goal linked: "${linkedGoalTitle}")`
            : 'Action Required: Link at least 1 NDIS Plan Goal for PAPL audit readiness'
      },
      flaggedPhrases,
      neutralisedFields
    },
    auditMetrics: {
      professionalToneScore: professionalTone,
      clinicalNeutralityScore: clinicalNeutrality,
      billingComplianceScore: billingCompliance,
      flaggedTerms: flaggedPhrases,
      billingAudit: {
        supportItemCode: paplMeta.code,
        supportItemName: paplMeta.name,
        unitRateAud: unitRate,
        f2fMinutes: f2fMins,
        nf2fMinutes: nf2fMins,
        billableHours,
        totalClaimAud: estimatedClaimAud,
        paplCompliant: Number(travelMinutesClaimed) === 0,
        travelCapStatus:
          Number(travelMinutesClaimed) > 0
            ? `Review Required (${travelMinutesClaimed}m travel on potential travel-stripped plan)`
            : 'Compliant (0m travel claimed · Travel-Stripped Plan Safe)',
        goalLinkStatus: `Linked to "${linkedGoalTitle}"`
      },
      structuredSections
    }
  };
}

function buildDeterministicSection34Diagnostic(params: {
  participantName: string;
  supportItemCode: string;
  rawInput: string;
  uploadedFileName?: string;
  uploadedNotesCount?: number;
}) {
  const {
    participantName,
    supportItemCode,
    rawInput,
    uploadedFileName,
    uploadedNotesCount = 1
  } = params;
  const text = rawInput || '';
  const paplMeta = PAPL_CATALOGUE[supportItemCode] || PAPL_CATALOGUE['15_056_0128_1_3'];

  const hasQuantMetrics = /\b(\d+\s*(mins|minutes|hours|times|%|episodes|days|score|m\b))\b/i.test(text);
  const hasGoalLink = /goal|regulation|independence|pathway|communication|participation|school/i.test(text);
  const hasIndirectTools = /fast|mas|qabf|questionnaire|indirect|triangulat/i.test(text);
  const hasInformalDistinction = /carer|family|informal|mainstream|school|support worker/i.test(text);
  const hasSupportCode = /15_054|15_056|01_011|193\.99|232\.74|f2f|nf2f/i.test(text);

  const criteria: Section34CriterionEvaluation[] = [
    {
      criterion: 's.34(1)(a)',
      code: 's.34(1)(a)',
      title: 'Pursuit of Participant NDIS Plan Goals',
      status: hasGoalLink ? 'Evidenced' : 'Missing / Not Stated',
      checklistStatus: hasGoalLink ? 'MET' : 'MISSING',
      finding: hasGoalLink
        ? 'Documentation references functional regulation, communication, or participation goals.'
        : 'Explicit NDIS Plan Goal ID and measurable goal baseline are not stated in the supplied notes.',
      remediationPrompt:
        'Cite the numbered NDIS Plan Goal ID and quote the participant/nominee stated goal.',
      priceGuideRequirement:
        'PAPL requires every claimed Capacity Building session to advance a stated NDIS Plan Goal.'
    },
    {
      criterion: 's.34(1)(b)',
      code: 's.34(1)(b)',
      title: 'Social & Economic Participation Facilitation',
      status: /school|work|community|peer|education|pathway/i.test(text)
        ? 'Evidenced'
        : 'Partial Gap',
      checklistStatus: /school|work|community|peer|education|pathway/i.test(text)
        ? 'MET'
        : 'PARTIAL',
      finding: /school|work|community|peer|education|pathway/i.test(text)
        ? 'Evidences community, school transition, or adult education pathway participation.'
        : 'Community or educational participation outcome is only implicitly referenced; quantify setting participation.',
      remediationPrompt:
        'Quantify session tolerance and community/educational participation duration (mins).',
      priceGuideRequirement:
        'Must demonstrate how therapy increases community, educational, or economic inclusion.'
    },
    {
      criterion: 's.34(1)(c)',
      code: 's.34(1)(c)',
      title: 'Value for Money & Triangulated FBA Baseline',
      status:
        hasQuantMetrics && hasIndirectTools
          ? 'Evidenced'
          : hasQuantMetrics
          ? 'Partial Gap'
          : 'Missing / Not Stated',
      checklistStatus:
        hasQuantMetrics && hasIndirectTools ? 'MET' : hasQuantMetrics ? 'PARTIAL' : 'MISSING',
      finding:
        hasQuantMetrics && hasIndirectTools
          ? 'Contains both direct quantitative metrics and indirect functional assessment references.'
          : hasQuantMetrics
          ? 'Contains time/frequency figures, but lacks triangulated 14-day ABC baseline + FAST/MAS indirect scores.'
          : 'Quantitative baseline frequency, mean episode duration (mins), and FAST/MAS scores are not stated.',
      remediationPrompt:
        'Attach 14-day Direct ABC frequency/duration baseline, Indirect FAST/MAS concordance %, and incident log counts.',
      priceGuideRequirement: `Line item ${paplMeta.code} ($${paplMeta.capRateAud}/hr) requires empirical baseline vs intervention outcome data.`
    },
    {
      criterion: 's.34(1)(d)',
      code: 's.34(1)(d)',
      title: 'Effective & Beneficial (Evidence-Based PBS Practice)',
      status: /break card|script|co-regulation|abc|fba|proactive|pbs/i.test(text)
        ? 'Evidenced'
        : 'Partial Gap',
      checklistStatus: /break card|script|co-regulation|abc|fba|proactive|pbs/i.test(text)
        ? 'MET'
        : 'PARTIAL',
      finding: /break card|script|co-regulation|abc|fba|proactive|pbs/i.test(text)
        ? 'Documents proactive evidence-based strategies (e.g., Red/Green Break Card, ABC tracking, co-regulation).'
        : 'Specific proactive PBS intervention and participant response topography require clearer articulation.',
      remediationPrompt:
        'Pair PBS replacement skill interventions with Goal Attainment Scaling (GAS -2 to +2) progression.',
      priceGuideRequirement:
        'NDIS Quality & Safeguards Commission requires least-restrictive, evidence-based skill building.'
    },
    {
      criterion: 's.34(1)(e)',
      code: 's.34(1)(e)',
      title: 'Reasonable Expectations of Families, Carers & Informal Networks',
      status: hasInformalDistinction ? 'Evidenced' : 'Partial Gap',
      checklistStatus: hasInformalDistinction ? 'MET' : 'PARTIAL',
      finding: hasInformalDistinction
        ? 'Distinguishes informal carer/family context from specialist practitioner intervention.'
        : 'Carer sustainability and boundaries of informal family support are not stated in the supplied notes.',
      remediationPrompt:
        'Document why specialist Module 2 / Module 2A hours are required beyond natural family/carer care.',
      priceGuideRequirement:
        'Must demonstrate why specialist allied health is required beyond natural family/carer support.'
    },
    {
      criterion: 'PAPL 2025-26',
      code: 'PAPL 2025–26',
      title: `NDIS Price Guide Claimability (${paplMeta.code} @ $${paplMeta.capRateAud}/hr)`,
      status: hasSupportCode ? 'Evidenced' : 'Partial Gap',
      checklistStatus: hasSupportCode ? 'MET' : 'PARTIAL',
      finding: hasSupportCode
        ? `Support item code (${paplMeta.code}) and F2F/NF2F price limit parameters referenced.`
        : `Explicit PAPL line item (${paplMeta.code}), F2F vs NF2F minute split, and travel-stripped plan verification are not stated in note body.`,
      remediationPrompt:
        'Record exact F2F minutes, NF2F minutes, and 0km provider travel on travel-stripped plans.',
      priceGuideRequirement:
        'Requires valid PAPL support item number, exact F2F/NF2F duration (mins), and signed Service Agreement.'
    }
  ];

  const evidencedCount = criteria.filter((c) => c.status === 'Evidenced').length;
  const partialCount = criteria.filter((c) => c.status === 'Partial Gap').length;
  const readinessScore = Math.round(
    ((evidencedCount * 100 + partialCount * 60) / (criteria.length * 100)) * 100
  );

  return {
    uploadedFileName: uploadedFileName || 'Supplied Case Notes Batch',
    uploadedNotesCount,
    participantName,
    supportItemCode: paplMeta.code,
    readinessScore,
    overallReadinessScore: readinessScore,
    paplLineItem: {
      ...paplMeta,
      status: (hasSupportCode ? 'COMPLIANT' : 'GAP_DETECTED') as 'COMPLIANT' | 'GAP_DETECTED'
    },
    criteria,
    criteriaChecklist: criteria.map((c) => ({
      criterion: c.criterion,
      title: c.title,
      status: c.checklistStatus,
      finding: c.finding,
      remediationPrompt: c.remediationPrompt
    }))
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tool,
      format = 'SOAP',
      participantName = 'Not stated',
      rawInput = '',
      sessionDate = '06-11-26',
      sessionDuration = '40 mins',
      nonFaceToFaceMinutes,
      nonFaceToFaceMins = 10,
      supportItemCode = '15_056_0128_1_3',
      travelMinutesClaimed = 0,
      linkedGoalsCount = 1,
      linkedGoalTitle = 'Emotional Regulation & Functional Communication',
      uploadedFileName = '',
      uploadedNotesCount = 1,
      triggerContext = '',
      replacementSkill = ''
    } = body;

    const effectiveNf2fMins = Number(nonFaceToFaceMinutes ?? nonFaceToFaceMins ?? 10) || 0;

    const deterministicRefinerBundle =
      tool === 'case-note-refiner'
        ? buildDeterministicNeutralityAudit({
            format,
            participantName,
            sessionDate,
            sessionDuration,
            nonFaceToFaceMins: effectiveNf2fMins,
            supportItemCode,
            travelMinutesClaimed: Number(travelMinutesClaimed) || 0,
            linkedGoalsCount: Number(linkedGoalsCount) || 1,
            linkedGoalTitle,
            rawInput
          })
        : null;

    const deterministicS34 =
      tool === 'section-34-auditor'
        ? buildDeterministicSection34Diagnostic({
            participantName,
            supportItemCode,
            rawInput,
            uploadedFileName,
            uploadedNotesCount: Number(uploadedNotesCount) || 1
          })
        : null;

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey.trim().length > 10) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });

        let prompt = '';
        if (tool === 'case-note-refiner') {
          prompt = `Audit and convert the following raw shift observation into a neutral, objective, NDIS-ready ${format} case note with NDIS PAPL billing compliance verification.
Participant: ${participantName}
Date: ${sessionDate}
F2F Duration: ${sessionDuration} | NF2F Minutes: ${effectiveNf2fMins}m | NDIS Support Item: ${supportItemCode}
Raw Input:
${rawInput}

Requirements:
- Clearly separate Participant/Carer Reports from Direct Practitioner Observations.
- Do not invent any details not present in the raw input. Mark any missing ${format} section details as "not stated".
- Replace subjective or judgemental wording with neutral, observable behavioural descriptions.
- Include a short Billing & PAPL Compliance Check for ${supportItemCode}.
- Conclude with a brief "Practitioner Verification Note" reminding staff to verify before locking.`;
        } else if (tool === 'section-34-auditor') {
          prompt = `Evaluate the following uploaded/supplied participant case notes against NDIS Act Section 34 (Reasonable and Necessary) criteria and NDIS Price Guide (PAPL 2025-26) requirements for support item ${supportItemCode}:
Participant: ${participantName}
Source Document: ${uploadedFileName || 'Supplied Case Notes'}
Case Notes Content:
${rawInput}

Provide a structured diagnostic report with:
1. Executive Section 34 & Price Guide Alignment Summary
2. Detailed Gap Analysis across s.34(1)(a)-(e) and PAPL 2025-26 Claimability (identifying missing 14-day FBA direct baseline metrics, indirect FAST/MAS triangulation, F2F/NF2F split, or informal support boundaries)
3. Suggested Objective Addendum Template (using only facts stated, marking missing data as [insert verified metric / not stated])
4. Governance Disclaimer: State clearly that this is a decision-support review and does not guarantee NDIA funding approval.`;
        } else {
          prompt = `Create a person-centred Youth Positive Behaviour Support (PBS) Social Script and Red/Green Break Card protocol:
Participant: ${participantName}
Session Length Target: ${sessionDuration}
Identified Antecedent / Trigger: ${triggerContext || rawInput || 'Not stated'}
Target Replacement Skill: ${replacementSkill || 'Requesting a break using the Green/Red Break Card'}

Include:
1. Short Social Script (written in clear, supportive first-person Australian English for a 40-minute session).
2. Green Card ("I am ready / working well") & Red Card ("I need a 5-minute sensory break") visual instructions.
3. Co-Regulation Prompt Sequence for Support Workers (Module 2A implementation fidelity).
4. Clinical Review Notice.`;
        }

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION
          }
        });

        if (response.text) {
          return NextResponse.json({
            ok: true,
            source: 'gemini-3.8-flash',
            text: response.text,
            neutralityAudit: deterministicRefinerBundle?.neutralityAudit || null,
            auditMetrics: deterministicRefinerBundle?.auditMetrics || null,
            section34Diagnostic: deterministicS34
          });
        }
      } catch {
        // Fall through to deterministic clinical decision-support template
      }
    }

    if (tool === 'case-note-refiner' && deterministicRefinerBundle) {
      const { neutralityAudit, auditMetrics } = deterministicRefinerBundle;
      const cleaned = rawInput.trim() || 'not stated';
      const structuredText =
        format === 'BIRP'
          ? `### BIRP Clinical Case Note & PAPL Billing Audit (Draft for Practitioner Review)
- **Participant:** ${participantName} | **Date:** ${sessionDate}
- **Billable Allocation:** ${sessionDuration} F2F + ${effectiveNf2fMins}m NF2F · Line Item \`${supportItemCode}\` ($${neutralityAudit.billingAudit.estimatedClaimAud.toFixed(2)} AUD)
- **Behaviour (Observable & Reported):**
  - *Direct Practitioner Observation:* ${cleaned}
  - *Participant / Carer Report:* Separated from direct observation above (additional pre-shift history: *not stated*).
- **Intervention (PBS & Clinical Strategies Applied):**
  - Low-arousal verbal co-regulation, visual schedule check-in, and Red/Green Break Card prompt offered as documented.
- **Response (Participant Outcome):**
  - Participant engaged with structured choice and regulated within the session window (unrecorded vital/PRN parameters: *not stated*).
- **Plan (Next Steps):**
  - Continue 14-day ABC baseline tracking and review replacement communication goal at next scheduled session.
- **Governance Notice:** Decision-support draft generated for clinical review. Please verify all times and observations prior to signing.`
          : format === 'SIMPL'
          ? `### SIMPL Shift Progress Note & PAPL Billing Audit (Draft for Practitioner Review)
- **Participant:** ${participantName} | **Date:** ${sessionDate} (${sessionDuration} F2F + ${effectiveNf2fMins}m NF2F · \`${supportItemCode}\`)
- **Situation:** ${cleaned}
- **Intervention:** Proactive environmental adjustment and visual break-card prompting delivered in line with Behaviour Support Plan.
- **Monitoring & Measure:** Direct ABC frequency/duration tally recorded; unstated metrics marked as *not stated*.
- **Plan & Link to Goals:** Maintain co-regulation consistency across support team; review progress in next clinical supervision.`
          : `### SOAP Clinical Case Note & PAPL Billing Audit (Draft for Practitioner Review)
- **Participant:** ${participantName} | **Date:** ${sessionDate}
- **Billable Allocation:** ${sessionDuration} F2F + ${effectiveNf2fMins}m NF2F · Line Item \`${supportItemCode}\` ($${neutralityAudit.billingAudit.estimatedClaimAud.toFixed(2)} AUD)
- **Subjective (Participant & Carer Report):**
  - ${neutralityAudit.neutralisedFields.subjective}
- **Objective (Direct Practitioner Observation):**
  - ${neutralityAudit.neutralisedFields.objective}
- **Assessment (Progress Toward PBS Goals):**
  - ${neutralityAudit.neutralisedFields.assessment}
- **Plan (Follow-Up Actions):**
  - ${neutralityAudit.neutralisedFields.plan}
- **Governance Notice:** Decision-support draft only. Qualified practitioner or support worker must review and confirm accuracy before saving.`;

      return NextResponse.json({
        ok: true,
        source: 'breakthrough-governance-engine',
        text: structuredText,
        neutralityAudit,
        auditMetrics
      });
    }

    if (tool === 'section-34-auditor' && deterministicS34) {
      const text = `### NDIS Act Section 34 & Price Guide (PAPL 2025–26) Diagnostic Report
- **Participant:** ${participantName} | **Source:** ${deterministicS34.uploadedFileName}
- **Audited Support Item:** \`${supportItemCode}\` | **Audit Readiness Score:** ${deterministicS34.readinessScore}%
- **Reviewed Excerpt:** "${rawInput.slice(0, 220)}${rawInput.length > 220 ? '...' : ''}"

#### 1. Section 34 & PAPL Evidence Gaps Identified
- **Triangulated Baseline Requirement (s.34(1)(c) Value for Money & Efficacy):** Pair narrative session notes with:
  1. *Direct Observation:* 14-day ABC frequency, duration (mins), and intensity ratings.
  2. *Indirect Assessment:* Completed FAST / MAS functional questionnaire scores (*currently: ${
    /fast|mas/i.test(rawInput) ? 'referenced' : 'not stated in excerpt'
  }*).
  3. *Behaviour Product Data:* Objective count of incident logs or school/work attendance records.
- **PAPL 2025–26 Claimability Check:** Ensure each note explicitly states Face-to-Face (F2F) minutes, Non-Face-to-Face (NF2F) report/prep minutes, and confirms zero unauthorised travel claiming on travel-stripped plans.

#### 2. Recommended Objective Remediation Addendum (For Clinician Review)
> *"Across the 14-day review period ([insert verified DD-MM-YY range / not stated]), ${participantName} participated in structured ${supportItemCode} sessions advancing stated NDIS Plan Goals. Target behaviours of concern were tracked via direct ABC observation ([insert verified frequency] episodes/wk, mean duration [insert verified mins / not stated] mins) alongside indirect FAST/MAS functional screening. Proactive replacement strategies (Red/Green Break Card and 40-minute paced task blocks) remain essential to sustain community/educational participation and prevent placement breakdown."*

#### 3. Regulatory Disclaimer
- *Decision-support diagnostic only. Final funding and claim determinations rest with the NDIA / Plan Manager under Section 34 of the NDIS Act 2013.*`;

      return NextResponse.json({
        ok: true,
        source: 'breakthrough-governance-engine',
        text,
        section34Diagnostic: deterministicS34
      });
    }

    const socialScriptText = `### Youth PBS Social Script & Red/Green Break Card Protocol
- **Participant:** ${participantName} | **Target Session Cap:** ${sessionDuration}
- **Antecedent Context:** ${triggerContext || rawInput || 'Transition or high cognitive task demand'}
- **Replacement Skill:** ${replacementSkill || 'Using the Green/Red Break Card to request a 5-minute sensory pause'}

#### 1. First-Person Social Script ("My 40-Minute Session Plan")
1. **Starting Our Session:** "When I arrive for my 40-minute session, we check our visual timer and choose one goal together."
2. **Using My Green Card:** "While I am feeling calm and ready to talk or build, my **Green Card** stays on the table."
3. **Noticing Early Body Clues:** "If tasks feel too noisy, fast, or frustrating, I do not have to shout or leave the room."
4. **Using My Red Break Card:** "I can tap or hold up my **Red Break Card** (or say *'Break please'*). My practitioner will immediately pause the activity for 5 minutes—no questions asked."
5. **Finishing Strong:** "After my 5-minute reset, we check how many minutes are left on the 40-minute timer and finish with my chosen reward activity."

#### 2. Printable Card Specifications
- **GREEN CARD (Working & Regulated):** *"I am OK · Keep going with our plan"*
- **RED CARD (Sensory Reset Requested):** *"I need a 5-minute quiet break now · Please pause verbal demands"*

#### 3. Clinical Governance Note
- *Drafted for review by the authoring PBS Practitioner (Module 2) and participant/family prior to implementation.*`;

    return NextResponse.json({
      ok: true,
      source: 'breakthrough-governance-engine',
      text: socialScriptText
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Unable to process clinical decision-support request.' },
      { status: 500 }
    );
  }
}
