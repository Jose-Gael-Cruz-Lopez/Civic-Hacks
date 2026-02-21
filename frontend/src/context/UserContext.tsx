'use client';

import React, { createContext, useContext, useState } from 'react';

interface UserContextValue {
  userId: string;
  userName: string;
}

const UserContext = createContext<UserContextValue>({
  userId: 'user_andres',
  userName: 'Andres',
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId] = useState('user_andres');
  const [userName] = useState('Andres');

  return (
    <UserContext.Provider value={{ userId, userName }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
