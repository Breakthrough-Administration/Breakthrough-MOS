'use client';

import React, { useState } from 'react';
import {
  FolderSearch,
  HardDrive,
  FileText,
  FileSpreadsheet,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Trash2,
  ShieldCheck,
  Tag,
  User,
  FolderOpen,
  X
} from 'lucide-react';
import {
  openGoogleDrivePicker,
  PickedGoogleDriveFile,
  PickerLoadingPhase
} from '@/lib/googlePicker';
import { GoogleAuthService, GoogleDriveService } from '@/services/googleWorkspaceService';
import { useManagementStore } from '@/stores/useManagementStore';
import { CompanyDocumentCategory, DocumentCategory } from '@/types';

const VAULT_CATEGORY_OPTIONS: CompanyDocumentCategory[] = [
  'Financials, P&L, BAS & Tax',
  'NDIS Policies, SOPs & Governance',
  'HR Contracts, Insurance & Licenses',
  'Clinical Templates & Service Agreements',
  'Participant Plans & Schedules'
];

const CLINICAL_CATEGORY_OPTIONS: DocumentCategory[] = [
  'NDIS Plan Document',
  'BSP Document',
  'Assessment PDF',
  'Consent Form',
  'Clinical Report',
  'Incident Photo Evidence',
  'Other'
];

interface GooglePickerDocumentLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultVaultCategory?: CompanyDocumentCategory;
  onImportedSuccess?: (count: number) => void;
}

