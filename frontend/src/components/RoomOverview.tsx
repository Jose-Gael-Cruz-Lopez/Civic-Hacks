'use client';

import { useState } from 'react';
import KnowledgeGraph from './KnowledgeGraph';
import { RoomMember } from '@/lib/types';

interface Props {
  room: { name: string; invite_code: string };
  members: RoomMember[];
  aiSummary: string;
  myUserId: string;
}

export default function RoomOverview({ room, members, aiSummary, myUserId }: Props) {
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
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>{room.name}</h2>

        {/* Invite code chip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 14px',
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: '10px', color: '#9ca3af', margin: '0 0 2px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Invite Code
            </p>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827', fontFamily: 'monospace', letterSpacing: '0.18em' }}>
              {room.invite_code}
            </span>
          </div>
          <button
            onClick={copyCode}
            style={{
              padding: '5px 10px',
              background: copied ? '#dcfce7' : '#111827',
              color: copied ? '#16a34a' : '#ffffff',
              border: 'none',
              borderRadius: '5px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Graphs side-by-side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', marginBottom: '8px' }}>Your Tree</p>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            {myMember ? (
              <KnowledgeGraph
                nodes={myMember.graph.nodes}
                edges={myMember.graph.edges}
                width={440}
                height={380}
                interactive={true}
                comparison={partnerMember ? { partnerNodes: partnerMember.graph.nodes } : undefined}
              />
            ) : (
              <div style={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '13px' }}>
                No data
              </div>
            )}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', margin: 0 }}>Compare with</p>
            <select
              value={compareWith}
              onChange={e => setCompareWith(e.target.value)}
              style={{ padding: '2px 6px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '12px' }}
            >
              <option value="">Select member</option>
              {otherMembers.map(m => (
                <option key={m.user_id} value={m.user_id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            {partnerMember ? (
              <KnowledgeGraph
                nodes={partnerMember.graph.nodes}
                edges={partnerMember.graph.edges}
                width={440}
                height={380}
                interactive={true}
                comparison={myMember ? { partnerNodes: myMember.graph.nodes } : undefined}
              />
            ) : (
              <div style={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '13px' }}>
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
            { color: '#3b82f6', label: 'You can teach' },
            { color: '#f97316', label: 'They can teach' },
            { color: '#ef4444', label: 'Shared struggle' },
            { color: '#22c55e', label: 'Shared strength' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: '12px', color: '#6b7280' }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* AI Summary */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '16px' }}>
        <p style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          Group Summary
        </p>
        <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.7 }}>{aiSummary}</p>
      </div>
    </div>
  );
}
