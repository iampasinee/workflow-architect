import test from 'node:test';
import assert from 'node:assert/strict';
import { initialExamSessions } from '../data/initialData';
import { reopeningDeadline, scheduledDeadline, submissionDeadline } from './examTiming';

const now = new Date('2030-01-01T12:00:00');
const grant = (minute: string) => ({ reopenedUntil: `2030-01-01T12:${minute}:00`, reason: 'ทดสอบ' });
for (const [individual, room, expected] of [['05', '15', '15'], ['30', '15', '30'], ['15', '15', '15'], ['05', undefined, '05'], [undefined, '15', '15']] as const) {
  test(`latest active reopening ${individual}/${room}`, () => {
    const exam = { ...initialExamSessions[0], reopenedStudents: { ...(individual ? { A: grant(individual) } : {}), ...(room ? { '*': grant(room) } : {}) } };
    assert.equal(reopeningDeadline(exam, 'A', now), Date.parse(grant(expected).reopenedUntil));
    assert.equal(reopeningDeadline(exam, 'B', now), room ? Date.parse(grant(room).reopenedUntil) : undefined);
  });
}
test('expired, revoked and invalid grants cannot mask active permissions and boundary is exclusive', () => {
  const exam = { ...initialExamSessions[0], reopenedStudents: { A: grant('05'), '*': grant('15') } };
  assert.equal(reopeningDeadline(exam, 'A', new Date('2030-01-01T12:10:00')), Date.parse(grant('15').reopenedUntil));
  assert.equal(reopeningDeadline(exam, 'A', new Date('2030-01-01T12:15:00')), undefined);
  exam.reopenedStudents.A = grant('30');
  assert.equal(reopeningDeadline(exam, 'A', new Date('2030-01-01T12:20:00')), Date.parse(grant('30').reopenedUntil));
  assert.equal(reopeningDeadline({ reopenedStudents: { '*': { ...grant('30'), revoked: true }, A: { reopenedUntil: 'invalid', reason: '' } } }, 'A', now), undefined);
});
test('global and individual cumulative extensions stay isolated and reopening leaves schedule unchanged', () => {
  const exam = { ...initialExamSessions[0], examDate: '2030-01-01', endTime: '12:00', adjustedMinutes: 5, individualAdjustedMinutes: { A: 10 }, reopenedStudents: { A: grant('30') } };
  assert.equal(scheduledDeadline(exam, 'A'), Date.parse('2030-01-01T12:15:00'));
  assert.equal(scheduledDeadline(exam, 'B'), Date.parse('2030-01-01T12:05:00'));
  assert.equal(submissionDeadline(exam, 'A', now), Date.parse('2030-01-01T12:30:00'));
  assert.equal(exam.endTime, '12:00');
  assert.equal(exam.adjustedMinutes, 5);
});
