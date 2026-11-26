import React, { useState } from 'react';
import type { Student } from '../../types';
import { readRosterFile, reviewRoster, rosterHeader } from '../../services/rosterImport';

interface Props {
  students: Student[];
  selected?: string[];
  onPending: (pending: boolean) => void;
  onChange: (ids?: string[]) => void;
}

export function ExamRosterImport({ students, selected, onChange, onPending }: Props) {
  const [preview, setPreview] = useState<ReturnType<typeof reviewRoster>>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const sample = students[0]?.studentCode || '6706022510018';
  const csv = '\uFEFF' + rosterHeader.join(',') + '\r\n1,' + sample + ',s' + sample + '@email.kmutnb.ac.th,"' + (students[0]?.fullName || 'ชื่อ นามสกุล').replace(/"/g, '""') + '"\r\n';
  async function inspect(file?: File) {
    setPreview([]); setMessage('');
    if (!file) { onPending(false); return; }
    onPending(true);
    setBusy(true);
    try { setPreview(reviewRoster(await readRosterFile(file), students)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'อ่านไฟล์ไม่สำเร็จ'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3 rounded-2xl border bg-white p-4 text-sm">
    <h3 className="font-bold">นำเข้ารายชื่อผู้มีสิทธิ์สอบ</h3>
    <p className="text-xs text-gray-600">ใช้ CSV แบบ UTF-8, Excel (.xlsx ชีตแรก) หรือ PDF ตารางข้อความ เรียงคอลัมน์ ลำดับ · เลขประจำตัวนักศึกษา · อีเมล · ชื่อ - สกุล รหัสมีขีดได้ จำกัดไฟล์ละ 10 MB ระบบจับคู่กับนักศึกษาที่เปิดใช้งานในตอนเรียนนี้</p>
    <a className="block text-xs font-semibold text-blue-700 underline" download="รายชื่อผู้เข้าสอบ.csv" href={'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)}>ดาวน์โหลดตัวอย่าง CSV</a>
    <input type="file" aria-label="เลือกไฟล์รายชื่อผู้เข้าสอบ" accept=".csv,.xlsx,.pdf" disabled={busy} onChange={(e) => { void inspect(e.target.files?.[0]); e.target.value = ''; }} />
    {busy && <p>กำลังอ่านไฟล์…</p>}
    {message && <p role="alert" className="text-red-700">{message}</p>}
    {!!preview.length && <><div className="max-h-52 overflow-auto rounded-lg border"><table className="w-full text-left text-xs"><thead><tr>{['แถว', 'รหัส', 'ชื่อในไฟล์', 'รายชื่อในระบบ / ผลตรวจ'].map((h) => <th className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>{preview.map((row) => <tr key={row.line} className="border-t"><td className="p-2">{row.line}</td><td>{row.studentCode}</td><td>{row.fullName}</td><td className={row.error ? 'text-red-700' : ''}>{row.error || row.student?.fullName}</td></tr>)}</tbody></table></div>
      <button type="button" disabled={preview.some((row) => row.error)} className="rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-40" onClick={() => { onChange(preview.map((row) => row.student!.id)); onPending(false); setPreview([]); }}>ยืนยันใช้รายชื่อ {preview.length} คน</button></>}
    {!busy && (message || preview.length > 0) && <button type="button" className="rounded-lg border px-3 py-2 text-xs" onClick={() => { setPreview([]); setMessage(''); onPending(false); }}>ยกเลิกการนำเข้า</button>}
    <p className="text-xs">{selected ? 'ใช้รายชื่อจากไฟล์ ' + selected.length + ' คน' : 'ใช้รายชื่อทั้งตอนเรียน'}</p>
    {selected && !busy && <button type="button" className="text-xs font-semibold text-blue-700" onClick={() => { onChange(undefined); onPending(false); setMessage(''); setPreview([]); }}>กลับไปใช้รายชื่อทั้งตอนเรียน</button>}
  </section>;
}

