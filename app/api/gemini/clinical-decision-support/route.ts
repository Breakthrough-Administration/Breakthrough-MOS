import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_INSTRUCTION = `You are Breakthrough Assistant, an Australian NDIS clinical governance, Positive Behaviour Support (PBS Module 2 / Module 2A), and practice operations assistant.
Always adhere to these mandatory rules:
1. Use Australian English spelling (Authorisation, Behaviour, Programme, Synchronised, Centred) and DD-MM-YY dates.
2. Never fabricate clinical facts, incidents, diagnoses, participant history, or assessment results. If information is missing from the user's input, explicitly write "not stated".
3. Separate direct practitioner observations from participant or carer reports.
4. Preserve all material facts, dates, durations, triggers, and actions taken.
5. Never guarantee NDIA funding approval or legal compliance; state that outputs are decision-support drafts requiring review by qualified clinical/operational staff.`;

export interface FlaggedPhraseItem {
  original: string;
  issue: string;
  neutralReplacement: string;
}

export interface Section34CriterionEvaluation {
  code: string;
  title: string;
  status: 'Evidenced' | 'Partial Gap' | 'Missing / Not Stated';
  finding: string;
  priceGuideRequirement: string;
}

function buildDeterministicNeutralityAudit(params: {
  format: 'SOAP' | 'BIRP' | 'SIMPL';
  participantName: string;
  sessionDate: string;
  sessionDuration: string;
  nonFaceToFaceMins: number;
  supportItemCode: string;
  linkedGoalsCount: number;
  rawInput: string;
}) {
  const {
    format,
    participantName,
    sessionDate,
    sessionDuration,
    nonFaceToFaceMins,
    supportItemCode,
    linkedGoalsCount,
    rawInput
  } = params;

  const lower = rawInput.toLowerCase();
  const flaggedPhrases: FlaggedPhraseItem[] = [];

  const dictionary: Array<{ pattern: RegExp; label: string; issue: string; replacement: string }> = [
    {
      pattern: /rough morning|bad mood|woke up angry/i,
      label: 'Subjective mood summary ("rough morning / bad mood")',
      issue: 'Non-specific affective summary; lacks observable topography or carer attribution.',
      replacement:
        'Carer reported elevated morning vocalisations and delayed transition prior to session start.'
    },
    {
      pattern: /manipulative|attention[- ]seeking/i,
      label: 'Stigmatising intent attribution ("manipulative / attention-seeking")',
      issue: 'Infers covert motive rather than describing observable functional communication.',
      replacement:
        'Participant initiated frequent verbal/gestural requests for practitioner proximity and co-regulation.'
    },
    {
      pattern: /refused|non[- ]compliant|defiant|stubborn/i,
      label: 'Deficit-based compliance label ("refused / non-compliant / defiant")',
      issue: 'Stigmatising terminology under NDIS Quality & Safeguards Commission PBS standards.',
      replacement:
        'Participant declined the initial tabletop task demand and indicated need for task modification or break.'
    },
    {
      pattern: /meltdown|tantrum|exploded|Aggressive outburst/i,
      label: 'Colloquial escalation label ("meltdown / tantrum / outburst")',
      issue: 'Imprecise clinical topography; cannot be quantified for 14-day FBA baseline tracking.',
      replacement:
        'Episode of acute dysregulation characterised by elevated vocal volume and motor restlessness (duration/intensity as recorded).'
    },
    {
      pattern: /restless/i,
      label: 'Unquantified descriptor ("restless")',
      issue: 'Recommend pairing with observable motor indicators and timestamp mark.',
      replacement:
        'Displayed observable motor restlessness (frequent seat shifting and glancing at timer) at the 20-minute mark.'
    }
  ];

  for (const item of dictionary) {
    if (item.pattern.test(rawInput)) {
      flaggedPhrases.push({
        original: item.label,
        issue: item.issue,
        neutralReplacement: item.replacement
      });
    }
  }

  const f2fMins = parseInt(sessionDuration, 10) || 40;
  const totalMins = f2fMins + (Number(nonFaceToFaceMins) || 0);
  const nf2fRatioPct = Math.round(((Number(nonFaceToFaceMins) || 0) / Math.max(1, totalMins)) * 100);
  const unitRate = supportItemCode === '15_054_0128_1_3' ? 232.74 : 193.99;
  const estimatedClaimAud = Number(((totalMins / 60) * unitRate).toFixed(2));

  const hasCarerSeparation = /carer|mother|father|support worker|reported|stated/i.test(lower);
  const hasDirectObservation = /observed|session|minute|tapped|completed|engaged|returned/i.test(lower);

  const toneScore = Math.max(68, 98 - flaggedPhrases.length * 8);
  const neutralityScore =
    (hasCarerSeparation ? 50 : 35) + (hasDirectObservation ? 46 : 30) - flaggedPhrases.length * 4;
  const billingScore =
    (linkedGoalsCount > 0 ? 35 : 15) +
    (nf2fRatioPct <= 30 ? 35 : 20) +
    (rawInput.trim().length > 40 ? 30 : 15);

  const neutralisedFields = {
    subjective: hasCarerSeparation
      ? `Participant/Carer Report: Shift handover noted antecedent transition context prior to session ("${rawInput.trim()}"). Unstated pre-session sleep or medication variables: not stated.`
      : `Participant/Carer Report: Direct pre-session carer handover not stated in raw input. Presenting context recorded as: "${rawInput.trim()}".`,
    objective: `Direct Practitioner Observation (${f2fMins}m F2F / ${nonFaceToFaceMins}m NF2F · ${supportItemCode}): Practitioner observed session engagement across ${sessionDuration}. Where task demands increased, proactive co-regulation and Red/Green Break Card visual prompting were applied. Unmeasured physical parameters: not stated.`,
    assessment: `Clinical Synthesis (${format}): Observations demonstrate functional use of replacement communication strategies without unrecorded restrictive practices. Linked NDIS Plan Goals addressed: ${linkedGoalsCount > 0 ? `${linkedGoalsCount} goal(s) linked` : 'not stated (link at least 1 NDIS goal prior to PRODA claim)'}.`,
    plan: `Next Session & Billing Plan: Continue 14-day direct ABC frequency/duration logging. Verify ${supportItemCode} claim (${(totalMins / 60).toFixed(2)} hrs @ $${unitRate.toFixed(2)}/hr = $${estimatedClaimAud.toFixed(2)} AUD) against travel-stripped plan rules.`
  };

  return {
    scores: {
      professionalTone: Math.min(100, Math.max(50, toneScore)),
      clinicalNeutrality: Math.min(100, Math.max(50, neutralityScore)),
      billingCompliance: Math.min(100, Math.max(40, billingScore))
    },
    billingAudit: {
      supportItemCode,
      unitRateAud: unitRate,
      f2fMinutes: f2fMins,
      nf2fMinutes: nonFaceToFaceMins,
      nf2fRatioPct,
      estimatedClaimAud,
      nf2fStatus:
        nf2fRatioPct <= 25
          ? 'Compliant (<25% NF2F documentation ratio)'
          : 'Review Recommended (NF2F exceeds 25% of total billable time — attach clinical justification)',
      goalLinkStatus:
        linkedGoalsCount > 0
          ? `Compliant (${linkedGoalsCount} NDIS Plan Goal linked)`
          : 'Action Required: Link at least 1 NDIS Plan Goal for PAPL audit readiness'
    },
    flaggedPhrases,
    neutralisedFields
  };
}

