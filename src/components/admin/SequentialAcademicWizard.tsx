import React, { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { academicSettings } from '../../utils/academicYear';
import { buildWizardTransaction, createWizardDraft, SequentialWizardDraft } from '../../services/sequentialAcademicWizard';
import { isAcademicPathActive } from '../../services/academicState';
import { Modal } from '../common/Modal';

const steps = ['คณะ', 'ภาควิชา', 'สาขาวิชา', 'ปีการศึกษาที่เข้า', 'กลุ่มเรียน', 'ตรวจสอบและบันทึก'];
const inputClass = 'mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-blue-600 disabled:bg-slate-100';
const buttonClass = 'rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40';

export const SequentialAcademicWizard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { academicState, saveAcademicWizard } = useApp();
  const [initial] = useState(() => createWizardDraft(academicState));
  const [draftState, setDraft] = useState<SequentialWizardDraft>(initial);
  const [step, setStep] = useState(1);
  const [confirmExit, setConfirmExit] = useState(false);
  const [error, setError] = useState('');
  const dirty = JSON.stringify(initial) !== JSON.stringify(draftState);
  const requestClose = () => { if (dirty) setConfirmExit(true); else onClose(); };
  const validation = buildWizardTransaction(academicState, draftState, step);
  const facultyName = draftState.facultyMode === 'new' ? draftState.newFacultyName.trim() : academicState.faculties.find((f) => f.id === draftState.selectedFacultyId)?.name || '—';
  const departmentName = draftState.departmentMode === 'new' ? draftState.newDepartmentName.trim() : academicState.departments.find((d) => d.id === draftState.selectedDepartmentId)?.name || '—';
  const program = academicState.programs.find((p) => p.id === draftState.selectedProgramId);
  const programName = draftState.programMode === 'new' ? draftState.newProgramName.trim() : program?.name || '—';
  const programCode = draftState.programMode === 'new' ? draftState.newProgramCode.trim().toUpperCase() : program?.code || '—';
  const yearLevel = draftState.admissionYear ? academicSettings.currentAcademicYear - draftState.admissionYear + 1 : 0;

  // Navigation never resets drafts. Only changing an ancestor clears descendants.
  const update = (patch: Partial<SequentialWizardDraft>, ancestor?: number) => {
    setError('');
    setDraft((current) => ({ ...current,
      ...(ancestor === 1 && { selectedDepartmentId: null, newDepartmentName: '', departmentStatus: 'active' as const, departmentMode: 'existing' as const }),
      ...(ancestor && ancestor <= 2 && { selectedProgramId: null, newProgramCode: '', newProgramName: '', programMode: 'existing' as const }),
      ...(ancestor && ancestor <= 3 && { admissionYear: null }),
      ...(ancestor && ancestor <= 4 && { groups: [{ tempId: crypto.randomUUID(), code: '', status: 'active' as const }] }),
      ...patch,
    }));
  };
  const mode = (level: 1 | 2 | 3) => {
    const key = level === 1 ? 'facultyMode' : level === 2 ? 'departmentMode' : 'programMode';
    return <fieldset className="flex flex-wrap gap-4"><legend className="sr-only">วิธีเลือก{steps[level - 1]}</legend>
      {(['existing', 'new'] as const).map((value) => <label key={value} className="flex items-center gap-2 text-sm">
        <input type="radio" name={key} checked={draftState[key] === value} onChange={() => update({ [key]: value }, level)} />
        {value === 'existing' ? `เลือก${steps[level - 1]}ที่มีอยู่` : `สร้าง${steps[level - 1]}ใหม่`}
      </label>)}
    </fieldset>;
  };
  const textField = (label: string, key: 'newFacultyName' | 'newDepartmentName' | 'newProgramCode' | 'newProgramName', ancestor: number) => <label className="block text-sm font-semibold">{label}
    <input value={draftState[key]} onChange={(event) => update({ [key]: key === 'newProgramCode' ? event.target.value.toUpperCase() : event.target.value }, ancestor)} className={inputClass} />
  </label>;
  const statusToggle = (key: 'facultyStatus' | 'departmentStatus') => <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draftState[key] === 'active'} onChange={(event) => update({ [key]: event.target.checked ? 'active' : 'inactive' })} />เปิดใช้งาน</label>;
  const badge = (value: 'existing' | 'new') => <span className={`ml-2 rounded-full px-2 py-1 text-xs ${value === 'new' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{value === 'new' ? 'สร้างใหม่' : 'ข้อมูลเดิม'}</span>;

  return <Modal isOpen onClose={confirmExit ? () => setConfirmExit(false) : requestClose} title={confirmExit ? 'มีข้อมูลที่ยังไม่ได้บันทึก คุณต้องการออกจากขั้นตอนนี้หรือไม่' : 'เพิ่มข้อมูลแบบลำดับ'} maxWidth="4xl"
    headerContent={!confirmExit && <nav aria-label="ขั้นตอนเพิ่มข้อมูล" className="border-b px-6 py-4">
      <p className="text-sm font-semibold text-blue-700 md:hidden">ขั้นตอนที่ {step} จาก 6: {steps[step - 1]}</p>
      <ol className="hidden grid-cols-6 gap-2 md:grid">{steps.map((title, index) => <li key={title} aria-current={step === index + 1 ? 'step' : undefined} className="min-w-0 text-center">
        <span className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-sm ${index + 1 < step ? 'border-green-600 bg-green-600 text-white' : index + 1 === step ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-400'}`}>{index + 1 < step ? <Check className="h-4 w-4" aria-label="ผ่านแล้ว" /> : index + 1}</span>
        <span className="mt-2 block text-[11px] leading-4">{title}</span>
      </li>)}</ol>
    </nav>}
    footer={confirmExit ? <><button className={buttonClass} onClick={() => setConfirmExit(false)}>กลับไปแก้ไข</button><button className={`${buttonClass} bg-red-600 text-white`} onClick={onClose}>ออกโดยไม่บันทึก</button></> : <div className="flex w-full flex-wrap justify-end gap-2">
      <button className={buttonClass} onClick={requestClose}>ยกเลิก</button>
      {step > 1 && <button className={buttonClass} onClick={() => { setStep(step - 1); setError(''); }}>ย้อนกลับ</button>}
      <button type="submit" form="academic-wizard-form" disabled={Boolean(validation.error)} className={`${buttonClass} bg-blue-600 text-white`}>{step === 6 ? 'ยืนยันและบันทึก' : 'ถัดไป'}</button>
    </div>}>
    {confirmExit ? <p className="text-sm text-slate-600">ข้อมูลในขั้นตอนนี้ยังไม่ได้บันทึก การออกจะยกเลิกข้อมูลร่างทั้งหมด</p> : <form id="academic-wizard-form" className="space-y-5" onSubmit={(event) => {
      event.preventDefault();
      const checked = buildWizardTransaction(academicState, draftState, step);
      if (checked.error) { setError(checked.error); setStep(checked.step || step); return; }
      if (step < 6) { setStep(step + 1); setError(''); return; }
      const result = saveAcademicWizard(draftState);
      if (result.success) onClose(); else setError(result.error || 'ไม่สามารถบันทึกได้');
    }}>
      <h2 className="text-base font-bold">{step}. {steps[step - 1]}</h2>
      {step > 1 && <p className="rounded-xl bg-blue-50 p-3 text-sm leading-relaxed text-blue-800 break-words">{facultyName}{step > 2 && ` → ${departmentName}`}{step > 3 && ` → [${programCode}] ${programName}`}</p>}
      {step === 1 && <>{mode(1)}{draftState.facultyMode === 'existing' ? <label className="block text-sm">คณะ<select className={inputClass} value={draftState.selectedFacultyId || ''} onChange={(event) => update({ selectedFacultyId: event.target.value }, 1)}><option value="">เลือกคณะ</option>{academicState.faculties.filter((f) => f.status === 'active').map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label> : <>{textField('ชื่อคณะ', 'newFacultyName', 1)}{statusToggle('facultyStatus')}</>}</>}
      {step === 2 && <>{mode(2)}{draftState.departmentMode === 'existing' ? <label className="block text-sm">ภาควิชา<select className={inputClass} value={draftState.selectedDepartmentId || ''} onChange={(event) => update({ selectedDepartmentId: event.target.value }, 2)}><option value="">เลือกภาควิชาในคณะนี้</option>{academicState.departments.filter((d) => draftState.facultyMode === 'existing' && d.facultyId === draftState.selectedFacultyId && isAcademicPathActive(academicState, 'departments', d.id)).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label> : <>{textField('ชื่อภาควิชา', 'newDepartmentName', 2)}{statusToggle('departmentStatus')}</>}</>}
      {step === 3 && <>{mode(3)}{draftState.programMode === 'existing' ? <label className="block text-sm">สาขาวิชา<select className={inputClass} value={draftState.selectedProgramId || ''} onChange={(event) => update({ selectedProgramId: event.target.value }, 3)}><option value="">เลือกสาขาวิชาในภาควิชานี้</option>{academicState.programs.filter((p) => draftState.departmentMode === 'existing' && p.departmentId === draftState.selectedDepartmentId && isAcademicPathActive(academicState, 'programs', p.id)).map((p) => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}</select></label> : <>{textField('รหัสสาขาวิชา', 'newProgramCode', 3)}{textField('ชื่อสาขาวิชา', 'newProgramName', 3)}</>}</>}
      {step === 4 && <><label className="block text-sm font-semibold">ปีการศึกษาที่เข้า<select className={inputClass} value={draftState.admissionYear || ''} onChange={(event) => update({ admissionYear: Number(event.target.value) || null }, 4)}><option value="">เลือกปีการศึกษาที่เข้า</option>{Array.from({ length: Math.min(100, academicSettings.currentAcademicYear - 2500 + 1) }, (_, index) => academicSettings.currentAcademicYear - index).map((year) => <option key={year} value={year}>ปีการศึกษา {year}</option>)}</select></label>
        <label className="block text-sm font-semibold">ชั้นปีปัจจุบัน<input readOnly className={`${inputClass} bg-slate-100`} value={yearLevel > 0 ? `ชั้นปีที่ ${yearLevel}` : '—'} /></label><p className="text-xs text-slate-500">ระบบคำนวณอัตโนมัติจากปีการศึกษาปัจจุบัน {academicSettings.currentAcademicYear}</p></>}
      {step === 5 && <><p className="text-sm">สาขาวิชา: [{programCode}] · ปีการศึกษาที่เข้า: {draftState.admissionYear} · ชั้นปีปัจจุบัน: {yearLevel}</p>
        {draftState.groups.map((group, index) => <div key={group.tempId} className="flex flex-wrap items-end gap-3 rounded-xl border p-3"><label className="min-w-0 flex-1 text-sm">รหัสกลุ่มเรียน {index + 1}<input className={inputClass} value={group.code} onChange={(event) => update({ groups: draftState.groups.map((g) => g.tempId === group.tempId ? { ...g, code: event.target.value.toUpperCase() } : g) })} /></label><label className="flex items-center gap-2 py-3 text-xs"><input type="checkbox" checked={group.status === 'active'} onChange={(event) => update({ groups: draftState.groups.map((g) => g.tempId === group.tempId ? { ...g, status: event.target.checked ? 'active' : 'inactive' } : g) })} />เปิดใช้งาน</label><button type="button" aria-label={`ลบกลุ่มเรียนแถวที่ ${index + 1}`} className="rounded-lg p-3 text-red-600" onClick={() => update({ groups: draftState.groups.filter((g) => g.tempId !== group.tempId) })}><Trash2 className="h-4 w-4" /></button></div>)}
        <button type="button" className={`${buttonClass} inline-flex items-center gap-2`} onClick={() => update({ groups: [...draftState.groups, { tempId: crypto.randomUUID(), code: '', status: 'active' }] })}><Plus className="h-4 w-4" />เพิ่มกลุ่มเรียนอีก</button></>}
      {step === 6 && <div className="space-y-4 rounded-xl border p-4 text-sm break-words"><p>คณะ: {facultyName}{badge(draftState.facultyMode)}</p><p>ภาควิชา: {departmentName}{badge(draftState.departmentMode)}</p><p>สาขาวิชา: [{programCode}] {programName}{badge(draftState.programMode)}</p><p>ปีการศึกษาที่เข้า: {draftState.admissionYear}</p><p>ชั้นปีปัจจุบัน: ชั้นปีที่ {yearLevel}</p><h3 className="font-bold">กลุ่มเรียนที่จะสร้าง</h3><ul className="space-y-2">{draftState.groups.map((group) => <li key={group.tempId}>{group.code.trim().toUpperCase()} <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs">{group.status === 'active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span></li>)}</ul><p className="text-xs text-slate-500">ข้อมูลทั้งหมดจะถูกบันทึกพร้อมกันเมื่อยืนยันเท่านั้น</p></div>}
      {(validation.error || error) && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{validation.error || error}</p>}
    </form>}
  </Modal>;
};
