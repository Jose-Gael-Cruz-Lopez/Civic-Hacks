'use client';

import { useState, useEffect } from 'react';
import DisclaimerModal from './DisclaimerModal';

const STORAGE_KEY = 'sapling_disclaimer_ack';

export default function AIDisclaimerChip() {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Show on first visit automatically
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setModalOpen(true);
  }, []);

  const openModal = () => setModalOpen(true);
  const closeModal = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setModalOpen(false);
  };

  return (
    <>
      <div
        style={{ position: 'relative' }}
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
      >
        <button
          onClick={openModal}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '3px 9px',
            background: 'rgba(107,114,128,0.05)',
            border: '1px solid rgba(107,114,128,0.2)',
            borderRadius: '20px',
            cursor: 'pointer',
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
          }}
        >
          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, letterSpacing: '0.02em' }}>
            AI Guidelines
          </span>
        </button>

        {tooltipVisible && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            background: '#f8fbf8',
            border: '1px solid rgba(107,114,128,0.18)',
            borderRadius: '10px',
            padding: '13px 15px',
            fontSize: '12px',
            lineHeight: 1.6,
            width: '260px',
            zIndex: 9999,
            boxShadow: '0 4px 16px rgba(15,23,42,0.09), 0 1px 4px rgba(15,23,42,0.05)',
            pointerEvents: 'none',
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
          }}>
            <span style={{
              display: 'block', fontSize: '11px', fontWeight: 700,
              color: '#111827', letterSpacing: '0.02em', marginBottom: '6px',
            }}>
              AI powered learning
            </span>
            <p style={{ margin: '0 0 8px', color: '#374151' }}>
              Sapling uses Google Gemini to tutor, quiz, and track your progress.
              Responses may not always be accurate. Verify with your course materials.
            </p>
            <div style={{ borderTop: '1px solid rgba(107,114,128,0.14)', paddingTop: '8px' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', lineHeight: 1.5 }}>
                Do not share passwords or sensitive personal data. Use Sapling as a study
                aid, not a substitute for your own work. Click to review full guidelines.
              </p>
            </div>
          </div>
        )}
      </div>

      {modalOpen && <DisclaimerModal onClose={closeModal} />}
    </>
  );
}
