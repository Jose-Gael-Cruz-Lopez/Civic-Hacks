'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import UploadZone from '@/components/UploadZone';
import AssignmentTable from '@/components/AssignmentTable';
import { Assignment } from '@/lib/types';
import {
  extractSyllabus,
  getUpcomingAssignments,
  getCalendarAuthUrl,
  getCalendarStatus,
  syncToGoogleCalendar,
  importGoogleEvents,
  disconnectGoogleCalendar,
} from '@/lib/api';
import { useUser } from '@/context/UserContext';

type CalendarView = 'month' | 'week' | 'day';

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  exam:     { bg: 'rgba(220,38,38,0.08)',   text: '#b91c1c', border: 'rgba(220,38,38,0.2)' },
  project:  { bg: 'rgba(234,88,12,0.08)',   text: '#c2410c', border: 'rgba(234,88,12,0.2)' },
  homework: { bg: 'rgba(107,114,128,0.1)',  text: '#374151', border: 'rgba(107,114,128,0.2)' },
  quiz:     { bg: 'rgba(161,98,7,0.08)',    text: '#92400e', border: 'rgba(161,98,7,0.2)' },
  reading:  { bg: 'rgba(29,78,216,0.08)',   text: '#1e40af', border: 'rgba(29,78,216,0.2)' },
  other:    { bg: 'rgba(107,114,128,0.08)', text: '#6b7280', border: 'rgba(107,114,128,0.15)' },
};

function AssignmentChip({ a }: { a: Assignment }) {
  const c = TYPE_COLORS[a.assignment_type] ?? TYPE_COLORS.other;
  return (
    <div
      title={`${a.title}${a.course_name ? ` — ${a.course_name}` : ''}${a.notes ? `\n${a.notes}` : ''}`}
      style={{
        background: c.bg,
        color: c.text,
        fontSize: '11px',
        padding: '2px 6px',
        borderRadius: '4px',
        lineHeight: 1.5,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontWeight: 500,
        cursor: 'default',
        border: `1px solid ${c.border}`,
      }}
    >
      {a.title}
    </div>
  );
}

