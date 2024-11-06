import React, { createContext, useState } from 'react';

interface UserContextProps {
  userData: any;
  setUserData: (data: any) => void;
  installmentsData: any;
  setInstallmentsData: (data: any) => void;
  enterpriseNames: string[];
  setEnterpriseNames: (names: string[]) => void;
}

export const UserContext = createContext<UserContextProps>({
  userData: null,
  setUserData: () => {},
  installmentsData: [],
  setInstallmentsData: () => {},
  enterpriseNames: [],
  setEnterpriseNames: () => {},
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<any>(null);
  const [installmentsData, setInstallmentsData] = useState<any>(null);
  const [enterpriseNames, setEnterpriseNames] = useState<string[]>([]);

  return (
    <UserContext.Provider value={{ userData, setUserData, installmentsData, setInstallmentsData, enterpriseNames, setEnterpriseNames }}>
      {children}
    </UserContext.Provider>
  );
};
