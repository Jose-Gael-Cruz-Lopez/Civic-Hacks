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

export default function RoomList({ rooms, activeRoomId, userId, onSelectRoom, onRoomsChange }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!roomName.trim()) return;
    setLoading(true);
    try {
      const res = await createRoom(userId, roomName.trim());
      setNewCode(res.invite_code);
      setRoomName('');
      const newRoom: Room = { id: res.room_id, name: roomName.trim(), invite_code: res.invite_code, member_count: 1 };
      onRoomsChange([...rooms, newRoom]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    try {
      const res = await joinRoom(userId, inviteCode.trim());
      setInviteCode('');
      setShowJoin(false);
      if (!rooms.find(r => r.id === res.room.id)) {
        onRoomsChange([...rooms, res.room]);
      }
      onSelectRoom(res.room.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Study Rooms</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { setShowCreate(!showCreate); setShowJoin(false); setNewCode(''); }}
            style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}>
            Create
          </button>
          <button onClick={() => { setShowJoin(!showJoin); setShowCreate(false); setNewCode(''); }}
            style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}>
            Join
          </button>
        </div>
      </div>

      {showCreate && (
        <div style={{ marginBottom: '12px', padding: '12px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
          {newCode ? (
            <div>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Invite code:</p>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#111827', letterSpacing: '0.1em' }}>{newCode}</p>
              <button onClick={() => { setShowCreate(false); setNewCode(''); }}
                style={{ marginTop: '8px', background: 'none', border: 'none', color: '#9ca3af', fontSize: '12px', cursor: 'pointer' }}>
                Done
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                placeholder="Room name"
                style={{ flex: 1, padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '13px' }}
              />
              <button onClick={handleCreate} disabled={loading || !roomName.trim()}
                style={{ padding: '6px 10px', background: '#111827', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                Create
              </button>
            </div>
          )}
        </div>
      )}

      {showJoin && (
        <div style={{ marginBottom: '12px', padding: '12px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Invite code"
              style={{ flex: 1, padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '13px', letterSpacing: '0.1em' }}
            />
            <button onClick={handleJoin} disabled={loading || !inviteCode.trim()}
              style={{ padding: '6px 10px', background: '#111827', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
              Join
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {rooms.map(room => (
          <button
            key={room.id}
            onClick={() => onSelectRoom(room.id)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 12px',
              border: 'none',
              borderRadius: '6px',
              borderLeft: room.id === activeRoomId ? '3px solid #111827' : '3px solid transparent',
              background: room.id === activeRoomId ? '#f9fafb' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <p style={{ fontSize: '13px', fontWeight: 500, color: '#111827', margin: 0 }}>{room.name}</p>
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>{room.member_count} members</p>
          </button>
        ))}
        {rooms.length === 0 && (
          <p style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>
            No rooms yet. Create or join one.
          </p>
        )}
      </div>
    </div>
  );
}
