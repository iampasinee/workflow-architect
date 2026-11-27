import type { ExamSession } from '../types';

export function reopeningDeadline(exam: Pick<ExamSession, 'reopenedStudents'>, studentId: string, now: Date): number | undefined {
  const deadlines = [exam.reopenedStudents?.['*'], exam.reopenedStudents?.[studentId]]
    .filter((grant) => grant && !grant.revoked)
    .map((grant) => Date.parse(grant!.reopenedUntil))
    .filter((deadline) => Number.isFinite(deadline) && deadline > now.getTime());
  return deadlines.length ? Math.max(...deadlines) : undefined;
}

export function scheduledDeadline(exam: Pick<ExamSession, 'examDate' | 'endTime' | 'adjustedMinutes' | 'individualAdjustedMinutes'>, studentId?: string): number {
  return Date.parse(`${exam.examDate}T${exam.endTime}`) +
    ((exam.adjustedMinutes || 0) + (studentId ? exam.individualAdjustedMinutes?.[studentId] || 0 : 0)) * 60_000;
}

export function submissionDeadline(exam: ExamSession, studentId: string, now: Date): number {
  return Math.max(scheduledDeadline(exam, studentId), reopeningDeadline(exam, studentId, now) || -Infinity);
}
