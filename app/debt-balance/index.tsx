import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";
import { router } from "expo-router";

const DebtBalanceScreen = () => {
  const { userData } = useContext(UserContext);
  const [balance, setBalance] = useState(null);
  const [remainingTerm, setRemainingTerm] = useState(null);
  const [nextPaymentDate, setNextPaymentDate] = useState(null);
  const [nextPaymentAmount, setNextPaymentAmount] = useState(null);
  const [financedAmount, setFinancedAmount] = useState(null);
  const [contractTerm, setContractTerm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (userData && userData.cpf) {
      fetchData();
    }
  }, [userData]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const username = "engenharq-mozart";
      const password = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb";
      const credentials = btoa(`${username}:${password}`);

      // Chamada à API para obter o saldo total
      const totalBalanceResponse = await axios.get(
        "https://api.sienge.com.br/engenharq/public/api/v1/total-current-debit-balance",
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

      const totalResults = totalBalanceResponse.data.results || [];

      if (totalResults.length > 0) {
        const totalData = totalResults[0];
        setBalance(totalData.totalCurrentDebitBalanceValue);
      } else {
        setError("Não foi possível obter o saldo devedor total.");
      }

      // Chamada à API para obter detalhes do contrato e próximas parcelas
      const response = await axios.get(
        "https://api.sienge.com.br/engenharq/public/api/v1/current-debit-balance",
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

      const results = response.data.results || [];

      if (results.length > 0) {
        const selectedResult = results[0];

        const allInstallments = [
          ...(selectedResult.dueInstallments || []),
          ...(selectedResult.payableInstallments || []),
          ...(selectedResult.paidInstallments || []),
        ];

        const outstandingInstallments = [
          ...(selectedResult.dueInstallments || []),
          ...(selectedResult.payableInstallments || []),
        ];
        setRemainingTerm(outstandingInstallments.length);

        const today = new Date();
        const upcomingInstallments = outstandingInstallments.filter(
          (installment) => new Date(installment.dueDate) >= today
        );

        if (upcomingInstallments.length > 0) {
          const nextInstallment = upcomingInstallments.reduce((prev, current) =>
            new Date(prev.dueDate) < new Date(current.dueDate) ? prev : current
          );
          setNextPaymentDate(nextInstallment.dueDate);
          setNextPaymentAmount(nextInstallment.currentBalance);
        }

        const financedAmountValue = allInstallments.reduce(
          (sum, installment) => sum + (installment.originalValue || 0),
          0
        );
        setFinancedAmount(financedAmountValue);

        setContractTerm(allInstallments.length);
      } else {
        setError("Nenhum contrato encontrado.");
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      setError("Erro ao buscar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleBoletoPress = () => {
    // Alert.alert("Boleto", "Função de boleto não implementada.");
  };

  // Função para formatar valores monetários com pontuação de milhar
  const formatCurrency = (value) => {
    if (isNaN(value)) return "R$ 0,00";
    return `R$ ${parseFloat(value)
      .toFixed(2)
      .replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  };

  // Função para formatar datas
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, "0")}/${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E1272C" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
     <>
       {/* Header */}
       {/* <View style={styles.header}>
       <TouchableOpacity onPress={() => router.back()}>
           <Ionicons name="arrow-back-outline" size={28} color="white" />
         </TouchableOpacity>
         <TouchableOpacity onPress={() => router.push('/notification-screen')}>
           <Ionicons name="notifications-outline" size={28} color="white" />
         </TouchableOpacity>
       </View> */}
    <ScrollView style={styles.container}>
   

      {/* Title */}
      <Text style={styles.title}>ENGENHARQ LTDA</Text>

      {/* Saldo Devedor Button */}
      <TouchableOpacity style={styles.debtButton}>
        <Text style={styles.debtButtonText}>SALDO DEVEDOR</Text>
      </TouchableOpacity>

      {/* Saldo Devedor Information */}
      <View style={styles.balanceContainer}>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>SALDO DEVEDOR</Text>
          <Text style={styles.balanceLabel}>PRAZO RESTANTE</Text>
        </View>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceValue}>
            {balance !== null ? formatCurrency(balance) : "R$ 0,00"}
          </Text>
          <Text style={styles.balanceValue}>
            {remainingTerm !== null ? remainingTerm : "0"}
          </Text>
        </View>
      </View>

      <Text style={styles.balanceInfo}>
        O saldo devedor não inclui o valor das prestações em aberto. Valor
        sujeito a alteração.
      </Text>

      {/* Próximo Vencimento */}
      {nextPaymentDate && nextPaymentAmount ? (
        <View style={styles.nextPaymentContainer}>
          <Text style={styles.sectionTitle}>PRÓXIMO VENCIMENTO</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentDate}>{formatDate(nextPaymentDate)}</Text>
            <Text style={styles.paymentAmount}>
              {formatCurrency(nextPaymentAmount)}
            </Text>
            <TouchableOpacity
              style={styles.boletoButton}
              onPress={handleBoletoPress}
            >
              <Text style={styles.boletoButtonText}>BOLETO</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Detalhes do Contrato */}
      <View style={styles.contractDetailsContainer}>
        <Text style={styles.sectionTitle}>DETALHES DO CONTRATO</Text>
        <View style={styles.contractRow}>
          <Text style={styles.contractLabel}>Valor financiado</Text>
          <Text style={styles.contractValue}>
            {financedAmount !== null
              ? formatCurrency(financedAmount)
              : "R$ 0,00"}
          </Text>
        </View>
        <View style={styles.contractRow}>
          <Text style={styles.contractLabel}>Prazo contratado</Text>
          <Text style={styles.contractValue}>
            {contractTerm !== null ? `${contractTerm} Meses` : "0 Meses"}
          </Text>
        </View>
       
      </View>
    </ScrollView>
     </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8F8",
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF8F8",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF8F8",
    padding: 16,
  },
  errorText: {
    color: "#E1272C",
    fontSize: 18,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E1272C",
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
    marginTop: 10,
    marginBottom: 20,
  },
  debtButton: {
    backgroundColor: "#E1272C",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  debtButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    textTransform: "uppercase",
  },
  balanceContainer: {
    borderWidth: 1,
    borderColor: "#E1272C",
    borderRadius: 8,
    padding: 16,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  balanceInfo: {
    fontSize: 12,
    color: "#555",
    textAlign: "center",
    margin: 10,
  },
  nextPaymentContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  paymentDate: {
    backgroundColor: "#E1272C",
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginRight: 16,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  boletoButton: {
    backgroundColor: "#E1272C",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  boletoButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  contractDetailsContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  contractRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  contractLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  contractValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  additionalInfo: {
    fontSize: 12,
    color: "#555",
    marginTop: 16,
  },
});

export default DebtBalanceScreen;
