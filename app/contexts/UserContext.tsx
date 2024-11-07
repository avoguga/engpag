// UserContext.js

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
  fetchNotificationCount: () => void; // Added fetch function
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

  // Function to fetch notification count
  const fetchNotificationCount = async () => {
    if (!userData || !userData.cpf) {
      setNotificationCount(0);
      return;
    }

    try {
      const response = await axios.get('http://hw0oc4gc8ccwswwg4gk0kss8.167.88.39.225.sslip.io/notifications', {
        params: { cpf: userData.cpf },
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

  // Fetch notification count when userData changes and every 60 seconds
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
