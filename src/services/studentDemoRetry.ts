import type { ExamSession, Submission } from '../types';
import { DEMO_TIME_ENABLED } from './demoTime';
import { canSubmitToExam } from './examStatus';

/** Frontend-only workflow switch. Disable with the demo controls in a non-demo shell. */
export const FRONTEND_DEMO_MODE = DEMO_TIME_ENABLED;
export const demoSubmissionStorageKey = 'securelab_demo_submission_attempts_v1';

export const canSubmitStudentAttempt = (
  exam: ExamSession,
  now: Date,
  hasActiveReopening: boolean,
  hasFinalSubmission: boolean,
  demoMode = FRONTEND_DEMO_MODE,
): boolean => (demoMode || canSubmitToExam(exam, now, hasActiveReopening)) &&
  (demoMode || !hasFinalSubmission || hasActiveReopening);

export const isDemoSubmissionRetry = (
  hasFinalSubmission: boolean,
  hasActiveReopening: boolean,
  demoMode = FRONTEND_DEMO_MODE,
): boolean => demoMode && hasFinalSubmission && !hasActiveReopening;

export const getStudentAttemptStagingKey = (
  examId: string,
  studentId: string,
  hasFinalSubmission: boolean,
  hasActiveReopening: boolean,
  attemptId: string,
  demoMode = FRONTEND_DEMO_MODE,
): string => {
  const baseKey = `${examId}:${studentId}`;
  return isDemoSubmissionRetry(hasFinalSubmission, hasActiveReopening, demoMode)
    ? `${baseKey}:demo:${attemptId}`
    : baseKey;
};

export const recordStudentSubmission = (
  canonical: Submission[],
  demoAttempts: Submission[],
  submission: Submission,
  demoRetry: boolean,
): { canonical: Submission[]; demoAttempts: Submission[] } => demoRetry
  ? { canonical, demoAttempts: [...demoAttempts, submission] }
  : {
    canonical: [
      ...canonical.filter((item) => !(item.examId === submission.examId && item.studentId === submission.studentId)),
      submission,
    ],
    demoAttempts,
  };