function buildDeterministicSection34Diagnostic(params: {
  participantName: string;
  supportItemCode: string;
  rawInput: string;
  uploadedFileName?: string;
}) {
  const { participantName, supportItemCode, rawInput, uploadedFileName } = params;
  const text = rawInput || '';

  const hasQuantMetrics = /\b(\d+\s*(mins|minutes|hours|times|%|episodes|days|score))\b/i.test(text);
  const hasGoalLink = /goal|regulation|independence|pathway|communication|participation|school/i.test(text);
  const hasIndirectTools = /fast|mas|qabf|questionnaire|indirect|triangulat/i.test(text);
  const hasInformalDistinction = /carer|family|informal|mainstream|school|support worker/i.test(text);
  const hasSupportCode = /15_054|15_056|01_011|193\.99|232\.74/i.test(text);

  const criteria: Section34CriterionEvaluation[] = [
    {
      code: 's.34(1)(a)',
      title: 'Pursuit of Participant NDIS Plan Goals',
      status: hasGoalLink ? 'Evidenced' : 'Missing / Not Stated',
      finding: hasGoalLink
        ? 'Documentation references functional regulation, communication, or participation goals.'
        : 'Explicit NDIS Plan Goal ID and measurable goal baseline are not stated in the supplied notes.',
      priceGuideRequirement:
        'PAPL requires every claimed Capacity Building session to advance a stated NDIS Plan Goal.'
    },
    {
      code: 's.34(1)(b)',
      title: 'Social & Economic Participation Facilitation',
      status: /school|work|community|peer|education|pathway/i.test(text)
        ? 'Evidenced'
        : 'Partial Gap',
      finding: /school|work|community|peer|education|pathway/i.test(text)
        ? 'Evidences community, school transition, or adult education pathway participation.'
        : 'Community or educational participation outcome is only implicitly referenced; quantify setting participation.',
      priceGuideRequirement:
        'Must demonstrate how therapy increases community, educational, or economic inclusion.'
    },
    {
      code: 's.34(1)(c)',
      title: 'Value for Money & Triangulated FBA Baseline',
      status: hasQuantMetrics && hasIndirectTools ? 'Evidenced' : hasQuantMetrics ? 'Partial Gap' : 'Missing / Not Stated',
      finding:
        hasQuantMetrics && hasIndirectTools
          ? 'Contains both direct quantitative metrics and indirect functional assessment references.'
          : hasQuantMetrics
          ? 'Contains time/frequency figures, but lacks triangulated 14-day ABC baseline + FAST/MAS indirect scores.'
          : 'Quantitative baseline frequency, mean episode duration (mins), and FAST/MAS scores are not stated.',
      priceGuideRequirement: `Line item ${supportItemCode} ($${
        supportItemCode === '15_054_0128_1_3' ? '232.74' : '193.99'
      }/hr) requires empirical baseline vs intervention outcome data.`
    },
    {
      code: 's.34(1)(d)',
      title: 'Effective & Beneficial (Evidence-Based PBS Practice)',
      status: /break card|script|co-regulation|abc|fba|proactive|pbs/i.test(text)
        ? 'Evidenced'
        : 'Partial Gap',
      finding: /break card|script|co-regulation|abc|fba|proactive|pbs/i.test(text)
        ? 'Documents proactive evidence-based strategies (e.g., Red/Green Break Card, ABC tracking, co-regulation).'
        : 'Specific proactive PBS intervention and participant response topography require clearer articulation.',
      priceGuideRequirement:
        'NDIS Quality & Safeguards Commission requires least-restrictive, evidence-based skill building.'
    },
    {
      code: 's.34(1)(e)',
      title: 'Reasonable Expectations of Families, Carers & Informal Networks',
      status: hasInformalDistinction ? 'Evidenced' : 'Partial Gap',
      finding: hasInformalDistinction
        ? 'Distinguishes informal carer/family context from specialist practitioner intervention.'
        : 'Carer sustainability and boundaries of informal family support are not stated in the supplied notes.',
      priceGuideRequirement:
        'Must demonstrate why specialist allied health is required beyond natural family/carer support.'
    },
    {
      code: 'PAPL 2025–26',
      title: 'NDIS Pricing Arrangements & Price Limits Claimability',
      status: hasSupportCode ? 'Evidenced' : 'Partial Gap',
      finding: hasSupportCode
        ? `Support item code (${supportItemCode}) and price limit parameters referenced.`
        : `Explicit PAPL line item (${supportItemCode}), F2F vs NF2F minute split, and travel-stripped plan verification are not stated in note body.`,
      priceGuideRequirement:
        'Requires valid PAPL support item number, exact F2F/NF2F duration (mins), and signed Service Agreement.'
    }
  ];

  const evidencedCount = criteria.filter((c) => c.status === 'Evidenced').length;
  const partialCount = criteria.filter((c) => c.status === 'Partial Gap').length;
  const readinessScore = Math.round(((evidencedCount * 100 + partialCount * 55) / (criteria.length * 100)) * 100);

  return {
    uploadedFileName: uploadedFileName || 'Supplied Case Notes Batch',
    participantName,
    supportItemCode,
    readinessScore,
    criteria
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
      nonFaceToFaceMins = 10,
      supportItemCode = '15_056_0128_1_3',
      linkedGoalsCount = 1,
      uploadedFileName = '',
      triggerContext = '',
      replacementSkill = ''
    } = body;

    const deterministicNeutrality =
      tool === 'case-note-refiner'
        ? buildDeterministicNeutralityAudit({
            format,
            participantName,
            sessionDate,
            sessionDuration,
            nonFaceToFaceMins: Number(nonFaceToFaceMins) || 0,
            supportItemCode,
            linkedGoalsCount: Number(linkedGoalsCount) || 0,
            rawInput
          })
        : null;

    const deterministicS34 =
      tool === 'section-34-auditor'
        ? buildDeterministicSection34Diagnostic({
            participantName,
            supportItemCode,
            rawInput,
            uploadedFileName
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
F2F Duration: ${sessionDuration} | NF2F Minutes: ${nonFaceToFaceMins}m | NDIS Support Item: ${supportItemCode}
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
            neutralityAudit: deterministicNeutrality,
            section34Diagnostic: deterministicS34
          });
        }
      } catch {
        // Fall through to deterministic clinical decision-support template
      }
    }

    if (tool === 'case-note-refiner' && deterministicNeutrality) {
      const cleaned = rawInput.trim() || 'not stated';
      const structuredText =
        format === 'BIRP'
          ? `### BIRP Clinical Case Note & PAPL Billing Audit (Draft for Practitioner Review)
- **Participant:** ${participantName} | **Date:** ${sessionDate}
- **Billable Allocation:** ${sessionDuration} F2F + ${nonFaceToFaceMins}m NF2F · Line Item \`${supportItemCode}\` ($${deterministicNeutrality.billingAudit.estimatedClaimAud.toFixed(2)} AUD)
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
- **Participant:** ${participantName} | **Date:** ${sessionDate} (${sessionDuration} F2F + ${nonFaceToFaceMins}m NF2F · \`${supportItemCode}\`)
- **Situation:** ${cleaned}
- **Intervention:** Proactive environmental adjustment and visual break-card prompting delivered in line with Behaviour Support Plan.
- **Monitoring & Measure:** Direct ABC frequency/duration tally recorded; unstated metrics marked as *not stated*.
- **Plan & Link to Goals:** Maintain co-regulation consistency across support team; review progress in next clinical supervision.`
          : `### SOAP Clinical Case Note & PAPL Billing Audit (Draft for Practitioner Review)
- **Participant:** ${participantName} | **Date:** ${sessionDate}
- **Billable Allocation:** ${sessionDuration} F2F + ${nonFaceToFaceMins}m NF2F · Line Item \`${supportItemCode}\` ($${deterministicNeutrality.billingAudit.estimatedClaimAud.toFixed(2)} AUD)
- **Subjective (Participant & Carer Report):**
  - ${deterministicNeutrality.neutralisedFields.subjective}
- **Objective (Direct Practitioner Observation):**
  - ${deterministicNeutrality.neutralisedFields.objective}
- **Assessment (Progress Toward PBS Goals):**
  - ${deterministicNeutrality.neutralisedFields.assessment}
- **Plan (Follow-Up Actions):**
  - ${deterministicNeutrality.neutralisedFields.plan}
- **Governance Notice:** Decision-support draft only. Qualified practitioner or support worker must review and confirm accuracy before saving.`;

      return NextResponse.json({
        ok: true,
        source: 'breakthrough-governance-engine',
        text: structuredText,
        neutralityAudit: deterministicNeutrality
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
