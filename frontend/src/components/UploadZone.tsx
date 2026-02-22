'use client';

import { useState, useRef, DragEvent } from 'react';

interface Props {
  onFile: (file: File) => void;
  loading?: boolean;
  filename?: string;
}

export default function UploadZone({ onFile, loading, filename }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleClick = () => inputRef.current?.click();

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent-border)' : 'var(--border-mid)'}`,
          borderRadius: '8px',
          padding: '40px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'var(--accent-dim)' : 'var(--bg-subtle)',
          transition: 'all 0.15s ease',
        }}
      >
        {loading ? (
          <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Processing...</p>
        ) : filename ? (
          <div>
            <p style={{ color: 'var(--text)', fontSize: '14px', fontWeight: 500 }}>{filename}</p>
            <p style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '4px' }}>Click to replace</p>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Drop a syllabus here or click to browse</p>
            <p style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '4px' }}>PDF, PNG, JPG accepted</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />
    </div>
  );
}
