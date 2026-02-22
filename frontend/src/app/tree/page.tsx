'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import { GraphNode, GraphEdge } from '@/lib/types';
import { getGraph } from '@/lib/api';
import { getMasteryColor, getMasteryLabel, formatRelativeTime, getCourseColor } from '@/lib/graphUtils';
import { useUser } from '@/context/UserContext';

type Filter = 'all' | 'mastered' | 'learning' | 'struggling' | 'unexplored';

const GLASS = {
  background: '#ffffff',
  border: '1px solid rgba(107, 114, 128, 0.15)',
} as const;

export default function TreePage() {
  const router = useRouter();
  const { userId, userReady } = useUser();
  const [allNodes, setAllNodes] = useState<GraphNode[]>([]);
  const [allEdges, setAllEdges] = useState<GraphEdge[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 700 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userReady) return;
    getGraph(userId).then(data => {
      setAllNodes(data.nodes);
      setAllEdges(data.edges);
    }).catch(console.error);
  }, [userId, userReady]);

  useEffect(() => {
    setDimensions({ width: window.innerWidth, height: window.innerHeight - 48 });
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight - 48 });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredNodes = allNodes.filter(n => {
    const matchesFilter = filter === 'all' || n.mastery_tier === filter;
    const matchesSearch = !search || n.concept_name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = allEdges.filter(e =>
    filteredNodeIds.has(e.source as string) && filteredNodeIds.has(e.target as string)
  );

  const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'mastered', label: 'Mastered' },
    { value: 'learning', label: 'Learning' },
    { value: 'struggling', label: 'Struggling' },
    { value: 'unexplored', label: 'Unexplored' },
  ];

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
      <KnowledgeGraph
        nodes={filteredNodes}
        edges={filteredEdges}
        width={dimensions.width}
        height={dimensions.height}
        interactive
        onNodeClick={setSelectedNode}
      />

      {/* Floating search + filter bar */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        ...GLASS,
        borderRadius: '10px',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
        zIndex: 10,
      }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search concepts…"
          style={{
            padding: '5px 10px',
            border: '1px solid rgba(148,163,184,0.15)',
            borderRadius: '5px',
            fontSize: '13px',
            outline: 'none',
            width: '180px',
            background: '#ffffff',
            color: '#111827',
          }}
        />
        <div style={{ display: 'flex', gap: '4px' }}>
          {FILTERS.map(f => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                style={{
                  padding: '4px 11px',
                  border: active ? '1px solid rgba(26,92,42,0.4)' : '1px solid rgba(107,114,128,0.18)',
                  borderRadius: '5px',
                  background: active ? 'rgba(26,92,42,0.08)' : 'transparent',
                  color: active ? '#1a5c2a' : '#6b7280',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>{filteredNodes.length} nodes</span>
      </div>

      {/* Node detail panel */}
      {selectedNode && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '290px',
          ...GLASS,
          borderLeft: '1px solid rgba(148,163,184,0.1)',
          borderRight: 'none',
          borderTop: 'none',
          borderBottom: 'none',
          padding: '22px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          overflowY: 'auto',
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
              {selectedNode.concept_name}
            </h2>
            <button
              onClick={() => setSelectedNode(null)}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
            >
              ×
            </button>
          </div>

          <div>
            <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: getCourseColor(selectedNode.subject).fill, flexShrink: 0, display: 'inline-block' }} />
              <p style={{ fontSize: '14px', color: getCourseColor(selectedNode.subject).text, fontWeight: 500, margin: 0 }}>{selectedNode.subject}</p>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <p style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mastery</p>
              <span style={{ fontSize: '13px', color: getMasteryColor(selectedNode.mastery_tier), fontWeight: 600 }}>
                {getMasteryLabel(selectedNode.mastery_score)}
              </span>
            </div>
            <div style={{ background: 'rgba(107,114,128,0.15)', borderRadius: '4px', height: '5px', overflow: 'hidden' }}>
              <div style={{
                background: getMasteryColor(selectedNode.mastery_tier),
                boxShadow: `0 0 8px ${getMasteryColor(selectedNode.mastery_tier)}`,
                height: '100%',
                width: `${Math.round(selectedNode.mastery_score * 100)}%`,
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Last studied</span>
              <span style={{ fontSize: '12px', color: '#374151' }}>{formatRelativeTime(selectedNode.last_studied_at)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Times studied</span>
              <span style={{ fontSize: '12px', color: '#374151' }}>{selectedNode.times_studied}</span>
            </div>
          </div>

          <div>
            <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Connected to</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {allEdges
                .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                .map(e => {
                  const otherId = e.source === selectedNode.id ? e.target : e.source;
                  const other = allNodes.find(n => n.id === otherId);
                  return other ? (
                    <button
                      key={e.id}
                      onClick={() => setSelectedNode(other)}
                      style={{
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        fontSize: '13px',
                        color: '#374151',
                        cursor: 'pointer',
                        padding: '3px 0',
                      }}
                    >
                      {other.concept_name}
                    </button>
                  ) : null;
                })
                .filter(Boolean)}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
            <button
              onClick={() => router.push(`/learn?topic=${encodeURIComponent(selectedNode.concept_name)}`)}
              style={{
                padding: '9px',
                background: 'rgba(26,92,42,0.08)',
                color: '#1a5c2a',
                border: '1px solid rgba(26,92,42,0.3)',
                borderRadius: '7px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Learn This
            </button>
            <button
              onClick={() => router.push(`/learn?topic=${encodeURIComponent(selectedNode.concept_name)}&mode=quiz`)}
              style={{
                padding: '9px',
                background: '#f8faf8',
                color: '#4b5563',
                border: '1px solid rgba(107,114,128,0.18)',
                borderRadius: '7px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Quiz Me
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
