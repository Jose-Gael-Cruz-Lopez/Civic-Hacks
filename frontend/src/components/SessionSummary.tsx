'use client';

import { SessionSummary as SessionSummaryType } from '@/lib/types';

interface Props {
  summary: SessionSummaryType;
  onDashboard: () => void;
  onNewSession: () => void;
}

export default function SessionSummary({ summary, onDashboard, onNewSession }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3,7,18,0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: 'rgba(8,13,30,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(148,163,184,0.12)',
          borderRadius: '12px',
          padding: '32px',
          width: '480px',
          maxWidth: '90vw',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f1f5f9', marginBottom: '24px' }}>
          Session Complete
        </h2>

        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '12px', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Concepts Covered
          </p>
          {summary.concepts_covered.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {summary.concepts_covered.map(c => (
                <span
                  key={c}
                  style={{
                    padding: '2px 10px',
                    background: 'rgba(15,23,42,0.6)',
                    border: '1px solid rgba(148,163,184,0.12)',
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: '#94a3b8',
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ color: '#475569', fontSize: '14px' }}>No concepts recorded</p>
          )}
        </div>

        {summary.mastery_changes.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Mastery Changes
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {summary.mastery_changes.map(mc => {
                const delta = Math.round((mc.after - mc.before) * 100);
                const positive = delta >= 0;
                return (
                  <div key={mc.concept} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: '#f1f5f9' }}>{mc.concept}</span>
                    <span style={{ fontSize: '13px', color: positive ? '#22c55e' : '#f87171', fontWeight: 500 }}>
                      {positive ? '+' : ''}{delta}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '12px', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Time Spent
          </p>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>
            {summary.time_spent_minutes} {summary.time_spent_minutes === 1 ? 'minute' : 'minutes'}
          </p>
        </div>

        {summary.recommended_next.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '12px', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Recommended Next
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {summary.recommended_next.map(c => (
                <span key={c} style={{ fontSize: '14px', color: '#94a3b8' }}>{c}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onDashboard}
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid rgba(148,163,184,0.15)',
              borderRadius: '6px',
              background: 'rgba(15,23,42,0.5)',
              color: '#94a3b8',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Dashboard
          </button>
          <button
            onClick={onNewSession}
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid rgba(34,211,238,0.35)',
              borderRadius: '6px',
              background: 'rgba(34,211,238,0.1)',
              color: '#22d3ee',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            New Session
          </button>
        </div>
      </div>
    </div>
  );
}
