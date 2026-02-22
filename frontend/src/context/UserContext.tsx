'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

interface UserOption {
  id: string;
  name: string;
}

interface UserContextValue {
  userId: string;
  userName: string;
  users: UserOption[];
  /** True once localStorage has been read — gates all data fetches so they
   *  never fire with the hardcoded default user before we know the real one. */
  userReady: boolean;
  setActiveUser: (id: string, name: string) => void;
}

const UserContext = createContext<UserContextValue>({
  userId: 'user_andres',
  userName: 'Andres Lopez',
  users: [],
  userReady: false,
  setActiveUser: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState('user_andres');
  const [userName, setUserName] = useState('Andres Lopez');
  const [users, setUsers] = useState<UserOption[]>([]);
  // Becomes true after localStorage is read — prevents pages from fetching
  // data with the hardcoded default before the real saved user is known.
  const [userReady, setUserReady] = useState(false);

  // Restore last selected user from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sapling_user');
    if (saved) {
      try {
        const { id, name } = JSON.parse(saved);
        setUserId(id);
        setUserName(name);
      } catch {}
    }
    setUserReady(true);
  }, []);

  // Fetch user list from backend and reconcile the current user's name
  useEffect(() => {
    fetch('http://localhost:5000/api/users')
      .then(r => r.json())
      .then((data: { users: UserOption[] }) => {
        const list = data.users ?? [];
        setUsers(list);
        // Always sync userName from the live backend list for the current userId
        // so the greeting never shows a stale or hardcoded default name
        setUserId(prev => {
          const match = list.find(u => u.id === prev);
          if (match) setUserName(match.name);
          return prev;
        });
      })
      .catch(() => {});
  }, []);

  const setActiveUser = (id: string, name: string) => {
    setUserId(id);
    setUserName(name);
    localStorage.setItem('sapling_user', JSON.stringify({ id, name }));
  };

  const value = useMemo(
    () => ({ userId, userName, users, userReady, setActiveUser }),
    [userId, userName, users, userReady]
  );

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
