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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--chat-bg)' }}>
      {/* Mode description */}
      <div style={{
        padding: '10px 16px',
        fontSize: '12px',
        color: 'var(--chat-text-dim)',
        background: 'var(--chat-topbar)',
        borderBottom: '1px solid var(--chat-border)',
      }}>
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
              background: msg.role === 'user'
                ? 'rgba(255,255,255,0.14)'
                : 'rgba(255,255,255,0.93)',
              color: msg.role === 'user' ? 'var(--chat-text)' : '#111827',
              fontSize: '15px',
              lineHeight: 1.6,
              border: msg.role === 'user'
                ? '1px solid rgba(255,255,255,0.22)'
                : '1px solid rgba(255,255,255,0.15)',
            }}>
              {msg.role === 'user' ? msg.content : (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p style={{ margin: 0, marginBottom: '6px' }}>{children}</p>,
                    ul: ({ children }) => <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px' }}>{children}</ul>,
                    ol: ({ children }) => <ol style={{ margin: '0 0 8px 0', paddingLeft: '20px' }}>{children}</ol>,
                    li: ({ children }) => <li style={{ marginBottom: '2px' }}>{children}</li>,
                    code: ({ children }) => (
                      <code style={{ background: 'rgba(26,92,42,0.1)', borderRadius: '3px', padding: '1px 4px', fontSize: '13px', fontFamily: 'monospace', color: '#1a5c2a' }}>
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre style={{ background: '#f5f9f5', color: '#111827', borderRadius: '6px', padding: '10px', overflowX: 'auto', fontSize: '13px', margin: '0 0 8px 0', border: '1px solid rgba(107,114,128,0.15)' }}>
                        {children}
                      </pre>
                    ),
                    strong: ({ children }) => <strong style={{ fontWeight: 600, color: '#111827' }}>{children}</strong>,
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
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--chat-border)', color: 'var(--chat-text-dim)', fontSize: '15px' }}>
              ...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--chat-topbar)',
        borderTop: '1px solid var(--chat-border)',
      }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type your answer..."
            rows={2}
            style={{
              flex: 1,
              resize: 'none',
              background: 'rgba(255,255,255,0.1)',
              color: 'var(--chat-text)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '13px',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              alignSelf: 'flex-end',
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.15)',
              color: 'var(--chat-text)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '7px',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !input.trim() ? 0.4 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            Send
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {(['hint', 'confused', 'skip'] as const).map(action => (
            <button key={action} onClick={() => onAction(action)} disabled={loading}
              style={{ background: 'none', border: 'none', color: 'var(--chat-text-dim)', fontSize: '12px', cursor: loading ? 'not-allowed' : 'pointer', padding: '2px 0', textTransform: 'capitalize', fontFamily: 'inherit' }}
            >
              {action}
            </button>
          ))}
          <button onClick={onEndSession}
            style={{ background: 'none', border: 'none', color: 'rgba(252,165,165,0.7)', fontSize: '12px', cursor: 'pointer', padding: '2px 0', marginLeft: 'auto', fontFamily: 'inherit' }}
          >
            End Session
          </button>
        </div>
      </div>
    </div>
  );
}
