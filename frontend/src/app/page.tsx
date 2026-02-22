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
  background: 'rgba(8, 13, 30, 0.65)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(148, 163, 184, 0.1)',
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#334155', fontSize: '14px' }}>
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
            <p style={{ fontSize: '11px', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Upcoming
            </p>
            <Link href="/calendar" style={{ fontSize: '12px', color: '#64748b', textDecoration: 'none' }}>
              View Calendar
            </Link>
          </div>
          {assignments.length === 0 ? (
            <p style={{ color: '#334155', fontSize: '13px' }}>No upcoming assignments</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {assignments.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#475569', minWidth: '50px' }}>
                    {formatDueDate(a.due_date)}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{a.course_name}</span>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>{a.title}</span>
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
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9' }}>{userName}</p>
          <p style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
            {stats?.streak ?? 0} day streak
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ ...GLASS, padding: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
              Knowledge
            </p>
            {(['mastered', 'learning', 'struggling', 'unexplored'] as const).map(tier => (
              <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  width: 9, height: 9, borderRadius: '50%',
                  background: getMasteryColor(tier),
                  boxShadow: `0 0 6px ${getMasteryColor(tier)}`,
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                  {stats[tier]} {STATS_LABELS[tier]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div style={{ ...GLASS, padding: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
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
                    borderBottom: '1px solid rgba(148,163,184,0.07)',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>{rec.concept_name}</span>
                  <span style={{ fontSize: '12px', color: '#475569' }}>
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
              background: 'rgba(34,211,238,0.1)',
              border: '1px solid rgba(34,211,238,0.35)',
              borderRadius: '7px',
              color: '#22d3ee',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 0 18px rgba(34,211,238,0.08)',
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
              background: 'rgba(15,23,42,0.5)',
              border: '1px solid rgba(148,163,184,0.13)',
              borderRadius: '7px',
              color: '#94a3b8',
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
              color: '#475569',
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
            <p style={{ fontSize: '11px', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              Recent Activity
            </p>
            {nodes
              .filter(n => n.last_studied_at)
              .sort((a, b) => (b.last_studied_at ?? '').localeCompare(a.last_studied_at ?? ''))
              .slice(0, 4)
              .map(n => (
                <div key={n.id} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '7px' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {n.concept_name} — {getMasteryLabel(n.mastery_score)}
                  </span>
                  <span style={{ fontSize: '11px', color: '#334155', marginLeft: '8px', flexShrink: 0 }}>
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
