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
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";
import NotificationIcon from "@/components/NotificationIcon";

const NotificationScreen = () => {
  const router = useRouter();
  const {
    userData,
    notificationCount,
    setNotificationCount,
    fetchNotificationCount,
  } = useContext(UserContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    if (!userData || (!userData.cpf && !userData.cnpj)) {
      setError("Dados do usuário não disponíveis.");
      setLoading(false);
      return;
    }

    try {
      const searchParam = userData.cpf
        ? { cpf: userData.cpf }
        : { cnpj: userData.cnpj };

      const response = await axios.get(
        `https://engpag.backend.gustavohenrique.dev/notifications`,
        { params: searchParam }
      );

      setNotifications(response.data);

      const unreadCount = response.data.filter(
        (notification) => !notification.read
      ).length;
      setNotificationCount(unreadCount);
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

  const handleNotificationPress = async (notification) => {
    if (notification.read) {
      return;
    }

    try {
      await axios.put(
        `https://engpag.backend.gustavohenrique.dev/notifications/${notification._id}`,
        { read: true }
      );

      setNotifications((prevNotifications) =>
        prevNotifications.map((n) =>
          n._id === notification._id ? { ...n, read: true } : n
        )
      );

      setNotificationCount(notificationCount - 1);
    } catch (err) {
      console.error("Erro ao marcar notificação como lida:", err);
      Alert.alert("Erro", "Falha ao marcar notificação como lida.");
    }
  };

  const deleteAllNotifications = () => {
    if (!userData || (!userData.cpf && !userData.cnpj)) {
      if (Platform.OS === "web") {
        window.alert("Dados do usuário não disponíveis.");
      } else {
        Alert.alert("Erro", "Dados do usuário não disponíveis.");
      }
      return;
    }

    const confirmDelete = () => {
      setDeleting(true);
      const deleteParam = userData.cpf
        ? { cpf: userData.cpf }
        : { cnpj: userData.cnpj };

      axios
        .delete("https://engpag.backend.gustavohenrique.dev/notifications", {
          params: deleteParam,
        })
        .then(() => {
          if (Platform.OS === "web") {
            window.alert("Você apagou as notificações!");
          } else {
            Alert.alert("Sucesso", "Você apagou as notificações!");
          }
          setNotifications([]);
          setNotificationCount(0);
        })
        .catch((err) => {
          console.error("Erro ao deletar notificações:", err);
          if (Platform.OS === "web") {
            window.alert("Falha ao deletar notificações.");
          } else {
            Alert.alert("Erro", "Falha ao deletar notificações.");
          }
        })
        .finally(() => {
          setDeleting(false);
        });
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Tem certeza de que deseja apagar todas as notificações?"
        )
      ) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        "Confirmar Deleção",
        "Tem certeza de que deseja apagar todas as notificações?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Apagar",
            style: "destructive",
            onPress: confirmDelete,
          },
        ],
        { cancelable: true }
      );
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerName}>
          <NotificationIcon />

          <Text style={styles.greeting}>
            Olá,{" "}
            {userData?.name
              ? userData.name
                  .toLowerCase()
                  .split(" ")
                  .slice(0, 2)
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ") || "Usuário"
              : "Usuário"}
            !
          </Text>
        </View>
        <Text style={styles.sectionTitle}>Minhas notificações</Text>
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
        {/* Bottom Navigation Section */}
        <View style={styles.bottomSection}>
          <View style={styles.navigationContainer}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => router.back()}
            >
              <Image
                source={require("../seta.png")}
                style={styles.logoBottom}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={deleteAllNotifications}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="trash-outline" size={50} color="white" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => router.navigate("/initial-page")}
            >
              <Image
                source={require("../home.png")}
                style={styles.logoBottom}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerName: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
    width: "100%",
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "left",
    marginBottom: 20,
    width: "100%",
    paddingHorizontal: 20,
  },
  sectionTitleSeus: {
    fontSize: 24,
    color: "#FFFFFF",
    paddingHorizontal: 20,
    textAlign: "left",
    width: "100%",
  },
  logoBottom: {
    width: 50,
  },
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#D00000",
  },
  content: {
    flex: 1,
    marginTop: 30,

    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#880000",
    borderRadius: 40,
    marginHorizontal: 5,
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
  // Bottom Navigation Styles
  bottomSection: {
    width: "100%",
  },

  navigationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    gap: 30,
  },
  navButton: {
    padding: 10,
    marginTop: 20,
  },
});

export default NotificationScreen;
