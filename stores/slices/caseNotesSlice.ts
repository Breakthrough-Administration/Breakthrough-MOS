import { StateCreator } from 'zustand';
import { CaseNote } from '@/types';
import {
  createCaseNote as createCaseNoteDoc,
  updateCaseNote as updateCaseNoteDoc,
  deleteCaseNote as deleteCaseNoteDoc
} from '@/lib/firestoreService';
import { CaseNotesSlice, RootStore } from '../types';

export const createCaseNotesSlice: StateCreator<RootStore, [], [], CaseNotesSlice> = (set, get) => ({
  caseNotes: [],

  addCaseNote: (noteData) => {
    const nowIso = new Date().toISOString();
    const newNote: CaseNote = {
      id: (noteData as CaseNote).id || `note-${Date.now().toString().slice(-4)}`,
      version: (noteData as CaseNote).version || 1,
      createdAt: nowIso,
      updatedAt: nowIso,
      ...noteData
    } as CaseNote;

    set((state) => ({ caseNotes: [newNote, ...state.caseNotes] }));
    get().addAuditLog(
      'CREATE_CASE_NOTE',
      'CaseNote',
      newNote.id,
      `Logged ${newNote.format || 'SOAP'} clinical case note for ${newNote.clientName} (Support Item: ${
        newNote.supportItemCode || 'Not stated'
      }, Duration: ${newNote.sessionDurationMinutes || 0}m F2F / ${newNote.nonFaceToFaceMinutes || 0}m NF2F)${
        newNote.isLocked ? ' — [LOCKED FOR INCIDENT ESCALATION]' : ''
      }`,
      {
        auditCategory: 'Clinical Case Note',
        participantId: newNote.clientId,
        participantName: newNote.clientName,
        ndisNumber: newNote.ndisNumber,
        beforeSnapshot: null,
        afterSnapshot: {
          format: newNote.format,
          date: newNote.date,
          sessionDurationMinutes: newNote.sessionDurationMinutes,
          nonFaceToFaceMinutes: newNote.nonFaceToFaceMinutes,
          supportItemCode: newNote.supportItemCode,
          subjective: newNote.subjective,
          objective: newNote.objective,
          assessment: newNote.assessment,
          plan: newNote.plan,
          practitionerName: newNote.practitionerName,
          isLocked: Boolean(newNote.isLocked),
          version: newNote.version || 1
        }
      }
    );

    createCaseNoteDoc(newNote).catch((err) => {
      console.warn('Firestore write failed for addCaseNote, queueing offline:', err);
      get().queueOfflineDelta('CREATE', 'CaseNote', newNote.id, newNote);
    });
  },

  updateCaseNote: (id, updates) => {
    const beforeNote = get().caseNotes.find((n) => n.id === id);
    const updatedAt = new Date().toISOString();
    const nextVersion = (beforeNote?.version || 1) + 1;
    const enrichedUpdates: Partial<CaseNote> = {
      ...updates,
      version: nextVersion,
      amendedAt: updatedAt,
      amendedBy: get().currentUser?.name || 'Authorised Clinician',
      updatedAt
    };

    set((state) => ({
      caseNotes: state.caseNotes.map((n) => (n.id === id ? { ...n, ...enrichedUpdates } : n))
    }));

    get().addAuditLog(
      'AMEND_CASE_NOTE',
      'CaseNote',
      id,
      `Amended clinical case note (v${beforeNote?.version || 1} → v${nextVersion}) for ${
        beforeNote?.clientName || updates.clientName || 'Participant'
      }${updates.amendmentReason ? ` — Reason: ${updates.amendmentReason}` : ''}`,
      {
        auditCategory: 'Clinical Case Note',
        participantId: beforeNote?.clientId || updates.clientId,
        participantName: beforeNote?.clientName || updates.clientName,
        ndisNumber: beforeNote?.ndisNumber || updates.ndisNumber,
        reasonForChange: updates.amendmentReason || 'Clinical case note amendment',
        beforeSnapshot: beforeNote || null,
        afterSnapshot: enrichedUpdates
      }
    );

    updateCaseNoteDoc(id, enrichedUpdates).catch((err) => {
      console.warn('Firestore write failed for updateCaseNote, queueing offline:', err);
      get().queueOfflineDelta('UPDATE', 'CaseNote', id, enrichedUpdates);
    });
  },

  deleteCaseNote: (id) => {
    const beforeNote = get().caseNotes.find((n) => n.id === id);
    set((state) => ({
      caseNotes: state.caseNotes.filter((n) => n.id !== id)
    }));
    get().addAuditLog(
      'DELETE_CASE_NOTE',
      'CaseNote',
      id,
      `Deleted clinical case note (${beforeNote?.format || 'SOAP'} dated ${beforeNote?.date || 'Not stated'}) for ${
        beforeNote?.clientName || 'Participant'
      }`,
      {
        auditCategory: 'Clinical Case Note',
        participantId: beforeNote?.clientId,
        participantName: beforeNote?.clientName,
        ndisNumber: beforeNote?.ndisNumber,
        beforeSnapshot: beforeNote || null,
        afterSnapshot: null,
        severity: 'High'
      }
    );

    deleteCaseNoteDoc(id).catch((err) => {
      console.warn('Firestore write failed for deleteCaseNote, queueing offline:', err);
      get().queueOfflineDelta('DELETE', 'CaseNote', id, { id });
    });
  }
});
