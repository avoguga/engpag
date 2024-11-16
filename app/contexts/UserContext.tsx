import React, { createContext, useState, useEffect, useRef } from "react";
import axios from "axios";
import * as Notifications from "expo-notifications";

interface Notification {
  _id: string;
  subject: string;
  message: string;
  read: boolean;
  showOnHome: boolean;
  dateSent: string;
}

interface UserContextProps {
  userData: any;
  setUserData: (data: any) => void;
  installmentsData: any;
  setInstallmentsData: (data: any) => void;
  enterpriseNames: string[];
  setEnterpriseNames: (names: string[]) => void;
  notificationCount: number;
  setNotificationCount: (count: number) => void;
  notifications: Notification[];
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
  notifications: [],
  fetchNotificationCount: () => {},
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [userData, setUserData] = useState<any>(null);
  const [installmentsData, setInstallmentsData] = useState<any>(null);
  const [enterpriseNames, setEnterpriseNames] = useState<string[]>([]);
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const previousCount = useRef(notificationCount);

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  const sendLocalNotification = async (notification: Notification) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${notification.subject}`,
        body: notification.message,
      },
      trigger: null, 
    });
  };

  const fetchNotificationCount = async () => {
    if (!userData || (!userData.cpf && !userData.cnpj)) {
      setNotificationCount(0);
      setNotifications([]);
      return;
    }

    try {
      const searchParam = userData.cpf
        ? { cpf: userData.cpf }
        : { cnpj: userData.cnpj };

      const response = await axios.get(
        "https://engpag.backend.gustavohenrique.dev/notifications",
        {
          params: searchParam,
        }
      );

      if (Array.isArray(response.data)) {
        const allNotifications = response.data;
        setNotifications(allNotifications);

        const unreadNotifications = allNotifications.filter(
          (notification) => !notification.read
        );

        const unreadCount = unreadNotifications.length;
        setNotificationCount(unreadCount);

        if (unreadCount > previousCount.current) {
          const newNotifications = unreadNotifications.slice(
            0,
            unreadCount - previousCount.current
          );
          newNotifications.forEach(sendLocalNotification);
        }

        previousCount.current = unreadCount;
      } else {
        setNotificationCount(0);
        setNotifications([]);
      }
    } catch (err) {
      console.error("Erro ao buscar notificações:", err);
      setNotificationCount(0);
      setNotifications([]);
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
        notifications,
        fetchNotificationCount,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
