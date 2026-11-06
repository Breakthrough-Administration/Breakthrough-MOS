import { StateCreator } from 'zustand';
import { Practitioner, ScheduledShift, NDISSupportItem, CompanyDocument } from '@/types';
import {
  createPractitioner as createPractitionerDoc,
  updatePractitioner as updatePractitionerDoc,
  deletePractitioner as deletePractitionerDoc,
  createScheduledShift as createScheduledShiftDoc,
  updateScheduledShift as updateScheduledShiftDoc,
  deleteScheduledShift as deleteScheduledShiftDoc,
  createCompanyDocument as createCompanyDocumentDoc,
  updateCompanyDocument as updateCompanyDocumentDoc,
  deleteCompanyDocument as deleteCompanyDocumentDoc,
  createSupportItem as createSupportItemDoc,
  updateSupportItem as updateSupportItemDoc,
  deleteSupportItem as deleteSupportItemDoc
} from '@/lib/firestoreService';
import {
  INITIAL_PRACTITIONERS,
  OFFICIAL_2026_NDIS_PRICE_GUIDE,
  INITIAL_COMPANY_DOCUMENTS
} from '@/lib/seedData';
import { HRSlice, RootStore } from '../types';

export const createHRSlice: StateCreator<RootStore, [], [], HRSlice> = (set, get) => ({
  practitioners: INITIAL_PRACTITIONERS,
  scheduledShifts: [],
  supportItems: OFFICIAL_2026_NDIS_PRICE_GUIDE,
  companyDocuments: INITIAL_COMPANY_DOCUMENTS,

  addPractitioner: (practitioner) => {
    const existing = get().practitioners.find((p) => p.id === practitioner.id);
    set((state) => {
      const exists = state.practitioners.some((p) => p.id === practitioner.id);
      return {
        practitioners: exists
          ? state.practitioners.map((p) => (p.id === practitioner.id ? practitioner : p))
          : [practitioner, ...state.practitioners]
      };
    });
    get().addAuditLog(
      existing ? 'UPDATE' : 'CREATE',
      'Practitioner',
      practitioner.id,
      `${existing ? 'Updated' : 'Added'} practitioner ${practitioner.name} (${practitioner.pbsRegistrationLevel || practitioner.position}) in HR roster`,
      {
        beforeSnapshot: existing || null,
        afterSnapshot: practitioner
      }
    );

    createPractitionerDoc(practitioner).catch((err) => {
      console.warn('Firestore write failed for addPractitioner, queueing offline:', err);
      get().queueOfflineDelta('CREATE', 'Practitioner', practitioner.id, practitioner);
    });
  },

  updatePractitioner: (id, updates) => {
    const beforePrac = get().practitioners.find((p) => p.id === id);
    const afterPrac = beforePrac ? { ...beforePrac, ...updates } : updates;
    set((state) => ({
      practitioners: state.practitioners.map((p) => (p.id === id ? { ...p, ...updates } : p))
    }));
    get().addAuditLog(
      'UPDATE',
      'Practitioner',
      id,
      `Updated practitioner credentials & caseload parameters for ${beforePrac?.name || id}`,
      {
        beforeSnapshot: beforePrac || null,
        afterSnapshot: updates
      }
    );

    updatePractitionerDoc(id, updates).catch((err) => {
      console.warn('Firestore write failed for updatePractitioner, queueing offline:', err);
      get().queueOfflineDelta('UPDATE', 'Practitioner', id, updates);
    });
  },

  deletePractitioner: (id) => {
    const beforePrac = get().practitioners.find((p) => p.id === id);
    set((state) => ({
      practitioners: state.practitioners.filter((p) => p.id !== id)
    }));
    get().addAuditLog(
      'DELETE',
      'Practitioner',
      id,
      `Removed practitioner ${beforePrac?.name || id} from HR roster`,
      {
        beforeSnapshot: beforePrac || null,
        afterSnapshot: null
      }
    );

    deletePractitionerDoc(id).catch((err) => {
      console.warn('Firestore write failed for deletePractitioner, queueing offline:', err);
      get().queueOfflineDelta('DELETE', 'Practitioner', id, { id });
    });
  },

  addScheduledShift: (shiftData) => {
    const newShift: ScheduledShift = {
      id: (shiftData as ScheduledShift).id || `shift-${Date.now().toString().slice(-4)}`,
      ...shiftData
    } as ScheduledShift;

    set((state) => ({ scheduledShifts: [newShift, ...state.scheduledShifts] }));
    get().addAuditLog(
      'CREATE',
      'ScheduledShift',
      newShift.id,
      `Scheduled shift for ${newShift.clientName} with ${newShift.practitionerName} (${newShift.date} ${newShift.startTime}-${newShift.endTime})`,
      {
        participantId: newShift.clientId,
        participantName: newShift.clientName,
        afterSnapshot: newShift
      }
    );

    createScheduledShiftDoc(newShift).catch((err) => {
      console.warn('Firestore write failed for addScheduledShift, queueing offline:', err);
      get().queueOfflineDelta('CREATE', 'ScheduledShift', newShift.id, newShift);
    });
  },

  updateScheduledShift: (id, updates) => {
    const beforeShift = get().scheduledShifts.find((s) => s.id === id);
    set((state) => ({
      scheduledShifts: state.scheduledShifts.map((s) => (s.id === id ? { ...s, ...updates } : s))
    }));
    get().addAuditLog(
      'UPDATE',
      'ScheduledShift',
      id,
      `Updated scheduled shift for ${beforeShift?.clientName || id}`,
      {
        participantId: beforeShift?.clientId,
        participantName: beforeShift?.clientName,
        beforeSnapshot: beforeShift || null,
        afterSnapshot: updates
      }
    );

    updateScheduledShiftDoc(id, updates).catch((err) => {
      console.warn('Firestore write failed for updateScheduledShift, queueing offline:', err);
      get().queueOfflineDelta('UPDATE', 'ScheduledShift', id, updates);
    });
  },

  deleteScheduledShift: (id) => {
    const beforeShift = get().scheduledShifts.find((s) => s.id === id);
    set((state) => ({
      scheduledShifts: state.scheduledShifts.filter((s) => s.id !== id)
    }));
    get().addAuditLog(
      'DELETE',
      'ScheduledShift',
      id,
      `Removed scheduled shift for ${beforeShift?.clientName || id}`,
      {
        participantId: beforeShift?.clientId,
        participantName: beforeShift?.clientName,
        beforeSnapshot: beforeShift || null
      }
    );

    deleteScheduledShiftDoc(id).catch((err) => {
      console.warn('Firestore write failed for deleteScheduledShift, queueing offline:', err);
      get().queueOfflineDelta('DELETE', 'ScheduledShift', id, { id });
    });
  },

  addCompanyDocument: (docData) => {
    const existing = get().companyDocuments.find((d) => d.id === docData.id);
    set((state) => {
      const exists = state.companyDocuments.some((d) => d.id === docData.id);
      return {
        companyDocuments: exists
          ? state.companyDocuments.map((d) => (d.id === docData.id ? docData : d))
          : [docData, ...state.companyDocuments]
      };
    });
    const isServiceAgreement =
      docData.category?.includes('Service Agreement') ||
      docData.title?.toLowerCase().includes('service agreement');
    get().addAuditLog(
      existing ? 'UPDATE' : 'CREATE',
      isServiceAgreement ? 'ServiceAgreement' : 'CompanyDocument',
      docData.id,
      `${existing ? 'Updated' : 'Uploaded'} ${isServiceAgreement ? 'Service Agreement document' : 'company document'} "${docData.title}" (${docData.category})`,
      {
        auditCategory: isServiceAgreement ? 'Service Agreement & Funding' : undefined,
        beforeSnapshot: existing || null,
        afterSnapshot: docData
      }
    );

    createCompanyDocumentDoc(docData).catch((err) => {
      console.warn('Firestore write failed for addCompanyDocument, queueing offline:', err);
      get().queueOfflineDelta('CREATE', 'CompanyDocument', docData.id, docData);
    });
  },

  updateCompanyDocument: (id, updates) => {
    const beforeDoc = get().companyDocuments.find((d) => d.id === id);
    set((state) => ({
      companyDocuments: state.companyDocuments.map((d) => (d.id === id ? { ...d, ...updates } : d))
    }));
    get().addAuditLog(
      'UPDATE',
      'CompanyDocument',
      id,
      `Updated company document "${beforeDoc?.title || id}"`,
      {
        beforeSnapshot: beforeDoc || null,
        afterSnapshot: updates
      }
    );

    updateCompanyDocumentDoc(id, updates).catch((err) => {
      console.warn('Firestore write failed for updateCompanyDocument, queueing offline:', err);
      get().queueOfflineDelta('UPDATE', 'CompanyDocument', id, updates);
    });
  },

  deleteCompanyDocument: (id) => {
    const beforeDoc = get().companyDocuments.find((d) => d.id === id);
    set((state) => ({
      companyDocuments: state.companyDocuments.filter((d) => d.id !== id)
    }));
    get().addAuditLog(
      'DELETE',
      'CompanyDocument',
      id,
      `Deleted company document "${beforeDoc?.title || id}" from vault`,
      {
        beforeSnapshot: beforeDoc || null
      }
    );

    deleteCompanyDocumentDoc(id).catch((err) => {
      console.warn('Firestore write failed for deleteCompanyDocument, queueing offline:', err);
      get().queueOfflineDelta('DELETE', 'CompanyDocument', id, { id });
    });
  },

  // NDIS Support Items (PAPL Catalogue) CRUD with Automated Compliance Audit Logging
  addSupportItem: (item, reason) => {
    const existing = get().supportItems.find((s) => s.code === item.code);
    const enrichedItem: NDISSupportItem = {
      ...item,
      id: item.id || item.code,
      effectiveDate: item.effectiveDate || '2025-07-01'
    };

    set((state) => {
      const exists = state.supportItems.some((s) => s.code === item.code);
      return {
        supportItems: exists
          ? state.supportItems.map((s) => (s.code === item.code ? enrichedItem : s))
          : [enrichedItem, ...state.supportItems]
      };
    });

    get().addAuditLog(
      existing ? 'UPDATE_SUPPORT_ITEM' : 'CREATE_SUPPORT_ITEM',
      'NDISSupportItem',
      enrichedItem.code,
      `${existing ? 'Updated' : 'Registered'} NDIS Support Item ${enrichedItem.code} (${enrichedItem.name}) — National Cap: $${enrichedItem.pricePerUnit.toFixed(2)} AUD/${enrichedItem.unitOfMeasure}`,
      {
        auditCategory: 'Support Item & Price Guide',
        reasonForChange: reason || (existing ? 'PAPL support item rate/rule update' : 'Added NDIS support item to practice catalogue'),
        beforeSnapshot: existing || null,
        afterSnapshot: enrichedItem
      }
    );

    createSupportItemDoc(enrichedItem).catch((err) => {
      console.warn('Firestore write failed for addSupportItem, queueing offline:', err);
      get().queueOfflineDelta('CREATE', 'NDISSupportItem', enrichedItem.code, enrichedItem);
    });
  },

  updateSupportItem: (code, updates, reason) => {
    const beforeItem = get().supportItems.find((s) => s.code === code || s.id === code);
    const afterItem = beforeItem ? { ...beforeItem, ...updates } : updates;

    set((state) => ({
      supportItems: state.supportItems.map((s) =>
        s.code === code || s.id === code ? { ...s, ...updates } : s
      )
    }));

    get().addAuditLog(
      'UPDATE_SUPPORT_ITEM',
      'NDISSupportItem',
      code,
      `Modified NDIS Support Item ${code} (${beforeItem?.name || updates.name || code})${
        updates.pricePerUnit !== undefined && beforeItem
          ? ` — Price Limit: $${beforeItem.pricePerUnit.toFixed(2)} AUD → $${Number(updates.pricePerUnit).toFixed(2)} AUD`
          : ''
      }`,
      {
        auditCategory: 'Support Item & Price Guide',
        reasonForChange: reason || 'NDIS Price Guide rate / claiming rule update',
        beforeSnapshot: beforeItem || null,
        afterSnapshot: updates
      }
    );

    if (afterItem && (afterItem as NDISSupportItem).code) {
      createSupportItemDoc(afterItem as NDISSupportItem).catch(() => {
        updateSupportItemDoc(code, updates).catch((err) => {
          console.warn('Firestore write failed for updateSupportItem, queueing offline:', err);
          get().queueOfflineDelta('UPDATE', 'NDISSupportItem', code, updates);
        });
      });
    }
  },

  deleteSupportItem: (code, reason) => {
    const beforeItem = get().supportItems.find((s) => s.code === code || s.id === code);
    set((state) => ({
      supportItems: state.supportItems.filter((s) => s.code !== code && s.id !== code)
    }));

    get().addAuditLog(
      'DELETE_SUPPORT_ITEM',
      'NDISSupportItem',
      code,
      `Removed NDIS Support Item ${code} (${beforeItem?.name || code}) from active catalogue`,
      {
        auditCategory: 'Support Item & Price Guide',
        reasonForChange: reason || 'Support item retired from practice catalogue',
        beforeSnapshot: beforeItem || null,
        afterSnapshot: null
      }
    );

    deleteSupportItemDoc(code).catch((err) => {
      console.warn('Firestore write failed for deleteSupportItem, queueing offline:', err);
      get().queueOfflineDelta('DELETE', 'NDISSupportItem', code, { code });
    });
  }
});
