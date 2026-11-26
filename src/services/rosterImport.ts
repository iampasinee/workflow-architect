import type { Student } from '../types';
import { parseStudentUniversityEmail } from './authState';

export const rosterHeader = ['ลำดับ', 'เลขประจำตัวนักศึกษา', 'อีเมล', 'ชื่อ - สกุล'];
const headerKey = (text: string) => text.trim().toLowerCase().replace(/[\s_-]/g, '');

function rosterRows(table: string[][]) {
  const headers = (table[0] || []).map(headerKey);
  const code = headers.findIndex((key) => ['studentcode', 'studentid', 'เลขประจำตัวนักศึกษา', 'รหัสนักศึกษา'].includes(key));
  const name = headers.findIndex((key) => ['fullname', 'ชื่อสกุล', 'ชื่อนามสกุล'].includes(key));
  let email = headers.findIndex((key) => ['email', 'อีเมล', 'อีเมล์'].includes(key));
  if (email < 0 && code === 1 && name === 3 && !headers[2]) email = 2;
  if (Math.min(code, name, email) < 0) throw new Error('ไม่พบหัวคอลัมน์รหัสนักศึกษา อีเมล หรือชื่อ-สกุล กรุณาตรวจสอบไฟล์ตามตัวอย่าง');
  const seen = new Set<string>();
  const rows = table.slice(1).map((row, index) => {
    const studentCode = (row[code] || '').trim().replace(/-/g, '');
    const address = (row[email] || '').trim().toLowerCase();
    const fullName = (row[name] || '').trim();
    let error = '';
    if (!/^\d{10,15}$/.test(studentCode) || !fullName) error = 'รหัสหรือชื่อไม่ครบ';
    else if (address !== 's' + studentCode + '@email.kmutnb.ac.th') error = 'อีเมลไม่ตรงกับรหัสนักศึกษา';
    else if (seen.has(studentCode)) error = 'รหัสซ้ำในไฟล์';
    seen.add(studentCode);
    return { line: index + 2, studentCode, fullName, email: address, error };
  });
  if (!rows.length) throw new Error('ไฟล์นี้ไม่มีรายชื่อนักศึกษา');
  return rows;
}

export function reviewRoster(table: string[][], students: Student[]) {
  return rosterRows(table).map((row) => {
    const matches = students.filter((student) => student.studentCode.replace(/-/g, '') === row.studentCode);
    return { ...row, student: matches[0], error: row.error || (matches.length !== 1 ? 'ไม่พบรายชื่อที่ตรงกันเพียงคนเดียวในตอนเรียน' : '') };
  });
}

export function reviewNewStudents(table: string[][], students: Student[], accountEmails: string[]) {
  const codes = new Set(students.map((student) => student.studentCode.trim().replace(/-/g, '')));
  const emails = new Set([...accountEmails, ...students.map((student) => student.email)].map((email) => email.trim().toLowerCase()));
  return rosterRows(table).map((row) => {
    let error = row.error;
    if (!error && (codes.has(row.studentCode) || emails.has(row.email))) error = 'มีรหัสนักศึกษาหรืออีเมลนี้ในระบบแล้ว';
    if (!error && !parseStudentUniversityEmail(row.email)) error = 'อีเมลไม่ตรงตามรูปแบบบัญชีนักศึกษาที่ลงทะเบียนได้';
    if (!error && row.fullName.split(/\s+/).length < 2) error = 'กรุณาระบุทั้งชื่อและนามสกุล';
    return { ...row, error };
  });
}

export async function readRosterFile(file: File): Promise<string[][]> {
  if (file.size > 10 * 1024 * 1024) throw new Error('กรุณาเลือกไฟล์ไม่เกิน 10 MB');
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'csv') {
    const { parse } = await import('papaparse');
    const result = parse<string[]>(await file.text(), { delimiter: ',', skipEmptyLines: 'greedy' });
    if (result.errors.length) throw new Error('อ่าน CSV ไม่สำเร็จ กรุณาตรวจสอบเครื่องหมายคำพูดและคอลัมน์');
    return result.data;
  }
  if (extension === 'xlsx') {
    const { readSheet } = await import('read-excel-file/browser');
    return (await readSheet(file, 1)).map((row) => row.map((cell) => String(cell ?? '')));
  }
  if (extension !== 'pdf') throw new Error('รองรับ CSV, Excel (.xlsx) และ PDF แบบข้อความ');
  const pdf = await import('pdfjs-dist');
  pdf.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  const task = pdf.getDocument({ data: await file.arrayBuffer(), enableXfa: false });
  try {
    const doc = await task.promise;
    const rows = [rosterHeader];
    for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
      const page = await doc.getPage(pageNo);
      const content = await page.getTextContent();
      const lines: { y: number; parts: { x: number; text: string }[] }[] = [];
      for (const item of content.items) {
        if (!('str' in item) || !item.str.trim()) continue;
        let line = lines.find((candidate) => Math.abs(candidate.y - item.transform[5]) < 2);
        if (!line) { line = { y: item.transform[5], parts: [] }; lines.push(line); }
        line.parts.push({ x: item.transform[4], text: item.str.trim() });
      }
      let count = 0;
      for (const line of lines.sort((a, b) => b.y - a.y)) {
        const text = line.parts.sort((a, b) => a.x - b.x).map((part) => part.text).join(' ');
        if (!/\d{4}|@/.test(text)) continue;
        const match = /^(?:(\d+)\s+)?([\d-]{10,20})\s+(\S+@\S+)\s+(.+)$/i.exec(text);
        if (!match) throw new Error('อ่านแถวข้อมูลใน PDF หน้า ' + pageNo + ' ไม่ได้ กรุณาใช้ตารางข้อความตามตัวอย่างหรือส่งออกเป็น CSV');
        rows.push([match[1] || '', match[2], match[3], match[4]]);
        count++;
      }
      if (!count) throw new Error('ไม่พบตารางข้อความใน PDF หน้า ' + pageNo + ' หากเป็นภาพสแกน กรุณาใช้ CSV หรือ Excel');
    }
    return rows;
  } finally {
    await task.destroy();
  }
}