export const GooglePickerDocumentLibraryModal: React.FC<GooglePickerDocumentLibraryModalProps> = ({
  isOpen,
  onClose,
  defaultVaultCategory = 'NDIS Policies, SOPs & Governance',
  onImportedSuccess
}) => {
  const {
    clients,
    currentUser,
    addCompanyDocument,
    updateClient,
    addNotification
  } = useManagementStore();

  const [selectedFiles, setSelectedFiles] = useState<PickedGoogleDriveFile[]>([]);
  const [vaultCategory, setVaultCategory] = useState<CompanyDocumentCategory>(defaultVaultCategory);
  const [clinicalCategory, setClinicalCategory] = useState<DocumentCategory>('NDIS Plan Document');
  const [linkedParticipantId, setLinkedParticipantId] = useState<string>('');
  const [customTagsInput, setCustomTagsInput] = useState<string>('Google Drive, Verified, 2026');
  const [searchFilterQuery, setSearchFilterQuery] = useState<string>('');

  const [pickerPhase, setPickerPhase] = useState<PickerLoadingPhase>('idle');
  const [isConfirmingImport, setIsConfirmingImport] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      const res = await GoogleAuthService.signIn();
      if (res?.accessToken) {
        setStatusMsg(`Signed in as ${res.user.email || 'Google Workspace User'}. Ready to launch Google Picker.`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google Sign-In failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLaunchGooglePicker = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await openGoogleDrivePicker({
        title: 'Select Files from Google Drive for Document Library',
        query: searchFilterQuery.trim() || undefined,
        multiSelect: true,
        onLoadingStateChange: (phase) => setPickerPhase(phase),
        onPicked: (picked) => {
          setPickerPhase('idle');
          if (picked && picked.length > 0) {
            setSelectedFiles((prev) => {
              const map = new Map<string, PickedGoogleDriveFile>();
              prev.forEach((f) => map.set(f.id, f));
              picked.forEach((f) => map.set(f.id, f));
              return Array.from(map.values());
            });
            setStatusMsg(`Selected ${picked.length} file(s) from Google Drive.`);
          }
        },
        onCancel: () => {
          setPickerPhase('idle');
        },
        onError: (err) => {
          setPickerPhase('idle');
          setErrorMsg(err.message || 'Could not open Google Picker.');
        }
      });
    } catch (err: any) {
      setPickerPhase('idle');
      setErrorMsg(err?.message || 'Error launching Google Picker.');
    }
  };

  const handleRemoveSelectedFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleConfirmImportToLibrary = async () => {
    if (selectedFiles.length === 0) return;
    setIsConfirmingImport(true);
    setErrorMsg(null);

    try {
      const targetParticipant = clients.find((c) => c.id === linkedParticipantId);
      const parsedTags = customTagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const { importedCompanyDocs, linkedParticipantDocs } =
        await GoogleDriveService.importPickedFilesToDocumentLibrary({
          files: selectedFiles,
          vaultCategory,
          clinicalCategory,
          linkedParticipantId: targetParticipant?.id,
          linkedParticipantName: targetParticipant?.name,
          uploadedBy: currentUser?.name || 'Shivandhari Persad',
          tags: parsedTags
        });

      // Update local Zustand state for immediate UI reflection
      importedCompanyDocs.forEach((doc) => {
        addCompanyDocument(doc);
      });

      if (targetParticipant && linkedParticipantDocs.length > 0) {
        const existingDocs = targetParticipant.attachedDocuments || targetParticipant.documents || [];
        updateClient(targetParticipant.id, {
          attachedDocuments: [...linkedParticipantDocs, ...existingDocs]
        });
      }

      addNotification({
        title: 'Google Drive Files Imported to Library',
        message: `${importedCompanyDocs.length} file(s) imported into "${vaultCategory}" via Google Picker.`,
        type: 'compliance',
        severity: 'low'
      });

      setShowConfirmDialog(false);
      setSelectedFiles([]);
      if (onImportedSuccess) {
        onImportedSuccess(importedCompanyDocs.length);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to import selected Google Drive files into Document Library.');
    } finally {
      setIsConfirmingImport(false);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Google Drive Doc';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const getFileTypeIcon = (mime: string) => {
    if (mime.includes('spreadsheet') || mime.includes('excel')) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    if (mime.includes('pdf')) {
      return <FileText className="w-4 h-4 text-rose-400 shrink-0" />;
    }
    return <FileCheck className="w-4 h-4 text-teal-400 shrink-0" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="max-w-3xl w-full rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
                <FolderSearch className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-extrabold text-white">
                Import from Google Drive into Document Library
              </h2>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 font-bold">
                Google Picker API
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Select corporate policies, financials, templates, or participant NDIS plans directly from your Google Drive and classify them into the Breakthrough Document Library.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1: OAuth & Google Picker Trigger */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Step 1: Select Files from Google Drive
                </span>
                <p className="text-xs text-slate-400">
                  Authenticate with Google OAuth2 or launch the interactive Google Picker directly.
                </p>
              </div>

              {/* Official Google Material Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="gsi-material-button inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs shadow transition cursor-pointer shrink-0 disabled:opacity-50"
              >
                <div className="gsi-material-button-state" />
                <div className="gsi-material-button-content-wrapper flex items-center gap-2">
                  <div className="gsi-material-button-icon w-4 h-4">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      style={{ display: 'block' }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                      <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">
                    {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
                  </span>
                </div>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
              <input
                type="text"
                value={searchFilterQuery}
                onChange={(e) => setSearchFilterQuery(e.target.value)}
                placeholder="Optional pre-filter keyword for Google Picker (e.g. 'SOP', 'NDIS Plan', 'BAS')..."
                className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500"
              />
              <button
                type="button"
                onClick={handleLaunchGooglePicker}
                disabled={pickerPhase !== 'idle'}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs transition shadow-lg shadow-teal-500/20 cursor-pointer disabled:opacity-50"
              >
                <HardDrive className="w-4 h-4" />
                <span>
                  {pickerPhase === 'loading_api'
                    ? 'Loading Picker...'
                    : pickerPhase === 'requesting_auth'
                    ? 'Authorizing...'
                    : pickerPhase === 'opening_picker'
                    ? 'Opening Picker...'
                    : 'Browse Google Drive (Picker)'}
                </span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {statusMsg && (
            <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between text-xs text-teal-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{statusMsg}</span>
              </div>
              <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Step 2: Classification & Destination Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-teal-400" />
                Target Document Library Vault
              </label>
              <select
                value={vaultCategory}
                onChange={(e) => setVaultCategory(e.target.value as CompanyDocumentCategory)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              >
                {VAULT_CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-400" />
                Link to Participant Dossier (Optional)
              </label>
              <select
                value={linkedParticipantId}
                onChange={(e) => setLinkedParticipantId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              >
                <option value="">Unassigned (Company-Wide Document Library Only)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.ndisNumber || 'NDIS'})
                  </option>
                ))}
              </select>
            </div>

            {linkedParticipantId && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300">
                  Participant Clinical Document Category
                </label>
                <select
                  value={clinicalCategory}
                  onChange={(e) => setClinicalCategory(e.target.value as DocumentCategory)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                >
                  {CLINICAL_CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-teal-400" />
                Document Library Tags (comma-separated)
              </label>
              <input
                type="text"
                value={customTagsInput}
                onChange={(e) => setCustomTagsInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          {/* Step 3: Staged Files List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">
                Selected Google Drive Files ({selectedFiles.length})
              </span>
              {selectedFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedFiles([])}
                  className="text-[11px] text-rose-400 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {selectedFiles.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/50 border border-dashed border-slate-800 text-center space-y-2">
                <FolderSearch className="w-7 h-7 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-300">
                  No Google Drive files staged yet
                </p>
                <p className="text-[11px] text-slate-500">
                  Click &ldquo;Browse Google Drive (Picker)&rdquo; above to pick one or more files from your Drive.
                </p>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-950/60">
                {selectedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-900/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getFileTypeIcon(file.mimeType)}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {formatBytes(file.sizeBytes)} • ID: {file.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-400"
                        title="Open in Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveSelectedFile(file.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                        title="Remove from staging"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            Files remain stored in Google Drive and are linked with metadata into Firestore.
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedFiles.length === 0}
              onClick={() => setShowConfirmDialog(true)}
              className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Import {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''} into Document Library
            </button>
          </div>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog before importing/mutating Document Library */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/15 text-teal-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-extrabold text-white">
                Confirm Import of {selectedFiles.length} Google Drive File(s)?
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will add <strong>{selectedFiles.length}</strong> selected Google Drive file(s) into the{' '}
              <strong className="text-teal-300">{vaultCategory}</strong> vault in your Document Library
              {linkedParticipantId
                ? ` and link them to the selected participant dossier`
                : ''}
              .
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                disabled={isConfirmingImport}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImportToLibrary}
                disabled={isConfirmingImport}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold transition cursor-pointer"
              >
                {isConfirmingImport ? 'Importing...' : 'Confirm & Save to Library'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
