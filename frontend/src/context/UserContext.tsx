'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface UserOption {
  id: string;
  name: string;
}

interface UserContextValue {
  userId: string;
  userName: string;
  users: UserOption[];
  setActiveUser: (id: string, name: string) => void;
}

const UserContext = createContext<UserContextValue>({
  userId: 'user_andres',
  userName: 'Andres Lopez',
  users: [],
  setActiveUser: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState('user_andres');
  const [userName, setUserName] = useState('Andres Lopez');
  const [users, setUsers] = useState<UserOption[]>([]);

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

  return (
    <UserContext.Provider value={{ userId, userName, users, setActiveUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
