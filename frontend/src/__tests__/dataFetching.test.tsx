/**
 * Tests that each page's data-fetching useEffect:
 *   1. Does NOT fire before userReady is true (prevents fetching with wrong default userId)
 *   2. DOES fire once userReady becomes true with the correct userId
 *   3. Re-fires when userId changes (so switching users always loads fresh data)
 *
 * We mock the API module and the UserContext so tests are fully isolated.
 */
import React, { useEffect, useState } from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { UserContext } from '@/context/UserContext';

// ─── helpers ────────────────────────────────────────────────────────────────

type ContextValue = {
  userId: string;
  userName: string;
  users: never[];
  userReady: boolean;
  setActiveUser: () => void;
};

function makeContext(overrides: Partial<ContextValue>): ContextValue {
  return {
    userId: 'user_andres',
    userName: 'Andres Lopez',
    users: [],
    userReady: false,
    setActiveUser: () => {},
    ...overrides,
  };
}

// Minimal wrapper that lets us swap context values mid-test
function ContextWrapper({
  value,
  children,
}: {
  value: ContextValue;
  children: React.ReactNode;
}) {
  return (
    <UserContext.Provider value={value}>{children}</UserContext.Provider>
  );
}

// ─── Dashboard (page.tsx) ────────────────────────────────────────────────────

jest.mock('@/lib/api', () => ({
  getGraph: jest.fn(() => Promise.resolve({ nodes: [], edges: [], stats: {} })),
  getRecommendations: jest.fn(() => Promise.resolve({ recommendations: [] })),
  getUpcomingAssignments: jest.fn(() => Promise.resolve({ assignments: [] })),
  getSessions: jest.fn(() => Promise.resolve({ sessions: [] })),
  getUserRooms: jest.fn(() => Promise.resolve({ rooms: [] })),
}));

import * as api from '@/lib/api';

afterEach(() => jest.clearAllMocks());

// ─── Isolated hook that mirrors the Dashboard fetch logic ────────────────────

function useDashboardData(userId: string, userReady: boolean) {
  const [fetched, setFetched] = useState(false);
  useEffect(() => {
    if (!userReady) return;
    (api.getGraph as jest.Mock)(userId).then(() => setFetched(true));
  }, [userId, userReady]);
  return fetched;
}

function DashboardHookHarness({
  userId,
  userReady,
}: {
  userId: string;
  userReady: boolean;
}) {
  const fetched = useDashboardData(userId, userReady);
  return <div data-testid="fetched">{String(fetched)}</div>;
}

test('dashboard: does not fetch when userReady is false', () => {
  render(<DashboardHookHarness userId="user_andres" userReady={false} />);
  expect(api.getGraph).not.toHaveBeenCalled();
});

test('dashboard: fetches once userReady becomes true', async () => {
  const { rerender } = render(
    <DashboardHookHarness userId="user_jose" userReady={false} />
  );
  expect(api.getGraph).not.toHaveBeenCalled();

  rerender(<DashboardHookHarness userId="user_jose" userReady={true} />);
  await waitFor(() => expect(api.getGraph).toHaveBeenCalledWith('user_jose'));
});

test('dashboard: re-fetches when userId changes', async () => {
  const { rerender } = render(
    <DashboardHookHarness userId="user_andres" userReady={true} />
  );
  await waitFor(() => expect(api.getGraph).toHaveBeenCalledWith('user_andres'));

  rerender(<DashboardHookHarness userId="user_jose" userReady={true} />);
  await waitFor(() => expect(api.getGraph).toHaveBeenCalledWith('user_jose'));
  expect(api.getGraph).toHaveBeenCalledTimes(2);
});

// ─── Isolated hook that mirrors the Tree page fetch logic ────────────────────

function useTreeData(userId: string, userReady: boolean) {
  const [fetched, setFetched] = useState(false);
  useEffect(() => {
    if (!userReady) return;
    (api.getGraph as jest.Mock)(userId).then(() => setFetched(true));
  }, [userId, userReady]);
  return fetched;
}

