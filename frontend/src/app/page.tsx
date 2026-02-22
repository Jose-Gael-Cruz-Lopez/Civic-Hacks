'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import UploadZone from '@/components/UploadZone';
import AssignmentTable from '@/components/AssignmentTable';
import { GraphNode, GraphStats, Recommendation, Assignment } from '@/lib/types';
import { getGraph, getRecommendations, getUpcomingAssignments, extractSyllabus, saveAssignments } from '@/lib/api';
import { getMasteryColor, getMasteryLabel, formatDueDate, formatRelativeTime, getCourseColor } from '@/lib/graphUtils';
import { useUser } from '@/context/UserContext';
import Link from 'next/link';

const STATS_LABELS: Record<string, string> = {
  mastered: 'Mastered',
  learning: 'Learning',
  struggling: 'Struggling',
  unexplored: 'Unexplored',
};

const GLASS: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(107, 114, 128, 0.15)',
  borderRadius: '10px',
};

const UI_FONT = "var(--font-dm-sans), 'DM Sans', sans-serif";

const QUOTES = [
  '"The more that you read, the more things you will know." — Dr. Seuss',
  '"Live as if you were to die tomorrow. Learn as if you were to live forever." — Gandhi',
  '"The beautiful thing about learning is that no one can take it away from you." — B.B. King',
  '"Education is not the filling of a pail, but the lighting of a fire." — W.B. Yeats',
  '"An investment in knowledge pays the best interest." — Benjamin Franklin',
  '"Tell me and I forget. Teach me and I remember. Involve me and I learn." — Benjamin Franklin',
  '"The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice." — Brian Herbert',
  'Fun fact: The human brain can store roughly 2.5 petabytes of information.',
  'Fun fact: Spaced repetition can boost long-term retention by up to 80%.',
  'Fun fact: Teaching others is one of the most effective ways to solidify your own knowledge.',
  'Fun fact: Your brain consolidates memories during sleep — rest is part of learning.',
  'Fun fact: Taking short breaks during study sessions can improve focus and retention.',
  'Fun fact: Handwriting notes activates more areas of the brain than typing them.',
];

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function Dashboard() {
  const router = useRouter();
  const { userId, userName } = useUser();
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphDimensions, setGraphDimensions] = useState({ width: 600, height: 400 });

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  // All upcoming assignments — used by course panel and upcoming strip
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Greeting animation
  const [displayedGreeting, setDisplayedGreeting] = useState('');
  const [greetingDone, setGreetingDone] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [quote, setQuote] = useState(QUOTES[0]);

