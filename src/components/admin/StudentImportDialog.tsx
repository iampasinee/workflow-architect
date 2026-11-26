import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { readRosterFile, reviewNewStudents, rosterHeader } from '../../services/rosterImport';
import { getAdmissionYearOptions } from '../../utils/academicYear';
import { Modal } from '../common/Modal';
import { AcademicCascade, emptyAcademicSelection } from './AcademicCascade';

const example = [
  rosterHeader.join(','),
  '1,67-099999-9001-1,s6709999990011@email.kmutnb.ac.th,สมชาย ตัวอย่าง',
  '2,67-099999-9002-1,s6709999990021@email.kmutnb.ac.th,กมล ตัวอย่าง',
].join('\r\n');

export function StudentImportDialog({ onClose }: { onClose: () => void }) {
  const { students, mockAuthUsers, importStudents } = useApp();
  const [selection, setSelection] = useState(emptyAcademicSelection);
  const [year, setYear] = useState('');
  const [fileName, setFileName] = useState('');
  const [table, setTable] = useState<string[][] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const preview = useMemo(() => {
    if (!table) return { rows: [], error: '' };
    try {
      return { rows: reviewNewStudents(table, students, mockAuthUsers.map((user) => user.email)), error: '' };
    } catch (cause) {
      return { rows: [], error: cause instanceof Error ? cause.message : 'ตรวจสอบตารางไม่สำเร็จ' };
    }
  }, [table, students, mockAuthUsers]);
  const invalidCount = preview.rows.filter((row) => row.error).length;
  const ready = !busy && preview.rows.length > 0 && !invalidCount && selection.majorId && year;

  async function selectFile(file?: File) {
    if (!file) return;
    setTable(null);
    setError('');
    setFileName(file.name);
    setBusy(true);
    try {
      setTable(await readRosterFile(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'อ่านไฟล์ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  function confirm() {
    if (!ready || !table) return;
    const result = importStudents(table, selection.majorId, Number(year));
    if (result.success) onClose();
    else setError(result.error || 'นำเข้าไม่สำเร็จ');
  }

  return <Modal isOpen onClose={onClose} title="นำเข้านักศึกษาใหม่" maxWidth="4xl" footer={<>
    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">ยกเลิก</button>
    <button type="button" disabled={!ready} onClick={confirm} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
      {preview.rows.length ? `ยืนยันเพิ่มนักศึกษา ${preview.rows.length} คน` : 'ยืนยันเพิ่มนักศึกษา'}
    </button>
  </>}>
    <div className="space-y-5 text-left">
      <section className="space-y-3">
        <p className="text-sm font-semibold text-slate-800">เลือกสาขาวิชาและปีที่เข้าศึกษาสำหรับทุกคนในไฟล์นี้</p>
        <AcademicCascade value={selection} onChange={setSelection} required />
        <label className="block text-xs font-semibold text-slate-700">ปีที่เข้าศึกษา
          <select value={year} onChange={(event) => setYear(event.target.value)} className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="">เลือกปีที่เข้าศึกษา</option>
            {getAdmissionYearOptions().map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </section>
      <section className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold">ไฟล์รายชื่อนักศึกษา</p>
        <p className="text-xs text-slate-600">ใช้ CSV แบบ UTF-8, Excel (.xlsx ชีตแรก) หรือ PDF แบบตารางข้อความ ขนาดไม่เกิน 10 MB เรียงคอลัมน์ตามตัวอย่าง รหัสนักศึกษามีขีดได้</p>
        <a download="ตัวอย่างนำเข้านักศึกษา.csv" href={'data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFF' + example)} className="inline-block text-sm font-semibold text-blue-700 underline">ดาวน์โหลดตัวอย่าง CSV</a>
        <input type="file" aria-label="เลือกไฟล์นำเข้านักศึกษา" accept=".csv,.xlsx,.pdf" disabled={busy} className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-2" onChange={(event) => { void selectFile(event.target.files?.[0]); event.target.value = ''; }} />
      </section>
      {busy && <p role="status" className="text-sm">กำลังอ่านไฟล์…</p>}
      {(error || preview.error) && <p role="alert" className="text-sm text-red-700">{error || preview.error}</p>}
      {preview.rows.length > 0 && <section className="space-y-2">
        <p className="break-all text-sm font-semibold">{fileName} · {preview.rows.length} รายชื่อ</p>
        {invalidCount > 0 && <p role="alert" className="text-sm text-red-700">กรุณาแก้ไข {invalidCount} แถวแล้วเลือกไฟล์อีกครั้ง</p>}
        <div className="max-h-64 overflow-auto rounded-xl border"><table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-50"><tr>{['แถว', 'รหัสนักศึกษา', 'ชื่อ-นามสกุล', 'อีเมล', 'ผลตรวจ'].map((label) => <th key={label} className="p-2">{label}</th>)}</tr></thead>
          <tbody>{preview.rows.map((row) => <tr key={row.line} className="border-t [&>td]:p-2"><td>{row.line}</td><td>{row.studentCode}</td><td>{row.fullName}</td><td>{row.email}</td><td className={row.error ? 'text-red-700' : 'text-emerald-700'}>{row.error || 'พร้อมเพิ่ม'}</td></tr>)}</tbody>
        </table></div>
      </section>}
    </div>
  </Modal>;
}
