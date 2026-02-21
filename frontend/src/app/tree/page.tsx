'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import { GraphNode, GraphEdge } from '@/lib/types';
import { getGraph } from '@/lib/api';
import { getMasteryColor, getMasteryLabel, formatRelativeTime } from '@/lib/graphUtils';
import { useUser } from '@/context/UserContext';

type Filter = 'all' | 'mastered' | 'learning' | 'struggling' | 'unexplored';

export default function TreePage() {
  const router = useRouter();
  const { userId } = useUser();
  const [allNodes, setAllNodes] = useState<GraphNode[]>([]);
  const [allEdges, setAllEdges] = useState<GraphEdge[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 700 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getGraph(userId).then(data => {
      setAllNodes(data.nodes);
      setAllEdges(data.edges);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    setDimensions({ width: window.innerWidth, height: window.innerHeight - 48 });
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight - 48 });
    };
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
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: 'calc(100vh - 48px)', overflow: 'hidden', background: '#f9fafb' }}>
      <KnowledgeGraph
        nodes={filteredNodes}
        edges={filteredEdges}
        width={dimensions.width}
        height={dimensions.height}
        interactive
        onNodeClick={setSelectedNode}
      />

      {/* Floating top bar */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(255,255,255,0.95)',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        zIndex: 10,
      }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search concepts..."
          style={{
            padding: '5px 10px',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            fontSize: '13px',
            outline: 'none',
            width: '180px',
          }}
        />
        <div style={{ display: 'flex', gap: '4px' }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding: '4px 10px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                background: filter === f.value ? '#111827' : '#ffffff',
                color: filter === f.value ? '#ffffff' : '#374151',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: filter === f.value ? 500 : 400,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>{filteredNodes.length} nodes</span>
      </div>

      {/* Detail panel */}
      {selectedNode && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '280px',
          background: '#ffffff',
          borderLeft: '1px solid #e5e7eb',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto',
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>{selectedNode.concept_name}</h2>
            <button
              onClick={() => setSelectedNode(null)}
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '18px' }}
            >
              x
            </button>
          </div>

          <div>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Subject</p>
            <p style={{ fontSize: '14px', color: '#374151' }}>{selectedNode.subject}</p>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <p style={{ fontSize: '12px', color: '#9ca3af' }}>Mastery</p>
              <span style={{ fontSize: '13px', color: getMasteryColor(selectedNode.mastery_tier), fontWeight: 500 }}>
                {getMasteryLabel(selectedNode.mastery_score)}
              </span>
            </div>
            <div style={{ background: '#f3f4f6', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
              <div style={{
                background: getMasteryColor(selectedNode.mastery_tier),
                height: '100%',
                width: `${Math.round(selectedNode.mastery_score * 100)}%`,
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Last studied</span>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>{formatRelativeTime(selectedNode.last_studied_at)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Times studied</span>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>{selectedNode.times_studied}</span>
            </div>
          </div>

          {/* Connected concepts */}
          <div>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>Connected to</p>
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
                        padding: '2px 0',
                      }}
                    >
                      {other.concept_name}
                    </button>
                  ) : null;
                })
                .filter(Boolean)
              }
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
            <button
              onClick={() => router.push(`/learn?topic=${encodeURIComponent(selectedNode.concept_name)}`)}
              style={{
                padding: '8px',
                background: '#111827',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Learn This
            </button>
            <button
              onClick={() => router.push(`/learn?topic=${encodeURIComponent(selectedNode.concept_name)}&mode=quiz`)}
              style={{
                padding: '8px',
                background: '#ffffff',
                color: '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
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
