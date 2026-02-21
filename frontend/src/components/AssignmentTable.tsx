'use client';

import { Assignment } from '@/lib/types';

interface Props {
  assignments: Assignment[];
  onChange: (assignments: Assignment[]) => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
}

const TYPES = ['homework', 'exam', 'reading', 'project', 'quiz', 'other'];

export default function AssignmentTable({ assignments, onChange, selectedIds, onToggleSelect }: Props) {
  const update = (index: number, field: keyof Assignment, value: string) => {
    const updated = assignments.map((a, i) =>
      i === index ? { ...a, [field]: value } : a
    );
    onChange(updated);
  };

  const remove = (index: number) => {
    onChange(assignments.filter((_, i) => i !== index));
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

  return (
    <div>
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
            {assignments.map((a, i) => (
              <tr
                key={a.id}
                style={{
                  borderBottom: i < assignments.length - 1 ? '1px solid #f3f4f6' : 'none',
                  background: selectedIds?.includes(a.id) ? '#f0fdf4' : '#ffffff',
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
                  <input
                    type="date"
                    value={a.due_date}
                    onChange={e => update(i, 'due_date', e.target.value)}
                    style={{ ...inputStyle, width: '110px' }}
                  />
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <input
                    value={a.course_name}
                    onChange={e => update(i, 'course_name', e.target.value)}
                    placeholder="Course"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#e5e7eb')}
                    onBlur={e => (e.target.style.borderColor = 'transparent')}
                  />
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <input
                    value={a.title}
                    onChange={e => update(i, 'title', e.target.value)}
                    placeholder="Title"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#e5e7eb')}
                    onBlur={e => (e.target.style.borderColor = 'transparent')}
                  />
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <select
                    value={a.assignment_type}
                    onChange={e => update(i, 'assignment_type', e.target.value)}
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
                    onChange={e => update(i, 'notes' as any, e.target.value)}
                    placeholder="Notes"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#e5e7eb')}
                    onBlur={e => (e.target.style.borderColor = 'transparent')}
                  />
                </td>
                <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                  <button
                    onClick={() => remove(i)}
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
            ))}
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
