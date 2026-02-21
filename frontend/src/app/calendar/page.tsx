'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import UploadZone from '@/components/UploadZone';
import AssignmentTable from '@/components/AssignmentTable';
import { Assignment } from '@/lib/types';
import { extractSyllabus, saveAssignments, getUpcomingAssignments, getCalendarAuthUrl, exportToGoogleCalendar } from '@/lib/api';
import { useUser } from '@/context/UserContext';

function CalendarGrid({ assignments }: { assignments: Assignment[] }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = month.getFullYear();
  const monthIdx = month.getMonth();
  const firstDay = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  const assignmentsByDay: Record<string, Assignment[]> = {};
  for (const a of assignments) {
    const d = new Date(a.due_date + 'T00:00:00');
    if (d.getFullYear() === year && d.getMonth() === monthIdx) {
      const key = d.getDate().toString();
      if (!assignmentsByDay[key]) assignmentsByDay[key] = [];
      assignmentsByDay[key].push(a);
    }
  }

  const TYPE_COLORS: Record<string, string> = {
    exam: '#ef4444',
    project: '#f97316',
    homework: '#6b7280',
    quiz: '#eab308',
    reading: '#3b82f6',
    other: '#9ca3af',
  };

  const prevMonth = () => setMonth(new Date(year, monthIdx - 1, 1));
  const nextMonth = () => setMonth(new Date(year, monthIdx + 1, 1));
  const monthName = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '16px' }}>←</button>
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{monthName}</span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '16px' }}>→</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {dayNames.map(d => (
          <div key={d} style={{ padding: '8px', textAlign: 'center', fontSize: '11px', color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>
            {d}
          </div>
        ))}
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} style={{ padding: '8px', minHeight: '60px', borderBottom: '1px solid #f3f4f6', borderRight: '1px solid #f3f4f6' }} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dayAssignments = assignmentsByDay[day.toString()] ?? [];
          const isToday = new Date().toDateString() === new Date(year, monthIdx, day).toDateString();
          return (
            <div
              key={day}
              style={{
                padding: '6px',
                minHeight: '60px',
                borderBottom: '1px solid #f3f4f6',
                borderRight: '1px solid #f3f4f6',
                background: isToday ? '#f0fdf4' : '#ffffff',
              }}
            >
              <span style={{ fontSize: '12px', color: isToday ? '#22c55e' : '#6b7280', fontWeight: isToday ? 600 : 400 }}>
                {day}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                {dayAssignments.slice(0, 2).map(a => (
                  <span key={a.id} style={{ fontSize: '10px', color: TYPE_COLORS[a.assignment_type] ?? '#9ca3af', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.title}
                  </span>
                ))}
                {dayAssignments.length > 2 && (
                  <span style={{ fontSize: '10px', color: '#9ca3af' }}>+{dayAssignments.length - 2} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarInner() {
  const { userId: USER_ID } = useUser();
  const searchParams = useSearchParams();
  const googleConnected = searchParams.get('connected') === 'true';

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [extractedAssignments, setExtractedAssignments] = useState<Assignment[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadFilename, setUploadFilename] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportedCount, setExportedCount] = useState<number | null>(null);

  useEffect(() => {
    getUpcomingAssignments(USER_ID).then(data => setAssignments(data.assignments)).catch(console.error);
  }, []);

  const handleFile = async (file: File) => {
    setUploadFilename(file.name);
    setUploadLoading(true);
    setWarnings([]);
    setExtractedAssignments([]);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await extractSyllabus(form);
      const mapped: Assignment[] = (res.assignments ?? []).map((a: any, i: number) => ({
        id: `extracted_${i}_${Date.now()}`,
        title: a.title ?? '',
        course_name: a.course_name ?? '',
        due_date: a.due_date ?? '',
        assignment_type: a.assignment_type ?? 'other',
        notes: a.notes ?? null,
        google_event_id: null,
      }));
      setExtractedAssignments(mapped);
      setWarnings(res.warnings ?? []);
    } catch (e: any) {
      setWarnings([e.message || 'Extraction failed']);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveAssignments(USER_ID, extractedAssignments);
      setAssignments(prev => {
        const ids = new Set(prev.map(a => a.id));
        return [...prev, ...extractedAssignments.filter(a => !ids.has(a.id))];
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await getCalendarAuthUrl();
      window.location.href = res.url;
    } catch {
      alert('Google Calendar not configured. Add GOOGLE_CLIENT_ID to backend .env');
    }
  };

  const handleExport = async () => {
    if (!selectedIds.length) return;
    setExporting(true);
    try {
      const res = await exportToGoogleCalendar(USER_ID, selectedIds);
      setExportedCount(res.exported_count);
      setSelectedIds([]);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setExporting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0 }}>Calendar</h1>

      <div>
        <p style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          Import Syllabus
        </p>
        <UploadZone onFile={handleFile} loading={uploadLoading} filename={uploadFilename} />
        {warnings.map((w, i) => (
          <p key={i} style={{ color: '#f97316', fontSize: '12px', marginTop: '6px' }}>{w}</p>
        ))}
      </div>

      {extractedAssignments.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Extracted ({extractedAssignments.length})
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '6px 14px', background: '#111827', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}
            >
              {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <AssignmentTable assignments={extractedAssignments} onChange={setExtractedAssignments} />
        </div>
      )}

      <div>
        <p style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          Schedule
        </p>
        <CalendarGrid assignments={assignments} />
      </div>

      {assignments.length > 0 && (
        <div>
          <p style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            All Assignments
          </p>
          <AssignmentTable
            assignments={assignments}
            onChange={setAssignments}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        </div>
      )}

      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {googleConnected ? (
          <>
            <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 500 }}>Connected to Google Calendar</span>
            {selectedIds.length > 0 && (
              <button
                onClick={handleExport}
                disabled={exporting}
                style={{ padding: '6px 14px', background: '#111827', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}
              >
                {exporting ? 'Exporting...' : `Export ${selectedIds.length} to Google`}
              </button>
            )}
            {exportedCount !== null && (
              <span style={{ fontSize: '13px', color: '#22c55e' }}>Exported {exportedCount} events</span>
            )}
          </>
        ) : (
          <button
            onClick={handleConnectGoogle}
            style={{ padding: '8px 16px', background: '#ffffff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
          >
            Connect Google Calendar
          </button>
        )}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#9ca3af' }}>Loading...</div>}>
      <CalendarInner />
    </Suspense>
  );
}
