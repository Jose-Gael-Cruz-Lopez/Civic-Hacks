'use client';

import { StudyMatch as StudyMatchType } from '@/lib/types';
import Link from 'next/link';

interface Props {
  matches: StudyMatchType[];
  onFindMatches: () => void;
  loading: boolean;
}

export default function StudyMatch({ matches, onFindMatches, loading }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onFindMatches}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: 'rgba(34,211,238,0.1)',
            color: '#22d3ee',
            border: '1px solid rgba(34,211,238,0.3)',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Finding matches...' : 'Find Study Partners'}
        </button>
      </div>

      {matches.length === 0 && !loading && (
        <p style={{ color: '#475569', fontSize: '14px' }}>Click above to find study partners in this room.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {matches.map(match => (
          <div
            key={match.partner.id}
            style={{
              border: '1px solid rgba(148,163,184,0.1)',
              borderRadius: '8px',
              padding: '16px',
              background: 'rgba(8,13,30,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9' }}>{match.partner.name}</span>
              <span style={{ fontSize: '13px', color: '#475569' }}>
                {match.compatibility_score}/100 match
              </span>
            </div>

            {match.you_can_teach.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: 500, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  You can help with
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {match.you_can_teach.map(t => (
                    <span key={t.concept} style={{ fontSize: '12px', color: '#93c5fd', padding: '2px 8px', background: 'rgba(59,130,246,0.1)', borderRadius: '4px', border: '1px solid rgba(59,130,246,0.15)' }}>
                      {t.concept} ({Math.round(t.your_mastery * 100)}% vs {Math.round(t.their_mastery * 100)}%)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {match.they_can_teach.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: 500, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  They can help with
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {match.they_can_teach.map(t => (
                    <span key={t.concept} style={{ fontSize: '12px', color: '#fb923c', padding: '2px 8px', background: 'rgba(249,115,22,0.1)', borderRadius: '4px', border: '1px solid rgba(249,115,22,0.15)' }}>
                      {t.concept} ({Math.round(t.their_mastery * 100)}% vs {Math.round(t.your_mastery * 100)}%)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {match.shared_struggles.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: 500, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  Study together
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {match.shared_struggles.map(t => (
                    <span key={t.concept} style={{ fontSize: '12px', color: '#fca5a5', padding: '2px 8px', background: 'rgba(248,113,113,0.1)', borderRadius: '4px', border: '1px solid rgba(248,113,113,0.15)' }}>
                      {t.concept}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '10px' }}>{match.summary}</p>

            {match.they_can_teach[0] && (
              <Link
                href={`/learn?topic=${encodeURIComponent(match.they_can_teach[0].concept)}`}
                style={{
                  fontSize: '12px',
                  color: '#22d3ee',
                  textDecoration: 'none',
                  border: '1px solid rgba(34,211,238,0.3)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  display: 'inline-block',
                  background: 'rgba(34,211,238,0.07)',
                }}
              >
                Start Session
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