function CalendarGrid({ assignments }: { assignments: Assignment[] }) {
  const [view, setView] = useState<CalendarView>('month');
  const [current, setCurrent] = useState(() => new Date());

  const toISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const today = toISO(new Date());

  const byDate: Record<string, Assignment[]> = {};
  for (const a of assignments) {
    if (!a.due_date) continue;
    if (!byDate[a.due_date]) byDate[a.due_date] = [];
    byDate[a.due_date].push(a);
  }

  const navigate = (dir: -1 | 1) => {
    if (view === 'month') {
      setCurrent(c => new Date(c.getFullYear(), c.getMonth() + dir, 1));
    } else if (view === 'week') {
      setCurrent(c => new Date(c.getTime() + dir * 7 * 86400000));
    } else {
      setCurrent(c => new Date(c.getTime() + dir * 86400000));
    }
  };

  const headerLabel = () => {
    if (view === 'month') {
      return current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (view === 'week') {
      const start = new Date(current);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const s = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const e = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${s} – ${e}`;
    }
    return current.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  // ── Month View ────────────────────────────────────────────────────────────
  const renderMonth = () => {
    const year = current.getFullYear();
    const monthIdx = current.getMonth();
    const firstDay = new Date(year, monthIdx, 1).getDay();
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ padding: '10px 8px', textAlign: 'center', fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', borderBottom: '2px solid rgba(107,114,128,0.12)', background: '#f0f5f0', letterSpacing: '0.05em' }}>
            {d}
          </div>
        ))}
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} style={{ minHeight: '130px', borderBottom: '1px solid rgba(107,114,128,0.08)', borderRight: '1px solid rgba(107,114,128,0.08)', background: '#fafcfa' }} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const iso = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayAssignments = byDate[iso] ?? [];
          const isToday = iso === today;
          return (
            <div
              key={day}
              style={{
                padding: '8px',
                minHeight: '130px',
                borderBottom: '1px solid rgba(107,114,128,0.08)',
                borderRight: '1px solid rgba(107,114,128,0.08)',
                background: isToday ? 'rgba(26,92,42,0.05)' : '#ffffff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '4px' }}>
                <span style={{
                  width: '26px', height: '26px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%',
                  background: isToday ? '#1a5c2a' : 'transparent',
                  fontSize: '12px',
                  color: isToday ? '#ffffff' : '#6b7280',
                  fontWeight: isToday ? 700 : 400,
                }}>
                  {day}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {dayAssignments.slice(0, 3).map(a => <AssignmentChip key={a.id} a={a} />)}
                {dayAssignments.length > 3 && (
                  <span style={{ fontSize: '10px', color: '#9ca3af', paddingLeft: '4px' }}>+{dayAssignments.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Week View ─────────────────────────────────────────────────────────────
  const renderWeek = () => {
    const start = new Date(current);
    start.setDate(start.getDate() - start.getDay());
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map((d, i) => {
          const iso = toISO(d);
          const isToday = iso === today;
          return (
            <div key={i} style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid rgba(107,114,128,0.12)', background: isToday ? 'rgba(26,92,42,0.05)' : '#f0f5f0', borderRight: i < 6 ? '1px solid rgba(107,114,128,0.08)' : 'none' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{DAY_NAMES[i]}</div>
              <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: isToday ? '#1a5c2a' : 'transparent', margin: '6px auto 0' }}>
                <span style={{ fontSize: '15px', color: isToday ? '#ffffff' : '#111827', fontWeight: isToday ? 700 : 500 }}>
                  {d.getDate()}
                </span>
              </div>
            </div>
          );
        })}
        {days.map((d, i) => {
          const iso = toISO(d);
          const dayAssignments = byDate[iso] ?? [];
          const isToday = iso === today;
          return (
            <div key={`body-${i}`} style={{ padding: '8px 6px', minHeight: '280px', borderRight: i < 6 ? '1px solid rgba(107,114,128,0.08)' : 'none', background: isToday ? 'rgba(26,92,42,0.04)' : '#ffffff', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {dayAssignments.map(a => <AssignmentChip key={a.id} a={a} />)}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Day View ──────────────────────────────────────────────────────────────
  const renderDay = () => {
    const iso = toISO(current);
    const dayAssignments = byDate[iso] ?? [];
    return (
      <div style={{ padding: '24px', minHeight: '300px' }}>
        {dayAssignments.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '60px 0' }}>No assignments due on this day.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px', margin: '0 auto' }}>
            {dayAssignments.map(a => {
              const c = TYPE_COLORS[a.assignment_type] ?? TYPE_COLORS.other;
              return (
                <div key={a.id} style={{ padding: '14px 16px', borderRadius: '8px', background: c.bg, borderLeft: `4px solid ${c.text}`, display: 'flex', flexDirection: 'column', gap: '6px', border: `1px solid ${c.border}` }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>{a.title}</span>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {a.course_name && <span style={{ fontSize: '12px', color: '#4b5563', fontWeight: 500 }}>{a.course_name}</span>}
                    <span style={{ fontSize: '11px', color: c.text, fontWeight: 600, background: 'rgba(255,255,255,0.8)', padding: '1px 7px', borderRadius: '4px', border: `1px solid ${c.border}` }}>{a.assignment_type}</span>
                    {a.notes && <span style={{ fontSize: '12px', color: '#6b7280' }}>{a.notes}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const viewBtnStyle = (v: CalendarView): React.CSSProperties => ({
    padding: '5px 14px',
    fontSize: '12px',
    border: view === v ? '1px solid rgba(26,92,42,0.35)' : '1px solid rgba(107,114,128,0.18)',
    borderRadius: '5px',
    cursor: 'pointer',
    background: view === v ? 'rgba(26,92,42,0.08)' : 'transparent',
    color: view === v ? '#1a5c2a' : '#6b7280',
    fontWeight: view === v ? 600 : 400,
    transition: 'all 0.1s',
  });

  return (
    <div style={{ border: '1px solid rgba(107,114,128,0.15)', borderRadius: '10px', overflow: 'hidden', background: '#ffffff' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(107,114,128,0.1)', background: '#f0f5f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid rgba(107,114,128,0.18)', borderRadius: '5px', cursor: 'pointer', color: '#6b7280', fontSize: '14px', padding: '4px 10px', lineHeight: 1 }}>←</button>
          <button onClick={() => setCurrent(new Date())} style={{ fontSize: '11px', color: '#4b5563', background: '#f8faf8', border: '1px solid rgba(107,114,128,0.18)', borderRadius: '5px', cursor: 'pointer', padding: '4px 10px', fontWeight: 500 }}>Today</button>
          <button onClick={() => navigate(1)} style={{ background: 'none', border: '1px solid rgba(107,114,128,0.18)', borderRadius: '5px', cursor: 'pointer', color: '#6b7280', fontSize: '14px', padding: '4px 10px', lineHeight: 1 }}>→</button>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginLeft: '10px' }}>{headerLabel()}</span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['day', 'week', 'month'] as CalendarView[]).map(v => (
            <button key={v} onClick={() => setView(v)} style={viewBtnStyle(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {view === 'month' && renderMonth()}
      {view === 'week' && renderWeek()}
      {view === 'day' && renderDay()}
    </div>
  );
}

function CalendarInner() {
  const { userId: USER_ID } = useUser();
  const searchParams = useSearchParams();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [extractedAssignments, setExtractedAssignments] = useState<Assignment[]>([]);
  const [fileProcessed, setFileProcessed] = useState(false);
  const [rawText, setRawText] = useState('');
  const [rawTextVisible, setRawTextVisible] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadFilename, setUploadFilename] = useState('');
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [importingGoogle, setImportingGoogle] = useState(false);

  useEffect(() => {
    getUpcomingAssignments(USER_ID)
      .then(data => setAssignments(data.assignments))
      .catch(console.error);

    // If just returned from OAuth redirect, trust the URL param immediately,
    // then verify with the backend on the next render cycle
    if (searchParams.get('connected') === 'true') {
      setGoogleConnected(true);
    }
    getCalendarStatus(USER_ID)
      .then(res => setGoogleConnected(res.connected))
      .catch(() => {});
  }, [USER_ID]);

  const handleFile = async (file: File) => {
    setUploadFilename(file.name);
    setUploadLoading(true);
    setWarnings([]);
    setExtractedAssignments([]);
    setFileProcessed(false);
    setRawText('');
    setRawTextVisible(false);
    try {
      const form = new FormData();
      form.append('file', file);
      // Backend now auto-saves to DB and returns saved_count
      const res = await extractSyllabus(form, USER_ID);
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
      setRawText(res.raw_text ?? '');
      setFileProcessed(true);
      // Merge into calendar immediately — already saved in DB
      if (mapped.length > 0) {
        setAssignments(prev => {
          const titles = new Set(prev.map(a => a.title));
          return [...prev, ...mapped.filter(a => !titles.has(a.title))];
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e: any) {
      setWarnings([e.message || 'Extraction failed']);
    } finally {
      setUploadLoading(false);
    }
  };

  // Fixed: passes USER_ID so backend knows whose token to store
  const handleConnectGoogle = async () => {
    setGoogleLoading(true);
    try {
      const res = await getCalendarAuthUrl(USER_ID);
      window.location.href = res.url;
    } catch (e: any) {
      alert(e.message || 'Failed to start Google Calendar connection.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await disconnectGoogleCalendar(USER_ID);
      setGoogleConnected(false);
      setGoogleEvents([]);
      setSyncedCount(null);
    } catch (e: any) {
      alert(e.message || 'Failed to disconnect.');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncedCount(null);
    try {
      const res = await syncToGoogleCalendar(USER_ID);
      setSyncedCount(res.synced_count);
      // Refresh so google_event_id values are up to date
      getUpcomingAssignments(USER_ID)
        .then(data => setAssignments(data.assignments))
        .catch(console.error);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleImportGoogle = async () => {
    setImportingGoogle(true);
    try {
      const res = await importGoogleEvents(USER_ID, 60);
      setGoogleEvents(res.events);
    } catch (e: any) {
      alert(e.message || 'Failed to import Google Calendar events.');
    } finally {
      setImportingGoogle(false);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>Calendar</h1>

      {/* Calendar grid — full width, prominent */}
      <CalendarGrid assignments={assignments} />

      {/* Import syllabus */}
      <div>
        <p style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          Import Syllabus
        </p>
        <UploadZone onFile={handleFile} loading={uploadLoading} filename={uploadFilename} />
        {warnings.map((w, i) => (
          <p key={i} style={{ color: '#f97316', fontSize: '12px', marginTop: '6px' }}>{w}</p>
        ))}
      </div>

      {fileProcessed && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {extractedAssignments.length > 0
                ? `Detected ${extractedAssignments.length} assignment${extractedAssignments.length !== 1 ? 's' : ''}`
                : 'No assignments detected'}
            </p>
            {extractedAssignments.length > 0 && (
              <span style={{
                padding: '4px 12px',
                background: saved ? 'rgba(26,92,42,0.08)' : 'rgba(107,114,128,0.06)',
                color: saved ? '#1a5c2a' : '#6b7280',
                border: saved ? '1px solid rgba(26,92,42,0.3)' : '1px solid rgba(107,114,128,0.15)',
                borderRadius: '4px',
                fontSize: '12px',
              }}>
                {saved ? 'Saved to calendar' : 'Auto-saving...'}
              </span>
            )}
          </div>
          <AssignmentTable assignments={extractedAssignments} onChange={setExtractedAssignments} />

          {rawText && (
            <div style={{ marginTop: '12px', border: '1px solid rgba(107,114,128,0.15)', borderRadius: '6px', overflow: 'hidden' }}>
              <button
                onClick={() => setRawTextVisible(v => !v)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8faf8', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#6b7280', fontWeight: 500, textAlign: 'left' }}
              >
                <span>Raw OCR text (reference while editing)</span>
                <span>{rawTextVisible ? '▲' : '▼'}</span>
              </button>
              {rawTextVisible && (
                <pre style={{ margin: 0, padding: '12px', fontSize: '11px', lineHeight: 1.6, color: '#374151', background: '#f5f9f5', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '320px', overflowY: 'auto' }}>
                  {rawText}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* All assignments */}
      <div>
        <p style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          All Assignments
        </p>
        {assignments.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '13px' }}>No assignments yet. Import a syllabus to get started.</p>
        ) : (
          <AssignmentTable assignments={assignments} onChange={setAssignments} />
        )}
      </div>

      {/* Google Calendar panel */}
      <div style={{ border: '1px solid rgba(107,114,128,0.15)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8faf8' }}>
        {googleConnected ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: '#1a5c2a', fontWeight: 500 }}>● Connected to Google Calendar</span>

              <button
                onClick={handleSync}
                disabled={syncing}
                style={{ padding: '6px 14px', background: 'rgba(26,92,42,0.08)', color: '#1a5c2a', border: '1px solid rgba(26,92,42,0.3)', borderRadius: '4px', fontSize: '13px', cursor: syncing ? 'default' : 'pointer', opacity: syncing ? 0.6 : 1 }}
              >
                {syncing ? 'Syncing...' : 'Sync to Google Calendar'}
              </button>

              <button
                onClick={handleImportGoogle}
                disabled={importingGoogle}
                style={{ padding: '6px 14px', background: '#f3f4f6', color: '#374151', border: '1px solid rgba(107,114,128,0.2)', borderRadius: '4px', fontSize: '13px', cursor: importingGoogle ? 'default' : 'pointer', opacity: importingGoogle ? 0.6 : 1 }}
              >
                {importingGoogle ? 'Importing...' : 'View upcoming Google events'}
              </button>

              {syncedCount !== null && (
                <span style={{ fontSize: '13px', color: '#1a5c2a' }}>
                  {syncedCount === 0 ? 'All assignments already synced' : `Synced ${syncedCount} assignment${syncedCount !== 1 ? 's' : ''}`}
                </span>
              )}

              <button
                onClick={handleDisconnectGoogle}
                style={{ marginLeft: 'auto', padding: '6px 12px', background: 'none', color: '#9ca3af', border: '1px solid rgba(107,114,128,0.2)', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
              >
                Disconnect
              </button>
            </div>

            {/* Imported Google events preview */}
            {googleEvents.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p style={{ fontSize: '11px', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  Upcoming Google Events ({googleEvents.length})
                </p>
                {googleEvents.map(ev => (
                  <div
                    key={ev.google_event_id}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#ffffff', border: '1px solid rgba(107,114,128,0.12)', borderRadius: '6px', fontSize: '13px' }}
                  >
                    <span style={{ color: '#111827' }}>{ev.title}</span>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>{ev.start_date}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <button
            onClick={handleConnectGoogle}
            disabled={googleLoading}
            style={{ padding: '8px 16px', background: '#ffffff', color: '#4b5563', border: '1px solid rgba(107,114,128,0.25)', borderRadius: '6px', fontSize: '13px', cursor: googleLoading ? 'default' : 'pointer', alignSelf: 'flex-start', opacity: googleLoading ? 0.6 : 1 }}
          >
            {googleLoading ? 'Redirecting...' : 'Connect Google Calendar'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#94a3b8' }}>Loading...</div>}>
      <CalendarInner />
    </Suspense>
  );
}