'use client';

import { useState } from 'react';

interface Props {
  enabled: boolean;
  onToggle: () => void;
}

export default function SharedContextToggle({ enabled, onToggle }: Props) {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  return (
    <div
      style={{ position: 'relative', zIndex: 9999 }}
      onMouseEnter={() => setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
    >
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '20px',
          border: enabled
            ? '1px solid rgba(26,92,42,0.35)'
            : '1px solid rgba(107,114,128,0.22)',
          background: enabled ? 'rgba(26,92,42,0.08)' : 'rgba(107,114,128,0.05)',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: enabled ? '#1a5c2a' : '#9ca3af',
          letterSpacing: '0.03em',
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
        }}>
          Class Intel
        </span>
        <span style={{
          width: '28px',
          height: '14px',
          borderRadius: '7px',
          background: enabled ? '#1a5c2a' : 'rgba(107,114,128,0.28)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 2px',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}>
          <span style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#fff',
            transform: enabled ? 'translateX(14px)' : 'translateX(0)',
            transition: 'transform 0.2s',
            display: 'block',
          }} />
        </span>
      </button>

      {tooltipVisible && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          background: '#f8fbf8',
          border: '1px solid rgba(107,114,128,0.18)',
          borderRadius: '10px',
          padding: '13px 15px',
          fontSize: '12px',
          lineHeight: 1.6,
          width: '290px',
          zIndex: 9999,
          boxShadow: '0 4px 16px rgba(15,23,42,0.09), 0 1px 4px rgba(15,23,42,0.05)',
          pointerEvents: 'none',
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '7px' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#111827',
              letterSpacing: '0.02em',
            }}>
              Class Intelligence
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 600,
              padding: '1px 7px',
              borderRadius: '10px',
              background: enabled ? 'rgba(26,92,42,0.1)' : 'rgba(107,114,128,0.1)',
              color: enabled ? '#1a5c2a' : '#6b7280',
            }}>
              {enabled ? 'On' : 'Off'}
            </span>
          </div>

          <p style={{ margin: '0 0 7px', color: '#374151' }}>
            Sapling uses anonymized, aggregated patterns from your class to personalize
            your sessions: which concepts students find hardest, common mistakes, and
            weak areas, without revealing individual data.
          </p>

          <p style={{ margin: '0 0 10px', color: '#374151' }}>
            When <strong style={{ color: '#111827' }}>on</strong>: explanations slow
            down on topics the class struggles with, quizzes target known weak areas,
            and Sapling proactively addresses common misconceptions before you make them.
          </p>

          <div style={{
            borderTop: '1px solid rgba(107,114,128,0.14)',
            paddingTop: '9px',
            display: 'flex',
            gap: '6px',
            alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: '11px', color: '#1a5c2a', flexShrink: 0, marginTop: '1px' }}>
              &#x2714;
            </span>
            <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', lineHeight: 1.5 }}>
              Privacy: only class-level aggregates are used. Your individual responses
              and scores are never shared with other students. Turn this off to receive
              a session based solely on your own learning history.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
