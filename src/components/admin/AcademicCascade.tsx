import React from 'react';
import { useApp } from '../../context/AppContext';
import { AcademicState, AcademicTier } from '../../types/academic';
import { isAcademicPathActive } from '../../services/academicState';

export interface AcademicSelection {
  facultyId: string;
  departmentId: string;
  programId: string;
  yearLevelId: string;
  groupId: string;
}
export const emptyAcademicSelection: AcademicSelection = { facultyId: '', departmentId: '', programId: '', yearLevelId: '', groupId: '' };
export const defaultAcademicSelection = (state: AcademicState): AcademicSelection => ({
  ...emptyAcademicSelection, facultyId: state.faculties.find((f) => f.status === 'active')?.id || '',
});

interface Props {
  value: AcademicSelection;
  onChange: (value: AcademicSelection) => void;
  depth?: number;
  activeOnly?: boolean;
  retained?: AcademicSelection;
  excludeGroupId?: string;
}

export const AcademicCascade: React.FC<Props> = ({ value, onChange, depth = 5, activeOnly = true, retained, excludeGroupId }) => {
  const { academicState: state } = useApp();
  const rows: { key: keyof AcademicSelection; tier: AcademicTier; label: string; options: { id: string; label: string; status: string }[] }[] = [
    { key: 'facultyId', tier: 'faculties', label: 'คณะ', options: state.faculties.map((r) => ({ ...r, label: r.name })) },
    { key: 'departmentId', tier: 'departments', label: 'ภาควิชา', options: state.departments.filter((r) => r.facultyId === value.facultyId).map((r) => ({ ...r, label: r.name })) },
    { key: 'programId', tier: 'programs', label: 'สาขาวิชา', options: state.programs.filter((r) => r.departmentId === value.departmentId).map((r) => ({ ...r, label: `[${r.code}] ${r.name}` })) },
    { key: 'yearLevelId', tier: 'yearLevels', label: 'ชั้นปี', options: state.yearLevels.filter((r) => r.programId === value.programId).sort((a, b) => a.level - b.level).map((r) => ({ ...r, label: r.name })) },
    { key: 'groupId', tier: 'classGroups', label: 'กลุ่มเรียน', options: state.classGroups.filter((r) => r.programId === value.programId && r.yearLevelId === value.yearLevelId && r.id !== excludeGroupId).map((r) => ({ ...r, label: r.code })) },
  ];
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
      {rows.slice(0, depth).map(({ key, tier, label, options }, index) => (
        <label key={key} className="min-w-0 space-y-1.5 text-xs font-semibold text-slate-700">
          <span>{index + 1}. {label}</span>
          <select
            aria-label={label}
            value={value[key]}
            disabled={index > 0 && !value[rows[index - 1].key]}
            onChange={(event) => {
              const next = { ...value, [key]: event.target.value };
              rows.slice(index + 1).forEach((child) => { next[child.key] = ''; });
              onChange(next);
            }}
            className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-normal disabled:bg-slate-100 disabled:text-slate-400 focus:outline-blue-600"
          >
            <option value="">เลือก{label}</option>
            {options.filter((option) => !activeOnly || isAcademicPathActive(state, tier, option.id) || retained?.[key] === option.id).map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}{!isAcademicPathActive(state, tier, option.id) ? ' (ปิดใช้งาน)' : ''}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
};
