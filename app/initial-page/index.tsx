// pages/initial-page.js
import React, { useEffect, useContext, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";
import { useRouter } from "expo-router";

const InitialPage = () => {
  const router = useRouter();
  const { userData, setInstallmentsData } = useContext(UserContext);
  const [installmentsData, setLocalInstallmentsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (userData && userData.cpf) {
      fetchInstallments();
    }
  }, [userData]);

  const fetchInstallments = async () => {
    setLoading(true);
    setError("");

    try {
      const username = "engenharq-mozart";
      const password = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb"; // Substitua pela sua senha
      const credentials = btoa(`${username}:${password}`);

      const response = await axios.get(
        `https://api.sienge.com.br/engenharq/public/api/v1/current-debit-balance`,
        {
          params: {
            cpf: userData.cpf,
            correctAnnualInstallment: "N",
          },
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      setLocalInstallmentsData(response.data.results || []);
    } catch (err) {
      setError("Falha ao buscar saldo devedor.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCardPress = (item) => {
    setInstallmentsData([item]);

    router.push({
      pathname: "/debit-options",
      params: {
        billReceivableId: item.billReceivableId,
        title: `Título: ${item.billReceivableId}`,
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Barra superior */}
      <View style={styles.topBar}>
        <Ionicons name="menu" size={30} color="white" />
        <Ionicons name="notifications-outline" size={30} color="white" />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Saudação */}
        <Text style={styles.greeting}>Olá, {userData.name || 'Cliente'}!</Text>
        <View style={styles.lineSeparatorLarge} />
        <View style={styles.lineSeparatorSmall} />

        {/* Título da seção de empreendimentos */}
        <Text style={styles.sectionTitle}>Empreendimentos</Text>

        {loading && <ActivityIndicator size="large" color="#007bff" />}
        {error !== "" && <Text style={styles.errorText}>{error}</Text>}

        {!loading && Array.isArray(installmentsData) && installmentsData.length > 0 ? (
          installmentsData.map((item) => {
            const title = `Título: ${item.billReceivableId}`;
            const allDueInstallments = [
              ...(item.dueInstallments || []),
              ...(item.payableInstallments || []),
            ];

            const futureInstallments = allDueInstallments.filter(
              (installment) => new Date(installment.dueDate) >= new Date()
            );

            futureInstallments.sort(
              (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
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
                onPress={() => handleCardPress(item)}
              >
                <View style={styles.cardIcon}>
                  <Ionicons name="home-outline" size={30} color="#E1272C" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{title}</Text>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardSubtitle}>Valor da próxima parcela</Text>
                    <Text style={styles.cardValue}>
                      {nextInstallmentAmount
                        ? `R$ ${nextInstallmentAmount.toFixed(2)}`
                        : "N/A"}
                    </Text>
                  </View>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardSubtitle}>Status</Text>
                    <Text
                      style={
                        hasUnpaidInstallments ? styles.statusOpen : styles.statusClosed
                      }
                    >
                      {status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          !loading && (
            <Text style={styles.noInstallmentsText}>
              Nenhum empreendimento encontrado.
            </Text>
          )
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E1272C",
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  greeting: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#E1272C",
    marginTop: 20,
    textAlign: "center",
  },
  lineSeparatorLarge: {
    borderBottomColor: "#5B5B5B",
    borderBottomWidth: 3,
    width: 210,
    alignSelf: "center",
    marginTop: 10,
  },
  lineSeparatorSmall: {
    borderBottomColor: "#5B5B5B",
    borderBottomWidth: 3,
    width: 155,
    alignSelf: "center",
    marginTop: 7,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    flexDirection: "row",
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    borderColor: "#eee",
    borderWidth: 1,
  },
  cardIcon: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 5,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#555",
  },
  cardValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  statusOpen: {
    color: "#E1272C",
    fontWeight: "bold",
  },
  statusClosed: {
    color: "green",
    fontWeight: "bold",
  },
  noInstallmentsText: {
    fontSize: 16,
    color: "#333",
    marginTop: 20,
    textAlign: "center",
  },
  errorText: {
    color: "red",
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
});

export default InitialPage;
