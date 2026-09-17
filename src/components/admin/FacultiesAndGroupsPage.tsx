import { academicSettings } from '../../utils/academicYear';
import { Workflow } from 'lucide-react';
import { SequentialAcademicWizard } from './SequentialAcademicWizard';
import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Network, GraduationCap, Layers, Users, UserCheck, UserX, Plus, Search, Eye, Pencil, Power, Trash2, ArrowUpDown, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AcademicInput, AcademicRecord, AcademicTier } from '../../types/academic';
import { academicDeleteError, academicLabels, academicPath, normalizeAcademicInput, studentsInAcademicRecord, validateAcademicInput } from '../../services/academicState';
import { AcademicCascade, AcademicSelection, defaultAcademicSelection, emptyAcademicSelection } from './AcademicCascade';
import { Modal } from '../common/Modal';

const tabs: { tier: AcademicTier; icon: React.ElementType }[] = [
  { tier: 'faculties', icon: Building2 }, { tier: 'departments', icon: Network },
  { tier: 'programs', icon: GraduationCap }, { tier: 'yearLevels', icon: Layers }, { tier: 'classGroups', icon: Users },
];
const parentDepth = { faculties: 0, departments: 1, programs: 2, yearLevels: 3, classGroups: 4 };
const buttonClass = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40';
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-blue-600';
const dateLabel = (value: string) => value ? new Date(value).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export const FacultiesAndGroupsPage: React.FC = () => {
  const { academicState: state, students, saveAcademicRecord, deleteAcademicRecord, setAcademicStatus } = useApp();
  const [tier, setTier] = useState<AcademicTier>('faculties');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [filter, setFilter] = useState<AcademicSelection>({ ...emptyAcademicSelection });
  const [sort, setSort] = useState({ column: 0, ascending: true });
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ tier: AcademicTier; id?: string; retained?: AcademicSelection } | null>(null);
  const [form, setForm] = useState<AcademicInput>({ ...emptyAcademicSelection, name: '', code: '', level: 1, status: 'active' });
  const [detail, setDetail] = useState<{ tier: AcademicTier; id: string } | null>(null);
  const [confirm, setConfirm] = useState<{ action: 'delete' | 'status' | 'save'; tier: AcademicTier; id: string } | null>(null);
  const [error, setError] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);

  const pathSelection = (recordTier: AcademicTier, id: string): AcademicSelection => {
    const path = academicPath(state, recordTier, id);
    return { facultyId: path.faculty?.id || '', departmentId: path.department?.id || '', programId: path.program?.id || '', yearLevelId: path.year?.id || '', groupId: path.group?.id || '' };
  };
  const titleOf = (record: AcademicRecord) => 'code' in record ? record.code : record.name;
  const describe = (recordTier: AcademicTier, record: AcademicRecord) => {
    const path = academicPath(state, recordTier, record.id);
    const facultyId = path.faculty?.id;
    const departments = state.departments.filter((d) => d.facultyId === facultyId);
    const programs = state.programs.filter((p) => recordTier === 'faculties'
      ? departments.some((d) => d.id === p.departmentId) : p.departmentId === path.department?.id);
    const groupCount = state.classGroups.filter((g) => recordTier === 'faculties' || recordTier === 'departments'
      ? programs.some((p) => p.id === g.programId)
      : recordTier === 'yearLevels' ? g.yearLevelId === record.id : g.programId === path.program?.id).length;
    if (recordTier === 'yearLevels') {
      const members = studentsInAcademicRecord(state, students, recordTier, record.id);
      return [
        ['ชั้นปี', path.year?.name || '—'], ['ปีการศึกษาที่เข้า', path.year?.admissionYear || '—'],
        ['สาขาวิชา', path.program ? `[${path.program.code}] ${path.program.name}` : '—'],
        ['จำนวนกลุ่มเรียน', groupCount], ['นักศึกษาทั้งหมด', members.length],
        ['ปกติ', members.filter((s) => s.accountStatus === 'active').length],
        ['ถูกระงับ', members.filter((s) => s.accountStatus === 'suspended').length],
        ['พ้นสภาพ', members.filter((s) => s.accountStatus === 'graduated_inactive').length],
      ] as [string, string | number][];
    }
    const common: [string, string | number][] = [
      ['จำนวนนักศึกษา', studentsInAcademicRecord(state, students, recordTier, record.id).length],
      ['สถานะ', record.status === 'active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'],
      ['วันที่แก้ไขล่าสุด', dateLabel(record.updatedAt)],
    ];
    const parents: [string, string | number][] = [
      ['คณะ', path.faculty?.name || '—'], ['ภาควิชา', path.department?.name || '—'],
      ['สาขาวิชา', path.program ? `[${path.program.code}] ${path.program.name}` : '—'],
    ];
    let values: [string, string | number][];
    if (recordTier === 'faculties') values = [['ชื่อคณะ', titleOf(record)], ['จำนวนภาควิชา', departments.length], ['จำนวนสาขาวิชา', programs.length], ['จำนวนกลุ่มเรียน', groupCount]];
    else if (recordTier === 'departments') values = [['ชื่อภาควิชา', titleOf(record)], parents[0], ['จำนวนสาขาวิชา', programs.length], ['จำนวนกลุ่มเรียน', groupCount]];
    else if (recordTier === 'programs') values = [['รหัสสาขาวิชา', titleOf(record)], ['ชื่อสาขาวิชา', 'name' in record ? record.name : ''], parents[1], parents[0], ['จำนวนชั้นปี', state.yearLevels.filter((y) => y.programId === record.id).length], ['จำนวนกลุ่มเรียน', groupCount]];
    else values = [['รหัสกลุ่มเรียน', titleOf(record)], ...parents, ['ชั้นปี', path.year?.name || '—']];
    return [...values, ...common];
  };
  const rows = useMemo(() => state[tier].map((record) => ({ record, cells: describe(tier, record), path: academicPath(state, tier, record.id) }))
    .filter(({ record, cells, path }) => (!status || record.status === status) &&
      cells.some(([, value]) => String(value).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) &&
      (!filter.facultyId || path.faculty?.id === filter.facultyId) &&
      (!filter.departmentId || path.department?.id === filter.departmentId) &&
      (!filter.programId || path.program?.id === filter.programId) &&
      (!filter.yearLevelId || path.year?.id === filter.yearLevelId))
    .sort((a, b) => {
      const left = a.cells[sort.column]?.[1] ?? '';
      const right = b.cells[sort.column]?.[1] ?? '';
      const compare = typeof left === 'number' && typeof right === 'number' ? left - right
        : String(left).localeCompare(String(right), 'th', { numeric: true, sensitivity: 'base' });
      return sort.ascending ? compare : -compare;
    }), [state, students, tier, status, search, filter, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  useEffect(() => setPage(1), [tier, search, status, filter, sort]);
  useEffect(() => setPage((current) => Math.min(current, pages)), [pages]);
  const visible = rows.slice((page - 1) * 10, page * 10);
  const assigned = students.filter((student) => state.classGroups.some((g) => g.id === student.classGroupId)).length;

  const openEditor = (recordTier: AcademicTier, record?: AcademicRecord) => {
    const selection = record ? pathSelection(recordTier, record.id) : { ...defaultAcademicSelection(state), ...Object.fromEntries(Object.entries(filter).filter(([, value]) => value)) };
    setForm({ ...selection, admissionYear: record && 'admissionYear' in record ? record.admissionYear : academicSettings.currentAcademicYear, name: record && 'name' in record ? record.name : '', code: record && 'code' in record ? record.code : '',
      level: record && 'level' in record ? record.level : 1, status: record?.status || 'active' });
    setError('');
    setEditor({ tier: recordTier, id: record?.id, retained: record ? selection : undefined });
  };
  const formError = editor ? validateAcademicInput(state, editor.tier, normalizeAcademicInput(form), editor.id) : '';
  const save = () => {
    if (!editor) return;
    const result = saveAcademicRecord(editor.tier, form, editor.id);
    if (result.success) { setEditor(null); setConfirm(null); } else setError(result.error || '');
  };
  const confirmRecord = confirm ? state[confirm.tier].find((r) => r.id === confirm.id) : undefined;
  const deleteError = confirm?.action === 'delete' ? academicDeleteError(state, students, confirm.tier, confirm.id) : undefined;
  const detailRecord = detail ? state[detail.tier].find((r) => r.id === detail.id) : undefined;
  const headers = rows[0]?.cells.map(([label]) => label) || (state[tier][0] ? describe(tier, state[tier][0]).map(([label]) => label) : []);

  return (
    <div className="min-w-0 space-y-5">
      {wizardOpen && <SequentialAcademicWizard onClose={() => setWizardOpen(false)} />}
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-blue-600"><Network className="h-6 w-6" /></div>
          <div><h1 className="text-lg font-bold text-slate-950">จัดการคณะ ภาควิชา สาขาวิชา ชั้นปี และกลุ่มเรียน</h1>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">กำหนดข้อมูลตั้งแต่คณะ ภาควิชา สาขาวิชา และชั้นปี ไปจนถึงกลุ่มเรียน ก่อนเพิ่มนักศึกษาเข้าสู่ระบบ</p></div>
        </div>
        <div className="flex flex-wrap gap-2"><button onClick={() => openEditor('faculties')} className={`${buttonClass} shrink-0 border border-slate-200`}><Plus className="h-4 w-4" />เพิ่มคณะ</button><button onClick={() => setWizardOpen(true)} className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}><Workflow className="h-4 w-4" />เพิ่มข้อมูลแบบลำดับ</button></div>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {tabs.map(({ tier: key, icon: Icon }) => <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex justify-between gap-1 text-[11px] text-slate-500"><span>จำนวน{academicLabels[key]}</span><Icon className="h-4 w-4 shrink-0 text-blue-600" /></div>
          <div className="mt-3 flex flex-wrap items-baseline gap-1"><strong className="text-2xl text-slate-950">{state[key].length}</strong><span className="text-[10px] text-teal-600">({state[key].filter((r) => r.status === 'active').length} ใช้งาน)</span></div>
        </div>)}
        {[{ label: 'นักศึกษาที่มีกลุ่มเรียน', count: assigned, icon: UserCheck, color: 'text-teal-600' }, { label: 'นักศึกษาที่ยังไม่มีกลุ่มเรียน', count: students.length - assigned, icon: UserX, color: 'text-amber-600' }].map(({ label, count, icon: Icon, color }) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex justify-between gap-1 text-[11px] text-slate-500"><span>{label}</span><Icon className={`h-4 w-4 shrink-0 ${color}`} /></div><div className={`mt-3 ${color}`}><strong className="text-2xl">{count}</strong><span className="ml-1 text-xs">คน</span></div>
        </div>)}
      </div>
      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div role="tablist" aria-label="ระดับข้อมูล" className="flex overflow-x-auto border-b border-slate-200 bg-slate-50/60 px-3 pt-2">
          {tabs.map(({ tier: key, icon: Icon }) => <button key={key} role="tab" id={`tab-${key}`} aria-selected={tier === key} aria-controls="academic-panel"
            onClick={() => { setTier(key); setSearch(''); setStatus(''); setFilter({ ...emptyAcademicSelection }); setSort({ column: 0, ascending: true }); }}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold ${tier === key ? 'border-blue-600 bg-white text-blue-600' : 'border-transparent text-slate-500 hover:text-blue-600'}`}>
            <Icon className="h-4 w-4" />{academicLabels[key]}<span className="rounded-full bg-slate-100 px-1.5 text-[10px]">{state[key].length}</span>
          </button>)}
        </div>
        <div role="tabpanel" id="academic-panel" aria-labelledby={`tab-${tier}`}>
          <div className="space-y-3 border-b border-slate-200 p-4">
            {tier === 'yearLevels' && <p className="text-xs text-blue-700">สรุปชั้นปีจากปีการศึกษาปัจจุบัน {academicSettings.currentAcademicYear} และปีที่เข้าศึกษา — ไม่สามารถเพิ่ม แก้ไข หรือลบชั้นปีได้</p>}
            <div className="flex flex-wrap gap-3">
              <label className="relative min-w-0 flex-1"><span className="sr-only">ค้นหา{academicLabels[tier]}</span><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`ค้นหา${academicLabels[tier]}...`} className={`${inputClass} pl-9`} /></label>
              <select aria-label="สถานะ" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 px-3 text-xs"><option value="">สถานะ: ทั้งหมด</option><option value="active">เปิดใช้งาน</option><option value="inactive">ปิดใช้งาน</option></select>
              {tier !== 'faculties' && tier !== 'yearLevels' && <button onClick={() => openEditor(tier)} className={`${buttonClass} bg-blue-600 text-white`}><Plus className="h-4 w-4" />เพิ่ม{academicLabels[tier]}</button>}
            </div>
            {parentDepth[tier] > 0 && <AcademicCascade value={filter} onChange={setFilter} depth={parentDepth[tier]} activeOnly={false} />}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600"><tr>{headers.map((label, index) => <th key={label} scope="col" aria-sort={sort.column === index ? sort.ascending ? 'ascending' : 'descending' : 'none'} className="px-4 py-3"><button onClick={() => setSort({ column: index, ascending: sort.column === index ? !sort.ascending : true })} className="inline-flex items-center gap-1 text-left">{label}<ArrowUpDown className="h-3 w-3 shrink-0" /></button></th>)}{tier !== 'yearLevels' && <th scope="col" className="px-4 py-3 text-right">การจัดการ</th>}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map(({ record, cells }) => <tr key={record.id} className="hover:bg-slate-50/70">
                  {cells.map(([label, value], index) => <td key={label} className={`px-4 py-4 ${index === 0 ? 'min-w-40 font-semibold text-slate-900' : 'text-slate-500'}`}>
                    {label === 'สถานะ' ? <span className={`whitespace-nowrap rounded-full border px-2 py-1 text-[10px] ${record.status === 'active' ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>{value}</span> : value}
                  </td>)}
                  {tier !== 'yearLevels' && <td className="px-3 py-3"><div className="flex justify-end">
                    {[{ title: 'ดูรายละเอียด', icon: Eye, action: () => setDetail({ tier, id: record.id }) }, { title: 'แก้ไข', icon: Pencil, action: () => openEditor(tier, record) },
                      { title: record.status === 'active' ? 'ปิดใช้งาน' : 'เปิดใช้งาน', icon: Power, action: () => setConfirm({ action: 'status', tier, id: record.id }) },
                      { title: 'ลบ', icon: Trash2, action: () => setConfirm({ action: 'delete', tier, id: record.id }) }].map(({ title, icon: Icon, action }) => <button key={title} onClick={action} aria-label={title} title={title} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600"><Icon className="h-4 w-4" /></button>)}
                  </div></td>}
                </tr>)}
                {!visible.length && <tr><td colSpan={headers.length + 1} className="px-4 py-12 text-center text-slate-400">ไม่พบข้อมูล{academicLabels[tier]}ที่ตรงกับเงื่อนไข</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-500">
            <span>แสดง {rows.length ? (page - 1) * 10 + 1 : 0}–{Math.min(page * 10, rows.length)} จาก {rows.length} รายการ</span>
            <div className="flex items-center gap-2"><button aria-label="หน้าก่อนหน้า" disabled={page === 1} onClick={() => setPage(page - 1)} className={buttonClass}><ChevronLeft className="h-4 w-4" /></button><span>{page} / {pages}</span><button aria-label="หน้าถัดไป" disabled={page === pages} onClick={() => setPage(page + 1)} className={buttonClass}><ChevronRight className="h-4 w-4" /></button></div>
          </footer>
        </div>
      </section>

      <Modal isOpen={Boolean(editor) && !confirm} onClose={() => setEditor(null)} title={`${editor?.id ? 'แก้ไข' : 'เพิ่ม'}${editor ? academicLabels[editor.tier] : ''}`} maxWidth="640">
        {editor && <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault();
          if (formError) { setError(formError); return; }
          const old = state[editor.tier].find((r) => r.id === editor.id);
          if (old && old.status !== form.status) setConfirm({ action: 'save', tier: editor.tier, id: old.id }); else save();
        }}>
          {parentDepth[editor.tier] > 0 && <AcademicCascade value={{ ...form, groupId: '' }} retained={editor.retained} admissionYearMode={editor.tier === 'classGroups'} depth={editor.tier === 'classGroups' ? 3 : parentDepth[editor.tier]} onChange={(selection) => setForm((current) => ({ ...current, ...selection }))} />}
          {(editor.tier === 'programs' || editor.tier === 'classGroups') && <label className="block space-y-1 text-xs font-semibold"><span>รหัส{academicLabels[editor.tier]}</span><input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} className={inputClass} /></label>}
          {editor.tier === 'classGroups' && <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold"><span>ปีการศึกษาที่เข้า</span>
              <select aria-label="ปีการศึกษาที่เข้า" value={form.admissionYear || ''} onChange={(event) => setForm({ ...form, admissionYear: Number(event.target.value) })} className={inputClass}>
                {Array.from({ length: academicSettings.currentAcademicYear - 2500 + 1 }, (_, offset) => academicSettings.currentAcademicYear - offset).map((year) => <option key={year} value={year}>ปีการศึกษา {year}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold"><span>ชั้นปีที่ระบบคำนวณ</span><input readOnly value={form.admissionYear ? `ชั้นปีที่ ${academicSettings.currentAcademicYear - form.admissionYear + 1}` : '—'} className={`${inputClass} bg-slate-100`} /></label>
          </div>}
          {editor.tier !== 'classGroups' && <label className="block space-y-1 text-xs font-semibold"><span>{editor.tier === 'yearLevels' ? 'ชื่อที่แสดง (เว้นว่างเพื่อใช้ชื่อตามชั้นปี)' : `ชื่อ${academicLabels[editor.tier]}`}</span><input required={editor.tier !== 'yearLevels'} value={form.name} maxLength={150} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={editor.tier === 'yearLevels' ? `ชั้นปีที่ ${form.level}` : ''} className={inputClass} /></label>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.status === 'active'} onChange={(event) => setForm({ ...form, status: event.target.checked ? 'active' : 'inactive' })} />เปิดใช้งาน</label>
          {(formError || error) && <p role="alert" className="text-xs text-red-600">{formError || error}</p>}
          <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setEditor(null)} className={`${buttonClass} border border-slate-200`}>ยกเลิก</button><button disabled={Boolean(formError)} className={`${buttonClass} bg-blue-600 text-white`}>บันทึก</button></div>
        </form>}
      </Modal>
      <Modal isOpen={Boolean(detailRecord)} onClose={() => setDetail(null)} title="ดูรายละเอียด" maxWidth="640">
        {detail && detailRecord && <dl className="space-y-3">{describe(detail.tier, detailRecord).map(([label, value]) => <div key={label} className="flex justify-between gap-4 border-b border-slate-100 pb-2 text-sm"><dt className="text-slate-500">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>)}</dl>}
      </Modal>
      <Modal isOpen={Boolean(confirmRecord)} onClose={() => setConfirm(null)} title={confirm?.action === 'delete' ? 'ยืนยันการลบ' : 'ยืนยันการเปลี่ยนสถานะ'}>
        {confirm && confirmRecord && <div className="space-y-4 text-sm">
          {deleteError ? <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-800"><AlertTriangle className="mb-2 h-5 w-5" />{deleteError}</p> : <p>ยืนยัน{confirm.action === 'delete' ? 'ลบ' : confirm.action === 'save' ? form.status === 'active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน' : confirmRecord.status === 'active' ? 'ปิดใช้งาน' : 'เปิดใช้งาน'} “{titleOf(confirmRecord)}” หรือไม่?</p>}
          {confirm.action !== 'delete' && <p className="text-xs leading-relaxed text-slate-500">การปิดใช้งานจะซ่อนข้อมูลนี้และข้อมูลภายในจากตัวเลือกสำหรับการจัดกลุ่มใหม่ โดยนักศึกษาที่สังกัดอยู่แล้วจะยังคงอยู่</p>}
          <div className="flex justify-end gap-2"><button onClick={() => setConfirm(null)} className={`${buttonClass} border border-slate-200`}>{deleteError ? 'ปิด' : 'ยกเลิก'}</button>
            {!deleteError && <button className={`${buttonClass} bg-blue-600 text-white`} onClick={() => {
              if (confirm.action === 'save') { save(); return; }
              const result = confirm.action === 'delete' ? deleteAcademicRecord(confirm.tier, confirm.id)
                : setAcademicStatus(confirm.tier, confirm.id, confirmRecord.status === 'active' ? 'inactive' : 'active');
              if (result.success) setConfirm(null);
            }}>ยืนยัน</button>}
          </div>
        </div>}
      </Modal>
    </div>
  );
};
