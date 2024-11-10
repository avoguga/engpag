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
  
  const [remainingTerm, setRemainingTerm] = useState(null);
  const [nextPaymentDate, setNextPaymentDate] = useState(null);
  const [nextPaymentAmount, setNextPaymentAmount] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { enterpriseName, billReceivableId } = useLocalSearchParams();

  // Definir conditionTypes que devem ser excluídos do saldo devedor
  const excludeConditionTypes = [
    "Cartão de crédito",
    "Financiamento",
  ];

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
        "https://api.sienge.com.br/engenharq/public/api/v1/current-debit-balance",
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
  
        // Filtrar parcelas que NÃO devem ser contadas no saldo devedor
        const filteredDevedorInstallments = outstandingInstallments.filter(
          (installment) =>
            !excludeConditionTypes.includes(installment.conditionType.trim())
        );
  
        // Cálculo do Valor Total (soma de originalValue de todas as parcelas)
        const totalValue = allInstallments.reduce(
          (sum, installment) => sum + (installment.originalValue || 0),
          0
        );
        setValorTotal(totalValue);
  
        // Cálculo do Saldo Financiado (soma de originalValue das parcelas com conditionType "Financiamento")
        const totalFinanciado = allInstallments
          .filter(
            (installment) =>
              installment.conditionType.trim() === "Financiamento"
          )
          .reduce((sum, installment) => sum + (installment.originalValue || 0), 0);
        setSaldoFinanciado(totalFinanciado);
  
        // Cálculo do Saldo Pago (soma de currentBalance das parcelas pagas)
        const totalPaid = (selectedResult.paidInstallments || []).reduce(
          (sum, installment) => sum + (installment.currentBalance || 0),
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
            new Date(prev.dueDate) > new Date(current.dueDate) ? current : prev
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
    const date = new Date(dateString + 'T00:00:00Z'); 
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
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

      {/* Saldo Devedor Button */}
      <TouchableOpacity style={styles.debtButton}>
        <Text style={styles.debtButtonText}>SALDO DEVEDOR</Text>
      </TouchableOpacity>

      {/* Informações Financeiras */}
      <View style={styles.financialInfoContainer}>
        {/* Valor Total */}
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Valor Total</Text>
          <Text style={styles.financialValue}>
            {valorTotal !== null ? formatCurrency(valorTotal) : "R$ 0,00"}
          </Text>
        </View>

        {/* Saldo Financiado */}
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Saldo Financiado</Text>
          <Text style={styles.financialValue}>
            {saldoFinanciado !== null ? formatCurrency(saldoFinanciado) : "R$ 0,00"}
          </Text>
        </View>

        {/* Saldo Pago */}
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Saldo Pago</Text>
          <Text style={styles.financialValue}>
            {saldoPago !== null ? formatCurrency(saldoPago) : "R$ 0,00"}
          </Text>
        </View>

        {/* Saldo Devedor */}
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Saldo Devedor</Text>
          <Text style={styles.financialValue}>
            {saldoDevedor !== null ? formatCurrency(saldoDevedor) : "R$ 0,00"}
          </Text>
        </View>
      </View>

      {nextPaymentDate && nextPaymentAmount ? (
        <View style={styles.nextPaymentContainer}>
          <Text style={styles.sectionTitle}>PRÓXIMO VENCIMENTO</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentDate}>{formatDate(nextPaymentDate)}</Text>
            <Text style={styles.paymentAmount}>
              {formatCurrency(nextPaymentAmount)}
            </Text>
           
          </View>
        </View>
      ) : null}

      {/* Detalhes do Contrato */}
      <View style={styles.contractDetailsContainer}>
        <Text style={styles.sectionTitle}>DETALHES DO CONTRATO</Text>
        <View style={styles.contractRow}>
          <Text style={styles.contractLabel}>Valor Financiado</Text>
          <Text style={styles.contractValue}>
            {saldoFinanciado !== null
              ? formatCurrency(saldoFinanciado)
              : "R$ 0,00"}
          </Text>
        </View>
        <View style={styles.contractRow}>
          <Text style={styles.contractLabel}>Prazo Contratado</Text>
          <Text style={styles.contractValue}>
            {remainingTerm !== null ? `${remainingTerm} Meses` : "0 Meses"}
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
  financialInfoContainer: {
    borderWidth: 1,
    borderColor: "#E1272C",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 10,
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
    fontSize: 16,
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
