'use client';

import { TeachingMode } from '@/lib/types';

interface Props {
  mode: TeachingMode;
  onChange: (mode: TeachingMode) => void;
  showQuiz?: boolean;
  quizActive?: boolean;
  onToggleQuiz?: () => void;
}

const MODES: { value: TeachingMode; label: string }[] = [
  { value: 'socratic', label: 'Socratic' },
  { value: 'expository', label: 'Expository' },
  { value: 'teachback', label: 'TeachBack' },
];

export default function ModeSelector({ mode, onChange, showQuiz, quizActive, onToggleQuiz }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '2px' }}>
        {MODES.map(m => (
          <button
            key={m.value}
            onClick={() => onChange(m.value)}
            style={{
              padding: '4px 10px',
              fontSize: '13px',
              color: mode === m.value ? '#f1f5f9' : '#475569',
              fontWeight: mode === m.value ? 600 : 400,
              background: 'none',
              border: 'none',
              borderBottom: mode === m.value ? '2px solid rgba(34,211,238,0.65)' : '2px solid transparent',
              cursor: 'pointer',
              letterSpacing: '-0.01em',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {showQuiz && onToggleQuiz && (
        <button
          onClick={onToggleQuiz}
          style={{
            padding: '4px 12px',
            fontSize: '13px',
            color: quizActive ? '#22d3ee' : '#94a3b8',
            background: quizActive ? 'rgba(34,211,238,0.1)' : 'none',
            border: quizActive ? '1px solid rgba(34,211,238,0.35)' : '1px solid rgba(148,163,184,0.2)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Quiz
        </button>
      )}
    </div>
  );
}
