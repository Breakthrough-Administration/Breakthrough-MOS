import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_COLLECTIONS = new Set([
  'clients',
  'caseNotes',
  'billingClaims',
  'incidents',
  'restrictivePractices',
  'abcLogs',
  'bspDocuments',
  'leads',
  'crmLeads',
  'crmTasks',
  'practitioners',
  'companyDocuments',
  'supportItems',
  'auditLogs',
  'scheduledShifts',
  'users',
  'notifications',
  'documents',
  'syncLogs',
  'pickerSearchInsights',
  'quickNotes',
  'participant_feedback',
  'system',
  'test',
]);

function sanitizeAdminPayload(data: any): any {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) {
    return data.filter((v) => v !== undefined).map((v) => sanitizeAdminPayload(v));
  }
  if (typeof data === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        out[k] = sanitizeAdminPayload(v);
      }
    }
    return out;
  }
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      operation,
      collectionName,
      id,
      docId,
      data,
      items,
      ids,
      docIds,
    }: {
      operation: 'set' | 'update' | 'delete' | 'batchSet' | 'batchDelete' | 'getDoc' | 'getCollection';
      collectionName: string;
      id?: string;
      docId?: string;
      data?: Record<string, any>;
      items?: Array<Record<string, any>>;
      ids?: string[];
      docIds?: string[];
    } = body;

    const resolvedDocId = docId || id || data?.id;
    const resolvedDocIds = Array.isArray(docIds) ? docIds : Array.isArray(ids) ? ids : [];

    if (!collectionName || !ALLOWED_COLLECTIONS.has(collectionName)) {
      return NextResponse.json(
        { success: false, error: `Invalid or disallowed collection: ${collectionName}` },
        { status: 400 }
      );
    }

    const colRef = adminDb.collection(collectionName);

    if (operation === 'set') {
      const targetId = resolvedDocId || `doc-${Date.now()}`;
      const cleanData = sanitizeAdminPayload({ ...data, id: targetId });
      await colRef.doc(targetId).set(cleanData, { merge: true });
      return NextResponse.json({ success: true, id: targetId });
    }

    if (operation === 'update') {
      if (!resolvedDocId) {
        return NextResponse.json({ success: false, error: 'Missing docId for update' }, { status: 400 });
      }
      const cleanUpdates = sanitizeAdminPayload(data || {});
      await colRef.doc(resolvedDocId).set(cleanUpdates, { merge: true });
      return NextResponse.json({ success: true, id: resolvedDocId });
    }

    if (operation === 'delete') {
      if (!resolvedDocId) {
        return NextResponse.json({ success: false, error: 'Missing docId for delete' }, { status: 400 });
      }
      await colRef.doc(resolvedDocId).delete();
      return NextResponse.json({ success: true, id: resolvedDocId });
    }

    if (operation === 'batchSet') {
      const batchItems = Array.isArray(items) ? items : [];
      const chunkSize = 400;
      let writtenCount = 0;

      for (let i = 0; i < batchItems.length; i += chunkSize) {
        const chunk = batchItems.slice(i, i + chunkSize);
        const batch = adminDb.batch();
        for (const item of chunk) {
          const itemId = item.id || `${collectionName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const docRef = colRef.doc(itemId);
          batch.set(docRef, sanitizeAdminPayload({ ...item, id: itemId }), { merge: true });
          writtenCount++;
        }
        await batch.commit();
      }

      return NextResponse.json({ success: true, count: writtenCount });
    }

    if (operation === 'batchDelete') {
      const idsToDelete = resolvedDocIds;
      const chunkSize = 400;
      let deletedCount = 0;

      for (let i = 0; i < idsToDelete.length; i += chunkSize) {
        const chunk = idsToDelete.slice(i, i + chunkSize);
        const batch = adminDb.batch();
        for (const targetId of chunk) {
          if (targetId) {
            batch.delete(colRef.doc(targetId));
            deletedCount++;
          }
        }
        await batch.commit();
      }

      return NextResponse.json({ success: true, count: deletedCount });
    }

    if (operation === 'getDoc') {
      if (!resolvedDocId) {
        return NextResponse.json({ success: false, error: 'Missing docId for getDoc' }, { status: 400 });
      }
      const snap = await colRef.doc(resolvedDocId).get();
      if (!snap.exists) {
        return NextResponse.json({ success: true, exists: false, item: null });
      }
      return NextResponse.json({
        success: true,
        exists: true,
        item: { ...snap.data(), id: snap.id },
      });
    }

    if (operation === 'getCollection') {
      const snap = await colRef.get();
      const docs = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      return NextResponse.json({ success: true, items: docs });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported operation: ${operation}` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Error in /api/firebase/admin:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Admin Firestore operation failed' },
      { status: 500 }
    );
  }
}
