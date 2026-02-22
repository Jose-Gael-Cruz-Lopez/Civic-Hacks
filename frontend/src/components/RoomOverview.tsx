'use client';

import { useState } from 'react';
import KnowledgeGraph from './KnowledgeGraph';
import { RoomMember } from '@/lib/types';
import { filterCrossSubjectEdges } from '@/lib/graphUtils';

interface Props {
  room: { name: string; invite_code: string };
  members: RoomMember[];
  aiSummary: string;
  myUserId: string;
  suggestNodeId?: string;
  suggestConcept?: string;
  onSuggestDismiss?: () => void;
  onSuggestAccept?: () => void;
}

export default function RoomOverview({ room, members, aiSummary, myUserId, suggestNodeId, suggestConcept, onSuggestDismiss, onSuggestAccept }: Props) {
  const [copied, setCopied] = useState(false);
  const [compareWith, setCompareWith] = useState<string>('');

  const myMember = members.find(m => m.user_id === myUserId);
  const partnerMember = members.find(m => m.user_id === compareWith);

  const copyCode = () => {
    navigator.clipboard.writeText(room.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const otherMembers = members.filter(m => m.user_id !== myUserId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>{room.name}</h2>

        {/* Invite code chip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 14px',
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          flexShrink: 0,
        }}>
          <div>
            <p className="label" style={{ margin: '0 0 2px' }}>Invite Code</p>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace', letterSpacing: '0.18em' }}>
              {room.invite_code}
            </span>
          </div>
          <button
            onClick={copyCode}
            className={copied ? '' : 'btn-accent'}
            style={copied ? {
              padding: '5px 10px',
              background: 'rgba(22,163,74,0.1)',
              color: '#16a34a',
              border: '1px solid rgba(22,163,74,0.3)',
              borderRadius: '5px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            } : { padding: '5px 10px', fontSize: '12px' }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Graphs side-by-side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ position: 'relative' }}>
          <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)', marginBottom: '8px' }}>Your Tree</p>
          <div className="panel" style={{ overflow: 'hidden' }}>
            {myMember ? (
              <KnowledgeGraph
                nodes={myMember.graph.nodes}
                edges={filterCrossSubjectEdges(myMember.graph.nodes, myMember.graph.edges)}
                width={440}
                height={380}
                interactive={true}
                highlightId={suggestNodeId}
                comparison={partnerMember ? { partnerNodes: partnerMember.graph.nodes } : undefined}
              />
            ) : (
              <div style={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                No data
              </div>
            )}
          </div>

          {/* AI "learn next" suggestion popup */}
          {suggestConcept && suggestNodeId && (
            <div className="panel-in-centered panel-in-1" style={{
              position: 'absolute',
              bottom: '12px',
              left: '50%',
              background: '#ffffff',
              border: '1px solid rgba(26,92,42,0.25)',
              borderRadius: '10px',
              padding: '14px 18px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              minWidth: '260px',
              maxWidth: '360px',
              fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0 }}>✨</span>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>
                    AI Recommendation
                  </p>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>
                    {suggestConcept}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0', lineHeight: 1.5 }}>
                    This concept will have the highest impact on your mastery.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={onSuggestDismiss}
                  style={{ padding: '6px 14px', background: 'transparent', color: '#6b7280', border: '1px solid rgba(107,114,128,0.22)', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Dismiss
                </button>
                <button
                  onClick={onSuggestAccept}
                  style={{ padding: '6px 16px', background: '#1a5c2a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Start Quiz →
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dim)', margin: 0 }}>Compare with</p>
            <select
              value={compareWith}
              onChange={e => setCompareWith(e.target.value)}
              className="input"
              style={{ padding: '2px 6px', fontSize: '12px' }}
            >
              <option value="">Select member</option>
              {otherMembers.map(m => (
                <option key={m.user_id} value={m.user_id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="panel" style={{ overflow: 'hidden' }}>
            {partnerMember ? (
              <KnowledgeGraph
                nodes={partnerMember.graph.nodes}
                edges={filterCrossSubjectEdges(partnerMember.graph.nodes, partnerMember.graph.edges)}
                width={440}
                height={380}
                interactive={true}
                comparison={myMember ? { partnerNodes: myMember.graph.nodes } : undefined}
              />
            ) : (
              <div style={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                Select a member to compare
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      {partnerMember && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {[
            { color: '#38bdf8', label: 'You can teach' },
            { color: '#fb923c', label: 'They can teach' },
            { color: '#f87171', label: 'Shared struggle' },
            { color: '#34d399', label: 'Shared strength' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* AI Summary */}
      <div className="panel" style={{ padding: '16px' }}>
        <p className="label" style={{ marginBottom: '8px' }}>Group Summary</p>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7 }}>{aiSummary}</p>
      </div>
    </div>
  );
}
