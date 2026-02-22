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
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
          Study Rooms
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => openPanel('create')}
            style={{
              flex: 1,
              padding: '7px 0',
              border: panel === 'create' ? '1px solid rgba(34,211,238,0.35)' : '1px solid rgba(148,163,184,0.15)',
              borderRadius: '5px',
              background: panel === 'create' ? 'rgba(34,211,238,0.1)' : 'transparent',
              color: panel === 'create' ? '#22d3ee' : '#94a3b8',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            + Create
          </button>
          <button
            onClick={() => openPanel('join')}
            style={{
              flex: 1,
              padding: '7px 0',
              border: panel === 'join' ? '1px solid rgba(34,211,238,0.35)' : '1px solid rgba(148,163,184,0.15)',
              borderRadius: '5px',
              background: panel === 'join' ? 'rgba(34,211,238,0.1)' : 'transparent',
              color: panel === 'join' ? '#22d3ee' : '#94a3b8',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Join
          </button>
        </div>
      </div>

      {/* Create panel */}
      {panel === 'create' && (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(148,163,184,0.08)', background: 'rgba(15,23,42,0.3)' }}>
          {newCode ? (
            <div>
              <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 8px', fontWeight: 500 }}>
                Room created! Share this code:
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'rgba(34,211,238,0.08)',
                border: '1px solid rgba(34,211,238,0.2)',
                borderRadius: '6px',
              }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#22d3ee', letterSpacing: '0.15em', fontFamily: 'monospace' }}>
                  {newCode}
                </span>
                <button
                  onClick={() => copyCode(newCode)}
                  style={{ background: 'none', border: 'none', color: copied ? '#4ade80' : '#475569', fontSize: '12px', cursor: 'pointer' }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <button
                onClick={() => { setPanel('none'); setNewCode(''); }}
                style={{ marginTop: '10px', background: 'none', border: 'none', color: '#475569', fontSize: '12px', cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 8px', fontWeight: 500 }}>Room name</p>
              <input
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="e.g. CS 101 Study Group"
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid rgba(148,163,184,0.15)',
                  borderRadius: '5px',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: 'rgba(15,23,42,0.6)',
                  color: '#f1f5f9',
                }}
              />
              {error && <p style={{ fontSize: '12px', color: '#f87171', margin: '6px 0 0' }}>{error}</p>}
              <button
                onClick={handleCreate}
                disabled={loading || !roomName.trim()}
                style={{
                  marginTop: '10px',
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(34,211,238,0.1)',
                  color: '#22d3ee',
                  border: '1px solid rgba(34,211,238,0.3)',
                  borderRadius: '5px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading || !roomName.trim() ? 0.5 : 1,
                }}
              >
                {loading ? 'Creating…' : 'Create Room'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Join panel */}
      {panel === 'join' && (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(148,163,184,0.08)', background: 'rgba(15,23,42,0.3)' }}>
          <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 8px', fontWeight: 500 }}>Enter invite code</p>
          <input
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="ABC123"
            maxLength={6}
            autoFocus
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid rgba(148,163,184,0.15)',
              borderRadius: '5px',
              fontSize: '18px',
              fontWeight: 600,
              letterSpacing: '0.2em',
              textAlign: 'center',
              fontFamily: 'monospace',
              outline: 'none',
              boxSizing: 'border-box',
              background: 'rgba(15,23,42,0.6)',
              color: '#22d3ee',
            }}
          />
          {error && <p style={{ fontSize: '12px', color: '#f87171', margin: '6px 0 0' }}>{error}</p>}
          <button
            onClick={handleJoin}
            disabled={loading || inviteCode.length < 6}
            style={{
              marginTop: '10px',
              width: '100%',
              padding: '8px',
              background: 'rgba(34,211,238,0.1)',
              color: '#22d3ee',
              border: '1px solid rgba(34,211,238,0.3)',
              borderRadius: '5px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading || inviteCode.length < 6 ? 0.5 : 1,
            }}
          >
            {loading ? 'Joining…' : 'Join Room'}
          </button>
        </div>
      )}

      {/* Room list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {rooms.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#475569', textAlign: 'center', padding: '24px 8px' }}>
            No rooms yet.
          </p>
        ) : (
          rooms.map(room => (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                border: 'none',
                borderRadius: '6px',
                borderLeft: room.id === activeRoomId ? '3px solid rgba(34,211,238,0.6)' : '3px solid transparent',
                background: room.id === activeRoomId ? 'rgba(34,211,238,0.06)' : 'transparent',
                cursor: 'pointer',
                marginBottom: '2px',
              }}
            >
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#f1f5f9', margin: 0 }}>{room.name}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                <span style={{ fontSize: '11px', color: '#475569' }}>{room.member_count} member{room.member_count !== 1 ? 's' : ''}</span>
                <span style={{ fontSize: '11px', color: '#334155', fontFamily: 'monospace', letterSpacing: '0.08em' }}>{room.invite_code}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
