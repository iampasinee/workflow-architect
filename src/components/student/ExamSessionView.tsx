import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Clock,
  Laptop,
  UploadCloud,
  FileCode,
  FileArchive,
  Trash2,
  Pencil,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  HardDrive,
  FileCheck,
  LogOut,
  HelpCircle,
  Eye,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { formatFileSize } from '../../utils/fileSize';
import { StagedUploadRecord, StagedUploadStatus } from '../../types/stagedUpload';
import {
  deleteStagedUpload,
  getStagedUploads,
  reserveUploadSequences,
  saveStagedUpload,
} from '../../services/stagedUploadStorage';

export const ExamSessionView: React.FC = () => {
  const {
    currentStudent,
    students,
    examSessions,
    currentExamId,
    courses,
    rooms,
    seatAssignments,
    submissions,
    submitStudentFiles,
    showToast,
    setRole,
    language
  } = useApp();

  const activeExam =
    examSessions.find((exam) => exam.id === currentExamId) ||
    examSessions.find((exam) => exam.status === 'in_progress') ||
    examSessions[0];
  const course = courses.find((c) => c.id === activeExam?.courseId);
  const room = rooms.find((r) => r.id === activeExam?.roomId);

  const myAssignment = seatAssignments.find(
    (sa) => sa.examId === activeExam?.id && sa.studentId === currentStudent?.id
  );
  const seatNo = myAssignment?.seatNo || 'A1';
  const seatStation = room?.seats.find((s) => s.seatNo === seatNo);

  const existingSubmission = submissions.find(
    (s) => s.examId === activeExam?.id && s.studentId === currentStudent?.id
  );
  const reopening = currentStudent
    ? activeExam?.reopenedStudents?.[currentStudent.id] || activeExam?.reopenedStudents?.['*']
    : undefined;
  const reopeningExpiresAt = reopening ? new Date(reopening.reopenedUntil).getTime() : 0;
  const hasActiveReopening = reopeningExpiresAt > Date.now();
  const registeredStudent = currentStudent
    ? students.find((student) => student.id === currentStudent.id)
    : undefined;
  const isRegisteredStudent = registeredStudent?.accountStatus === 'active';
  const hasFinalSubmission =
    existingSubmission?.status === 'submitted' || existingSubmission?.status === 'late';
  const hasUploadPermission = Boolean(
    isRegisteredStudent &&
    activeExam?.status === 'in_progress' &&
    (!hasFinalSubmission || hasActiveReopening)
  );

  // Sub-step inside session: 'upload' (ST4/ST5), 'checking' (ST6), 'success' (ST7)
  const [sessionStep, setSessionStep] = useState<'upload' | 'checking' | 'success'>(() => {
    if (existingSubmission?.status === 'submitted') return 'success';
    return 'upload';
  });
  const isThai = language === 'th';

  // Countdown timer simulation
  // Default: calculate remaining seconds from 120 mins + adjustedMinutes
  // For realistic testing, start with 38 minutes 42 seconds remaining, or full
  const [remainingSeconds, setRemainingSeconds] = useState<number>(38 * 60 + 42);
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  const autoSubmissionAttemptedRef = useRef(false);

  useEffect(() => {
    if (!hasActiveReopening) return;

    setRemainingSeconds(Math.max(1, Math.ceil((reopeningExpiresAt - Date.now()) / 1000)));
    setIsTimeExpired(false);
    autoSubmissionAttemptedRef.current = false;
    setTimeoutStatus('idle');
    setSessionStep('upload');
  }, [hasActiveReopening, reopeningExpiresAt]);

  useEffect(() => {
    if (sessionStep === 'success') return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimeExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionStep]);

  // Format time as HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Color coding for countdown
  const getTimerColorClass = () => {
    if (remainingSeconds <= 300) return 'text-red-600 bg-red-50 border-red-200 animate-pulse'; // < 5 mins
    if (remainingSeconds <= 900) return 'text-amber-600 bg-amber-50 border-amber-200'; // < 15 mins
    return 'text-blue-700 bg-blue-50 border-blue-200';
  };

  // Upload Management
  const [stagedFiles, setStagedFiles] = useState<StagedUploadRecord[]>([]);
  const [stagingLoaded, setStagingLoaded] = useState(false);
  const [timeoutStatus, setTimeoutStatus] = useState<'idle' | 'processing' | 'submitted' | 'no_files'>('idle');

  const [dragActive, setDragActive] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);
  const [integrityProgress, setIntegrityProgress] = useState(0);
  const [integrityCheckStep, setIntegrityCheckStep] = useState(0);
  const [integrityError, setIntegrityError] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<StagedUploadRecord | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTimersRef = useRef<Map<string, number>>(new Map());
  const graceTimerRef = useRef<number | null>(null);
  const stagingSessionKey = `${activeExam?.id || 'no-exam'}:${currentStudent?.id || 'no-student'}`;
  const canUpload = hasUploadPermission && (!isTimeExpired || hasActiveReopening);

  const uploadLockedMessage = (() => {
    if (!isRegisteredStudent) {
      return isThai
        ? 'เฉพาะนักศึกษาที่ลงทะเบียนและมีบัญชีใช้งานอยู่เท่านั้นที่สามารถอัปโหลดไฟล์ได้'
        : 'Only registered students with an active account may upload files.';
    }
    if (activeExam?.status !== 'in_progress') {
      return isThai
        ? 'สามารถอัปโหลดไฟล์ได้เฉพาะระหว่างการสอบที่กำลังดำเนินการ'
        : 'File uploads are only available while the exam is in progress.';
    }
    if (hasFinalSubmission && !hasActiveReopening) {
      return isThai
        ? 'ไฟล์คำตอบถูกล็อกแล้ว กรุณาขอให้อาจารย์เปิดรับการส่งใหม่'
        : 'Your final submission is locked. Ask the instructor to reopen it before uploading a replacement.';
    }
    return isThai
      ? 'หมดเวลาการอัปโหลดแล้ว กรุณาขอให้อาจารย์เปิดรับการส่งใหม่'
      : 'The upload window has ended. Ask the instructor to reopen submissions.';
  })();

  const notifyUploadLocked = () => {
    showToast(
      isThai ? 'ไม่อนุญาตให้อัปโหลด' : 'Upload Not Permitted',
      uploadLockedMessage,
      'warning'
    );
  };

  const updateStagedFile = (uploadId: string, updates: Partial<StagedUploadRecord>) => {
    setStagedFiles((previous) =>
      previous.map((record) => {
        if (record.uploadId !== uploadId) return record;
        const updated = { ...record, ...updates };
        void saveStagedUpload(updated);
        return updated;
      })
    );
  };

  const startMockUpload = (uploadId: string) => {
    const existingTimer = uploadTimersRef.current.get(uploadId);
    if (existingTimer) window.clearInterval(existingTimer);

    const timer = window.setInterval(() => {
      setStagedFiles((previous) =>
        previous.map((record) => {
          if (record.uploadId !== uploadId || record.status !== 'uploading') return record;

          const progress = Math.min(100, record.progress + 20);
          const shouldFail = record.originalName.toLowerCase().includes('upload-fail');
          const status: StagedUploadStatus =
            progress === 100 ? (shouldFail ? 'failed' : 'ready') : 'uploading';
          const updated: StagedUploadRecord = {
            ...record,
            progress,
            status,
            lastUpdated: new Date().toISOString(),
            errorReason: shouldFail && progress === 100
              ? 'Simulated temporary storage transfer failure.'
              : undefined,
          };
          void saveStagedUpload(updated);

          if (progress === 100) {
            window.clearInterval(timer);
            uploadTimersRef.current.delete(uploadId);
          }
          return updated;
        })
      );
    }, 450);

    uploadTimersRef.current.set(uploadId, timer);
  };

  useEffect(() => {
    let cancelled = false;
    setStagingLoaded(false);

    getStagedUploads(stagingSessionKey)
      .then((records) => {
        if (cancelled) return;
        const sorted = records.sort((a, b) => a.lastUpdated.localeCompare(b.lastUpdated));
        setStagedFiles(sorted);
        setStagingLoaded(true);
        sorted.filter((record) => record.status === 'uploading').forEach((record) => {
          startMockUpload(record.uploadId);
        });
      })
      .catch(() => {
        if (!cancelled) {
          setStagedFiles([]);
          setStagingLoaded(true);
          showToast('Temporary Storage Unavailable', 'Unable to restore staged files from browser storage.', 'error');
        }
      });

    return () => {
      cancelled = true;
      uploadTimersRef.current.forEach((timer) => window.clearInterval(timer));
      uploadTimersRef.current.clear();
    };
  }, [stagingSessionKey]);

  const getFileExtension = (fileName: string) => {
    if (!fileName.includes('.')) return '';
    return `.${fileName.split('.').pop()?.toLowerCase() || ''}`;
  };

  const normalizeFilenamePart = (value: string) => value
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z_]/g, '');

  const generateSubmissionName = (file: File, uploadSequence: number) => {
    const extension = getFileExtension(file.name);
    const profileNameParts = (currentStudent?.fullName || '').trim().split(/\s+/);
    const firstName = normalizeFilenamePart(currentStudent?.firstName || profileNameParts[0] || '');
    const lastName = normalizeFilenamePart(
      currentStudent?.lastName || profileNameParts.slice(1).join(' ') || ''
    );
    const template = activeExam?.fileRequirements.automaticFilenamePattern ||
      '{studentId}_{firstName}_{lastName}_{uploadSequence}.{extension}';
    const values: Record<string, string> = {
      studentId: currentStudent?.studentCode || 'student',
      firstName,
      lastName,
      uploadSequence: String(uploadSequence),
      extension: extension.replace(/^\./, ''),
    };
    return template.replace(
      /\{(studentId|firstName|lastName|uploadSequence|extension)\}/g,
      (_, token: string) => values[token]
    );
  };

  const validateSelectedFile = (file: File) => {
    const extension = getFileExtension(file.name);
    const accepted = (activeExam?.fileRequirements?.acceptedExtensions || ['.zip', '.py'])
      .map((acceptedExtension) => acceptedExtension.toLowerCase());
    const maxMb = activeExam?.fileRequirements?.maxSizeMb || 25;
    const maxBytes = maxMb * 1024 * 1024;

    if (!accepted.includes(extension)) {
      return `Unsupported file type (${extension || 'none'}). Only ${accepted.join(', ')} are permitted.`;
    }
    if (file.size === 0) {
      return 'The selected file is empty (0 bytes). Please choose a file containing your answer.';
    }
    if (file.size > maxBytes) {
      return `File exceeds maximum limit (${(file.size / 1024 / 1024).toFixed(2)} MB > ${maxMb} MB).`;
    }
    return undefined;
  };

  const createStagedRecord = (
    file: File,
    uploadSequence: number,
  ): StagedUploadRecord => {
    const extension = getFileExtension(file.name);
    const errorReason = validateSelectedFile(file);

    return {
      uploadId: globalThis.crypto?.randomUUID?.() || `upload_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      uploadSequence,
      sessionKey: stagingSessionKey,
      originalName: file.name,
      submissionName: generateSubmissionName(file, uploadSequence),
      sizeBytes: file.size,
      extension,
      lastUpdated: new Date().toISOString(),
      progress: errorReason ? 0 : 1,
      status: errorReason ? 'invalid' : 'uploading',
      errorReason,
      blob: file,
    };
  };

  const stageSelectedFiles = async (files: File[]) => {
    if (!canUpload) {
      notifyUploadLocked();
      return;
    }

    let uploadSequences: number[];
    try {
      uploadSequences = await reserveUploadSequences(stagingSessionKey, files.length);
    } catch {
      showToast('Staging Failed', 'Unable to reserve upload sequence numbers.', 'error');
      return;
    }

    const records = files.map((file, index) => createStagedRecord(file, uploadSequences[index]));
    setStagedFiles((previous) => [...previous, ...records]);
    try {
      await Promise.all(records.map(saveStagedUpload));
      records
        .filter((record) => record.status === 'uploading')
        .forEach((record) => startMockUpload(record.uploadId));
    } catch {
      const failedIds = new Set(records.map((record) => record.uploadId));
      setStagedFiles((previous) => previous.map((record) =>
        failedIds.has(record.uploadId)
          ? {
              ...record,
              status: 'failed',
              progress: 0,
              errorReason: 'The file could not be copied to browser temporary storage.',
              lastUpdated: new Date().toISOString(),
            }
          : record
      ));
      showToast('Staging Failed', 'The selected file could not be saved to browser temporary storage.', 'error');
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    void stageSelectedFiles(Array.from(event.dataTransfer.files));
  };

  const handleManualFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    void stageSelectedFiles(Array.from(event.target.files || []));
    event.target.value = '';
  };

  const handleRemoveFile = (uploadId: string) => {
    const file = stagedFiles.find((record) => record.uploadId === uploadId);
    if (!canUpload || file?.status === 'submitted') {
      notifyUploadLocked();
      return;
    }
    const timer = uploadTimersRef.current.get(uploadId);
    if (timer) window.clearInterval(timer);
    uploadTimersRef.current.delete(uploadId);
    setStagedFiles((previous) => previous.filter((record) => record.uploadId !== uploadId));
    void deleteStagedUpload(uploadId);
  };

  const getRenameValidationError = (value: string, target: StagedUploadRecord) => {
    const trimmedBaseName = value.trim();
    if (!trimmedBaseName) return 'Filename is required.';
    if (trimmedBaseName.length > 100) return 'Filename cannot exceed 100 characters.';
    if (!/^[A-Za-z0-9_-]+$/.test(trimmedBaseName)) {
      return 'Use only English letters, numbers, hyphens (-), and underscores (_).';
    }

    const candidateName = `${trimmedBaseName}${target.extension}`.toLowerCase();
    if (stagedFiles.some(
      (file) => file.uploadId !== target.uploadId &&
        file.submissionName.toLowerCase() === candidateName
    )) {
      return 'A file with this name already exists in your submission.';
    }
    return null;
  };

  const openRenameDialog = (file: StagedUploadRecord) => {
    if (!canUpload || file.status === 'submitted') {
      notifyUploadLocked();
      return;
    }
    const baseName = file.submissionName.slice(0, -file.extension.length);
    setRenameTarget(file);
    setRenameValue(baseName);
    setRenameError(getRenameValidationError(baseName, file));
  };

  const closeRenameDialog = () => {
    setRenameTarget(null);
    setRenameValue('');
    setRenameError(null);
  };

  const handleRenameFile = (event: React.FormEvent) => {
    event.preventDefault();
    if (!renameTarget) return;
    if (!canUpload || renameTarget.status === 'submitted') {
      closeRenameDialog();
      notifyUploadLocked();
      return;
    }

    const validationError = getRenameValidationError(renameValue, renameTarget);
    if (validationError) {
      setRenameError(validationError);
      return;
    }

    const nextName = `${renameValue.trim()}${renameTarget.extension}`;
    updateStagedFile(renameTarget.uploadId, { submissionName: nextName });
    showToast(
      isThai ? 'อัปเดตชื่อไฟล์แล้ว' : 'Filename Updated',
      'Filename updated successfully.',
      'success'
    );
    closeRenameDialog();
  };

  const addSimulatedPyFile = () => {
    const file = new File(
      ['print("SecureLab staged upload")\n'],
      `${currentStudent?.studentCode || '6410123456'}_solution.py`,
      { type: 'text/x-python' }
    );
    void stageSelectedFiles([file]);
  };

  const addSimulatedCorruptFile = () => {
    const file = new File([], `${currentStudent?.studentCode || '6410123456'}_empty.zip`);
    void stageSelectedFiles([file]);
  };

  const addSimulatedFailedUpload = () => {
    const file = new File(
      ['simulated upload failure'],
      `${currentStudent?.studentCode || '6410123456'}_upload-fail.zip`
    );
    void stageSelectedFiles([file]);
  };

  const markFilesSubmitted = (files: StagedUploadRecord[]) => {
    const submittedIds = new Set(files.map((file) => file.uploadId));
    setStagedFiles((previous) =>
      previous.map((file) => {
        if (!submittedIds.has(file.uploadId)) return file;
        const updated: StagedUploadRecord = {
          ...file,
          status: 'submitted',
          progress: 100,
          lastUpdated: new Date().toISOString(),
          errorReason: undefined,
        };
        void saveStagedUpload(updated);
        return updated;
      })
    );
  };

  const isIntegrityValid = (file: StagedUploadRecord) => {
    const accepted = (activeExam?.fileRequirements.acceptedExtensions || ['.zip', '.py'])
      .map((acceptedExtension) => acceptedExtension.toLowerCase());
    const maxBytes = (activeExam?.fileRequirements.maxSizeMb || 25) * 1024 * 1024;
    return file.status === 'ready' &&
      file.blob instanceof Blob &&
      file.sizeBytes > 0 &&
      file.blob.size === file.sizeBytes &&
      accepted.includes(file.extension.toLowerCase()) &&
      file.sizeBytes <= maxBytes;
  };

  const startSubmissionProcess = () => {
    if (!canUpload || !activeExam || !currentStudent) {
      setShowConfirmModal(false);
      notifyUploadLocked();
      return;
    }

    const readyFiles = stagedFiles.filter((file) => file.status === 'ready');
    const requiredCount = activeExam.fileRequirements.requiredFileCount || 1;
    const hasBlockingFiles = stagedFiles.some(
      (file) => file.status === 'uploading' || file.status === 'invalid' || file.status === 'failed'
    );
    const hasIntegrityFailure = readyFiles.some((file) => !isIntegrityValid(file));

    if (readyFiles.length < requiredCount || hasBlockingFiles || hasIntegrityFailure) {
      setShowConfirmModal(false);
      showToast(
        'Files Not Ready',
        `Wait for all uploads to finish and prepare at least ${requiredCount} readable, valid file${requiredCount === 1 ? '' : 's'}.`,
        'warning'
      );
      return;
    }

    setShowConfirmModal(false);
    setSessionStep('checking');
    setIsCheckingIntegrity(true);
    setIntegrityProgress(0);
    setIntegrityCheckStep(1);
    setIntegrityError(null);

    let step = 1;
    const interval = setInterval(() => {
      step += 1;
      setIntegrityCheckStep(step);
      setIntegrityProgress(step * 25);

      if (step === 4) {
        clearInterval(interval);
        setTimeout(() => {
          setIsCheckingIntegrity(false);
          const accepted = submitStudentFiles(
            activeExam.id,
            currentStudent.id,
            readyFiles.map((file) => ({
              uploadId: file.uploadId,
              submissionName: file.submissionName,
              sizeBytes: file.sizeBytes,
            }))
          );
          if (accepted) {
            markFilesSubmitted(readyFiles);
            setSessionStep('success');
          } else {
            setIntegrityError(uploadLockedMessage);
            setSessionStep('upload');
          }
        }, 500);
      }
    }, 500);
  };

  const readyFiles = stagedFiles.filter((file) => file.status === 'ready');
  const requiredFileCount = activeExam?.fileRequirements.requiredFileCount || 1;
  const hasBlockingStagedFiles = stagedFiles.some(
    (file) => file.status === 'uploading' || file.status === 'invalid' || file.status === 'failed'
  );
  const hasBlockingFiles = hasBlockingStagedFiles;
  const canFinishExam =
    canUpload && readyFiles.length >= requiredFileCount && !hasBlockingFiles;

  const getStagedStatusLabel = (status: StagedUploadStatus) => {
    switch (status) {
      case 'uploading': return isThai ? 'กำลังอัปโหลด' : 'Uploading';
      case 'ready': return isThai ? 'อัปโหลดแล้ว — รอการส่งขั้นสุดท้าย' : 'Uploaded — Waiting for Final Submission';
      case 'invalid': return isThai ? 'ไฟล์ไม่ถูกต้อง' : 'Invalid';
      case 'failed': return isThai ? 'อัปโหลดไม่สำเร็จ' : 'Failed';
      case 'submitted': return isThai ? 'ส่งแล้ว' : 'Submitted';
    }
  };

  const getStagedStatusClass = (status: StagedUploadStatus) => {
    if (status === 'ready' || status === 'submitted') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (status === 'uploading') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  const finalizeTimedOutSubmission = (files: StagedUploadRecord[]) => {
    if (!activeExam || !currentStudent) return;
    const integrityFailures = files.filter(
      (file) => file.status === 'ready' && !isIntegrityValid(file)
    );
    integrityFailures.forEach((file) => {
      updateStagedFile(file.uploadId, {
        status: 'failed',
        errorReason: 'Final integrity validation failed: the staged file is incomplete or unreadable.',
        lastUpdated: new Date().toISOString(),
      });
    });
    const filesToSubmit = files.filter(isIntegrityValid);

    if (filesToSubmit.length === 0) {
      setTimeoutStatus('no_files');
      const message = 'No files submitted. Please contact the exam proctor/instructor.';
      showToast('No Files Submitted', message, 'error');
      window.alert(message);
      return;
    }

    const accepted = submitStudentFiles(
      activeExam.id,
      currentStudent.id,
      filesToSubmit.map((file) => ({
        uploadId: file.uploadId,
        submissionName: file.submissionName,
        sizeBytes: file.sizeBytes,
      }))
    );

    if (accepted) {
      markFilesSubmitted(filesToSubmit);
      setTimeoutStatus('submitted');
      setSessionStep('success');
      showToast(
        'Files Submitted Automatically',
        'Time is up. Your prepared files have been submitted automatically.',
        'success'
      );
    }
  };

  useEffect(() => {
    if (
      !isTimeExpired ||
      sessionStep !== 'upload' ||
      !stagingLoaded ||
      autoSubmissionAttemptedRef.current
    ) return;

    autoSubmissionAttemptedRef.current = true;
    setTimeoutStatus('processing');
  }, [isTimeExpired, sessionStep, stagingLoaded]);

  useEffect(() => {
    if (timeoutStatus !== 'processing') return;
    const uploadingFiles = stagedFiles.filter((file) => file.status === 'uploading');

    if (uploadingFiles.length === 0) {
      if (graceTimerRef.current) window.clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
      finalizeTimedOutSubmission(stagedFiles);
      return;
    }

    if (!graceTimerRef.current) {
      graceTimerRef.current = window.setTimeout(() => {
        setStagedFiles((previous) =>
          previous.map((file) => {
            if (file.status !== 'uploading') return file;
            const timer = uploadTimersRef.current.get(file.uploadId);
            if (timer) window.clearInterval(timer);
            uploadTimersRef.current.delete(file.uploadId);
            const failed: StagedUploadRecord = {
              ...file,
              status: 'failed',
              errorReason: 'Upload did not finish within the 10-second timeout grace period.',
              lastUpdated: new Date().toISOString(),
            };
            void saveStagedUpload(failed);
            return failed;
          })
        );
        graceTimerRef.current = null;
      }, 10_000);
    }
  }, [timeoutStatus, stagedFiles]);

  useEffect(() => () => {
    if (graceTimerRef.current) window.clearTimeout(graceTimerRef.current);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col justify-between">
      {/* ST4 / FOCUS MODE HEADER BAR */}
      <header className="bg-white border-b border-gray-200 px-6 py-3.5 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Station & Student */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold font-mono text-sm">
              {seatNo}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-sm">
                  {currentStudent?.fullName}
                </span>
                <span className="text-xs font-mono text-gray-500">
                  ({currentStudent?.studentCode})
                </span>
                <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-[11px] text-gray-500 font-mono flex items-center gap-2">
                <span>{seatStation?.machineNo || 'PC-301-01'}</span>
                <span>•</span>
                <span>IP: {seatStation?.ip || '192.168.10.11'}</span>
                <span>•</span>
                <span>{room?.labName}</span>
              </div>
            </div>
          </div>

          {/* Center: Prominent Live Countdown Timer */}
          <div className="flex items-center gap-3 self-center md:self-auto">
            <div
              className={`px-5 py-2 rounded-2xl border flex items-center gap-3 shadow-xs ${getTimerColorClass()}`}
            >
              <Clock className="w-5 h-5 animate-pulse" />
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider block leading-none">
                  {isTimeExpired
                    ? (isThai ? 'หมดเวลาการส่งข้อสอบแล้ว' : 'Submission Period Ended')
                    : (isThai ? 'เวลาส่งข้อสอบที่เหลืออยู่' : 'Remaining Submission Time')}
                </span>
                <span className="text-2xl font-bold font-mono tracking-tight leading-tight">
                  {formatTime(remainingSeconds)}
                </span>
              </div>
            </div>

            {activeExam?.adjustedMinutes && activeExam.adjustedMinutes !== 0 ? (
              <Badge variant="warning" size="sm">
                {isThai ? 'ปรับเวลา: ' : 'Adj: '}
                {activeExam.adjustedMinutes > 0 ? `+${activeExam.adjustedMinutes}m` : `${activeExam.adjustedMinutes}m`}
              </Badge>
            ) : null}
          </div>

          {/* Right: Course context & Focus Mode badge */}
          <div className="hidden lg:flex items-center gap-3 text-right">
            <div>
              <div className="text-xs font-bold text-gray-900">
                {isThai ? `โหมดสอบล็อกหน้าจอ: ${course?.courseCode}` : `${course?.courseCode} Exam Focus Mode`}
              </div>
              <div className="text-[11px] text-emerald-600 flex items-center gap-1 justify-end font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isThai ? 'ระบบตรวจจับพฤติกรรมทุจริตทำงาน' : 'Anti-Cheating Sensor Active'}</span>
              </div>
            </div>
            <button
              onClick={() => showToast(
                isThai ? 'แจ้งอาจารย์ผู้คุมสอบแล้ว' : 'Proctor Notified',
                isThai ? `ส่งสัญญาณขอความช่วยเหลือจากที่นั่ง ${seatNo} ไปยังอาจารย์แล้ว` : 'The laboratory proctor has been signaled to assist workstation ' + seatNo,
                'info'
              )}
              className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs text-gray-700 border border-gray-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>{isThai ? 'เรียกอาจารย์' : 'Call Proctor'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN EXAM WORKSPACE */}
      <main className="max-w-5xl mx-auto w-full px-4 py-8 flex-1">
        {/* Expired warning banner */}
        {isTimeExpired && sessionStep !== 'success' && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-red-900">
                {timeoutStatus === 'processing'
                  ? (isThai ? 'กำลังประมวลผลการส่งขั้นสุดท้าย...' : 'Processing final submission...')
                  : timeoutStatus === 'no_files'
                  ? (isThai ? 'ไม่มีไฟล์ถูกส่ง' : 'No files submitted')
                  : (isThai ? 'หมดเวลาการส่งข้อสอบแล้ว' : 'The exam submission period has ended')}
              </h3>
              <p className="text-xs text-red-700 mt-0.5">
                {timeoutStatus === 'processing'
                  ? (isThai ? 'ระบบกำลังรอไฟล์ที่เริ่มอัปโหลดก่อนหมดเวลา โดยมีเวลาผ่อนผัน 10 วินาที' : 'Uploads started before timeout may finish within the 10-second grace period.')
                  : timeoutStatus === 'no_files'
                  ? (isThai ? 'กรุณาติดต่ออาจารย์ผู้คุมสอบ' : 'Please contact the exam proctor/instructor.')
                  : (isThai ? 'พื้นที่อัปโหลดถูกล็อกแล้ว' : 'The upload area is locked.')}
              </p>
            </div>
          </div>
        )}

        {/* STEP 1: Upload Workspace (ST4 & ST5) */}
        {sessionStep === 'upload' && (
          <div className="space-y-6">
            {!canUpload && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-amber-900">
                    {isThai ? 'การอัปโหลดไฟล์ถูกล็อก' : 'File Upload Locked'}
                  </h3>
                  <p className="text-xs mt-0.5">{uploadLockedMessage}</p>
                </div>
              </div>
            )}

            {/* File Preparation Guide Card */}
            <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs text-left">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-bold text-gray-900">
                    {isThai ? 'คู่มือการเตรียมและส่งไฟล์ข้อสอบ (ขั้นตอน ST5)' : 'Exam Answer File Submission Guide (ST5)'}
                  </h2>
                </div>
                <Badge variant="neutral" size="sm">
                  {isThai ? `เครื่องสอบที่นั่ง ${seatNo}` : `Workstation ${seatNo}`}
                </Badge>
              </div>

              <div className="mt-3 text-xs text-gray-600 leading-relaxed space-y-2">
                <p>
                  <strong className="text-gray-900">{isThai ? 'ประเภทไฟล์ที่รองรับ:' : 'Accepted File Types:'}</strong>{' '}
                  <span className="font-mono text-blue-600 font-semibold">
                    {activeExam?.fileRequirements.acceptedExtensions.join(', ')}
                  </span>
                  {isThai ? (
                    <>
                      . ไฟล์ <code className="bg-gray-100 px-1.5 py-0.5 rounded text-amber-700 font-semibold">.zip</code> เป็นไฟล์บีบอัดสำหรับการส่งหลายไฟล์หรือโฟลเดอร์โครงการ ส่วนไฟล์{' '}
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-emerald-700 font-semibold">.py</code> สามารถส่งได้โดยตรงโดยไม่ต้องบีบอัด
                    </>
                  ) : (
                    <>
                      . A <code className="bg-gray-100 px-1.5 py-0.5 rounded text-amber-700 font-semibold">.zip</code> file is a compressed archive required for multiple files or asset directories. Standalone{' '}
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-emerald-700 font-semibold">.py</code> source files are accepted directly and do not require compression.
                    </>
                  )}
                </p>
                <p className="text-gray-500">
                  {isThai ? 'รูปแบบชื่อไฟล์ที่แนะนำ: ' : 'Naming recommendation: '}
                  <code className="text-gray-700 font-medium">{currentStudent?.studentCode}_final.zip</code>{' '}
                  {isThai ? 'หรือ' : 'or'}{' '}
                  <code className="text-gray-700 font-medium">{currentStudent?.studentCode}_task1.py</code>.
                  {isThai ? ' ขนาดไฟล์สูงสุดที่อนุญาตคือ ' : ' Maximum allowed file size is '}
                  <strong className="text-gray-900">{activeExam?.fileRequirements.maxSizeMb} MB</strong>.
                </p>
              </div>

              {/* Quick simulation helper buttons */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-gray-500">
                  {isThai ? 'ปุ่มทดสอบจำลอง:' : 'Quick Test Generators:'}
                </span>
                <button
                  type="button"
                  onClick={addSimulatedPyFile}
                  disabled={!canUpload}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-[11px] text-gray-700 border border-gray-200 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileCode className="w-3 h-3 text-emerald-600" />
                  <span>{isThai ? 'จำลองส่งไฟล์ .py' : 'Stage .py Solution File'}</span>
                </button>
                <button
                  type="button"
                  onClick={addSimulatedCorruptFile}
                  disabled={!canUpload}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-[11px] text-gray-700 border border-gray-200 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>{isThai ? 'จำลองไฟล์ 0KB ว่างเปล่า (ทดสอบ Error)' : 'Stage 0KB Empty File (Test Error State)'}</span>
                </button>
                <button
                  type="button"
                  onClick={addSimulatedFailedUpload}
                  disabled={!canUpload}
                  className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-[11px] text-red-700 border border-red-200 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <AlertCircle className="w-3 h-3" />
                  <span>{isThai ? 'จำลองอัปโหลดล้มเหลว' : 'Simulate Upload Failure'}</span>
                </button>
              </div>
            </section>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (canUpload) setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => canUpload ? fileInputRef.current?.click() : notifyUploadLocked()}
              className={`p-8 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
                !canUpload
                  ? 'border-gray-200 bg-gray-100/60 opacity-60 cursor-not-allowed'
                  : dragActive
                  ? 'border-blue-500 bg-blue-50/60 scale-101 shadow-md'
                  : 'border-gray-300 bg-white hover:bg-gray-50/80 hover:border-gray-400 shadow-xs'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={(activeExam?.fileRequirements.acceptedExtensions || ['.zip', '.py']).join(',')}
                onClick={(event) => event.stopPropagation()}
                onChange={handleManualFileSelect}
                className="hidden"
                disabled={!canUpload}
              />
              <UploadCloud className="w-12 h-12 mx-auto text-blue-500 mb-3" />
              <div className="text-sm font-semibold text-gray-900">
                {isThai ? 'ลากไฟล์คำตอบมาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์' : 'Drag & drop answer files here, or click to browse'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {isThai ? 'นามสกุลที่ยอมรับ: ' : 'Accepted extensions: '}
                <span className="font-mono text-gray-700 font-medium">
                  {(activeExam?.fileRequirements.acceptedExtensions || ['.zip', '.py']).join(', ')}
                </span> • {isThai ? 'ไม่เกิน ' : 'Max '}
                {activeExam?.fileRequirements.maxSizeMb} MB
              </div>
            </div>

            {/* Staged File List Table */}
            <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs text-left">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    {isThai ? `ไฟล์ที่เตรียมส่ง (${stagedFiles.length})` : `Files Prepared for Submission (${stagedFiles.length})`}
                  </span>
                </h3>
                <span className="text-xs text-gray-500">
                  {isThai ? 'ยังไม่ส่งจนกว่าจะกดเสร็จสิ้นการสอบ' : 'Not submitted until you finish the exam'}
                </span>
              </div>

              {!stagingLoaded ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  {isThai ? 'กำลังโหลดไฟล์ชั่วคราว...' : 'Loading staged files...'}
                </div>
              ) : stagedFiles.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  {isThai ? 'ยังไม่มีไฟล์ฉบับร่าง กรุณาอัปโหลดไฟล์คำตอบของคุณ' : 'No draft files yet. Upload your answers above.'}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {stagedFiles.map((file) => (
                    <div
                      key={file.uploadId}
                      className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            file.extension === '.zip'
                              ? 'bg-amber-50 text-amber-600 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          }`}
                        >
                          {file.extension === '.zip' ? (
                            <FileArchive className="w-5 h-5" />
                          ) : (
                            <FileCode className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-gray-900 truncate font-mono">
                            {file.submissionName}
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-2">
                            <span>{formatFileSize(file.sizeBytes)}</span>
                            <span>•</span>
                            <span className="uppercase">{file.extension.replace('.', '')}</span>
                            <span>•</span>
                            <span>
                              {isThai ? 'อัปเดต ' : 'Updated '}
                              {new Date(file.lastUpdated).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={`h-full transition-all duration-300 ${file.status === 'failed' || file.status === 'invalid' ? 'bg-red-500' : 'bg-blue-600'}`}
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                          {file.errorReason && (
                            <div className="text-[11px] text-red-600 mt-0.5 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              <span>{file.errorReason}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-medium border px-2.5 py-1 rounded-full flex items-center gap-1 ${getStagedStatusClass(file.status)}`}>
                          {file.status === 'ready' || file.status === 'submitted' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : file.status === 'uploading' ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5" />
                          )}
                          <span>{getStagedStatusLabel(file.status)}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openRenameDialog(file)}
                            disabled={!canUpload || file.status === 'submitted'}
                            className="px-2.5 py-1.5 rounded-lg text-xs text-blue-700 hover:bg-blue-50 border border-blue-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                            title={isThai ? 'เปลี่ยนชื่อ' : 'Rename'}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>{isThai ? 'เปลี่ยนชื่อ' : 'Rename'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(file.uploadId)}
                            disabled={!canUpload || file.status === 'submitted'}
                            className="px-2.5 py-1.5 rounded-lg text-xs text-red-700 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isThai ? 'ลบ' : 'Remove'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit Action Bar */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-gray-500">
                  {readyFiles.length >= requiredFileCount && !hasBlockingFiles
                    ? (isThai ? 'ไฟล์ทั้งหมดพร้อมสำหรับการส่งขั้นสุดท้าย' : 'All files are uploaded and ready for final submission.')
                    : (isThai ? `ต้องมีไฟล์พร้อมส่งอย่างน้อย ${requiredFileCount} ไฟล์ และไม่มีไฟล์ที่กำลังอัปโหลดหรือมีข้อผิดพลาด` : `Prepare at least ${requiredFileCount} ready file${requiredFileCount === 1 ? '' : 's'} and resolve all uploading, invalid, or failed files.`)}
                </span>

                <button
                  type="button"
                  disabled={!canFinishExam}
                  onClick={() => setShowConfirmModal(true)}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isThai ? 'เสร็จสิ้นการสอบและส่งไฟล์' : 'Finish Exam and Submit Files'}</span>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* STEP 2: ST6 Integrity Check Animation */}
        {sessionStep === 'checking' && (
          <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-2xl p-8 shadow-xl text-left animate-in fade-in duration-200">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <RefreshCw className="w-7 h-7 animate-spin text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {isThai ? 'กำลังตรวจสอบความสมบูรณ์ของไฟล์ (ST6)' : 'Checking Submitted Files (ST6)'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {isThai
                  ? 'ระบบกำลังตรวจสอบขนาดไบต์ การแตกไฟล์บีบอัด และคำนวณแฮชความถูกต้องโดยอัตโนมัติ'
                  : 'Automated byte verification, archive decompression test, and integrity hashing in progress.'}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-2.5 mb-6 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${integrityProgress}%` }}
              />
            </div>

            {/* Checklist items */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-gray-700">
                  {isThai ? '1. ตรวจสอบการมีอยู่ของไฟล์และโครงสร้างข้อมูล' : '1. Checking file presence & staged descriptors'}
                </span>
                {integrityCheckStep >= 1 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <span className="text-gray-400">{isThai ? 'รอดำเนินการ' : 'Pending'}</span>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-gray-700">
                  {isThai ? '2. ตรวจสอบขนาดไบต์ไม่เป็นศูนย์ (Non-Zero) และสตรีมไฟล์อ่านได้' : '2. Verifying non-zero size & readable file stream'}
                </span>
                {integrityCheckStep >= 2 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <span className="text-gray-400">{isThai ? 'รอดำเนินการ' : 'Pending'}</span>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-gray-700">
                  {isThai ? '3. ตรวจสอบนามสกุลไฟล์ที่ได้รับอนุญาต (.zip / .py)' : '3. Validating accepted extensions (.zip / .py)'}
                </span>
                {integrityCheckStep >= 3 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <span className="text-gray-400">{isThai ? 'รอดำเนินการ' : 'Pending'}</span>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-gray-700">
                  {isThai ? '4. คำนวณรหัสลับแฮช SHA-256 และส่งยืนยันไปยังหน้าจออาจารย์' : '4. Computing SHA-256 hash & proctor confirmation'}
                </span>
                {integrityCheckStep >= 4 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <span className="text-gray-400">{isThai ? 'รอดำเนินการ' : 'Pending'}</span>
                )}
              </div>
            </div>

            {/* If error occurred */}
            {integrityError && (
              <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-red-900 mb-0.5">
                    {isThai ? 'การตรวจสอบความสมบูรณ์ล้มเหลว:' : 'Integrity Check Failed:'}
                  </strong>
                  {integrityError}
                  <button
                    onClick={() => setSessionStep('upload')}
                    className="mt-3 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors block cursor-pointer"
                  >
                    {isThai ? 'กลับไปแก้ไขการอัปโหลด' : 'Return to Upload'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: ST7 Submission Successful Confirmation */}
        {sessionStep === 'success' && (
          <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-2xl p-8 shadow-xl text-left animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {isThai ? 'ยืนยันการส่งไฟล์สำเร็จ (ST7)' : 'Submission Confirmation (ST7)'}
              </h2>
              <p className="text-xs text-emerald-700 font-medium mt-1">
                {isThai
                  ? 'ไฟล์คำตอบข้อสอบของคุณได้รับการบันทึก ตรวจสอบความถูกต้อง และปิดผนึกเรียบร้อยแล้ว'
                  : 'Your examination answer files have been received, verified, and sealed.'}
              </p>
            </div>

            {timeoutStatus === 'submitted' && (
              <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm font-semibold text-blue-800 text-center">
                Time is up. Your prepared files have been submitted automatically.
              </div>
            )}

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2.5 text-xs mb-6">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">{isThai ? 'วิชา & กลุ่มเรียน:' : 'Course & Section:'}</span>
                <span className="font-semibold text-gray-900 font-mono">
                  {course?.courseCode} - {isThai ? 'กลุ่ม' : 'Sec'} {activeExam?.sectionNo}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">{isThai ? 'ผู้เข้าสอบ:' : 'Examinee:'}</span>
                <span className="font-semibold text-gray-900">
                  {currentStudent?.fullName} ({currentStudent?.studentCode})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">{isThai ? 'ที่นั่งสอบ & เครื่อง:' : 'Station / Workstation:'}</span>
                <span className="font-mono text-blue-700 font-medium">
                  {isThai ? `ที่นั่ง ${seatNo}` : `Seat ${seatNo}`} • {seatStation?.machineNo}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">{isThai ? 'เวลาที่บันทึกการส่ง:' : 'Submission Timestamp:'}</span>
                <span className="font-mono text-emerald-700 font-semibold">
                  {existingSubmission?.submittedAt
                    ? new Date(existingSubmission.submittedAt).toISOString()
                    : new Date().toISOString()}
                </span>
              </div>
              <div className="py-2 border-b border-gray-200">
                <span className="text-gray-500 block mb-2">
                  {isThai ? 'ไฟล์ที่ส่ง:' : 'Submitted Files:'}
                </span>
                <div className="space-y-1.5">
                  {(existingSubmission?.files || []).map((file) => (
                    <div key={file.fileName} className="flex items-center justify-between gap-3 rounded-lg bg-white border border-gray-200 px-3 py-2">
                      <span className="font-mono font-medium text-gray-800 truncate">{file.fileName}</span>
                      <span className="font-mono text-gray-500 shrink-0">
                        {formatFileSize(file.sizeKb * 1024)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">{isThai ? 'รหัสแฮชยืนยันความสมบูรณ์:' : 'Integrity Hash:'}</span>
                <span className="font-mono text-[11px] text-gray-700 truncate max-w-[200px]">
                  e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                </span>
              </div>
            </div>

            <div className="text-xs text-gray-600 text-center mb-6 leading-relaxed">
              {isThai
                ? 'คุณสามารถออกจากห้องสอบได้ตามระเบียบที่กำหนด และออกจากระบบเครื่องคอมพิวเตอร์ ขอบคุณที่ปฏิบัติตามมาตรฐานความโปร่งใสของ SecureLab'
                : 'You may now leave your answer files stored on the station desktop and log out of the workstation. Thank you for following the SecureLab examination integrity procedures.'}
            </div>

            <button
              onClick={() => {
                showToast(
                  isThai ? 'ออกจากเซสชันแล้ว' : 'Session Ended',
                  isThai ? 'ออกจากระบบการสอบอย่างปลอดภัย' : 'Exited exam session securely.',
                  'info'
                );
                setRole(null);
              }}
              className="w-full py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{isThai ? 'ยืนยันการออกจากห้องสอบ' : 'Confirm Exit from Exam Room'}</span>
            </button>
          </div>
        )}
      </main>

      {/* Footer / Workstation Security Bar */}
      <footer className="bg-white border-t border-gray-200 px-6 py-3 text-center text-xs text-gray-500">
        {isThai ? 'เครื่องสอบเชื่อมโยงกับ MAC:' : 'Workstation Session Bound to MAC:'}{' '}
        <strong className="font-mono text-gray-800">{seatStation?.mac || 'AC:DE:48:00:11:22'}</strong> •{' '}
        {isThai ? 'ไอพีประจำเครื่อง:' : 'Static IP:'}{' '}
        <strong className="font-mono text-gray-800">{seatStation?.ip || '192.168.10.11'}</strong>
      </footer>

      <Modal
        isOpen={!!renameTarget}
        onClose={closeRenameDialog}
        title={isThai ? 'เปลี่ยนชื่อไฟล์' : 'Rename File'}
        maxWidth="sm"
        footer={
          <>
            <button
              type="button"
              onClick={closeRenameDialog}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              {isThai ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              type="submit"
              form="rename-file-form"
              disabled={!!renameError || !renameTarget || !canUpload || renameTarget.status === 'submitted'}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isThai ? 'บันทึกชื่อไฟล์' : 'Save filename'}
            </button>
          </>
        }
      >
        <form id="rename-file-form" onSubmit={handleRenameFile} className="space-y-3 text-left">
          <div>
            <label htmlFor="rename-file-input" className="block text-xs font-semibold text-gray-700 mb-1.5">
              {isThai ? 'ชื่อไฟล์สำหรับส่ง' : 'Submission filename'}
            </label>
            <div className="flex rounded-xl border border-gray-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
              <input
                id="rename-file-input"
                type="text"
                value={renameValue}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setRenameValue(nextValue);
                  setRenameError(renameTarget ? getRenameValidationError(nextValue, renameTarget) : null);
                }}
                autoFocus
                aria-invalid={!!renameError}
                aria-describedby="rename-file-feedback rename-file-rules"
                className="min-w-0 flex-1 px-3 py-2.5 text-sm font-mono outline-none"
              />
              <span className="px-3 py-2.5 bg-gray-100 border-l border-gray-300 text-sm font-mono text-gray-600 select-none">
                {renameTarget?.extension}
              </span>
            </div>
            <div className="mt-1.5 flex items-start justify-between gap-3 text-xs">
              <div id="rename-file-feedback" aria-live="polite">
                {renameError ? (
                  <span className="text-red-600">{renameError}</span>
                ) : renameValue.trim() ? (
                  <span className="text-emerald-600 font-medium">Filename is available.</span>
                ) : null}
              </div>
              <span className={`font-mono shrink-0 ${renameValue.length >= 100 ? 'text-amber-600' : 'text-gray-500'}`}>
                {renameValue.length}/100 {isThai ? 'ตัวอักษร' : 'characters'}
              </span>
            </div>
          </div>
          <div id="rename-file-rules" className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
            <div className="font-semibold text-gray-800 mb-1.5">
              {isThai ? 'กฎการตั้งชื่อไฟล์' : 'Filename rules'}
            </div>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                {isThai
                  ? 'ใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข เครื่องหมายขีดกลาง (-) และขีดล่าง (_)'
                  : 'Use only English letters, numbers, hyphens (-), and underscores (_).'}
              </li>
              <li>{isThai ? 'ชื่อไฟล์ต้องมีความยาว 1–100 ตัวอักษร' : 'The filename must contain 1–100 characters.'}</li>
              <li>{isThai ? 'ชื่อไฟล์ต้องไม่ซ้ำกับไฟล์อื่นในการส่งครั้งนี้' : 'The filename must be unique within this submission.'}</li>
            </ul>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal before final submission */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={isThai ? 'ยืนยันการเสร็จสิ้นการสอบ' : 'Confirm Finish Exam'}
        footer={
          <>
            <button
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              {isThai ? 'ยกเลิก' : 'Cancel'}
            </button>
            <button
              onClick={startSubmissionProcess}
              disabled={!canFinishExam}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isThai ? 'เสร็จสิ้นและส่งไฟล์' : 'Finish Exam and Submit Files'}
            </button>
          </>
        }
      >
        <div className="text-left text-xs text-gray-700 space-y-3">
          <p>
            {isThai
              ? 'คุณแน่ใจหรือไม่ว่าต้องการส่งไฟล์ข้อสอบเหล่านี้? ระบบจะตรวจสอบขนาดไฟล์ ความสามารถในการเปิดอ่าน และสร้างบันทึกดิจิทัลที่ป้องกันการแก้ไขสำหรับอาจารย์ผู้คุมสอบ'
              : 'Are you sure you want to submit these exam files? The system will verify non-zero byte size, structural readability, and compile a tamper-evident audit record for proctor review.'}
          </p>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="font-semibold block mb-1 text-gray-900">
              {isThai ? 'ไฟล์ที่จะส่งรับการตรวจสอบ:' : 'Complete staged file list:'}
            </span>
            <ul className="space-y-1.5 text-gray-600 font-mono">
              {stagedFiles.map((file) => (
                <li key={file.uploadId} className="flex items-center justify-between gap-3">
                  <span className="truncate">{file.submissionName} ({formatFileSize(file.sizeBytes)})</span>
                  <span className="shrink-0 font-sans">{getStagedStatusLabel(file.status)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};
