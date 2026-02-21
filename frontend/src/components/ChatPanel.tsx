'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, TeachingMode } from '@/lib/types';

interface Props {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  onAction: (action: 'hint' | 'confused' | 'skip') => void;
  onEndSession: () => void;
  loading: boolean;
  mode: TeachingMode;
}

const MODE_DESCRIPTIONS: Record<TeachingMode, string> = {
  socratic: 'Asking questions to guide your thinking',
  expository: 'Explaining, then checking understanding',
  teachback: 'You teach me — I\'ll play confused',
};

export default function ChatPanel({ messages, onSend, onAction, onEndSession, loading, mode }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff' }}>
      {/* Mode description */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid #e5e7eb',
        color: '#9ca3af',
        fontSize: '12px',
      }}>
        {MODE_DESCRIPTIONS[mode]}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: msg.role === 'user' ? '#f0fdf4' : '#f3f4f6',
                color: '#111827',
                fontSize: '15px',
                lineHeight: 1.6,
                border: msg.role === 'user' ? '1px solid #d1fae5' : '1px solid #e5e7eb',
              }}
            >
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p style={{ margin: 0, marginBottom: '6px' }}>{children}</p>,
                    ul: ({ children }) => <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px' }}>{children}</ul>,
                    ol: ({ children }) => <ol style={{ margin: '0 0 8px 0', paddingLeft: '20px' }}>{children}</ol>,
                    li: ({ children }) => <li style={{ marginBottom: '2px' }}>{children}</li>,
                    code: ({ children }) => (
                      <code style={{ background: '#e5e7eb', borderRadius: '3px', padding: '1px 4px', fontSize: '13px', fontFamily: 'monospace' }}>
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre style={{ background: '#1f2937', color: '#f9fafb', borderRadius: '6px', padding: '10px', overflowX: 'auto', fontSize: '13px', margin: '0 0 8px 0' }}>
                        {children}
                      </pre>
                    ),
                    strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                color: '#9ca3af',
                fontSize: '15px',
              }}
            >
              ...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type your answer..."
            rows={2}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#111827',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              padding: '8px 16px',
              background: '#111827',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading || !input.trim() ? 0.5 : 1,
              alignSelf: 'flex-end',
            }}
          >
            Send
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {(['hint', 'confused', 'skip'] as const).map(action => (
            <button
              key={action}
              onClick={() => onAction(action)}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                fontSize: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                padding: '2px 0',
                textTransform: 'capitalize',
              }}
            >
              {action}
            </button>
          ))}
          <button
            onClick={onEndSession}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '2px 0',
              marginLeft: 'auto',
            }}
          >
            End Session
          </button>
        </div>
      </div>
    </div>
  );
}
