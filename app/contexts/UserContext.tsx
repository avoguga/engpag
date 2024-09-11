import React, { createContext, useState } from 'react';

interface UserContextProps {
  userData: any;
  setUserData: (data: any) => void;
}

export const UserContext = createContext<UserContextProps>({
  userData: null,
  setUserData: () => {},
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<any>(null);

  return (
    <UserContext.Provider value={{ userData, setUserData }}>
      {children}
    </UserContext.Provider>
  );
};
