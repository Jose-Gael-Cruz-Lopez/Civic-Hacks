'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import ChatPanel from '@/components/ChatPanel';
import ModeSelector from '@/components/ModeSelector';
import QuizPanel from '@/components/QuizPanel';
import SessionSummary from '@/components/SessionSummary';
import { GraphNode, GraphEdge, ChatMessage, TeachingMode, SessionSummary as SessionSummaryType } from '@/lib/types';
import { startSession, sendChat, sendAction, endSession, getGraph } from '@/lib/api';
import Link from 'next/link';
import { getMasteryLabel } from '@/lib/graphUtils';
import { useUser } from '@/context/UserContext';

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

  // Derive unique course list from graph nodes
  const courses = [...new Set(nodes.map(n => n.subject).filter(Boolean))].sort();

  // Load initial graph
  useEffect(() => {
    getGraph(USER_ID).then(data => {
      setNodes(data.nodes);
      setEdges(data.edges);
    }).catch(console.error);
  }, []);

  // Watch graph container size
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

  // If a topic was passed via URL (e.g. from tree "Learn This" button), auto-start
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
      // Re-fetch graph to reflect any mastery changes — doesn't affect chat
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

  // Switching mode only updates state — the new mode is passed on every subsequent message.
  // The graph and session are unaffected.
  const handleModeChange = (newMode: TeachingMode) => {
    setMode(newMode);
  };

  const handleSelectCourse = (course: string) => {
    if (!course) return;
    setSelectedCourse(course);
    setTopic(course);
    beginSession(course, mode);
  };

  // Get topic node for header mastery display
  const topicNode = nodes.find(n =>
    n.concept_name.toLowerCase() === topic.toLowerCase()
  );

  return (
    <div style={{ height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        background: 'rgba(3,7,18,0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(148,163,184,0.1)',
        padding: '0 20px',
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexShrink: 0,
      }}>
        <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '18px', lineHeight: 1 }}>
          ←
        </Link>

        {/* Course dropdown — always visible; topic label shown when session is active */}
        <select
          value={selectedCourse}
          onChange={e => handleSelectCourse(e.target.value)}
          style={{
            padding: '5px 10px',
            border: '1px solid rgba(148,163,184,0.2)',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#f1f5f9',
            background: 'rgba(15,23,42,0.7)',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="">Select a course…</option>
          {courses.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Active topic / concept label */}
        {topic && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {topic !== selectedCourse && (
              <span style={{ fontSize: '13px', color: '#475569' }}>→</span>
            )}
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#f1f5f9' }}>
              {topic !== selectedCourse ? topic : ''}
            </span>
            {topicNode && (
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {getMasteryLabel(topicNode.mastery_score)}
              </span>
            )}
          </div>
        )}

        {sessionLoading && (
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>Starting…</span>
        )}

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
        {/* Left panel */}
        <div style={{ flex: 1, borderRight: '1px solid rgba(148,163,184,0.08)', overflow: 'hidden' }}>
          {quizMode ? (
            <div style={{ height: '100%', overflow: 'auto' }}>
              <QuizPanel
                nodes={nodes}
                userId={USER_ID}
                onLearnConcept={(concept) => {
                  setQuizMode(false);
                  if (concept) {
                    setTopic(concept);
                    beginSession(concept, mode);
                  }
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

        {/* Right panel: live graph */}
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
              onNodeClick={n => {
                setTopic(n.concept_name);
                beginSession(n.concept_name, mode);
              }}
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
          onNewSession={() => {
            setSummary(null);
            setSessionId(null);
            setMessages([]);
          }}
        />
      )}
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#94a3b8' }}>Loading...</div>}>
      <LearnInner />
    </Suspense>
  );
}