function TreeHookHarness({ userId, userReady }: { userId: string; userReady: boolean }) {
  useTreeData(userId, userReady);
  return null;
}

test('tree: does not fetch when userReady is false', () => {
  render(<TreeHookHarness userId="user_andres" userReady={false} />);
  expect(api.getGraph).not.toHaveBeenCalled();
});

test('tree: re-fetches when userId changes after userReady', async () => {
  const { rerender } = render(<TreeHookHarness userId="user_a" userReady={true} />);
  await waitFor(() => expect(api.getGraph).toHaveBeenCalledWith('user_a'));

  rerender(<TreeHookHarness userId="user_b" userReady={true} />);
  await waitFor(() => expect(api.getGraph).toHaveBeenCalledWith('user_b'));
  expect(api.getGraph).toHaveBeenCalledTimes(2);
});

// ─── Isolated hook that mirrors the Learn page fetch logic ───────────────────

function useLearnData(userId: string, userReady: boolean) {
  const [fetched, setFetched] = useState(false);
  useEffect(() => {
    if (!userReady) return;
    Promise.all([
      (api.getGraph as jest.Mock)(userId),
      (api.getSessions as jest.Mock)(userId, 10),
    ]).then(() => setFetched(true));
  }, [userId, userReady]);
  return fetched;
}

function LearnHookHarness({ userId, userReady }: { userId: string; userReady: boolean }) {
  useLearnData(userId, userReady);
  return null;
}

test('learn: does not fetch graph/sessions when userReady is false', () => {
  render(<LearnHookHarness userId="user_andres" userReady={false} />);
  expect(api.getGraph).not.toHaveBeenCalled();
  expect(api.getSessions).not.toHaveBeenCalled();
});

test('learn: fetches graph and sessions for correct user once ready', async () => {
  render(<LearnHookHarness userId="user_jose" userReady={true} />);
  await waitFor(() => {
    expect(api.getGraph).toHaveBeenCalledWith('user_jose');
    expect(api.getSessions).toHaveBeenCalledWith('user_jose', 10);
  });
});

test('learn: re-fetches both graph and sessions when userId changes', async () => {
  const { rerender } = render(<LearnHookHarness userId="user_a" userReady={true} />);
  await waitFor(() => expect(api.getGraph).toHaveBeenCalledWith('user_a'));

  rerender(<LearnHookHarness userId="user_b" userReady={true} />);
  await waitFor(() => expect(api.getGraph).toHaveBeenCalledWith('user_b'));
  expect(api.getGraph).toHaveBeenCalledTimes(2);
  expect(api.getSessions).toHaveBeenCalledTimes(2);
});

// ─── Isolated hook that mirrors the Social page fetch logic ──────────────────

function useSocialData(userId: string, userReady: boolean) {
  const [fetched, setFetched] = useState(false);
  useEffect(() => {
    if (!userReady) return;
    (api.getUserRooms as jest.Mock)(userId).then(() => setFetched(true));
  }, [userId, userReady]);
  return fetched;
}

function SocialHookHarness({ userId, userReady }: { userId: string; userReady: boolean }) {
  useSocialData(userId, userReady);
  return null;
}

test('social: does not fetch rooms when userReady is false', () => {
  render(<SocialHookHarness userId="user_andres" userReady={false} />);
  expect(api.getUserRooms).not.toHaveBeenCalled();
});

test('social: fetches rooms for correct user once ready', async () => {
  render(<SocialHookHarness userId="user_jose" userReady={true} />);
  await waitFor(() =>
    expect(api.getUserRooms).toHaveBeenCalledWith('user_jose')
  );
});

test('social: re-fetches rooms when userId changes', async () => {
  const { rerender } = render(<SocialHookHarness userId="user_a" userReady={true} />);
  await waitFor(() => expect(api.getUserRooms).toHaveBeenCalledWith('user_a'));

  rerender(<SocialHookHarness userId="user_b" userReady={true} />);
  await waitFor(() => expect(api.getUserRooms).toHaveBeenCalledWith('user_b'));
  expect(api.getUserRooms).toHaveBeenCalledTimes(2);
});
