'use client';

import { useState } from 'react';
import { Room } from '@/lib/types';
import { createRoom, joinRoom } from '@/lib/api';

interface Props {
  rooms: Room[];
  activeRoomId: string | null;
  userId: string;
  onSelectRoom: (roomId: string) => void;
  onRoomsChange: (rooms: Room[]) => void;
}

type Panel = 'none' | 'create' | 'join';

export default function RoomList({ rooms, activeRoomId, userId, onSelectRoom, onRoomsChange }: Props) {
  const [panel, setPanel] = useState<Panel>('none');
  const [roomName, setRoomName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const openPanel = (p: Panel) => {
    setPanel(prev => prev === p ? 'none' : p);
    setError('');
    setNewCode('');
    setRoomName('');
    setInviteCode('');
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async () => {
    if (!roomName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await createRoom(userId, roomName.trim());
      setNewCode(res.invite_code);
      const newRoom: Room = { id: res.room_id, name: roomName.trim(), invite_code: res.invite_code, member_count: 1 };
      onRoomsChange([...rooms, newRoom]);
      onSelectRoom(res.room_id);
      setRoomName('');
    } catch {
      setError('Failed to create room.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await joinRoom(userId, inviteCode.trim());
      setInviteCode('');
      setPanel('none');
      if (!rooms.find(r => r.id === res.room.id)) {
        onRoomsChange([...rooms, res.room]);
      }
      onSelectRoom(res.room.id);
    } catch {
      setError('Invalid invite code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border-light)' }}>
        <p className="label" style={{ margin: '0 0 12px' }}>Study Rooms</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => openPanel('create')}
            style={{
              flex: 1,
              padding: '7px 0',
              border: panel === 'create' ? '1px solid var(--accent-border)' : '1px solid var(--border)',
              borderRadius: '5px',
              background: panel === 'create' ? 'var(--accent-dim)' : 'transparent',
              color: panel === 'create' ? 'var(--accent)' : 'var(--text-dim)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            + Create
          </button>
          <button
            onClick={() => openPanel('join')}
            style={{
              flex: 1,
              padding: '7px 0',
              border: panel === 'join' ? '1px solid var(--accent-border)' : '1px solid var(--border)',
              borderRadius: '5px',
              background: panel === 'join' ? 'var(--accent-dim)' : 'transparent',
              color: panel === 'join' ? 'var(--accent)' : 'var(--text-dim)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Join
          </button>
        </div>
      </div>

      {/* Create panel */}
      {panel === 'create' && (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-subtle)' }}>
          {newCode ? (
            <div>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '0 0 8px', fontWeight: 500 }}>
                Room created! Share this code:
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent-border)',
                borderRadius: '6px',
              }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.15em', fontFamily: 'monospace' }}>
                  {newCode}
                </span>
                <button
                  onClick={() => copyCode(newCode)}
                  style={{ background: 'none', border: 'none', color: copied ? '#16a34a' : 'var(--text-dim)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <button
                onClick={() => { setPanel('none'); setNewCode(''); }}
                style={{ marginTop: '10px', background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Done
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '0 0 8px', fontWeight: 500 }}>Room name</p>
              <input
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="e.g. CS 101 Study Group"
                autoFocus
                className="input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
              {error && <p style={{ fontSize: '12px', color: '#dc2626', margin: '6px 0 0' }}>{error}</p>}
              <button
                onClick={handleCreate}
                disabled={loading || !roomName.trim()}
                className="btn-accent"
                style={{ marginTop: '10px', width: '100%', opacity: loading || !roomName.trim() ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Creating…' : 'Create Room'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Join panel */}
      {panel === 'join' && (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-subtle)' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '0 0 8px', fontWeight: 500 }}>Enter invite code</p>
          <input
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="ABC123"
            maxLength={6}
            autoFocus
            className="input"
            style={{
              width: '100%',
              fontSize: '18px',
              fontWeight: 600,
              letterSpacing: '0.2em',
              textAlign: 'center',
              fontFamily: 'monospace',
              boxSizing: 'border-box',
              color: 'var(--accent)',
            }}
          />
          {error && <p style={{ fontSize: '12px', color: '#dc2626', margin: '6px 0 0' }}>{error}</p>}
          <button
            onClick={handleJoin}
            disabled={loading || inviteCode.length < 6}
            className="btn-accent"
            style={{ marginTop: '10px', width: '100%', opacity: loading || inviteCode.length < 6 ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Joining…' : 'Join Room'}
          </button>
        </div>
      )}

      {/* Room list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {rooms.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', textAlign: 'center', padding: '24px 8px' }}>
            No rooms yet.
          </p>
        ) : (
          rooms.map(room => (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              className={room.id === activeRoomId ? 'room-item room-item-active' : 'room-item'}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                marginBottom: '2px',
                background: room.id === activeRoomId ? 'var(--accent-dim)' : 'transparent',
                fontFamily: 'inherit',
              }}
            >
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', margin: 0 }}>{room.name}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{room.member_count} member{room.member_count !== 1 ? 's' : ''}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: '0.08em' }}>{room.invite_code}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
