import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAuditLog, auditLogView } from './auditState';

test('legacy audit adapter preserves original evidence and remains idempotent', () => {
  const old = { id: 'old', performedBy: 'A', role: 'Admin', target: 'student', ip: '10.0.0.1', action: 'edit', timestamp: '10:00' };
  const log = normalizeAuditLog(old);
  assert.equal(auditLogView(log).performedBy, 'A');
  assert.deepEqual(log.legacy, old);
  assert.deepEqual(normalizeAuditLog(log), log);
  assert.equal(log.actorRole, undefined);
});
test('malformed audit data is retained and unknown evidence is explicit', () => {
  const log = normalizeAuditLog('broken', 3);
  assert.equal(log.legacy, 'broken');
  assert.equal(auditLogView(log).ip, 'ไม่ทราบ');
  assert.equal(auditLogView(log).status, 'warning');
});
