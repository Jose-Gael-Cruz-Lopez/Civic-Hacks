'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import ChatPanel from '@/components/ChatPanel';
import ModeSelector from '@/components/ModeSelector';
import QuizPanel from '@/components/QuizPanel';
import SessionSummary from '@/components/SessionSummary';
import { GraphNode, GraphEdge, ChatMessage, TeachingMode, GraphUpdate, SessionSummary as SessionSummaryType } from '@/lib/types';
import { startSession, sendChat, sendAction, endSession, getGraph } from '@/lib/api';
import Link from 'next/link';
import { getMasteryLabel } from '@/lib/graphUtils';

const USER_ID = 'user_andres';

function LearnInner() {
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
  const [currentMastery, setCurrentMastery] = useState<number | null>(null);

  const [topic, setTopic] = useState(topicParam);
  const [topicInput, setTopicInput] = useState(topicParam);

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

  // Start session when topic is set
  useEffect(() => {
    if (!topic || quizMode) return;
    beginSession(topic, mode);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const beginSession = async (t: string, m: TeachingMode) => {
    setSessionLoading(true);
    setMessages([]);
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

      // Track mastery for current topic node
      const topicNode = res.graph_state.nodes.find((n: GraphNode) =>
        n.concept_name.toLowerCase() === t.toLowerCase()
      );
      if (topicNode) setCurrentMastery(topicNode.mastery_score);
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
      const aiMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMsg]);
      applyGraphUpdate(res.graph_update);
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
      const aiMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMsg]);
      applyGraphUpdate(res.graph_update);
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

  const applyGraphUpdate = (update: GraphUpdate) => {
    // Re-fetch graph after update for fresh state
    getGraph(USER_ID).then(data => {
      setNodes(data.nodes);
      setEdges(data.edges);
    }).catch(console.error);
  };

  const handleModeChange = (newMode: TeachingMode) => {
    setMode(newMode);
    if (sessionId && topic) {
      beginSession(topic, newMode);
    }
  };

  const handleStartTopic = () => {
    if (!topicInput.trim()) return;
    setTopic(topicInput.trim());
    beginSession(topicInput.trim(), mode);
  };

  // Get topic node for header mastery display
  const topicNode = nodes.find(n =>
    n.concept_name.toLowerCase() === topic.toLowerCase()
  );

  return (
    <div style={{ height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      {/* Top bar */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
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

        {/* Topic input or display */}
        {!sessionId && !sessionLoading ? (
          <div style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '400px' }}>
            <input
              value={topicInput}
              onChange={e => setTopicInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStartTopic()}
              placeholder="What do you want to learn?"
              style={{
                flex: 1,
                padding: '6px 10px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleStartTopic}
              style={{
                padding: '6px 12px',
                background: '#111827',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Start
            </button>
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: '#111827' }}>{topic}</span>
            {topicNode && (
              <span style={{ fontSize: '13px', color: '#9ca3af', marginLeft: '8px' }}>
                {getMasteryLabel(topicNode.mastery_score)}
              </span>
            )}
            {sessionLoading && <span style={{ fontSize: '13px', color: '#9ca3af', marginLeft: '8px' }}>Starting...</span>}
          </div>
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
        <div style={{ flex: 1, borderRight: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {quizMode ? (
            <div style={{ height: '100%', overflow: 'auto', background: '#ffffff' }}>
              <QuizPanel
                nodes={nodes}
                userId={USER_ID}
                onLearnConcept={(concept) => {
                  setQuizMode(false);
                  if (concept) {
                    setTopicInput(concept);
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
                setTopicInput(n.concept_name);
                setTopic(n.concept_name);
                beginSession(n.concept_name, mode);
              }}
            />
          </div>
          <div style={{ position: 'absolute', bottom: '12px', right: '12px' }}>
            <Link href="/tree" style={{ fontSize: '12px', color: '#9ca3af', textDecoration: 'none' }}>
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
    <Suspense fallback={<div style={{ padding: 40, color: '#9ca3af' }}>Loading...</div>}>
      <LearnInner />
    </Suspense>
  );
}
