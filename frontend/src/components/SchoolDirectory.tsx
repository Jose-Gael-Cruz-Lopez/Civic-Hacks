'use client';

import { useEffect, useState } from 'react';
import { getSchoolStudents } from '@/lib/api';

interface StudentProfile {
  user_id: string;
  name: string;
  courses: string[];
  stats: { mastered: number; total: number };
}

interface Props {
  currentUserId: string;
}

export default function SchoolDirectory({ currentUserId }: Props) {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSchoolStudents()
      .then(res => setStudents(res.students))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        background: '#f0f5f0',
        borderBottom: '1px solid rgba(107,114,128,0.12)',
        padding: '0 24px',
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
          My School
          {!loading && (
            <span style={{ fontSize: '12px', fontWeight: 400, color: '#6b7280', marginLeft: '8px' }}>
              {students.length} student{students.length !== 1 ? 's' : ''}
            </span>
          )}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {loading ? (
          <p style={{ color: '#9ca3af', fontSize: '13px' }}>Loading...</p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '8px',
          }}>
            {students.map(s => {
              const isMe = s.user_id === currentUserId;
              const initials = s.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={s.user_id} style={{
                  background: '#fff',
                  border: isMe ? '1.5px solid rgba(26,92,42,0.3)' : '1px solid rgba(107,114,128,0.13)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                  {/* Name row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: isMe ? 'rgba(26,92,42,0.1)' : 'rgba(107,114,128,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 700,
                      color: isMe ? '#1a5c2a' : '#4b5563', flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.name}
                    </span>
                    {isMe && (
                      <span style={{ fontSize: '10px', color: '#1a5c2a', background: 'rgba(26,92,42,0.08)', padding: '1px 6px', borderRadius: '8px', flexShrink: 0 }}>
                        You
                      </span>
                    )}
                  </div>

                  {/* Courses */}
                  {s.courses.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                      {s.courses.map(c => (
                        <span key={c} style={{
                          fontSize: '10px', color: '#374151',
                          background: 'rgba(107,114,128,0.06)',
                          border: '1px solid rgba(107,114,128,0.12)',
                          borderRadius: '4px', padding: '1px 6px',
                        }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>No courses</span>
                  )}

                  {/* Strengths */}
                  {s.stats.mastered > 0 && (
                    <span style={{ fontSize: '10px', color: '#1a5c2a' }}>
                      {s.stats.mastered} concept{s.stats.mastered !== 1 ? 's' : ''} mastered
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
