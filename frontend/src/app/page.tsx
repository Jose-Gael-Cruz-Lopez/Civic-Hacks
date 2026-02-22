'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import { GraphNode, GraphStats, Recommendation, Assignment } from '@/lib/types';
import { getGraph, getRecommendations, getUpcomingAssignments } from '@/lib/api';
import { getMasteryColor, getMasteryLabel, formatDueDate, formatRelativeTime } from '@/lib/graphUtils';
import { useUser } from '@/context/UserContext';
import Link from 'next/link';

const STATS_LABELS: Record<string, string> = {
  mastered: 'mastered',
  learning: 'learning',
  struggling: 'struggling',
  unexplored: 'unexplored',
};

const GLASS: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(107, 114, 128, 0.15)',
  borderRadius: '10px',
};

export default function Dashboard() {
  const router = useRouter();
  const { userId, userName } = useUser();
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphDimensions, setGraphDimensions] = useState({ width: 600, height: 400 });

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

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
        setAssignments(assignData.assignments.slice(0, 4));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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

  const handleNodeClick = (node: GraphNode) => {
    router.push(`/learn?topic=${encodeURIComponent(node.concept_name)}`);
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 48px)' }}>
      {/* Left: Graph + upcoming */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', gap: '14px' }}>
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
              edges={edges}
              width={graphDimensions.width}
              height={graphDimensions.height}
              interactive
              onNodeClick={handleNodeClick}
            />
          )}
        </div>

        {/* Upcoming assignments */}
        <div style={{ ...GLASS, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <p style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Upcoming
            </p>
            <Link href="/calendar" style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'none' }}>
              View Calendar
            </Link>
          </div>
          {assignments.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '13px' }}>No upcoming assignments</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {assignments.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280', minWidth: '50px' }}>
                    {formatDueDate(a.due_date)}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>{a.course_name}</span>
                  <span style={{ fontSize: '13px', color: '#374151' }}>{a.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Sidebar */}
      <div style={{ width: '272px', display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px 20px 20px 0', overflowY: 'auto' }}>

        {/* User header */}
        <div style={{ ...GLASS, padding: '16px' }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>{userName}</p>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
            {stats?.streak ?? 0} day streak
          </p>
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
            href="/learn"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '10px',
              background: 'rgba(26,92,42,0.08)',
              border: '1px solid rgba(26,92,42,0.3)',
              borderRadius: '7px',
              color: '#1a5c2a',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Start Learning
          </Link>
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
  );
}
