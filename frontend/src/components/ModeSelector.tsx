'use client';

import { useState } from 'react';
import { TeachingMode } from '@/lib/types';

interface Props {
  mode: TeachingMode;
  onChange: (mode: TeachingMode) => void;
  showQuiz?: boolean;
  quizActive?: boolean;
  onToggleQuiz?: () => void;
}

const MODES: { value: TeachingMode; label: string; description: string }[] = [
  {
    value: 'socratic',
    label: 'Socratic',
    description:
      'Sapling leads with questions instead of answers. You are guided to reason through concepts step by step, building understanding from your own thinking. Best for deep comprehension and long-term retention.',
  },
  {
    value: 'expository',
    label: 'Expository',
    description:
      'Sapling explains concepts directly and clearly. Ideal when you want to learn something new quickly or need a straightforward walkthrough before practicing on your own.',
  },
  {
    value: 'teachback',
    label: 'TeachBack',
    description:
      'You explain the concept back to Sapling. It listens, asks follow-up questions, and corrects gaps in your understanding. One of the most effective methods for solidifying knowledge.',
  },
];

const tooltipStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 10px)',
  left: '50%',
  transform: 'translateX(-50%)',
  background: '#f8fbf8',
  border: '1px solid rgba(107,114,128,0.18)',
  borderRadius: '10px',
  padding: '13px 15px',
  fontSize: '12px',
  lineHeight: 1.6,
  width: '240px',
  zIndex: 9999,
  boxShadow: '0 4px 16px rgba(15,23,42,0.09), 0 1px 4px rgba(15,23,42,0.05)',
  pointerEvents: 'none',
  fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
  color: '#374151',
};

export default function ModeSelector({ mode, onChange, showQuiz, quizActive, onToggleQuiz }: Props) {
  const [hoveredMode, setHoveredMode] = useState<TeachingMode | null>(null);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '2px' }}>
        {MODES.map(m => (
          <div
            key={m.value}
            style={{ position: 'relative' }}
            onMouseEnter={() => setHoveredMode(m.value)}
            onMouseLeave={() => setHoveredMode(null)}
          >
            <button
              onClick={() => onChange(m.value)}
              style={{
                padding: '4px 10px',
                fontSize: '13px',
                color: mode === m.value ? 'var(--text)' : 'var(--text-dim)',
                fontWeight: mode === m.value ? 600 : 400,
                background: 'none',
                border: 'none',
                borderBottom: mode === m.value ? '2px solid var(--accent-active)' : '2px solid transparent',
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                fontFamily: 'inherit',
              }}
            >
              {m.label}
            </button>

            {hoveredMode === m.value && (
              <div style={tooltipStyle}>
                <span style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#111827',
                  letterSpacing: '0.02em',
                  marginBottom: '6px',
                }}>
                  {m.label} mode
                </span>
                <p style={{ margin: 0 }}>{m.description}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {showQuiz && onToggleQuiz && (
        <button
          onClick={onToggleQuiz}
          style={{
            padding: '4px 12px',
            fontSize: '13px',
            color: quizActive ? 'var(--accent)' : 'var(--text-dim)',
            background: quizActive ? 'var(--accent-dim)' : 'none',
            border: quizActive ? '1px solid var(--accent-border)' : '1px solid var(--border)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 500,
            fontFamily: 'inherit',
          }}
        >
          Quiz
        </button>
      )}
    </div>
  );
}
