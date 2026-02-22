'use client';

import { useMemo, useState } from 'react';
import { Assignment } from '@/lib/types';
import CustomSelect from '@/components/CustomSelect';

interface Props {
  assignments: Assignment[];
  onChange: (assignments: Assignment[]) => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
}

const TYPES = ['homework', 'exam', 'reading', 'project', 'quiz', 'other'];
type SortKey = 'custom' | 'due_date' | 'course_name' | 'title' | 'assignment_type';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'custom', label: 'Manual order' },
  { value: 'due_date', label: 'Due date' },
  { value: 'course_name', label: 'Course' },
  { value: 'title', label: 'Title' },
  { value: 'assignment_type', label: 'Type' },
];

const isDueSoon = (dueDate?: string | null) => {
  if (!dueDate) return false;
  const due = new Date(`${dueDate}T23:59:59`);
  if (Number.isNaN(due.getTime())) return false;
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  return diff >= 0 && diff <= 86400000;
};

export default function AssignmentTable({ assignments, onChange, selectedIds, onToggleSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('custom');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const canReorder = sortKey === 'custom';

  const update = (index: number, field: keyof Assignment, value: string) => {
    const updated = assignments.map((a, i) => (i === index ? { ...a, [field]: value } : a));
    onChange(updated);
  };

  const remove = (index: number) => {
    onChange(assignments.filter((_, i) => i !== index));
  };

  const handleDragStart = (position: number) => {
    if (!canReorder) return;
    setDraggingIndex(position);
  };

  const handleDrop = (position: number) => {
    if (!canReorder || draggingIndex === null) {
      setDraggingIndex(null);
      return;
    }
    const from = draggingIndex;
    const to = position;
    if (from === to) {
      setDraggingIndex(null);
      return;
    }
    const reordered = [...assignments];
    const [item] = reordered.splice(from, 1);
    reordered.splice(to, 0, item);
    onChange(reordered);
    setDraggingIndex(null);
  };

  const add = () => {
    const newA: Assignment = {
      id: `temp_${Date.now()}`,
      title: '',
      course_name: '',
      due_date: '',
      assignment_type: 'homework',
      notes: null,
      google_event_id: null,
    };
    onChange([...assignments, newA]);
  };

  const inputStyle = {
    width: '100%',
    padding: '4px 6px',
    border: '1px solid transparent',
    borderRadius: '4px',
    fontSize: '13px',
    color: 'var(--text)' as string,
    background: 'transparent',
    outline: 'none',
    fontFamily: 'inherit',
  };

  const headerStyle = {
    fontSize: '11px',
    fontWeight: 500 as const,
    color: 'var(--text-dim)' as string,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    padding: '8px 10px',
    textAlign: 'left' as const,
    borderBottom: '1px solid var(--border-light)' as string,
  };

  const rows = useMemo(() => {
    const base = assignments.map((assignment, index) => ({ assignment, index }));
    if (sortKey === 'custom') return base;

    const compare = (a: Assignment, b: Assignment) => {
      const normalize = (value: string | null | undefined) => (value ?? '').toString().toLowerCase();
      if (sortKey === 'due_date') {
        const valA = a.due_date ? new Date(`${a.due_date}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
        const valB = b.due_date ? new Date(`${b.due_date}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
        return valA - valB;
      }
      if (sortKey === 'course_name') {
        return normalize(a.course_name).localeCompare(normalize(b.course_name));
      }
      if (sortKey === 'title') {
        return normalize(a.title).localeCompare(normalize(b.title));
      }
      if (sortKey === 'assignment_type') {
        return normalize(a.assignment_type).localeCompare(normalize(b.assignment_type));
      }
      return 0;
    };

    const sorted = [...base].sort((a, b) => {
      const value = compare(a.assignment, b.assignment);
      if (value === 0) return 0;
      return sortDirection === 'asc' ? value : -value;
    });
    return sorted;
  }, [assignments, sortKey, sortDirection]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label className="label">Sort by</label>
          <CustomSelect
            value={sortKey}
            onChange={val => setSortKey(val as SortKey)}
            options={SORT_OPTIONS}
            style={{ minWidth: '160px' }}
          />
          {sortKey !== 'custom' && (
            <button
              onClick={() => setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))}
              className="btn-ghost"
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            </button>
          )}
        </div>
      </div>

      <div className="panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-topbar)' }}>
              {onToggleSelect && <th style={{ ...headerStyle, width: '32px' }}></th>}
              <th style={{ ...headerStyle, width: '120px' }}>Date</th>
              <th style={{ ...headerStyle, width: '120px' }}>Course</th>
              <th style={headerStyle}>Title</th>
              <th style={{ ...headerStyle, width: '100px' }}>Type</th>
              <th style={headerStyle}>Notes</th>
              <th style={{ ...headerStyle, width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ assignment: a, index }, rowPosition) => {
              const dueSoon = isDueSoon(a.due_date);
              return (
              <tr
                key={a.id}
                draggable={canReorder}
                onDragStart={() => handleDragStart(rowPosition)}
                onDragOver={e => {
                  if (!canReorder) return;
                  e.preventDefault();
                }}
                onDrop={() => handleDrop(rowPosition)}
                onDragEnd={() => setDraggingIndex(null)}
                style={{
                  borderBottom: rowPosition < rows.length - 1 ? '1px solid var(--border-light)' : 'none',
                  background: selectedIds?.includes(a.id)
                    ? 'rgba(22,163,74,0.08)'
                    : draggingIndex === rowPosition
                      ? 'rgba(217,119,6,0.08)'
                      : 'var(--bg-panel)',
                  cursor: canReorder ? 'grab' : 'default',
                }}
              >
                {onToggleSelect && (
                  <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds?.includes(a.id) ?? false}
                      onChange={() => onToggleSelect(a.id)}
                    />
                  </td>
                )}
                <td style={{ padding: '4px 6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {dueSoon && (
                      <span
                        title="Due within 24 hours"
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: '#dc2626',
                          color: '#ffffff',
                          fontSize: '11px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                        }}
                      >
                        !
                      </span>
                    )}
                    <input
                      type="date"
                      value={a.due_date}
                      onChange={e => update(index, 'due_date', e.target.value)}
                      style={{ ...inputStyle, width: '110px' }}
                    />
                  </div>
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <input
                    value={a.course_name}
                    onChange={e => update(index, 'course_name', e.target.value)}
                    placeholder="Course"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = 'var(--border-mid)')}
                    onBlur={e => (e.target.style.borderColor = 'transparent')}
                  />
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <input
                    value={a.title}
                    onChange={e => update(index, 'title', e.target.value)}
                    placeholder="Title"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = 'var(--border-mid)')}
                    onBlur={e => (e.target.style.borderColor = 'transparent')}
                  />
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <CustomSelect
                    value={a.assignment_type}
                    onChange={val => update(index, 'assignment_type', val)}
                    options={TYPES.map(t => ({ value: t, label: t }))}
                    compact
                    style={{ width: '100%' }}
                  />
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <input
                    value={a.notes ?? ''}
                    onChange={e => update(index, 'notes' as any, e.target.value)}
                    placeholder="Notes"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = 'var(--border-mid)')}
                    onBlur={e => (e.target.style.borderColor = 'transparent')}
                  />
                </td>
                <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                  <button
                    onClick={() => remove(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                      fontSize: '16px',
                      lineHeight: 1,
                      padding: '2px 4px',
                      fontFamily: 'inherit',
                    }}
                  >
                    x
                  </button>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>

      <button
        onClick={add}
        style={{
          marginTop: '8px',
          background: 'none',
          border: 'none',
          color: 'var(--text-dim)',
          fontSize: '13px',
          cursor: 'pointer',
          padding: '4px 0',
          fontFamily: 'inherit',
        }}
      >
        + Add row
      </button>
    </div>
  );
}
