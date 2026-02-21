'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface UserOption {
  id: string;
  name: string;
  room_id: string | null;
}

interface UserContextValue {
  userId: string;
  userName: string;
  users: UserOption[];
  setActiveUser: (id: string, name: string) => void;
}

const UserContext = createContext<UserContextValue>({
  userId: 'user_john',
  userName: 'John Doe',
  users: [],
  setActiveUser: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState('user_john');
  const [userName, setUserName] = useState('John Doe');
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

  // Fetch user list from backend
  useEffect(() => {
    fetch('http://localhost:5000/api/users')
      .then(r => r.json())
      .then(data => setUsers(data.users ?? []))
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
