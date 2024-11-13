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
import { useLocalSearchParams } from "expo-router";

const DebtBalanceScreen = () => {
  const { userData } = useContext(UserContext);

  // Estados para armazenar os valores calculados
  const [valorTotal, setValorTotal] = useState(null);
  const [saldoFinanciado, setSaldoFinanciado] = useState(null);
  const [saldoPago, setSaldoPago] = useState(null);
  const [saldoDevedor, setSaldoDevedor] = useState(null);
  const [totalTerm, setTotalTerm] = useState(null);
  const [remainingTerm, setRemainingTerm] = useState(null);
  const [nextPaymentDate, setNextPaymentDate] = useState(null);
  const [nextPaymentAmount, setNextPaymentAmount] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { enterpriseName, billReceivableId } = useLocalSearchParams();

  // Definir conditionTypes que devem ser excluídos do saldo devedor
  const excludeConditionTypes = ["Cartão de crédito", "Financiamento"];

  useEffect(() => {
    if (userData && (userData.cpf || userData.cnpj) && billReceivableId) {
      fetchData();
    }
  }, [userData, billReceivableId]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const username = "engenharq-mozart";
      const password = "i94B1q2HUXf7PP7oscuIBygquSRZ9lhb";
      const credentials = btoa(`${username}:${password}`);

      // Define o parâmetro de busca dinamicamente para CPF ou CNPJ
      const searchParam = userData.cpf
        ? { cpf: userData.cpf, correctAnnualInstallment: "N" }
        : { cnpj: userData.cnpj, correctAnnualInstallment: "N" };

      // Chamada à API para obter detalhes do contrato e próximas parcelas
      const response = await axios.get(
        "https://engpag.backend.gustavohenrique.dev/proxy/current-debit-balance",
        {
          params: searchParam,
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      const results = response.data.results || [];

      // Filtrar o resultado pelo billReceivableId
      const selectedResult = results.find(
        (result) => result.billReceivableId === parseInt(billReceivableId, 10)
      );

      if (selectedResult) {
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

        // Calcular o prazo total do contrato
        const totalTerm = allInstallments.length;
        setTotalTerm(totalTerm);

        // Filtrar parcelas que NÃO devem ser contadas no saldo devedor
        const filteredDevedorInstallments = outstandingInstallments.filter(
          (installment) =>
            !excludeConditionTypes.includes(installment.conditionType.trim())
        );

        // Cálculo do Valor Total (soma de adjustedValue de todas as parcelas)
        const totalValue = allInstallments.reduce(
          (sum, installment) => sum + (installment.adjustedValue || 0),
          0
        );
        setValorTotal(totalValue);

        // Cálculo do Saldo Financiado (soma de adjustedValue das parcelas com conditionType "Financiamento")
        const totalFinanciado = allInstallments
          .filter(
            (installment) => installment.conditionType.trim() === "Financiamento"
          )
          .reduce(
            (sum, installment) => sum + (installment.adjustedValue || 0),
            0
          );
        setSaldoFinanciado(totalFinanciado);

        // Cálculo do Saldo Pago (soma de receipts.receiptValue das parcelas pagas)
        const totalPaid = (selectedResult.paidInstallments || []).reduce(
          (sum, installment) =>
            sum +
            installment.receipts.reduce(
              (receiptSum, receipt) => receiptSum + (receipt.receiptValue || 0),
              0
            ),
          0
        );
        setSaldoPago(totalPaid);

        // Cálculo do Saldo Devedor (soma de currentBalance das parcelas filtradas)
        const totalDebt = filteredDevedorInstallments.reduce(
          (sum, installment) => sum + (installment.currentBalance || 0),
          0
        );
        setSaldoDevedor(totalDebt);

        // Seleção do próximo pagamento (considerando apenas parcelas filtradas)
        const today = new Date();
        const upcomingInstallments = filteredDevedorInstallments.filter(
          (installment) => new Date(installment.dueDate) >= today
        );

        if (upcomingInstallments.length > 0) {
          const nextInstallment = upcomingInstallments.reduce((prev, current) =>
            new Date(prev.dueDate) < new Date(current.dueDate) ? prev : current
          );
          setNextPaymentDate(nextInstallment.dueDate);
          setNextPaymentAmount(nextInstallment.currentBalance);
        } else {
          setNextPaymentDate(null);
          setNextPaymentAmount(null);
        }
      } else {
        setError("Nenhum contrato encontrado para o ID fornecido.");
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      setError("Erro ao buscar dados.");
    } finally {
      setLoading(false);
    }
  };

  // Função para formatar valores monetários com pontuação de milhar
  const formatCurrency = (value) => {
    if (isNaN(value)) return "R$ 0,00";
    return `R$ ${parseFloat(value)
      .toFixed(2)
      .replace(".", ",")
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
  };

  // Função para formatar datas
  const formatDate = (dateString) => {
    const date = new Date(dateString + "T00:00:00Z");
    const day = date.getUTCDate().toString().padStart(2, "0");
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
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
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Ionicons name="reload-outline" size={20} color="#fff" />
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Título */}
      <Text style={styles.title}>{enterpriseName || "Nome do Empreendimento"}</Text>

      {/* Saldo Devedor */}
      <View style={styles.debtContainer}>
        <Text style={styles.debtLabel}>Saldo Devedor</Text>
        <Text style={styles.debtAmount}>
          {saldoDevedor !== null ? formatCurrency(saldoDevedor) : "R$ 0,00"}
        </Text>
      </View>

      {/* Próximo Vencimento */}
      {nextPaymentDate && nextPaymentAmount ? (
        <View style={styles.nextPaymentContainer}>
          <Text style={styles.sectionTitle}>Próximo Vencimento</Text>
          <View style={styles.paymentRow}>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentLabel}>Data</Text>
              <Text style={styles.paymentValue}>{formatDate(nextPaymentDate)}</Text>
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentLabel}>Valor</Text>
              <Text style={styles.paymentValue}>
                {formatCurrency(nextPaymentAmount)}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Informações Financeiras */}
      <View style={styles.financialInfoContainer}>
        <Text style={styles.sectionTitle}>Detalhes Financeiros</Text>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Valor do Contrato</Text>
          <Text style={styles.financialValue}>
            {valorTotal !== null ? formatCurrency(valorTotal) : "R$ 0,00"}
          </Text>
        </View>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Valor Financiado</Text>
          <Text style={styles.financialValue}>
            {saldoFinanciado !== null ? formatCurrency(saldoFinanciado) : "R$ 0,00"}
          </Text>
        </View>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Valor Pago</Text>
          <Text style={styles.financialValue}>
            {saldoPago !== null ? formatCurrency(saldoPago) : "R$ 0,00"}
          </Text>
        </View>
      </View>

      {/* Detalhes do Contrato */}
      <View style={styles.contractDetailsContainer}>
        <Text style={styles.sectionTitle}>Detalhes do Contrato</Text>
        <View style={styles.contractRow}>
          <Text style={styles.contractLabel}>Prazo Contratado</Text>
          <Text style={styles.contractValue}>
            {totalTerm !== null ? `${totalTerm} meses` : "0 meses"}
          </Text>
        </View>
        <View style={styles.contractRow}>
          <Text style={styles.contractLabel}>Prazo Restante</Text>
          <Text style={styles.contractValue}>
            {remainingTerm !== null ? `${remainingTerm} meses` : "0 meses"}
          </Text>
        </View>
      </View>
    </ScrollView>
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
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: "row",
    backgroundColor: "#E1272C",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
    marginTop: 10,
    marginBottom: 20,
  },
  debtContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  debtLabel: {
    fontSize: 18,
    color: "#333",
    fontWeight: "bold",
    marginBottom: 10,
  },
  debtAmount: {
    fontSize: 24,
    color: "#E1272C",
    fontWeight: "bold",
  },
  nextPaymentContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    elevation: 3,
  },
  paymentInfo: {
    flex: 1,
    alignItems: "center",
  },
  paymentLabel: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  paymentValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  financialInfoContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
  },
  financialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  financialLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  financialValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  contractDetailsContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 3,
    marginBottom: 20,
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
});

export default DebtBalanceScreen;
