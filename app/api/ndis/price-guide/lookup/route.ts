import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { OFFICIAL_2026_NDIS_PRICE_GUIDE } from '@/lib/seedData';
import { BREAKTHROUGH_ASSISTANT_SYSTEM_INSTRUCTION } from '@/services/chatService';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('q') || '').trim().toLowerCase();
  const category = (searchParams.get('category') || 'ALL').trim();
  const mmmZone = (searchParams.get('mmm') || 'NATIONAL').toUpperCase();

  const filtered = OFFICIAL_2026_NDIS_PRICE_GUIDE.filter((item) => {
    const matchesCategory =
      category === 'ALL' ||
      item.category.toLowerCase().includes(category.toLowerCase()) ||
      (item.registrationGroup || '').toLowerCase().includes(category.toLowerCase());

    const matchesQuery =
      !query ||
      item.code.toLowerCase().includes(query) ||
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      (item.registrationGroup || '').toLowerCase().includes(query) ||
      (item.registrationGroupNumber || '').toLowerCase().includes(query) ||
      (item.description || '').toLowerCase().includes(query);

    return matchesCategory && matchesQuery;
  }).map((item) => {
    const activeRate =
      mmmZone === 'VERY_REMOTE'
        ? item.veryRemotePricePerUnit ?? Number((item.pricePerUnit * 1.5).toFixed(2))
        : mmmZone === 'REMOTE'
        ? item.remotePricePerUnit ?? Number((item.pricePerUnit * 1.4).toFixed(2))
        : item.pricePerUnit;

    return {
      ...item,
      activeRate,
      mmmZone
    };
  });

  return NextResponse.json({
    success: true,
    catalogueVersion: 'NDIA Pricing Arrangements and Price Limits 2025–26',
    effectiveDate: '2025-07-01',
    currency: 'AUD',
    mmmZone,
    totalCount: filtered.length,
    items: filtered
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = (body.query || '').trim();
    const participantContext = body.participantContext || null;

    if (!query) {
      return NextResponse.json(
        { error: 'Please provide a support item code, support category, or clinical service description to look up.' },
        { status: 400 }
      );
    }

    // Match local catalogue items first for deterministic baseline reference
    const qLower = query.toLowerCase();
    const matchedLocalItems = OFFICIAL_2026_NDIS_PRICE_GUIDE.filter(
      (item) =>
        item.code.toLowerCase().includes(qLower) ||
        item.name.toLowerCase().includes(qLower) ||
        item.category.toLowerCase().includes(qLower) ||
        (item.registrationGroup || '').toLowerCase().includes(qLower) ||
        (item.description || '').toLowerCase().includes(qLower)
    ).slice(0, 8);

    const prompt = `You are assisting an NDIS staff member using the Breakthrough NDIS Price Guide Search & Lookup Tool.

Staff Query: "${query}"

${
  participantContext
    ? `Selected Participant Context (from supplied app state):
- Name: ${participantContext.name || 'Not stated'}
- NDIS Number: ${participantContext.ndisNumber || 'Not stated'}
- Plan Management Type: ${participantContext.planManagementType || 'Not stated'}
- Total Plan Budget: $${Number(participantContext.totalBudget || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })} AUD
- Allocated Budget: $${Number(participantContext.allocatedBudget || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })} AUD
- Spent Budget: $${Number(participantContext.spentBudget || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })} AUD`
    : 'No specific participant selected.'
}

Matched Local Catalogue Reference Items (Effective Date: 2025-07-01, AUD):
${JSON.stringify(matchedLocalItems, null, 2)}

Task:
1. Identify the most relevant NDIS Support Item code(s), support category, registration group, unit of measure, and price limits (National Non-Remote, Remote, Very Remote in AUD) for the query.
2. State the effective date of the pricing source used and outline key claiming rules (Provider Travel, Non-Face-to-Face support, NDIA Requested Reports, and Short Notice Cancellations).
3. Explain what must be verified before including this item in a Service Agreement or submitting a claim (participant's active NDIS plan categories, signed Service Agreement Schedule of Supports, service delivery evidence, and current NDIA Pricing Arrangements and Price Limits).
4. Do not promise that a support is funded, claimable, or approved. Keep your response concise, practical, and in clear Australian English.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: BREAKTHROUGH_ASSISTANT_SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        temperature: 0.2
      }
    });

    const groundingChunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const citations = groundingChunks
      .map((chunk: any) => ({
        title: chunk.web?.title || 'NDIA Official Reference',
        uri: chunk.web?.uri || ''
      }))
      .filter((c: { title: string; uri: string }) => Boolean(c.uri));

    return NextResponse.json({
      success: true,
      query,
      analysis: response.text || 'No grounded analysis returned.',
      matchedLocalItems,
      citations,
      effectiveDate: '2025-07-01',
      currency: 'AUD'
    });
  } catch (error: any) {
    console.error('[NDIS Price Guide Lookup Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unable to complete live NDIS Price Guide lookup.'
      },
      { status: 500 }
    );
  }
}
