import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { ViolationType } from '../../types';

const riskLabels: Record<ViolationType, string> = {
  unauthorized_website: 'เว็บไซต์นอกเหนือรายการที่อนุญาต',
  duplicate_login: 'เข้าสู่ระบบซ้ำ',
  unauthorized_device: 'เครื่องที่ไม่ได้รับอนุญาต',
  tab_switch: 'สลับหน้าต่าง',
  peripheral_connected: 'เชื่อมต่ออุปกรณ์เสริม',
};

export function ExamActivityReport({ examId }: { examId: string }) {
  const [studentId, setStudentId] = useState('');
  const [eventType, setEventType] = useState<ViolationType>('tab_switch');
  const { auditLogs, violations, studentDirectory, seatAssignments, triggerViolation, examSessions } = useApp();
  const seats = seatAssignments.filter((seat) => seat.examId === examId);
  const seat = seats.find((item) => item.studentId === studentId);
  const moves = auditLogs.filter((log) => log.examId === examId);
  const risks = violations.filter((event) => event.examId === examId);
  const name = (id?: string) => studentDirectory.find((student) => student.id === id)?.fullName || id || '—';
  return <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 text-sm">
    <h2 className="font-bold">รายงานกิจกรรมประจำรอบสอบ</h2>
    <details><summary className="cursor-pointer font-semibold">ประวัติการจัดที่นั่งและย้ายเครื่อง ({moves.length})</summary>
      <ul className="max-h-72 divide-y overflow-auto">{moves.map((log) => <li className="py-2" key={log.id}><strong>{log.action} · {name(log.studentId)}</strong><p>{log.details}</p><small>{new Date(log.timestamp).toLocaleString('th-TH')} · {log.actor}</small></li>)}</ul></details>
    {examSessions.some((exam) => exam.id === examId) && seats.length > 0 && <details><summary className="cursor-pointer text-xs text-blue-700">จำลองเหตุการณ์เพื่อตรวจรายงาน</summary>
      <div className="mt-2 flex flex-wrap gap-2">
        <select aria-label="ผู้เข้าสอบที่เกิดเหตุ" className="rounded-lg border p-2" value={studentId} onChange={(e) => setStudentId(e.target.value)}><option value="">เลือกผู้เข้าสอบ</option>{seats.map((item) => <option key={item.studentId} value={item.studentId}>{item.seatNo} · {name(item.studentId)}</option>)}</select>
        <select aria-label="ประเภทเหตุการณ์" className="rounded-lg border p-2" value={eventType} onChange={(e) => setEventType(e.target.value as ViolationType)}>{Object.entries(riskLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select>
        <button type="button" disabled={!seat} className="rounded-lg bg-blue-600 px-3 text-white disabled:opacity-40" onClick={() => seat && triggerViolation(examId, studentId, seat.seatNo, eventType, 'จำลองเหตุการณ์: ' + riskLabels[eventType])}>บันทึกเหตุการณ์จำลอง</button>
      </div></details>}
    <details><summary className="cursor-pointer font-semibold">เหตุการณ์จำลองที่ควรตรวจสอบ ({risks.length})</summary>
      <p className="my-2 text-xs text-gray-600">อาจารย์ใช้เหตุการณ์เหล่านี้ประกอบการตรวจสอบ การย้ายที่นั่งที่อาจารย์อนุมัติจะอยู่ในประวัติการจัดที่นั่ง</p>
      <ul className="max-h-72 divide-y overflow-auto">{risks.map((event) => <li className="py-2" key={event.id}><strong>{riskLabels[event.type]} · {name(event.studentId)}</strong><p>{event.detail}</p><small>{event.detectedAt} · ที่นั่ง {event.seatNo} · {event.acknowledged ? 'รับทราบแล้ว' : 'รอตรวจสอบ'}</small></li>)}</ul></details>
  </section>;
}

