import React, { useState, useEffect, useContext } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { UserContext } from '@/app/contexts/UserContext';

const NotificationIcon = () => {
  const router = useRouter();
  const { userData } = useContext(UserContext);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotificationCount = async () => {
    if (!userData || !userData.cpf) {
      setError('Dados do usuário não disponíveis.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get('http://hw0oc4gc8ccwswwg4gk0kss8.167.88.39.225.sslip.io/notifications', {
        params: { cpf: userData.cpf },
      });

      if (Array.isArray(response.data)) {
        // Count only unread notifications
        const unreadCount = response.data.filter(notification => !notification.read).length;
        setNotificationCount(unreadCount);
      } else {
        setNotificationCount(0);
      }
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
      setError('Falha ao buscar notificações.');
      setNotificationCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificationCount();
    const interval = setInterval(() => {
      fetchNotificationCount(); // Update every 60 seconds
    }, 60000);

    return () => clearInterval(interval);
  }, [userData]);

  const handlePress = () => {
    router.push('/notification-screen');
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <Ionicons name="notifications-outline" size={28} color="white" />
      {loading ? (
        <ActivityIndicator size="small" color="#fff" style={styles.badge} />
      ) : notificationCount > 0 && !error ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {notificationCount > 99 ? '99+' : notificationCount}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 5,
  },
  badge: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#E1272C',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default NotificationIcon;
