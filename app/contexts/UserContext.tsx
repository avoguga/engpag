import React, { createContext, useState } from 'react';

interface UserContextProps {
  userData: any;
  setUserData: (data: any) => void;
  installmentsData: any;
  setInstallmentsData: (data: any) => void;
  enterpriseName: string;
  setEnterpriseName: (name: string) => void;
}

export const UserContext = createContext<UserContextProps>({
  userData: null,
  setUserData: () => {},
  installmentsData: [],
  setInstallmentsData: () => {},
  enterpriseName: '',
  setEnterpriseName: () => {},
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<any>(null);
  const [installmentsData, setInstallmentsData] = useState<any>(null);
  const [enterpriseName, setEnterpriseName] = useState<string>(''); // Novo estado para o nome do empreendimento

  return (
    <UserContext.Provider value={{ userData, setUserData, installmentsData, setInstallmentsData, enterpriseName, setEnterpriseName }}>
      {children}
    </UserContext.Provider>
  );
};