useEffect(() => {
  setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
}, []);
  // Collapsed courses state (set of subject names that are collapsed)
  const [collapsedCourses, setCollapsedCourses] = useState<Set<string>>(new Set());

  const toggleCourse = (subject: string) => {
    setCollapsedCourses(prev => {
      const next = new Set(prev);
      if (next.has(subject)) next.delete(subject);
      else next.add(subject);
      return next;
    });
  };

  // Upload panel state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFilename, setUploadFilename] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const [extractedAssignments, setExtractedAssignments] = useState<Assignment[]>([]);
  const [fileProcessed, setFileProcessed] = useState(false);
  const [rawText, setRawText] = useState('');
  const [rawTextVisible, setRawTextVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Mon–Sun dates for the current week (computed once on mount)
  const weekInfo = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString().split('T')[0];
    const dow = today.getDay(); // 0=Sun … 6=Sat
    const daysFromMon = dow === 0 ? 6 : dow - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMon);
    const LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dates = LABELS.map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      return { label, iso, isToday: iso === todayISO, isFuture: iso > todayISO };
    });
    return { todayISO, dates };
  }, []);

  // Which days this week had any study activity (derived from node last_studied_at)
  const activeDaysThisWeek = useMemo(() => {
    const set = new Set<string>();
    const weekIsos = new Set(weekInfo.dates.map(d => d.iso));
    for (const n of nodes) {
      if (n.last_studied_at) {
        const iso = n.last_studied_at.split('T')[0];
        if (weekIsos.has(iso)) set.add(iso);
      }
    }
    return set;
  }, [nodes, weekInfo]);

  // Derive course list from graph nodes — one entry per unique subject, preserving discovery order
  const courses = useMemo(() => {
    const subjectMap = new Map<string, GraphNode[]>();
    for (const n of nodes) {
      if (!n.subject || n.is_subject_root || n.mastery_tier === 'subject_root') continue;
      if (!subjectMap.has(n.subject)) subjectMap.set(n.subject, []);
      subjectMap.get(n.subject)!.push(n);
    }
    return Array.from(subjectMap.entries()).map(([subject, courseNodes]) => {
      const avgMastery =
        courseNodes.length > 0
          ? courseNodes.reduce((s, n) => s + n.mastery_score, 0) / courseNodes.length
          : 0;
      return { subject, avgMastery, nodeCount: courseNodes.length };
    });
  }, [nodes]);

  // Filter out edges that cross subject boundaries so each course cluster stays separate.
  // Subject-root edges (subject_root__*) are always kept; only same-subject concept edges are kept.
  const filteredEdges = useMemo(() => {
    const nodeSubjectMap = new Map(nodes.map(n => [n.id, n.subject]));
    return edges.filter(e => {
      const srcId = e.source as string;
      const tgtId = e.target as string;
      if (srcId.startsWith('subject_root__') || tgtId.startsWith('subject_root__')) return true;
      const srcSubj = nodeSubjectMap.get(srcId);
      const tgtSubj = nodeSubjectMap.get(tgtId);
      return !srcSubj || !tgtSubj || srcSubj === tgtSubj;
    });
  }, [nodes, edges]);

  useEffect(() => {
    async function load() {
      try {
        const [graphData, recData, assignData] = await Promise.all([
          getGraph(userId),
          getRecommendations(userId),
          getUpcomingAssignments(userId),
        ]);
        setNodes(graphData.nodes);
        setEdges(graphData.edges);
        setStats(graphData.stats);
        setRecommendations(recData.recommendations.slice(0, 3));
        setAllAssignments(assignData.assignments); // keep all for per-course breakdown
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  // Typing animation for greeting
  useEffect(() => {
    const firstName = userName.split(' ')[0];
    const greeting = `${getTimeGreeting()}, ${firstName}.`;
    let i = 0;
    setDisplayedGreeting('');
    setGreetingDone(false);
    setCursorVisible(true);
    const interval = setInterval(() => {
      i++;
      setDisplayedGreeting(greeting.slice(0, i));
      if (i >= greeting.length) {
        clearInterval(interval);
        setTimeout(() => setGreetingDone(true), 300);
      }
    }, 55);
    return () => clearInterval(interval);
  }, [userName]);

  // Blinking cursor while typing
  useEffect(() => {
    if (greetingDone) {
      setCursorVisible(false);
      return;
    }
    const blink = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(blink);
  }, [greetingDone]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) setGraphDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    router.push(`/learn?topic=${encodeURIComponent(node.concept_name)}`);
  }, [router]);

  const handleFile = async (file: File) => {
    setUploadFilename(file.name);
    setUploadLoading(true);
    setUploadWarnings([]);
    setExtractedAssignments([]);
    setFileProcessed(false);
    setRawText('');
    setRawTextVisible(false);
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
      setUploadWarnings(res.warnings ?? []);
      setRawText(res.raw_text ?? '');
      setFileProcessed(true);
    } catch (e: any) {
      setUploadWarnings([e.message || 'Extraction failed']);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveAssignments(userId, extractedAssignments);
      setAllAssignments(prev => {
        const ids = new Set(prev.map(a => a.id));
        return [...prev, ...extractedAssignments.filter(a => !ids.has(a.id))];
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        closeUpload();
      }, 1500);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const closeUpload = () => {
    setShowUpload(false);
    setUploadFilename('');
    setUploadLoading(false);
    setUploadWarnings([]);
    setExtractedAssignments([]);
    setFileProcessed(false);
    setRawText('');
    setRawTextVisible(false);
  };

  return (
    <>
      <div style={{ display: 'flex', height: 'calc(100vh - 48px)' }}>

        {/* ── Left panel: Course list ─────────────────────────────────────── */}
        <div
          className="dash-scroll"
          style={{
            width: '300px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '20px 10px 20px 20px',
            overflowY: 'auto',
            fontFamily: UI_FONT,
          }}
        >
          <p style={{
            fontSize: '11px',
            fontWeight: 500,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            marginBottom: '2px',
          }}>
            Courses
          </p>

          {loading ? (
            <div style={{ fontSize: '13px', color: '#9ca3af', paddingTop: '8px' }}>Loading…</div>
          ) : courses.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#9ca3af', paddingTop: '8px' }}>No courses yet</div>
          ) : (
            courses.map(({ subject, avgMastery }) => {
              const c = getCourseColor(subject);
              const pct = Math.round(avgMastery * 100);

              // 5 soonest upcoming assignments for this course (case-insensitive match)
              const courseAssignments = allAssignments
                .filter(a => a.course_name?.toLowerCase() === subject.toLowerCase() && a.due_date)
                .sort((a, b) => a.due_date.localeCompare(b.due_date))
                .slice(0, 5);

              const isCollapsed = collapsedCourses.has(subject);

              return (
                <div
                  key={subject}
                  style={{
                    ...GLASS,
                    padding: '12px 13px',
                  }}
                >
                  {/* Course name row — clickable to collapse */}
                  <button
                    onClick={() => toggleCourse(subject)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: c.text,
                      letterSpacing: '0.01em',
                    }}>
                      {subject}
                    </span>
                    <span style={{
                      fontSize: '16px',
                      color: '#9ca3af',
                      transition: 'transform 0.3s ease',
                      transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      display: 'inline-block',
                      lineHeight: 1,
                    }}>
                      ▾
                    </span>
                  </button>

                  {/* Progress bar */}
                  <div style={{
                    height: '5px',
                    background: 'rgba(107,114,128,0.12)',
                    borderRadius: '3px',
                    marginTop: '7px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: c.fill,
                      borderRadius: '3px',
                      transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                    }} />
                  </div>
                  <span style={{
                    fontSize: '10px',
                    color: '#9ca3af',
                    display: 'block',
                    marginTop: '3px',
                  }}>
                    {pct}% mastery
                  </span>

                  {/* Upcoming assignments — always rendered, collapsed via maxHeight */}
                  <div style={{
                    overflow: 'hidden',
                    maxHeight: isCollapsed ? '0px' : '500px',
                    transition: 'max-height 0.35s ease',
                  }}>
                    <div style={{
                      marginTop: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      borderTop: `1px solid ${c.border}`,
                      paddingTop: '9px',
                    }}>
                      {courseAssignments.length === 0 ? (
                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>No upcoming assignments</span>
                      ) : courseAssignments.map(a => (
                        <div key={a.id}>
                          {/* Assignment title in course color */}
                          <div style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            color: c.text,
                            lineHeight: 1.35,
                            wordBreak: 'break-word',
                          }}>
                            {a.title}
                          </div>
                          {/* Category / type + due date */}
                          <div style={{
                            fontSize: '10px',
                            color: '#9ca3af',
                            marginTop: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}>
                            <span style={{
                              background: c.bg,
                              color: c.text,
                              padding: '0px 5px',
                              borderRadius: '3px',
                              fontSize: '9px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              border: `1px solid ${c.border}`,
                            }}>
                              {a.assignment_type}
                            </span>
                            <span>{formatDueDate(a.due_date)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Center: Greeting + Graph + Upcoming ────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', gap: '14px', minWidth: 0 }}>

          {/* Header: Typed Greeting + Quote + Action Buttons */}
          <div style={{ textAlign: 'center', paddingTop: '14px', paddingBottom: '10px' }}>
            <h1
              style={{
                fontSize: '50px',
                fontWeight: 700,
                color: '#111827',
                margin: 0,
                letterSpacing: '-0.03em',
                minHeight: '60px',
                lineHeight: '1.1',
              }}
            >
              {displayedGreeting}
              <span
                style={{
                  opacity: cursorVisible ? 1 : 0,
                  color: '#1a5c2a',
                  fontWeight: 200,
                  marginLeft: '1px',
                  transition: 'opacity 0.1s',
                }}
              >
                |
              </span>
            </h1>

            <p
              style={{
                fontSize: '15px',
                color: '#6b7280',
                marginTop: '5px',
                fontStyle: 'italic',
                opacity: greetingDone ? 1 : 0,
                transition: 'opacity 0.7s ease',
                minHeight: '22px',
                fontFamily: UI_FONT,
              }}
            >
              {quote}
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '12px' }}>
              <Link
                href="/learn"
                style={{
                  padding: '8px 22px',
                  background: '#1a5c2a',
                  color: '#ffffff',
                  borderRadius: '7px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-block',
                  letterSpacing: '0.5px',
                  fontFamily: UI_FONT,
                }}
              >
                Start Learning
              </Link>
              <button
                onClick={() => setShowUpload(true)}
                style={{
                  padding: '8px 22px',
                  background: '#ffffff',
                  color: '#374151',
                  border: '1px solid rgba(107,114,128,0.28)',
                  borderRadius: '7px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: UI_FONT,
                  letterSpacing: '0.5px',
                }}
              >
                Upload Assignments
              </button>
            </div>
          </div>

          {/* Knowledge Graph */}
          <div
            ref={containerRef}
            style={{
              flex: 1,
              ...GLASS,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: '14px' }}>
                Loading graph…
              </div>
            ) : (
              <KnowledgeGraph
                nodes={nodes}
                edges={filteredEdges}
                width={graphDimensions.width}
                height={graphDimensions.height}
                interactive
                onNodeClick={handleNodeClick}
              />
            )}
          </div>

          {/* Upcoming assignments strip */}
          <div style={{ ...GLASS, padding: '14px 16px', fontFamily: UI_FONT }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Upcoming
              </p>
              <Link href="/calendar" style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'none' }}>
                View Calendar
              </Link>
            </div>
            {allAssignments.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: '13px' }}>No upcoming assignments</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {allAssignments.slice(0, 4).map(a => {
                  const c = getCourseColor(a.course_name);
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280', minWidth: '50px' }}>
                        {formatDueDate(a.due_date)}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: c.text, minWidth: '52px' }}>
                        {a.course_name}
                      </span>
                      <span style={{ fontSize: '13px', color: '#374151' }}>{a.title}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Sidebar ──────────────────────────────────────────────── */}
        <div className="dash-scroll" style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px 20px 20px 10px', overflowY: 'auto', fontFamily: UI_FONT }}>

          {/* User header + streak */}
          <div style={{ ...GLASS, padding: '16px' }}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>{userName}</p>

            {/* Streak count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px' }}>
              <span style={{ fontSize: '17px', lineHeight: 1 }}>🔥</span>
              <span style={{ fontSize: '17px', fontWeight: 700, color: '#ea580c', lineHeight: 1 }}>
                {stats?.streak ?? 0}
              </span>
              <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '1px' }}>day streak</span>
            </div>

            {/* 7-day week strip */}
            <div style={{ display: 'flex', gap: '2px', marginTop: '12px' }}>
              {weekInfo.dates.map(({ label, iso, isToday, isFuture }) => {
                const isActive = activeDaysThisWeek.has(iso);
                return (
                  <div
                    key={iso}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {/* Day label */}
                    <span style={{
                      fontSize: '8.5px',
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? '#ea580c' : '#9ca3af',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                    }}>
                      {label}
                    </span>
                    {/* Fire or empty ring */}
                    {isActive ? (
                      <span style={{ fontSize: '15px', lineHeight: 1 }}>🔥</span>
                    ) : (
                      <div style={{
                        width: '15px',
                        height: '15px',
                        borderRadius: '50%',
                        border: `1.5px solid ${isFuture ? 'rgba(156,163,175,0.18)' : 'rgba(156,163,175,0.38)'}`,
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div style={{ ...GLASS, padding: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                Knowledge
              </p>
              {(['mastered', 'learning', 'struggling', 'unexplored'] as const).map(tier => (
                <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{
                    width: 9, height: 9, borderRadius: '50%',
                    background: getMasteryColor(tier),
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: '13px', color: '#374151' }}>
                    {stats[tier]} {STATS_LABELS[tier]}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div style={{ ...GLASS, padding: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Learn Next
              </p>
              {recommendations.map(rec => {
                const node = nodes.find(n => n.concept_name === rec.concept_name);
                return (
                  <Link
                    key={rec.concept_name}
                    href={`/learn?topic=${encodeURIComponent(rec.concept_name)}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid rgba(107,114,128,0.1)',
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{ fontSize: '13px', color: '#374151' }}>{rec.concept_name}</span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      {node ? getMasteryLabel(node.mastery_score) : '0%'}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div style={{ ...GLASS, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link
              href="/learn?mode=quiz"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '10px',
                background: '#f8faf8',
                border: '1px solid rgba(107,114,128,0.18)',
                borderRadius: '7px',
                color: '#4b5563',
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              Quick Quiz
            </Link>
            <Link
              href="/social"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '6px',
                color: '#6b7280',
                fontSize: '13px',
                textDecoration: 'none',
              }}
            >
              Study Room
            </Link>
          </div>

          {/* Recent activity */}
          {nodes.length > 0 && (
            <div style={{ ...GLASS, padding: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Recent Activity
              </p>
              {nodes
                .filter(n => n.last_studied_at)
                .sort((a, b) => (b.last_studied_at ?? '').localeCompare(a.last_studied_at ?? ''))
                .slice(0, 4)
                .map(n => (
                  <div key={n.id} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '7px' }}>
                    <span style={{ fontSize: '12px', color: '#374151' }}>
                      {n.concept_name} — {getMasteryLabel(n.mastery_score)}
                    </span>
                    <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '8px', flexShrink: 0 }}>
                      {formatRelativeTime(n.last_studied_at)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Upload Assignments Modal ────────────────────────────────────────── */}
      {showUpload && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={e => { if (e.target === e.currentTarget) closeUpload(); }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '28px',
              width: '780px',
              maxWidth: '95vw',
              maxHeight: '88vh',
              overflowY: 'auto',
              position: 'relative',
              border: '1px solid rgba(107,114,128,0.15)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
          >
            <button
              onClick={closeUpload}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: '#6b7280',
                lineHeight: 1,
                padding: '4px 6px',
                fontFamily: 'inherit',
                borderRadius: '4px',
              }}
            >
              ✕
            </button>

            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
              Upload Assignments
            </h2>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px' }}>
              Upload a syllabus PDF to automatically extract assignment deadlines and names. Edit before saving.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Syllabus File
              </p>
              <UploadZone onFile={handleFile} loading={uploadLoading} filename={uploadFilename} />
              {uploadWarnings.map((w, i) => (
                <p key={i} style={{ color: '#f97316', fontSize: '12px', marginTop: '6px' }}>{w}</p>
              ))}
            </div>

            {fileProcessed && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {extractedAssignments.length > 0
                      ? `Detected ${extractedAssignments.length} assignment${extractedAssignments.length !== 1 ? 's' : ''} — edit before saving`
                      : 'No assignments detected — add rows manually'}
                  </p>
                  <button
                    onClick={handleSave}
                    disabled={saving || extractedAssignments.length === 0}
                    style={{
                      padding: '6px 16px',
                      background: saved ? '#16a34a' : extractedAssignments.length === 0 ? '#f5f5f5' : '#1a5c2a',
                      color: extractedAssignments.length === 0 ? '#9ca3af' : '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: extractedAssignments.length === 0 ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                      transition: 'background 0.2s',
                    }}
                  >
                    {saved ? 'Saved!' : saving ? 'Saving...' : 'Save to Calendar'}
                  </button>
                </div>

                <AssignmentTable assignments={extractedAssignments} onChange={setExtractedAssignments} />

                {rawText && (
                  <div style={{ marginTop: '12px', border: '1px solid rgba(107,114,128,0.15)', borderRadius: '6px', overflow: 'hidden' }}>
                    <button
                      onClick={() => setRawTextVisible(v => !v)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#f8faf8',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: '#6b7280',
                        fontWeight: 500,
                        textAlign: 'left',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span>Raw OCR text (reference while editing)</span>
                      <span>{rawTextVisible ? '▲' : '▼'}</span>
                    </button>
                    {rawTextVisible && (
                      <pre style={{
                        margin: 0,
                        padding: '12px',
                        fontSize: '11px',
                        lineHeight: 1.6,
                        color: '#374151',
                        background: '#f5f9f5',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        maxHeight: '240px',
                        overflowY: 'auto',
                      }}>
                        {rawText}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
