'use client';

import { useEffect, useState } from 'react';
import { StudyMatch as StudyMatchType } from '@/lib/types';
import { findSchoolMatches } from '@/lib/api';
import Link from 'next/link';

type Scope = 'room' | 'school';

interface Props {
  matches: StudyMatchType[];
  onFindMatches: () => void;
  loading: boolean;
  userId: string;
}

export default function StudyMatch({ matches, onFindMatches, loading, userId }: Props) {
  const [scope, setScope] = useState<Scope>('room');
  const [showPopup, setShowPopup] = useState(false);
  const [schoolMatches, setSchoolMatches] = useState<StudyMatchType[]>([]);
  const [schoolLoading, setSchoolLoading] = useState(false);

  const activeMatches = scope === 'room' ? matches : schoolMatches;
  const activeLoading = scope === 'room' ? loading : schoolLoading;

  const sorted = [...activeMatches]
    .filter(m => m?.partner?.id)
    .sort((a, b) => b.compatibility_score - a.compatibility_score);
  const best = sorted[0] ?? null;
  const others = sorted.slice(1);

  // Open popup whenever fresh matches arrive for the active scope
  useEffect(() => {
    if (activeMatches.length > 0) setShowPopup(true);
  }, [activeMatches]);

  const handleFindRoom = () => {
    setScope('room');
    onFindMatches();
  };

  const handleFindSchool = async () => {
    setScope('school');
    setSchoolLoading(true);
    try {
      const res = await findSchoolMatches(userId);
      setSchoolMatches(res.matches);
    } catch (e) {
      console.error(e);
    } finally {
      setSchoolLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Scope toggle + action buttons ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Pill toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(107,114,128,0.1)',
          borderRadius: '8px',
          padding: '3px',
          gap: '2px',
        }}>
          {(['room', 'school'] as Scope[]).map(s => (
            <button
              key={s}
              onClick={() => setScope(s)}
              style={{
                padding: '5px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                background: scope === s ? '#ffffff' : 'transparent',
                color: scope === s ? '#111827' : '#6b7280',
                boxShadow: scope === s ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {s === 'room' ? '🏠 My Room' : '🏫 My School'}
            </button>
          ))}
        </div>

        {/* Action button for active scope */}
        {scope === 'room' ? (
          <button
            onClick={handleFindRoom}
            disabled={loading}
            className="btn-accent"
            style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Finding matches...' : 'Find Study Partners'}
          </button>
        ) : (
          <button
            onClick={handleFindSchool}
            disabled={schoolLoading}
            className="btn-accent"
            style={{ opacity: schoolLoading ? 0.6 : 1, cursor: schoolLoading ? 'not-allowed' : 'pointer' }}
          >
            {schoolLoading ? 'Searching school...' : 'Search School'}
          </button>
        )}
      </div>

      {/* Empty state */}
      {activeMatches.length === 0 && !activeLoading && (
        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>
          {scope === 'room'
            ? 'Click above to find study partners in this room.'
            : 'Click above to find study partners from across your school.'}
        </p>
      )}

      {/* Match cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sorted.map((match, i) => (
          <MatchCard key={match.partner.id} match={match} isBest={i === 0} scope={scope} />
        ))}
      </div>

      {/* ── Best match popup ── */}
      {showPopup && best && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowPopup(false); }}
        >
          <div style={{
            background: '#ffffff', borderRadius: '14px',
            padding: '32px 28px 24px', width: '480px', maxWidth: '95vw',
            position: 'relative',
            border: '1px solid rgba(107,114,128,0.15)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          }}>
            {/* X */}
            <button
              onClick={() => setShowPopup(false)}
              style={{
                position: 'absolute', top: '14px', right: '16px',
                background: 'none', border: 'none', fontSize: '18px',
                cursor: 'pointer', color: '#9ca3af', lineHeight: 1, padding: '4px 6px', borderRadius: '4px',
              }}
            >✕</button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>
                {scope === 'school' ? '🏫' : '🎯'}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(26,92,42,0.8)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                {scope === 'school' ? 'Best School Match' : 'Your Best Study Partner'}
              </div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#111827' }}>{best.partner.name}</div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                {best.compatibility_score}/100 compatibility
              </div>
            </div>

            {/* Summary */}
            {best.summary && (
              <p style={{
                fontSize: '14px', color: '#4b5563', lineHeight: 1.65,
                textAlign: 'center', fontStyle: 'italic',
                margin: '0 0 20px', padding: '12px 16px',
                background: '#f8faf8', borderRadius: '8px',
                border: '1px solid rgba(26,92,42,0.12)',
              }}>
                "{best.summary}"
              </p>
            )}

            {/* Mastery bars */}
            {(best.they_can_teach.length > 0 || best.you_can_teach.length > 0) && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  Complementary Skills
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[...best.they_can_teach, ...best.you_can_teach].slice(0, 4).map(t => {
                    const youStronger = t.your_mastery >= t.their_mastery;
                    return (
                      <div key={t.concept} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', color: '#374151', minWidth: '110px', flexShrink: 0 }}>{t.concept}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>You</div>
                          <div style={{ height: '5px', borderRadius: '3px', background: '#e5e7eb' }}>
                            <div style={{ height: '100%', width: `${Math.round(t.your_mastery * 100)}%`, background: youStronger ? 'rgba(26,92,42,0.7)' : '#f59e0b', borderRadius: '3px' }} />
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>{best.partner.name}</div>
                          <div style={{ height: '5px', borderRadius: '3px', background: '#e5e7eb' }}>
                            <div style={{ height: '100%', width: `${Math.round(t.their_mastery * 100)}%`, background: !youStronger ? 'rgba(26,92,42,0.7)' : '#f59e0b', borderRadius: '3px' }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chips */}
            {best.they_can_teach.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: 500, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>They can help with</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {best.they_can_teach.map(t => (
                    <span key={t.concept} style={{ fontSize: '12px', color: '#c2410c', padding: '2px 8px', background: 'rgba(234,88,12,0.08)', borderRadius: '4px', border: '1px solid rgba(234,88,12,0.2)' }}>
                      {t.concept} ({Math.round(t.their_mastery * 100)}% vs {Math.round(t.your_mastery * 100)}%)
                    </span>
                  ))}
                </div>
              </div>
            )}
            {best.you_can_teach.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: 500, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>You can help with</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {best.you_can_teach.map(t => (
                    <span key={t.concept} style={{ fontSize: '12px', color: '#1e40af', padding: '2px 8px', background: 'rgba(29,78,216,0.08)', borderRadius: '4px', border: '1px solid rgba(29,78,216,0.2)' }}>
                      {t.concept} ({Math.round(t.your_mastery * 100)}% vs {Math.round(t.their_mastery * 100)}%)
                    </span>
                  ))}
                </div>
              </div>
            )}
            {best.shared_struggles.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', fontWeight: 500, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Study together</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {best.shared_struggles.map(t => (
                    <span key={t.concept} style={{ fontSize: '12px', color: '#b91c1c', padding: '2px 8px', background: 'rgba(220,38,38,0.08)', borderRadius: '4px', border: '1px solid rgba(220,38,38,0.2)' }}>
                      {t.concept}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', marginTop: '8px' }}>
              <button
                onClick={() => setShowPopup(false)}
                style={{
                  flex: 1, padding: '10px 24px',
                  background: '#f3f4f6', color: '#374151',
                  border: '1px solid rgba(107,114,128,0.2)',
                  borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, isBest, scope }: { match: StudyMatchType; isBest: boolean; scope: Scope }) {
  return (
    <div
      className="panel"
      style={{
        padding: '16px',
        ...(isBest && {
          border: '1.5px solid rgba(26,92,42,0.35)',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)',
        }),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isBest && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(26,92,42,0.85)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'rgba(26,92,42,0.1)', padding: '2px 7px', borderRadius: '999px' }}>
              Best Match
            </span>
          )}
          {scope === 'school' && (
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#6366f1', background: 'rgba(99,102,241,0.08)', padding: '2px 7px', borderRadius: '999px', border: '1px solid rgba(99,102,241,0.2)' }}>
              🏫 School
            </span>
          )}
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{match.partner.name}</span>
        </div>
        <span style={{ fontSize: '13px', color: isBest ? 'rgba(26,92,42,0.85)' : 'var(--text-dim)', fontWeight: isBest ? 600 : 400 }}>
          {match.compatibility_score}/100 match
        </span>
      </div>

      {match.you_can_teach.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <p style={{ fontSize: '11px', fontWeight: 500, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>You can help with</p>
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
          <p style={{ fontSize: '11px', fontWeight: 500, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>They can help with</p>
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
          <p style={{ fontSize: '11px', fontWeight: 500, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Study together</p>
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

      <Link
        href={
          match.they_can_teach[0]
            ? `/learn?topic=${encodeURIComponent(match.they_can_teach[0].concept)}`
            : match.you_can_teach[0]
            ? `/learn?topic=${encodeURIComponent(match.you_can_teach[0].concept)}`
            : '/learn'
        }
        style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', border: '1px solid var(--accent-border)', borderRadius: '4px', padding: '4px 10px', display: 'inline-block', background: 'var(--accent-dim)' }}
      >
        Start Session
      </Link>
    </div>
  );
}