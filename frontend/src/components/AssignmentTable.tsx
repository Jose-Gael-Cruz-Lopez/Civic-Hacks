'use client';

import { useMemo, useState } from 'react';
import { Assignment } from '@/lib/types';

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
    color: '#374151',
    background: 'transparent',
    outline: 'none',
  };

  const headerStyle = {
    fontSize: '11px',
    fontWeight: 500 as const,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    padding: '8px 10px',
    textAlign: 'left' as const,
    borderBottom: '1px solid #e5e7eb',
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
          <label style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', fontWeight: 500 }}>
            Sort by
          </label>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            style={{ ...inputStyle, width: '160px', borderColor: '#e5e7eb', cursor: 'pointer' }}
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {sortKey !== 'custom' && (
            <button
              onClick={() => setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                fontSize: '12px',
                cursor: 'pointer',
                color: '#374151',
              }}
            >
              {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            </button>
          )}
        </div>
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
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
                  borderBottom: rowPosition < rows.length - 1 ? '1px solid #f3f4f6' : 'none',
                  background: selectedIds?.includes(a.id)
                    ? '#f0fdf4'
                    : draggingIndex === rowPosition
                      ? '#fefce8'
                      : '#ffffff',
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
                    onFocus={e => (e.target.style.borderColor = '#e5e7eb')}
                    onBlur={e => (e.target.style.borderColor = 'transparent')}
                  />
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <input
                    value={a.title}
                    onChange={e => update(index, 'title', e.target.value)}
                    placeholder="Title"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#e5e7eb')}
                    onBlur={e => (e.target.style.borderColor = 'transparent')}
                  />
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <select
                    value={a.assignment_type}
                    onChange={e => update(index, 'assignment_type', e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {TYPES.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <input
                    value={a.notes ?? ''}
                    onChange={e => update(index, 'notes' as any, e.target.value)}
                    placeholder="Notes"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#e5e7eb')}
                    onBlur={e => (e.target.style.borderColor = 'transparent')}
                  />
                </td>
                <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                  <button
                    onClick={() => remove(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#9ca3af',
                      cursor: 'pointer',
                      fontSize: '16px',
                      lineHeight: 1,
                      padding: '2px 4px',
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
          color: '#6b7280',
          fontSize: '13px',
          cursor: 'pointer',
          padding: '4px 0',
        }}
      >
        + Add row
      </button>
    </div>
  );
}
