import React, { createContext, useState, useEffect } from "react";
import axios from 'axios';

interface UserContextProps {
  userData: any;
  setUserData: (data: any) => void;
  installmentsData: any;
  setInstallmentsData: (data: any) => void;
  enterpriseNames: string[];
  setEnterpriseNames: (names: string[]) => void;
  notificationCount: number;
  setNotificationCount: (count: number) => void;
  fetchNotificationCount: () => void;
}

export const UserContext = createContext<UserContextProps>({
  userData: null,
  setUserData: () => {},
  installmentsData: [],
  setInstallmentsData: () => {},
  enterpriseNames: [],
  setEnterpriseNames: () => {},
  notificationCount: 0,
  setNotificationCount: () => {},
  fetchNotificationCount: () => {},
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [userData, setUserData] = useState<any>(null);
  const [installmentsData, setInstallmentsData] = useState<any>(null);
  const [enterpriseNames, setEnterpriseNames] = useState<string[]>([]);
  const [notificationCount, setNotificationCount] = useState<number>(0);


  const fetchNotificationCount = async () => {
    if (!userData || (!userData.cpf && !userData.cnpj)) {
      setNotificationCount(0);
      return;
    }

    try {

      const searchParam = userData.cpf ? { cpf: userData.cpf } : { cnpj: userData.cnpj };

      const response = await axios.get('http://hw0oc4gc8ccwswwg4gk0kss8.167.88.39.225.sslip.io/notifications', {
        params: searchParam,
      });

      if (Array.isArray(response.data)) {
        const unreadCount = response.data.filter(notification => !notification.read).length;
        setNotificationCount(unreadCount);
      } else {
        setNotificationCount(0);
      }
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
      setNotificationCount(0);
    }
  };


  useEffect(() => {
    fetchNotificationCount();

    const interval = setInterval(() => {
      fetchNotificationCount();
    }, 60000);

    return () => clearInterval(interval);
  }, [userData]);

  return (
    <UserContext.Provider
      value={{
        userData,
        setUserData,
        installmentsData,
        setInstallmentsData,
        enterpriseNames,
        setEnterpriseNames,
        notificationCount,
        setNotificationCount,
        fetchNotificationCount, 
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
