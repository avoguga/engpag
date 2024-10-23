import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { UserContext } from '../contexts/UserContext';

const NotificationScreen = () => {
  const router = useRouter();
  const { userData } = useContext(UserContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!userData || !userData.cpf) {
        setError('Dados do usuário não disponíveis.');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get('https://47ed-177-127-61-77.ngrok-free.app/notifications', {
          params: {
            cpf: userData.cpf,
          },
        });

        setNotifications(response.data);
      } catch (err) {
        console.error('Erro ao buscar notificações:', err);
        setError('Falha ao buscar notificações.');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [userData]);

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        <Text style={{ width: 28 }}></Text> 
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#E1272C" style={{ marginTop: 20 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : notifications.length > 0 ? (
          notifications.map((notification) => (
            <View key={notification._id} style={styles.notificationCard}>
              <Text style={styles.notificationTitle}>{notification.subject}</Text>
              <Text style={styles.notificationMessage}>{notification.message}</Text>
              <Text style={styles.notificationDate}>
                {new Date(notification.dateSent).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noNotificationsText}>
            Nenhuma notificação disponível.
          </Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F6',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E1272C',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  notificationDate: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
  noNotificationsText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#E1272C',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default NotificationScreen;
