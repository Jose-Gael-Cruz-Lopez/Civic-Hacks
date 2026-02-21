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
              color: mode === m.value ? '#111827' : '#9ca3af',
              fontWeight: mode === m.value ? 600 : 400,
              background: 'none',
              border: 'none',
              borderBottom: mode === m.value ? '2px solid #111827' : '2px solid transparent',
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
            color: quizActive ? '#ffffff' : '#374151',
            background: quizActive ? '#111827' : 'none',
            border: '1px solid #e5e7eb',
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
