'use client';

import React, { createContext, useContext, useState } from 'react';

interface UserContextValue {
  userId: string;
  userName: string;
}

const UserContext = createContext<UserContextValue>({
  userId: 'user_john',
  userName: 'John Doe',
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId] = useState('user_john');
  const [userName] = useState('John Doe');

  return (
    <UserContext.Provider value={{ userId, userName }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
