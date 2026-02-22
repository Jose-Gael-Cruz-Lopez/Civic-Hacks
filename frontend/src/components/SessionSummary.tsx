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
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        className="panel"
        style={{
          padding: '32px',
          width: '480px',
          maxWidth: '90vw',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '24px' }}>
          Session Complete
        </h2>

        <div style={{ marginBottom: '20px' }}>
          <p className="label" style={{ marginBottom: '8px' }}>Concepts Covered</p>
          {summary.concepts_covered.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {summary.concepts_covered.map(c => (
                <span
                  key={c}
                  style={{
                    padding: '2px 10px',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>No concepts recorded</p>
          )}
        </div>

        {summary.mastery_changes.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <p className="label" style={{ marginBottom: '8px' }}>Mastery Changes</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {summary.mastery_changes.map(mc => {
                const delta = Math.round((mc.after - mc.before) * 100);
                const positive = delta >= 0;
                return (
                  <div key={mc.concept} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text)' }}>{mc.concept}</span>
                    <span style={{ fontSize: '13px', color: positive ? '#16a34a' : '#dc2626', fontWeight: 500 }}>
                      {positive ? '+' : ''}{delta}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <p className="label" style={{ marginBottom: '8px' }}>Time Spent</p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {summary.time_spent_minutes} {summary.time_spent_minutes === 1 ? 'minute' : 'minutes'}
          </p>
        </div>

        {summary.recommended_next.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <p className="label" style={{ marginBottom: '8px' }}>Recommended Next</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {summary.recommended_next.map(c => (
                <span key={c} style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{c}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onDashboard}
            className="btn-ghost"
            style={{ flex: 1 }}
          >
            Dashboard
          </button>
          <button
            onClick={onNewSession}
            className="btn-accent"
            style={{ flex: 1 }}
          >
            New Session
          </button>
        </div>
      </div>
    </div>
  );
}
