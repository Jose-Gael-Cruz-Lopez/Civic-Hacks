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
  teachback: "You teach me — I'll play confused",
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Mode description */}
      <div className="topbar" style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--text-dim)' }}>
        {MODE_DESCRIPTIONS[mode]}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%',
              padding: '10px 14px',
              borderRadius: '8px',
              background: msg.role === 'user' ? 'var(--accent-dim)' : 'var(--bg-panel)',
              color: 'var(--text)',
              fontSize: '15px',
              lineHeight: 1.6,
              border: msg.role === 'user' ? '1px solid var(--accent-border)' : '1px solid var(--border)',
            }}>
              {msg.role === 'user' ? msg.content : (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p style={{ margin: 0, marginBottom: '6px' }}>{children}</p>,
                    ul: ({ children }) => <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px' }}>{children}</ul>,
                    ol: ({ children }) => <ol style={{ margin: '0 0 8px 0', paddingLeft: '20px' }}>{children}</ol>,
                    li: ({ children }) => <li style={{ marginBottom: '2px' }}>{children}</li>,
                    code: ({ children }) => (
                      <code style={{ background: 'var(--accent-dim)', borderRadius: '3px', padding: '1px 4px', fontSize: '13px', fontFamily: 'monospace', color: 'var(--accent)' }}>
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre style={{ background: 'var(--bg-subtle)', color: 'var(--text)', borderRadius: '6px', padding: '10px', overflowX: 'auto', fontSize: '13px', margin: '0 0 8px 0', border: '1px solid var(--border)' }}>
                        {children}
                      </pre>
                    ),
                    strong: ({ children }) => <strong style={{ fontWeight: 600, color: 'var(--text)' }}>{children}</strong>,
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
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-panel)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: '15px' }}>
              ...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="topbar" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type your answer..."
            rows={2}
            className="input"
            style={{ flex: 1, resize: 'none' }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="btn-accent"
            style={{ alignSelf: 'flex-end', opacity: loading || !input.trim() ? 0.4 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            Send
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {(['hint', 'confused', 'skip'] as const).map(action => (
            <button key={action} onClick={() => onAction(action)} disabled={loading}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '12px', cursor: loading ? 'not-allowed' : 'pointer', padding: '2px 0', textTransform: 'capitalize', fontFamily: 'inherit' }}
            >
              {action}
            </button>
          ))}
          <button onClick={onEndSession}
            style={{ background: 'none', border: 'none', color: 'rgba(220,38,38,0.7)', fontSize: '12px', cursor: 'pointer', padding: '2px 0', marginLeft: 'auto', fontFamily: 'inherit' }}
          >
            End Session
          </button>
        </div>
      </div>
    </div>
  );
}
