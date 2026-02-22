/**
 * Tests for UserContext — verifies localStorage restoration and the
 * userReady gate that prevents pages from fetching with the wrong default user.
 */
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { UserProvider, useUser } from '@/context/UserContext';

// Stub the /api/users fetch so tests don't hit the network
beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ json: () => Promise.resolve({ users: [] }) } as Response)
  );
});

afterEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

function DisplayUser() {
  const { userId, userName, userReady } = useUser();
  return (
    <div>
      <span data-testid="userId">{userId}</span>
      <span data-testid="userName">{userName}</span>
      <span data-testid="ready">{String(userReady)}</span>
    </div>
  );
}

test('starts with userReady=false before localStorage is read', () => {
  // Render without waiting for effects — userReady should be false initially
  let readyOnFirstRender = '';
  function Probe() {
    const { userReady } = useUser();
    if (readyOnFirstRender === '') readyOnFirstRender = String(userReady);
    return null;
  }
  render(<UserProvider><Probe /></UserProvider>);
  expect(readyOnFirstRender).toBe('false');
});

test('sets userReady=true after mount even if no localStorage entry exists', async () => {
  render(<UserProvider><DisplayUser /></UserProvider>);
  await waitFor(() => {
    expect(screen.getByTestId('ready').textContent).toBe('true');
  });
});

test('restores userId and userName from localStorage on mount', async () => {
  localStorage.setItem(
    'sapling_user',
    JSON.stringify({ id: 'user_jose', name: 'Jose Cruz' })
  );
  render(<UserProvider><DisplayUser /></UserProvider>);
  await waitFor(() => {
    expect(screen.getByTestId('userId').textContent).toBe('user_jose');
    expect(screen.getByTestId('userName').textContent).toBe('Jose Cruz');
    expect(screen.getByTestId('ready').textContent).toBe('true');
  });
});

test('falls back to default user when localStorage is empty', async () => {
  render(<UserProvider><DisplayUser /></UserProvider>);
  await waitFor(() => {
    expect(screen.getByTestId('userId').textContent).toBe('user_andres');
    expect(screen.getByTestId('ready').textContent).toBe('true');
  });
});

test('setActiveUser updates userId and persists to localStorage', async () => {
  function SwitchUser() {
    const { userId, setActiveUser, userReady } = useUser();
    return (
      <div>
        <span data-testid="userId">{userId}</span>
        <span data-testid="ready">{String(userReady)}</span>
        <button onClick={() => setActiveUser('user_gael', 'Gael Lopez')}>
          Switch
        </button>
      </div>
    );
  }

  render(<UserProvider><SwitchUser /></UserProvider>);
  await waitFor(() =>
    expect(screen.getByTestId('ready').textContent).toBe('true')
  );

  act(() => {
    screen.getByRole('button', { name: 'Switch' }).click();
  });

  expect(screen.getByTestId('userId').textContent).toBe('user_gael');
  const stored = JSON.parse(localStorage.getItem('sapling_user') ?? '{}');
  expect(stored.id).toBe('user_gael');
  expect(stored.name).toBe('Gael Lopez');
});
