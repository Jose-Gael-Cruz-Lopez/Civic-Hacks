'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import ChatPanel from '@/components/ChatPanel';
import ModeSelector from '@/components/ModeSelector';
import QuizPanel from '@/components/QuizPanel';
import SessionSummary from '@/components/SessionSummary';
import { GraphNode, GraphEdge, ChatMessage, TeachingMode, SessionSummary as SessionSummaryType } from '@/lib/types';
import { startSession, sendChat, sendAction, endSession, getGraph, getSessions, resumeSession } from '@/lib/api';
import Link from 'next/link';
import { getMasteryLabel } from '@/lib/graphUtils';
import { useUser } from '@/context/UserContext';
import CustomSelect from '@/components/CustomSelect';

function LearnInner() {
  const { userId: USER_ID } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const topicParam = searchParams.get('topic') ?? '';
  const modeParam = searchParams.get('mode') ?? 'socratic';
  const initialQuiz = modeParam === 'quiz';

  const [mode, setMode] = useState<TeachingMode>(
    ['socratic', 'expository', 'teachback'].includes(modeParam) ? (modeParam as TeachingMode) : 'socratic'
  );
  const [quizMode, setQuizMode] = useState(initialQuiz);

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [summary, setSummary] = useState<SessionSummaryType | null>(null);
  const [graphDimensions, setGraphDimensions] = useState({ width: 500, height: 500 });
  const graphContainerRef = useRef<HTMLDivElement>(null);

  const [topic, setTopic] = useState(topicParam);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [recentSessions, setRecentSessions] = useState<{ id: string; topic: string; mode: string; started_at: string; is_active: boolean }[]>([]);

  const courses = [...new Set(nodes.map(n => n.subject).filter(Boolean))].sort();

  // Load initial graph + recent sessions
  useEffect(() => {
    getGraph(USER_ID).then(data => {
      setNodes(data.nodes);
      setEdges(data.edges);
    }).catch(console.error);
    getSessions(USER_ID, 10).then(data => setRecentSessions(data.sessions)).catch(console.error);
  }, []);

  useEffect(() => {
    const el = graphContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const r = entries[0];
      if (r) setGraphDimensions({ width: r.contentRect.width, height: r.contentRect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!topicParam || quizMode) return;
    beginSession(topicParam, mode);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const beginSession = async (t: string, m: TeachingMode) => {
    setSessionLoading(true);
    setMessages([]);
    setSessionId(null);
    try {
      const res = await startSession(USER_ID, t, m);
      setSessionId(res.session_id);
      setNodes(res.graph_state.nodes);
      setEdges(res.graph_state.edges);
      setMessages([{
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: res.initial_message,
        timestamp: new Date().toISOString(),
      }]);
    } catch (e) {
      console.error(e);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleSend = async (message: string) => {
    if (!sessionId) return;
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setChatLoading(true);
    try {
      const res = await sendChat(sessionId, USER_ID, message, mode);
      setMessages(prev => [...prev, {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
      }]);
      getGraph(USER_ID).then(data => { setNodes(data.nodes); setEdges(data.edges); }).catch(console.error);
    } catch (e) {
      console.error(e);
    } finally {
      setChatLoading(false);
    }
  };

  const handleAction = async (action: 'hint' | 'confused' | 'skip') => {
    if (!sessionId) return;
    setChatLoading(true);
    try {
      const res = await sendAction(sessionId, USER_ID, action, mode);
      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
      }]);
      getGraph(USER_ID).then(data => { setNodes(data.nodes); setEdges(data.edges); }).catch(console.error);
    } catch (e) {
      console.error(e);
    } finally {
      setChatLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;
    try {
      const res = await endSession(sessionId);
      setSummary(res.summary);
    } catch (e) {
      console.error(e);
    }
  };

  const handleModeChange = (newMode: TeachingMode) => setMode(newMode);

  const handleSelectCourse = (course: string) => {
    if (!course) return;
    setSelectedCourse(course);
    setTopic(course);
    beginSession(course, mode);
  };

  const handleResumeSession = async (sid: string) => {
    if (!sid) return;
    setSessionLoading(true);
    try {
      const res = await resumeSession(sid);
      setSessionId(res.session.id);
      setTopic(res.session.topic);
      setMode(res.session.mode as TeachingMode);
      setMessages(res.messages.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: m.created_at,
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setSessionLoading(false);
    }
  };

  const topicNode = nodes.find(n => n.concept_name.toLowerCase() === topic.toLowerCase());

  return (
    <div style={{ height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        background: '#f0f5f0',
        borderBottom: '1px solid rgba(107,114,128,0.12)',
        padding: '0 20px',
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexShrink: 0,
      }}>
        <Link href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '18px', lineHeight: 1 }}>
          ←
        </Link>

        <CustomSelect
          value={selectedCourse}
          onChange={handleSelectCourse}
          placeholder="Select a course…"
          options={courses.map(c => ({ value: c, label: c }))}
          style={{ minWidth: '160px' }}
        />

        {/* Resume past session */}
        {recentSessions.length > 0 && (
          <CustomSelect
            value=""
            onChange={sid => handleResumeSession(sid)}
            placeholder="Resume session…"
            options={recentSessions.map(s => {
              const date = new Date(s.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              return { value: s.id, label: `${s.topic} · ${s.mode} · ${date}${s.is_active ? ' ●' : ''}` };
            })}
            style={{ minWidth: '200px' }}
          />
        )}

        {topic && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {topic !== selectedCourse && <span style={{ fontSize: '13px', color: '#6b7280' }}>→</span>}
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
              {topic !== selectedCourse ? topic : ''}
            </span>
            {topicNode && (
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                {getMasteryLabel(topicNode.mastery_score)}
              </span>
            )}
          </div>
        )}

        {sessionLoading && <span style={{ fontSize: '13px', color: '#6b7280' }}>Starting…</span>}

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
          <ModeSelector
            mode={mode}
            onChange={handleModeChange}
            showQuiz
            quizActive={quizMode}
            onToggleQuiz={() => setQuizMode(q => !q)}
          />
        </div>
      </div>

      {/* Main split */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, borderRight: '1px solid rgba(107,114,128,0.12)', overflow: 'hidden' }}>
          {quizMode ? (
            <div style={{ height: '100%', overflow: 'auto' }}>
              <QuizPanel
                nodes={nodes}
                userId={USER_ID}
                onLearnConcept={concept => {
                  setQuizMode(false);
                  if (concept) { setTopic(concept); beginSession(concept, mode); }
                }}
              />
            </div>
          ) : (
            <ChatPanel
              messages={messages}
              onSend={handleSend}
              onAction={handleAction}
              onEndSession={handleEndSession}
              loading={chatLoading || sessionLoading}
              mode={mode}
            />
          )}
        </div>

        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <div ref={graphContainerRef} style={{ flex: 1 }}>
            <KnowledgeGraph
              nodes={nodes}
              edges={edges}
              width={graphDimensions.width}
              height={graphDimensions.height}
              animate
              interactive
              highlightId={topicNode?.id}
              onNodeClick={n => { setTopic(n.concept_name); beginSession(n.concept_name, mode); }}
            />
          </div>
          <div style={{ position: 'absolute', bottom: '12px', right: '12px' }}>
            <Link href="/tree" style={{ fontSize: '12px', color: '#475569', textDecoration: 'none' }}>
              View Full Tree
            </Link>
          </div>
        </div>
      </div>

      {summary && (
        <SessionSummary
          summary={summary}
          onDashboard={() => router.push('/')}
          onNewSession={() => { setSummary(null); setSessionId(null); setMessages([]); }}
        />
      )}
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#9ca3af' }}>Loading...</div>}>
      <LearnInner />
    </Suspense>
  );
}
