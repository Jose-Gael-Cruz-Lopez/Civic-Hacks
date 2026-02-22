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
          className="btn-accent"
          style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Finding matches...' : 'Find Study Partners'}
        </button>
      </div>

      {matches.length === 0 && !loading && (
        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Click above to find study partners in this room.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {matches.map(match => (
          <div
            key={match.partner.id}
            className="panel"
            style={{ padding: '16px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{match.partner.name}</span>
              <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                {match.compatibility_score}/100 match
              </span>
            </div>

            {match.you_can_teach.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: 500, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  You can help with
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {match.you_can_teach.map(t => (
                    <span key={t.concept} style={{ fontSize: '12px', color: '#1e40af', padding: '2px 8px', background: 'rgba(29,78,216,0.08)', borderRadius: '4px', border: '1px solid rgba(29,78,216,0.2)' }}>
                      {t.concept} ({Math.round(t.your_mastery * 100)}% vs {Math.round(t.their_mastery * 100)}%)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {match.they_can_teach.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: 500, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  They can help with
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {match.they_can_teach.map(t => (
                    <span key={t.concept} style={{ fontSize: '12px', color: '#c2410c', padding: '2px 8px', background: 'rgba(234,88,12,0.08)', borderRadius: '4px', border: '1px solid rgba(234,88,12,0.2)' }}>
                      {t.concept} ({Math.round(t.their_mastery * 100)}% vs {Math.round(t.your_mastery * 100)}%)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {match.shared_struggles.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: 500, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  Study together
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {match.shared_struggles.map(t => (
                    <span key={t.concept} style={{ fontSize: '12px', color: '#b91c1c', padding: '2px 8px', background: 'rgba(220,38,38,0.08)', borderRadius: '4px', border: '1px solid rgba(220,38,38,0.2)' }}>
                      {t.concept}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '10px' }}>{match.summary}</p>

            {match.they_can_teach[0] && (
              <Link
                href={`/learn?topic=${encodeURIComponent(match.they_can_teach[0].concept)}`}
                style={{
                  fontSize: '12px',
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  border: '1px solid var(--accent-border)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  display: 'inline-block',
                  background: 'var(--accent-dim)',
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
