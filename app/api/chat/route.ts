import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import {
  processChatTurn,
  clearSession,
  BREAKTHROUGH_ASSISTANT_SYSTEM_INSTRUCTION,
  AssistantTurnContext
} from '@/services/chatService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CASE_NOTE_EDIT_SYSTEM_INSTRUCTION = `${BREAKTHROUGH_ASSISTANT_SYSTEM_INSTRUCTION}

CASE NOTE EDITING MANDATE:
- Preserve the author's meaning and all material facts.
- Improve clarity, grammar, organisation, and neutral professional tone without adding events, observations, quotes, interventions, responses, progress, risk findings, diagnoses, or outcomes.
- Keep participant/carer reports distinct from practitioner observations and clinical interpretation.
- Use respectful, person-centred, non-stigmatising language and the participant's stated preferences.
- Use the requested format (SOAP, BIRP, or SIMPL) and return ONLY valid JSON matching the requested schema keys ("subjective", "objective", "assessment", "plan").
- Mark any missing or empty section as "Not stated" — never fill gaps with generic clinical language.
- Do not add NDIS funding justification or Section 34 language unless explicitly requested and supported by the supplied facts.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      prompt,
      systemInstruction,
      mode,
      action,
      sessionId = 'default-session',
      context,
      rawFields
    } = body as {
      message?: string;
      prompt?: string;
      systemInstruction?: string;
      mode?: string;
      action?: string;
      sessionId?: string;
      context?: AssistantTurnContext;
      rawFields?: {
        subjective?: string;
        objective?: string;
        assessment?: string;
        plan?: string;
        format?: 'SOAP' | 'BIRP' | 'SIMPL';
        includeSection34?: boolean;
      };
    };

    if (action === 'clear') {
      clearSession(sessionId);
      return NextResponse.json({ success: true, cleared: true });
    }

    // Direct structured clinical prompt (e.g. Case Note AI Clinical Polish or Section 34 Report Drafting)
    if (prompt && typeof prompt === 'string') {
      const apiKey = process.env.GEMINI_API_KEY;
      const isJsonNotePolish =
        mode === 'polish-note' ||
        prompt.includes('"subjective"') ||
        prompt.includes('Return ONLY valid JSON');

      if (apiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build'
              }
            }
          });

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              systemInstruction: isJsonNotePolish
                ? CASE_NOTE_EDIT_SYSTEM_INSTRUCTION
                : systemInstruction || BREAKTHROUGH_ASSISTANT_SYSTEM_INSTRUCTION,
              ...(isJsonNotePolish
                ? {
                    responseMimeType: 'application/json',
                    responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                        subjective: {
                          type: Type.STRING,
                          description:
                            'Edited Field 1 (Subjective / Behaviour / Situation). Preserve author facts; use "Not stated" if empty.'
                        },
                        objective: {
                          type: Type.STRING,
                          description:
                            'Edited Field 2 (Objective / Intervention). Preserve author facts; use "Not stated" if empty.'
                        },
                        assessment: {
                          type: Type.STRING,
                          description:
                            'Edited Field 3 (Assessment / Response / Monitoring). Preserve author facts; use "Not stated" if empty.'
                        },
                        plan: {
                          type: Type.STRING,
                          description:
                            'Edited Field 4 (Plan). Preserve author facts; use "Not stated" if empty.'
                        }
                      },
                      required: ['subjective', 'objective', 'assessment', 'plan']
                    }
                  }
                : {})
            }
          });

          const text = response.text || '';
          return NextResponse.json({ text, reply: text });
        } catch (aiErr: any) {
          console.warn('Gemini clinical generation fallback triggered:', aiErr?.message || aiErr);
        }
      }

      // Non-fabricating fallback for case note editing: preserve supplied fields and mark missing fields as "Not stated"
      if (isJsonNotePolish) {
        const cleanField = (val?: string) => {
          const trimmed = (val || '').trim();
          return trimmed.length > 0 ? trimmed : 'Not stated';
        };
        const fallbackJson = JSON.stringify({
          subjective: cleanField(rawFields?.subjective),
          objective: cleanField(rawFields?.objective),
          assessment: cleanField(rawFields?.assessment),
          plan: cleanField(rawFields?.plan)
        });
        return NextResponse.json({ text: fallbackJson, reply: fallbackJson });
      }

      const reply = await processChatTurn(sessionId, prompt, context);
      return NextResponse.json({ text: reply, reply });
    }

    const inputMessage = message || prompt;
    if (!inputMessage || typeof inputMessage !== 'string') {
      return NextResponse.json({ error: 'Message or prompt is required' }, { status: 400 });
    }

    const reply = await processChatTurn(sessionId, inputMessage, context);
    return NextResponse.json({ reply, text: reply });
  } catch (error: any) {
    console.error('Error in /api/chat route:', error);
    return NextResponse.json(
      { error: 'Failed to process Breakthrough Assistant request', details: error?.message },
      { status: 500 }
    );
  }
}
