import React, { useEffect, useContext, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  BackHandler,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const formatDate = (dateString) => {
  if (!dateString || typeof dateString !== "string") return "N/A";

  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return "N/A";

  const date = new Date(
    Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day))
  );

  if (isNaN(date.getTime())) return "N/A";

  const formattedDay = date.getUTCDate().toString().padStart(2, "0");
  const formattedMonth = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const formattedYear = date.getUTCFullYear();

  return `${formattedDay}/${formattedMonth}/${formattedYear}`;
};

const formatCurrency = (value) => {
  return value && !isNaN(value)
    ? `R$ ${parseFloat(value).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}`
    : "N/A";
};

const showAlert = (title, message) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const InitialPage = () => {
  const router = useRouter();
  const {
    userData,
    setUserData,
    setInstallmentsData,
    enterpriseNames,
    setEnterpriseNames,
    notifications,
    fetchNotificationCount,
  } = useContext(UserContext);
  const [installmentsData, setLocalInstallmentsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEnterprise, setLoadingEnterprise] = useState(false);
  const [error, setError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const notificationsShownRef = useRef(new Set());

  // Ref para rastrear se o alerta já foi mostrado
  const alertShownRef = useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      const backAction = () => true;
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );
      return () => backHandler.remove();
    }, [])
  );

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        if (Platform.OS === "web") {
          const storedUserData = localStorage.getItem("userData");
          if (!storedUserData) {
            router.replace("/(home)");
          } else {
            const parsedData = JSON.parse(storedUserData);
            setUserData(parsedData);
          }
        } else {
          const storedUserData = await AsyncStorage.getItem("userData");
          if (!storedUserData) {
            router.replace("/(home)");
          } else {
            const parsedData = JSON.parse(storedUserData);
            setUserData(parsedData);
          }
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        showAlert("Erro", "Não foi possível verificar a autenticação.");
        router.replace("/(home)");
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkAuthentication();
  }, [router, setUserData]);

  useEffect(() => {
    if (notifications.length > 0) {
      showHomeNotifications();
    }
  }, [notifications]);

  useEffect(() => {
    const loadDataFromStorage = async () => {
      if (Platform.OS !== "web") {
        return;
      }

      try {
        const storedUserData = localStorage.getItem("userData");
        if (storedUserData) {
          const parsedUserData = JSON.parse(storedUserData);
          setUserData(parsedUserData);
        }

        const storedInstallmentsData = localStorage.getItem("installmentsData");
        if (storedInstallmentsData) {
          const parsedInstallmentsData = JSON.parse(storedInstallmentsData);
          setLocalInstallmentsData(parsedInstallmentsData);
          setInstallmentsData(parsedInstallmentsData);
        }
      } catch (error) {
        console.error("Erro ao carregar dados do localStorage:", error);
      }
    };

    loadDataFromStorage();
  }, [setUserData, setInstallmentsData]);

  useEffect(() => {
    if (Platform.OS === "web") {
      if (!userData) return;
      try {
        localStorage.setItem("userData", JSON.stringify(userData));
      } catch (error) {
        console.error("Erro ao salvar userData no localStorage:", error);
      }
    } else {
      if (!userData) return;
      AsyncStorage.setItem("userData", JSON.stringify(userData)).catch(
        (error) =>
          console.error("Erro ao salvar userData no AsyncStorage:", error)
      );
    }
  }, [userData]);

  useEffect(() => {
    if (Platform.OS === "web" && Array.isArray(installmentsData)) {
      try {
        localStorage.setItem(
          "installmentsData",
          JSON.stringify(installmentsData)
        );
      } catch (error) {
        console.error(
          "Erro ao salvar installmentsData no localStorage:",
          error
        );
      }
    } else {
      if (!installmentsData || !Array.isArray(installmentsData)) return;
      AsyncStorage.setItem(
        "installmentsData",
        JSON.stringify(installmentsData)
      ).catch((error) =>
        console.error("Erro ao salvar installmentsData no AsyncStorage:", error)
      );
    }
  }, [installmentsData]);

  useEffect(() => {
    if (userData && (userData.cpf || userData.cnpj)) {
      fetchInstallments();
    }
  }, [userData]);

  const fetchInstallments = async () => {
    setLoading(true);
    setError("");

    try {
      const username = "engenharq-mozart";
      const password = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb";
      const credentials = btoa(`${username}:${password}`);

      const searchParam = userData.cpf
        ? { cpf: userData.cpf }
        : { cnpj: userData.cnpj };

      const response = await axios.get(
        `https://engpag.backend.gustavohenrique.dev/proxy/current-debit-balance`,
        {
          params: { ...searchParam, correctAnnualInstallment: "N" },
          headers: { Authorization: `Basic ${credentials}` },
        }
      );

      const fetchedData = response.data.results || [];
      setLocalInstallmentsData(fetchedData);
      setInstallmentsData(fetchedData);

      // Verifica se existem boletos vencidos
      let hasOverdueBills = false;
      fetchedData.forEach((item) => {
        if (item.dueInstallments && item.dueInstallments.length > 0) {
          hasOverdueBills = true;
        }
      });

      // Exibe o alerta apenas se ainda não tiver sido mostrado
      if (hasOverdueBills && !alertShownRef.current) {
        alertShownRef.current = true; // Marca que o alerta foi mostrado
        showAlert(
          "Boletos Vencidos",
          "Você possui boletos vencidos. Por favor, regularize suas pendências."
        );
      }

      if (fetchedData.length > 0) {
        await fetchEnterpriseNames(fetchedData);
      }
    } catch (err) {
      setError("Falha ao buscar saldo devedor.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showHomeNotifications = () => {
    const homeNotifications = notifications.filter(
      (notif) => notif.showOnHome && !notif.read
    );

    if (homeNotifications.length === 0) return;

    const showNextNotification = (index = 0) => {
      if (index >= homeNotifications.length) return;

      const notification = homeNotifications[index];

      if (!notificationsShownRef.current.has(notification._id)) {
        notificationsShownRef.current.add(notification._id);

        if (Platform.OS === "web") {
          const shouldMarkAsRead = window.confirm(
            `Notificações\n\n${notification.subject}\n\n${notification.message}\n\nDeseja marcar como lida?`
          );

          if (shouldMarkAsRead) {
            markNotificationAsRead(notification._id).then(() => {
              showNextNotification(index + 1);
            });
          } else {
            showNextNotification(index + 1);
          }
        } else {
          Alert.alert(notification.subject, notification.message, [
            {
              text: "Marcar como lida",
              onPress: () => {
                markNotificationAsRead(notification._id).then(() => {
                  showNextNotification(index + 1);
                });
              },
            },
            {
              text: "Fechar",
              style: "cancel",
              onPress: () => showNextNotification(index + 1),
            },
          ]);
        }
      } else {
        showNextNotification(index + 1);
      }
    };

    showNextNotification();
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const response = await axios.put(
        `https://engpag.backend.gustavohenrique.dev/notifications/${notificationId}`,
        { read: true }
      );

      if (response.status === 200) {
        // Atualizar estado global das notificações
        await fetchNotificationCount();
      } else {
        console.error("Erro ao marcar notificação como lida");
        Alert.alert("Erro", "Não foi possível marcar a notificação como lida");
      }
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
      Alert.alert("Erro", "Não foi possível marcar a notificação como lida");
    }
  };

  const fetchEnterpriseNames = async (installments) => {
    setLoadingEnterprise(true);
    try {
      const username = "engenharq-mozart";
      const password = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb";
      const credentials = btoa(`${username}:${password}`);

      const names = await Promise.all(
        installments.map(async (item) => {
          try {
            const response = await axios.get(
              `https://engpag.backend.gustavohenrique.dev/proxy/accounts-receivable/receivable-bills/${item.billReceivableId}`,
              {
                params: { customerId: userData.id },
                headers: { Authorization: `Basic ${credentials}` },
              }
            );

            const data = response.data;
            return {
              enterpriseName: data.enterpriseName || "Nome do Empreendimento",
              unityName: data.unityName || "N/A",
              documentId: data.documentId || "N/A",
              documentNumber: data.documentNumber || "N/A",
              enterpriseCode: data.enterpriseCode || "N/A",
              receivableBillValue: data.receivableBillValue || "N/A",
              issueDate: data.issueDate || "N/A",
            };
          } catch (error) {
            console.error("Erro ao buscar nome do empreendimento:", error);
            return {
              enterpriseName: "Erro ao buscar nome",
              unityName: "N/A",
              documentId: "N/A",
              documentNumber: "N/A",
              enterpriseCode: "N/A",
              receivableBillValue: "N/A",
              issueDate: "N/A",
            };
          }
        })
      );

      setEnterpriseNames(names);
    } catch (error) {
      console.error("Erro ao buscar nomes dos empreendimentos:", error);
      showAlert(
        "Erro",
        "Não foi possível buscar os nomes dos empreendimentos."
      );
    } finally {
      setLoadingEnterprise(false);
    }
  };

  const handleCardPress = (item, index) => {
    setInstallmentsData([item]);

    router.push({
      pathname: "/debit-options",
      params: {
        billReceivableId: item.billReceivableId,
        enterpriseName: enterpriseNames[index]?.enterpriseName,
        unityName: enterpriseNames[index]?.unityName,
        receivableBillValue: enterpriseNames[index]?.receivableBillValue,
      },
    });
  };

  if (isAuthLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E1272C" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>
          Olá, {userData?.name?.split(" ")[0] || "Usuário"}!
        </Text>
        <View style={styles.lineSeparatorLarge} />
        <View style={styles.lineSeparatorSmall} />

        <Text style={styles.sectionTitle}>Empreendimentos</Text>

        {loading && <ActivityIndicator size="large" color="#E1272C" />}
        {error !== "" && <Text style={styles.errorText}>{error}</Text>}
        {loadingEnterprise && (
          <ActivityIndicator size="small" color="#E1272C" />
        )}

        {!loading &&
        Array.isArray(installmentsData) &&
        installmentsData.length > 0
          ? installmentsData.map((item, index) => {
              const enterpriseInfo = enterpriseNames[index] || {};
              const allDueInstallments = [
                ...(item.dueInstallments || []),
                ...(item.payableInstallments || []),
              ];

              const futureInstallments = allDueInstallments.filter(
                (installment) => new Date(installment.dueDate) >= new Date()
              );

              futureInstallments.sort(
                (a, b) =>
                  new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
              );

              const nextInstallment = futureInstallments[0];
              const nextInstallmentAmount = nextInstallment
                ? nextInstallment.currentBalance
                : null;

              const hasUnpaidInstallments = allDueInstallments.length > 0;
              const status = hasUnpaidInstallments ? "Em aberto" : "Quitado";

              return (
                <TouchableOpacity
                  key={item.billReceivableId}
                  style={styles.card}
                  onPress={() => handleCardPress(item, index)}
                >
                  <View style={styles.cardIcon}>
                    <Ionicons name="home-outline" size={28} color="#E1272C" />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>
                      {enterpriseInfo.enterpriseName}
                    </Text>
                    {enterpriseInfo.unityName !== 'N/A' ? (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Unidade:</Text>
                        <Text style={styles.infoValue}>
                          {enterpriseInfo.unityName}
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Número do contrato:</Text>
                      <Text style={styles.infoValue}>
                        {enterpriseInfo.documentId}/
                        {enterpriseInfo.documentNumber}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Valor do contrato:</Text>
                      <Text style={styles.infoValue}>
                        {formatCurrency(enterpriseInfo.receivableBillValue)}
                      </Text>
                    </View>
                    {nextInstallmentAmount ? (
                      <View style={styles.cardRow}>
                        <Text style={styles.infoLabel}>
                          Valor da próxima parcela:
                        </Text>
                        <Text style={styles.cardValue}>
                          {formatCurrency(nextInstallmentAmount)}
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.cardRow}>
                      <Text style={styles.infoLabel}>Status:</Text>
                      <Text
                        style={
                          hasUnpaidInstallments
                            ? styles.statusOpen
                            : styles.statusClosed
                        }
                      >
                        {status}
                      </Text>
                    </View>
                    <Text style={styles.cardIssueDate}>
                      Data de Emissão: {formatDate(enterpriseInfo.issueDate)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          : !loading && (
              <Text style={styles.noInstallmentsText}>
                Nenhum empreendimento encontrado.
              </Text>
            )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "600",
    color: "#E1272C",
    marginTop: 20,
    textAlign: "center",
  },
  lineSeparatorLarge: {
    borderBottomColor: "#D1D1D1",
    borderBottomWidth: 1,
    width: 200,
    alignSelf: "center",
    marginTop: 10,
  },
  lineSeparatorSmall: {
    borderBottomColor: "#D1D1D1",
    borderBottomWidth: 1,
    width: 150,
    alignSelf: "center",
    marginTop: 7,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    flexDirection: "row",
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderColor: "#EFEFEF",
    borderWidth: 1,
  },
  cardIcon: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
    flexWrap: "wrap",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
    flexWrap: "wrap",
  },
  infoLabel: {
    fontSize: 14,
    color: "#555",
    fontWeight: "500",
    flex: 1, // Permite que o label ocupe o espaço necessário
    marginRight: 8, // Espaço entre o label e o valor
  },

  infoValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "bold",
    flex: 1, // Permite que o valor ocupe o espaço necessário
    textAlign: "right", // Alinha o texto à direita
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 5,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  statusOpen: {
    color: "#E1272C",
    fontWeight: "bold",
  },
  statusClosed: {
    color: "#2E7D32",
    fontWeight: "bold",
  },
  cardIssueDate: {
    fontSize: 13,
    color: "#666",
    marginTop: 5,
  },
  noInstallmentsText: {
    fontSize: 16,
    color: "#555",
    marginTop: 20,
    textAlign: "center",
  },
  errorText: {
    color: "#E1272C",
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});

export default InitialPage;
