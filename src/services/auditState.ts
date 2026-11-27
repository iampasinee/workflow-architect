import type { AuditLog, AuditLogEntry } from '../types';

export function normalizeAuditCollection(value: unknown): AuditLog[] {
  return (Array.isArray(value) ? value : [value]).map(normalizeAuditLog);
}

/** Preserve legacy payloads and unknown evidence without guessing actors or timestamps. */
export function normalizeAuditLog(value: unknown, index = 0): AuditLog {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const string = (key: string) => typeof raw[key] === 'string' ? raw[key] as string : undefined;
  return {
    ...raw,
    id: string('id') || `legacy-audit-${index}`,
    timestamp: string('timestamp') || 'ไม่ทราบเวลา',
    actor: string('actor') || string('performedBy') || 'ไม่ทราบผู้ดำเนินการ',
    action: string('action') || 'ไม่ทราบกิจกรรม',
    details: string('details') || string('target') || '',
    provenance: raw.provenance === 'frontend' ? 'frontend' : 'legacy',
    legacy: raw.legacy ?? value,
  };
}

export function auditLogView(log: AuditLog): AuditLogEntry {
  const legacy = log.legacy && typeof log.legacy === 'object' ? log.legacy as Record<string, unknown> : {};
  return {
    id: log.id, timestamp: log.timestamp, action: log.action, performedBy: log.actor,
    role: log.actorRole === 'teacher' ? 'Teacher' : log.actorRole === 'admin' ? 'Admin' : log.actorRole === 'student' ? 'Student' : typeof legacy.role === 'string' ? legacy.role : 'ไม่ทราบบทบาท',
    target: log.studentId || log.examId || log.details,
    ip: typeof legacy.ip === 'string' ? legacy.ip : 'ไม่ทราบ',
    status: log.result === 'success' || log.result === 'failure' ? log.result : 'warning',
  };
}
