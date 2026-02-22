'use client';

import { useEffect, useState } from 'react';
import RoomList from '@/components/RoomList';
import RoomOverview from '@/components/RoomOverview';
import StudyMatch from '@/components/StudyMatch';
import { Room, RoomActivity, StudyMatch as StudyMatchType } from '@/lib/types';
import { getUserRooms, getRoomOverview, getRoomActivity, findStudyMatches } from '@/lib/api';
import { useUser } from '@/context/UserContext';

type Tab = 'overview' | 'match' | 'activity';

export default function SocialPage() {
  const { userId: USER_ID, userReady } = useUser();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

  const [overviewData, setOverviewData] = useState<any>(null);
  const [activity, setActivity] = useState<RoomActivity[]>([]);
  const [matches, setMatches] = useState<StudyMatchType[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);

  useEffect(() => {
    if (!userReady) return;
    getUserRooms(USER_ID).then(res => {
      setRooms(res.rooms);
      if (res.rooms.length > 0 && !activeRoomId) {
        setActiveRoomId(res.rooms[0].id);
      }
    }).catch(console.error);
  }, [USER_ID, userReady]);

  useEffect(() => {
    if (!activeRoomId) return;
    setOverviewLoading(true);
    setOverviewData(null);
    setActivity([]);
    setMatches([]);

    Promise.all([
      getRoomOverview(activeRoomId),
      getRoomActivity(activeRoomId),
    ]).then(([ovData, actData]) => {
      setOverviewData(ovData);
      setActivity(actData.activities);
    }).catch(console.error).finally(() => {
      setOverviewLoading(false);
    });
  }, [activeRoomId]);

  const handleFindMatches = async () => {
    if (!activeRoomId) return;
    setMatchLoading(true);
    try {
      const res = await findStudyMatches(activeRoomId, USER_ID);
      setMatches(res.matches);
    } catch (e) {
      console.error(e);
    } finally {
      setMatchLoading(false);
    }
  };

  const formatActivityTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return 'just now';
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const tabStyle = (t: Tab) => ({
    background: 'none',
    border: 'none',
    fontSize: '14px',
    color: tab === t ? '#111827' : '#6b7280',
    fontWeight: tab === t ? 500 : 400 as const,
    borderBottom: tab === t ? '2px solid rgba(26,92,42,0.7)' : '2px solid transparent',
    cursor: 'pointer',
    padding: '8px 0',
    marginRight: '20px',
  });

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 48px)' }}>
      {/* Left sidebar */}
      <div style={{ width: '240px', background: '#f2f7f2', borderRight: '1px solid rgba(107,114,128,0.12)', overflowY: 'auto' }}>
        <RoomList
          rooms={rooms}
          activeRoomId={activeRoomId}
          userId={USER_ID}
          onSelectRoom={id => { setActiveRoomId(id); setTab('overview'); }}
          onRoomsChange={setRooms}
        />
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeRoomId ? (
          <>
            {/* Tabs */}
            <div style={{ background: '#f0f5f0', borderBottom: '1px solid rgba(107,114,128,0.12)', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
              <button style={tabStyle('overview')} onClick={() => setTab('overview')}>Overview</button>
              <button style={tabStyle('match')} onClick={() => setTab('match')}>Study Match</button>
              <button style={tabStyle('activity')} onClick={() => setTab('activity')}>Activity</button>
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {tab === 'overview' && (
                overviewLoading ? (
                  <p style={{ color: '#9ca3af', fontSize: '14px' }}>Loading...</p>
                ) : overviewData ? (
                  <RoomOverview
                    room={overviewData.room}
                    members={overviewData.members}
                    aiSummary={overviewData.ai_summary}
                    myUserId={USER_ID}
                  />
                ) : null
              )}

              {tab === 'match' && (
                <StudyMatch
                  matches={matches}
                  onFindMatches={handleFindMatches}
                  loading={matchLoading}
                  userId={USER_ID}
                />
              )}

              {tab === 'activity' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {activity.length === 0 ? (
                    <p style={{ color: '#9ca3af', fontSize: '14px' }}>No activity yet.</p>
                  ) : (
                    activity.map(a => (
                      <div key={a.id} style={{ display: 'flex', gap: '8px', alignItems: 'baseline', padding: '6px 0', borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827', minWidth: '60px' }}>{a.user_name}</span>
                        <span style={{ fontSize: '13px', color: '#4b5563' }}>
                          {a.activity_type}
                          {a.concept_name && ` ${a.concept_name}`}
                          {a.detail && ` — ${a.detail}`}
                        </span>
                        <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: 'auto', flexShrink: 0 }}>
                          {formatActivityTime(a.created_at)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '14px' }}>
            Create or join a room to get started.
          </div>
        )}
      </div>
    </div>
  );
}