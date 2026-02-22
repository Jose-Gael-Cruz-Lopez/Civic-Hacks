'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  onClose: () => void;
}

export default function DisclaimerModal({ onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.45)',
        zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff',
        borderRadius: '14px',
        padding: '32px 28px 24px',
        width: '480px',
        maxWidth: '95vw',
        maxHeight: 'calc(100vh - 48px)',
        overflowY: 'auto',
        border: '1px solid rgba(107,114,128,0.15)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.14)',
        fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
      }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            fontSize: '11px', fontWeight: 700, color: 'rgba(26,92,42,0.8)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px',
          }}>
            Before you begin
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            AI Tutor: Use Responsibly
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          <Section label="Accuracy" text="Sapling is powered by AI and may produce incorrect, incomplete, or outdated information. Always verify important concepts against your course materials, textbook, or instructor." />
          <Section label="Academic integrity" text="Using AI to complete graded work, exams, or assessments may violate your institution's academic integrity policy. Sapling is a study aid; use it to understand material, not to substitute your own work." />
          <Section label="Content you share" text="Avoid uploading documents containing other people's personal information or content you do not have the right to share. Syllabi, lecture notes, and your own work are generally fine." />
          <Section label="Privacy" text="Your chat messages and a summary of your knowledge graph are sent to Google Gemini to generate responses. Do not enter passwords, financial details, or sensitive personal information." />
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '11px 0',
            background: '#1a5c2a', color: '#fff',
            border: 'none', borderRadius: '8px',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', letterSpacing: '0.01em',
          }}
        >
          I understand, continue to Sapling
        </button>
      </div>
    </div>,
    document.body
  );
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: '#f8fbf8',
      border: '1px solid rgba(107,114,128,0.12)',
      borderRadius: '8px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#1a5c2a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
        {label}
      </div>
      <p style={{ margin: 0, fontSize: '12px', color: '#374151', lineHeight: 1.55 }}>
        {text}
      </p>
    </div>
  );
}
