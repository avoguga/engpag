import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";

const NotificationScreen = () => {
  const router = useRouter();
  const { userData } = useContext(UserContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    if (!userData || !userData.cpf) {
      setError("Dados do usuário não disponíveis.");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(
        `http://hw0oc4gc8ccwswwg4gk0kss8.167.88.39.225.sslip.io/notifications`,
        { params: { cpf: userData.cpf } }
      );
      setNotifications(response.data);
    } catch (err) {
      console.error("Erro ao buscar notificações:", err);
      setError("Falha ao buscar notificações.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userData]);

  // Função para marcar uma notificação como lida
  const handleNotificationPress = async (notification) => {
    if (notification.read) {
      // Já está lida, nenhuma ação necessária
      return;
    }

    try {
      // Marcar como lida no servidor
      await axios.put(
        `http://hw0oc4gc8ccwswwg4gk0kss8.167.88.39.225.sslip.io/notifications/${notification._id}`,
        { read: true }
      );

      // Atualizar o estado local
      setNotifications((prevNotifications) =>
        prevNotifications.map((n) =>
          n._id === notification._id ? { ...n, read: true } : n
        )
      );
    } catch (err) {
      console.error("Erro ao marcar notificação como lida:", err);
      Alert.alert("Erro", "Falha ao marcar notificação como lida.");
    }
  };

  // Função para deletar todas as notificações
  const deleteAllNotifications = () => {
    if (!userData || !userData.cpf) {
      Alert.alert("Erro", "Dados do usuário não disponíveis.");
      return;
    }

    Alert.alert(
      "Confirmar Deleção",
      "Tem certeza de que deseja apagar todas as notificações?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await axios.delete(
                "http://hw0oc4gc8ccwswwg4gk0kss8.167.88.39.225.sslip.io/notifications",
                {
                  params: { cpf: userData.cpf },
                }
              );
              Alert.alert("Sucesso", "Você apagou as notificações!");
              setNotifications([]); // Limpa a lista de notificações
            } catch (err) {
              console.error("Erro ao deletar notificações:", err);
              Alert.alert("Erro", "Falha ao deletar notificações.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBarWrapper}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed ? styles.backButtonPressed : null,
            ]}
          >
            <Ionicons name="arrow-back-outline" size={28} color="white" />
          </Pressable>
          <Text style={styles.headerTitle}>Notificações</Text>
          <TouchableOpacity onPress={deleteAllNotifications} disabled={deleting}>
            {deleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="trash-outline" size={28} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#E1272C"
            style={{ marginTop: 20 }}
          />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : notifications.length > 0 ? (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification._id}
              style={[
                styles.notificationCard,
                notification.read
                  ? styles.notificationCardRead
                  : styles.notificationCardUnread,
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              <Text style={styles.notificationTitle}>
                {notification.subject}
              </Text>
              <Text style={styles.notificationMessage}>
                {notification.message}
              </Text>
              <Text style={styles.notificationDate}>
                {new Date(notification.dateSent).toLocaleDateString("pt-BR")}
              </Text>
            </TouchableOpacity>
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
    backgroundColor: "#FAF6F6",
  },
  topBarWrapper: {
    paddingTop: StatusBar.currentHeight || 24,
    backgroundColor: "#E1272C",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E1272C",
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  backButton: {
    padding: 10,
  },
  backButtonPressed: {
    opacity: 0.5,
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginLeft: -28,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  notificationCard: {
    borderRadius: 8,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
  },
  notificationCardUnread: {
    backgroundColor: "#FFFFFF",
  },
  notificationCardRead: {
    backgroundColor: "#F0F0F0",
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#555",
    marginBottom: 10,
  },
  notificationDate: {
    fontSize: 12,
    color: "#888",
    textAlign: "right",
  },
  noNotificationsText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#E1272C",
    textAlign: "center",
    marginTop: 20,
  },
});

export default NotificationScreen;
